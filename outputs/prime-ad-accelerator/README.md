# Ad Accelerator 0.16.2 — Chrome Web Store release candidate

Version 0.16.2 fixes consecutive Prime Video ad pods against the current live player behavior. Prime uses one shared episode timeline, restores the original rate between ad creatives, and exposes a pod-level "content resumes in" countdown that decreases continuously instead of resetting or showing an ad ordinal. When the trusted Prime ad signal remains active, the same media progresses, the pod countdown decreases, and Prime restores the exact original rate, the bounded controller now rearms ads two and three. Named on-demand integrations are Prime Video, JioHotstar, YouTube, Plex, Amazon MX Player, ZEE5, SonyLIV and WeTV. The generic HTML5 transition detector remains broader experimental coverage, not a universal compatibility claim.

The user reports that the installed extension is working, but no exact 0.15.0 evidence record was supplied for every real-ad transition, privacy control, restart, upgrade or coexistence gate. Automated and package checks remain necessary but cannot replace those native checks. The 499-entry streaming inventory remains internal research and qualification work; it is not marketed as supported coverage.

## Generic-first detection introduced in 0.15.0

Every eligible on-demand page now tries one conservative cross-player detector before its named platform adapter. It observes the live player DOM rather than static page source: explicit active ad state, a newly visible player-sized ad layer, media replacement, the original program becoming paused/hidden, seek-control loss, and a visible ad countdown or enabled ad-specific skip button. Unchanged controls, a short video, an ad SDK, an ad-like substring or a dormant container are insufficient. A non-explicit transition must remain stable for at least 250ms; the shared accelerator still performs its own confirmation before changing speed.

Separate and shared timelines are treated differently. A visible finite advertisement video may be classified as separate only when a distinct program video remains mounted and paused/hidden. Only that separately identified ad media can be sought. A reused program/ad video may be accelerated while explicit ad evidence persists but is never sought. Navigation resets transition evidence; live labels/state and infinite-duration media fail closed. Inspection is bounded to one visible player root and at most 500 candidate nodes, keeps state only in the page's memory, and adds no telemetry, permissions or persisted page information.

When generic evidence is incomplete, the existing Prime, Hotstar, YouTube, Plex, Amazon MX Player, ZEE5, SonyLIV and WeTV adapters remain the fallback. This adds a common default path without turning unknown sites into claimed support. Cross-origin frames, DRM restrictions, server-stitched ads and live/FAST or audio still require separate qualification.

Eight new regressions cover ordinary control auto-hide, stable separate-media transitions, shared timelines, false `adaptive` class matches, initial explicit Video.js state, live/navigation reset, detector ordering, and full generic-to-shared-controller acceleration/restoration. The full suite passes **258/258**. Installed behavior remains pending 0.15.0 reload and real-ad testing.

## Three qualified adapters in 0.14.0

The first 20-platform qualification batch produced genuine observable player-owned ads on three services. The other 17 candidates remain unimplemented because playback was geo/login/payment blocked, failed to create a usable player, showed no genuine ad in the sampled title, or—in Filmzie's case—kept the ad timeline inside an inaccessible cross-origin iframe. The research inventory is still a qualification backlog, not a support claim.

- **ZEE5:** a free series episode exposed one separate visible, finite and seekable 20.011-second Google IMA pre-roll while the long-form program remained separate. The adapter is limited to exact ZEE5 hosts and the observed series-episode route family.
- **SonyLIV:** a free show episode in clean Chrome exposed a separate visible, finite and seekable 60.011-second mid-roll, an `AD 1:26` player state, and normal program resumption at 1x. The adapter is limited to exact SonyLIV hosts and observed show-episode routes. The installed build still showed SonyLIV's anti-ad-block wall, so compatibility and protected output are not verified.
- **WeTV:** an English episode in clean Chrome exposed a real two-ad pod: approximately 15 seconds followed by a separate 30.059-second ad, after which the program resumed at 1x. The adapter is limited to exact WeTV hosts and observed English episode routes.

All three reuse the shared skip-first, configurable-speed fallback, pause handling and original-rate restoration. They require an active player-owned ad container and exactly one visible finite advertisement video; hostname, ad SDK presence, page copy, placeholders and normal program playback are insufficient. Seeking is allowed only on the separately identified ad media. Distinct consecutive media must make fresh progress before acceleration can rearm. Live/FAST, audio, catalog pages and unobserved route families remain excluded.

## WeTV network compatibility in 0.14.0

With the older installed policy, WeTV episode metadata loaded but the player did not. The same episode played in clean Chrome and used the same Google IMA decision hosts already isolated for Plex. Rule 91 therefore permits only `g.doubleclick.net` and `pagead2.googlesyndication.com` non-main-frame subresources when the top-level site is exactly `wetv.vip`. Top-level navigation, other request domains, other sites and broader traffic remain covered. This root-cause conclusion is evidence-based but still an inference until the user reloads 0.14.0 and verifies the installed episode workflow.

## Verification status

The full automated suite passes **250/250**. Eighteen new adapter regressions cover exact host/route boundaries, active versus hidden ad state, ad-only skip/fallback, consecutive media, restoration, pausing, disabling protection and navigation. Compatibility tests also verify that the Plex and WeTV rules remain site/domain scoped, exclude main-frame requests and survive filter initialization/update.

The ads were observed in a clean browser before these adapters were installed. ZEE5 ad exit/consecutive behavior, SonyLIV anti-ad-block compatibility and consecutive behavior, and the full installed WeTV two-ad transition all remain manual 0.14.0 gates. Fixture success and an ad-free sample are not live verification. No new permissions, telemetry, remote code or privacy-boundary changes were added.

## Amazon MX Player in 0.13.0

Amazon MX Player is the second adapter selected from the research backlog. Native Chrome observation on two free, family-rated series episodes found 20.1-second and 45.1-second Google IMA pre-rolls. Each ad used one visible finite `video[title="Advertisement"]` inside `.mx-ad-container.ad-playing`, while the 1,247-second or 1,080-second Video.js program remained mounted and paused at 1×. After the first sampled ad ended, the program resumed at 1×.

The adapter is deliberately limited to exact `mxplayer.in` hosts and the observed series episode route family. It requires the active player-owned ad container and exactly one visible finite advertisement video; the hostname, an IMA iframe or ordinary page text is not enough. Prefer skipping may seek only that separate ad timeline, then shared configurable acceleration is the fallback. A new, separately identified ad video may rearm acceleration only after its own media progression is confirmed. Home-page trailers, series catalog pages, movies, live streams and audio are not qualified and remain excluded.

Six MX Player regressions cover exact route/host boundaries, active versus hidden media, ad-only seek and fallback, normal restoration, a distinct consecutive ad, pausing, disabling protection and navigation. The ads were observed while 0.12.1 was installed, before this adapter existed, so they qualify the inputs but do not live-verify 0.13.0 output behavior.

## Plex compatibility follow-up in 0.13.0

The user reported existing Plex tabs working without a warning after installing 0.12.1, but a fresh protected agent-created Plex watch tab still reproduced Plex's anti-ad-block message and created no video. The XHR-only allowance was therefore insufficient for that fresh-load path.

0.13.0 keeps the same exact two Google ad-stack domains and exact `watch.plex.tv` top-level scope, but allows their non-main-frame subresources needed to initialize the ad-supported player. Top-level navigation, all other request domains, other websites and broader Plex traffic remain covered by the normal policy. This revised compatibility rule still requires installed verification; working cached or previously paused tabs are not enough.

## Plex network compatibility in 0.12.1

Installed 0.12.0 testing reproduced Plex's anti-ad-block error before any video element was created. Pausing Ad Accelerator for `watch.plex.tv` and refreshing restored the player, isolating the extension's domain filtering as the trigger. The packaged lists block the Google IMA ad-decision hosts used by Plex.

0.12.1 added an XHR-only dynamic allowance to `g.doubleclick.net` and `pagead2.googlesyndication.com` when the top-level site was exactly `watch.plex.tv`. That boundary proved insufficient on a fresh protected load and is superseded by the still site/domain-scoped 0.13.0 rule above.

## Plex on-demand ads in 0.12.0

Plex is the first adapter added from the global research backlog. Native Chrome observation on `watch.plex.tv` found two consecutive pre-rolls on free on-demand movies: a 6.976-second ad followed by a 29.973-second ad labeled **Ad 2 of 2**. Each advertisement used its own visible, finite, fully seekable `video[title="Advertisement"]` while the long-form program video remained paused at 1×. After the ads, both ad elements were hidden and normal content resumed at 1×.

The adapter is limited to Plex movie/show watch routes. It requires exactly one visible, finite player-owned advertisement video; the hostname, an IMA iframe, page text, or ordinary program playback is never enough. Prefer skipping can seek only this separate ad timeline. If the ad remains, the shared configurable-speed fallback applies. Ordinal/countdown evidence supports conservative rearming across consecutive ads. Program media, Plex personal-library pages and live TV are excluded.

The automated suite covers route/host boundaries, active versus hidden ad media, two-ad transitions, skip-first fallback, normal restoration, pause/disable, navigation and live exclusions. The native ads above were observed before this source was installed, so they qualify the adapter design but do not prove the new 0.12.0 behavior. Reload the unpacked extension and refresh Plex before recording live implementation verification.

## Baseline hardening in 0.11.3

An audit of the exact 0.11.2 upload archive reproduced four missed failures: slow list downloads held the settings queue, Strict recovery could target the blocked destination rather than the displayed source, malformed messages threw uncaught errors, and frame reports grew without a bound. All four are fixed with regression coverage. Downloads now happen outside the policy queue and commit atomically without replacing pause or privacy rules. Concurrent updates share one download. Unexpected HTTP redirects fail and retain existing filters.

The element picker now uses a closed shadow root and requires trusted user events for selection, save and cancellation. Privileged policy actions accept only the exact popup page; privacy/deletion and adaptive controls retain their separate page restrictions. Explicit extension CSP permits packaged scripts and limits fetch connections to packaged resources and the existing GitHub list origin. Strict destination regexes are preflighted before replacing working rules. Null/corrupt top-level settings safely normalize, and detached compatibility elements release stored references after restoring their styles. Strict status now explains suspension under network-off settings; recovery reset handles a retained protected source.

No new permissions, telemetry, website adapters, remote code or data-deletion behavior. The 499-entry research catalog is a discovery backlog, not a compatibility claim. Installed Chrome native API, real-ad, upgrade/restart and multi-extension checks remain release gates. This is a hardened development baseline, not a zero-bug or universal-safety certification. See the workspace audit and START-HERE handoff before platform expansion.

## Privacy fixes in 0.11.2

The installed Chrome screenshot exposed two native API failures missed by earlier mocks. Tracking-link cleanup now uses separate small signed/login guards, preflights every regex with Chrome, and verifies the entire guard set after installation. Failed installation rolls back; incomplete legacy cleanup redirects are not restored on rollback. Ad and threat filters retain priority. Location restrictions now use equal requesting/top-level origin patterns with explicit ports, as Chromium requires. The scope is the selected site and its same-origin frames, not unrelated embedded origins. Removing the restriction still restores underlying permissions.

Cookie control already succeeded in the reported screenshot. Save confirmations now use green status messages, errors use red alerts, and other notices use blue. No new permissions or data collection. Native installed retesting is still required after reloading this version and reopening Privacy.

## Address-bar navigation fix in 0.11.1

Strict navigation previously attached a blanket external-navigation block to the tab. This could block an address-bar search before navigation committed and the source guard could clear. Both the strict block and its destination exceptions now require the protected website as request initiator. Browser-initiated address-bar navigation is outside these strict rules; ordinary listed-threat filtering remains unchanged. Successful navigation clears the old source guard and attempts, or installs the destination’s own configured guard. Browser internal pages also clear the old context; inherited blank popup guards are retained unless explicitly navigated from the address bar.

This intentionally narrows strict network coverage: requests initiated by unrelated embedded frames or opaque origins are not covered by the source-domain rule. Existing listed-domain filtering and popup handling remain. No search-engine allowlist or async retry of blocked URLs was added. Installed diagnostics now distinguish source-initiated blocking from address-bar requests. Reload the extension and refresh old tabs after updating. Native installed confirmation is still needed.

## Hotstar sports replays in 0.11.1

Hotstar sports watch pages now reach the existing ad detector, including highlights, clips and replays. This fixes the previous shows/movies-only route restriction. The observed tennis highlights page exposed a separate 20-second ad with aria-hidden=false and a fully seekable ad timeline. No sport, title or content ID is hard-coded. Explicit live URL segments and existing runtime live/infinite-duration guards still exclude live playback. Paused ads remain paused. Only the separately identified ad video is eligible for Hotstar ad seeking; the match timeline is untouched. Native installed verification requires reloading the updated extension and refreshing the website.

## Release presentation in 0.11.0

Original A/forward-arrow logo, navy/mint styling, sticky popup header, always-visible video controls, shorter privacy page introduction, packaged Help/Privacy policy/Credits, and manifest icon sizes. Site-off and temporary-pause messages now distinguish saved settings from effective behavior. No permissions added. Store-installed diagnostics can read installed rules even when Chrome omits its unpacked-only matching API.

188 Node tests pass. The Chrome Web Store package and listing materials are prepared separately; no store submission or approval is claimed. Native installed behavior remains a manual release gate.

## Full pause and main-screen controls in 0.10.0

The main popup now has a prominent **Protection on this site** switch. Turning it off saves a lasting exception for the displayed hostname and its subdomains. It reads that saved choice for each active tab. The separate **Pause here for 10 minutes** button remains temporary; switching protection on resumes it immediately. Inherited exceptions show their parent hostname and disclose that resuming also resumes that parent's subdomains. The global switch stays in Settings; while globally off, the site switch shows off and is disabled.

**Strict navigation** is also directly visible. It remains opt-in and shows whether it is active or saved but suspended. Allowed destinations and the explanation of login/external-player breakage stay in an expandable section. Global network/cosmetic/popup switches remain labeled All websites; video preferences keep their existing platform/site scope.

A full pause now suspends network filtering, link cleaning, page hiding, video actions, popup cleanup, adaptive learning, strict navigation and native location restrictions. Saved preferences are retained and previously enabled features resume automatically. Daily global filter downloads continue according to their own setting; previously cleared site data is never recreated or automatically cleared again. Previously blocked/executed scripts require a page reload; Chrome may deliver alarms late while asleep. Failed expiry application schedules a 30-second retry.

**Cookie scope:** the optional native cookie override is Chrome-wide. It is released while global protection is off or ANY full-site pause/lasting exception exists, even if that site's tab has closed. It resumes only when all those exceptions end, provided its saved preference is still on. The popup displays this consequence when cookie blocking is configured. Underlying Chrome settings remain intact; no force-allow or broad cookie allow exceptions are installed. Owned overrides from older builds migrate to the saved preference. Another controller or missing permission can prevent application; effective status is displayed.

Privacy switches distinguish off, saved-but-suspended and Chrome-reported effective state. Save errors appear beside the affected switch. Cookie/location status read failures no longer disable unrelated controls. The supplied off-state screenshots did not demonstrate a failed toggle, so no installed-specific cause is claimed.

Verification for this release is recorded in `work/VERIFICATION-0.10.0.md` in the development workspace. Node regression tests and a Chrome localhost simulation cover transitions and UI. Native extension installation, permission prompts, network redirects and cookie/location enforcement still need installed verification. No permissions added.


## Popup repair in 0.9.1

The action popup now declares a 380px intrinsic width on its root and body instead of allowing the body to shrink to a provisional viewport width. This is scoped to popup.html so Privacy and Adaptive full-tab layouts remain responsive. Header labels do not wrap. The version label reads the installed manifest; 0.9.0 accidentally displayed a hard-coded 0.8.0 label.

The reported Prime content.js:42:55 error was traced to an older tick() script still running after extension reload. That call site matches archived 0.4.0; current 0.9.0 line42 is inside refresh(), not tick(). Errors recurred at five-second intervals until the Prime tab was refreshed; no later error timestamps appeared during subsequent observation. No speculative content-script change was made. Refresh other previously open website tabs after an extension upgrade. Chrome retains recorded errors until cleared.

162 tests pass. Chrome local before/after fixtures reproduced the 150px shrink and verified the new 380px body/intrinsic width, correct manifest version and readable layout. Native installed action-popup sizing still requires reload verification; local frames do not emulate Chrome's native popup sizing machinery.

## Automatic adaptive protection in 0.9.0

Built on the user-supplied 0.8.0 archive after checking every source file matched. All previous privacy, strict-navigation, picker, recovery and video features are retained. No new permissions.

Adaptive learning runs automatically when network and popup protection are enabled, without feedback prompts. It observes only newly created popup chains. When the same initial unlisted destination leads to a destination covered by an installed domain block on three occasions at least 30 seconds apart, it learns that exact destination for that exact source hostname. Ordinary redirects alone are insufficient evidence. Rules expire 24 hours after the first observation; max 100 records. Learned rules cannot teach other rules.

On later encounters the extension can close matching new popup tabs, suppress matching direct anchor clicks, and hide explicitly ad-marked containers pointing only to learned destinations. Existing domain lists remain untouched. No new server or AI service is used. This is bounded pattern learning from known ad endpoints, not a universal ad classifier.

Open **Adaptive protection** from the popup to see observations, active rules and expiry, turn learning off, allow a destination for 24 hours, or clear learning and turn it off globally. These are optional recovery controls; normal operation needs no confirmations. Global/site pauses, network/popup recovery, strict allowed destinations and recognizable sensitive links are respected. Incognito and embedded-frame learning are excluded. Turning cosmetics off restores adaptive hidden elements while learned link/popup handling remains governed by network/popup switches.

**Limits:** no learning from same-tab redirects, subframes, or navigation after a normal document commits. No automatic classification of every blank box or unknown ad. Earlier page capture handlers can run before our document-idle guard, and popup closure happens after creation. Shared intermediary domains may be misclassified on a source website. Existing safety switches and expiring rules provide recovery, not a guarantee. Recognizable login/payment/signed URLs are excluded heuristically, not by complete semantic understanding.

**Verification:** 162 automated tests passed, preserving all 144 baseline tests. Chrome localhost fixtures verified actual element hiding/click behavior plus settings UI with simulated Chrome messaging. Native installed event timing and real-site effectiveness remain unverified. Reload the extension and refresh website tabs; the browser-control tool cannot perform the extension-manager step. Development evidence: work/VERIFICATION-0.9.0.md.

Chrome event reference: https://developer.chrome.com/docs/extensions/reference/api/webNavigation


## New: local privacy controls

Open **Privacy controls** from the popup on a website. The separate page adds optional tracking-link cleanup with hostname exceptions, Chrome-wide third-party-cookie restriction, exact-origin location blocking, and reviewed site-data cleanup. New permissions (`privacy`, `contentSettings`, `browsingData`) are optional and requested by the relevant user action. Upgrading does not automatically change browser settings or delete data.

Cookie/location controls show effective native state and restore underlying Chrome preferences when released. Cleanup begins with no selection and requires a one-use origin-bound confirmation; cookie deletion also affects related subdomains according to Chrome's registrable-domain scope. Passwords/history/downloaded files are not selected. Tracking-link cleanup leaves recognized signed/login links and POST requests alone; unknown schemes can need an exception. It does not override listed-threat or strict-navigation blocks.

The new page explains that IP, approximate location and browser/account identity are not hidden. No VPN, proxy service, fingerprint spoofing or new telemetry is included. Full site pauses suspend privacy enforcement while preserving saved preferences; see the current pause behavior below. Details, porting boundaries, data handling and primary API references: [PRIVACY.md](PRIVACY.md).

This release is Chrome-only. Native permission prompts, enforcement and cleanup remain installed-extension verification work; simulated API tests are not end-to-end proof. Reload from the same extension folder, refresh your website, then open Privacy controls. Use only disposable data for cleanup testing.

## Strict navigation and Prime consecutive ads (0.7.0)

**Strict navigation is opt-in per exact source hostname.** On Lucifer Donghua, open the popup, expand Strict navigation, enable Restrict external navigation, then reload the page. Keep the existing green/dark interface and all earlier controls.

- Early scripts run at document_start only on enabled strict hostnames. The page-world hook refuses unknown external window.open calls, including initially blank windows, and intercepts ordinary external anchor clicks. This is best-effort: page scripts can tamper with hooks, and other-origin frames are not covered by this hook.
- Chrome session rules restrict HTTP(S) main-frame navigation in guarded tabs to the exact source hostname and explicitly allowed destination hostnames. These rules cover same-tab network navigation after installation, including redirects initiated by frames. They do not block all subframe or media traffic. New-tab rule installation is asynchronous, so an initial request can race it; the early hook and popup closure are additional layers, not a guarantee of zero contact.
- Allow exact destinations such as accounts.example.com only when needed. Subdomains are not implicitly trusted. Strict allow rules have priority 6, below listed threat/ad blocks at priority 10. An allowed destination can still be blocked by those lists. Ordinary successful navigation to an allowed external destination releases the source tab's strict restrictions; it does not transitively trust that site's redirects before commit.
- Pause strict mode for ten minutes, end recovery pauses, remove an exception, or turn strict mode off. Reload after changes. Blank-window login flows may need the temporary pause. A blocked same-tab navigation can show Chrome's blocked page and interrupt playback; use Back to return to the source. Recovery retains source context on that blocked page. This does not silently press Back, dismiss browser warnings, or claim the source site is safe.
- Configuration is limited to 50 strict source hostnames, 20 allowed destinations per source and 200 guarded tabs. Rule/registration/settings failures are reported with rollback. Session rules/context are rebuilt on startup/installation; there can be startup timing gaps. Strict-mode source hosts and destination exceptions are stored locally; per-tab host context uses session storage. Up to five observed external navigation attempts per tab are kept in worker memory, not uploaded.

**New permission: scripting**, to register packaged early guard scripts on strict-enabled sites. Reload the extension and approve Chrome's permission prompt if shown. This tool cannot operate chrome://extensions, so installation/reload must be performed by the user.

**Prime fix:** the detector now extracts ad ordinal/countdown evidence. When the player resets speed between consecutive ads, acceleration can rearm only after a higher ad ordinal or a reset countdown is observed, followed by countdown decrease and media progression. There are at most three rearms while the ad label remains continuously present. Missing/frozen labels and a continuing same-ad countdown retain the previous conservative stop. This does not bypass server-enforced ad timing, guarantee that repeated ads stop, or establish that every Prime label format is supported.

**Verification:** 119 automated tests pass; packaged JS syntax and ZIP assets checked. Chrome localhost fixtures verified early popup/blank-popup prevention, external anchor interception, normal same-page navigation, destination add/remove and strict pause controls. The consecutive-ad regression produced 10 / 1 / 10 / 1 for first ad, transition, second ad and episode. These fixtures use simulated extension APIs and media state. Installed session-rule enforcement and the user's live Prime/Lucifer sequence still require verification after reload. Check installed filters now includes active strict-session rule matching without contacting test destinations.

Official API references: [Chrome navigation rules](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest), [registered early scripts](https://developer.chrome.com/docs/extensions/reference/api/scripting#type-RegisteredContentScript).

## Previous 0.6.0 release notes

Built directly on the verified 0.5.0 ZIP with its green/dark theme and existing settings. No new permissions.

## New controls

- **Hide an element:** opens an on-page picker. Point at a box, click to select, then confirm **Hide on this site**. The outline is a preview; no element is hidden before confirmation. Escape or Cancel exits. **My hidden elements → Undo** restores a saved selection. Rules apply to the exact hostname, persist locally, and are limited to 50/site across 100 sites. No page text is saved. Embedded frames can be selected as whole elements, not inspected inside. Recognized media players, page roots and forms are excluded. Selectors use an ID where possible, otherwise a structural path with tag/class checks; changed page layouts can require undo and re-selection. This is manual element hiding, not proof the selected element is an ad. Page scripts that already handled an event before the picker cannot be undone.
- **Page not working?:** opens recovery controls for automatic ad elements, custom hidden elements, video assistance, popup cleanup and network filters. Each pause lasts ten minutes on this hostname and its subdomains, without changing the permanent switches. Try one option, then use **Reload this page** when ready; reloading may interrupt playback or unsaved work. **End recovery pauses** restores the previous configuration. Pausing network filters also pauses listed threat filtering and popup cleanup. Timers resume via Chrome alarms/startup/status repair; Chrome may delay them while asleep. The existing full-site pause remains available.
- **Popup protection:** tracks newly created navigation targets for up to ten seconds, including blank tabs that later navigate. Only installed listed destinations are eligible for closure. A successful ordinary-page commit ends tracking, and changed source/target URLs are left alone. Existing source tabs and subframe navigation are never closed. Tracking is bounded to 100 candidates in worker memory and is dropped on worker restart. This does not prevent all popup creation, same-tab redirects, or redirects after an ordinary page loads. Activity shows actual closures only.

## Verification for this build

105 automated tests pass. Coverage includes existing filtering/video behavior, delayed-popup navigation, ordinary-page commits, expiry, source changes, recovery rollback/restart, individual feature restoration, picker authorization, stale Undo, selector validation, protected media and reversible styles.

Chrome localhost workflow fixtures tested the real picker/rule code with a simulated persistence API: selection intercepted an advertising link without navigating; confirmation hid it; reload retained it; Undo restored it; save failure kept it visible; video selection was rejected; generic iframe selection and Escape cancellation worked. Popup fixture checks covered the theme, recovery/reset, Undo, and failed-save state. These fixtures do not access installed extension APIs. The installed service worker, real third-party popup timing, and live playback after this release are **not yet verified**. The browser tool cannot operate the extension manager, so a user reload is needed for that final check.

Reload the existing unpacked Ad Accelerator folder in Chrome and refresh website tabs. If installing from the ZIP elsewhere, replace your existing folder contents to preserve extension identity/settings. Do not install a second copy. No browser-store publication, commits, or pushes were performed.

## Data and API changes

Local storage now includes user-selected element selectors, tag/class fingerprints and recovery expiration times. Picker authorization (tab ID, source URL and five-minute expiry) uses Chrome session storage so a worker suspension does not interrupt a selection; expired entries are discarded when accessed, and tab closure removes them. Nothing is uploaded. Existing filters still update from their fixed public sources. No browsing history or page text collection was added.

Official references: [navigation events](https://developer.chrome.com/docs/extensions/reference/api/webNavigation), [session storage](https://developer.chrome.com/docs/extensions/reference/api/storage#property-session).

## Earlier release notes and existing behavior

Broad domain filtering plus ad-element hiding and skip-first video assistance. This reduces ads, tracking and exposure to listed threats. It does not certify websites as safe, scan downloads, prevent every exploit or remove all advertising.

## Player ad boxes in 0.4.4

Live inspection of the user's Battle Through the Heavens episode 208 page identified two 300x250 ad frames at https://t.co/Mi7nP8nOVO. One is in a .kln banner containing the dl-banner-300x250 script; the other is inside a separate absolute-positioned overlay in .video-content with the theme btn_close.gif control. The actual Dailymotion player is a sibling, outside the ad overlay.

The site compatibility rule hides these two narrowly matched containers without clicking Close or removing the actual player. It checks the observed structure rather than randomized overlay IDs. It reapplies hiding on the existing page inspection interval and restores original display styles when protection/cosmetics are disabled. It does not block all t.co links or all white/blank frames. New ad URLs or changed structures need another rule; other page-wide click handlers may still cause popups.

80 automated tests pass. Live DOM inspection verifies the target structure; the new extension code still requires reload and live visual/playback verification. No additional permissions.

## New in 0.5.0

A compact popup puts the current website and a 10-minute pause first. Expand Protection, Video ads, What happened?, or Settings & filters for details.

- Temporary pause: pauses network filtering, cosmetics, popup cleanup and video assistance for this hostname and its subdomains. Resume manually or let Chrome resume it using an alarm. Pause expiry is stored locally and repaired on restart/worker wake and status reads. Chrome can delay alarms during sleep or scheduling; it is not a precise timer. Lasting exceptions remain available under Settings & filters.
- Separate controls: Network filters (ads, trackers and threat domains together), Hide ad elements, Close blocked popups, and existing per-site/platform Video assistance. Popup cleanup requires Network filters. Turning off cosmetics or video does not disable network filtering. Pausing a whole site disables threat filtering too.
- What happened?: the player's reported status, effective network configuration, and up to five actual popup closures for the current tab during this worker session. No blocked-request counts are fabricated. Request-by-request logs are not collected. This recent-popup activity feed is kept only in worker memory; separate adaptive learning records can persist hostname evidence for up to 24 hours. Activity-feed entries are never uploaded and they clear on worker restart or tab closure.
- Failed saves remain visible and settings reload from stored state. No added permissions beyond 0.4.3.

Verification: **89 Node tests pass**, including pause expiry, restart, delayed alarms, settings/network independence, unauthorized webpage messages, storage rollback and alarm failure rollback. Real Chrome interaction and visual checks passed against a localhost popup fixture: compact layout, pause/resume, network toggle dependency, 20x selection, diagnostic display, and failed-save recovery. Fixture data is simulated and has no installed-extension access. The installed 0.5.0 extension has not yet been verified; reload and refresh website tabs to test it. Same-tab redirects remain unresolved. No claim of complete site safety or universal ad removal.

This release implements the proposed next-release scope: diagnostic panel, temporary pause and separate protection controls. Custom rules, report export and automatic ad muting remain possible future features.

Alarm behavior: https://developer.chrome.com/docs/extensions/reference/api/alarms

## Popup handling in 0.4.3

The user's installed 0.4.2 screenshot confirms all five rule checks pass with 507 rules. Live Chrome testing reproduced an unwanted hai8g.com tab after clicking Genres on Lucifer Donghua; that domain was already listed. Blocking its request does not necessarily prevent creation of a tab.

Version 0.4.3 used Chrome's webNavigation.onCreatedNavigationTarget event to close newly opened HTTP(S) tabs whose destination is covered by installed main-frame blocking rules. It respects global pause and source/destination site exceptions. It checks the current source and target URLs before closing and leaves changed or missing tabs alone. A manually clicked new-tab link to a listed domain is also closed; pause protection on the source site to allow it. No existing source tab is closed. No browsing URLs are persisted or uploaded.

New permission: webNavigation, to receive new navigation-target events. Chrome may request approval when reloading this build. This is tab cleanup after creation, not prevention before creation; a tab can briefly appear. Unknown destinations, blank-window-then-script-navigation, and same-tab redirects/reloads are not addressed by this handler.

77 automated tests pass, including listed/unlisted destinations, domain boundaries, pauses, exceptions, source/target navigation races and missing tabs. **The new handler has not yet been tested in the installed Chrome extension.** Reload 0.4.3, refresh the original site, and repeat the Genres workflow. The prior automatic browser review prohibited accessing the unsolicited popup destination; no workaround was used.

Chrome API reference: https://developer.chrome.com/docs/extensions/reference/api/webNavigation#event-onCreatedNavigationTarget

## Site compatibility in 0.4.2

Luciferdonghua.in's public page source was inspected. Its P21 script tests cosmetic bait elements, local ad-named files and external ad probes, and shows a full-page warning when any check fails. A child-list observer reattaches the warning if it is removed.

A narrowly scoped compatibility rule now hides only the observed exact ad-block warning, leaves its node attached and restores scrolling. It runs only on luciferdonghua.in and www.luciferdonghua.in while protection and Hide common ad elements are enabled. Disabling either restores the warning. Network filtering remains unchanged. This does not hide detection from the site, stop its detection report, unlock paid content or guarantee that its embedded video players work. Other dialogs are not targeted.

68 tests pass, including exact warning recognition, wrong-host/dialog exclusions and restoration. Public source inspection and simulated DOM tests are completed; the installed extension has not been verified on this site in Chrome. Replace files, reload the extension and refresh the site before testing.

## Fixes in 0.4.1

- Corrects 0.4.0's empty excludedResourceTypes assumption. Chrome's default mask excludes main_frame, so rules now explicitly list every supported resource type for blocking and allowing. Existing dynamic rules are repaired in place during startup/upgrade, retaining downloaded domain lists even offline.
- Handles synchronous runtime errors as well as rejected promises after extension reload. Disconnected content scripts restore controlled playback, remove their cosmetic styles and stop timers/listeners. Old 0.4.0 scripts already running in tabs still require a page refresh.
- 65 automated tests pass, including offline migration, pause/site rules covering navigation, synchronous/asynchronous invalidation and normal page lifecycle. Installed Chrome re-verification is pending. The user's 0.4.0 screenshot confirmed 507 installed rules and subresource matches, but main-frame matching failed; these fixes address that failure.

Chromium's resource mask implementation: https://raw.githubusercontent.com/chromium/chromium/main/extensions/browser/api/declarative_net_request/indexed_rule.cc

## Install / upgrade

Requires Chrome 145 or newer. This version uses Chrome's top-level-domain rule conditions so per-site exceptions also cover third-party embedded players.

1. Turn the old extension's video acceleration off before replacing it, or refresh playing tabs after the upgrade.
2. Replace the contents of your existing `prime-ad-accelerator` folder with this package's folder contents. Keep the folder location to preserve identity and settings.
3. Open `chrome://extensions`, reload Ad Accelerator, and accept the new all-websites access if Chrome requests it. For a new install, enable Developer mode, choose Load unpacked, and select the folder containing manifest.json.
4. Refresh open website tabs. Open the popup and wait for the filter count. Domain rules persist across Chrome restarts.
5. Open **Check installed filters** from the popup and click **Run checks**. It exercises Chrome's own rule matcher without fetching the listed URLs. With protection enabled, main-frame, script, sub-frame and request blocking should pass. If you have a site exception, its allow rule should pass too.

The browser-control tool available during development cannot manage Chrome's extension manager, so installation/reload needs to be done by the user. This build has not yet passed an installed-extension end-to-end test.

## What is covered

- **Domain blocking on HTTP(S) websites:** bundled HaGeZi Multi Light, Threat Intelligence Mini and Popup Ads snapshots compile to 507 rules covering 253,174 distinct listed domains. Chrome matches their subdomains too. Covers matching scripts, frames, requests and navigations, including known popup/ad destinations. This is domain-level filtering, not a complete EasyList network-filter engine.
- **Ad-element hiding:** 13,032 simple generic EasyList selectors, with known cosmetic exceptions omitted. Browser-supported selectors are inserted as removable CSS. This does not execute remote scriptlets or remove arbitrary page scripts.
- **Prime Video / JioHotstar / YouTube / Plex / Amazon MX Player:** named on-demand detection and configurable speed. Prefer skipping clicks an enabled, visible ad-specific Skip control. If an ad remains, acceleration is the fallback.
- **Hotstar, Plex and MX Player separate ad media:** can try seeking near the end only when the adapter identifies an ad-only video with a finite, seekable timeline. If it rejects or does not end the ad, fall back after one second. Plex personal media/live TV and unqualified MX route families remain excluded.
- **Other embedded players:** Video.js and JW Player layouts with explicit ad-playing classes are supported experimentally, including HTTP(S) frames. Unknown players and ads without a reliable signal remain unchanged. This is not universal video-ad detection.

YouTube ads do not always offer a Skip button, and an extension cannot assume its main video timeline contains only an ad. We do not blindly seek YouTube or Prime episode timelines. Site ad-blocker detection, server-enforced ad timing and stream-inserted ads may prevent skipping or playback entirely.

## Controls and recovery

- Protection on all websites pauses/resumes both network filtering and page assistance.
- Protection on this site adds/removes a hostname exception, including its subdomains and embedded frames. Up to 100 exceptions. Turning a child site back on also removes an inherited parent exception; other subdomains of that parent then regain protection.
- Hide common ad elements controls cosmetic filtering globally.
- Video assistance, Prefer skipping and fallback speed are saved separately for each platform or hostname. Embedded players inherit the top website's settings. Existing Prime/Hotstar/YouTube speeds are preserved.
- 20× attempts that rate and falls back to 16× if rejected. Chrome currently caps normal media playback at 16×. The popup reports actual applied speed during an ad.

Refresh after changing protection: previously blocked scripts cannot be restored retroactively, and already executed scripts cannot be undone. If a website breaks, pause protection on that site and refresh. Site exceptions pause threat filtering too. An unknown popup may still open. Newly created tabs targeting listed destinations are now eligible for closure, but redirects from initially blank or unlisted targets can still leave an empty/error tab. No blanket interception of every click or new window is used because that breaks normal links and logins.

Live streams, Shorts, unknown timelines, inaccessible/sandboxed frames, browser internal pages and the Chrome Web Store are not supported by page assistance. Domain filtering is limited to traffic Chrome exposes to extensions. First-party tracking, fingerprinting, unknown phishing, deceptive files and newly created ad domains can remain. Keep Chrome's built-in protections enabled.

## Updates and privacy

The three domain lists refresh daily while Chrome runs, with a manual Update lists now button. Downloads are HTTPS, credential-free and contain only public domain data. Fixed source URLs, size checks and strict parsing reject unexpected formats. Updates replace blocking rules atomically; download/parse/rule failures keep the previous rules. Offline first installation uses bundled lists. The cosmetic EasyList snapshot is updated with extension releases, not the daily domain refresh.

Settings, user-selected element rules, privacy preferences, list metadata, and bounded adaptive hostname-pair observations/rules are persisted locally. Adaptive records contain only hostname pairs, evidence hostname, count and timestamps; they expire within 24 hours. No analytics, browsing-history storage, cookie/password inspection, remote page analysis, notification changes or uploads. Current frame status and recent popup closure hostnames are kept in worker memory for the popup. List requests reveal the usual IP/network metadata to GitHub, but contain no visited URLs. Disable daily updates to use bundled/current lists offline.

Permissions: webNavigation for newly created navigation targets; storage for settings/status; alarms for refresh; declarativeNetRequest for blocking; HTTP(S) host access for filtering and content scripts in frames. No native helper, proxy, VPN, DNS setting change or external service subscription.

## Verification and remaining work

Automated Node tests cover old player behavior plus full filter parsing/compilation, domain boundaries, site policy, skip fallback, startup/restart, rejected downloads/rules/storage, rollback and frame settings. Browser popup UI was tested in real Chrome with a mocked extension API; that verifies controls/layout only, not installed blocking.

261 automated tests pass. Live inspection of the user's current Prime tab confirmed a shared 2526-second episode timeline, a continuously decreasing pod countdown, Prime's original-rate restoration and normal-content restoration; the patched 0.16.2 build still requires reload and a fresh multi-ad pod for installed confirmation. Prior user confirmation: Prime 10× and Hotstar acceleration worked; Prime, Hotstar, YouTube, Plex and Amazon MX Player playback were reported working in earlier installed builds. ZEE5, SonyLIV and WeTV protected ad workflows, generic-first behavior, Plex/WeTV fresh-load compatibility, native filter/privacy/upgrade checks, website-wide blocking and live-service compatibility remain unverified. No claim is made that every embedded host is covered.

Run `node --test tests/*.test.cjs`. Check diagnostics after loading. No browser store publication or other-browser port has been performed.

## Sources

See filters/NOTICE.md, included licenses, unmodified source lists and provenance.json. Rebuild the packaged cosmetic subset with `node scripts/build-filters.cjs` after replacing its source snapshot.

Chrome API: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
Chrome playback limit: https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/html/media/html_media_element.h
