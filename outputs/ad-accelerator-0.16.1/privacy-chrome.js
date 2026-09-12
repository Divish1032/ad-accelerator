(function(root){
 'use strict';
 // All new browser-specific privacy operations live here. A future browser
 // adapter must report capabilities and effective state, never silently no-op.
 class ChromePrivacy{
  constructor(api,core,filter){this.api=api;this.core=core;this.filter=filter;}
  siteActive(c,o){return this.filter.enabledFor({...this.filter.DEFAULTS,...c},this.filter.host(o));}
  async permission(name){return !!this.api.permissions&&await this.api.permissions.contains({permissions:[name]});}
  async preferences(){return this.core.config((await this.api.storage.local.get('privacyPreferences')).privacyPreferences);}
  async cookieState(){
   if(!await this.permission('privacy')||!this.api.privacy?.websites?.thirdPartyCookiesAllowed)return {available:false};
   const s=await this.api.privacy.websites.thirdPartyCookiesAllowed.get({incognito:false});
   return {available:true,blocked:s.value===false,owned:s.levelOfControl==='controlled_by_this_extension',controllable:['controllable_by_this_extension','controlled_by_this_extension'].includes(s.levelOfControl),level:s.levelOfControl};
  }
  async setCookieOverride(block){
   if(typeof block!=='boolean')throw Error('Invalid cookie setting.');
   const s=await this.cookieState();if(!s.available)throw Error('Cookie permission is missing or unsupported.');
   const setting=this.api.privacy.websites.thirdPartyCookiesAllowed;
   if(block){
    if(!s.controllable)throw Error('Chrome policy or another extension controls third-party cookies.');
    await setting.set({value:false,scope:'regular'});
    const current=await this.cookieState();
    if(!current.blocked||!current.owned){await setting.clear({scope:'regular'});throw Error('Chrome did not apply this cookie setting.');}
   }else await setting.clear({scope:'regular'}); // Reveal user's underlying setting; never force cookies on.
   return this.cookieState();
  }
  cookiesSuspended(c={}){
   // The native override is Chrome-wide. Any full-site exception releases it;
   // independent recovery switches do not change this preference.
   return c.enabled===false||Object.keys(c.pauses||{}).length>0||(c.disabledSites||[]).length>0;
  }
  async migrateCookies(){
   const p=await this.preferences();if(p.blockCookies!==null)return p;
   const state=await this.cookieState();if(!state.available)return p;
   const next={...p,blockCookies:state.owned&&state.blocked};
   await this.api.storage.local.set({privacyPreferences:next});return next;
  }
  async syncCookies(p,c={}){
   const s=await this.cookieState();if(!s.available)return;
   if(p.blockCookies===null)return; // No user choice or owned override to migrate.
   if(!p.blockCookies||this.cookiesSuspended(c)){
    // Also clears a previously-owned override hidden by another controller.
    await this.api.privacy.websites.thirdPartyCookiesAllowed.clear({scope:'regular'});
   }else if(s.controllable){
    if(!s.owned||!s.blocked)await this.setCookieOverride(true);
   }
   // Other extensions/policy may take precedence. Keep the saved choice and
   // report that effective state instead of blocking unrelated protection.
  }
  async cookies(block,c={}){
   if(typeof block!=='boolean')throw Error('Invalid cookie setting.');
   const s=await this.cookieState();if(block&&!s.available)throw Error('Cookie permission is missing or unsupported.');
   if(block&&!s.controllable)throw Error('Chrome policy or another extension controls third-party cookies.');
   const old=await this.migrateCookies(),next={...old,blockCookies:block};
   try{await this.syncCookies(next,c);await this.api.storage.local.set({privacyPreferences:next});}
   catch(e){await this.syncCookies(old,c);throw e;}
   return this.cookieState();
  }
  async checkedLinkRules(p,c){
   const rules=this.core.linkRules(p,c);
   for(const r of rules.filter(r=>r.condition.regexFilter)){
    const result=await this.api.declarativeNetRequest.isRegexSupported({regex:r.condition.regexFilter,isCaseSensitive:r.condition.isUrlFilterCaseSensitive===true,requireCapturing:false});
    if(!result.isSupported)throw Error('Chrome cannot install tracking-link protection ('+(result.reason||'unsupported rule')+'). Link cleanup was not enabled.');
   }
   return rules;
  }
  async verifyLinks(expected){
   const actual=(await this.api.declarativeNetRequest.getDynamicRules()).filter(r=>this.core.LINK_IDS.includes(r.id));
   if(expected.length!==actual.length||expected.some(e=>!actual.some(a=>a.id===e.id)))throw Error('Chrome did not install all tracking-link safeguards. Link cleanup was not enabled.');
  }
  async syncLinks(p,c){
   const rules=await this.checkedLinkRules(p,c),old=this.core.safeLinkSnapshot((await this.api.declarativeNetRequest.getDynamicRules()).filter(r=>this.core.LINK_IDS.includes(r.id)));
   try{
    await this.api.declarativeNetRequest.updateDynamicRules({removeRuleIds:this.core.LINK_IDS,addRules:rules});
    await this.verifyLinks(rules);
   }catch(e){await this.api.declarativeNetRequest.updateDynamicRules({removeRuleIds:this.core.LINK_IDS,addRules:old});throw e;}
  }
  async links(change,c){
   const old=await this.preferences(),next=this.core.config({...old,...change});
   await this.syncLinks(next,c);
   try{await this.api.storage.local.set({privacyPreferences:next});}catch(e){await this.syncLinks(old,c);throw e;}
  }
  async syncLocation(p,c={}){
   // Revoking an optional permission must not prevent other protections from
   // pausing/resuming. Explicit location changes still require permission.
   if(!await this.permission('contentSettings')||!this.api.contentSettings?.location)return;
   // clear() only removes this extension's location rules, not Chrome/user rules.
   await this.api.contentSettings.location.clear({scope:'regular'});
   for(const o of p.locationOrigins.filter(o=>this.siteActive(c,o))){
    const pattern=this.core.locationPattern(o);
    // Chrome rejects differing embedded patterns for location. Limit the rule
    // to this exact requesting AND top-level origin, including its port.
    await this.api.contentSettings.location.set({primaryPattern:pattern,secondaryPattern:pattern,setting:'block',scope:'regular'});
   }
  }
  async location(o,blocked,c={}){
   if(this.core.origin(o)!==o||typeof blocked!=='boolean')throw Error('Invalid website location setting.');
   if(!await this.permission('contentSettings')||!this.api.contentSettings?.location)throw Error('Location permission is missing or unsupported.');
   const old=await this.preferences();
   if(blocked&&!old.locationOrigins.includes(o)&&old.locationOrigins.length>=100)throw Error('Maximum 100 location restrictions.');
   const next={...old,locationOrigins:blocked?[...new Set([...old.locationOrigins,o])]:old.locationOrigins.filter(x=>x!==o)};
   try{
    await this.syncLocation(next,c);
    const applied=await this.api.contentSettings.location.get({primaryUrl:o,secondaryUrl:o,incognito:false});
    if(blocked&&this.siteActive(c,o)&&applied.setting!=='block')throw Error('Chrome did not apply the location restriction.');
    await this.api.storage.local.set({privacyPreferences:next});
   }catch(e){await this.syncLocation(old,c);throw e;}
  }
  async source(tabId){
   if(!Number.isInteger(tabId))throw Error('Open Privacy from a website tab.');
   const tab=await this.api.tabs.get(tabId),o=this.core.origin(tab.url);
   if(tab.incognito)throw Error('These privacy controls currently support regular Chrome windows only.');
   if(!o)throw Error('The source tab is no longer an HTTP or HTTPS website.');
   return o;
  }
  async status(tabId,c={}){
   let o=null;try{o=await this.source(tabId);}catch{}
   const p=await this.preferences(),locationAvailable=await this.permission('contentSettings')&&!!this.api.contentSettings?.location;
   const l=o&&locationAvailable?await Promise.resolve().then(()=>this.api.contentSettings.location.get({primaryUrl:o,secondaryUrl:o,incognito:false})).catch(e=>({error:e.message})):null;
   const cookies=await this.cookieState().catch(e=>({available:false,error:e.message}));
   const linkRules=await this.api.declarativeNetRequest.getDynamicRules();
   const siteActive=this.siteActive(c,o);
   return {preferences:p,origin:o,siteActive,cookiesSuspended:this.cookiesSuspended(c),linksInstalled:linkRules.some(r=>r.id===20&&r.action.type==='redirect')&&this.core.GUARD_IDS.every(id=>linkRules.some(r=>r.id===id&&r.action.type==='allow')),cookies,location:{available:locationAvailable,setting:l?.setting||'unknown',error:l?.error,owned:p.locationOrigins.includes(o),active:siteActive&&p.locationOrigins.includes(o)},cleanupAvailable:await this.permission('browsingData')&&!!this.api.browsingData?.remove};
  }
  async prepare(tabId){
   const o=await this.source(tabId),token=crypto.randomUUID();
   const data=await this.api.storage.session.get('privacyCleanup'),pending=Object.fromEntries(Object.entries(data.privacyCleanup||{}).filter(([,v])=>v.until>Date.now()).slice(-19));
   pending[token]={origin:o,tabId,until:Date.now()+300000};await this.api.storage.session.set({privacyCleanup:pending});
   return {token,origin:o};
  }
  async cleanup(m){
   if(m.confirm!==true||typeof m.cookies!=='boolean'||typeof m.siteStorage!=='boolean'||!m.cookies&&!m.siteStorage)throw Error('Choose data to clear and confirm the cleanup.');
   if(!await this.permission('browsingData')||!this.api.browsingData?.remove)throw Error('Site cleanup permission is missing or unsupported.');
   const data=await this.api.storage.session.get('privacyCleanup'),pending=data.privacyCleanup||{},entry=pending[m.token];
   if(!entry||entry.tabId!==m.tabId||entry.until<Date.now())throw Error('Cleanup confirmation expired. Review it again.');
   if(await this.source(m.tabId)!==entry.origin)throw Error('The website changed. Review cleanup again.');
   // Consume confirmation before the irreversible API call; never retry silently.
   delete pending[m.token];await this.api.storage.session.set({privacyCleanup:pending});
   const types={...(m.cookies?{cookies:true}:{}),...(m.siteStorage?{localStorage:true,indexedDB:true,cacheStorage:true,serviceWorkers:true}:{})};
   try{await this.api.browsingData.remove({origins:[entry.origin],since:0,originTypes:{unprotectedWeb:true,protectedWeb:false,extension:false}},types);}
   catch{throw Error('Cleanup did not finish. Some selected data may already be removed; review before trying again.');}
   return {origin:entry.origin};
  }
 }
 if(typeof module!=='undefined')module.exports=ChromePrivacy;else root.ChromePrivacy=ChromePrivacy;
})(typeof globalThis==='undefined'?this:globalThis);
