(()=>{
 'use strict';
 async function refresh(){
  try{const c=await chrome.runtime.sendMessage({type:'strict-page-config'});window.dispatchEvent(new CustomEvent('ad-accelerator-strict-config',{detail:JSON.stringify(c)}));}
  catch{/* Keep the early guard restrictive until refresh if the extension is unavailable. */}
 }
 chrome.storage.onChanged.addListener((_c,area)=>{if(area==='local')void refresh();});
 void refresh();
})();
