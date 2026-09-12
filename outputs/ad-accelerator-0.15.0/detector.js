function inspectPrimePlayer(doc, styleOf, isAdLabel) {
  function visible(element) {
    // aria-hidden controls accessibility exposure, not visual visibility.
    if (!element.isConnected || element.closest('[hidden]')) return false;
    const box = element.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return false;
    for (let node = element; node; node = node.parentElement) {
      const style = styleOf(node);
      if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
    }
    return true;
  }
  const players = [...doc.querySelectorAll('[aria-label="Web Player"]')].filter(visible);
  if (players.length !== 1) return { video: null, ad: false };
  const player = players[0];
  // Prime's media surface is a sibling of the controls, not a descendant.
  const videos = [...doc.querySelectorAll('.atvwebplayersdk-video-surface video')].filter(visible);
  if (videos.length !== 1) return { video: null, ad: false };
  let adInfo=null;
  const ad = [...player.querySelectorAll('span, div, p')].some(element => {
    if (element.childElementCount > 4 || !visible(element)) return false;
    if (element.closest('[class*="subtitle" i], [class*="caption" i], [aria-live], [role="status"], [role="alert"]')) return false;
    const label = element.textContent || '';
    if(label.length>90||!isAdLabel(label))return false;
    const normalized=label.replace(/\s+/g,' ').trim(),ordinal=normalized.match(/\b(\d+) of (\d+)\b/i),clock=normalized.match(/(\d{1,2}):([0-5]\d)/),seconds=normalized.match(/(\d{1,3})\s*(?:s|sec|seconds)\b/i);
    if(clock||seconds)adInfo={ordinal:ordinal?Number(ordinal[1]):0,total:ordinal?Number(ordinal[2]):0,remaining:clock?Number(clock[1])*60+Number(clock[2]):Number(seconds[1])};
    return true;
  });
  return { video: videos[0], ad, adInfo };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { inspectPrimePlayer };
