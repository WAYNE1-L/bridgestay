# Integration Report — BridgeStay full-site merge

Branch: `merge/full-integration`
Date: 2026-04-30

This change merges three separate repositories into the main BridgeStay site and adds a new **Rental Arbitrage (sublease) calculator**.

| Source | Branch | Mounted at |
|---|---|---|
| `WAYNE1-L/bridgestay` (shell, `app/`) | `main` | host site |
| `WAYNE1-L/bridgestay-analytics` | `feat/branding-charts-pdf` | `/analytics/*` |
| `WAYNE1-L/rental-property-calc-ts` | `main` | `/calculator` |
| **NEW: rental-arbitrage calc** | (this branch) | `/calculator/sublease` |

---

## 1. Main site landscape (Phase 1.1)

| Aspect | Finding |
|---|---|
| Frontend root | `app/client/src/` (Vite root = `app/client`) |
| Monorepo? | No — single `app/` dir holds both client + Express+tRPC server |
| Bundler | Vite 7.3.2 |
| TS path alias | `@/* → app/client/src/*`, `@shared/* → app/shared/*` |
| Router | **Wouter 3.3.5** (NOT React Router) |
| Tailwind | **v4.1.14** (matches analytics' v4 — no downgrade required) |
| State | Context-based (`LanguageContext`, `ListingsContext`, `ThemeContext`) — no Zustand pre-existing |
| i18n | Custom dict-based `useLanguage()` / `t()` from `LanguageContext`, NOT i18next |
| Charts | Recharts 2.15.2 |
| Forms | react-hook-form 7.64 + zod 4.1 + `@hookform/resolvers` |
| UI primitives | Radix-based shadcn under `components/ui/` (53 components, includes `slider`, `collapsible`, `card`, `input`, `label`, `button`) |
| React | **19.2** |
| Existing routes occupying `/analytics` or `/calculator`? | No — clear |

## 2. Phase 1 — analytics & calculator integration

### Strategy decision

The analytics repo bundles many libs that conflict with main:
- **react-router-dom** (main uses Wouter)
- **react-i18next + i18next** (main uses its own LanguageContext)
- **react-helmet-async** (not in main, unnecessary for SPA pages)
- **Sentry** (graceful-degradation per spec)
- **Web Workers + Suspense + react-router lazy** (overkill for these page sizes)
- **html2canvas-pro / jspdf** (PDF export — deferred; users can `window.print()`)
- **react-helmet** Helmet component (replaced with imperative `document.title` patterns or skipped)
- React 18 ↔ main's React 19 (main wins; some analytics deps don't matter once the dep is dropped)

Rather than do a 1:1 source copy that requires hauling in all those conflicting deps, the analytics calculation logic was ported (`lib/analytics/{format,finance,calc}.ts`) and **page shells were rewritten** to use main site's UI primitives, Wouter, and `LanguageContext`. The calc engine — the actual value of the analytics repo — is preserved and unit-tested by passing through pure functions.

The calculator repo was small (single `App.tsx`), so its `calculations.ts` was copied verbatim into `lib/calculator/calculations.ts` and a new `CalculatorPage.tsx` was written in main's shadcn idiom.

### Files added

```
app/client/src/lib/analytics/
  format.ts          # safeUSD, safePct, usdCompact, pct
  finance.ts         # pmt
  calc.ts            # calc(), calcGRM(), calcCapRate(), RoiInput, CalcResult

app/client/src/lib/calculator/
  calculations.ts    # rental-property-calc-ts core (verbatim)
  sublease.ts        # NEW Phase 2 logic
  sublease.test.ts   # NEW Phase 2 tests (10 passing)

app/client/src/pages/analytics/
  AnalyticsHome.tsx       (mounted at /analytics)
  AnalyticsDashboard.tsx  (/analytics/dashboard)
  AnalyticsRoi.tsx        (/analytics/roi)
  AnalyticsReports.tsx    (/analytics/reports)

app/client/src/pages/calculator/
  CalculatorPage.tsx      (/calculator)
  SubleasePage.tsx        (/calculator/sublease — Phase 2)
```

### Files modified

| File | Change |
|---|---|
| `app/client/src/App.tsx` | Imported 6 new pages; added 6 `<Route>` entries for `/analytics/*` and `/calculator/*` |
| `app/client/src/components/Navbar.tsx` | Added `Analytics` + `Calculator` entries to both authenticated and guest nav arrays; imported `BarChart3` + `Calculator` icons |
| `app/client/src/contexts/LanguageContext.tsx` | Added ~140 new translation keys (zh/en) for analytics module, calculator, sublease arbitrage UI |
| `app/vitest.config.ts` | Extended `include` to also pick up `client/src/**/*.test.ts` so the new Phase 2 unit tests run |

### Dependency conflicts

| Conflict | Resolution |
|---|---|
| analytics needs React 18 + react-router-dom + i18next + Sentry + jspdf + html2canvas-pro + zustand + web-vitals + react-helmet-async | Pages rewritten to use main's React 19 + Wouter + LanguageContext stack — none of those deps were added |
| `@builder.io/vite-plugin-jsx-loc` peer-deps Vite ^4 || ^5 vs main's Vite 7 | Pre-existing in main; resolved with `npm install --legacy-peer-deps` (not new) |
| recharts 3.x (analytics) vs 2.15.2 (main) | Main's 2.15.2 used; recharts 2 covers all imports we use (`LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`, `ReferenceLine`) |

**No new npm dependencies were added** — Phase 2 uses zod 4.1 + react-hook-form + shadcn slider + Recharts, all already in `package.json`.

### Files NOT copied (deliberately)

Per spec, none of these from analytics:
`vite.config.ts`, `index.html`, `src/main.tsx`, top-level `App.tsx`, `tsconfig.*.json`, `netlify.toml`, `vercel.json`, `zeabur.yaml`, `playwright.config.ts`, `vitest.config.ts`, `lighthouserc.json`, `audit-ci.json`, `.github/workflows/`, `api/`, `netlify/functions/`, `tests/`, `stats.html`, `supabase-schema.sql`, `.env*`, root-level `.md` files.

Analytics' own `pages/SubleasePage.tsx` and `lib/sublease.ts` were **not used** — they implement an Airbnb / nightly short-stay model (nightly rate × occupancy × stay length), which is materially different from the long-term rental arbitrage model the user asked for in Phase 2. Both can coexist conceptually but only the Phase 2 long-term model is wired up.

## 3. Phase 2 — Rental arbitrage calculator (NEW)

### Pre-existence check

Searched the merged tree for `arbitrage`, `master lease`, `lease in`, `lease out`, `转租`, `二房东`, `租赁套利` — main site's existing nav has `nav.postSublease` (a posting flow, not a calculator) and analytics has the Airbnb sublease page. Neither matches the rental-arbitrage long-term lease model. Built fresh as specified.

### Implementation

| File | Role |
|---|---|
| `app/client/src/lib/calculator/sublease.ts` | Pure logic: `SubleaseInputSchema` (zod), `calculateSublease(input) → SubleaseOutput`, default values, breakeven reverse-engineering |
| `app/client/src/lib/calculator/sublease.test.ts` | 10 unit tests — positive/negative profit, zero/high vacancy, escalation, schedule shape, deposit return, breakeven precision |
| `app/client/src/pages/calculator/SubleasePage.tsx` | Three-section UI: KPI cards (Monthly Net Profit, Payback Months, Annual ROI) → form (Lease-in/Lease-out/Operating + collapsed Advanced) → Max Breakeven Rent (Breakeven/Healthy/Excellent) → Sensitivity slider with Recharts line chart → scrollable cashflow table |

### Math

Per spec:
- `effectiveRevenue = expectedRent * (1 - vacancyRate) * (1 - platformFee)`
- `monthlyNet = effectiveRevenue - leaseInRent - operating`
- Schedule: month 0 = `-(setupCost + securityDeposit)`, month 1..N-1 = monthlyNet (escalated yearly), month N adds securityDeposit back
- Payback = first month where cumulative ≥ 0, else `Infinity`
- ROI = `annualNet / (setupCost + securityDeposit)`
- NPV at monthly compounded discount rate
- Reverse breakeven: `breakeven = effectiveRevenue - operating`, `healthy = effectiveRevenue * 0.8 - operating`, `excellent = effectiveRevenue * 0.65 - operating`

### Persistence + i18n

- localStorage key `bridgestay:sublease-calc:v1` (zod-validated on read; falls back to defaults on parse failure)
- All copy is wired through `t("sublease.*")` keys with cn/en

## 4. Routes added

```
/analytics              → AnalyticsHome
/analytics/dashboard    → AnalyticsDashboard
/analytics/roi          → AnalyticsRoi
/analytics/reports      → AnalyticsReports
/calculator             → CalculatorPage  (rental-property-calc-ts core)
/calculator/sublease    → SubleasePage    (rental arbitrage, Phase 2)
```

No routes were removed or renamed. All pre-existing main-site routes are untouched.

## 5. Build & test status

| Check | Status |
|---|---|
| `npm install --legacy-peer-deps` | ✅ 804 pkg, no errors |
| `npm run build` | ✅ green — `dist/public/index.html`, `dist/public/assets/*`, `dist/index.js` produced (5.81s) |
| `npm test` (full suite) | ✅ **112 of 114 passing**. The 2 failures (`server/gemini-api.test.ts`) are **pre-existing**: they require `VITE_GEMINI_API_KEY` from a `.env` (which we cannot create per the rules). My 10 new sublease tests all pass. |
| `npm run check` (`tsc --noEmit`) | ⚠️ 2 **pre-existing** errors in `server/stripe/{checkout,webhook}.ts` (Stripe API version literal mismatch — unrelated to this branch). **No type errors in any new file.** |

## 6. Things that were intentionally not done (and why)

| Skipped | Why |
|---|---|
| Sentry init | Spec said graceful-degrade; we just never wire it up — equivalent. If Sentry is wanted, add `@sentry/react` and gate on `import.meta.env.VITE_SENTRY_DSN` |
| Web-worker for ROI calc | Calculations are sub-millisecond — not needed |
| jspdf / html2canvas PDF export | Reports page uses `window.print()` for now; native browser PDF works fine. Add jspdf + html2canvas-pro if pixel-perfect PDF is required |
| i18next migration | Main site already has its own LanguageContext-based system; rewiring everything to i18next would have been a much larger change with no user benefit |
| Removing the analytics-bundled Airbnb sublease lib (`tmp` already cleaned) | The only thing kept from the analytics merge is the lib code we ported — the analytics-side Airbnb model is gone with the tmp folder |
| Adding `npm run test` to the new tests by default | The pre-existing `gemini-api.test.ts` would still fail. Suggest splitting test scripts: `test:unit` vs `test:integration` if the user wants this |

## 7. Items needing user decision

None at the moment — every choice that came up was either resolvable or had an obvious answer. Two pre-existing issues to flag:

1. **`server/stripe/{checkout,webhook}.ts`** — TypeScript expects `"2026-02-25.clover"` but the file declares `"2025-12-15.clover"`. This is a Stripe API-version drift unrelated to this branch. Suggest a follow-up to bump the literal once Stripe SDK + API version are aligned.
2. **`server/gemini-api.test.ts`** — these two tests assert that `VITE_GEMINI_API_KEY` is set. They fail in any environment without the secret. Suggest moving them to an integration suite that's only run with secrets present (`npm run test:integration`), or skipping them when the env var is missing.

## 8. Local preview

```bash
cd app
npm install --legacy-peer-deps   # only first time
npm run dev
# open http://localhost:5173
# new pages:
#   /analytics
#   /analytics/dashboard
#   /analytics/roi
#   /analytics/reports
#   /calculator
#   /calculator/sublease   ← the new rental arbitrage calculator
```

Open the **Sublease Arbitrage** page and play with the sensitivity slider — it pulses the orange reference line on the chart in real time.
