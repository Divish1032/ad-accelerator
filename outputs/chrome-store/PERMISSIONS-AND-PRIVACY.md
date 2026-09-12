# Privacy practices and permission explanations

Release candidate: Ad Accelerator 0.16.2. Review these notes against the current dashboard wording before certification.

Use this document to complete the publisher dashboard honestly. The dashboard is inaccessible from this session, so its exact questions and declarations have not been submitted. Do not certify declarations without reviewing the actual wording.

## Single purpose
Reduce intrusive advertising and associated tracking while letting users control protection for each website. Network, page, video and popup controls support this purpose. The optional privacy/cleanup tools are separately visible and permission-gated. Chrome reviews whether all features satisfy its single-purpose policy; preparation is not an approval guarantee.

## Permission justification text

| Permission | Why the extension needs it |
| --- | --- |
| storage | Save local settings, hostname exceptions, pauses, chosen element selectors, filter lists, update status, and bounded adaptive hostname rules. No sync storage or developer upload. |
| alarms | End timed pauses, retry failed restoration, prune expired learned rules, and run user-enabled daily list updates. |
| declarativeNetRequest | Apply local dynamic rules for listed ad/tracker/threat destinations, user exceptions, optional tracking-parameter cleanup, and strict navigation session rules. |
| webNavigation | Observe newly opened popup navigation and redirect chains, maintain chosen site navigation rules, and recognize repeated popup chains ending at listed destinations. |
| scripting | Install packaged navigation guards for user-enabled Strict navigation and send its validated local configuration to website frames. All executable code is in the package. |
| http://*/* and https://*/* | Apply the requested protection on arbitrary websites and embedded video frames, read the current site, match/filter requests, inspect visible ad/player elements, and perform narrowly scoped page changes. Restricted Chrome pages are excluded. |
| privacy (optional) | At the user's request, manage Chrome's third-party-cookie preference and read back whether this extension controls it. No cookie values are read. |
| contentSettings (optional) | At the user's request, block location requests within a selected top-level origin and restore underlying settings when disabled or paused. No location coordinates are read. |
| browsingData (optional) | Only after explicit review and confirmation, ask Chrome to clear selected site storage and/or site cookies. No history, passwords or cookie values are read; cookie deletion may cover related subdomains as disclosed. |

## Remote code
No remote executable code. The only extension-origin external requests download three fixed HaGeZi domain lists as text from raw.githubusercontent.com. Downloads omit credentials and referrers; parsed/validated domain data is compiled into DNR rules. EasyList cosmetic data is bundled. No external model, analytics SDK, proxy or remote script.

## Data practices
- Local processing includes website addresses, navigation events, visible page/element structure, links, video/ad state and user-selected controls. Do not claim the extension cannot access website content.
- Persistent local data includes preferences, exceptions, chosen element selectors/fingerprints, filter data, origin restrictions, and bounded learned hostname pairs with timestamps. Adaptive rules expire after 24 hours; no full browsing URLs are persisted by that learning system.
- Temporary popup candidates may contain a source URL for 10 seconds in memory. Element-picker authorization holds a source URL and tab ID for up to five minutes in session storage. Cleanup confirmation holds origin, token, tab ID and expiry for up to five minutes in session storage. Session activity is bounded.
- No browsing data is sent to the developer, sold, used for ads, or sent to AI. No analytics or account system. Filter servers receive ordinary request metadata including IP addresses.
- Optional native cookie/location settings are managed without reading cookies or coordinates. Cleanup delegates deletion to Chrome.
- Support email is a separate voluntary channel; the privacy policy explains it and website hosting logs.

If the dashboard defines “collection” to include local access or processing, disclose the relevant browsing activity/website-content categories and explain the local-only use. Do not choose “no data” merely because there is no upload. Review the current dashboard definitions before certification. Confirm no sale, unrelated use, or lending/credit use only if those declarations remain accurate.
