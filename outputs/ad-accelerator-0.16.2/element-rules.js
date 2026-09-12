(function(root){
 'use strict';
 const selectorPattern=/^(?:#[A-Za-z_][\w-]{0,80}|[a-z][a-z0-9-]{0,30}(?::nth-of-type\([1-9][0-9]{0,4}\))?)(?: > [a-z][a-z0-9-]{0,30}:nth-of-type\([1-9][0-9]{0,4}\)){0,15}$/;
 function valid(r){return !!r&&typeof r.selector==='string'&&r.selector.length<1000&&selectorPattern.test(r.selector)&&typeof r.tag==='string'&&/^[a-z][a-z0-9-]{0,30}$/.test(r.tag)&&Array.isArray(r.classes)&&r.classes.length<=5&&r.classes.every(c=>typeof c==='string'&&/^[\w-]{1,80}$/.test(c));}
 function safe(e){return !!e&&!e.matches('html,body,head,script,style,link,meta,video,audio,form,input,textarea,select')&&!e.querySelector('video,audio,form,input[type="password"],iframe[allow*="encrypted-media"],iframe[src*="dailymotion"],iframe[src*="youtube"],iframe[src*="vimeo"]')&&!e.matches('iframe[allow*="encrypted-media"],iframe[src*="dailymotion"],iframe[src*="youtube"],iframe[src*="vimeo"]');}
 function describe(e,doc){
  if(!safe(e))return null;
  const parts=[];let node=e;
  while(node&&node!==doc.documentElement&&parts.length<16){
   if(/^[A-Za-z_][\w-]{0,80}$/.test(node.id||'')&&doc.querySelectorAll('#'+node.id).length===1){parts.unshift('#'+node.id);break;}
   const tag=node.tagName.toLowerCase(),siblings=[...(node.parentElement?.children||[])].filter(n=>n.tagName===node.tagName);
   parts.unshift(tag+':nth-of-type('+(siblings.indexOf(node)+1)+')');node=node.parentElement;
  }
  const r={selector:parts.join(' > '),tag:e.tagName.toLowerCase(),classes:[...e.classList].filter(c=>/^[\w-]{1,80}$/.test(c)).slice(0,5)};
  return valid(r)&&doc.querySelectorAll(r.selector).length===1?r:null;
 }
 class HiddenElements{
  constructor(doc){this.doc=doc;this.hidden=new Map();}
  restore(){for(const [e,s] of this.hidden)if(e.style.getPropertyValue('display')==='none')e.style.setProperty('display',s.value,s.priority);this.hidden.clear();}
  update(rules,enabled){
   if(!enabled){this.restore();return;}
   const wanted=new Set();
   for(const r of rules||[]){if(!valid(r))continue;let found;try{found=this.doc.querySelectorAll(r.selector);}catch{continue;}
    if(found.length!==1)continue;const e=found[0];if(!safe(e)||e.tagName.toLowerCase()!==r.tag||!r.classes.every(c=>e.classList.contains(c)))continue;
    wanted.add(e);if(!this.hidden.has(e))this.hidden.set(e,{value:e.style.getPropertyValue('display'),priority:e.style.getPropertyPriority('display')});
    if(e.style.getPropertyValue('display')!=='none'||e.style.getPropertyPriority('display')!=='important')e.style.setProperty('display','none','important');
   }
   for(const [e,s]of this.hidden)if(!wanted.has(e)){if(e.style.getPropertyValue('display')==='none')e.style.setProperty('display',s.value,s.priority);this.hidden.delete(e);}
  }
 }
 const api={valid,safe,describe,HiddenElements};if(typeof module!=='undefined')module.exports=api;else root.ElementRules=api;
})(typeof globalThis==='undefined'?this:globalThis);
