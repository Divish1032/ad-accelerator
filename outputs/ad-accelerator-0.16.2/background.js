'use strict';
importScripts('filter-core.js','sites.js','popup-guard.js','element-rules.js','strict-core.js','strict-navigation.js','privacy-core.js','privacy-chrome.js','adaptive-core.js','adaptive-chrome.js');
const reports=new Map(),popupEvents=new Map();
let cosmeticRules;
const privacy=new ChromePrivacy(chrome,PrivacyCore,FilterCore);
const adaptive=new AdaptiveChrome(chrome,AdaptiveCore,FilterCore,readConfig);
const strictNavigation=new StrictNavigation(chrome,FilterCore,StrictCore),strictAttempts=new Map();
async function pageHost(id,url){return await strictNavigation.source(id)||FilterCore.host(url);}
async function pickerSessions(){const data=await chrome.storage.session.get('pickSessions');return Object.fromEntries(Object.entries(data.pickSessions||{}).filter(([,s])=>s.until>Date.now()).slice(-100));}
async function setPickerSession(id,value){const sessions=await pickerSessions();if(value)sessions[id]=value;else delete sessions[id];await chrome.storage.session.set({pickSessions:sessions});}
chrome.tabs.onRemoved.addListener(id=>{reports.delete(id);popupEvents.delete(id);void serialized(()=>setPickerSession(id,null)).catch(console.error);});
let queue=Promise.resolve();
function serialized(fn){const p=queue.then(fn);queue=p.catch(()=>{});return p;}
async function readConfig(){
 const raw=(await chrome.storage.local.get('protection')).protection,c=FilterCore.config(raw);
 // Repair expired persisted exceptions even when Chrome delivers an alarm late.
 if(Object.keys(raw?.pauses||{}).some(h=>!(h in c.pauses))||JSON.stringify(raw?.recovery||{})!==JSON.stringify(c.recovery)){
   await applyPolicy(c);await chrome.storage.local.set({protection:c});await schedulePauses(c);
 }
 return c;
}
async function applyPolicy(c){
 const preferences=await privacy.migrateCookies(),previous=(await chrome.storage.local.get('protection')).protection||FilterCore.config();
 const checkedLinks=await privacy.checkedLinkRules(preferences,c);
 const old=PrivacyCore.safeLinkSnapshot((await chrome.declarativeNetRequest.getDynamicRules()).filter(r=>r.id===1||r.id===90||PrivacyCore.LINK_IDS.includes(r.id))),sessions=await chrome.declarativeNetRequest.getSessionRules(),state=await strictNavigation.states(),scripts=await chrome.scripting.getRegisteredContentScripts({ids:['strict-main','strict-bridge']});
 try{
  await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:[1,...FilterCore.compatibility().map(r=>r.id),...PrivacyCore.LINK_IDS],addRules:[...FilterCore.compatibility(),...FilterCore.policy(c),...checkedLinks]});
  await privacy.verifyLinks(checkedLinks);
  await strictNavigation.sync(c);await strictNavigation.registration(c);
  await privacy.syncLocation(preferences,c);await privacy.syncCookies(preferences,c);
 }catch(e){
  await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:[1,90,...PrivacyCore.LINK_IDS],addRules:old});
  const current=await chrome.declarativeNetRequest.getSessionRules();await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:current.map(r=>r.id),addRules:sessions});
  await chrome.storage.session.set({strictTabs:state});
  const registered=await chrome.scripting.getRegisteredContentScripts({ids:['strict-main','strict-bridge']});if(registered.length)await chrome.scripting.unregisterContentScripts({ids:registered.map(s=>s.id)});if(scripts.length)await chrome.scripting.registerContentScripts(scripts);
  await privacy.syncLocation(preferences,previous);await privacy.syncCookies(preferences,previous);
  throw e;
 }
}
async function schedulePauses(c){
 const times=[...Object.values(c.pauses),...Object.values(c.recovery).flatMap(v=>Object.values(v))];
 if(times.length)await chrome.alarms.create('site-pause',{when:Math.min(...times)});
 else await chrome.alarms.clear('site-pause');
}
async function expirePauses(){
 const c=await readConfig();await applyPolicy(c);await chrome.storage.local.set({protection:c});await schedulePauses(c);
}
async function retryPauseExpiry(error){
 console.error(error);
 // A transient native-settings failure must not leave an expired pause in
 // place indefinitely after Chrome consumes its one-shot alarm.
 await chrome.alarms.create('site-pause',{when:Date.now()+30000}).catch(console.error);
}
async function download(url){
  const response=await fetch(url,{credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('List download failed ('+response.status+')');
  const reader=response.body.getReader();let length=0,text='';const decoder=new TextDecoder();
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>25000000){await reader.cancel();throw Error('List download too large');}text+=decoder.decode(value,{stream:true});}
  return text+decoder.decode();
}
async function prepareLists(remote){
  const groups=[];const sources=[];
  for(const source of FilterCore.SOURCES){
    const text=await download(remote?source.url:chrome.runtime.getURL('filters/'+source.key+'.txt'));
    const domains=FilterCore.parse(text);groups.push(domains);
    sources.push({name:source.name,count:domains.length,version:text.match(/^# Version: (.+)$/m)?.[1]||'unknown'});
  }
  return {rules:FilterCore.compile(groups),sources,domains:new Set(groups.flat()).size,source:remote?'download':'bundled'};
}
async function commitLists({rules,sources,domains,source}){
  const old=await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:old.filter(r=>r.id>=100).map(r=>r.id),addRules:rules});
  try{await chrome.storage.local.set({filterStatus:{installedAt:Date.now(),source,domains,rules:rules.length,sources,error:null}});}
  catch(e){await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:rules.map(r=>r.id),addRules:old.filter(r=>r.id>=100)});throw e;}
}
async function installLists(remote){await commitLists(await prepareLists(remote));}
let updateFlight=null;
function update(){
  // Downloads must not hold the policy queue: a slow/offline list host must
  // never prevent the user from pausing a broken site. Only commit is serialized.
  if(updateFlight)return updateFlight;
  updateFlight=(async()=>{
    try{const prepared=await prepareLists(true);await serialized(()=>commitLists(prepared));}
    catch(e){await serialized(async()=>{const {filterStatus={}}=await chrome.storage.local.get('filterStatus');await chrome.storage.local.set({filterStatus:{...filterStatus,error:'Update failed; previous filters retained. '+e.message}});});throw e;}
  })().finally(()=>{updateFlight=null;});
  return updateFlight;
}
async function initialize(){
  const c=await readConfig();await applyPolicy(c);await schedulePauses(c);
  const rules=await chrome.declarativeNetRequest.getDynamicRules();
  if(!rules.some(r=>r.id>=100))await installLists(false);
  else {
    // Dynamic rules survive extension updates. Repair the installed 0.4.0 rules
    // in place, preserving any newer downloaded domain lists even when offline.
    const outdated=rules.filter(r=>r.id>=100&&!r.condition.resourceTypes?.includes('main_frame'));
    if(outdated.length)await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:outdated.map(r=>r.id),addRules:outdated.map(r=>{
      const condition={...r.condition,resourceTypes:[...FilterCore.RESOURCE_TYPES]};delete condition.excludedResourceTypes;
      return {...r,condition};
    })});
  }
  await chrome.alarms.create('filter-update',{periodInMinutes:1440,delayInMinutes:5});
}
chrome.runtime.onInstalled.addListener(()=>serialized(initialize).catch(console.error));
chrome.runtime.onStartup.addListener(()=>serialized(initialize).catch(console.error));
chrome.alarms.onAlarm.addListener(a=>{if(a.name==='adaptive-expiry')serialized(async()=>{await chrome.storage.local.set({adaptive:await adaptive.state()});adaptive.prune();}).catch(console.error);if(a.name==='site-pause')serialized(expirePauses).catch(retryPauseExpiry);if(a.name==='filter-update')serialized(readConfig).then(c=>c.autoUpdate?update():undefined).catch(console.error);});
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(!m||typeof m!=='object'||Array.isArray(m)||typeof m.type!=='string')return;
  if(typeof m?.type==='string'&&m.type.startsWith('adaptive-')){
   if(sender.url?.split('?')[0]!==chrome.runtime.getURL('adaptive.html'))return;
   serialized(async()=>{
    const current=await chrome.tabs.get(m.tabId).catch(()=>null),h=FilterCore.host(current?.url);
    if(!h||current.incognito)throw Error('Open this panel from a normal website tab.');
    let state=await adaptive.state();
    if(m.type==='adaptive-toggle'){
     if(typeof m.enabled!=='boolean')throw Error('Invalid setting.');state.enabled=m.enabled;
    }else if(m.type==='adaptive-allow'){
     if(!state.rows.some(r=>r.source===h&&r.destination===m.destination))throw Error('Rule expired or the source website changed.');
     state=AdaptiveCore.allow(state,h,m.destination);
    }else if(m.type==='adaptive-clear')state={enabled:false,rows:[],ignored:[]};
    else if(m.type!=='adaptive-status')throw Error('Unknown adaptive action.');
    if(m.type!=='adaptive-status'){await chrome.storage.local.set({adaptive:state});adaptive.pending.clear();}
    const c=await readConfig();
    return {ok:true,host:h,enabled:state.enabled,active:state.enabled&&AdaptiveCore.eligible(current.url)&&AdaptiveCore.active(c,h,FilterCore),rows:state.rows.filter(r=>r.source===h),ignored:state.ignored.filter(r=>r.source===h),total:state.rows.length};
   }).then(reply,e=>reply({ok:false,error:e.message}));return true;
  }
  if(typeof m?.type==='string'&&m.type.startsWith('privacy-')){
   // Dedicated extension page only. No content-script bridge for privacy or deletion.
   if(sender.url?.split('?')[0]!==chrome.runtime.getURL('privacy.html'))return;
   serialized(async()=>{
    if(m.type!=='privacy-status')await privacy.source(m.tabId);
    if(m.type==='privacy-cookies')await privacy.cookies(m.blocked,await readConfig());
    else if(m.type==='privacy-location'){
     const o=await privacy.source(m.tabId);if(o!==m.origin)throw Error('The website changed. Reopen Privacy.');
     await privacy.location(o,m.blocked,await readConfig());
    }else if(m.type==='privacy-links'){
     if(typeof m.enabled!=='boolean')throw Error('Invalid link setting.');
     await privacy.links({cleanLinks:m.enabled},await readConfig());
    }else if(m.type==='privacy-link-exception'){
     const o=await privacy.source(m.tabId);if(o!==m.origin||typeof m.exempt!=='boolean')throw Error('The website changed. Reopen Privacy.');
     const h=PrivacyCore.host(o),p=await privacy.preferences();if(!FilterCore.domain(h))throw Error('Link exceptions require a website hostname.');
     if(m.exempt&&!p.linkExceptions.includes(h)&&p.linkExceptions.length>=100)throw Error('Maximum 100 link exceptions.');
     const inherited=p.linkExceptions.find(d=>h.endsWith('.'+d));if(!m.exempt&&inherited)throw Error('This exception is inherited from '+inherited+'. Change it on that hostname.');
     await privacy.links({linkExceptions:m.exempt?[...new Set([...p.linkExceptions,h])]:p.linkExceptions.filter(d=>h!==d)},await readConfig());
    }else if(m.type==='privacy-prepare')return {ok:true,...await privacy.prepare(m.tabId)};
    else if(m.type==='privacy-cleanup')return {ok:true,...await privacy.cleanup(m)};
    else if(m.type!=='privacy-status')throw Error('Unknown privacy action.');
    const c=await readConfig(),state=await privacy.status(m.tabId,c),h=FilterCore.host(state.origin);
    return {ok:true,...state,linkFilteringActive:FilterCore.enabledFor(c,h)&&c.network&&!FilterCore.recovering(c,h,'network')};
   }).then(reply,e=>reply({ok:false,error:e.message}));return true;
  }

  if(m.type==='strict-page-config'&&sender.tab){
   serialized(async()=>{const c=await readConfig(),h=FilterCore.host(sender.url);reply({active:StrictCore.active(c,h,FilterCore)&&FilterCore.enabledFor(c,FilterCore.host(sender.tab.url)),allowed:c.strict[h]||[]});}).catch(()=>reply({active:true,allowed:[]}));return true;
  }
  if(m.type==='video-report'&&sender.tab){
    const frames=reports.get(sender.tab.id)||new Map();
    for(const [id,r]of frames)if(Date.now()-r.at>=10000)frames.delete(id);
    if(!frames.has(sender.frameId)&&frames.size>=64)frames.delete(frames.keys().next().value);
    if(!reports.has(sender.tab.id)&&reports.size>=512)reports.delete(reports.keys().next().value);
    frames.set(sender.frameId,{text:String(m.text).slice(0,150),videoFound:!!m.videoFound,ad:!!m.ad,at:Date.now()});reports.set(sender.tab.id,frames);reply({ok:true});return;
  }
  if(m.type==='cosmetic-rules'&&sender.tab){
    (async()=>{cosmeticRules ||= await (await fetch(chrome.runtime.getURL('filters/cosmetic.json'))).json();reply({selectors:cosmeticRules});})().catch(()=>reply({selectors:[]}));return true;
  }
  if(m.type==='element-add'&&sender.tab){
    serialized(async()=>{
      const session=(await pickerSessions())[sender.tab.id],h=FilterCore.host(sender.tab.url);
      if(sender.frameId!==0||!session||session.until<Date.now()||session.url!==sender.tab.url)throw Error('Open the element picker again.');
      if(!ElementRules.valid(m.rule))throw Error('Invalid element selection.');
      const current=await chrome.tabs.get(sender.tab.id);if(current.url!==session.url)throw Error('The page changed. Open the picker again.');
      const c=await readConfig();if(!FilterCore.enabledFor(c,h)||FilterCore.recovering(c,h,'custom'))throw Error('Hidden elements are paused here.');
      const data=await chrome.storage.local.get('hiddenElements'),all=data.hiddenElements||{},items=all[h]||[];
      if(items.length>=50)throw Error('This site has 50 hidden elements. Remove one first.');
      if(!all[h]&&Object.keys(all).length>=100)throw Error('Hidden element limit reached for 100 sites.');
      const rule={selector:m.rule.selector,tag:m.rule.tag,classes:[...m.rule.classes]};
      await chrome.storage.local.set({hiddenElements:{...all,[h]:[...items.filter(r=>r.selector!==rule.selector),rule]}});
      await setPickerSession(sender.tab.id,null);return {ok:true};
    }).then(reply,e=>reply({ok:false,error:e.message}));return true;
  }
  if(m.type==='page-config'&&sender.tab){
    (async()=>{
      const data=await chrome.storage.local.get(null),c=FilterCore.config(data.protection),h=FilterCore.host(sender.tab.url);
      const key=AdAcceleratorSites.siteFor(h)||h,saved=data['site.'+key];
      reply({adaptiveActive:!sender.tab.incognito&&sender.frameId===0&&AdaptiveCore.eligible(sender.tab.url)&&AdaptiveCore.active(c,h,FilterCore)&&AdaptiveCore.state(data.adaptive).enabled,adaptiveRules:AdaptiveCore.rules(data.adaptive,h).filter(r=>FilterCore.enabledFor(c,r.destination)&&!(c.strict[h]||[]).includes(r.destination)),enabled:FilterCore.enabledFor(c,h),cosmetics:c.cosmetics&&!FilterCore.recovering(c,h,'cosmetics'),custom:!FilterCore.recovering(c,h,'custom'),elementRules:data.hiddenElements?.[h]||[],videoSettings:{...AdAcceleratorSites.settingsFor(data,key),enabled:AdAcceleratorSites.settingsFor(data,key).enabled&&!FilterCore.recovering(c,h,'video'),preferSkip:saved?.preferSkip!==false}});
    })().catch(()=>reply({enabled:false,cosmetics:false,videoSettings:{enabled:false}}));return true;
  }
  // Only our extension pages may change filtering or request list downloads.
  if(sender.url?.split(/[?#]/)[0]!==chrome.runtime.getURL('popup.html')||sender.tab)return;
  if(!['protection-status','protection-save','filters-update','site-pause','site-resume','site-set','recovery-set','recovery-reset','element-pick','element-remove','strict-set','strict-allow','strict-remove'].includes(m.type))return;
  if(m.type==='filters-update'){update().then(()=>reply({ok:true}),e=>reply({ok:false,error:e.message}));return true;}
  serialized(async()=>{
    if(['strict-set','strict-allow','strict-remove'].includes(m.type)){
      const source=await chrome.tabs.get(m.tabId),h=await pageHost(m.tabId,source.url);if(!FilterCore.domain(h))throw Error('Strict navigation needs a website hostname, not a local address.');
      const old=await readConfig(),c=FilterCore.config(old);
      if(m.type==='strict-set'){if(m.enabled){if(!c.strict[h]&&Object.keys(c.strict).length>=50)throw Error('Maximum 50 strict sites.');c.strict[h]=c.strict[h]||[];}else delete c.strict[h];}
      else {const d=typeof m.destination==='string'?m.destination.trim().toLowerCase():'';if(!FilterCore.domain(d)||!c.strict[h])throw Error('Enter a hostname and enable strict protection first.');
        if(m.type==='strict-remove')c.strict[h]=c.strict[h].filter(x=>x!==d);
        else {if(c.strict[h].length>=20&&!c.strict[h].includes(d))throw Error('Maximum 20 destinations per site.');c.strict[h]=[...new Set([...c.strict[h],d])];}
      }
      await applyPolicy(c);try{await chrome.storage.local.set({protection:c});}catch(e){await applyPolicy(old);throw e;}
    }
    if(['recovery-set','recovery-reset','element-pick','element-remove'].includes(m.type)){
      const source=await chrome.tabs.get(m.tabId),h=m.feature==='strict'?await pageHost(m.tabId,source.url):FilterCore.host(source.url)||await pageHost(m.tabId,source.url);
      if(!h)throw Error('Open a website first.');
      if(m.type==='element-pick'){
        const c=await readConfig();if(!FilterCore.enabledFor(c,h)||FilterCore.recovering(c,h,'custom'))throw Error('Resume protection and hidden elements first.');
        await setPickerSession(m.tabId,{url:source.url,until:Date.now()+5*60*1000});
        try{const result=await chrome.tabs.sendMessage(m.tabId,{type:'element-pick'},{frameId:0});if(!result?.ok)throw Error(result?.error||'Refresh the website before picking an element.');}
        catch(e){await setPickerSession(m.tabId,null);throw Error('Refresh the website and try again. '+e.message);}
      }
      if(m.type==='element-remove'){
        const data=await chrome.storage.local.get('hiddenElements'),all=data.hiddenElements||{},items=all[h]||[];
        if(!Number.isInteger(m.index)||m.index<0||m.index>=items.length||items[m.index].selector!==m.selector)throw Error('Element no longer exists. Reopen this panel.');
        const next=items.filter((_,i)=>i!==m.index);if(next.length)all[h]=next;else delete all[h];await chrome.storage.local.set({hiddenElements:all});
      }
      if(m.type.startsWith('recovery-')){
        const old=await readConfig(),c=FilterCore.config(old);
        if(m.type==='recovery-reset'){
          for(const d of Object.keys(c.recovery))if(h===d||h.endsWith('.'+d))delete c.recovery[d];
          const retained=await strictNavigation.source(m.tabId);
          if(retained&&retained!==h)for(const d of Object.keys(c.recovery))if(retained===d||retained.endsWith('.'+d)){delete c.recovery[d].strict;if(!Object.keys(c.recovery[d]).length)delete c.recovery[d];}
        }
        else {if(!['network','cosmetics','popups','video','custom','strict'].includes(m.feature))throw Error('Unknown recovery option.');if(!c.recovery[h]&&Object.keys(c.recovery).length>=100)throw Error('Maximum 100 sites in recovery.');c.recovery[h]={...c.recovery[h],[m.feature]:Date.now()+600000};}
        await applyPolicy(c);try{await chrome.storage.local.set({protection:c});await schedulePauses(c);}catch(e){await applyPolicy(old);await chrome.storage.local.set({protection:old});await schedulePauses(old);throw e;}
      }
    }
    if(m.type==='site-pause'||m.type==='site-resume'||m.type==='site-set'){
      const source=await chrome.tabs.get(m.tabId),h=FilterCore.host(source.url)||await pageHost(m.tabId,source.url);
      if(!h)throw Error('Open a website first.');
      const old=await readConfig(),c=FilterCore.config(old);
      if(m.type==='site-set'){
        if(typeof m.enabled!=='boolean'||m.host!==h)throw Error('The website changed. Reopen the popup.');
        if(m.enabled){
          c.disabledSites=c.disabledSites.filter(d=>h!==d&&!h.endsWith('.'+d));
          for(const d of Object.keys(c.pauses))if(h===d||h.endsWith('.'+d))delete c.pauses[d];
        }else{
          if(!c.disabledSites.includes(h)&&c.disabledSites.length>=100)throw Error('Maximum 100 site exceptions.');
          c.disabledSites=[...new Set([...c.disabledSites,h])];delete c.pauses[h];
        }
      }else if(m.type==='site-pause'){if(!c.pauses[h]&&Object.keys(c.pauses).length>=100)throw Error('Maximum 100 temporary site pauses.');c.pauses[h]=Date.now()+10*60*1000;}
      else {c.disabledSites=c.disabledSites.filter(d=>h!==d&&!h.endsWith('.'+d));for(const d of Object.keys(c.pauses))if(h===d||h.endsWith('.'+d))delete c.pauses[d];}
      await applyPolicy(c);
      try{await chrome.storage.local.set({protection:c});await schedulePauses(c);}catch(e){await applyPolicy(old);await chrome.storage.local.set({protection:old});await schedulePauses(old);throw e;}
    }
    if(m.type==='protection-save'){
      if(Array.isArray(m.patch?.disabledSites)&&m.patch.disabledSites.length>100)throw Error('Maximum 100 site exceptions.');
      const old=await readConfig(),c=FilterCore.config({...old,...m.patch});await applyPolicy(c);
      try{await chrome.storage.local.set({protection:c});await schedulePauses(c);}catch(e){await applyPolicy(old);await chrome.storage.local.set({protection:old});await schedulePauses(old);throw e;}
    }
    const c=await readConfig(),{filterStatus={}}=await chrome.storage.local.get('filterStatus');
    const rules=await chrome.declarativeNetRequest.getDynamicRules();
    const frames=[...(reports.get(m.tabId)?.values()||[])].filter(r=>Date.now()-r.at<10000).sort((a,b)=>(Number(b.ad)*2+Number(b.videoFound))-(Number(a.ad)*2+Number(a.videoFound)));
    return {config:c,cookieConfigured:(await privacy.preferences()).blockCookies===true,cookiesSuspended:privacy.cookiesSuspended(c),filterStatus,ready:rules.some(r=>r.id>=100),videoText:frames[0]?.text||'Refresh this page to connect video controls',strictSource:await strictNavigation.source(m.tabId),strictAttempts:strictAttempts.get(m.tabId)||[],recentPopups:popupEvents.get(m.tabId)||[],hiddenElements:(await chrome.storage.local.get("hiddenElements")).hiddenElements?.[FilterCore.host((await chrome.tabs.get(m.tabId).catch(()=>({}))).url)]||[]};
  }).then(r=>reply({ok:true,...r}),e=>reply({ok:false,error:e.message}));return true;
});

const popupTracker=new PopupGuard.Tracker(chrome,FilterCore,event=>{
 const events=popupEvents.get(event.sourceTabId)||[];
 popupEvents.set(event.sourceTabId,[{host:event.host,at:event.at},...events].slice(0,5));
});
chrome.webNavigation.onCreatedNavigationTarget.addListener(d=>serialized(async()=>{const c=await readConfig();await strictNavigation.created(d,c);await adaptive.created(d).catch(console.error);await popupTracker.created(d);}).catch(console.error));
chrome.webNavigation.onBeforeNavigate.addListener(d=>serialized(async()=>{
 const c=await readConfig(),h=await strictNavigation.source(d.tabId),dest=FilterCore.host(d.url);
 if(d.frameId===0&&dest&&StrictCore.active(c,h,FilterCore)&&!StrictCore.allowed(c,h,dest))strictAttempts.set(d.tabId,[{host:dest,at:Date.now()},...(strictAttempts.get(d.tabId)||[])].slice(0,5));
 await adaptive.navigate(d).catch(console.error);await popupTracker.navigate(d);
}).catch(console.error));
chrome.webNavigation.onErrorOccurred.addListener(d=>serialized(async()=>{await adaptive.navigate(d).catch(console.error);await popupTracker.navigate(d);}).catch(console.error));
chrome.webNavigation.onCommitted.addListener(d=>serialized(async()=>{await adaptive.committed(d).catch(console.error);await strictNavigation.committed(d,await readConfig());if(d.frameId===0)strictAttempts.delete(d.tabId);popupTracker.committed(d);}).catch(console.error));
chrome.tabs.onRemoved.addListener(id=>{strictAttempts.delete(id);adaptive.removed(id);popupTracker.removed(id);void serialized(()=>strictNavigation.apply(id,null,FilterCore.config())).catch(console.error);});

// Re-arm pauses when a suspended worker wakes, including Chrome versions where
// alarms may not survive a browser restart.
serialized(async()=>schedulePauses(await readConfig())).catch(retryPauseExpiry);

serialized(()=>chrome.alarms.create('adaptive-expiry',{periodInMinutes:60})).catch(console.error);
