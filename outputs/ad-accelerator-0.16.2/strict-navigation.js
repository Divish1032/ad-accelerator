(function(root){
 'use strict';
 class StrictNavigation{
  constructor(chrome,core,strict){this.chrome=chrome;this.core=core;this.strict=strict;}
  async states(){return (await this.chrome.storage.session.get('strictTabs')).strictTabs||{};}
  async apply(tabId,host,c){
   const all=await this.states();
   let entry=all[tabId];if(!entry&&!host)return;
   if(!entry){const used=new Set(Object.values(all).map(e=>e.id));let id=10000;while(used.has(id))id+=2;if(id>10398)throw Error('Strict protection limit reached for 200 tabs.');entry={id,host};}
   const previous=(await this.chrome.declarativeNetRequest.getSessionRules()).filter(r=>r.id===entry.id||r.id===entry.id+1);
   const next=host&&this.strict.active(c,host,this.core)?this.strict.rules(tabId,host,c.strict[host]||[],entry.id):[];
   for(const r of next.filter(r=>r.condition.regexFilter)){
    const result=await this.chrome.declarativeNetRequest.isRegexSupported({regex:r.condition.regexFilter,requireCapturing:false,isCaseSensitive:false});
    if(!result.isSupported)throw Error('Chrome cannot install these strict destinations ('+(result.reason||'unsupported rule')+'). Use fewer or shorter hostnames; existing protection was retained.');
   }
   await this.chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[entry.id,entry.id+1],addRules:next});
   if(host)all[tabId]={id:entry.id,host};else delete all[tabId];
   try{await this.chrome.storage.session.set({strictTabs:all});}catch(e){await this.chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[entry.id,entry.id+1],addRules:previous});throw e;}
  }
  async sync(c){
   const tabs=await this.chrome.tabs.query({}),all=await this.states(),live=new Set(tabs.map(t=>String(t.id)));
   for(const id of Object.keys(all))if(!live.has(id))await this.apply(Number(id),null,c);
   for(const tab of tabs){const h=this.core.host(tab.url),old=all[tab.id];
    // Preserve a guarded source on a blocked/error page so recovery remains possible.
    const source=old&&(this.strict.active(c,old.host,this.core)||h!==old.host)?old.host:(this.strict.active(c,h,this.core)?h:null);
    if(source||old)await this.apply(tab.id,source,c);
   }
  }
  async source(tabId){return (await this.states())[tabId]?.host;}
  async created(d,c){
   if(d.tabId===d.sourceTabId||d.sourceTabId<0)return;
   const h=await this.source(d.sourceTabId)||this.core.host((await this.chrome.tabs.get(d.sourceTabId)).url);
   if(!this.strict.active(c,h,this.core))return;
   await this.apply(d.tabId,h,c);
   if(this.core.host(d.url)&&!this.strict.allowed(c,h,this.core.host(d.url))){
    const target=await this.chrome.tabs.get(d.tabId);
    if((target.pendingUrl||target.url)===d.url)await this.chrome.tabs.remove(d.tabId);
   }
  }
  async committed(d,c){
   if(d.frameId!==0)return;
   // Blank popup documents still need their inherited source guard. A blank
   // page explicitly opened from the address bar must release that context.
   if(d.url==='about:blank'&&!d.transitionQualifiers?.includes('from_address_bar'))return;
   const h=this.core.host(d.url);await this.apply(d.tabId,this.strict.active(c,h,this.core)?h:null,c);
  }
  async registration(c){
   const matches=Object.keys(c.strict).filter(h=>this.strict.active(c,h,this.core)).map(h=>'*://'+h+'/*');
   const ids=['strict-main','strict-bridge'];
   const existing=await this.chrome.scripting.getRegisteredContentScripts({ids});
   if(existing.length)await this.chrome.scripting.unregisterContentScripts({ids:existing.map(e=>e.id)});
   if(matches.length)await this.chrome.scripting.registerContentScripts([
    {id:ids[0],matches,js:['strict-open.js'],runAt:'document_start',world:'MAIN',allFrames:true},
    {id:ids[1],matches,js:['strict-bridge.js'],runAt:'document_start',world:'ISOLATED',allFrames:true}
   ]);
  }
 }
 if(typeof module!=='undefined')module.exports=StrictNavigation;else root.StrictNavigation=StrictNavigation;
})(typeof globalThis==='undefined'?this:globalThis);
