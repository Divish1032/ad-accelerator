# Ad Accelerator — new-session handoff

Updated September 11, 2026. The 0.11.3 audit remains the baseline; current canonical source is the 0.16.2 Chrome Web Store release candidate. Live Prime inspection showed that consecutive creatives share the episode timeline and one continuously decreasing pod countdown, while Prime restores the original playback rate between creatives. The bounded Prime recovery now uses that real transition pattern; 0.16.1's reset-countdown model is superseded. The first 20-platform qualification batch produced three narrow adapters—ZEE5, SonyLIV and WeTV—and 17 explicitly unimplemented outcomes. Do not restart from an older ZIP or treat generic detection or the research catalog as universal support.

## First reads

1. Read applicable AGENTS.md and this file. Stay in `/Users/itachi/Documents/Github/ad-accelerator`; preserve unrelated work.
2. Inspect `outputs/prime-ad-accelerator/manifest.json` and current source before relying on this handoff. Expected version: **0.16.2**.
3. Read [audit and readiness decision](outputs/baseline-audit-0.11.3/AUDIT.md), then [native qualification gates](outputs/baseline-audit-0.11.3/INSTALLED-CHECKLIST.md).
4. Read [research overview](outputs/global-streaming-research-2026-09-06/RESEARCH.md), [qualification follow-up](outputs/global-streaming-research-2026-09-06/QUALIFICATION-FOLLOWUP.md), and the machine-readable inventory alongside them.

## Audited baseline

Canonical source: `outputs/prime-ad-accelerator`. Audit started from an exact match of 0.11.2 and fixed download/settings queue blocking, retained-source Strict recovery, message boundary errors, frame-record bounds, picker trust, Strict regex preflight, malformed configuration and detached-node retention. Explicit CSP and clearer statuses were added without new permissions or new platform adapters.

**218 automated tests pass; packaging validates 25 scripts and 53 upload files.** Real Chrome fixture checks cover media-rate fallback/restoration, trusted picker select/save/undo, popup controls and privacy failure rollback. Extension APIs were simulated in UI fixtures. Native installed Chrome enforcement, upgrade/restart and real ad transitions remain pending. Do not claim bug-free, universally safe, or release-cleared.

Artifacts:

- [Upload ZIP](outputs/ad-accelerator-0.11.3.zip), SHA-256 `e3420b63f64ef0628942193902c708128432a087f917e0583e0d51eb7d7bb3d5`.
- [Source ZIP](outputs/ad-accelerator-0.11.3-source.zip), SHA-256 `26814470387d332c65f56cfa5f10f93f484ca51943392c0115ffc6d8db39d04b`.
- Audit directory contains reproduction/test/package logs, runtime patch and source hashes.
- Detailed history: `work/CHECKPOINT.md`; earlier verification records remain historical evidence.

## Current development build

Version **0.16.2** repairs the remaining Prime consecutive-ad failure from live evidence. Prime's current player showed one finite episode timeline (`2526.046` seconds), a pod-level label such as `Ad 0:28` / `Content resumes in 28 seconds`, and normal episode playback restored at 1× after the ad. The pod countdown decreases across creatives; it does not reset or expose `Ad 2 of 3`. Prime restores the exact original rate at a creative boundary, which the old safety logic treated as possible content and blocked. Prime-only rearming now requires the trusted ad state to remain, the exact original rate to be restored, the same media to advance and the pod countdown to decrease across two confirmations. It remains capped at three rearms. A different viewer-selected speed is preserved. Core and full-content regressions cover ads one, two and three.

Version **0.16.1** fixes a regression in consecutive Prime Video ad pods. Since 0.15.0, the generic detector could recognize Prime's shared ad timeline before the named Prime adapter, but its result omitted Prime's ad ordinal/countdown metadata. If Prime reset `playbackRate` between ads, the shared safety controller correctly stopped acceleration but then lacked enough evidence to distinguish ad two from a stale ad-one label. The content pipeline now merges Prime metadata only when the strict Prime detector confirms the same visible media and active ad. Rearming still requires a new ordinal or reset countdown, decreasing countdown, media progression and the existing retry cap. One end-to-end regression reproduces the generic-first path and the first-ad/reset/second-ad sequence.

Version **0.16.0** prepares the current runtime for Chrome Web Store submission without changing detection or protection logic. It refreshes the manifest summary, packaged help/privacy/credits pages, website content, a new `/supported-sites` page, canonical/Open Graph/structured search metadata, robots/sitemap routes, listing copy, reviewer notes, screenshots and a deterministic store kit. Public claims name only the eight implemented on-demand integrations: Prime Video, JioHotstar, YouTube, Plex, Amazon MX Player, ZEE5, SonyLIV and WeTV. Generic HTML5 detection is described as experimental broader compatibility. The 499 research entries are not marketed as supported platforms.

The user reports that installed 0.16.0 is working, but did not provide a precise evidence log covering real ads, native privacy settings, restart, upgrade and coexistence. Chrome extension-management pages remain inaccessible to this session. The 0.16.0 website was deployed publicly and its release routes were verified on September 9, 2026. Remaining manual Chrome/dashboard items are tracked in `work/RELEASE-CHECKLIST-0.16.0.md`.

Version **0.12.0** added one platform: Plex free on-demand movies/shows on exact `watch.plex.tv` watch routes. Chrome observation found two consecutive pre-rolls using separate finite `video[title="Advertisement"]` elements, with an explicit `Ad 2 of 2` countdown. A second title confirmed the 6.976-second ad timeline was independently seekable while the program remained paused at 1×. The adapter requires that player-owned state, parses ordinal/countdown evidence for consecutive ads, and reuses shared skip/acceleration/restoration logic. Live TV, catalog pages and personal-library surfaces remain excluded.

Installed 0.12.0 testing reproduced Plex's anti-ad-block error before a video element existed. The user then paused Ad Accelerator for that exact site; an agent-observed refresh also restored the Plex player and normal media. Version **0.12.1** therefore adds one narrow dynamic allowance for XHR to `g.doubleclick.net` and `pagead2.googlesyndication.com` only when the top-level site is exactly `watch.plex.tv`. Navigation, scripts, media, images, tracking pings, other sites and broader Plex traffic remain covered by the existing policy.

After installing 0.12.1, the user reported Prime, Hotstar, YouTube and existing Plex tabs working without warnings. A fresh protected agent-created Plex tab nevertheless still reproduced the anti-ad-block message before any video existed. Version **0.13.0** therefore lets the same two Google ad-stack domains load non-main-frame subresources only under exact `watch.plex.tv`; top-level navigation, all other domains/sites and broader Plex traffic remain covered. This narrower-than-site-pause compatibility change still needs an installed fresh-load test.

Amazon MX Player is the second qualified expansion. Two free family-rated series episodes exposed real 20.1-second and 45.1-second pre-rolls as separate visible finite `video[title="Advertisement"]` media inside the active player-owned ad container. Their 1,247-second and 1,080-second programs remained paused at 1×; the first resumed at 1× after its ad. The 0.13.0 adapter is limited to exact MX Player hosts and the observed series episode route family, uses shared skip/acceleration/restoration, and rearms a distinct consecutive ad only after new-media progression. MX movies, catalog/home trailers, live streams and audio remain unqualified and excluded.

Version **0.14.0** completed a sequential 20-platform on-demand qualification pass. ZEE5 exposed a separate 20.011-second IMA pre-roll; SonyLIV exposed a separate 60.011-second mid-roll and resumed its program at 1×; WeTV exposed a real 15-second then 30.059-second ad pod and resumed its program at 1×. All three use small exact-host/observed-route adapters over the shared media controller. They require an active player-owned ad container and exactly one visible finite advertisement video; ad SDK presence, page copy, placeholders and ordinary content are not enough.

The installed 0.13.0 policy prevented WeTV's player from being created while the clean profile played the same episode and loaded the two IMA decision hosts already isolated for Plex. Rule 91 therefore permits only those two domains' non-main-frame subresources on exact `wetv.vip`. SonyLIV's installed anti-ad-block wall is not claimed fixed. The other 17 candidates remain unimplemented because of geo/login/payment blocks, unusable playback, no genuine ad in the sample, or an inaccessible cross-origin ad timeline. See `work/PLATFORM-QUEUE-20.md` rather than inferring support.

Version **0.15.0** adds a generic-first detector for live player-DOM transitions. It combines explicit active ad state or a stable player-sized ad overlay with media replacement, program pause/hide, established-control loss and strict ad countdown/skip evidence. It distinguishes separate ad media from shared program/ad timelines: only explicitly separate media may be sought; shared timelines can only be accelerated. Missing controls, short media, SDK presence, class substrings or dormant containers cannot qualify alone. Named adapters run whenever generic evidence is incomplete. Live/navigation/lifecycle resets and a 500-node inspection bound preserve existing safety and privacy behavior.

**261 automated tests pass; packaging validates 25 scripts and 53 upload files.** The Prime transition shape was observed live, but the patched 0.16.2 build still needs reload and a fresh installed multi-ad pod. The three 0.14.0 ads were observed before their adapters were installed, so their protected output behavior also remains pending manual reload. Fixture success, ordinary playback and the absence of an ad are not live passes.

Current release-candidate artifacts:

- [Upload ZIP](outputs/ad-accelerator-0.16.2.zip), SHA-256 `5024e24cc4033baeedd9e8410431c42f837c08b157dc7127d04972fbf5457abf`.
- [Source ZIP](outputs/ad-accelerator-0.16.2-source.zip), SHA-256 `841674646ad7056727c7ed94a15fb86f837ee85e205450980311bf23a512df99`.
- [Store kit](outputs/ad-accelerator-0.16.2-store-kit.zip), SHA-256 `07560d522d1f8829932314540f10d9ea793bc75f0f28d719a353685b665ce81e`.
- [Platform coverage tracker](work/PLATFORM-COVERAGE.md).
- [20-platform qualification queue](work/PLATFORM-QUEUE-20.md).
- [0.16.2 release verification](work/VERIFICATION-0.16.2.md).
- [0.16.2 manual release checklist](work/RELEASE-CHECKLIST-0.16.2.md).

Verification commands, from this workspace:

```sh
node --test outputs/prime-ad-accelerator/tests/*.test.cjs
python3 work/release-tools/package-release.py
```

The package command creates ZIPs; it does not install, publish or submit them. Recheck source changes and versions before regenerating an existing release.

## Existing behavior to preserve

- Generic player-transition detection runs first on eligible pages; named fallbacks remain Prime Video, Hotstar (including on-demand sports watch routes), YouTube, Plex on-demand, Amazon MX Player series episodes, ZEE5 series episodes, SonyLIV show episodes and WeTV English episodes. Configurable speed including requested 20× with supported-rate fallback, skip-first where a genuine control or qualified separate ad timeline exists, and original-speed restoration.
- Live playback remains excluded. Audio-specific adaptation is not implemented. Normal content must not accelerate merely because it is on a candidate domain.
- Full-site pause/disable suspends relevant enforcement while retaining configured preferences; temporary pause expires automatically. The global third-party cookie override is cleared while full pauses/site exceptions require it. List refresh has its own preference.
- Adaptive filtering is already implemented (the old memory describing it as design-only is stale). It learns locally from narrow new-popup redirect chains ending in installed known blocks, requiring three observations at least 30 seconds apart. Rules expire after 24 hours, cap at 100, and learned rules cannot teach further rules. Preserve source/destination scope, recovery and exclusions for incognito/subframes/same-tab/ordinary committed navigation.
- No telemetry, remote executable code or account system. Do not weaken privacy or permission boundaries for adapters.

## Research backlog

`outputs/global-streaming-research-2026-09-06/` contains **499 service/brand/regional entries**, **113 documented ad offerings/inventories**, **386 qualification candidates**, and **228 cited source records**. These are not 499 unique player engines, active ad-supported services or verified compatible sites. Candidate domains must never become a blocklist.

Includes video, audio, live/FAST, free and paid-with-ads services, regional players and non-graphic adult-service candidates. Region groups describe market focus, not complete geographic availability. Research documentation does not prove an ad appears in Chrome for the user's tier/location.

Builders and source records:

- `work/build-streaming-inventory.py`
- `work/streaming-research-sources.json`
- `work/qualify-streaming-followup.py`
- `work/streaming-qualification-followup.json`
- `work/write-streaming-followup-report.py`

## Implementation sequence for the new session

First reload the canonical folder and confirm installed 0.16.2. Complete `work/RELEASE-CHECKLIST-0.16.2.md`, beginning with a real Prime pod containing at least three consecutive ads. Do not interpret ordinary playback or an absent ad as success. Maintain `work/PLATFORM-COVERAGE.md` with separate states for ad model documented, browser accessible, actual ad observed, generic/adapter implementation, regression tested and live verified.

Work in small batches chosen by accessible region/tier and actual on-demand ads. Share safe media actions; add small evidence-based site adapters. Capture a real ad before choosing selectors or seeking logic. For each adapter, test ad start/end, consecutive ads, original-rate restoration, pause/disable, navigation, live exclusions and normal-program negative controls. Do not convert all catalog domains into speculative hostname branches.

Subscription, DRM, login, geographic and age restrictions are not ad handling. Do not claim coverage from filter matching, player absence, or a fixture alone. User wants broad support with minimal intervention, but accuracy and reversible behavior take priority over a numeric coverage claim.

## Publication context

Public developer: Divyansh Kumar. Support: divyansh1032@gmail.com. Website: https://ad-accelerator.kumar-divyansh1996.chatgpt.site. Website version 3, sourced from site commit `29f46b0e3bca919d34d471833b3e6c2851f75d89`, was deployed publicly on September 9, 2026. The Chrome Web Store item has not been uploaded or submitted. Website deployment does not authorize Chrome Web Store submission.

Suggested new-session request: “Read START-HERE.md, reload the current 0.16.2 release candidate and verify a real Prime three-ad pod plus the remaining manual Chrome checks before Chrome Web Store submission.”
