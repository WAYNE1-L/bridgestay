# Harness Round 3 — Close the Sublet Listing Loop (8h Self-Iterating)

## Context (read 3 times before starting)

**R2 shipped** (`feat/sublet-platform-r2`, 8 commits, ready to merge or stack on):
- ✅ `/sublets` browse page with filter sidebar, source badges, mock fallback + red banner
- ✅ Backend filter schema extended (`isSublease`, `subleaseAvailableThrough`)
- ✅ HomePage sublet narrative pivot (subheadline + sublet ribbon CTA)
- ✅ 12 hand-curated UofU-area mock listings across all 5 SLC neighbourhoods

**R2 honestly admitted what's broken**:
- `View details` on a sublet card links to `/apartments/${id}` — **404 for mock IDs**
- No "Post a sublet" form exists; CTA is disabled stub
- No real photos — every card is text-only
- Mock data only; no real Craigslist / Reddit / WeChat data

**R3 closes the listing loop**: detail page → photo gallery → post-a-sublet form. After R3 a user can land on `/`, click into a sublet, see photos and a host story, and (if they're Wayne or another student) post their own.

## User Mandate (still locked from R2)

> "BridgeStay 转向: Sublet 是更大市场,买房太重,sublet 才是 BridgeStay 真正方向"

R3 specifically:
- **Sublet detail page** (`/sublets/:id`) — currently dead-end click
- **Post-a-sublet form** — close the matching loop, even minimal
- **Photo gallery** — biggest visual gap vs Furnished Finder / Airbnb
- Schema, narrative, filter system are stable from R2; do not redesign.

## Benchmarks (re-read)

Same as R2:
1. Furnished Finder (sublet competitor)
2. ABODO / RentCollegePads (student rental)
3. Apartments.com (mainstream rental)
4. Airbnb (UX + photos)
5. Zillow (detail page)
6. Craigslist (data, anti-pattern)
7. 小红书 / WeChat (Chinese audience habit)

## Phase 0 — Setup (15 min)

```bash
cd /c/Users/Wayne1/Desktop/files/bridgestay
git status                       # must be clean
git fetch origin
git checkout merge/full-integration
git pull origin merge/full-integration

# Tag R3 baseline (the actual baseline is whatever main-merge is at the time;
# R2 may or may not have been merged by now)
git tag harness-r3-baseline
git push origin harness-r3-baseline

# Branch off R2 if R2 hasn't been merged yet, otherwise off main-merge
# Detect:
git log --oneline | grep -q "feat(sublets):" && echo "R2 is merged, base off integration" || echo "R2 not merged, base off feat/sublet-platform-r2"

# Default plan: base off feat/sublet-platform-r2 to inherit R2's work
git checkout feat/sublet-platform-r2 2>/dev/null || git checkout -b feat/sublet-platform-r2 origin/feat/sublet-platform-r2
git checkout -b feat/sublet-platform-r3

# Initialize R3 progress
mkdir -p archive
# Move R2 reports if not already moved
if [ -f FINAL_REPORT.md ] && grep -q "Harness Round 2" FINAL_REPORT.md; then
  mv FINAL_REPORT.md archive/R2_FINAL_REPORT.md
  mv PROGRESS_HOURLY.md archive/R2_PROGRESS_HOURLY.md
fi

cat > PROGRESS_HOURLY.md << 'EOF'
# R3 Hourly Progress — Close the Sublet Listing Loop

Branch: feat/sublet-platform-r3
Backup tag: harness-r3-baseline
Hard cap: 8 hours

EOF

git add -A
git commit -m "chore(r3): bootstrap close-the-loop round + archive R2 reports"
git push origin feat/sublet-platform-r3
```

## Phase 0.5 — Assumption Audit (15 min, NO CODE)

Write into PROGRESS_HOURLY.md hour 1 entry:

1. List 5 assumptions about R3 user intent.
2. Challenge the 3 riskiest.
3. If any assumption challenge is severe (e.g. "Wayne actually wants real-data scraping first, not the post form"), write `WAITING_FOR_USER.md` and stop.

Suggested risky assumptions to consider:

- A. The post form should write to the production DB (vs. localStorage scratch).
- B. Photo upload should reuse main app's existing S3 upload infra (vs. build new).
- C. Detail page should use the existing `ApartmentDetail` (extend it for sublets) vs. a fresh `SubletDetail` page.
- D. Mock data still acceptable in R3, OR R3 must replace mock with real listings (ground truth: mandate doesn't say either way; default to "mock OK, real data is R4").
- E. Multi-photo gallery vs. single photo MVP.

## Phase 1 — Quick Audit (30 min, NO CODE)

R2 already audited the repo deeply. R3 just needs:

- Re-read `app/server/routers.ts` `apartments.create` mutation — does it exist? Does it require auth? What fields does it accept?
- Re-read `app/server/storage.ts` for S3 upload helpers — is `uploadPhoto` already exposed?
- Re-read `app/client/src/pages/ApartmentDetail.tsx` — line count, state of completeness, would a sublet detail be a fork or a flag?
- Confirm `tools/lehi-scraper/` is still frozen (don't touch).

Write findings into PROGRESS_HOURLY.md hour 1, decide:

- **Option A**: Extend `ApartmentDetail.tsx` with `?sublet=true` mode toggle (clean reuse, ~1h, risk: it's already 800+ lines)
- **Option B**: New `SubletDetail.tsx` page mounted at `/sublets/:id`, copy 30% of ApartmentDetail's data fetching, sublet-tuned UI (clean isolation, ~2h, more code but easier to design)
- **Option C**: Hybrid — `/sublets/:id` as a thin wrapper that calls into a shared `<ListingDetail mode="sublet" />` component

Pick one, commit decision in PROGRESS_HOURLY.md, proceed.

## Phase 2 — Sublet Detail Page (P0, ~2.5h)

**Mini-spec**:
- Route `/sublets/:id`, App.tsx route added
- Hero: address + status badge + price + sublease end date prominent
- Photo carousel (max 5 photos in MVP; one big + thumbnails)
- Bed/bath/sqft/distance-to-UofU as a clean stat strip
- Lease window section: available from → end date, with "X days remaining" warning if soon
- Description block (bilingual fallback)
- Amenity grid
- Location section (fallback to address-only string in R3 if no map; R4 adds map embed)
- "Contact host" CTA — for mock data, opens a modal with WeChat ID; for real data, routes to existing message flow if auth'd
- Source badge in header (Demo / WeChat / Reddit / etc.)
- "Posted by a current student" / "Posted by host" trust line

**Mock-data fallback**: when `id.startsWith("demo-")`, look up from `subletMockData.ts` instead of hitting trpc. Otherwise call `trpc.apartments.getById({ id: Number(id) })`.

**Critic loop required at end**:
- Solved? (User can now click a sublet card and read its details — yes/no)
- vs Furnished Finder detail page (~70%? what's missing?)
- "Looks but doesn't" list

Commit: `feat(sublets): /sublets/:id detail page with photo carousel + contact CTA`

## Phase 3 — Photo Upload + Gallery (P0, ~2h)

**Mini-spec**:
- Reuse main app's S3 upload helpers (audit confirmed in Phase 1)
- Sublet card on `/sublets` shows hero photo if present, falls back to text-card design
- Detail page shows multi-photo carousel
- Mock listings get realistic-looking placeholder photos (use unsplash IDs in mock-data.ts, gated by red banner so they're clearly marked demo)

**Critic loop**: photo gallery now matches Furnished Finder card pattern? Mobile carousel works?

Commit: `feat(sublets): photo carousel on cards and detail page`

## Phase 4 — Post-a-Sublet Form (P0, ~3h)

**Mini-spec**:
- Route `/sublets/post`, gated by auth (existing flow). If unauthenticated, show "sign in to post" CTA.
- Form sections (one card each):
  1. Basic info (title, area select, address, university association)
  2. Lease window (available from + end date pickers; auto-validate end > from)
  3. Pricing (monthly rent, deposit)
  4. Property (bedrooms, bathrooms, sqft, furnished toggle, parking, pets)
  5. Photos (drag-drop, max 5)
  6. Contact (WeChat / email / phone)
  7. Description (bilingual textareas)
- Submit → calls `trpc.apartments.create({ ...formData, isSublease: true })`
- On success → redirect to `/sublets/${newId}`
- The R2 `Post a sublet (R3)` stub button on `/sublets` page becomes enabled and links here

**Critic loop**: a complete listing from form → submit → detail page is a closed loop. Verify.

Commit: `feat(sublets): /sublets/post form with multi-section UX and apartments.create wiring`

## Phase 5 — Round-end Critic + FINAL_REPORT (60 min)

Same format as R2 FINAL_REPORT.md:
- Stats
- What was built (per phase)
- Round-end critic (5 sections: solve mandate, benchmark, looks-but-doesnt, UX simulation, R4 roadmap)
- Files changed table
- Self-evaluation (cleanest, tightest boundary, would-do-differently, core promise)

## Phase 6 — Write NEXT_PROMPT.md (R4 seed) (45 min)

R3 likely doesn't close all gaps. R4 candidates (rank by impact):
1. Real Craigslist + Reddit scraper into Postgres (replace mock)
2. Map view on /sublets
3. AI paste-text → form auto-fill (Gemini API, for the "I copied this from Reddit" workflow)
4. Manual WeChat / 小红书 entry helpers (Chinese-language paste-text parser)
5. Wishlist / saved sublets parity
6. Notifications / daily digest email
7. Listing reports + moderation queue extension

Pick the top 3 for R4 based on R3's actual outcome.

## Self-Stop Conditions

Same as R2:
1. 8h hard cap
2. Phase 0.5 audit reveals showstopping conflict → `WAITING_FOR_USER.md`, stop
3. Audit reveals existing infra blocks the plan (e.g. apartments.create requires landlord_profile that mock users don't have) → revise top-3, document
4. Any commit breaks sublease 10 tests + 30 min unfixable → `git reset` that commit, mark failed, next task
5. 3 consecutive build failures → stop
6. Top 3 done with 2h+ left → tackle exactly ONE R4 candidate (don't invent), then stop
7. 6h still in audit / Phase 1 → underestimated scope, stop and write report

## File-Level Allow-List

Same as R2 with one ADDITION:
- ✅ `app/server/storage.ts` photo-upload extension OK if needed
- ✅ `app/server/routers.ts` apartments.create mutation extension OK
- ❌ Still no Stripe / OAuth flow / migrations / lehi-scraper / archive / calculator

## Working Style

- Quality > quantity. 2 complete loops > 4 half-built ones.
- Each task gets a critic loop. No exceptions.
- Mock data still requires red banner.
- Do not redesign R2's `/sublets` filter UI; it stays.
- Don't touch the calculator (10 tests must remain green).
- Frequent commits, frequent push.

## Final reminders

1. R3 closes the loop: card → detail → photos → post.
2. R2 was 70%; R3 brings to 85%; R4+ adds real data + map + comms.
3. The audit-first approach saved R2 from rebuilding existing infra. Apply it to R3.
4. NEXT_PROMPT.md is the most valuable artifact you'll write.

GO. Phase 0 immediately.
