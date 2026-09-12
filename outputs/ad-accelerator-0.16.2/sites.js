(function(root) {
  'use strict';
  const names = { prime: 'Prime Video', hotstar: 'JioHotstar', youtube: 'YouTube', plex: 'Plex', mxplayer: 'Amazon MX Player', zee5: 'ZEE5', sonyliv: 'SonyLIV', wetv: 'WeTV' };
  function siteFor(host) {
    if (host === 'primevideo.com' || host === 'www.primevideo.com') return 'prime';
    if (host === 'hotstar.com' || host === 'www.hotstar.com') return 'hotstar';
    if (host === 'youtube.com' || host === 'www.youtube.com') return 'youtube';
    if (host === 'watch.plex.tv') return 'plex';
    if (host === 'mxplayer.in' || host === 'www.mxplayer.in') return 'mxplayer';
    if (host === 'zee5.com' || host === 'www.zee5.com') return 'zee5';
    if (host === 'sonyliv.com' || host === 'www.sonyliv.com') return 'sonyliv';
    if (host === 'wetv.vip' || host === 'www.wetv.vip') return 'wetv';
    return null;
  }
  function settingsFor(data, site) {
    const saved = data['site.' + site];
    return { enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : (site === 'prime' ? data.enabled !== false : true),
      speed: [2,4,8,10,20].includes(saved?.speed) ? saved.speed : (site === 'prime' ? 10 : 4) };
  }
  function onDemandPath(site, path) {
    if (site === 'hotstar') {
      // Sports highlights/replays use the same separate ad player as shows.
      // Eligibility does not itself prove an ad: inspectHotstar still requires
      // the visible, active ad container, and runtime live guards still apply.
      return /^\/in\/(shows|movies|sports)\/.+\/watch\/?$/.test(path) &&
        !/\/(?:live|livetv|live-tv)(?:\/|$)/i.test(path);
    }
    if (site === 'youtube') return path === '/watch';
    if (site === 'prime') return /\/detail\//.test(path);
    if (site === 'plex') return /^\/watch\/(?:movie|show)\/[^/]+(?:\/|$)/.test(path);
    // Qualified against MX Player series episodes. Catalog pages, home-page
    // trailers, movies and live playback remain outside this first adapter.
    if (site === 'mxplayer') return /^\/show\/watch-[^/]+\/season-[^/]+\/[^/]+\/?$/.test(path);
    // Qualified against free series episodes only. Series landing pages,
    // trailers, movies and live TV remain outside this first ZEE5 adapter.
    if (site === 'zee5') return /^\/tv-shows\/details\/[^/]+\/0-6-[^/]+\/[^/]+\/0-1-[^/]+\/?$/.test(path);
    if (site === 'sonyliv') return /^\/shows\/[^/]+-\d+\/[^/]+-\d+\/?$/.test(path);
    // Qualified against English-language series episode pages. Series landing,
    // short-form, live and other locale routes remain outside this adapter.
    if (site === 'wetv') return /^\/en\/play\/[a-z0-9]+\/[^/]+\/?$/.test(path);
    return false;
  }
  function visible(e, styleOf) {
    if (!e?.isConnected || e.closest('[hidden]')) return false;
    const box=e.getBoundingClientRect();
    if (box.width<=0 || box.height<=0) return false;
    for(let n=e;n;n=n.parentElement) {
      const s=styleOf(n);
      if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0') return false;
    }
    return true;
  }
  function inspectSeparateMedia(player, adActive, adScope, programSelector, styleOf, extraInfo) {
    if(!player)return {video:null,ad:false,player:null};
    if(adActive) {
      const ads=adScope&&visible(adScope,styleOf)?[...adScope.querySelectorAll('video[title="Advertisement"]')].filter(e=>visible(e,styleOf)):[];
      if(ads.length!==1)return {video:null,ad:false,player};
      const video=ads[0];
      if(!Number.isFinite(video.duration)||video.duration<=0||video.duration>=600)return {video:null,ad:false,player};
      return {video,ad:true,adInfo:{kind:'separate-media',media:video,...(extraInfo?.(adScope)||{})},player};
    }
    const content=[...player.querySelectorAll(programSelector)].filter(e=>visible(e,styleOf));
    return {video:content.length===1?content[0]:null,ad:false,player};
  }
  function inspectHotstar(doc, styleOf) {
    const scope = doc.querySelector('[data-testid="player-space-container"]');
    if (!scope) return { video: null, ad: false };
    function visible(e) {
      if (!e.isConnected || e.closest('[hidden]')) return false;
      const box=e.getBoundingClientRect();
      if (box.width<=0 || box.height<=0) return false;
      for(let n=e;n;n=n.parentElement) {
        const s=styleOf(n);
        if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0') return false;
      }
      return true;
    }
    const container=scope.querySelector('#ad-video-container');
    const ads=container ? [...container.querySelectorAll('video')].filter(visible) : [];
    if (container?.getAttribute('aria-hidden') === 'false' && ads.length===1) {
      return { video:ads[0], ad:true, adInfo:{kind:'separate-media',media:ads[0]} };
    }
    const main=[...scope.querySelectorAll('#video-container video')].filter(visible);
    return { video:main.length===1?main[0]:null, ad:false };
  }
  function inspectYouTube(doc, styleOf) {
    const player = doc.querySelector('#movie_player');
    if (!player) return {video:null, ad:false, live:false};
    const videos = [...player.querySelectorAll('video')].filter(e => {
      if (!e.isConnected || e.closest('[hidden]')) return false;
      const box = e.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return false;
      for (let n=e;n;n=n.parentElement) {
        const s=styleOf(n);
        if (s.display==='none' || s.visibility==='hidden' || s.opacity==='0') return false;
      }
      return true;
    });
    const live = player.classList.contains('ytp-live');
    // Player-owned state avoids matching captions, titles, or companion banners.
    return {video: videos.length===1 ? videos[0] : null,
      ad: !live && videos.length===1 && player.classList.contains('ad-showing'), live};
  }
  function inspectPlex(doc, styleOf) {
    function visible(e) {
      if (!e?.isConnected || e.closest('[hidden]')) return false;
      const box=e.getBoundingClientRect();
      if (box.width<=0 || box.height<=0) return false;
      for(let n=e;n;n=n.parentElement) {
        const s=styleOf(n);
        if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0') return false;
      }
      return true;
    }
    // Plex VOD uses separate Google IMA media titled Advertisement. The
    // program video remains mounted and paused behind it, so never infer an ad
    // from the hostname, player presence or program timeline alone.
    const allAds=[...doc.querySelectorAll('video[title="Advertisement"]')];
    const anchor=allAds.find(visible)||allAds[0];
    let player=null;
    for(let n=anchor?.parentElement;n&&n!==doc.body;n=n.parentElement) {
      if([...n.querySelectorAll('video:not([title="Advertisement"])')].filter(visible).length===1) {player=n;break;}
    }
    if(!player)return {video:null,ad:false,player:null};
    const ads=[...player.querySelectorAll('video[title="Advertisement"]')].filter(visible);
    const content=[...player.querySelectorAll('video:not([title="Advertisement"])')].filter(visible);
    if(ads.length===1) {
      const video=ads[0];
      if(!Number.isFinite(video.duration)||video.duration<=0||video.duration>=600)return {video:null,ad:false,player};
      const text=(player.innerText||player.textContent||'').replace(/\s+/g,' ');
      const label=text.match(/\bAds?\s+(\d+)\s+of\s+(\d+)\s+(\d{1,2}):([0-5]\d)\b/i);
      const adInfo={kind:'separate-media',media:video,...(label?{ordinal:Number(label[1]),total:Number(label[2]),remaining:Number(label[3])*60+Number(label[4])}:{})};
      return {video,ad:true,adInfo,player};
    }
    return {video:content.length===1?content[0]:null,ad:false,player};
  }
  function inspectMxPlayer(doc, styleOf) {
    const player=doc.querySelector('.mx-player-container');
    // MX Player keeps the long-form Video.js program mounted and paused while
    // a separate Google IMA video plays inside its active ad container.
    const active=player?.querySelector('.mx-ad-container.ad-playing');
    return inspectSeparateMedia(player,!!active,active,'video.vjs-tech:not([title="Advertisement"])',styleOf);
  }
  function inspectZee5(doc, styleOf) {
    const player=doc.querySelector('.playerContainer .video-js');
    // ZEE5 mounts its long-form Video.js program behind a separate Google IMA
    // advertisement video. Require both the player ad state and its ad layer.
    const active=!!player?.classList.contains('vjs-ad-playing');
    const container=player?.querySelector('.video-tag_ima-ad-container.ima-ad-container');
    return inspectSeparateMedia(player,active,container,'video.vjs-tech:not([title="Advertisement"])',styleOf);
  }
  function inspectSonyLiv(doc, styleOf) {
    const player=doc.querySelector('.main_video_player');
    // SonyLIV exposes active ads by removing ad-layer-hidden from its separate
    // Google IMA layer while the long-form program remains mounted and paused.
    const layer=player?.querySelector('.ad-wrapper:not(.ad-layer-hidden)');
    return inspectSeparateMedia(player,!!layer,layer,'video.vjs-tech:not([title="Advertisement"])',styleOf,scope=>{
      const match=(scope.innerText||scope.textContent||'').replace(/\s+/g,' ').match(/\bAD\s*(\d{1,2}):([0-5]\d)\b/i);
      return match?{remaining:Number(match[1])*60+Number(match[2])}:{};
    });
  }
  function inspectWeTv(doc, styleOf) {
    const player=doc.querySelector('#player--playback_background');
    // WeTV keeps the long-form ThumbPlayer video paused under a separate
    // Google IMA layer. Its ad container is only active while visible and
    // without the player's standard hidden class.
    const scope=player?.querySelector('#wetv-ads-container');
    const active=!!scope&&!scope.classList.contains('wetv-player__none')&&visible(scope,styleOf);
    return inspectSeparateMedia(player,active,scope,'video:not([title="Advertisement"])',styleOf);
  }
  const api={names,siteFor,settingsFor,onDemandPath,inspectHotstar,inspectYouTube,inspectPlex,inspectMxPlayer,inspectZee5,inspectSonyLiv,inspectWeTv};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.AdAcceleratorSites=api;
})(typeof globalThis==='undefined'?this:globalThis);
