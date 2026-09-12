(function(root){
 'use strict';
 class SiteCompatibility {
  constructor(doc,hostname){this.doc=doc;this.supported=['luciferdonghua.in','www.luciferdonghua.in'].includes(hostname);this.hidden=new Map();this.previousOverflow=null;}
  hide(box){
   if(!this.hidden.has(box))this.hidden.set(box,{value:box.style.getPropertyValue('display'),priority:box.style.getPropertyPriority('display')});
   box.style.setProperty('display','none','important');
  }
  hidePlayerAds(){
   // Exact observed ad frame, scoped to this site. Never hide arbitrary blank
   // iframes or the video-content parent, which also contains the real player.
   for(const frame of this.doc.querySelectorAll?.('iframe[src="https://t.co/Mi7nP8nOVO"]')||[]){
    const inner=frame.parentElement,overlay=inner?.parentElement;
    if(inner?.matches('div.kln')&&inner.children.length===2&&inner.querySelector('script[data-id="dl-banner-300x250"]'))this.hide(inner);
    if(!inner||!overlay||overlay.tagName!=='DIV'||overlay.style.position!=='absolute'||overlay.style.zIndex!=='200'||overlay.children.length!==1)continue;
    const close=inner.querySelector('span > img[src$="/wp-content/themes/animestream/assets/images/btn_close.gif"]');
    if(inner.children.length===2&&close&&overlay.parentElement?.matches('.video-content'))this.hide(overlay);
   }
  }
  update(enabled){
   if(!enabled||!this.supported){this.restore();return;}
   const doc=this.doc;
   this.hidePlayerAds();
   // Match the observed P21 ad-block message, not arbitrary dialogs or premium gates.
   for(const box of [...(doc.body?.children||[])]){
    if(this.hidden.has(box)||box.tagName!=='DIV'||box.style.position!=='fixed'||box.style.zIndex!=='2147483647')continue;
    const button=[...box.querySelectorAll('button')].some(e=>e.textContent.trim()==='I turned it off, reload the page');
    const title=[...box.querySelectorAll('div')].some(e=>e.textContent.trim()==='Please turn off your ad blocker');
    if(!button||!title)continue;
    this.hidden.set(box,{value:box.style.getPropertyValue('display'),priority:box.style.getPropertyPriority('display')});
    // Keep the node attached: its child-list observer otherwise re-adds it forever.
    box.style.setProperty('display','none','important');
    if(this.previousOverflow===null&&doc.documentElement.style.overflow==='hidden'){
      this.previousOverflow={value:doc.documentElement.style.getPropertyValue('overflow'),priority:doc.documentElement.style.getPropertyPriority('overflow')};
      doc.documentElement.style.setProperty('overflow','auto');
    }
   }
  }
  restore(){
   for(const [box,previous]of this.hidden){if(box.style.display==='none')box.style.setProperty('display',previous.value,previous.priority);}
   this.hidden.clear();
   if(this.previousOverflow!==null){const s=this.doc.documentElement.style;if(s.overflow==='auto')s.setProperty('overflow',this.previousOverflow.value,this.previousOverflow.priority);this.previousOverflow=null;}
  }
 }
 if(typeof module!=='undefined')module.exports=SiteCompatibility;else root.SiteCompatibility=SiteCompatibility;
})(typeof globalThis==='undefined'?this:globalThis);
