# Chrome release handoff — 0.16.2

Ad Accelerator 0.16.2 is the local Chrome Web Store release candidate. It supersedes 0.16.1 with a live-evidence-based Prime Video consecutive-ad fix: Prime's pod countdown decreases continuously across creatives, so the controller now rearms only when the trusted ad signal, same-media progression, decreasing countdown and exact original-rate restoration all remain present.

**Status: website deployed; extension locally prepared, not submitted or approved.** Website version 3 was deployed publicly on September 9, 2026. No Chrome Web Store upload, dashboard certification, payment or store submission was performed.

## Before submission

1. Reload `outputs/prime-ad-accelerator` in `chrome://extensions`, confirm version 0.16.2, and refresh older test tabs.
2. Complete `work/RELEASE-CHECKLIST-0.16.2.md`. Record exact real-ad results; an ad-free video is only a normal-playback check.
3. Recheck the deployed public home, supported-player, help, privacy and license URLs before entering them in the Chrome Web Store dashboard.
4. In the Chrome Web Store dashboard, create or update the item and upload `outputs/ad-accelerator-0.16.2.zip`, not the source ZIP or store-kit ZIP.
5. Use `LISTING.md`, the files under `assets/`, `PERMISSIONS-AND-PRIVACY.md`, and `REVIEWER-NOTES.md`. Review the dashboard’s current wording before certifying privacy answers.
6. Submit only after the remaining manual checks are acceptable. Google decides approval and timing. Add a store install link to the website only after a real item URL exists.

## Public compatibility wording

Name Prime Video, JioHotstar, YouTube, Plex, Amazon MX Player, ZEE5, SonyLIV and WeTV as the eight current on-demand integrations. Describe the generic HTML5 detector as experimental broader compatibility. Do not publish the 499-entry research catalog as a support list.
