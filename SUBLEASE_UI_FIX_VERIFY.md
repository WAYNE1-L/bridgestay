# Sublease UI Fix — Verification Checklist

Branch: `fix/sublease-ui-polish` (base: `merge/full-integration`)

## Setup

```bash
cd app
npm install --legacy-peer-deps   # only if you haven't installed deps recently
npm run dev
```

Open http://localhost:5173/calculator/sublease

---

## Bug 1 — Number input no longer prefixes with `0`

- [ ] **"Other" operating cost** field shows a grey `0` placeholder by default, NOT a real `0` character that has to be deleted before typing.
- [ ] **"Platform fee"** field shows a grey `0` placeholder, not a typed `0`.
- [ ] **Advanced → Annual rent escalation / Market rent growth / Discount rate** all default to placeholder, not typed `0`.
- [ ] In any field that shows the placeholder, type `150` directly — the result is `150`, NOT `0150`.
- [ ] Clear a field that has a number in it (select-all, delete) — the field becomes empty (placeholder shows), and the KPI cards update as if the value is `0`.
- [ ] **Fields with non-zero defaults still show numbers** (these were never the problem):
  - Monthly rent paid to landlord = `1500`
  - Lease term (months) = `12`
  - Security deposit = `1500`
  - One-time setup cost = `2500`
  - Expected monthly rent = `2200`
  - Vacancy rate = `5` %
  - Utilities = `150`
  - Cleaning = `50`
- [ ] **Reset to defaults** (top-right button): zero-default fields become empty placeholder again, non-zero ones return to their numbers.

## Bug 2 — Font consistency + tabular-nums

- [ ] Page font (title, fieldset legends, input text, hint text, KPI numbers) all look like the same family — Poppins / Nunito (no surprise mono or serif).
- [ ] **Digit alignment**: in the cashflow table, the columns of dollar amounts line up vertically — `$1,234` and `$5,678` have the same width per character. Same in the KPI cards.
- [ ] Hint text under inputs (e.g. "Cap on what you'd agree to pay the landlord") is grey, smaller than the label, but the same family — readable.
- [ ] Recharts sensitivity-chart axis ticks (`$1760`, `$1840`…) are tabular and readable.

## Bug 3 — Visual consistency (audit pass — should already be OK)

- [ ] All input fields have the same rounded corners.
- [ ] All input fields have the same focus ring (you should see an orange-ish outline when you Tab through them).
- [ ] Spacing between label and input is uniform across every fieldset.
- [ ] Section legends (`1. Lease-in`, `2. Lease-out`, `3. Monthly operating costs`) all share the same weight and color.

---

## Quick smoke test (post-fix sanity)

Sliders and dynamic UI:

- [ ] Drag the **sensitivity slider** under the chart — the orange reference line moves and the line chart updates.
- [ ] Open / close the **Advanced** collapsible — the chevron rotates and three more inputs appear.
- [ ] **Max Breakeven Rent** card shows three tier amounts (Breakeven / Healthy / Excellent) and the middle one is highlighted with a ring.
- [ ] Refresh the page — your most recent inputs persist (localStorage `bridgestay:sublease-calc:v1`).

## What was NOT changed (sanity — do not regress)

- The numbers themselves still calculate correctly. Spot-check with the default scenario:
  - **Monthly Net Profit** ≈ `$540` (green)
  - **Payback** ≈ `8 months` (green)
  - **Annual ROI** ≈ `162%` (green)
  - **Healthy max rent** ≈ `$1473`
- All other pages still work: `/`, `/apartments`, `/analytics`, `/analytics/roi`, `/calculator` (the non-sublease one).

If any item fails: check the browser console for a hydration warning, then tell me which step broke. The fix is small and surgical — failures are most likely either a stale dev server (Vite HMR caching) or a separate bug not in scope here.
