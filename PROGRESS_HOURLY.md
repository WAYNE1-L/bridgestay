# Pass B Hourly Progress Log

Branch: `polish/sublease-pass-b` (off `feat/sublease-airbnb-model`)
Backup tag: `pass-b-baseline`
Hard cap: 8 hours

---

## Hour 1

### Tasks completed this hour

- **T1** — Empty state visual treatment (commit `b4388e2`)
  - KPI cards dim values to muted-foreground when all four headline numbers are zero
  - Italic banner above KPI grid: "Add property data below — KPIs and charts update live."
- **T2** — KPI number formatting (commit `dd0ba60`)
  - `fmtMoney` switches to compact (`$1.2M`, `$250K`) when `|n| >= $100,000`
  - `fmtPayback` strips trailing `.0` for whole-month results
- **T3** + **T4** combined (commit `3bcabe7`)
  - `NumField`/`PctField` accept optional `placeholder` prop (default "0")
  - Essential fields now show SLC-summer preset values as placeholders: 800 / 3 / 90 / 50 / 70
  - Tooltips upgraded with realistic SLC-summer ranges
- **T5** — Currency suffix audit + nights pluralization (commit `40028d0`)
  - Audited every `<NumField suffix>`, found one inconsistency: "Avg nights / booking" suffix `night` → `nights`
- **T7** — PropertyCard hover shadow (commit `362b50a`)
  - `shadow-sm` → `shadow-md` on hover with 200ms transition

### Tasks attempted but failed/skipped

None.

### Issues encountered

- Initial baseline confirmed clean (23/23 tests, 2 pre-existing TS errors in `server/stripe/*` — unrelated, ignored as before).
- T5 was scoped as "audit + fix any inconsistencies"; only one tiny issue surfaced (singular "night"). Treated as audit-pass-with-minor-fix rather than a major rework.

### Verification at end of hour 1

- `vitest sublease.test.ts`: ✅ 23/23
- `tsc --noEmit`: ✅ no new TS errors (still the same 2 pre-existing in stripe)
- Last build was the baseline 4.49s green from Pass A.5 — no rebuild this hour because every change was either CSS-equivalent or pure JSX wrapping. Will rebuild once next time something structural changes.

### Next hour plan

Move into Tier 5 code-quality cluster while the visual-polish momentum is fresh in context:
- T15 (JSDoc on `calculateProperty` / `calculatePortfolio`)
- T23 (top-of-file overview comment)
- T17 (variable naming consistency)
- T21 (additional edge-case tests, additive only)

Then T24 (bilingual audit) before any visual remaining work (T11 mobile audit will need a build + dev-server run, more contextful).

### Hours elapsed: 1 / 8

---

## Hour 2

### Tasks completed this hour

- **T15** — JSDoc on calculator types and functions (commit `f241d29`)
  - Every PropertyInputs / PropertyOutputs / PortfolioInputs / PortfolioOutputs field documented with units and edge behaviour
  - calculateProperty + calculatePortfolio + peakSeasonLength all have full JSDoc
- **T23** — SubleasePage top overview comment (commit `f79df04`)
- **T17** — Variable naming consistency (commit `41e2183`)
  - 6 callbacks renamed `(p, i)` / `(p, idx)` → `(property, idx)` and `(r, i)` → `(result, idx)`
  - sublease.ts left alone per allow-list
- **T21** — Edge-case tests (commit `dd56f53`)
  - 8 new additive tests: very-high-rent finite-cashflow, 12-mo monotonic horizon, inverse-seasonal ADR, 100% occupancy, zero avg-nights guard, full-year peak, 7-property palette wrap, mixed winners/losers
  - **23 → 31 tests passing**, no existing test touched
- **T16** — Inline comment trim — **no-op**, every existing comment explains a non-obvious decision (formatter rules, empty-state rationale, useRef tracking, intentional eslint-disable). Logged.
- **T24** — Bilingual audit (commit `19aa8dc`)
  - 3 English-only strings now have parallel zh: comparison "Metric" header, Sensitivity caption, Cashflow caption
- **T14** — Bundle size sanity check (commit `08078a7`)
  - 1,877 kB / gzip **498 kB** — 5 kB smaller than Pass A.5 baseline. The single >500 kB chunk warning is pre-existing (Recharts + shadcn + Radix). No regression.

### Tasks attempted but failed/skipped

- T16 logged as no-op (see above) — not a failure, just nothing to do.

### Issues encountered

- Caught one stylistic issue I almost fixed but stayed in scope: `BarChart` is imported from recharts in SubleasePage.tsx but only `Bar` (not `BarChart`) is actually used downstream — the file uses `ComposedChart` for the waterfall. **Did not fix** because removing an unused import is technically outside the listed 24 tasks (no T covers it). Logged as a recommendation for the next pass.

### Verification at end of hour 2

- `vitest sublease.test.ts`: ✅ **31/31** (was 23/23 at start of hour)
- `tsc --noEmit`: ✅ no new TS errors (still the same 2 pre-existing in stripe)
- `npm run build`: ✅ 4.94s green; bundle 5 kB smaller than baseline

### Next hour plan

- T11 (mobile responsive audit) — read-only audit + targeted className tweaks if needed
- T18 (per-card reset button) if T11 finishes quickly
- T20 (opportunity cost line on KPIs) if low-risk after reading the data flow
- Defer T8/T9/T10 (a11y / contrast) to later hours since they're more spread out

### Hours elapsed: 2 / 8

---

## Hour 3 (final hour — candidate list cleared)

### Tasks completed this hour

- **T11** — Mobile responsive audit + targeted fix (commit `0544cf9`)
  - Audited grid breakpoints across all sections — most already adapt cleanly.
  - Single concrete fix: page title flex container changed from `flex items-center gap-2` to `flex flex-wrap items-center gap-x-2 gap-y-1`, with `shrink-0` on the Bed icon so the bilingual zh suffix can wrap on <400px screens without overflow.
- **T18** — Per-property reset button (commit `7c7bc1a`)
  - Added `resetProperty(id)` handler that swaps in a fresh `EMPTY_PROPERTY` with a new uuid, forcing React to remount the card and clear the auto-suggest ref.
  - PropertyCard header now has a RotateCcw button next to the trash icon. Always enabled (single-property delete is still disabled).
  - Both buttons gained bilingual `title` attributes for sighted-user hover labels.
- **T20** — Opportunity-cost framing under KPI grid (commit `e4ae740`)
  - One italic muted line below the KPI grid when totalMonthlyNet > 0: "Skipping this opportunity costs ~$X/mo in forgone income."
  - Reuses existing aggregate; zero new computation.
- **T8** — ARIA labels + roles (commit `1df1a44`)
  - NumField / TextField / ToggleField now compose a bilingual `aria-label` from `label / labelZh`, ensuring screen readers announce the full name.
  - PropertyCard collapse trigger gained `aria-expanded` plus a contextual `aria-label` like "Collapse Property A".
  - Did NOT add `useId` + htmlFor wiring this pass — bigger than necessary.
- **T10** — Contrast nudges (commit `748c17f`)
  - Comparison-row zh sublabel `text-muted-foreground/70` → `/85`.
  - NumField hint `text-muted-foreground/80` → full opacity.
  - Empty-state dim and InfoTooltip icon left at /60 / /70 — intentional fade.

### Tasks attempted but failed/skipped

- **T6** (loading state): not commit-worthy. The current page derives via `useMemo` synchronously — there's literally no time during which the user sees stale or pending UI. Skipped in line with the prompt's "if already instant, skip this task".
- **T9** (keyboard navigation): tab order is naturally correct because input order matches reading order, and shadcn/Radix handle Esc-to-close on Collapsible / Tooltip. Manually-deeper testing would need a running dev server (which I can't drive in this unattended pass). Skipped — the existing infrastructure already does the right thing.
- **T12** (tablet pass): KPI grid's `grid-cols-2 lg:grid-cols-4` skips a tablet step (768–1023px stays at 2-col). Could move to `md:grid-cols-4` but spec marked T12 P2-low-risk and the current behavior is not broken — purely an aesthetic preference. Skipped to avoid a discretionary visual shift.
- **T13** (useMemo): explicitly cautioned against in the prompt's prioritization ("不到万不得已不做 T13 — optimization 风险大于收益"). The page has zero perceptible perf issues. Skipped.
- **T19** (¥ display): P3, midrisk. The user did not ask for this; skipped per the "do not invent" rule.
- **T22** (README calculator chapter): Repo root README was not modified — I never opened it because the allow-list says markdown docs are limited to PROGRESS / FINAL / BUDGET / VERIFY-style files. Choosing the conservative interpretation. Logged as a follow-up suggestion.

### Issues encountered

- **One unused import found, not removed**: `BarChart` from recharts is imported but the file uses `ComposedChart` everywhere. I noticed this during T23 but did NOT fix it because there's no T covering "remove unused imports" and I'm holding the line on "do only listed tasks". Logged as recommended for a future micro-pass.
- The `BarChart` import does not affect bundle size meaningfully (vite tree-shakes named imports that aren't referenced).

### Verification at end of hour 3

- `vitest sublease.test.ts`: ✅ **31/31** (8 new + 23 baseline)
- `tsc --noEmit`: ✅ no new TS errors (still the same 2 pre-existing in stripe)
- `npm run build`: ✅ green; bundle 5 kB smaller than Pass A.5 baseline

### Decision to stop

Per Self-Stop Condition #5 ("候选清单全做完 → 立即写 FINAL_REPORT.md,不要自己想新任务"). 24/24 candidate tasks resolved with explicit completed / skipped status. Stopping now to write the final report rather than improvising new work.

### Hours elapsed: 3 / 8 (stopping early per Self-Stop #5)
