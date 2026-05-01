# Lehi Scraper R1 — Verification Checklist

Run through this once, takes ~10 minutes if you use the mock path.

## 0. Setup

```bash
cd tools/lehi-scraper
npm install
npx playwright install chromium       # only needed for live scrape
npm run build                         # creates public/
```

## 1. Mock path (fastest sanity check)

```bash
npm run scrape:mock
npm run viewer
# open http://localhost:3700
```

- [ ] Viewer loads in browser, header shows "Lehi Listings Monitor"
- [ ] Summary strip shows `30 listings tracked · 27 for sale · 1 pending · 2 sold`
- [ ] Last scrape timestamp says "just now" / a few seconds ago, status `success`
- [ ] **All listings** tab shows ~27 cards in a 2-col grid
- [ ] Each card shows: address, status pill, full price, bed/bath/sqft/lot/year, distance from Morning Vista, "first seen X minutes ago"
- [ ] Filter sidebar: change Status to "Sold" → only `1420 N Vista Pine Ln` and `1102 W Sage Ridge Way` remain
- [ ] Status back to "For sale", set Min bed = 4 → ~12 listings remain
- [ ] Set Max distance to ~3 mi → fewer cards, all ≤ 3.0 mi from Morning Vista
- [ ] Sort dropdown → "Closest to Morning Vista" → cards re-order, top one ≤ 0.1 mi
- [ ] Click a card → opens Realtor.com URL in a new tab (404 in mock data, that's expected)
- [ ] **Daily new** tab → LineChart with one bar/dot for today, value 30
- [ ] **Monthly trend** tab → LineChart with two series (median ≈ $564,000, average ≈ $605,200)

## 2. API smoke test (curl / browser tab)

With viewer running on :3700:

```bash
curl http://localhost:3700/api/summary | jq .totals
# {"total":30, "for_sale":27, "pending":1, "sold":2, "avg_price":605200, ...}

curl 'http://localhost:3700/api/listings?minBed=4&maxDistanceMi=5&limit=3' | jq '.count'
# 3

curl 'http://localhost:3700/api/listings?sortBy=DROP_TABLE'
# {"error":"sortBy must be one of: ..."}
```

- [ ] All three respond with the expected JSON shape

## 3. Live scrape (only when ready to spend the network/anti-bot budget)

```bash
rm data/listings.db data/listings.db-wal data/listings.db-shm 2>/dev/null
npm run scrape
```

Expected behaviour:
- [ ] Logs `[scrape] Loading https://www.realtor.com/...`
- [ ] Logs `[scrape] Search page yielded N listing URLs` (typically 30–80 for 84043)
- [ ] Logs each detail page hit with a 3–5 sec delay between
- [ ] Final line `[scrape] Done. total=X new=Y updated=Z errors=N`
- [ ] No `captcha` / `Anti-bot wall detected` in logs

If you see anti-bot messages: **stop**, do not retry, fall back to mock for the day.

## 4. Database invariants

```bash
sqlite3 data/listings.db "SELECT COUNT(*) FROM listings;"
sqlite3 data/listings.db "SELECT COUNT(*) FROM listings WHERE distance_to_morning_vista_mi IS NOT NULL;"
sqlite3 data/listings.db "SELECT MIN(price), AVG(price), MAX(price) FROM listings WHERE listing_status='for_sale';"
```

- [ ] Listing count > 0
- [ ] Most listings have distance computed (might be a few null if Realtor lacked coords)
- [ ] Prices look plausible for Lehi (typical range $300k–$1.5M)

## 5. Test suite (auto)

```bash
npm run test
# expected: 4 test files, 33 tests passing in <500ms
```

```bash
npm run typecheck
# expected: silent (no output, exit 0)
```

```bash
npm run build
# expected: writes public/, ~540 kB JS / 13 kB CSS, exit 0
```

## 6. Hygiene

- [ ] `data/listings.db` does NOT show in `git status`
- [ ] `public/` does NOT show in `git status`
- [ ] No changes outside `tools/lehi-scraper/`, root `.gitignore`, or top-level harness markdown

## 7. Filtering examples (manual)

Open the viewer and reproduce each:

- [ ] **3+ bed under $600k within 5 mi of Morning Vista**: Min bed 3, Max price 600000, Max distance 5
- [ ] **Sold comps**: Status = Sold, sort by Price ↓
- [ ] **Cheapest big lots**: Min lot 8000, sort by Price ↑
- [ ] **Brand-new listings only**: sort by Newest first

If anything in this checklist fails, see `FINAL_REPORT.md` "Known issues" first.
