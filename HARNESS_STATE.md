# Harness State

Tracks unattended autonomous rounds against this repo. Each round runs on its own branch off a tagged baseline so the user can roll back any single round in one command.

| # | Round | Branch | Baseline tag | Status | Final report |
|---|---|---|---|---|---|
| 1 | Lehi Realtor.com scraper MVP | `feat/lehi-scraper-r1` | `harness-r1-baseline` | complete (Phase 7 of 8) | `archive/R1_FINAL_REPORT.md` (post-R2 archive) |
| 2 | Sublet platform pivot | `feat/sublet-platform-r2` | `harness-r2-baseline` | **complete (Phase 0–6)** | `FINAL_REPORT.md` |
| 3 | Close the sublet listing loop | `feat/sublet-platform-r2` (stacked) | `harness-r2-baseline` (reused; rollback to `1591b2e` for pre-R3) | **complete (3 P0 tasks)** | `PASS_R3_REPORT.md` (this round) |

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
- **R3 seed**: `NEXT_PROMPT.md` (R2 round).

## Round 3 — Close the sublet listing loop

- **Goal**: Three P0 surfaces queued by `NEXT_PROMPT.md`: (a) sublet detail page at `/sublets/:id` with mock lookup + 404 fallback, (b) photo gallery on cards (single hero) and detail page (4-image carousel), (c) post-a-sublet form at `/sublets/post`.
- **Constraint**: Same forbidden list as R2 (calculator + stripe locked); R2's `SubletsPage.tsx` and `subletMockData.ts` shape preserved unchanged.
- **Time**: ~35 min wall-clock (directed run via `/autopilot` then `/team 2:executor`, not the 8h autonomous template).
- **Outcome**: ~80% MVP. User can land on `/`, click a card → see photos + full detail → hit `Post a sublet` → fill the form. **Honest scope cuts**: photos are Picsum seeded by id, post form is `console.log` + redirect (no backend write), no contact-host CTA.
- **Verification gate**: 0 new TypeScript errors, 0 new test failures (the 2 pre-existing Stripe `apiVersion` errors and 2 pre-existing Gemini env-var test failures were explicitly out of scope).
- **Rollback to pre-R3 (keep R2)**: `git reset --hard 1591b2e` then force-push.
- **R4 seed**: top three R4 candidates (persist post form, real photo upload, contact-host CTA) ranked in `PASS_R3_REPORT.md` § 6.
