# Ad Accelerator baseline audit — 0.11.3

Date: September 6, 2026. Scope: Chrome extension, starting from the exact 0.11.2 upload archive. This audit fixes reproducible defects and establishes a development baseline before expansion of the platform catalog. It does not certify that the extension is bug-free or that every website is safe.

## Readiness decision

**Suitable for controlled development and installed-browser qualification. Release clearance remains pending.** The final automated suite passes, packaging checks pass, and selected workflows work in real Chrome. Native installed-extension enforcement, upgrade/restart behavior, and real advertising transitions remain open gates. No new platform adapters, public website deployment, store submission, commit or push was performed.

## Scope and evidence

- Compared the starting source against every file in `ad-accelerator-0.11.2.zip`: exact match. Starting suite: 205 passing tests.
- Reviewed background message authorization, state serialization, filter download/commit/rollback, DNR and strict navigation, popup/adaptive handling, video state and restoration, element selection, cosmetic restoration, privacy controls, permissions, CSP and packaging.
- Final suite: **218 tests passed, 0 failed**. Thirteen additional tests cover the audit findings and security boundaries. See [test log](audit-final-tests.log).
- Packaging validated **25 JavaScript files and 53 upload files**, syntax, local HTML/manifest references, image dimensions and ZIP integrity. See [package log](package-audit-0.11.3.log).
- The extension ships handwritten JavaScript and bundled lists; there is no packaged npm runtime dependency tree. This is not an audit of the separately hosted website or every upstream list entry.
- Four failures were reproduced before fixes. See [reproduction log](audit-reproductions.log), [runtime patch](runtime-changes.patch), [changed files](changed-files.json) and [current source hashes](source-sha256.json).

## Findings and fixes

Severity here reflects practical impact in this extension, not a formal CVSS assessment.

| Finding | Impact | Fix and verification |
| --- | --- | --- |
| High: filter download held the settings queue | A slow list host prevented a user from promptly pausing protection on a broken site. | Download outside the policy queue, share concurrent requests, serialize only commit. Regression holds a download open while pausing, then verifies pause rules survive commit. Unexpected redirects fail while retaining previous filters. |
| Medium: Strict recovery used the blocked destination | The UI displayed the retained source, but allow/pause/reset could change another hostname. | Resolve the retained source consistently; reset its Strict recovery without clearing unrelated features. Regression covers allow, pause, reset and disable. |
| Medium: picker controls exposed to synthetic page interactions | A page could interfere with the selection/confirmation interface. | Closed shadow root and trusted-event checks for selection, save, reset and cancellation. Synthetic-event tests plus actual Chrome select/save/undo workflow. This does not make the entire page immune to clickjacking. |
| Medium: privileged actions accepted overly broad internal senders | Other extension pages could reach general policy actions unnecessarily. | Exact popup sender restriction; privacy/deletion and adaptive pages retain separate boundaries. No external message interface added. |
| Medium: Strict regex replacement lacked native preflight | An oversized allowlist could fail unexpectedly when replacing session rules. | Check `isRegexSupported` first, return an actionable error and retain working rules. Regression simulates rejection; actual installed native qualification remains pending. |
| Low: malformed messages threw before authorization | Invalid input could generate uncaught errors. | Validate message shape and string type before dispatch; regression includes null and malformed inputs. |
| Low: frame status records grew without a bound | Long-lived pages with many frames accumulated stale state. | Prune records at ten seconds; bound to 64 frames per tab and 512 tabs, with existing tab-close cleanup. Regression covers bounds. |
| Low: malformed top-level settings | Null/scalar/array saved state could break normalization. | Normalize to defaults; regression covers malformed state. |
| Low: detached compatibility elements retained references | Removed page nodes stayed in a tracking map. | Restore prior display and release disconnected nodes; regression verifies restoration. |
| Hardening: implicit extension CSP | Packaged pages relied on default policy rather than explicit boundaries. | Self-hosted scripts only, no objects/base/frame embedding; connections restricted to self and the existing GitHub list origin. No new permissions. Manifest/security contract tests added. Installed Chrome acceptance remains a gate. |
| UX: misleading status and privacy wording | Strict could look active while network filtering was paused; unknown signed links appeared fully protected from cleanup. | Explain saved versus suspended Strict status and the hostname escape hatch for signed links. Update packaged version labels. |

## Chrome workflow checks

The following ran in Chrome against current source files served from a loopback-only fixture server. Chrome APIs were simulated where stated; these are not substitutes for installed-extension tests.

| Workflow | Observed result | Evidence boundary |
| --- | --- | --- |
| Media speed and restoration | Real HTML media element started at 1.25×; requested 20× fell back to 16× with an accurate status. Pause restored 1.25×; resume reapplied 16×; a live marker restored 1.25× and excluded acceleration. | Real Chrome media behavior, synthetic ad/live markers, no DRM or streaming-service ad. Isolated from the installed generic detector using a closed shadow root. |
| Element picker | Trusted selection and confirmation hid the selected test link; Undo restored it. No link navigation occurred during selection. | Real DOM and UI events, actual picker/rule code, simulated save callback. |
| Popup controls | Disabling one hostname left a second hostname enabled; speed selection and temporary pause/resume updated correctly. Strict reported suspension when network filtering was off. | Actual popup code, simulated Chrome APIs. Final assets loaded with content-hash URLs to avoid cached fixtures. |
| Privacy controls | Success states displayed correctly. Simulated native regex rejection showed an error and returned tracking cleanup to off; no browser console errors in the tested flow. | Actual privacy UI, simulated APIs. Does not prove Chrome accepted native contentSettings/DNR rules. |
| Existing Prime tab | Visible video was paused at 1× with no active ad. It was left unchanged. Sampled console errors were Amazon player errors rather than observed extension context errors. | Read-only observation; no current extension version or ad transition verified. |

## Remaining release gates

Complete [INSTALLED-CHECKLIST.md](INSTALLED-CHECKLIST.md) before describing this build as release-ready. In particular:

1. Reload the actual unpacked build and verify version 0.11.3, manifest/CSP acceptance and installed filter diagnostics.
2. Exercise native DNR, location and cookie controls, including failure rollback and full-site pause restoration.
3. Check expiry after service-worker sleep/browser restart and upgrade with already-open tabs.
4. Observe actual ads and normal-program negative controls on Prime, Hotstar on-demand sports and YouTube; test consecutive ads and media removal/navigation. Existing historical user confirmations are not qualification of this build.
5. Check native Strict navigation, retained-source recovery, popup handling and coexistence with other extensions.

The user was asked to reload 0.11.3 and run installed filter checks. No result was available when this report was written. Local fixture success must not be recorded as native installed success.

## Residual limits

- Ad and threat lists have false positives, omissions and changing destinations. No filter proves all websites, downloads or content safe.
- MAIN-world navigation hooks and DOM ad markers run against an adversarial page. Page interference, event timing, cross-origin frames and browser initiator behavior limit coverage. Do not claim invisible or universal interception.
- Adaptive rules remain local, narrow, expiring heuristics. Repeated observations do not make false positives impossible; retain recovery and expiry behavior.
- Unknown signed URL formats may still break with tracking cleanup. The hostname exception is intentional.
- Full-site pause preserves saved preferences. The Chrome-wide third-party cookie override must be cleared while any full pause/site exception requires it; this has a broader browser effect than other per-site features. Background filter updates follow their separate preference.
- Current named video adapters are Prime, Hotstar and YouTube, with conservative explicit Video.js/JW fallbacks. Audio adaptation is not implemented; live playback is excluded. Ad insertion into a live stream cannot be treated as seekable on-demand advertising.
- Subscription, DRM, authentication, geographic and age restrictions are outside ad handling. The catalog is not an authorization or compatibility list.

## Deliverables

- Upload ZIP: `../ad-accelerator-0.11.3.zip` — SHA-256 `e3420b63f64ef0628942193902c708128432a087f917e0583e0d51eb7d7bb3d5`.
- Source ZIP: `../ad-accelerator-0.11.3-source.zip` — SHA-256 `26814470387d332c65f56cfa5f10f93f484ca51943392c0115ffc6d8db39d04b`.
- Canonical unpacked source: `../prime-ad-accelerator/`.
- New-session instructions: [START-HERE.md](../../START-HERE.md).
