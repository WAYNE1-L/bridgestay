# Pass A — Sublease Calculator: Airbnb Business Model

Branch: `feat/sublease-airbnb-model` (off `merge/full-integration`)
Date: 2026-04-30
Commits in branch: 4

## What changed

### Core lib

- **`app/client/src/lib/calculator/sublease.ts`** — full rewrite (158 → 267 lines).
  - New types: `PropertyInputs`, `PropertyOutputs`, `PortfolioInputs`, `PortfolioOutputs`.
  - `calculateProperty(inputs, horizon?)` — single-unit math (revenue, costs, payback, ROI, cashflow series, break-even month).
  - `calculatePortfolio(inputs)` — aggregates across N properties.
  - **Revenue model**: blended yearly ADR (`(peakAdr × peakLen + offAdr × offLen) / 12`) × 30 × occupancy. ±10% accuracy vs. exact-by-calendar-month, acceptable for v1.
  - **Edge cases handled**: setup=0 → payback=0 ("immediate"); negative cashflow → Infinity payback; tax only on positive profit; cross-year peak season (e.g. Nov–Feb).
  - Exports: `SLC_SUMMER_PRESET` (Wayne's real scenario), `EMPTY_PROPERTY` (defaults for new cards).
  - **Removed**: old `SubleaseInputSchema` (zod), `calculateSublease`, `DEFAULT_SUBLEASE_INPUT`. No fallback / compat layer kept.

### Tests

- **`app/client/src/lib/calculator/sublease.test.ts`** — full rewrite (96 → 259 lines).
  - 23 tests, **all passing** in 5ms.
  - Coverage: SLC preset round-trip, edge cases (empty, bad deal, cross-year peak, utilities-included, cleaning-passed-to-guest, damage hold, loss → 0 tax, custom horizon, break-even null, host fee math, manual lodging tax, setup-cost month-1 deduction), portfolio aggregation, empty portfolio, setup-only-no-revenue portfolio.

### UI

- **`app/client/src/pages/calculator/SubleasePage.tsx`** — full rewrite (529 → 1017 lines, mostly new components).
  - `<SubleaseHeader>`: bilingual title + horizon selector (1/2/3/6/9/12/18/24 mo) + Try-example + Reset-all.
  - `<PortfolioSummary>`: 4 KPI cards (total monthly net, total setup, portfolio payback, horizon total net).
  - `<PortfolioComparison>`: side-by-side metric table — only renders when 2+ properties.
  - `<SensitivityChart>`: occupancy 40-90% sweep, line per property + bold black "Total" line when 2+ properties.
  - `<CashflowWaterfall>`: ComposedChart with monthly bars (green/red) + cumulative line + reference at y=0; setup cost shows up as a M1 dip.
  - `<PropertyCard>`: collapsible card with chevron + always-visible header (nickname + monthly net). Trash-can delete (disabled when only 1 property left). 7 inline sections: Identification, Lease cost, Setup cost, Airbnb revenue, Operating cost, Risk, Platform & tax.
  - Conditional fields: utilities disabled when "included in lease", cleaning disabled when "passed to guest", manual lodging-tax hidden when Airbnb handles it.
  - Inline primitives: `Section`, `FieldHeader`, `NumField`, `PctField`, `TextField`, `ToggleField`, `MonthRangeField`, `InfoTooltip`. NumField preserves all the Pass C work (placeholder for 0, no-spinner, tabular-nums, inputMode decimal).
  - **localStorage key bumped to `sublease-portfolio-v2`** so users with stored v1 long-term arbitrage state don't see crashes.

### Docs

- **`SUBLEASE_PASS_A_VERIFY.md`** (new) — user verification checklist covering basic state, Try-example, multi-property workflow, comparison table, charts, persistence, conditional fields, edge cases, regression on other pages.

## What was NOT changed

- No new npm dependencies (used existing Recharts, shadcn/ui, Tailwind v4, lucide-react).
- No changes to: `App.tsx`, routes, `Navbar`, `LanguageContext`, other pages (`/`, `/apartments/*`, `/admin/*`, `/analytics/*`, `/calculator` non-sublease).
- No changes to `vite.config.ts`, `vitest.config.ts`, `package.json`, `tsconfig.json`.
- No changes to authentication, OAuth, Stripe, Drizzle, server code.
- No changes to `.env*`, `drizzle/migrations/`, `*.sql`, `render.yaml`, `.github/workflows/`.
- i18n framework untouched. New copy is **inline bilingual EN / 中文** per spec — no i18n key extraction.
- Old `sublease-calc:v1` localStorage key from Pass B/C is left alone — users are not auto-migrated; the v2 key is independent.
- No `git push --force`, no history rewrites.

## Verification status

| Check | Status |
|---|---|
| `npx vitest run client/src/lib/calculator/sublease.test.ts` | ✅ **23/23 passing** in 5ms |
| `npm run check` (`tsc --noEmit`) | ✅ **No new TypeScript errors.** Only the 2 pre-existing `server/stripe/{checkout,webhook}.ts` Stripe-API-version-literal errors, present on `merge/full-integration` and `main` before this branch. |
| `npm run build` | ✅ **Green in 4.49s.** Bundle slightly smaller than before (1.87 MB / 497 kB gzip vs. previous 1.89 MB / 503 kB) — old long-term-arbitrage zod schema dropped. |

## Commits in this branch

```
a1df576 docs(sublease): pass A verification checklist
6f31e9a feat(sublease): UI rewrite with multi-property cards, KPI summary, comparison, sensitivity, waterfall
f09f5e1 test(sublease): new test suite covering airbnb model and edge cases
97b4801 feat(sublease): new airbnb business model with PropertyInputs/Outputs and SLC preset
```

## Known limitations (deferred to future passes)

1. **Blended-ADR vs. exact monthly**: revenue uses one yearly-blended ADR for every month. If a user analyzes a 3-month horizon that lands entirely in peak season, this *understates* revenue by roughly 5–15%. Fix is straightforward (add a `horizonStartMonth` input and walk per-month ADR), but adds form complexity. Not in v1 scope.
2. **Damage / deposit hold**: modeled as a flat percentage deduction from effective revenue. In reality this is a fat-tailed risk (rare but expensive incidents). Acceptable simplification — the user can dial the rate based on their own calibration.
3. **Income tax** is computed monthly on positive pretax profit. Real LLC taxation is quarterly / annual with deductions. Difference is small at v1 fidelity; flagged here for transparency.
4. **Deposit refund** at lease end is *not* added back to total period net. The `depositRefundable` flag is captured for future use; right now the math treats the deposit as an opportunity-cost-only line item that nets out (since you neither earn return on it nor lose it). This is fine for v1.
5. **No CSV / PDF export** of the schedule. The page prints OK via the browser, but if users want shareable artifacts, that's a separate pass.
6. **No undo / scenario versioning**. localStorage holds one snapshot; switching scenarios means clobbering existing data. Out of v1 scope.

## PR

After push:

**https://github.com/WAYNE1-L/bridgestay/compare/merge/full-integration...feat/sublease-airbnb-model**

Base is `merge/full-integration` because the upstream three-repo merge has not landed in `main` yet.

## User next steps

1. Pull `feat/sublease-airbnb-model`.
2. `cd app && npm run dev`.
3. Walk through `SUBLEASE_PASS_A_VERIFY.md` in the browser.
4. If everything passes → merge into `merge/full-integration`, then merge that into `main` to trigger Render deploy.
5. Future asks (split into separate passes per the brief): exact-monthly-ADR, CSV/PDF export, scenario versioning.
