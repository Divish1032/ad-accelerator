// Runs in the page world at document_start on explicitly protected hostnames.
// This is a best-effort first layer. Network rules remain authoritative because
// a page can replace or evade page-world JavaScript hooks.
(()=>{
 'use strict';
 const original=window.open,source=location.hostname;
 let active=true,allowed=new Set([source]);
 const permitted=url=>{if(url===undefined||url===null||url==='')return false;try{const u=new URL(url,location.href);return /^https?:$/.test(u.protocol)&&allowed.has(u.hostname);}catch{return false;}};
 window.open=function(url,...rest){if(active&&!permitted(url))return null;return Reflect.apply(original,this,[url,...rest]);};
 window.addEventListener('ad-accelerator-strict-config',e=>{
  try{const c=JSON.parse(e.detail);active=c.active!==false;allowed=new Set([source,...(Array.isArray(c.allowed)?c.allowed.filter(x=>typeof x==='string'):[])]);}catch{}
 });
 // Capture ordinary external links too; they need an explicit destination exception.
 window.addEventListener('click',e=>{
  if(!active)return;const link=e.composedPath().find(n=>n?.tagName==='A'&&n.href);
  if(link&&!permitted(link.href)){e.preventDefault();e.stopImmediatePropagation();}
 },true);
})();
