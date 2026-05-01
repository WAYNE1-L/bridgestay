# Sublease Calculator UI Fix — Pass C Report

Branch: `fix/sublease-ui-polish` (off `merge/full-integration`)
Date: 2026-04-30
Commits: 3 fix + 1 docs

## What changed (precisely)

### `app/client/src/pages/calculator/SubleasePage.tsx`

- **Lines 58–96** — `NumField` rewritten:
  - `value={Number.isFinite(value) ? value : 0}` → `value={displayValue}` where `displayValue = !Number.isFinite(value) || value === 0 ? "" : value`. Empty string + `placeholder="0"` removes the "0150" prefix bug.
  - Added `inputMode="decimal"` so mobile shows the decimal keypad.
  - `onChange` short-circuits an empty string back to `0` in state instead of relying on `parseFloat("") === NaN`.
  - Input className gets `tabular-nums` appended.
- **Line 185** — `<main className="container pt-32 pb-16 space-y-6">` → `<main className="container pt-32 pb-16 space-y-6 font-sans tabular-nums">`. Cascades the right font family + tabular numerics to every nested element (KPI cards, breakeven tiers, sensitivity chart, cashflow table).

### `app/client/src/index.css`

- **After the existing `input, textarea, select` block** (which already sets `font-family: var(--font-sans)`), added:

  ```css
  input[type="number"],
  .tabular-nums {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
  }
  ```

  Site-wide rule for number-style alignment. Narrow scope: only number inputs and elements that opt in via the Tailwind `tabular-nums` utility.

### `SUBLEASE_UI_FIX_VERIFY.md` (new)

User-facing verification checklist covering all three bugs + smoke test of slider / collapsible / localStorage / golden-path numbers.

## What was NOT changed

- `app/client/src/lib/calculator/sublease.ts` — core math untouched.
- `app/client/src/lib/calculator/sublease.test.ts` — test cases untouched (still 10/10 passing).
- All i18n strings in `LanguageContext.tsx` — untouched.
- `vite.config.ts`, `vitest.config.ts`, `package.json`, `tsconfig.json` — untouched.
- No new Tailwind config file added (main site uses Tailwind v4 inline `@theme` in `index.css`; adding a `tailwind.config.ts` would conflict).
- No new Google Font links added — existing `index.html` already preloads Poppins / Nunito / Noto Sans SC / Playfair.
- All other pages (`/`, `/apartments/*`, `/admin/*`, `/analytics/*`, `/calculator` non-sublease, `/dashboard`, etc.) — untouched.
- No git history rewrite, no force push.

## Verification status

| Check | Status |
|---|---|
| `npm run check` (`tsc --noEmit`) | ✅ **No new TS errors.** Two pre-existing errors in `server/stripe/{checkout,webhook}.ts` (Stripe API-version literal drift — present on both `merge/full-integration` and `main`, not introduced by this branch). |
| `npx vitest run client/src/lib/calculator/sublease.test.ts` | ✅ **10/10 pass** (322ms). Core math contract intact. |
| `npm run build` | ✅ **Green in 4.77s.** Bundle size unchanged (`dist/public/assets/index-*.js` ≈ 1.89 MB, gzip 503 kB — same as `merge/full-integration`). |

## Bug-fix decisions and trade-offs

- **Bug 1**: chose "Option 1" from the spec (display empty string when value is 0, keep state as numeric `0`). Avoids reshaping all of the input state, keeps localStorage v1 compatible, keeps zod schema unchanged. The cost: one tiny readability tax in `NumField` for the empty-string-coerce dance.
- **Bug 2**: did NOT add a `tailwind.config.ts`. Tailwind v4 uses inline `@theme` in `index.css`, and that already exposes `--font-sans` with the right stack. Adding a JS config would re-introduce the v3 build path and confuse the Vite plugin. Instead, scope-applied `font-sans tabular-nums` at the page root + a narrow CSS rule for `input[type="number"]`. Doesn't touch any other page.
- **Bug 3**: audit only — every input on the page funnels through the single `NumField`/`PctField` component using shadcn `<Input>`. Rounded corners, focus ring, padding, and label spacing are already consistent. Nothing to fix without inventing problems.

## PR

After push:

**https://github.com/WAYNE1-L/bridgestay/compare/merge/full-integration...fix/sublease-ui-polish**

Base branch is `merge/full-integration` (not `main`) because the upstream three-repo merge has not landed in `main` yet. When you merge that first, this PR rebases onto `main`.

## Next steps (suggested order)

1. **You**: pull `fix/sublease-ui-polish`, `npm run dev`, walk through `SUBLEASE_UI_FIX_VERIFY.md` in the browser. Probably 5 minutes.
2. If the checklist passes: merge this PR into `merge/full-integration`, then merge `merge/full-integration` into `main` (or do whatever your normal workflow is).
3. Then start **Pass A** (the dual-mode tab + Furnished Finder defaults that were explicitly carved out of this pass).

If anything in the checklist fails, tell me which step. Most likely failures are stale Vite dev-server HMR (kill `npm run dev` and restart) or a pre-existing bug surfaced by the new placeholder behavior (e.g. validation that previously passed because `0` was always present). Both are quick to diagnose.
