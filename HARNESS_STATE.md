# Harness State

Tracks unattended autonomous rounds against this repo. Each round runs on its own branch off a tagged baseline so the user can roll back any single round in one command.

| # | Round | Branch | Baseline tag | Status | Final report |
|---|---|---|---|---|---|
| 1 | Lehi Realtor.com scraper MVP | `feat/lehi-scraper-r1` | `harness-r1-baseline` | **complete (Phase 7 of 8)** | `FINAL_REPORT.md` |

---

## Round 1 — Lehi Realtor.com scraper MVP

- **Goal**: Standalone tool in `tools/lehi-scraper/` that scrapes Realtor.com 84043 daily, persists to SQLite, exposes a viewer with filter / chart UI.
- **Constraint**: Zero changes to BridgeStay main app.
- **Time budget**: 8 h hard cap. Frequent commits + push.
- **Anti-bot policy**: Throttle ≥ 3s, max 1 full scrape/day, single ZIP scope. On 403 / captcha → mock fallback, do not bypass.
- **Rollback**: `git reset --hard harness-r1-baseline` (tag is on origin).
