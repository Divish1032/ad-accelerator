const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function runtime(){
 let sessionRules=[],scripts=[],rules=[],stored={},failDownload=false,failRules=false,failStorage=false,failAlarm=false,clock=Date.now();const session={};const alarms=new Map();const listeners={};
 const event=n=>({addListener:fn=>listeners[n]=fn});
 const chrome={scripting:{getRegisteredContentScripts:async()=>structuredClone(scripts),unregisterContentScripts:async()=>{scripts=[];},registerContentScripts:async v=>{scripts=structuredClone(v);}},webNavigation:{onCreatedNavigationTarget:event('target'),onBeforeNavigate:event('before'),onErrorOccurred:event('navigation-error'),onCommitted:event('committed')},runtime:{getURL:p=>'chrome-extension://test/'+p,onInstalled:event('installed'),onStartup:event('startup'),onMessage:event('message')},tabs:{query:async()=>[{id:1,url:'https://example.com/watch'}],onRemoved:event('removed'),sendMessage:async()=>({ok:true}),get:async()=>({url:'https://example.com/watch'})},alarms:{clear:async n=>alarms.delete(n),create:async(n,v)=>{if(failAlarm){failAlarm=false;throw Error('Alarm failure');}alarms.set(n,v);},onAlarm:event('alarm')},storage:{session:{get:async()=>structuredClone(session),set:async d=>Object.assign(session,d)},local:{get:async key=>key===null?structuredClone(stored):Object.fromEntries((Array.isArray(key)?key:[key]).map(k=>[k,stored[k]])),set:async d=>{if(failStorage){failStorage=false;throw Error('storage failure');}Object.assign(stored,d);}}},declarativeNetRequest:{isRegexSupported:async()=>({isSupported:true}),getSessionRules:async()=>structuredClone(sessionRules),updateSessionRules:async({removeRuleIds=[],addRules=[]})=>{sessionRules=sessionRules.filter(r=>!removeRuleIds.includes(r.id)).concat(structuredClone(addRules));},getDynamicRules:async()=>structuredClone(rules),updateDynamicRules:async({removeRuleIds=[],addRules=[]})=>{if(failRules)throw Error('DNR rejected update');rules=rules.filter(r=>!removeRuleIds.includes(r.id)).concat(structuredClone(addRules));}}};
 const context=vm.createContext({chrome,console,URL,AbortSignal,TextDecoder,Map,Date:class extends Date{static now(){return clock;}},fetch:async url=>{if(failDownload&&url.startsWith('https:'))return{ok:false,status:503};const file=url.startsWith('chrome-extension:')?url.replace('chrome-extension://test/',''): 'filters/'+(url.includes('tif.')?'threats':url.includes('popup')?'popups':'ads')+'.txt';return new Response(fs.readFileSync(path.join(__dirname,'..',file)));}});
 context.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),context));
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../background.js'),'utf8'),context);
 return{context,listeners,alarms,advance:ms=>clock+=ms,get sessionRules(){return sessionRules;},get scripts(){return scripts;},get rules(){return rules;},get stored(){return structuredClone(stored);},failAlarm:()=>failAlarm=true,failDownload:()=>failDownload=true,failRules:()=>failRules=true,failStorage:()=>failStorage=true,
 run:code=>vm.runInContext(code,context),message:(m,sender={url:'chrome-extension://test/popup.html'})=>new Promise(resolve=>{const ret=listeners.message(m,sender,resolve);if(ret!==true)resolve(undefined);})};
}
test('malformed runtime messages are ignored without throwing',async()=>{
 const r=runtime();
 for(const m of [null,undefined,42,'page-config',{},[],{type:42}])assert.equal(await r.message(m),undefined);
});
test('only the exact popup page may change global policy or download filters',async()=>{
 const r=runtime();
 for(const url of ['chrome-extension://test/help.html','chrome-extension://test/popup.html.evil','https://example.com/popup.html']){
  assert.equal(await r.message({type:'protection-save',patch:{enabled:false}},{url}),undefined);
  assert.equal(await r.message({type:'filters-update'},{url}),undefined);
 }
 assert.equal(r.stored.protection,undefined);
});
test('frame video reports have a bounded lifetime and per-tab count',async()=>{
 const r=runtime(),sender={url:'https://frame.example/',tab:{id:1,url:'https://example.com/watch'}};
 for(let frameId=0;frameId<100;frameId++)await r.message({type:'video-report',text:'Waiting',videoFound:false,ad:false},{...sender,frameId});
 assert.ok(r.run('reports.get(1).size')<=64);
 r.advance(11000);await r.message({type:'video-report',text:'Playing',videoFound:true},{...sender,frameId:200});
 assert.equal(r.run('reports.get(1).size'),1);
});
test('strict recovery edits the displayed protected source on a blocked target page',async()=>{
 const r=runtime();await r.run('initialize()');await r.message({type:'strict-set',tabId:1,enabled:true});
 await r.run("chrome.tabs.get=async()=>({id:1,url:'https://blocked.example/'});chrome.tabs.query=async()=>[{id:1,url:'https://blocked.example/'}]");
 assert.equal((await r.message({type:'strict-allow',tabId:1,destination:'accounts.example.org'})).ok,true);
 assert.deepEqual(r.stored.protection.strict['example.com'],['accounts.example.org']);
 assert.equal((await r.message({type:'recovery-set',tabId:1,feature:'strict'})).ok,true);
 assert.ok(r.stored.protection.recovery['example.com'].strict);
 assert.equal((await r.message({type:'recovery-reset',tabId:1})).ok,true);
 assert.equal(r.stored.protection.recovery['example.com'],undefined);
 assert.equal(r.sessionRules.length,2);
 assert.equal((await r.message({type:'strict-set',tabId:1,enabled:false})).ok,true);
 assert.equal(r.stored.protection.strict['example.com'],undefined);
});
test('site controls remain responsive while remote filter download is pending',async()=>{
 const r=runtime();await r.run('initialize()');
 await r.run("var releaseDownload;var originalFetch=fetch;var downloadGate=new Promise(resolve=>releaseDownload=resolve);fetch=async url=>{if(url.startsWith('https:'))await downloadGate;return originalFetch(url)}");
 const update=r.message({type:'filters-update',tabId:1});let paused=false;
 const pause=r.message({type:'site-pause',tabId:1}).then(result=>{paused=result.ok;return result;});
 await new Promise(resolve=>setImmediate(resolve));
 const responsive=paused;
 r.run('releaseDownload()');await Promise.all([update,pause]);
 assert.equal(responsive,true,'a stalled remote download must not hold the policy queue');
 assert.ok(r.rules.some(r=>r.id===1),'download commit must preserve the new pause');
});
test('first install loads bundled lists and restart preserves rules',async()=>{const r=runtime();await r.run('initialize()');assert.ok(r.rules.length>100);assert.ok(r.stored.filterStatus.domains>200000);const before=r.rules.toSorted((a,b)=>a.id-b.id);await r.run('initialize()');assert.deepEqual(r.rules.toSorted((a,b)=>a.id-b.id),before);});
test('site-scoped ad decision compatibility survives list install and update',async()=>{
 const r=runtime();await r.run('initialize()');
 const expected=JSON.parse(JSON.stringify(r.run('FilterCore.compatibility()')));assert.deepEqual(r.rules.filter(x=>[90,91].includes(x.id)),expected);
 assert.ok(r.rules.some(x=>x.id>=100&&x.action.type==='block'));
 assert.equal((await r.message({type:'filters-update',tabId:1})).ok,true);
 assert.deepEqual(r.rules.filter(x=>[90,91].includes(x.id)),expected);
});
test('failed list download keeps current filters and reports failure',async()=>{const r=runtime();await r.run('initialize()');const before=r.rules;r.failDownload();await assert.rejects(r.run('update()'));assert.deepEqual(r.rules,before);assert.match(r.stored.filterStatus.error,/previous filters retained/);});
test('failed rule application does not persist the proposed pause',async()=>{const r=runtime();await r.run('initialize()');r.failRules();const result=await r.message({type:'protection-save',patch:{enabled:false}});assert.equal(result.ok,false);assert.equal(r.stored.protection,undefined);});
test('failed settings persistence rolls network policy back',async()=>{const r=runtime();await r.run('initialize()');r.failStorage();const result=await r.message({type:'protection-save',patch:{enabled:false}});assert.equal(result.ok,false);assert.ok(!r.rules.some(x=>x.id===1));});
test('content frames cannot change protection or trigger updates',async()=>{const r=runtime();await r.run('initialize()');assert.equal(await r.message({type:'protection-save',patch:{enabled:false}},{url:'https://example.com/',tab:{id:1,url:'https://example.com/'}}),undefined);assert.equal(r.stored.protection,undefined);});
test('embedded player receives top-site preferences and exemption',async()=>{const r=runtime();await r.run('initialize()');await r.message({type:'protection-save',patch:{disabledSites:['example.com']}});const c=await r.message({type:'page-config'},{tab:{id:1,url:'https://example.com/watch'},url:'https://embed.other.test/player'});assert.equal(c.enabled,false);assert.equal(c.videoSettings.speed,4);});
test('upgrade repairs existing 0.4.0 rules offline without replacing downloaded domains',async()=>{
 const r=runtime();await r.run(`chrome.declarativeNetRequest.updateDynamicRules({addRules:[{id:100,priority:10,action:{type:'block'},condition:{requestDomains:['latest-listed.example'],excludedResourceTypes:[]}}]})`);
 r.failDownload();await r.run('initialize()');const [block]=r.rules.filter(x=>x.id>=100);
 assert.deepEqual(block.condition.requestDomains,['latest-listed.example']);assert.ok(block.condition.resourceTypes.includes('main_frame'));assert.ok(!('excludedResourceTypes' in block.condition));
 const before=r.rules.toSorted((a,b)=>a.id-b.id);await r.run('initialize()');assert.deepEqual(r.rules.toSorted((a,b)=>a.id-b.id),before);
});
test('global pause and site exemption explicitly cover top-level pages too',async()=>{
 const r=runtime();await r.run('initialize()');
 for(const patch of [{enabled:false},{enabled:true,disabledSites:['example.com']}]){
  assert.equal((await r.message({type:'protection-save',patch})).ok,true);
  assert.ok(r.rules.find(x=>x.id===1).condition.resourceTypes.includes('main_frame'));
 }
});
test('temporary pause creates an exception, schedules expiry and reaches embedded frames',async()=>{
 const r=runtime();await r.run('initialize()');const result=await r.message({type:'site-pause',tabId:1});assert.equal(result.ok,true);
 assert.ok(r.stored.protection.pauses['example.com']);assert.ok(r.alarms.has('site-pause'));
 assert.deepEqual(r.rules.find(x=>x.id===1).condition.topDomains,['example.com']);
 const c=await r.message({type:'page-config'},{tab:{id:1,url:'https://example.com/watch'},url:'https://embed.test/'});assert.equal(c.enabled,false);
 r.advance(600001);await r.run('expirePauses()');assert.ok(!r.rules.some(x=>x.id===1));assert.deepEqual(r.stored.protection.pauses,{});assert.ok(!r.alarms.has('site-pause'));
});
test('restart re-arms an active pause and repairs an expired network exception',async()=>{
 const r=runtime();await r.run('initialize()');await r.message({type:'site-pause',tabId:1});r.alarms.clear();await r.run('initialize()');assert.ok(r.alarms.has('site-pause'));
 r.advance(600001);await r.run('initialize()');assert.ok(!r.rules.some(x=>x.id===1));
});
test('manual resume clears inherited permanent and temporary exceptions',async()=>{
 const r=runtime();await r.run('initialize()');await r.message({type:'site-pause',tabId:1});await r.message({type:'protection-save',patch:{disabledSites:['example.com']}});
 assert.equal((await r.message({type:'site-resume',tabId:1})).ok,true);assert.deepEqual(r.stored.protection.pauses,{});assert.deepEqual(r.stored.protection.disabledSites,[]);assert.ok(!r.rules.some(x=>x.id===1));
});
test('pause persistence failure rolls network rules back',async()=>{
 const r=runtime();await r.run('initialize()');r.failStorage();assert.equal((await r.message({type:'site-pause',tabId:1})).ok,false);assert.ok(!r.rules.some(x=>x.id===1));assert.deepEqual(r.stored.protection.pauses,{});
});
test('network switch leaves page assistance enabled while bypassing network rules',async()=>{
 const r=runtime();await r.run('initialize()');await r.message({type:'protection-save',patch:{network:false}});assert.ok(r.rules.find(x=>x.id===1));
 const c=await r.message({type:'page-config'},{tab:{id:1,url:'https://example.com/'}});assert.equal(c.enabled,true);assert.equal(c.cosmetics,true);
 await r.message({type:'protection-save',patch:{network:true,cosmetics:false,popups:false}});assert.ok(!r.rules.some(x=>x.id===1));assert.equal(r.stored.protection.cosmetics,false);assert.equal(r.stored.protection.popups,false);
});
test('webpage senders cannot pause or resume protection',async()=>{
 const r=runtime();await r.run('initialize()');assert.equal(await r.message({type:'site-pause',tabId:1},{url:'https://example.com/',tab:{id:1,url:'https://example.com/'}}),undefined);assert.equal(r.stored.protection,undefined);
});
test('alarm scheduling failure rolls the pause back in storage and rules',async()=>{
 const r=runtime();await r.run('initialize()');r.failAlarm();assert.equal((await r.message({type:'site-pause',tabId:1})).ok,false);assert.deepEqual(r.stored.protection.pauses,{});assert.ok(!r.rules.some(x=>x.id===1));
});
test('status read repairs expired exceptions when an alarm is delayed',async()=>{
 const r=runtime();await r.run('initialize()');await r.message({type:'site-pause',tabId:1});r.advance(600001);
 const status=await r.message({type:'protection-status',tabId:1});assert.equal(status.ok,true);assert.ok(!r.rules.some(x=>x.id===1));assert.deepEqual(r.stored.protection.pauses,{});
});
test('recovery pauses individual tools, reaches frames, and expires without changing defaults',async()=>{
 const r=runtime();await r.run('initialize()');
 for(const feature of ['cosmetics','custom','video','popups','network'])assert.equal((await r.message({type:'recovery-set',tabId:1,feature})).ok,true);
 const sender={frameId:2,url:'https://embed.example/',tab:{id:1,url:'https://example.com/watch'}};
 const c=await r.message({type:'page-config'},sender);assert.equal(c.enabled,true);assert.equal(c.cosmetics,false);assert.equal(c.custom,false);assert.equal(c.videoSettings.enabled,false);assert.ok(r.rules.find(x=>x.id===1));
 assert.equal(r.stored.protection.network,true);assert.equal(r.stored.protection.cosmetics,true);
 r.advance(600001);await r.run('expirePauses()');assert.ok(!r.rules.some(x=>x.id===1));const restored=await r.message({type:'page-config'},sender);assert.equal(restored.cosmetics,true);assert.equal(restored.custom,true);assert.equal(restored.videoSettings.enabled,true);
});
test('recovery reset preserves permanent settings and global pause',async()=>{
 const r=runtime();await r.run('initialize()');await r.message({type:'protection-save',patch:{cosmetics:false,enabled:false}});await r.message({type:'recovery-set',tabId:1,feature:'network'});await r.message({type:'recovery-reset',tabId:1});assert.deepEqual(r.stored.protection.recovery,{});assert.equal(r.stored.protection.enabled,false);assert.equal(r.stored.protection.cosmetics,false);
});
test('failed recovery save rolls network exception back',async()=>{const r=runtime();await r.run('initialize()');r.failStorage();assert.equal((await r.message({type:'recovery-set',tabId:1,feature:'network'})).ok,false);assert.ok(!r.rules.some(x=>x.id===1));assert.deepEqual(r.stored.protection.recovery,{});});
test('element persistence requires active top-frame picker and supports undo',async()=>{
 const r=runtime();await r.run('initialize()');const sender={frameId:0,url:'https://example.com/watch',tab:{id:1,url:'https://example.com/watch'}},rule={selector:'#banner',tag:'div',classes:['advert']};
 assert.equal((await r.message({type:'element-add',rule},sender)).ok,false);
 await r.message({type:'element-pick',tabId:1});assert.equal((await r.message({type:'element-add',rule},{...sender,frameId:2})).ok,false);
 assert.equal((await r.message({type:'element-add',rule:{...rule,selector:'body, html'}},sender)).ok,false);
 assert.equal((await r.message({type:'element-add',rule},sender)).ok,true);
 assert.equal(r.stored.hiddenElements['example.com'].length,1);
 assert.equal((await r.message({type:'element-add',rule},sender)).ok,false);
 await r.message({type:'element-remove',tabId:1,index:0,selector:'#banner'});assert.deepEqual(r.stored.hiddenElements,{});
});
test('picker save rejects stale page and expired sessions',async()=>{
 const r=runtime();await r.run('initialize()');await r.message({type:'element-pick',tabId:1});
 const rule={selector:'#banner',tag:'div',classes:[]};
 assert.equal((await r.message({type:'element-add',rule},{frameId:0,tab:{id:1,url:'https://different.example/'}})).ok,false);
 r.advance(300001);assert.equal((await r.message({type:'element-add',rule},{frameId:0,tab:{id:1,url:'https://example.com/watch'}})).ok,false);
});
test('picker authorization is recoverable from session storage after worker suspension',async()=>{
 const r=runtime();await r.run('initialize()');await r.run(`chrome.storage.session.set({pickSessions:{1:{url:'https://example.com/watch',until:Date.now()+300000}}})`);
 const result=await r.message({type:'element-add',rule:{selector:'#box',tag:'div',classes:[]}},{frameId:0,tab:{id:1,url:'https://example.com/watch'}});assert.equal(result.ok,true);
});
test('stale Undo selection cannot remove a different rule',async()=>{
 const r=runtime();await r.run('initialize()');await r.run(`chrome.storage.local.set({hiddenElements:{'example.com':[{selector:'#new',tag:'div',classes:[]}]}})`);
 assert.equal((await r.message({type:'element-remove',tabId:1,index:0,selector:'#old'})).ok,false);assert.equal(r.stored.hiddenElements['example.com'][0].selector,'#new');
});
test('recovery is scoped to source hostname and survives restart until expiry',async()=>{
 const r=runtime();await r.run('initialize()');await r.message({type:'recovery-set',tabId:1,feature:'network'});await r.run('initialize()');assert.deepEqual(r.rules.find(x=>x.id===1).condition.topDomains,['example.com']);
 const other=await r.message({type:'page-config'},{frameId:0,tab:{id:2,url:'https://other.example/'}});assert.equal(other.enabled,true);assert.equal(other.cosmetics,true);
 r.advance(600001);await r.run('initialize()');assert.ok(!r.rules.some(x=>x.id===1));
});
test('strict mode installs tab-scoped rules and early scripts; destination exceptions stay below threat priority',async()=>{
 const r=runtime();await r.run('initialize()');assert.equal((await r.message({type:'strict-set',tabId:1,enabled:true})).ok,true);assert.equal(r.sessionRules.length,2);assert.equal(r.scripts.length,2);assert.equal(r.scripts[0].runAt,'document_start');
 assert.equal((await r.message({type:'strict-allow',tabId:1,destination:'accounts.example.org'})).ok,true);
 const allow=r.sessionRules.find(x=>x.action.type==='allow');assert.ok(allow.priority<10);assert.match(allow.condition.regexFilter,/accounts/);assert.deepEqual(allow.condition.tabIds,[1]);
 await r.message({type:'strict-set',tabId:1,enabled:false});assert.equal(r.sessionRules.length,0);assert.equal(r.scripts.length,0);
});
test('strict recovery removes tab restrictions and early registrations then restores on expiry',async()=>{const r=runtime();await r.run('initialize()');await r.message({type:'strict-set',tabId:1,enabled:true});await r.message({type:'recovery-set',tabId:1,feature:'strict'});assert.equal(r.sessionRules.length,0);assert.equal(r.scripts.length,0);r.advance(600001);await r.run('expirePauses()');assert.equal(r.sessionRules.length,2);assert.equal(r.scripts.length,2);});
test('strict setting persistence failure rolls session rules and scripts back',async()=>{const r=runtime();await r.run('initialize()');r.failStorage();assert.equal((await r.message({type:'strict-set',tabId:1,enabled:true})).ok,false);assert.equal(r.sessionRules.length,0);assert.equal(r.scripts.length,0);});
test('webpages and other extension pages cannot call privacy cleanup',async()=>{const r=runtime();for(const sender of [{url:'https://example.com/',tab:{id:1}},{url:'chrome-extension://test/popup.html'},{url:'chrome-extension://test/privacy.html.evil'}])assert.equal(await r.message({type:'privacy-cleanup',tabId:1,confirm:true},sender),undefined);});
test('privacy link settings coexist with list rules, strict rules and pause/resume',async()=>{
 const r=runtime();await r.run('initialize()');const sender={url:'chrome-extension://test/privacy.html?tab=1'};
 assert.equal((await r.message({type:'privacy-links',tabId:1,enabled:true},sender)).ok,true);assert.ok(r.rules.some(x=>x.id===20));assert.ok(r.rules.some(x=>x.id>=100));
 await r.message({type:'protection-save',tabId:1,patch:{network:false}});assert.ok(!r.rules.some(x=>x.id===20));
 await r.message({type:'protection-save',tabId:1,patch:{network:true}});assert.ok(r.rules.some(x=>x.id===20));
 await r.message({type:'strict-set',tabId:1,enabled:true});assert.ok(r.rules.some(x=>x.id===20));assert.ok(r.sessionRules.length);
});
test('a child cannot silently remove a parent tracking-link exception',async()=>{
 const r=runtime();await r.run('initialize()');const sender={url:'chrome-extension://test/privacy.html?tab=1'};
 await r.message({type:'privacy-link-exception',tabId:1,origin:'https://example.com',exempt:true},sender);
 await r.run("chrome.tabs.get=async()=>({url:'https://child.example.com/watch'})");
 const result=await r.message({type:'privacy-link-exception',tabId:1,origin:'https://child.example.com',exempt:false},sender);
 assert.equal(result.ok,false);assert.match(result.error,/inherited/);assert.deepEqual(r.stored.privacyPreferences.linkExceptions,['example.com']);
});
test('adaptive status and controls only accept dedicated extension page',async()=>{
 const r=runtime();for(const sender of [{url:'https://example.com/',tab:{id:1,url:'https://example.com/'}},{url:'chrome-extension://test/popup.html'}])assert.equal(await r.message({type:'adaptive-toggle',tabId:1,enabled:false},sender),undefined);
 const sender={url:'chrome-extension://test/adaptive.html?tab=1',tab:{id:9}};
 const result=await r.message({type:'adaptive-toggle',tabId:1,enabled:false},sender);assert.equal(result.ok,true);assert.equal(result.enabled,false);
 const status=await r.message({type:'adaptive-status',tabId:1},sender);assert.equal(status.host,'example.com');assert.equal(status.rows.length,0);
});
test('adaptive persistence error is visible and existing settings survive',async()=>{
 const r=runtime();r.failStorage();const result=await r.message({type:'adaptive-toggle',tabId:1,enabled:false},{url:'chrome-extension://test/adaptive.html'});assert.equal(result.ok,false);assert.equal(r.stored.adaptive,undefined);
});
test('real background event wiring observes chains and delivers learned page rules',async()=>{
 const r=runtime();await r.run(`chrome.declarativeNetRequest.updateDynamicRules({addRules:FilterCore.compile([['listed.example']])}); chrome.tabs.get=async id=>({id,url:id===1?'https://example.com/watch':'https://jump.example/go'});`);
 for(let i=0;i<3;i++){
  r.listeners.target({sourceTabId:1,tabId:2,url:'https://jump.example/go'});await r.run('queue');
  r.listeners['navigation-error']({tabId:2,frameId:0,url:'https://listed.example/ad'});await r.run('queue');r.advance(31000);
 }
 assert.equal(r.stored.adaptive.rows[0].count,3);
 const c=await r.message({type:'page-config'},{frameId:0,tab:{id:1,url:'https://example.com/watch'},url:'https://example.com/watch'});assert.equal(c.adaptiveActive,true);assert.equal(c.adaptiveRules[0].destination,'jump.example');
 const child=await r.message({type:'page-config'},{frameId:2,tab:{id:1,url:'https://example.com/watch'},url:'https://embed.example/player'});assert.equal(child.adaptiveActive,false);
 const sensitive=await r.message({type:'page-config'},{frameId:0,tab:{id:1,url:'https://example.com/checkout'},url:'https://example.com/checkout'});assert.equal(sensitive.adaptiveActive,false);
});
async function nativeLocation(r){
 await r.run(`var appliedLocations=new Map();chrome.permissions={contains:async ({permissions})=>permissions.every(p=>p==='contentSettings')};chrome.contentSettings={location:{clear:async()=>appliedLocations.clear(),set:async v=>{if(v.primaryPattern!==v.secondaryPattern)throw Error('Embedded patterns are not supported for this setting.');appliedLocations.set(new URL(v.primaryPattern).origin,v.setting);},get:async v=>({setting:appliedLocations.get(v.primaryUrl)||'ask'})}};`);
 const sender={url:'chrome-extension://test/privacy.html?tab=1'};
 const result=await r.message({type:'privacy-location',tabId:1,origin:'https://example.com',blocked:true},sender);assert.equal(result.ok,true);return sender;
}
test('timed full-site pause suspends native location and restores it on expiry without changing preferences',async()=>{
 const r=runtime();const sender=await nativeLocation(r),saved=r.stored.privacyPreferences;
 assert.equal((await r.message({type:'site-pause',tabId:1})).ok,true);
 let status=await r.message({type:'privacy-status',tabId:1},sender);assert.equal(status.location.setting,'ask');assert.equal(status.location.owned,true);assert.equal(status.siteActive,false);
 assert.deepEqual(r.stored.privacyPreferences,saved);
 await r.run('initialize()');assert.equal(r.run('appliedLocations.size'),0);
 r.advance(600001);await r.run('expirePauses()');
 status=await r.message({type:'privacy-status',tabId:1},sender);assert.equal(status.location.setting,'block');assert.equal(status.location.active,true);assert.deepEqual(r.stored.privacyPreferences,saved);
});
test('site pause storage or alarm failure restores native location alongside network policy',async()=>{
 for(const failure of ['failStorage','failAlarm']){
  const r=runtime();await nativeLocation(r);r[failure]();
  assert.equal((await r.message({type:'site-pause',tabId:1})).ok,false);assert.equal(r.run('appliedLocations.size'),1);assert.ok(!r.rules.some(x=>x.id===1));
 }
});
test('late alarm repaired by status read also restores native location',async()=>{
 const r=runtime(),sender=await nativeLocation(r);await r.message({type:'site-pause',tabId:1});r.advance(600001);
 const status=await r.message({type:'privacy-status',tabId:1},sender);assert.equal(status.location.setting,'block');assert.equal(status.siteActive,true);
});
test('native location failure rolls back the full pause instead of reporting success',async()=>{
 const r=runtime();await nativeLocation(r);const before=r.stored.protection;
 await r.run(`var originalClear=chrome.contentSettings.location.clear;chrome.contentSettings.location.clear=async()=>{chrome.contentSettings.location.clear=originalClear;throw Error('Native settings unavailable');};`);
 const result=await r.message({type:'site-pause',tabId:1});assert.equal(result.ok,false);assert.match(result.error,/Native/);
 assert.equal(r.run('appliedLocations.size'),1);assert.ok(!r.rules.some(x=>x.id===1));assert.deepEqual(r.stored.protection,before);
});
test('global protection switch and lasting site exception suspend location; network-only recovery does not',async()=>{
 const r=runtime();await nativeLocation(r);
 await r.message({type:'recovery-set',tabId:1,feature:'network'});assert.equal(r.run('appliedLocations.size'),1);
 await r.message({type:'protection-save',patch:{enabled:false}});assert.equal(r.run('appliedLocations.size'),0);
 await r.message({type:'protection-save',patch:{enabled:true,disabledSites:['example.com']}});assert.equal(r.run('appliedLocations.size'),0);
 await r.message({type:'site-resume',tabId:1});assert.equal(r.run('appliedLocations.size'),1);
});
async function nativeCookies(r){
 await r.run(`var cookieValue={value:true,levelOfControl:'controllable_by_this_extension'},cookieWrites=[];chrome.permissions={contains:async({permissions})=>permissions.every(p=>p==='privacy')};chrome.privacy={websites:{thirdPartyCookiesAllowed:{get:async()=>({...cookieValue}),set:async v=>{cookieWrites.push(v.value);cookieValue={value:v.value,levelOfControl:'controlled_by_this_extension'};},clear:async()=>{cookieValue={value:true,levelOfControl:'controllable_by_this_extension'};}}}};`);
 const sender={url:'chrome-extension://test/privacy.html?tab=1'};
 assert.equal((await r.message({type:'privacy-cookies',tabId:1,blocked:true},sender)).ok,true);return sender;
}
test('overlapping full-site pauses release cookie override until the last expires, including restart',async()=>{
 const r=runtime();await nativeCookies(r);await r.message({type:'site-pause',tabId:1});r.advance(300000);
 await r.run("chrome.tabs.get=async()=>({url:'https://second.example/watch'})");await r.message({type:'site-pause',tabId:2});
 assert.equal(r.run('cookieValue.value'),true);assert.equal(r.stored.privacyPreferences.blockCookies,true);
 await r.run('initialize()');assert.equal(r.run('cookieValue.value'),true);
 r.advance(300001);await r.run('expirePauses()');assert.equal(r.run('cookieValue.value'),true);
 r.advance(300000);await r.run('expirePauses()');assert.equal(r.run('cookieValue.value'),false);
 assert.ok(r.run('cookieWrites.every(v=>v===false)'));
});
test('lasting site toggle is persisted per hostname and restores configured cookies when the exception ends',async()=>{
 const r=runtime();await nativeCookies(r);
 assert.equal((await r.message({type:'site-set',tabId:1,host:'example.com',enabled:false})).ok,true);assert.deepEqual(r.stored.protection.disabledSites,['example.com']);assert.equal(r.run('cookieValue.value'),true);
 await r.run('initialize()');assert.equal(r.run('cookieValue.value'),true);
 assert.equal((await r.message({type:'site-set',tabId:1,host:'example.com',enabled:true})).ok,true);assert.deepEqual(r.stored.protection.disabledSites,[]);assert.equal(r.run('cookieValue.value'),false);
});
test('site toggle validates live hostname and cannot be called by website scripts',async()=>{
 const r=runtime();assert.equal((await r.message({type:'site-set',tabId:1,host:'stale.example',enabled:false})).ok,false);
 assert.equal(await r.message({type:'site-set',tabId:1,host:'example.com',enabled:false},{url:'https://example.com',tab:{id:1}}),undefined);
 assert.equal(r.stored.protection,undefined);
});
test('failed full-site pause rolls back native cookie override and stored pause',async()=>{
 for(const failure of ['failStorage','failAlarm']){const r=runtime();await nativeCookies(r);r[failure]();assert.equal((await r.message({type:'site-pause',tabId:1})).ok,false);assert.equal(r.run('cookieValue.value'),false);assert.deepEqual(r.stored.protection.pauses,{});}
});
test('full pause restores location, cookies, strict and page features together without enabling saved-off features',async()=>{
 const r=runtime();await nativeLocation(r);await nativeCookies(r);
 await r.run("chrome.permissions.contains=async({permissions})=>permissions.every(p=>['privacy','contentSettings'].includes(p))");
 await r.message({type:'strict-set',tabId:1,enabled:true});await r.message({type:'protection-save',patch:{cosmetics:false,popups:false}});
 const before=r.stored.privacyPreferences;await r.message({type:'site-pause',tabId:1});
 assert.equal(r.run('appliedLocations.size'),0);assert.equal(r.run('cookieValue.value'),true);assert.equal(r.sessionRules.length,0);
 const sender={url:'https://embed.test/player',tab:{id:1,url:'https://example.com/watch'}};
 assert.equal((await r.message({type:'page-config'},sender)).enabled,false);
 r.advance(600001);await r.run('expirePauses()');
 assert.equal(r.run('appliedLocations.size'),1);assert.equal(r.run('cookieValue.value'),false);assert.equal(r.sessionRules.length,2);
 const page=await r.message({type:'page-config'},sender);assert.equal(page.enabled,true);assert.equal(page.cosmetics,false);
 assert.equal(r.stored.protection.popups,false);assert.deepEqual(r.stored.privacyPreferences,before);
});
test('site preference updates retain other domains and resume inherited exceptions explicitly',async()=>{
 const r=runtime();await r.message({type:'protection-save',patch:{disabledSites:['other.test']}});
 await r.message({type:'site-set',tabId:1,host:'example.com',enabled:false});assert.deepEqual(r.stored.protection.disabledSites,['other.test','example.com']);
 await r.run("chrome.tabs.get=async()=>({url:'https://child.example.com/watch'})");
 await r.message({type:'site-set',tabId:1,host:'child.example.com',enabled:true});assert.deepEqual(r.stored.protection.disabledSites,['other.test']);
});
test('failed expiry is retried rather than leaving an expired cookie suspension indefinitely',async()=>{
 const r=runtime();await nativeCookies(r);await r.message({type:'site-pause',tabId:1});r.advance(600001);
 await r.run(`var originalCookieSet=chrome.privacy.websites.thirdPartyCookiesAllowed.set;chrome.privacy.websites.thirdPartyCookiesAllowed.set=async()=>{chrome.privacy.websites.thirdPartyCookiesAllowed.set=originalCookieSet;throw Error('temporary native failure');};`);
 r.listeners.alarm({name:'site-pause'});await r.run('queue');assert.equal(r.alarms.get('site-pause').when,r.run('Date.now()+30000'));
 r.advance(30000);r.listeners.alarm({name:'site-pause'});await r.run('queue');
 assert.equal(r.run('cookieValue.value'),false);assert.deepEqual(r.stored.protection.pauses,{});
});
test('main site controls target the current tab hostname even with retained strict source context',async()=>{
 const r=runtime();await r.run("strictNavigation.source=async()=> 'previous.example'");
 assert.equal((await r.message({type:'site-set',tabId:1,host:'example.com',enabled:false})).ok,true);assert.deepEqual(r.stored.protection.disabledSites,['example.com']);
 await r.message({type:'site-set',tabId:1,host:'example.com',enabled:true});await r.message({type:'site-pause',tabId:1});
 assert.deepEqual(Object.keys(r.stored.protection.pauses),['example.com']);
});
test('full policy application validates regexes before mutating protection',async()=>{
 const r=runtime();await r.run('initialize()');
 await r.run("chrome.storage.local.set({privacyPreferences:{cleanLinks:true}})");
 const before=r.rules;
 await r.run("chrome.declarativeNetRequest.isRegexSupported=async()=>({isSupported:false,reason:'memoryLimitExceeded'})");
 const result=await r.message({type:'protection-save',patch:{video:false}});
 assert.equal(result.ok,false);assert.match(result.error,/memoryLimitExceeded/);assert.deepEqual(r.rules,before);assert.equal(r.stored.protection,undefined);
});
test('startup replaces legacy signed guard with complete validated small guards',async()=>{
 const r=runtime();await r.run('initialize()');
 await r.run("chrome.storage.local.set({privacyPreferences:{cleanLinks:true}}); chrome.declarativeNetRequest.updateDynamicRules({addRules:[{id:20,action:{type:'redirect'}},{id:21,action:{type:'allow'},condition:{regexFilter:'legacy'}}]})");
 await r.run('initialize()');
 const core=require('../privacy-core.js');for(const id of core.GUARD_IDS)assert.ok(r.rules.some(x=>x.id===id&&x.action.type==='allow'));
 assert.ok(!r.rules.some(x=>x.condition.regexFilter==='legacy'));assert.ok(r.rules.some(x=>x.id>=100));
});
