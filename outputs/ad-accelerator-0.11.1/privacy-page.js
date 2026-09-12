'use strict';
const $=id=>document.getElementById(id),sourceId=new URLSearchParams(location.search).get('tab'),tabId=/^\d+$/.test(sourceId||'')?Number(sourceId):NaN;
$('version').textContent=chrome.runtime.getManifest().version+' · Privacy';
let state=null,busy=false,confirmation=null,epoch=0;
const inputs=['links','link-exempt','cookies','location','review','confirm','cancel','clear-storage','clear-cookies','release-cookies'];
function notice(text,target='notice'){const el=$(target);el.textContent=text;el.hidden=!text;}
function lock(value){busy=value;if(value)++epoch;for(const id of inputs)$(id).disabled=value;}
function permission(name,needed){
 try{return needed?chrome.permissions.request({permissions:[name]}):Promise.resolve(true);}catch(e){return Promise.reject(e);}
}
async function request(type,extra={}){
 const result=await chrome.runtime.sendMessage({type,tabId,...extra});
 if(!result?.ok)throw Error(result?.error||'The extension is unavailable.');return result;
}
function selection(){ $('confirm').disabled=busy||!confirmation||!$('clear-storage').checked&&!$('clear-cookies').checked; }
async function refresh(){
 if(busy)return;const id=++epoch;
 try{
  const s=await request('privacy-status');if(id!==epoch||busy)return;state=s;
  $('origin').textContent=s.origin||'The source website is unavailable. Open Privacy from its Ad Accelerator popup.';
  $('links').checked=s.preferences.cleanLinks;
  const h=PrivacyCore.host(s.origin),exempt=!!h&&s.preferences.linkExceptions.some(d=>h===d||h.endsWith('.'+d));
  const inherited=h&&s.preferences.linkExceptions.find(d=>h.endsWith('.'+d));
  $('link-exempt').checked=exempt;
  $('link-status').textContent=inherited?'Original links are kept by an exception for '+inherited+'. Open Privacy on that hostname to change it.':exempt?'Original links are kept for this hostname and its subdomains.':!s.preferences.cleanLinks?'Off. Turn on the switch above to clean future navigation links.':!s.siteActive?'Saved as on, temporarily suspended by site or global pause.':!s.linkFilteringActive?'Saved as on, but network filtering is off or recovering here.':!s.linksInstalled?'Saved as on, but Chrome has no cleanup rule installed. Reload the extension and try again.':'On. Chrome has the cleanup rule installed for future GET page navigations. Existing URLs are not rewritten; signed links and strict-navigation exceptions may be preserved.';
  $('release-cookies').hidden=!s.cookies.available||s.cookies.controllable;
  $('cookies').checked=s.preferences.blockCookies??(s.cookies.available&&s.cookies.owned&&s.cookies.blocked);
  $('cookie-status').textContent=s.cookies.error?'Could not read Chrome’s cookie setting: '+s.cookies.error:s.preferences.blockCookies&&s.cookiesSuspended?'Saved as on. Our override is suspended across Chrome until all full-site pauses and exceptions end. Your Chrome settings still apply.':!s.cookies.available?(s.preferences.blockCookies?'Saved as on, but Chrome’s privacy permission is missing. Turn off and on to request it again.':'Off in this extension. Enable to request Chrome’s privacy permission.'):s.cookies.blocked?'Chrome reports third-party cookies blocked'+(s.cookies.owned?' by this extension.':'; your browser or another controller already restricts them.'):s.preferences.blockCookies?'Saved as on, but Chrome has not applied our cookie restriction.':'Chrome currently allows third-party cookies, subject to its other protections.';
  if(s.cookies.available&&!s.cookies.controllable)$('cookie-status').textContent+=' Managed by Chrome policy or another extension. You can still remove our override if one was set earlier.';
  $('location').checked=s.location.available&&s.location.owned;
  $('location-status').textContent=s.location.error?'Could not read Chrome’s location setting: '+s.location.error:!s.location.available?'Off until permission is granted. Turn on the switch above to request Chrome’s site-settings permission.':!s.origin?'No website selected.':s.location.owned&&!s.siteActive?'Saved as on, temporarily suspended by site or global pause. Chrome reports location: '+s.location.setting+'.':s.location.owned?'Saved as on. Chrome reports location: '+s.location.setting+'.'+(s.location.setting==='block'?' Our restriction is applied.':' Our restriction is not enforced; Chrome policy or another extension may take precedence.'):'Off in this extension. Chrome reports location: '+s.location.setting+'. Turn on the switch above to add our restriction.';
  lock(false);for(const id of ['links','link-exempt','cookies','location','review'])$(id).disabled=!s.origin;
  $('release-cookies').disabled=!s.origin;
  $('link-exempt').disabled=!s.origin||!s.preferences.cleanLinks||!!inherited;
  $('cookies').disabled=!s.origin||s.cookies.available&&!s.cookies.controllable&&!s.cookies.owned&&!s.preferences.blockCookies;
  selection();
 }catch(e){if(id!==epoch||busy)return;lock(true);notice(e.message+' Reopen Privacy to reconnect.');}
}
async function action(fn,success,target='notice'){lock(true);notice('',target);try{await fn();if(success)notice(success,target);}catch(e){notice(e.message,target);}finally{lock(false);await refresh();}}
$('links').addEventListener('change',()=>{const enabled=$('links').checked;void action(()=>request('privacy-links',{enabled}),'Tracking-link setting saved. The status below reports whether it is active here.','links-message');});
$('link-exempt').addEventListener('change',()=>{const exempt=$('link-exempt').checked,origin=state.origin;void action(()=>request('privacy-link-exception',{exempt,origin}),'Link exception saved.','links-message');});
$('cookies').addEventListener('change',()=>{
 const blocked=$('cookies').checked,grant=permission('privacy',blocked&&!state.cookies.available);
 void action(async()=>{if(!await grant)throw Error('Permission was declined. No cookie setting was changed.');await request('privacy-cookies',{blocked});},'Cookie control updated. Check Chrome’s reported state below.','cookies-message');
});
$('release-cookies').addEventListener('click',()=>action(()=>request('privacy-cookies',{blocked:false}),'Our cookie override was removed. Other Chrome settings still apply.','cookies-message'));
$('location').addEventListener('change',()=>{
 const blocked=$('location').checked,origin=state.origin,grant=permission('contentSettings',blocked&&!state.location.available);
 void action(async()=>{if(!await grant)throw Error('Permission was declined. No location setting was changed.');await request('privacy-location',{blocked,origin});},'Location setting saved. The status below reports whether it is active. Reload the website before testing access.','location-message');
});
$('review').addEventListener('click',()=>action(async()=>{
 confirmation=await request('privacy-prepare');$('cleanup-origin').textContent='Review cleanup for '+confirmation.origin;
 $('clear-storage').checked=false;$('clear-cookies').checked=false;$('cleanup').hidden=false;$('cleanup').scrollIntoView({block:'nearest'});
}));
$('cancel').addEventListener('click',()=>{confirmation=null;$('cleanup').hidden=true;notice('Cleanup cancelled. No data was removed.');});
for(const id of ['clear-storage','clear-cookies'])$(id).addEventListener('change',selection);
$('confirm').addEventListener('click',()=>{
 if(!confirmation)return;
 const payload={token:confirmation.token,cookies:$('clear-cookies').checked,siteStorage:$('clear-storage').checked,confirm:true};
 const grant=permission('browsingData',!state.cleanupAvailable);
 void action(async()=>{
  if(!await grant)throw Error('Permission was declined. No data was removed.');
  notice('Clearing selected data… this can take a little while.');
  await request('privacy-cleanup',payload);confirmation=null;$('cleanup').hidden=true;
 },'Selected data cleared. Open pages may save new data; close or reload them when ready.');
});
void refresh();setInterval(refresh,5000);
