(function(root){
 'use strict';
 class ElementPicker{
  constructor(doc,send){this.doc=doc;this.send=send;this.cleanup=null;}
  stop(){this.cleanup?.();this.cleanup=null;}
  start(){
   this.stop();const doc=this.doc,win=doc.defaultView;
   const host=doc.createElement('div');host.style.cssText='all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;';
   const shadow=host.attachShadow({mode:'closed'});
   shadow.innerHTML=`<style>:host{color-scheme:dark}*{box-sizing:border-box}.shield{position:fixed;inset:0;pointer-events:auto;cursor:crosshair}.outline{position:fixed;border:2px solid #a3ebc8;background:#84d4b422;pointer-events:none;display:none}.panel{position:fixed;bottom:20px;right:20px;width:min(340px,calc(100vw - 40px));padding:18px;border:1px solid #526c60;border-radius:14px;background:#111718;color:#eef3f5;font:14px/1.5 system-ui;box-shadow:0 8px 30px #0008;pointer-events:auto}h2{font-size:17px;margin:0 0 6px}p{color:#bcc9c5;font-size:12px;margin:6px 0 14px}button{font:inherit;background:#23392e;color:#e8f4ee;border:1px solid #526c60;border-radius:8px;padding:8px 12px;margin:3px;cursor:pointer}button:disabled{opacity:.4}button:focus-visible{outline:2px solid #a3ebc8}.primary{background:#84d4b4;color:#153e2e}</style><div class="shield"></div><div class="outline"></div><section class="panel" role="dialog" aria-label="Hide an element"><h2>Hide an element</h2><p role="status">Point to a box, then click to select it. Escape cancels. Embedded frames can only be selected as a whole.</p><button class="primary" id="save" disabled>Hide on this site</button><button id="again" disabled>Pick another</button><button id="cancel">Cancel</button></section>`;
   doc.documentElement.append(host);
   const panel=shadow.querySelector('.panel'),outline=shadow.querySelector('.outline'),status=shadow.querySelector('p'),save=shadow.querySelector('#save'),again=shadow.querySelector('#again');
   let candidate=null,rule=null,selected=false,pending=false,stopped=false;
   const paint=()=>{if(!candidate?.isConnected){outline.style.display='none';return;}const r=candidate.getBoundingClientRect();outline.style.cssText=`display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;};
   const move=e=>{if(!e.isTrusted||selected||pending||e.composedPath().includes(host))return;candidate=doc.elementsFromPoint(e.clientX,e.clientY).find(el=>el!==host&&!host.contains(el));rule=ElementRules.describe(candidate,doc);paint();status.textContent=rule?'Click to select this '+rule.tag+' element.':'Choose a smaller box. Page roots, forms and recognized players are protected.';};
   const block=e=>{
    // Closed shadow events are retargeted to host outside the picker. Handle
    // selection on the shield itself; page-dispatched clicks are never consent.
    if(!e.isTrusted||e.composedPath().includes(host))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(e.type==='click'&&!pending&&!selected){candidate=doc.elementsFromPoint(e.clientX,e.clientY).find(el=>el!==host&&!host.contains(el));rule=ElementRules.describe(candidate,doc);selected=!!rule;save.disabled=!selected;again.disabled=!selected;status.textContent=selected?'Selected '+rule.tag+'. Confirm to hide it on this hostname. You can undo in the extension.':'This element cannot be hidden. Choose a smaller box.';paint();}
   };
   const key=e=>{if(e.isTrusted&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.stop();}};
   const types=['pointerdown','pointerup','mousedown','mouseup','click','auxclick','dblclick','contextmenu'];
   for(const type of types)win.addEventListener(type,block,true);
   win.addEventListener('mousemove',move,true);win.addEventListener('keydown',key,true);win.addEventListener('scroll',paint,true);win.addEventListener('resize',paint);
   // Forward trusted shield events without exposing the closed panel to page scripts.
   const shield=shadow.querySelector('.shield');
   shield.addEventListener('mousemove',e=>move({isTrusted:e.isTrusted,clientX:e.clientX,clientY:e.clientY,composedPath:()=>[]}));
   for(const type of types)shield.addEventListener(type,e=>block({isTrusted:e.isTrusted,type:e.type,clientX:e.clientX,clientY:e.clientY,composedPath:()=>[],preventDefault:()=>e.preventDefault(),stopImmediatePropagation:()=>e.stopImmediatePropagation()}));
   shadow.querySelector('#cancel').onclick=e=>{if(e.isTrusted)this.stop();};
   again.onclick=e=>{if(!e.isTrusted)return;selected=false;candidate=null;rule=null;save.disabled=true;again.disabled=true;outline.style.display='none';status.textContent='Point to another box and click to select it.';};
   save.onclick=async e=>{if(!e.isTrusted||!rule||pending)return;pending=true;save.disabled=true;again.disabled=true;
    try{const r=await this.send({type:'element-add',rule});if(!r?.ok)throw Error(r?.error||'Unable to save');if(!stopped)this.stop();}
    catch(e){if(!stopped){status.textContent='Could not save. '+e.message;pending=false;save.disabled=false;again.disabled=false;}}
   };
   const previous=doc.activeElement;shadow.querySelector('#cancel').focus();
   this.cleanup=()=>{stopped=true;for(const type of types)win.removeEventListener(type,block,true);win.removeEventListener('mousemove',move,true);win.removeEventListener('keydown',key,true);win.removeEventListener('scroll',paint,true);win.removeEventListener('resize',paint);host.remove();previous?.focus?.({preventScroll:true});};
  }
 }
 if(typeof module!=='undefined')module.exports=ElementPicker;else root.ElementPicker=ElementPicker;
})(typeof globalThis==='undefined'?this:globalThis);
