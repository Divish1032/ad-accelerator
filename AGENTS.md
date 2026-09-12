# Project instructions

- Read `START-HERE.md` and `context/PROJECT-MEMORY.md` before substantial work. Verify current source and audit evidence before relying on historical notes.
- Work from this project directory. Canonical extension source is `outputs/prime-ad-accelerator`; other versioned directories and ZIPs are snapshots, not editable sources.
- Preserve the current `outputs/` and `work/` layout unless restructuring is explicitly agreed. Do not edit the old Codex workspace as a second active source.
- Maintain `work/CHECKPOINT.md` and update the handoff after substantial work. Keep implementation status, fixture results and native browser qualification separate.
- The 499-entry inventory is a research backlog, not a supported-site list or blocklist. Qualify real ads before writing platform adapters. Preserve normal playback and original-rate restoration; live playback remains excluded until separately designed and tested.
- Keep local learning narrow, expiring and reversible. Do not add telemetry or weaken sender, permission, CSP or privacy boundaries for broader coverage.
- Read `outputs/baseline-audit-0.11.3/INSTALLED-CHECKLIST.md` before claiming baseline release readiness. Never call fixture-only coverage native installed success or promise universal safety.
- Use `node --test outputs/prime-ad-accelerator/tests/*.test.cjs` for the extension suite and `python3 work/release-tools/package-release.py` for release validation/packaging. Website checks are separate.
- The website contains `.openai/hosting.json`; use the applicable Sites skills for website changes or deployment. Merely relocating its files did not authorize deployment.
- Treat implementation, commit, push, deployment and store submission separately. Do not auto-publish historical context, browser screenshots, logs or conversation material.
