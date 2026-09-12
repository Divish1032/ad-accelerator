(function(root){
 'use strict';
 function visible(e,styleOf){
   if(!e?.isConnected||e.closest('[hidden]'))return false;
   const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;
   for(let n=e;n;n=n.parentElement){const s=styleOf(n);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false;}return true;
 }
 function generic(doc,styleOf){
   const players=[...doc.querySelectorAll('.video-js.vjs-ad-playing, .jwplayer.jw-flag-ads')].filter(p=>visible(p,styleOf));
   if(players.length!==1)return {video:null,ad:false};
   const player=players[0],videos=[...player.querySelectorAll('video')].filter(v=>visible(v,styleOf));
   const live=player.classList.contains('vjs-live')||player.classList.contains('jw-flag-live');
   return {video:videos.length===1?videos[0]:null,ad:videos.length===1&&!live,live,player};
 }
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
   update({video,ad,enabled,preferSkip,live,player,site,now,styleOf,restore}){
     if(!ad||!video||!enabled||!preferSkip||live||video.duration===Infinity){this.reset();return false;}
     if(video!==this.video){this.reset();this.video=video;}
     if(video.paused||video.ended)return false;
     const button=skipButton(player,styleOf);
     if(button&&button!==this.button){
       this.button=button;restore();
       try{button.click();this.until=now+1000;return true;}catch{this.until=0;}
     }
     // Only Hotstar's separately identified ad media has a trustworthy ad-only timeline.
     // Never seek a shared episode timeline, an unknown player or an unseekable ad.
     if(site==='hotstar'&&!this.triedSeek){
       this.triedSeek=true;
       const end=video.duration-0.05;
       if(Number.isFinite(end)&&end>video.currentTime&&end<600&&video.seekable?.length&&video.seekable.end(video.seekable.length-1)>=end){
         restore();try{video.currentTime=end;this.until=now+1000;return true;}catch{this.until=0;}
       }
     }
     return now<this.until;
   }
 }
 const api={visible,generic,skipButton,Skipper};if(typeof module!=='undefined')module.exports=api;else root.VideoActions=api;
})(typeof globalThis==='undefined'?this:globalThis);
