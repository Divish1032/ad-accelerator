# Ad Accelerator

Ad Accelerator is a Chrome extension that filters listed ad and tracker destinations, reduces unwanted popups, and speeds up detected video ads without changing normal playback.

This repository contains the current **0.16.2** development release candidate. It is not yet published in the Chrome Web Store, so install it as an unpacked extension.

## Install in Chrome

You need Chrome **145 or newer** and a local copy of this repository.

1. Get the source:

   ```sh
   git clone https://github.com/Divish1032/ad-accelerator.git
   ```

   Or use **Code → Download ZIP** on GitHub, then extract the archive.

2. In Chrome, open `chrome://extensions`.
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `outputs/prime-ad-accelerator` folder inside this repository. Select the folder that contains `manifest.json`, not the repository root.
6. Optionally pin Ad Accelerator from Chrome's Extensions menu so its controls are easy to reach.
7. Open a normal website, click the extension icon, and adjust protection or video settings for that site.

### Update an existing install

Pull the latest source (or replace your extracted repository folder), then return to `chrome://extensions` and click **Reload** on Ad Accelerator. Refresh any websites that were already open. Keep the same `outputs/prime-ad-accelerator` folder when updating so Chrome preserves the extension identity and its local settings.

## What it does

- Filters bundled lists of known ad, tracker, popup, and threat destinations.
- Handles narrowly qualified new-tab popup destinations without closing the source tab.
- Provides per-site controls, a temporary pause, and reversible element hiding.
- Detects eligible video-ad states and can use configured acceleration or safe skip-first fallback while restoring the original playback rate afterward.
- Offers optional, local-only privacy controls for tracking-link cleanup, third-party-cookie restriction, location restriction, and reviewed site-data cleanup.

No telemetry, account system, remote executable code, proxy, VPN, or browser-history collection is included. See the extension [privacy details](outputs/prime-ad-accelerator/PRIVACY.md).

## Video support

Explicit on-demand integrations currently cover:

- Prime Video
- JioHotstar
- YouTube
- Plex
- Amazon MX Player
- ZEE5
- SonyLIV
- WeTV

There is also an experimental generic HTML5 player detector. It is deliberately conservative: a player must present strong active-ad evidence before anything changes.

## Important limits

- Live playback, audio services, Shorts, unknown player states, and ordinary content are excluded rather than guessed at.
- Video assistance does not unlock subscriptions, bypass DRM, remove every ad, or guarantee a specific result on every site.
- The research catalog in this repository is not a list of supported services.
- The current source passes **261 automated tests**, but a test suite is not proof of every installed-Chrome, site, account, region, or ad transition.

If a site behaves unexpectedly, use the extension's site pause or disable the relevant control before continuing playback.

## For developers

The canonical extension source is [outputs/prime-ad-accelerator](outputs/prime-ad-accelerator/). Run the regression suite from the repository root:

```sh
node --test outputs/prime-ad-accelerator/tests/*.test.cjs
```

Useful reference material:

- [Current source and developer notes](outputs/prime-ad-accelerator/README.md)
- [Privacy behavior](outputs/prime-ad-accelerator/PRIVACY.md)
- [Baseline audit and installed-browser checklist](outputs/baseline-audit-0.11.3/)
- [Chrome Web Store preparation materials](outputs/chrome-store/)

## License

See [LICENSE](LICENSE).
