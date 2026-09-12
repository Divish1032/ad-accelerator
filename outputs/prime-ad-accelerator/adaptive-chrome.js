(function(root){
 'use strict';
 class AdaptiveChrome{
  constructor(chrome,core,filters,readConfig,now=()=>Date.now()){Object.assign(this,{chrome,core,filters,readConfig,now});this.pending=new Map();}
  async state(){return this.core.state((await this.chrome.storage.local.get('adaptive')).adaptive,this.now());}
  prune(){for(const [id,p]of this.pending)if(p.until<=this.now())this.pending.delete(id);}
  removed(id){this.pending.delete(id);for(const [key,p]of this.pending)if(p.sourceId===id)this.pending.delete(key);}
  async created(d){
   this.prune();if(d.sourceTabId<0||d.sourceTabId===d.tabId)return;
   const source=await this.chrome.tabs.get(d.sourceTabId).catch(()=>null),c=await this.readConfig(),s=await this.state();
   if(!source||source.incognito||!s.enabled||!this.core.eligible(source.url)||!this.core.active(c,this.core.host(source.url),this.filters))return;
   if(this.pending.size>=100)this.pending.delete(this.pending.keys().next().value);
   this.pending.set(d.tabId,{sourceId:d.sourceTabId,sourceUrl:source.url,source:this.core.host(source.url),first:null,until:this.now()+10000});
   await this.navigate({...d,frameId:0});
  }
  async navigate(d){
   this.prune();const p=this.pending.get(d.tabId);if(!p||d.frameId!==0)return;
   if(d.url==='about:blank')return;
   if(!this.core.eligible(d.url)){this.pending.delete(d.tabId);return;}
   const dest=this.core.host(d.url),c=await this.readConfig(),s=await this.state();
   const source=await this.chrome.tabs.get(p.sourceId).catch(()=>null);
   if(!s.enabled||!source||source.url!==p.sourceUrl||source.incognito||!this.core.active(c,p.source,this.filters)||!this.filters.enabledFor(c,dest)||(c.strict[p.source]||[]).includes(dest)){this.pending.delete(d.tabId);return;}
   // Only bundled/downloaded block rules are trusted evidence. Learned rules
   // never teach other learned rules (no self-reinforcing classification).
   const installed=await this.chrome.declarativeNetRequest.getDynamicRules();
   const listed=installed.some(r=>r.id>=100&&r.action.type==='block'&&r.condition.resourceTypes?.includes('main_frame')&&r.condition.requestDomains?.some(h=>dest===h||dest.endsWith('.'+h)));
   if(listed){
    this.pending.delete(d.tabId);
    if(p.first&&p.first!==dest&&p.first!==p.source){const next=this.core.observe(s,p.source,p.first,dest,this.now());if(JSON.stringify(next)!==JSON.stringify(s))await this.chrome.storage.local.set({adaptive:next});}
    return;
   }
   if(!p.first)p.first=dest;
   if(!this.core.rules(s,p.source,this.now()).some(r=>r.destination===dest))return;
   const [target,latest]=await Promise.all([this.chrome.tabs.get(d.tabId).catch(()=>null),this.chrome.tabs.get(p.sourceId).catch(()=>null)]);
   if(!target||target.incognito||latest?.url!==p.sourceUrl||(target.pendingUrl||target.url)!==d.url)return;
   await this.chrome.tabs.remove(d.tabId);this.pending.delete(d.tabId);
  }
  async committed(d){
   if(d.frameId!==0)return;
   await this.navigate(d);
   // A committed ordinary document could later navigate due to user input.
   // Stop learning there rather than treating all subsequent browsing as a chain.
   if(d.url!=='about:blank')this.pending.delete(d.tabId);
  }
 }
 if(typeof module!=='undefined')module.exports=AdaptiveChrome;else root.AdaptiveChrome=AdaptiveChrome;
})(typeof globalThis==='undefined'?this:globalThis);
