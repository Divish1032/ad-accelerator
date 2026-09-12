# Installed Chrome qualification — 0.11.3

Status: pending. Record browser version, OS, extension version, time, actual result and whether evidence was agent-observed or user-reported. Use benign local test destinations or DNR `testMatchOutcome`; do not visit known malicious domains to test a list.

- [ ] Reload the existing unpacked extension from `outputs/prime-ad-accelerator`. Confirm 0.11.3 and no manifest/CSP errors. Refresh old test tabs once to replace invalidated content scripts.
- [ ] Run **Check installed filters**. Record all five outcomes, installed rule count and any errors. Passing proves sampled matching, not universal protection.
- [ ] Toggle network, cosmetics, popup handling, video, adaptive and Strict independently. Confirm the displayed hostname matches the affected hostname. Test a second site as a negative control.
- [ ] Enable native tracking cleanup; navigate a benign URL with recognized campaign fields. Verify known signed/authentication forms are preserved and rejected rules leave cleanup off. Keep unrelated ad rules active.
- [ ] Toggle location blocking on an HTTPS test origin and same-origin frame; check native permission status. Toggle off and confirm prior Chrome permission is restored, never granted implicitly.
- [ ] Toggle the Chrome-wide third-party cookie override. Verify actual native status and interaction with another extension controlling that setting. Do not clear saved site data as part of this check.
- [ ] Pause a site for ten minutes with all features configured on. Verify video restores its original rate, hidden elements return, network/popup/adaptive/Strict enforcement suspends, and privacy overrides follow the full-pause policy. Verify settings remain saved.
- [ ] Allow the timer to expire with popup closed and service worker idle; verify configured features resume. Repeat across browser restart. Check manual resume and permanent per-site disable on two domains.
- [ ] Test a blocked Strict destination and allow/pause/reset from the retained source. Verify unrelated sites and recovery settings remain unchanged. Check a too-large destination set retains the last working rules.
- [ ] Test a benign popup and a fixture popup targeting a listed URL. Observe tab outcome and native rule matching separately; a newly created blocked tab does not prove a remote page loaded.
- [ ] Test an update while offline/slow. Confirm pause stays responsive and failed updates retain filters. Test successful update without losing active pause/privacy rules.
- [ ] Test native real ads on Prime, Hotstar sports highlights and YouTube. Record ad marker, video identity, time/rate before/during/after, skip versus acceleration, paused-ad behavior, consecutive-ad transition and original-rate restoration. Ad absence is not a pass.
- [ ] Verify normal content never accelerates and live playback is excluded. Test navigation/media replacement, disabling during an ad, and extension reload while a tab remains open.
- [ ] Select/hide/undo a non-player element. Test page attempts to dispatch synthetic confirmation, and verify normal forms/players remain protected from selection.
- [ ] Check clean-profile and coexistence behavior with the user's other extensions. Inspect fresh error timestamps rather than treating historical errors as new.

Do not check boxes from unit/fixture results alone. Update the audit readiness decision only after recording observed results and unresolved failures.
