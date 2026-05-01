# Lehi Listings Monitor

A small daily-refreshed Realtor.com snapshot for Lehi (84043) / Traverse Mountain area, with distance-to-Morning-Vista calculation, multi-criteria filtering, and trend charts. Runs entirely on your laptop — no cloud, no auth, no telemetry.

> Standalone tool inside `tools/lehi-scraper/` of the BridgeStay repo. Touches none of the BridgeStay main app.

---

## Quick start

```bash
cd tools/lehi-scraper

# 1. Install
npm install

# 2. Install Chromium for Playwright (one-time, ~250 MB)
npx playwright install chromium

# 3. Build the React viewer once
npm run build

# 4. Pull data — pick ONE:
npm run scrape          # live: scrapes Realtor.com 84043 (5–10 min)
npm run scrape:mock     # synthetic: seeds 30 realistic mock listings (~1 sec)

# 5. View results
npm run viewer
# Open http://localhost:3700
```

Daily morning workflow: run `npm run scrape`, leave the viewer tab open.

---

## Workflow

| Command | What it does |
| --- | --- |
| `npm run scrape` | Live scrape from Realtor.com 84043 search. Throttle 3–5 s/page. ~5–10 min. |
| `npm run scrape:mock` | Seed 30 hand-curated realistic Lehi listings into SQLite. No network. Useful when scrape is blocked or for offline UI dev. |
| `npm run scrape -- --dry-run` | Run the live scrape but don't write to the database. |
| `npm run viewer` | Express server on `http://localhost:3700` serving the built React UI + `/api/*` JSON. |
| `npm run dev` | Vite dev server on `http://localhost:5174` with hot reload (proxies `/api` → `:3700`, so run `npm run viewer` in another terminal). |
| `npm run build` | Bundle the React app into `tools/lehi-scraper/public/`. Re-run after UI changes. |
| `npm run test` | 33 vitest tests covering distance, DB upsert, Realtor parser, and API filters. |
| `npm run typecheck` | `tsc --noEmit` over the whole tool. |

---

## Database

`tools/lehi-scraper/data/listings.db` — SQLite. **Gitignored.** WAL journaling, so the viewer can read while a scrape is writing.

To wipe and start fresh:
```bash
rm data/listings.db data/listings.db-wal data/listings.db-shm
npm run scrape:mock     # or npm run scrape
```

### Schema

| Table | Purpose |
| --- | --- |
| `listings` | Current state of each unique Realtor listing. Keyed by Realtor `property_id`. |
| `price_history` | Append-only log: every time a listing's price differs from the previous scrape, a row is added. |
| `scrape_runs` | Audit log: started/finished timestamps, status (`success` / `partial` / `failed` / `running`), counts, error log. |

### `listings` columns

| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | Realtor's `property_id` (e.g. `M12345-67890`). |
| `url` | TEXT | Detail-page URL. |
| `address` | TEXT | Street line, e.g. `1042 Morning Vista Dr`. |
| `city`, `zip` | TEXT | `Lehi` / `84043`. |
| `price` | INTEGER | USD list price, no decimals. |
| `bed`, `bath`, `sqft`, `lot_sqft`, `year_built` | numeric | Standard property meta. |
| `lat`, `lon` | REAL | Pulled from Realtor's `coordinate` field. |
| `distance_to_morning_vista_mi` | REAL | Pre-computed Haversine to (40.4847, −111.8814). |
| `listing_status` | TEXT | `for_sale`, `pending`, `sold`. |
| `listing_type` | TEXT | `single_family`, `townhouse`, `condo`. |
| `first_seen_at`, `last_seen_at`, `last_price_change_at` | ISO 8601 | Timestamps. |
| `raw_json` | TEXT | First 8 KB of the Realtor JSON, for forensics if parsing breaks. |

---

## API (when `npm run viewer` is running)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/summary` | Top counts (total / for_sale / pending / sold), avg/min/max price, last scrape run. |
| GET | `/api/listings` | Filtered list. Query params: `status`, `minPrice`, `maxPrice`, `minBed`, `minBath`, `minLotSqft`, `maxDistanceMi`, `sortBy`, `order`, `limit`. |
| GET | `/api/listings/:id` | Single listing + its full price-history series. |
| GET | `/api/stats/daily?days=30` | New-listings count + price band per day for the last N days. |
| GET | `/api/stats/median-by-month` | Median + average list price grouped by listing-first-seen month. |
| GET | `/api/scrape-runs` | Last 20 audit-log rows. |

`sortBy` is whitelisted (`first_seen_at`, `last_seen_at`, `price`, `bed`, `bath`, `sqft`, `lot_sqft`, `distance_to_morning_vista_mi`); anything else returns 400.

---

## Filtering examples

- **3+ bed / 2+ bath / under $600k / within 5 mi of Morning Vista** — set sidebar filters and sort by Newest first.
- **Recently sold comps** — change Status to `Sold`, sort by Price ↓.
- **Cheapest > 4000 sqft lots** — Min lot 4000, sort by Price ↑.
- All combinations are bookmarkable via the URL params on `/api/listings?…`.

---

## Anti-bot policy (read before changing)

The scraper observes a strict policy designed to be a respectful citizen of Realtor.com and to keep this tool from getting your IP blocked:

- ✅ Real desktop Chrome User-Agent.
- ✅ 3–5 second randomised gap between detail-page requests.
- ✅ Hard cap: 5 consecutive failures → stop, write `failed` to `scrape_runs`.
- ✅ Captcha / "access denied" / 4xx detection → stop, save a screenshot to `data/debug/`, exit non-zero.
- ✅ Single ZIP only (84043). To extend, edit `SEARCH_URL` in `src/scrape.ts`.
- ✅ Recommended frequency: max **once per day**.
- ❌ No proxy rotation, no captcha solver, no headless evasion plugin.
- ❌ No login / no scraping behind a paywall.

If a live scrape fails for any reason — that's normal — fall back to `npm run scrape:mock` for the day and try again later.

---

## Limitations / TODOs

- Only 84043 ZIP scoped. Park City + other zips would need a separate `SEARCH_URL` plus probably its own DB file.
- Distance is straight-line Haversine, not driving time. For commute estimates, swap in the Mapbox Directions API.
- No automatic daily run. Set up a Windows Task Scheduler entry or `cron` job that runs `npm run scrape` once a day.
- `off_market` detection is not yet implemented — when Realtor stops listing a property, our DB just stops updating it. Future pass: mark as off-market if `last_seen_at` is more than 7 days old.
- No email digest / push notification ("5 new listings since yesterday"). Possible future Phase.

---

## Testing

```bash
npm run test         # 33 tests, ~500 ms
npm run typecheck    # tsc --noEmit, ~3 s
npm run build        # vite + tsc, ~2 s
```
