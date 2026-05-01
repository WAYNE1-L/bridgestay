# Lehi Listings Monitor

Daily-refreshed Realtor.com listings for Lehi (84043) / Traverse Mountain area, with distance-to-Morning-Vista calculation, multi-criteria filtering, and trend charts.

> **Status**: Harness Round 1 MVP. See `tools/lehi-scraper/VERIFY.md` after the run.

## Quick start

```bash
cd tools/lehi-scraper
npm install
npx playwright install chromium  # one-time, ~250MB

# Pull data (run daily, takes 5-10 min)
npm run scrape

# If Realtor.com 403's or you don't want to scrape live:
npm run scrape:mock     # writes a synthetic but realistic dataset

# View results in browser
npm run viewer
# Open http://localhost:3700
```

(Full docs land in Phase 5 — this is the Phase 0 placeholder.)
