# Reviewer instructions — Ad Accelerator 0.16.2

No extension account, payment, backend credentials or subscription is needed. Install the upload ZIP on Chrome 145 or later. The manifest is at the archive root. Bundled filter data initializes locally; daily updates can be disabled. Filter source snapshots, licenses and provenance are packaged with the extension.

1. Open an ordinary HTTPS page and the extension action. The current hostname appears with its protection switch. Turning it off saves an exception for that hostname and its subdomains. Reload to retry already blocked requests.
2. Use **Pause here for 10 minutes**. Site features suspend while saved video settings remain visible. Resume manually or let the timer restore configured features. A sleeping browser can deliver the timer late.
3. Under **Video ads**, change speed or enable **Try skipping first**. A recognized ad is required to exercise playback changes; ordinary video is left alone. Named on-demand adapters cover Prime Video, JioHotstar, YouTube, Plex, Amazon MX Player, ZEE5, SonyLIV and WeTV. The generic HTML5 detector runs first only when player-owned transition evidence is strong.
4. Live and FAST channels, audio, protected or server-inserted ads, and inaccessible cross-origin players are outside the current video claim. Shared program/ad timelines are accelerated only; seeking is limited to confidently identified separate ad media.
5. Strict navigation is off by default. Enable it only on a disposable test site, reload, and test an external destination. Allow exact hosts as needed, then turn it off and reload.
6. **Hide an element** requires selecting and confirming a page element. **My hidden elements** provides Undo. Recognized players and forms are excluded.
7. Privacy controls open for the original tab. Tracking-link cleanup is opt-in. Cookie, location and cleanup permissions are optional. Cookie blocking is Chrome-wide and is released while any full-site pause or exception exists. Location blocking is origin-scoped.
8. Site-data deletion requires a separate review, explicit data selection, permission, and final confirmation. Use only disposable test data. Do not test deletion on a signed-in personal site.
9. Adaptive protection uses three separated observations reaching an installed listed endpoint. Ordinary redirects do not trigger learning. Rules expire after 24 hours. Allow and clear controls are available.
10. **Installed filters** reads Chrome’s installed DNR rules. Rule-matching simulation is available only in unpacked developer builds; store builds report installed-rule readback without calling that a live network pass.

## Validation boundary

The release candidate passes 261 automated tests and package validation. Live inspection confirmed Prime's current shared-timeline and continuous pod-countdown behavior, but the patched 0.16.2 build still requires reload and a fresh multi-ad pod for installed confirmation. Prior browser work observed real qualifying ad media on the named services. Exact installed results for every ad transition, permission, restart, upgrade and coexistence gate are not independently recorded because this session cannot control Chrome’s extension-management page. Normal playback or the absence of an ad does not prove ad handling.
