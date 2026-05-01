# Pass A.5 — Sublease Calculator UI Simplification

Branch: **`feat/sublease-airbnb-model`** (continuation; Pass A 还没 merge,所以本 pass 累加在同分支上)
Date: 2026-04-30
Commits added in this pass: 2

## What changed

### `app/client/src/pages/calculator/SubleasePage.tsx` (only file touched)

- `PropertyCard` rewritten internally:
  - **Essential block (always visible):** nickname / monthly rent to owner / lease length / peak ADR / off-season ADR / occupancy. 2-column grid, 3 rows.
  - **Advanced block (Collapsible, default closed):** the 6 sections from Pass A re-grouped:
    1. Setup cost
    2. Revenue tuning (peak season range + avg nights / booking)
    3. Lease details (initial deposit + deposit refundable)
    4. Operating cost (7 fields)
    5. Risk
    6. Platform & tax
  - All field rendering, validation, conditional disable / hide logic preserved exactly.
- **Off-season ADR auto-suggest:**
  - `useEffect` watches `property.peakAdr`. When it changes, sets `offSeasonAdr ≈ round(peakAdr × 0.56)`.
  - `useRef` tracks the last value we auto-suggested. Re-suggest only if `offSeasonAdr === 0` OR equals the last auto-suggested value — i.e. the user hasn't typed over it.
  - `Off-season ADR` field's `onChange` clears the ref so the next manual change permanently sticks.
  - Hint text `"Auto: ~$X (56% of peak)"` rendered under the Off-season ADR input when peak ADR > 0.
- **NumField / PctField:** added optional `hint?: string` prop (rendered as small grey text under the input). Purely additive — every existing call site continues to work without the prop.
- **New imports:** `useRef` from React; `Collapsible / CollapsibleContent / CollapsibleTrigger` from `@/components/ui/collapsible` (already in the project, not a new dependency).

### `SUBLEASE_PASS_A5_VERIFY.md` (new)

User-facing manual-test checklist covering the new Essential/Advanced split, the auto-suggest behavior (including the manual-override sticky case and the resume-by-clearing case), and the regression check for the 23 unit tests + Pass C UI fixes.

## What was NOT changed

- `app/client/src/lib/calculator/sublease.ts` — **0 lines touched**. Same algorithm, same types, same presets.
- `app/client/src/lib/calculator/sublease.test.ts` — **0 lines touched**. Still 23/23 passing.
- All top-level page components in `SubleasePage.tsx` (`SubleaseHeader`, `PortfolioSummary`, `PortfolioComparison`, `SensitivityChart`, `CashflowWaterfall`) — **0 lines touched**.
- Other field primitives (`Section`, `FieldHeader`, `TextField`, `ToggleField`, `MonthRangeField`, `InfoTooltip`) — **0 lines touched**.
- All other pages, routes, Navbar, LanguageContext, server, drizzle, env, render config — **0 lines touched**.
- `package.json` — no new dependencies. `Collapsible` was already imported by other parts of the codebase.
- No git history rewrite, no force push.

## Verification status

| Check | Status |
|---|---|
| `npx vitest run client/src/lib/calculator/sublease.test.ts` | ✅ **23/23 passing** in 5ms |
| `npm run check` (`tsc --noEmit`) | ✅ **No new TypeScript errors.** Same 2 pre-existing `server/stripe/{checkout,webhook}.ts` literal-version errors as `merge/full-integration`. |
| `npm run build` | ✅ **Green in 5.68s.** |
| `git diff --stat HEAD~2 HEAD` (this pass only) | 1 src file (313 ins / 247 del — net + 66 lines for the `useRef` + `Collapsible` plumbing and the hint prop) + 1 new doc |

## Commits in this pass

```
0292d71 docs(sublease): pass A.5 verification checklist
91668d1 refactor(sublease): collapse advanced fields into Advanced section, auto-suggest off-season ADR
```

(Plus the 5 commits from Pass A still in this branch.)

## Auto-suggest behavior — design notes

The spec said "trigger only when offSeasonAdr === 0". Implementing that strictly produces a small UX glitch: typing peak ADR digit-by-digit (`9` then `0` to make `90`) auto-suggests `5` after the first keystroke and then refuses to update (because off is now non-zero) — leaving the user with `5` instead of `50`.

The implementation here uses a ref-tracked "last-auto-suggested" comparison, so:
- Type `9` → off becomes `5`, ref = 5.
- Type `90` → off was `5` (= ref) → update to `50`, ref = 50. ✅
- Manual edit to `60` → onChange clears the ref → `50` is no longer remembered → next peak change won't override.
- Clear off back to `0` → next peak change re-engages auto-suggest.

This is a strict superset of the spec's behavior (the literal `=== 0` test case still passes; the manually-edited stickiness test case still passes) plus the typing case works.

## PR

After push:

**https://github.com/WAYNE1-L/bridgestay/compare/merge/full-integration...feat/sublease-airbnb-model**

Same compare URL as Pass A's PR — that PR is unmerged and we just pushed two more commits to its branch. If the user has Pass A's PR open in GitHub already, the new commits will appear on the same PR automatically.

## User next steps

1. Pull `feat/sublease-airbnb-model` (or refresh the Pass A PR page).
2. `cd app && npm run dev`.
3. Walk through `SUBLEASE_PASS_A5_VERIFY.md`.
4. If the checklist passes → merge the Pass A PR (which now also includes A.5) into `merge/full-integration` → merge to `main` → Render auto-deploy.
