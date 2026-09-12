(function(root){
 'use strict';
 const GUARD_PARAMETERS=['sig','signature','token','access_token','id_token','code','state','redirect_uri','samlrequest','samlresponse','relaystate','x-amz-[^=&]+','x-goog-[^=&]+'];
 const GUARD_IDS=GUARD_PARAMETERS.map((_,i)=>i===0?21:23+i);
 const LINK_IDS=[20,21,22,23,...GUARD_IDS.slice(1)];
 const PARAMETERS=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','gclid','dclid','fbclid','msclkid','ttclid','mc_cid','mc_eid'];
 const SIGNED='[?&]('+GUARD_PARAMETERS.join('|')+')=';
 function safeLinkSnapshot(rules){
  // Do not restore a partially installed cleanup redirect after a failed update.
  const complete=GUARD_IDS.every(id=>rules.some(r=>r.id===id&&r.action.type==='allow'));
  return rules.filter(r=>!LINK_IDS.includes(r.id)||complete);
 }
 function locationPattern(o){const u=new URL(o);return u.protocol+'//'+u.hostname+':'+(u.port||(u.protocol==='https:'?'443':'80'))+'/*';}
 function origin(value){try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.origin:null;}catch{return null;}}
 function host(value){try{return new URL(value).hostname;}catch{return null;}}
 function validHost(h){return typeof h==='string'&&/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(h)&&h.length<=253;}
 function config(raw={}){
  return {blockCookies:typeof raw?.blockCookies==='boolean'?raw.blockCookies:null,cleanLinks:raw?.cleanLinks===true,linkExceptions:[...new Set((Array.isArray(raw?.linkExceptions)?raw.linkExceptions:[]).filter(validHost))].slice(0,100),locationOrigins:[...new Set((Array.isArray(raw?.locationOrigins)?raw.locationOrigins:[]).filter(u=>origin(u)===u))].slice(0,100)};
 }
 function linkRules(raw,protection){
  const p=config(raw);
  if(!p.cleanLinks||!protection.enabled||!protection.network)return [];
  const base={resourceTypes:['main_frame'],requestMethods:['get']};
  return [
   {id:20,priority:2,action:{type:'redirect',redirect:{transform:{queryTransform:{removeParams:PARAMETERS}}}},condition:{...base,regexFilter:'^https?://[^?#]+\\?([^#]*&)?('+PARAMETERS.join('|')+')=',isUrlFilterCaseSensitive:true}},
   // This low-priority allow only bypasses link cleaning. Threat/list blocking
   // (priority 10) and strict navigation blocking (priority 5) still win.
   ...GUARD_PARAMETERS.map((key,i)=>({id:GUARD_IDS[i],priority:3,action:{type:'allow'},condition:{...base,regexFilter:'[?&]'+key+'=',isUrlFilterCaseSensitive:false}})),
   ...(p.linkExceptions.length?[
    {id:22,priority:3,action:{type:'allow'},condition:{...base,requestDomains:p.linkExceptions}},
    {id:23,priority:3,action:{type:'allow'},condition:{...base,topDomains:p.linkExceptions}}
   ]:[])
  ];
 }
 const api={LINK_IDS,GUARD_IDS,PARAMETERS,SIGNED,origin,host,config,linkRules,locationPattern,safeLinkSnapshot};
 if(typeof module!=='undefined')module.exports=api;else root.PrivacyCore=api;
})(typeof globalThis==='undefined'?this:globalThis);
