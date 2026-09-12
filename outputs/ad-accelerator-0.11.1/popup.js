'use strict';
const $=id=>document.getElementById(id);
$('version').textContent=chrome.runtime.getManifest().version;
let tab,hostname,key,config,strictHost,saving=false,temporaryUntil=0,refreshToken=0;
const controls=['protection','site-enabled','network','cosmetics','popups','enabled','prefer-skip','speed','auto-update','update','pause','pick','recover','recovery-reset','reload','strict','strict-pause','allow-destination'];
function busy(value){saving=value;if(value)++refreshToken;for(const id of controls)$(id).disabled=value;for(const b of document.querySelectorAll("[data-recovery],#hidden-rules button"))b.disabled=value;}
function message(text){$('message').textContent=text;$('message').hidden=!text;}
async function request(type,extra={}){const r=await chrome.runtime.sendMessage({type,tabId:tab?.id,...extra});if(!r?.ok)throw Error(r?.error||'Extension unavailable');return r;}
async function refresh(){
 if(saving)return;
 const token=++refreshToken;
 try{
   [tab]=await chrome.tabs.query({active:true,currentWindow:true});$('privacy-link').href='privacy.html?tab='+encodeURIComponent(tab?.id??'');hostname=FilterCore.host(tab?.url);key=AdAcceleratorSites.siteFor(hostname)||hostname;
   const r=await request('protection-status');if(token!==refreshToken||saving)return;config=r.config;
   strictHost=r.strictSource||hostname;
   const strictOn=!!strictHost&&Object.hasOwn(config.strict,strictHost);
   $('strict').checked=strictOn;
   $('strict-note').textContent=strictHost&&strictHost!==hostname?'Navigation rules for '+strictHost:'Limit unwanted redirects';
   $('strict-source').textContent=strictHost?'Rules for '+strictHost:'';
   $('strict-attempts').replaceChildren();
   for(const entry of r.strictAttempts||[]){const li=document.createElement('li');li.textContent='External navigation attempted: '+entry.host;$('strict-attempts').append(li);}
   const destinations=config.strict[strictHost]||[],destinationKey=JSON.stringify([strictHost,destinations]);
   if($('allowed-destinations').dataset.key!==destinationKey){$('allowed-destinations').dataset.key=destinationKey;$('allowed-destinations').replaceChildren();for(const destination of destinations){const li=document.createElement('li'),label=document.createElement('span'),remove=document.createElement('button');label.textContent=destination;remove.textContent='Remove';remove.onclick=()=>action(()=>request('strict-remove',{destination}),'Destination removed. Reload the page.');li.append(label,remove);$('allowed-destinations').append(li);}}
   $('site').textContent=hostname||'Open a website to get started';
   for(const [id,field] of [['protection','enabled'],['network','network'],['cosmetics','cosmetics'],['popups','popups'],['auto-update','autoUpdate']])$(id).checked=config[field];
   const lasting=hostname&&config.disabledSites.some(d=>hostname===d||hostname.endsWith('.'+d));
   temporaryUntil=Math.max(0,...Object.entries(config.pauses||{}).filter(([d])=>hostname&&(hostname===d||hostname.endsWith('.'+d))).map(([,t])=>t));
   $('site-enabled').checked=FilterCore.enabledFor(config,hostname);
   const inherited=hostname&&[...config.disabledSites,...Object.keys(config.pauses)].filter(d=>hostname.endsWith('.'+d)).sort((a,b)=>a.length-b.length)[0];
   $('site-scope').textContent=!config.enabled?'Global protection is off — enable it in Settings':inherited?'Off under '+inherited+'. Turning on also resumes its subdomains.':(hostname||'This hostname')+' + subdomains';
   const data=await chrome.storage.local.get(['enabled','site.'+key]);if(token!==refreshToken||saving)return;const s=AdAcceleratorSites.settingsFor(data,key);
   $('enabled').checked=s.enabled;$('prefer-skip').checked=data['site.'+key]?.preferSkip!==false;$('speed').value=String(s.speed);
   $('video-status').textContent=r.videoText;
   const recoveryNames={cosmetics:'Automatic ad elements',custom:'My hidden elements',strict:'Strict navigation',video:'Video assistance',popups:'Popup cleanup',network:'Network filters'};
   const recovering=Object.keys(recoveryNames).filter(k=>FilterCore.recovering(config,hostname,k));
   $('recovery-status').textContent=recovering.length?'Temporarily paused: '+recovering.map(k=>recoveryNames[k]).join(', ')+'.':'No recovery pauses active.';
   $('hidden-count').textContent=(r.hiddenElements||[]).length+' saved';
   // Do not replace focused Undo controls on every status poll.
   const ruleKey=JSON.stringify(r.hiddenElements||[]);
   if($('hidden-rules').dataset.rules!==ruleKey){
     $('hidden-rules').dataset.rules=ruleKey;$('hidden-rules').replaceChildren();
     (r.hiddenElements||[]).forEach((rule,index)=>{const li=document.createElement('li'),label=document.createElement('span'),undo=document.createElement('button');label.textContent='Hidden '+rule.tag+' · '+(index+1);undo.textContent='Undo';undo.setAttribute('aria-label','Undo hidden '+rule.tag+' '+(index+1));undo.onclick=()=>action(()=>request('element-remove',{index,selector:rule.selector}),'Element restored.');li.append(label,undo);$('hidden-rules').append(li);});
     if(!r.hiddenElements?.length){const li=document.createElement('li');li.textContent='Nothing hidden yet.';$('hidden-rules').append(li);}
   }
   const active=FilterCore.enabledFor(config,hostname),f=r.filterStatus;
   $('headline').textContent=!hostname?'Website controls':!config.enabled?'Paused everywhere':lasting?'Protection is off here':temporaryUntil?'Paused for 10 minutes':!config.network?'Network filters off':!r.ready?'Filters need attention':'Protection is on';
   $('status').textContent=!hostname?'These controls work on HTTP and HTTPS websites.':!config.enabled?'Turn protection back on in Settings & filters.':lasting?'Stays off until you turn it back on.':temporaryUntil?'Resumes at '+new Date(temporaryUntil).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'.':!r.ready?'Install filters using Update filters below.':config.network?'Ad and tracker filters are active.':'Page and video tools follow the switches below.';
   $('pause').textContent=lasting||temporaryUntil?'Resume protection here':'Pause here for 10 minutes';
   $('pause-note').textContent=lasting?'Stays off until you turn protection back on.':!config.enabled?'Protection is paused everywhere.':temporaryUntil?'About '+Math.max(1,Math.ceil((temporaryUntil-Date.now())/60000))+' minutes left. Refresh after resuming.':'All site protections resume automatically.';
   $('video-pause-note').hidden=active&&!FilterCore.recovering(config,hostname,'video');
   $('video-pause-note').textContent='Paused here. These are your saved video preferences.';
   document.querySelector('.site-card').dataset.active=String(active);
   $('cookie-pause-note').hidden=!r.cookieConfigured;
   $('cookie-pause-note').textContent=r.cookiesSuspended?'Our cookie override is suspended across Chrome while any full-site pause or exception remains. Your Chrome settings apply.':'Pausing or disabling a site also suspends our cookie override across Chrome.';
   $('strict-status').textContent=!strictOn?'Optional · May affect external links.':!active?'Saved as on · Suspended while this site is off.':FilterCore.recovering(config,strictHost,'strict')?'Saved as on · Temporarily paused.':'On · External links may need an allowed destination.';
   $('popup-note').textContent=config.network?'New tabs targeting listed domains':'Requires Network filters to be on';
   $('filters').textContent=(f.domains?f.domains.toLocaleString()+' listed domains · '+new Date(f.installedAt).toLocaleDateString()+'. ':'')+(f.error||'');
   $('events').replaceChildren();
   const entries=[active&&config.network&&!FilterCore.recovering(config,hostname,'network')?'Network filters enabled. Request details are not logged.':'Network filtering is paused or unavailable here.',...(r.recentPopups||[]).map(e=>'Closed listed popup: '+e.host+' · '+new Date(e.at).toLocaleTimeString())];
   if(!r.recentPopups?.length)entries.push('No popup closures recorded for this tab in this worker session.');
   for(const text of entries){const li=document.createElement('li');li.textContent=text;$('events').append(li);}
   busy(false);
   for(const id of ['site-enabled','enabled','prefer-skip','speed'])$(id).disabled=!hostname;
   $('pause').disabled=!hostname||!config.enabled;
   $('site-enabled').disabled=!hostname||!config.enabled;
   $('popups').disabled=!config.network;
   $('pick').disabled=!active||FilterCore.recovering(config,hostname,'custom');
   $('strict').disabled=!FilterCore.domain(strictHost);$('allow-destination').disabled=!strictOn;$('strict-pause').disabled=!strictOn;
   $('recover').disabled=!hostname;$('reload').disabled=!hostname;
   $('recovery-reset').disabled=!recovering.length;
   for(const b of document.querySelectorAll('[data-recovery]'))b.disabled=!active||recovering.includes(b.dataset.recovery);
   if(recovering.length){$('recovery').hidden=false;$('headline').textContent=active?'Recovery mode':$('headline').textContent;$('status').textContent=active?'Some protections are temporarily paused here.':$('status').textContent;}
 }catch(e){if(token!==refreshToken||saving)return;busy(true);message('Could not read extension status. Reopen the popup or reload the extension. '+e.message);}
}
async function action(fn,success){busy(true);message('');try{await fn();if(success)message(success);}catch(e){message('Could not save changes: '+e.message);}finally{busy(false);await refresh();}}
function change(patch){return action(()=>request('protection-save',{patch}),'Saved. Refresh the website to apply protection changes.');}
for(const [id,field] of [['protection','enabled'],['network','network'],['cosmetics','cosmetics'],['popups','popups'],['auto-update','autoUpdate']])$(id).addEventListener('change',()=>change({[field]:$(id).checked}));
$('site-enabled').addEventListener('change',()=>action(()=>request('site-set',{enabled:$('site-enabled').checked,host:hostname}),'Site preference saved. Refresh this website.'));
$('pause').addEventListener('click',()=>action(()=>request(temporaryUntil||!$('site-enabled').checked?'site-resume':'site-pause'),'Saved. Refresh this website for the change to take effect.'));
async function videoSave(){await action(()=>chrome.storage.local.set({['site.'+key]:{enabled:$('enabled').checked,preferSkip:$('prefer-skip').checked,speed:Number($('speed').value)}}),'Video settings saved.');}
for(const id of ['enabled','prefer-skip','speed'])$(id).addEventListener('change',videoSave);
$('update').addEventListener('click',()=>action(()=>request('filters-update'),'Filters updated.'));
$('recover').addEventListener('click',()=>{$('recovery').hidden=false;$('recovery').open=true;$('recovery').scrollIntoView({block:'nearest'});});
$('pick').addEventListener('click',()=>action(async()=>{await request('element-pick');window.close();}));
for(const b of document.querySelectorAll('[data-recovery]'))b.addEventListener('click',()=>action(()=>request('recovery-set',{feature:b.dataset.recovery}),'Paused for 10 minutes on this site. Reload when ready.'));
$('recovery-reset').addEventListener('click',()=>action(()=>request('recovery-reset'),'Recovery pauses ended. Reload to restore previously blocked requests.'));
$('reload').addEventListener('click',()=>action(()=>chrome.tabs.reload(tab.id),'Page reloaded.'));
$('strict').addEventListener('change',()=>action(()=>request('strict-set',{enabled:$('strict').checked}),'Strict navigation updated. Reload the website.'));
$('allow-destination').addEventListener('click',()=>action(async()=>{await request('strict-allow',{destination:$('destination').value});$('destination').value='';},'Destination allowed for this source hostname. Known-threat blocking remains active. Reload to retry.'));
$('strict-pause').addEventListener('click',()=>action(()=>request('recovery-set',{feature:'strict'}),'Strict navigation paused for 10 minutes. Reload the page.'));
refresh();setInterval(refresh,2000);

$('adaptive-link').addEventListener('click',e=>{e.preventDefault();if(tab?.id)chrome.tabs.create({url:chrome.runtime.getURL('adaptive.html')+'?tab='+tab.id});});
