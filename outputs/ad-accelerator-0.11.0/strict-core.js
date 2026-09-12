(function(root){
 'use strict';
 function active(c,h,core){return !!h&&Object.hasOwn(c.strict||{},h)&&core.enabledFor(c,h)&&c.network&&!core.recovering(c,h,'network')&&!core.recovering(c,h,'strict');}
 function allowed(c,source,dest){return !!dest&&(dest===source||(c.strict?.[source]||[]).includes(dest));}
 function rules(tabId,source,destinations,id){
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return [{id,priority:5,action:{type:'block'},condition:{tabIds:[tabId],resourceTypes:['main_frame'],urlFilter:'|http'}},{id:id+1,priority:6,action:{type:'allow'},condition:{tabIds:[tabId],resourceTypes:['main_frame'],regexFilter:'^https?://('+[source,...destinations].map(escape).join('|')+')(:[0-9]+)?/'}}];
 }
 const api={active,allowed,rules};if(typeof module!=='undefined')module.exports=api;else root.StrictCore=api;
})(typeof globalThis==='undefined'?this:globalThis);
