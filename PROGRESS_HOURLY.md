# R2 Hourly Progress — Sublet Platform Pivot

Branch: `feat/sublet-platform-r2`
Backup tag: `harness-r2-baseline` (rollback: `git reset --hard harness-r2-baseline`)
Hard cap: 8 hours
Round goal: BridgeStay 转向 sublet 撮合,做产品级核心功能(self-iterating)

---

## Hour 1 — Phase 0 + 0.5 (setup + assumption audit)

### Pre-flight: Assumption audit

I'm being asked to pivot the BridgeStay narrative from "international student home buying" to "international student sublet matching" and execute the top 3 product moves toward that. Before any code, I'm writing down my assumptions about user intent so I can attack the riskiest ones.

#### Assumption inventory

1. **Audience-side**: BridgeStay is a *matching platform* (Wayne ≠ user), not an "I'm subletting my apartment" listing form for Wayne himself. He is the operator, not a tenant.
2. **School scope**: UofU is the focal point in R2; schema must allow Westminster / SLC CC / future schools to slot in without schema migration.
3. **Geography**: 5 SLC sub-areas (U District / Sugar House / Downtown / Federal Heights / Foothill) are the v1 polygon set. Other areas can exist but won't appear as a default filter pill.
4. **Data sourcing**: R2 is mostly demo / mock; real Craigslist + Reddit + manual entry come in R3+. Mock listings get the global red banner per the project memory rule.
5. **Tech stack**: Postgres + Drizzle (main app DB). The R1 SQLite+SQLite+sqlite tooling stays cold; do NOT shoehorn it into the BridgeStay main app.
6. **Calculator left alone**: SubleasePage and the 31 tests are frozen. Sublet listings are a separate feature from the calculator's "sublease" arbitrage portfolio.
7. **No commercialization**: No Stripe, no commission, no subscription tier in R2.
8. **Auth**: Existing OAuth flow stays untouched. New Sublet listings can be public-readable; only "create listing" might need auth (defer to R3).
9. **i18n**: Inline `English / 中文` bilingual labels — no new framework.
10. **Visual language**: shadcn + Tailwind v4 + lucide-react + Recharts. Extending the existing palette, not reinventing.
11. **Backend route**: Add tRPC procedures (the project already uses tRPC) rather than raw Express endpoints, for consistency with existing main-app fetch patterns.
12. **PROJECT_MEMORY_v3 / harness-protocol**: Were referenced in the prompt but **do not exist** in the repo. I will treat the prompt itself as the source of truth and document this gap in the audit.

#### Three riskiest assumptions (challenged)

##### A. "Wayne is the operator, users are tenants/landlords"

**Risk**: If Wayne actually wants to be the *first* listing user himself (he leaves SLC for summer, lists his own place), then a buyer-only listing browsing UI without a "Post a sublet" form is half a product. The user mandate said "撮合" (matching) which suggests two-sided, not one-sided.

**Decision**: I'll build the **listings browse + filter UI** (the harder, more user-impacting half) in R2 and stub the "Post a sublet" path with a CTA → `/post-sublet` route that says "Coming in R3". This way the schema, the listings, and the public face all exist; the create flow is one form behind a route. Critic: post-listing form is genuinely ~3-4h and would crowd out the listings UX, so deferring is the right call. Risk if wrong: ~10% of round work might need restructuring if Wayne wants Post-flow-first.

##### B. "Mock data is acceptable in R2"

**Risk**: If Wayne returns and sees a sublet UI populated with `123 Fake St`, he might question the round's value. But scraping live Craigslist + cleaning Reddit + handling FB Marketplace cookies is realistically 6-8h of fragile work, eating most of R2.

**Decision**: Use **plausible, hand-curated mock listings keyed to actual UofU-area cross-streets** (e.g. "180 S 1300 E", "University Vista Apartments") with the global red **DEMO DATA** banner clearly visible. Schema will be production-shape so R3 can drop in real data without migration. Source field will record `manual_demo` so they're trivially deletable. Risk if wrong: low — banner + DB tag makes this safe.

##### C. "Sublet listings live on `/sublets` route, separate from existing ListingsPage"

**Risk**: The existing `app/client/src/pages/Apartments.tsx` may already be the right home for sublets, in which case I'd be duplicating routing. Conversely, if the existing listings page is for-sale-oriented, separating sublets is correct.

**Decision**: I'll audit `Apartments.tsx` in Phase 1 and decide concretely. **Default plan**: new `/sublets` route, leaving `/apartments` alone. Renaming/repurposing existing pages is out of scope per the prompt's "extend, don't break" rule. Risk if wrong: minor — adding a route doesn't break anything.

#### Other assumptions left unchallenged

Numbered 4 (mock + real coexist), 5 (Postgres not SQLite), 7 (no commercialization), 9 (inline bilingual), 10 (visual language) — these are explicit prompt locks, not my interpretation. No risk in following them.

Numbered 11 (tRPC over Express): I'll verify by reading the existing server in Phase 1, but the project already uses tRPC throughout, so consistency wins.

#### Verdict

**No assumption was severe enough to require `WAITING_FOR_USER.md`.** Decision A (one-sided UI in R2) is a defensible scope cut documented in the report. Proceeding to Phase 1 audit.

---

## Hour 2 — Phase 1 audit & gap analysis

### Repository audit (key finds)

The repo is **far more developed** than the prompt's "audit BridgeStay current state" implies. Concrete inventory:

**Schema** (`app/drizzle/schema.ts`):
- `apartments` table already has **sublease-specific fields**: `isSublease`, `subleaseEndDate`, `wechatContact` (added in a previous "Phase 3" of the original buildout)
- Full ecosystem: `users`, `studentProfiles`, `landlordProfiles`, `applications`, `documents`, `payments`, `messages`, `universities`, `notifications`, `promotions`, `listingReports`, `savedApartments`
- Enums for `propertyType`, `apartmentStatus`, `outreachStatus` etc. all exist
- **Implication**: I am not building a sublet platform from scratch. I'm pivoting the *narrative + UX surface* of an apartment-rental platform whose schema already supports sublets. This is a 3-5× smaller scope than the prompt assumed.

**Backend** (`app/server/`):
- tRPC router with `apartments.list`, `apartments.getById`, `apartments.report`, admin variants
- `apartmentFiltersSchema` accepts `city`, `state`, `minPrice`, `maxPrice`, `bedrooms`, `bathrooms`, `propertyType`, `petsAllowed`, `parkingIncluded`, `nearUniversity`. **Critically: no `isSublease` filter** despite the field existing in the DB.
- `getApartments()` in `db.ts` likewise builds WHERE conditions but never references `isSublease`. **One-line addition needed**.
- Stripe / OAuth / S3 upload / WeChat-import / AI features all wired up — frozen per prompt.

**Frontend** (`app/client/src/`):
- `App.tsx` mounts `/apartments`, `/apartments/:id`, plus calculator, analytics, admin routes. **No `/sublets` route** exists.
- `pages/Apartments.tsx` is 914 lines — full grid + filter sidebar + map view + saved apartments + admin mode. Shows ALL apartments (including for-sale), no sublet-specific UX.
- `pages/Home.tsx` is 721 lines, hero copy is generic "international student rental". Existing `siteContent.hero.headline` says "Crossing borders made easy", not sublet-specific.
- `lib/translations.ts` is a clean, structured bilingual content file — extend by adding new keys.
- Navbar already has `Analytics` and `Calculator` entries (added in main-merge).

**Tools**:
- `tools/lehi-scraper/` exists from R1, frozen per prompt.

**State files**:
- `HARNESS_STATE.md` exists (R1 entry only).
- `PROJECT_MEMORY_v3.md` and `harness-protocol.md` referenced in the prompt **do not exist** in the repo. Treating the prompt as the source of truth and noting this gap.

### Audit-driven strategy revision

Original plan was "build /sublets parallel system". Audit-revised plan:

**Surgical additions**, not parallel system:
1. **Extend `apartmentFiltersSchema` and `getApartments`** to support `isSublease` boolean + a `subleaseAvailableThrough` window
2. **Build `/sublets` as a sublet-tuned browse page** that calls `trpc.apartments.list({ isSublease: true })` — different filters, different default sort, different hero copy
3. **Add HomePage sublet hero section + CTA** linking to `/sublets`
4. Mock data: since the dev DB likely has zero sublet listings, frontend layer falls back to red-bannered hand-curated mock listings tied to actual UofU-area cross-streets

This approach:
- Reuses 100% of existing backend infrastructure
- Doesn't duplicate the existing 914-line Apartments page
- Hits the prompt's "extend, don't break" rule perfectly
- Cuts task estimates roughly in half

### Gap Analysis vs benchmarks

| Benchmark | Has | What we lack at top of mind |
|---|---|---|
| **Furnished Finder** | photo gallery, availability calendar, host profile, monthly-stay focus, university anchor | photo gallery; availability date range filter; sublet-end-date in cards; "save for nurse/student" segmenting |
| **Airbnb** | card UI, instant book, wishlist, reviews, host avatar | wishlist UI exists in Apartments via "save", but no "review" or "host avatar" pattern |
| **Apartments.com** | map view (we have it!), saved searches, advanced filters, mortgage tools | saved searches, deep filter persistence, neighborhood guide |
| **Craigslist sublets** | freshness, geo coverage | (we are massively better in UI; we lack only data freshness) |
| **小红书 / WeChat** | personal narrative + photos, native Chinese UX | we have bilingual labels but no "host story" surface |

### Top 10 candidate features (ranked by user impact × build cost)

1. **`/sublets` browse page** — P0, ~2.5h, **picked**
2. **HomePage sublet narrative pivot** — P0, ~1h, **picked**
3. **Sublet-specific filters (area pills, furnished, lease-end window) wired through tRPC** — P0, ~1.5h, **picked**
4. Listing detail tweaks for sublet (show end date prominently) — P1, ~1h, defer to R3
5. Photo gallery (real photos in cards) — P1, ~2h, defer
6. Manual entry form for "I want to post my sublet" — P0, ~3h, defer (Phase 0.5 scope cut)
7. Real Craigslist scraper into Postgres — P1, ~4h, defer to R3
8. Map view on `/sublets` — P1, ~2h, defer (existing Apartments page has map; sublets gets it in R3)
9. Wishlist for sublets — P2, ~1h, defer
10. Notifications / digest — P3, ~4h, defer

### R2 Top 3 decision

**Executing**: 1, 2, 3 — all P0, totals ~5h leaving margin. Combined effect = **HomePage talks about sublets, `/sublets` shows them, filters narrow them**. Closed loop a user can browse end-to-end.

**Deferred to R3** (each gets a line in NEXT_PROMPT.md): 4, 5, 6, 7, 8.

**Skipped this round**: 9, 10 — too speculative without listing detail done first.

### Phase 1 done. Proceeding to Phase 2.

---

## Hour 3 — Phase 2 + Phase 3 done

### Phase 2 — backend filter additions (commits b32b192 / bfb307c)

- `apartmentFiltersSchema` now accepts `isSublease` and `subleaseAvailableThrough`
- `getApartments()` adds two corresponding WHERE clauses, with documented "undefined = no preference" semantics so existing /apartments stays untouched
- 24/24 apartments tests + 10/10 sublease tests still pass
- Caught and fixed a side-issue: stray `tools/lehi-scraper/public/` and `data/*.db-*` were committed because `.gitignore` on this base branch lacked the rules; added rules and `git rm --cached`

### Phase 2 critic

- ✅ Solved: filter API now expressive enough for /sublets to ask for sublease-only listings + lease-window filtering
- ✅ Benchmark: matches Furnished Finder's "show me sublets that overlap my date window" pattern
- ⚠️ Looks-but-doesn't-do: `isSublease=false` branch is theoretically usable but no current call site sends it. Documented but untested in real query flow.
- Assumption: Drizzle's `eq(apartments.isSublease, true)` works on a nullable column. Verified by inspection — `boolean()` columns without `.notNull()` are nullable, and Drizzle handles `eq` against `true` correctly via SQL `IS TRUE`-equivalent.

### Phase 3 — /sublets page (commit 13b18f2)

- New `SubletsPage.tsx`, `subletMockData.ts` (12 hand-curated UofU-area sublets), `MockDataBanner.tsx`
- Sticky filter sidebar: search / area pills (5 SLC neighbourhoods) / max-rent slider / min-bedrooms / "available through" date / amenity chips / pets-only + parking-only toggles / sort
- Card design tuned for sublets: source badge, area pill, days-until-end warning when ≤60 d, distance-to-UofU computed via Haversine, "posted by student/host" tag
- Wired `trpc.apartments.list({ isSublease: true })` with mock fallback when result is empty (mock banner enforced)
- Route `/sublets` added to App.tsx; Navbar gets `nav.sublets = "Sublets" / "学生转租"`
- TS error from `for (const a of Set)` fixed with `Array.from(Set).every(...)`

### Phase 3 critic

**Problem solved**: ✅ A user landing on /sublets sees a populated, filterable, sublet-tuned browse experience.

**Benchmark comparison**:
- vs Furnished Finder: ~55%. We have area filter, date filter, amenity chips. We **lack** photo gallery, host avatar, real-time map, instant booking flow, monthly-availability calendar.
- vs Airbnb: ~30%. Card design is clean but no photos. No wishlist on /sublets (apartments page has it but the sublet page doesn't reuse it). No reviews / host avatar / messaging.
- vs Apartments.com: ~50%. We match their filter density. We **lack** map view (deferred to R3), saved searches, neighborhood guides.
- vs Craigslist: 250%. Our UI annihilates theirs. Their advantage is data freshness — we don't have any real data yet.

**Looks-but-doesn't-do**:
- "View details" button on card links to `/apartments/${id}` which doesn't exist for mock IDs (`demo-001` etc.). Detail page never renders for mock listings. **Documented**: this is the seam where R3 has to either build a sublet detail page OR teach `ApartmentDetail` to handle mock IDs.
- "Post a sublet (R3)" button is intentionally disabled. Honest CTA — not a fake input.
- Source badges show "Demo" red — clearly distinguished. Real listings would show WeChat / Reddit / Craigslist with different tone.
- Mock data has hard-coded distance values; the Haversine helper computes them at module load. Verified the math (UofU at 40.7649,-111.8421; demo-002 at 40.725,-111.854 → dist ≈ 3.1 mi, plausible).
- The `availableThrough` filter is implemented as "lease end ≥ this date". A user might expect it to also enforce "available_from ≤ this date" — i.e. "I want to live here on April 15". Filed as R3 nuance, not a bug today.

**Assumption risks**:
- `trpc.apartments.list({ isSublease: true })` returning empty array when DB empty is reasonable but not battle-tested in this branch. If it errors instead, page would show error state from React Query. The fallback path then never runs. **Risk: medium**, would benefit from one integration test that asserts mock fallback engages on empty backend.
- Mock data's lat/lon are hand-set; one row had a typo (resolved before commit) that I caught. No automated check protects against future typos.

**Bilingual coverage**:
- All filter labels, sort options, card CTAs, hero copy — all bilingual ✓
- Mock data title/description has `titleZh/descriptionZh` for some rows but not all; non-bilingual rows fall back to English in zh-mode. **Acceptable for demo data**; real listings should require zh by Wayne.

**Not in scope but flagged for R3**:
- Photo gallery (P0 next round)
- Map view of /sublets (currently only /apartments has Map component)
- "Save sublet" wishlist parity with /apartments
- Listing detail page for sublet IDs

### Phase 3 done. Proceeding to Phase 4 (HomePage narrative pivot).

---

## Hour 4 — Phase 4 + Phase 5 + Phase 6 (round close-out)

### Phase 4 — HomePage narrative pivot (commit c1e73c6)

- `translations.ts` `hero.subheadline` rewritten to lead with sublet language while preserving "no SSN, no credit history" trust signals
- New "Sublet Pivot Strip" section between hero and university trust signals: orange gradient ribbon, GraduationCap icon, "NEW" badge, primary CTA → `/sublets` (uses existing `setLocation` from wouter)
- Existing hero animation, ApprovalCard, font-handling untouched
- 34/34 tests still green; vite client build green

### Phase 4 critic

**Solved**: ✅ A user landing on `/` reads sublet language in the subheadline AND sees a clear orange CTA driving to `/sublets`.

**Benchmarks**:
- Furnished Finder homepage leads with "Find a furnished monthly rental" + state map. We now lead with sublet copy + neighbourhood list. ~70% pattern match.
- Airbnb homepage UX is image-led; ours is text-led. Difference is intentional and bilingual-friendly. ~50%.
- Apartments.com homepage is search-first. We have search bar (existing) + sublet strip below it. ~80% — feels more focused than apartments.com's broad rental landing.

**Looks-but-doesn't-do**: nothing material. The strip's `Browse sublets` button works, the CTA is honest.

**Assumption risk**: The strip is between hero and university trust signals. If the existing layout has stylistic dependencies (e.g. the trust section assumes it's directly under hero), the new section could break visual rhythm. Verified by inspection — both sections stand alone with full-width backgrounds, no rhythm dependency. **Low risk**.

### Phase 5 — Round-end critic + FINAL_REPORT.md (this commit)

Wrote 200-line FINAL_REPORT covering:
- Stats (8 commits, +1442/-3 lines, 34/34 tests)
- Phase-by-phase results
- Round-end critic (5 sections: mandate coverage, benchmark alignment, looks-but-doesnt list, UX simulation, R4 roadmap)
- Files changed table
- Self-evaluation (cleanest deliveries, tightest boundary, would-do-differently, core promise kept)

### Phase 6 — NEXT_PROMPT.md authored (this commit)

R3 seed written: closes the listing loop with detail page + photo gallery + post-a-sublet form. Documented:
- Phase structure (0/0.5/1/2/3/4/5/6)
- Three risky assumption candidates for R3's audit phase
- File-level allow-list (R2 plus storage.ts + apartments.create extension)
- Self-stop conditions reused from R2

### Decision to stop

Self-Stop #6 fires (top-3 + close-out done in well under 8h, no R4 work invented). Stopping per spec.

**Hours elapsed: ~4 / 8** — finished early because the Phase 1 audit revealed pre-existing schema support for sublets and saved roughly 4 hours of duplicate work.
