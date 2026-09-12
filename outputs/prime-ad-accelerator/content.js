(() => {
 'use strict';
 const {isAdLabel,Accelerator}=PrimeAdAcceleratorCore;
 const {siteFor,onDemandPath,inspectHotstar,inspectYouTube,inspectPlex,inspectMxPlayer,inspectZee5,inspectSonyLiv,inspectWeTv}=AdAcceleratorSites;
 const site=siteFor(location.hostname),accelerator=new Accelerator(),skipper=new VideoActions.Skipper(),genericDetector=new VideoActions.TransitionDetector();
 let config={enabled:false,cosmetics:false},settings={enabled:false,speed:4,preferSkip:true},css=null,stopped=false,lastReport='',refreshId=0,disconnected=false;
 const compatibility=new SiteCompatibility(document,location.hostname);
 const custom=new ElementRules.HiddenElements(document),picker=new ElementPicker(document,send);
 const isTop=window===window.top;
 const adaptiveElements=isTop?new AdaptiveElements(document,AdaptiveCore):null;
 let lastAdaptive=0;
 const timers=[];
 function pickerMessage(m,_sender,reply){if(m.type!=='element-pick'||!isTop)return;if(!config.enabled||!config.custom){reply({ok:false,error:'Resume protection and hidden elements first.'});return;}picker.start();reply({ok:true});}
 chrome.runtime.onMessage.addListener(pickerMessage);
 function disconnect(){
   if(disconnected)return;disconnected=true;stopped=true;++refreshId;
   config.enabled=false;adaptiveElements?.stop();picker.stop();custom.restore();compatibility.restore();accelerator.stop('Extension disconnected; refresh this tab');skipper.reset();genericDetector.reset();css?.remove();
   timers.forEach(clearInterval);
   try{chrome.runtime.onMessage.removeListener(pickerMessage);chrome.storage.onChanged.removeListener(storageChanged);}catch{}
 }
 async function send(message){
   // async captures both synchronous throws and rejected promises.
   if(disconnected||!chrome.runtime?.id)throw Error('Extension disconnected');
   return await chrome.runtime.sendMessage(message);
 }
 async function reportMessage(message){try{await send({type:'video-report',...message});}catch{disconnect();}}
 async function refresh(){
   if(disconnected)return;
   const id=++refreshId;
   try{
     const next=await send({type:'page-config'});
     if(id!==refreshId)return;config=next;
     settings=config.videoSettings;
     adaptiveElements?.update(config.adaptiveRules,config.adaptiveActive,config.enabled&&config.cosmetics);
     if(!config.enabled||!config.custom)picker.stop();
     if(isTop)custom.update(config.elementRules,config.enabled&&config.custom);
     if(config.enabled&&config.cosmetics){
       if(!css){const {selectors}=await send({type:'cosmetic-rules'});if(id!==refreshId)return;css=document.createElement('style');css.textContent=selectors.filter(s=>CSS.supports('selector('+s+')')).map(s=>s+'{display:none!important}').join('\n');}
       if(!css.isConnected)(document.head||document.documentElement).append(css);
     }else css?.remove();
     tick();
   }catch{if(id!==refreshId)return;disconnect();}
 }
 function tick(){
   if(stopped||disconnected)return;
   try{if(!chrome.runtime?.id){disconnect();return;}}catch{disconnect();return;}
   if(isTop)custom.update(config.elementRules,config.enabled&&config.custom);
   if(Date.now()-lastAdaptive>=1000){lastAdaptive=Date.now();adaptiveElements?.update(config.adaptiveRules,config.adaptiveActive,config.enabled&&config.cosmetics);}
   let result={video:null,ad:false},player=null;
   compatibility.update(config.enabled&&config.cosmetics);
   try{
     const eligible=!site||onDemandPath(site,location.pathname);
     if(eligible){
       // Try the conservative cross-player transition detector first. Named
       // adapters remain the fallback; Prime also supplies pod metadata.
       result=genericDetector.inspect(document,getComputedStyle,performance.now(),location.href||location.hostname+location.pathname);player=result.player;
       if(site==='prime'){
         const prime=inspectPrimePlayer(document,getComputedStyle,isAdLabel);
         if(!result.ad){result=prime;player=document.querySelector('[aria-label="Web Player"]');}
         // The generic detector can recognize Prime's shared ad timeline, but
         // it does not carry Prime's ordinal/countdown metadata. Preserve that
         // evidence so a player speed reset between ads can safely rearm the
         // same media element for the next ad in the pod.
         else if(prime.ad&&prime.video===result.video&&prime.adInfo)result={...result,adInfo:{...result.adInfo,...prime.adInfo}};
       }else if(!result.ad){
         if(site==='hotstar'){result=inspectHotstar(document,getComputedStyle);player=document.querySelector('[data-testid="player-space-container"]');}
         else if(site==='youtube'){result=inspectYouTube(document,getComputedStyle);player=document.querySelector('#movie_player');}
         else if(site==='plex'){result=inspectPlex(document,getComputedStyle);player=result.player;}
         else if(site==='mxplayer'){result=inspectMxPlayer(document,getComputedStyle);player=result.player;}
         else if(site==='zee5'){result=inspectZee5(document,getComputedStyle);player=result.player;}
         else if(site==='sonyliv'){result=inspectSonyLiv(document,getComputedStyle);player=result.player;}
         else if(site==='wetv'){result=inspectWeTv(document,getComputedStyle);player=result.player;}
       }
     }else genericDetector.reset();
     const live=result.live||!!player&&[...player.querySelectorAll('[aria-label]')].some(e=>/^(?:live|go live|back to live)$/i.test(e.getAttribute('aria-label')||''));
     const enabled=!!config.enabled&&!!settings?.enabled&&eligible;
     const input={...result,...settings,enabled,live,player,site,now:performance.now(),styleOf:getComputedStyle,restore:()=>accelerator.stop('Trying to skip ad')};
     if(skipper.update(input))accelerator.status='Trying to skip ad; speed fallback if needed';
     else accelerator.update(input);
     if(!eligible)accelerator.status='Video assistance: on-demand watch pages only';
     else if(!site&&!result.video)accelerator.status='Filtering active; no recognized video ad';
     if(!config.enabled)accelerator.status='Protection paused for this page';
   }catch{accelerator.stop('Player inspection failed; speed restored');}
   const report={text:accelerator.status,videoFound:!!result.video,ad:!!result.ad};
   const key=JSON.stringify(report);
   if(key!==lastReport){lastReport=key;void reportMessage(report);}
 }
 function storageChanged(_changes,area){if(area==='local')void refresh();}
 chrome.storage.onChanged.addListener(storageChanged);
 timers.push(setInterval(tick,250),setInterval(()=>{lastReport='';},5000));
 addEventListener('pagehide',()=>{stopped=true;adaptiveElements?.update([],false,false);picker.stop();accelerator.stop('Page closed');skipper.reset();genericDetector.reset();});
 addEventListener('pageshow',()=>{if(disconnected)return;stopped=false;refresh();});
 addEventListener('beforeunload',()=>accelerator.restore());
 refresh();
})();
