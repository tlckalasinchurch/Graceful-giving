# docs/archive — stale root reports

Historical audit / verification / worklog reports that used to pile up at the
repo root. Moved here in Phase 9 of the code-quality fix
(`fix/code-quality-p1-p2`) so the root keeps only live documentation
(`README.md`, `CLAUDE.md`, `DESIGN.md`, `AGENTS.md`).

Nothing in code, tests, scripts, the README, or `docs/` references these
files by name — they are kept for history only, not as live documentation.
`git log --follow` on any file still shows its full history from the root.

Also removed in the same change (build artefacts, not source):
- `Graceful-giving-fixed.zip` (3.8 MB)
- `Graceful-giving-financial-hardening.patch` (20 KB)

## Archived files

- `AI-HANDOFF.md` — session-state / owner working-agreement snapshot
- `FIGMA_DESIGN_SYSTEM_RULES.md` — Figma design-system rules, audit date 2026-09-16
  (judgment call: unreferenced from anywhere in the repo; if it is ever
  treated as live design documentation again, move it back to the root)
- `FINAL_ENGINEERING_VERIFICATION.md`
- `FRONTEND_COMPLETION_TRACKER.md`
- `FRONTEND_ENGINEERING_REPORT.md`
- `FRONTEND_SYSTEM_MAP.md`
- `FRONTEND_UX_RESEARCH.md`
- `GRACE_FINAL_RELEASE_GATE.md`
- `GRACE_WORKLOG.md`
- `PRODUCTION_ENGINEERING_AUDIT.md`
- `RELEASE_DOUBLE_CHECK.md`
- `RELEASE_READINESS_REPORT.md`
- `TASKS.md`
- `UX_AUDIT_REPORT.md`
- `UX_FINAL_VERIFICATION.md`
- `UX_FINDINGS.md`
- `UX_IMPROVEMENT_ROADMAP.md`
- `UX_UAT_REPORT.md`
- `WCAG_22_AUDIT.md`
