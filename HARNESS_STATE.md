# Harness State

Tracks unattended autonomous rounds against this repo. Each round runs on its own branch off a tagged baseline so the user can roll back any single round in one command.

| # | Round | Branch | Baseline tag | Status | Final report |
|---|---|---|---|---|---|
| 1 | Lehi Realtor.com scraper MVP | `feat/lehi-scraper-r1` | `harness-r1-baseline` | complete (Phase 7 of 8) | `archive/R1_FINAL_REPORT.md` (post-R2 archive) |
| 2 | Sublet platform pivot | `feat/sublet-platform-r2` | `harness-r2-baseline` | **complete (Phase 0–6)** | `FINAL_REPORT.md` (this round) |

---

## Round 1 — Lehi Realtor.com scraper MVP

- **Goal**: Standalone tool in `tools/lehi-scraper/` that scrapes Realtor.com 84043 daily, persists to SQLite, exposes a viewer with filter / chart UI.
- **Constraint**: Zero changes to BridgeStay main app.
- **Time budget**: 8 h hard cap.
- **Anti-bot policy**: Throttle ≥ 3s, max 1 full scrape/day, single ZIP scope.
- **Rollback**: `git reset --hard harness-r1-baseline`.
- **Outcome**: Tool is functional via mock path; live scrape was not attempted in unattended mode per policy.

## Round 2 — Sublet platform pivot

- **Goal**: BridgeStay narrative + UX pivot from international-student rental to **SLC student sublet matching** (Furnished Finder–style). Top-3 P0 tasks executed: (a) backend filter extension, (b) `/sublets` browse page with mock fallback, (c) HomePage narrative pivot.
- **Constraint**: Existing apartments table schema, calculator, OAuth, Stripe untouched.
- **Time budget**: 8 h hard cap.
- **Outcome**: 70% MVP. User can land on `/`, see sublet ribbon, click `/sublets`, filter 12 mock listings keyed to UofU. R3 closes the loop with detail page + post form + photos.
- **Rollback**: `git reset --hard harness-r2-baseline`.
- **R3 seed**: `NEXT_PROMPT.md` (this round).
