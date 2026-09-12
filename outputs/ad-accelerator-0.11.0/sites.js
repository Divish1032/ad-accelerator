(function(root) {
  'use strict';
  const names = { prime: 'Prime Video', hotstar: 'JioHotstar', youtube: 'YouTube' };
  function siteFor(host) {
    if (host === 'primevideo.com' || host === 'www.primevideo.com') return 'prime';
    if (host === 'hotstar.com' || host === 'www.hotstar.com') return 'hotstar';
    if (host === 'youtube.com' || host === 'www.youtube.com') return 'youtube';
    return null;
  }
  function settingsFor(data, site) {
    const saved = data['site.' + site];
    return { enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : (site === 'prime' ? data.enabled !== false : true),
      speed: [2,4,8,10,20].includes(saved?.speed) ? saved.speed : (site === 'prime' ? 10 : 4) };
  }
  function onDemandPath(site, path) {
    if (site === 'hotstar') return /^\/in\/(shows|movies)\//.test(path) && /\/watch\/?$/.test(path);
    if (site === 'youtube') return path === '/watch';
    if (site === 'prime') return /\/detail\//.test(path);
    return false;
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
      return { video:ads[0], ad:true };
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
  const api={names,siteFor,settingsFor,onDemandPath,inspectHotstar,inspectYouTube};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.AdAcceleratorSites=api;
})(typeof globalThis==='undefined'?this:globalThis);
