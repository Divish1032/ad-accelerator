(function(root){
 'use strict';
 class AdaptiveElements{
  constructor(doc,core){this.doc=doc;this.core=core;this.hidden=new Map();this.rules=[];this.enabled=false;this.click=e=>{
   if(!this.enabled||!e.isTrusted)return;
   const link=e.composedPath().find(n=>n?.matches?.('a[href]'));
   if(link&&this.matches(link.href)){e.preventDefault();e.stopImmediatePropagation();}
  };doc.addEventListener('click',this.click,true);doc.addEventListener('auxclick',this.click,true);}
  matches(url){return this.core.eligible(url)&&this.rules.some(r=>r.destination===this.core.host(url)&&r.expires>Date.now());}
  restore(){for(const [e,v]of this.hidden)if(e.style.getPropertyValue('display')==='none')e.style.setProperty('display',v.value,v.priority);this.hidden.clear();}
  update(rules,enabled,cosmetics){
   this.rules=rules||[];this.enabled=!!enabled;
   if(!enabled||!cosmetics){this.restore();return;}
   const wanted=new Set();
   // Explicit ad markers plus a learned destination. Never classify by size,
   // blank appearance, arbitrary text or an ancestor containing the whole page.
   for(const e of [...this.doc.querySelectorAll('[data-ad-slot],[data-ad-unit],.adsbygoogle')].slice(0,100)){
    if(e.matches('html,body,main,article,nav,header,footer,[role="main"],form,video,audio,input,button,a,iframe')||e.querySelector('video,audio,form,input,textarea,select,button,[role="dialog"],iframe[allow*="encrypted-media"],iframe[allow*="autoplay"]'))continue;
    const targets=[...e.querySelectorAll('a[href],iframe[src]')];
    if(!targets.length||targets.length>10||!targets.every(n=>this.matches(n.href||n.src)))continue;
    wanted.add(e);if(!this.hidden.has(e))this.hidden.set(e,{value:e.style.getPropertyValue('display'),priority:e.style.getPropertyPriority('display')});e.style.setProperty('display','none','important');
   }
   for(const [e,v]of this.hidden)if(!wanted.has(e)){if(e.style.getPropertyValue('display')==='none')e.style.setProperty('display',v.value,v.priority);this.hidden.delete(e);}
  }
  stop(){this.enabled=false;this.restore();this.doc.removeEventListener('click',this.click,true);this.doc.removeEventListener('auxclick',this.click,true);}
 }
 if(typeof module!=='undefined')module.exports=AdaptiveElements;else root.AdaptiveElements=AdaptiveElements;
})(typeof globalThis==='undefined'?this:globalThis);
