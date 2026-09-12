(function(root){
  'use strict';
  function listed(host,rules){
    return !!host&&rules.some(rule=>rule.id>=100&&rule.action.type==='block'&&
      rule.condition.resourceTypes?.includes('main_frame')&&
      rule.condition.requestDomains?.some(d=>host===d||host.endsWith('.'+d)));
  }
  async function closeListedTarget(details,chrome,core){
    // Only newly created navigation targets. Never act on the source tab or
    // on arbitrary tab updates, which can be normal links, logins or playback.
    if(details.tabId===details.sourceTabId||details.sourceTabId<0)return false;
    const destination=core.host(details.url);
    if(!destination)return false;
    try{
      const [source,rules,data]=await Promise.all([
        chrome.tabs.get(details.sourceTabId),
        chrome.declarativeNetRequest.getDynamicRules(),
        chrome.storage.local.get('protection')
      ]);
      const config=core.config(data.protection),origin=core.host(source.url);
      if(details.sourceUrl&&details.sourceUrl!==source.url)return false;
      if(core.recovering(config,origin,"popups")||core.recovering(config,origin,"network")||!config.popups||!config.network||!core.enabledFor(config,origin)||!core.enabledFor(config,destination)||origin===destination||!listed(destination,rules))return false;
      // Re-read immediately before closing: leave a tab alone if it has already
      // moved away from this event's destination, or its opener has navigated.
      const [target,currentSource]=await Promise.all([chrome.tabs.get(details.tabId),chrome.tabs.get(details.sourceTabId)]);
      if(currentSource.url!==source.url)return false;
      const current=target.pendingUrl||target.url;
      if(current!==details.url)return false;
      await chrome.tabs.remove(details.tabId);
      return true;
    }catch{
      // Tabs may disappear while awaiting Chrome; missing state means leave alone.
      return false;
    }
  }
  class Tracker{
    constructor(chrome,core,onClose,now=()=>Date.now()){this.chrome=chrome;this.core=core;this.onClose=onClose;this.now=now;this.pending=new Map();}
    prune(){for(const [id,v] of this.pending)if(v.until<=this.now())this.pending.delete(id);}
    async created(d){
      this.prune();if(d.tabId===d.sourceTabId||d.sourceTabId<0)return;
      try{
        const source=await this.chrome.tabs.get(d.sourceTabId);
        if(!this.core.host(source.url))return;
        if(this.pending.size>=100)this.pending.delete(this.pending.keys().next().value);
        this.pending.set(d.tabId,{sourceTabId:d.sourceTabId,sourceUrl:source.url,until:this.now()+10000});
        await this.navigate({...d,frameId:0});
      }catch{this.pending.delete(d.tabId);}
    }
    async navigate(d){
      this.prune();const p=this.pending.get(d.tabId);if(!p||d.frameId!==0)return;
      if(await closeListedTarget({...d,...p},this.chrome,this.core)){this.pending.delete(d.tabId);this.onClose({sourceTabId:p.sourceTabId,host:this.core.host(d.url),at:this.now()});}
    }
    committed(d){if(d.frameId===0&&d.url!=='about:blank')this.pending.delete(d.tabId);}
    removed(id){this.pending.delete(id);for(const [tab,p]of this.pending)if(p.sourceTabId===id)this.pending.delete(tab);}
  }
  const api={closeListedTarget,Tracker};
  if(typeof module!=='undefined')module.exports=api;else root.PopupGuard=api;
})(typeof globalThis==='undefined'?this:globalThis);
