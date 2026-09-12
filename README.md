# Ad Accelerator

Free Chrome extension for filtering listed ad/tracker destinations, reducing unwanted popups and shortening detected video ads. Current development release candidate: **0.16.2**.

**Start with [START-HERE.md](START-HERE.md).** It contains the current decisions, research status and remaining installed-browser qualification gates. The current source passes 261 automated tests; fixture success does not certify universal safety, compatibility, or installed-browser behavior.

| Directory | Purpose |
| --- | --- |
| `outputs/prime-ad-accelerator/` | Canonical extension source and tests; load this directory as unpacked in Chrome. |
| `outputs/ad-accelerator-site/` | Website source, lockfile, hosting metadata and its separate Git history. |
| `outputs/global-streaming-research-2026-09-06/` | 499-entry discovery catalog, sources and qualification notes. |
| `outputs/baseline-audit-0.11.3/` | Findings, regression evidence, source hashes and installed-browser checklist. |
| `outputs/chrome-store/` | Existing store preparation materials; older than the audit. |
| `outputs/*.zip` | Historical and current release artifacts. |
| `work/` | Build/research tools, verification records, fixtures and chronological checkpoint. |
| `context/` | Project memory index, historical memory snapshots, migration record and supplied evidence. |

From this folder:

```sh
node --test outputs/prime-ad-accelerator/tests/*.test.cjs
python3 work/release-tools/package-release.py
```

The packaging script needs Python Pillow and Node. Website dependencies were not copied; its lockfile is preserved for installation when website work resumes. No deployment was performed during migration.

This project was copied from the original Codex workspace on September 6, 2026. Existing paths inside `outputs/` and `work/` were preserved to keep release tools and relative evidence links working. See [migration record](context/MIGRATION.md). The root repository was initialized and pushed on September 12, 2026. The website remains a separate repository; private context/work evidence and release ZIPs are intentionally excluded from the root repository.
