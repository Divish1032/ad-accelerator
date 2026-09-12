(function(root){
 'use strict';
 function visible(e,styleOf){
   if(!e?.isConnected||e.closest('[hidden]'))return false;
   const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;
   for(let n=e;n;n=n.parentElement){const s=styleOf(n);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false;}return true;
 }
 function attributeText(e){
   return [e?.id,e?.className,e?.getAttribute?.('data-ad-state'),e?.getAttribute?.('data-ad-status'),e?.getAttribute?.('data-state')]
     .filter(v=>typeof v==='string').join(' ');
 }
 function activeAdState(e){
   const value=attributeText(e);
   return /(?:^|[\s_-])(?:ima[\s_-])?(?:ad|ads)(?:[\s_-])(?:playing|showing|active|break)(?:$|[\s_-])/i.test(value)||
     /(?:^|\s)jw-flag-ads(?:$|\s)/i.test(value)||e?.getAttribute?.('data-ad-playing')==='true';
 }
 function adNamed(e){
   return /(?:^|[\s_-])(?:ima[\s_-])?(?:ad|ads|advertisement)(?:$|[\s_-])/i.test(attributeText(e));
 }
 function playerNamed(e){return /(?:^|[\s_-])player(?:$|[\s_-])/i.test(attributeText(e))||e?.getAttribute?.('aria-label')==='Web Player';}
 function playerRoot(video){
   let root=null,node=video?.parentElement,depth=0;
   while(node&&depth++<12){if(playerNamed(node))root=node;node=node.parentElement;}
   return root||video?.parentElement||null;
 }
 function coversPlayer(e,player){
   const a=e.getBoundingClientRect(),b=player.getBoundingClientRect();
   return b.width>0&&b.height>0&&a.width>=b.width*.45&&a.height>=b.height*.45;
 }
 function adCountdown(e){
   const text=(e?.getAttribute?.('aria-label')||e?.textContent||'').replace(/\s+/g,' ').trim();
   return text.length<=90&&/^(?:ads?|advertisements?)(?:\s+\d+\s+of\s+\d+)?\s*[:·|–—-]?\s*(?:\(?\d{1,2}:[0-5]\d\)?|\d{1,3}\s*(?:s|sec|seconds))(?:\s*(?:remaining|left))?$/i.test(text);
 }
 function advertisementMedia(video){return /^(?:ad|ads|advertisement)$/i.test((video?.getAttribute?.('title')||video?.title||'').trim());}
 function controlState(player,styleOf){
   const controls=[...player.querySelectorAll('button,[role="button"],input[type="range"],[role="slider"]')].filter(e=>visible(e,styleOf));
   const seek=controls.some(e=>e.matches?.('input[type="range"],[role="slider"]')||/seek|forward|ahead|next\s+\d+|\d+\s*(?:s|sec|seconds)\s*forward/i.test(e.getAttribute?.('aria-label')||e.textContent||''));
   return {count:controls.length,seek};
 }
 class TransitionDetector{
   constructor(){this.reset();}
   reset(){this.key='';this.player=null;this.program=null;this.controls={count:0,seek:false};this.candidate=null;}
   inspect(doc,styleOf,now=0,key=''){
     if(key!==this.key){this.reset();this.key=key;}
     if(typeof doc?.querySelectorAll!=='function')return {video:null,ad:false,player:null};
     const videos=[...doc.querySelectorAll('video')].filter(v=>v?.isConnected);
     const roots=[...new Set(videos.map(playerRoot).filter(p=>p&&visible(p,styleOf)))];
     const players=roots.filter(p=>!roots.some(other=>other!==p&&p.parentElement&&other.contains?.(p)));
     if(players.length!==1){this.candidate=null;return {video:null,ad:false,player:null};}
     const player=players[0],all=[...player.querySelectorAll('video')].filter(v=>v?.isConnected);
     const shown=all.filter(v=>visible(v,styleOf));
     const nodes=[player,...player.querySelectorAll('[class],[id],[data-ad-state],[data-ad-status],[data-ad-playing]')].slice(0,500);
     const explicit=nodes.some(e=>activeAdState(e)&&(e===player||visible(e,styleOf)));
     const overlays=nodes.filter(e=>e!==player&&adNamed(e)&&visible(e,styleOf)&&coversPlayer(e,player));
     const controls=controlState(player,styleOf),skip=skipButton(player,styleOf);
     const countdown=[...player.querySelectorAll('[aria-label],span,div,p')].slice(0,500).some(e=>visible(e,styleOf)&&adCountdown(e));
     const live=nodes.some(e=>/(?:^|[\s_-])live(?:$|[\s_-])/i.test(attributeText(e)))||
       [...player.querySelectorAll('[aria-label]')].some(e=>/^(?:live|go live|back to live)$/i.test(e.getAttribute('aria-label')||''));
     if(live){this.candidate=null;return {video:shown.length===1?shown[0]:null,ad:false,live:true,player};}
     const old=this.player===player&&this.program?.isConnected?this.program:null;
     const separate=old?shown.filter(v=>v!==old):[];
     const oldInactive=!!old&&(old.paused||old.ended||!visible(old,styleOf));
     const controlsLost=!!old&&((this.controls.seek&&!controls.seek)||(this.controls.count>=3&&controls.count<=this.controls.count-2));
     const transitioned=overlays.length===1&&old&&(
       (separate.length===1&&oldInactive&&(controlsLost||skip||countdown))||
       (shown.length===1&&shown[0]===old&&controlsLost&&(skip||countdown))
     );
     let video=null,kind='shared-timeline';
     if(explicit&&shown.length===1){
       video=shown[0];
       const programs=all.filter(v=>v!==video&&!advertisementMedia(v));
       if(advertisementMedia(video)&&programs.length===1&&(programs[0].paused||programs[0].ended||!visible(programs[0],styleOf)))kind='separate-media';
     }
     else if(transitioned){video=separate.length===1?separate[0]:old;kind=separate.length===1?'separate-media':'shared-timeline';}
     if(video){
       if(!Number.isFinite(video.duration)||video.duration<=0){this.candidate=null;return {video:null,ad:false,player};}
       if(kind==='separate-media'&&video.duration>=600){this.candidate=null;return {video:null,ad:false,player};}
       const signature={player,video,kind};
       if(!explicit){
         if(!this.candidate||this.candidate.player!==player||this.candidate.video!==video||this.candidate.kind!==kind){this.candidate={...signature,since:now};return {video:null,ad:false,player};}
         if(now-this.candidate.since<250)return {video:null,ad:false,player};
       }
       return {video,ad:true,live:false,player,source:'generic-transition',adInfo:{kind,media:video}};
     }
     this.candidate=null;
     const normal=shown.length===1?shown[0]:null;
     if(normal&&!explicit&&!overlays.length){this.player=player;this.program=normal;this.controls=controls;}
     return {video:normal,ad:false,live:false,player};
   }
 }
 function generic(doc,styleOf){return new TransitionDetector().inspect(doc,styleOf,0,'snapshot');}
 function skipButton(player,styleOf){
   if(!player)return null;
   // Require an actual, enabled ad-specific button in this player's controls.
   return [...player.querySelectorAll('button, [role="button"]')].find(e=>visible(e,styleOf)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&
     (/^skip\s+(?:ad|ads|advertisement)(?:\s*\([^)]*\))?$/i.test((e.getAttribute('aria-label')||e.textContent||'').trim())||
     e.matches('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern')))||null;
 }
 class Skipper{
   constructor(){this.video=null;this.button=null;this.until=0;this.triedSeek=false;}
   reset(){this.video=null;this.button=null;this.until=0;this.triedSeek=false;}
   update({video,ad,adInfo,enabled,preferSkip,live,player,site,now,styleOf,restore}){
     if(!ad||!video||!enabled||!preferSkip||live||video.duration===Infinity){this.reset();return false;}
     if(video!==this.video){this.reset();this.video=video;}
     if(video.paused||video.ended)return false;
     const button=skipButton(player,styleOf);
     if(button&&button!==this.button){
       this.button=button;restore();
       try{button.click();this.until=now+1000;return true;}catch{this.until=0;}
     }
     // Only detectors that separately identify ad media may seek their timeline.
     // Never seek a shared episode timeline, an unknown player or an unseekable ad.
     if(adInfo?.kind==='separate-media'&&adInfo.media===video&&!this.triedSeek){
       this.triedSeek=true;
       const end=video.duration-0.05;
       if(Number.isFinite(end)&&end>video.currentTime&&end<600&&video.seekable?.length&&video.seekable.end(video.seekable.length-1)>=end){
         restore();try{video.currentTime=end;this.until=now+1000;return true;}catch{this.until=0;}
       }
     }
     return now<this.until;
   }
 }
 const api={visible,generic,TransitionDetector,skipButton,Skipper};if(typeof module!=='undefined')module.exports=api;else root.VideoActions=api;
})(typeof globalThis==='undefined'?this:globalThis);
