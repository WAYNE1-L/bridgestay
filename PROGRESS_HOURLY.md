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
