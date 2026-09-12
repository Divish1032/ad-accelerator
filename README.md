# Ad Accelerator

Free Chrome extension for filtering listed ad/tracker destinations, reducing unwanted popups and shortening detected video ads. Current audited development baseline: **0.11.3**.

**Start with [START-HERE.md](START-HERE.md).** It contains the current decisions, research status and remaining installed-browser qualification gates. The audit passed 218 automated tests; it does not certify universal safety or compatibility.

| Directory | Purpose |
| --- | --- |
| `outputs/prime-ad-accelerator/` | Canonical extension source and tests; load this directory as unpacked in Chrome. |
| `outputs/ad-accelerator-site/` | Website source, lockfile, hosting metadata and its existing Git history. |
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

This project was copied from the original Codex workspace on September 6, 2026. Existing paths inside `outputs/` and `work/` were preserved to keep release tools and relative evidence links working. See [migration record](context/MIGRATION.md). This root is not yet a Git repository; only the website carries its prior Git repository. No commit, remote repository or push was created.
