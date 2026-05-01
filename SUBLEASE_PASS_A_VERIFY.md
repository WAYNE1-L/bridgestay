# Pass A 验证清单 — Sublease Calculator (Airbnb Business Model)

Branch: `feat/sublease-airbnb-model` (base: `merge/full-integration`)

```bash
cd app
npm install --legacy-peer-deps    # only if you haven't recently
npm run dev
# open http://localhost:5173/calculator/sublease
```

---

## Basic state

- [ ] Default page shows **1 empty property card**, all number inputs render placeholder `0` (grey, not a typed `0` you have to delete first).
- [ ] Top of page: **4 KPI cards** all reading `$0` (because nothing is filled in).
- [ ] No old "monthly rent income" / 长租 fields. New revenue section uses **Peak ADR** + **Off-season ADR** + **Occupancy** + **Avg nights / booking**.
- [ ] Page has 7 numbered sections per card: Identification, Lease cost, Setup cost, Airbnb revenue, Operating cost, Risk, Platform & tax.

## Try example button

Click **"Try example / 示例数据"** in the header.

- [ ] Property #1 is auto-filled with SLC summer data:
  - Monthly rent to owner: `800`
  - Lease length: `3` mo
  - Peak ADR: `90`, Off-season ADR: `50`
  - Peak season: `May → Sep`
  - Occupancy: `70%`, Avg nights: `2`
  - Cleaning per turnover: `30`, Cleaning passed to guest: ✅
  - Utilities included in lease: ✅
  - STR insurance: `20`, Maintenance reserve: `30`
  - Income tax: `22%`, Lodging tax handled by Airbnb: ✅
- [ ] **Top KPIs update immediately**:
  - Total monthly net: roughly **$800–$1,100** (after rent, fees, tax)
  - Total setup cost: `$0`
  - Portfolio payback: `Immediate`
  - 3-mo total net: roughly **$2,400–$3,300**

## Multi-property workflow

- [ ] Click **"+ Add property / 添加房源"** at the bottom — second card appears, empty.
- [ ] Click **"Try example"** in the header — it replaces **the first card only**, doesn't auto-add.
- [ ] Collapse the first card (click the chevron or the title row) — only nickname + monthly-net summary remains visible.
- [ ] Click the trash-can icon on card #2 — card removes.
- [ ] When only 1 card remains, the trash-can icon turns into a faded `×` (delete is disabled — you always have at least one card).

## Comparison table (2+ properties only)

- [ ] With only 1 property, the **Property comparison** section does NOT render.
- [ ] Add a second property and click "Try example" again to populate it (or fill manually) — comparison table appears with rows for: Monthly net, Monthly revenue, Operating cost, Setup cost, Payback, Annual ROI, Total period net.
- [ ] Numbers in the table are right-aligned and digit-aligned (tabular).

## Sensitivity chart

- [ ] Line chart appears, X-axis 40%-90% in 5% steps, Y-axis dollars.
- [ ] One colored line per property (using its nickname or `Property N` if blank).
- [ ] When 2+ properties exist, an **extra bold black "Total" line** is added on top.
- [ ] Reference line at `y=0`.
- [ ] Tooltips on hover show `Occupancy: NN%` + per-property net.

## Cashflow waterfall

- [ ] Bar+line chart appears. X-axis = `M1, M2, ..., M{horizon}`.
- [ ] Bars are green when positive, red when negative.
- [ ] Blue line shows cumulative cashflow.
- [ ] Dashed reference line at `y=0`.
- [ ] When you set a property's setup cost (e.g. `1000` furniture) → M1 bar dips, the cumulative line starts negative, recovers as months pass.

## Persistence

- [ ] Fill some data, **refresh the page** — data is still there (localStorage key `sublease-portfolio-v2`).
- [ ] Click **"Reset all / 清空"** in header — back to a single empty property.

## Conditional / interactive fields

- [ ] **Utilities included in lease** ON → utilities input is disabled and operating cost drops.
- [ ] **Cleaning passed to guest** ON → cleaning-per-turnover input is disabled and operating cost drops.
- [ ] **Lodging tax handled by Airbnb** ON → manual lodging-tax field is hidden. OFF → it appears.
- [ ] **Peak season** dropdowns: try `Nov → Feb` (cross-year ski-rental case) — math still works (revenue reflects 4 peak months, 8 off months).

## Edge cases

- [ ] Setup cost = 0, monthly net > 0 → Payback shows **"Immediate"** (not `0.0 mo`).
- [ ] Bad deal (e.g. monthly rent `5000`, peak ADR `30`, occupancy `30%`) → Payback shows **"∞"**, monthly net is red.
- [ ] No stepper arrows on any number input (Pass C / micro fix preserved).
- [ ] Tabular alignment intact across KPI cards, comparison table, charts (Pass C font work preserved).

## Sanity / regression on other pages

- [ ] `/` still works (BridgeStay home).
- [ ] `/analytics`, `/analytics/roi`, `/analytics/dashboard`, `/analytics/reports` still work.
- [ ] `/calculator` (the non-sublease purchase calculator) still works and is unchanged.

---

If any item fails, screenshot the chart / form area + the browser console (F12). The lib math has 23 unit tests passing — failures are most likely in the UI wiring (state update missing a field, conditional disable not working, etc.).
