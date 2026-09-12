# Adaptive data in 0.9.0

Automatic learning is enabled by default under network/popup/site protection. The separate `adaptive` local-storage entry contains at most 100 candidate/active hostname-pair rules and 100 temporary allow pairs. Fields are source hostname, initial destination hostname, known-listed evidence hostname, observation count, last observation time and fixed expiry. Expiry is 24 hours from first evidence; allow pairs expire after 24 hours. No full URLs, query parameters, page content or learned selectors are persisted or uploaded. Source URL and popup tab IDs are held only in a bounded 10-second worker-memory candidate, dropped on ordinary commit or worker restart. Hourly pruning removes expired rows; enforcement checks expiry independently. Existing list updates are the only network activity added by the blocker; adaptation adds none.

No incognito learning. No browsing-history API, cookie contents, credentials, external model calls or shared/global learning feed. The optional Adaptive protection page provides on/off, Allow for 24 hours and Clear learning and turn off. Global/site protection and network/popup recovery pause adaptation. These controls are not required feedback or labeling.

This is heuristic learning, not proof that a destination is malicious. It uses repeated chains reaching installed blocklist destinations and excludes recognizable authentication/payment/signed links. Shared redirectors can still be misclassified on a source site. The rule scope and expiry limit consequences, and Allow suppresses relearning for 24 hours. The privacy controls below include the 0.10.0 pause changes.

# Local privacy controls — 0.10.0

## Behavior and choices

Open **Privacy controls** from the extension popup on a normal HTTP(S) website. The new page remains bound to that source tab. This release keeps all new privacy features opt-in; it does not automatically change Chrome preferences or clear data on upgrade. Existing tracker-domain filtering remains active under the existing network settings.

- **Tracking-link cleanup:** four or fewer dynamic DNR rules, no new per-page polling or script interception. Recognized lowercase campaign/click parameters are removed on HTTP(S) GET main-frame navigation. Known signature, OAuth, SAML and token parameters cause the original URL to be retained. Unknown authentication schemes may still need an exception. Fragments, POSTs, subframes, XHR and normal functional parameters are not targeted. No comprehensive URL-cleaning claim.
- **Link exceptions:** apply to both source and destination hostnames and their subdomains. A child cannot remove its parent's exception. These are low-priority cleanup exceptions, not exceptions to listed-threat or strict-navigation blocking. Cleanup follows the existing global/network/site/recovery pauses. Strict allow rules can take precedence and leave links unchanged. No per-URL history is logged.
- **Third-party cookies:** optional `privacy` permission. Chrome's native thirdPartyCookiesAllowed setting is set only to false. The effective value and levelOfControl are read back. Managed settings are displayed and not overridden. Switching off clears this extension's override; it never force-enables cookies. A separate release button remains available when another extension controls the setting. Chrome's site exceptions, exemptions and Storage Access grants may still permit some cookies. Users manage cookie compatibility exceptions in Chrome or release our override; the extension does not install broad cookie allow rules.
- **Location:** optional `contentSettings` permission. A native block applies to all requesters inside the selected exact top origin (scheme, host and explicit non-default port). Up to 100 saved origins. Removing one restores the underlying Chrome permissions and preserves our restrictions on other origins. It never grants location access. Effective top-document status is read back; other controllers or enterprise policies can affect results.
- **Cleanup:** optional `browsingData` permission requested only on confirmation. Review is non-destructive, expires after five minutes and starts with no data selected. A one-use confirmation is tied to the source tab and origin. Closing/changing the source tab, expiration or missing permissions prevents the operation. Cookies and site storage are separate explicit choices. Cookie deletion follows Chrome's broader registrable-domain scope, including related subdomains; this is disclosed before confirming. Site storage selects LocalStorage, IndexedDB, CacheStorage and ServiceWorkers for the approved origin. It does not select passwords, history, downloaded files, all-browser data, extension origins or protected web-app origins. Some protected/partitioned data may remain; open pages may repopulate data. No automatic retry after possible partial deletion.

Full site/global pauses now release our location restriction on matching origins. They also release our Chrome-wide cookie override across the regular profile until all full-site pauses and lasting exceptions end. This includes exceptions for closed tabs. Saved feature preferences are retained, and only previously enabled features are restored. The popup and privacy page disclose this broader cookie scope. No force-allow is issued; Chrome underlying permissions and restrictions still apply. Global list updates follow their separate setting and no saved data is deleted or recreated by a pause. Regular-window controls only; regular Chrome preferences may also be inherited by private windows according to Chrome's own rules. No private-window cleanup is offered.

No IP masking, proxy, VPN, device spoofing, invasive fingerprint randomization, certificate interception, Safe Browsing changes, referrer stripping, WebRTC blocking, automatic cookie deletion, or server-side erasure. The page explicitly states that IP-based location and signed-in identification remain possible.

## Data handling

New persisted data: user-chosen tracking-link cleanup preference (on/off), hostname exceptions and location-restricted origins. The desired cookie-blocking preference is persisted so pauses and restarts can restore it. Effective cookie state is still read from Chrome. Migration adopts only an existing override owned by this extension; another controller's restriction is not adopted. Temporary cleanup confirmations contain only origin, tab ID, expiry and random token, in session storage (bounded to 20, expired entries pruned on new review). No cookie contents, location coordinates, form data or browsing history are read or uploaded. Cleanup is delegated to Chrome and never enumerates cookies. No new servers or network requests.

## Porting boundary

`privacy-core.js` contains pure validation, parameter policy and the current Chrome DNR compiler. `privacy-chrome.js` owns native permission/state/cleanup operations. `privacy-page.js` owns user-gesture permission prompts; it never handles cookie values. Privileged messages are accepted only from the packaged privacy page, not website content scripts. All public mutation requests are validated and serialized with existing background work.

This is a Chrome release, not a verified cross-browser package. For each future browser, provide an adapter and manifest matching its capabilities, and port the DNR compiler where topDomains/query-transform support differs. Do not lower Firefox's native partitioning to reproduce a Chrome boolean preference: MDN documents cookieConfig behavior including reject_trackers_and_partition_foreign. Do not advertise unsupported location or origin-scoped cleanup features. Safari requires a separate permissions/API/package review. Disabling an unavailable control must be explicit; never replace origin-scoped deletion with all-browser deletion.

## Verification and release gate

Automated tests and Chrome localhost UI fixtures are recorded in work/VERIFICATION-0.8.0.md in the development workspace. Fixtures do not execute installed extension APIs. Real permission prompts, Chrome rule matching/redirect behavior, native cookie/location enforcement, and real cleanup remain installed-extension verification work. Only use disposable site data for destructive testing after explicit user confirmation. The existing diagnostic page now tests tracking-link, signed-link and POST matching without contacting the synthetic domains, when cleanup rules are enabled.

## Primary references checked September 6, 2026

- Chrome privacy settings and exceptions: https://developer.chrome.com/docs/extensions/reference/api/privacy
- Effective setting ownership and clearing: https://developer.chrome.com/docs/extensions/reference/api/types
- Content settings and origin patterns: https://developer.chrome.com/docs/extensions/reference/api/contentSettings
- Origin-scoped deletion and cookie domain scope: https://developer.chrome.com/docs/extensions/reference/api/browsingData
- Optional permissions: https://developer.chrome.com/docs/extensions/reference/api/permissions
- DNR query transforms, priorities and test matching: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- Firefox/privacy compatibility: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/privacy/websites
- Safari compatibility review: https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility
