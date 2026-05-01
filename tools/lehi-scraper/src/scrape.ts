/**
 * Lehi 84043 scraper entry point.
 *
 *   npm run scrape           — live: Realtor.com 84043, Playwright + throttle
 *   npm run scrape:mock      — uses src/mock-data.ts (no network)
 *   npm run scrape -- --dry-run   — runs the live scrape but doesn't write to DB
 *
 * Anti-bot policy (DO NOT loosen without owner approval):
 * - User-Agent matches a real Chrome
 * - 3–5 s pause between detail-page hits
 * - Hard cap: stop after 5 consecutive failures
 * - On 403 / captcha detection: stop, mark `failed`, exit 1
 * - Frequency: max 1 full run / 24h (caller's responsibility)
 */

import { db, upsertListing, startScrapeRun, finishScrapeRun, type Listing } from "./db.ts";
import { distanceToMorningVista } from "./distance.ts";
import { parseNextData, parseDom, type ParsedListing } from "./realtor-parse.ts";
import { buildMockListings } from "./mock-data.ts";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEARCH_URL = "https://www.realtor.com/realestateandhomes-search/84043";
const DETAIL_DELAY_MIN_MS = 3000;
const DETAIL_DELAY_MAX_MS = 5000;
const MAX_CONSECUTIVE_FAILURES = 5;
const DEBUG_DIR = path.join(__dirname, "..", "data", "debug");
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

interface ScrapeOptions {
  useMock: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): ScrapeOptions {
  return {
    useMock: argv.includes("--use-mock"),
    dryRun: argv.includes("--dry-run"),
  };
}

function ensureDebugDir(): void {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

function randomDelayMs(): number {
  return (
    DETAIL_DELAY_MIN_MS +
    Math.floor(Math.random() * (DETAIL_DELAY_MAX_MS - DETAIL_DELAY_MIN_MS))
  );
}

function attachDistance(listing: ParsedListing): Omit<Listing, "first_seen_at" | "last_seen_at"> {
  return {
    ...listing,
    distance_to_morning_vista_mi:
      listing.lat !== null && listing.lon !== null
        ? distanceToMorningVista(listing.lat, listing.lon)
        : null,
    last_price_change_at: null,
  };
}

async function runMock(opts: ScrapeOptions): Promise<void> {
  console.log(`[mock] Loading ${30} synthetic listings...`);
  const runId = startScrapeRun(db);
  let newCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];
  const mocks = buildMockListings();

  for (const listing of mocks) {
    try {
      const withDistance = attachDistance(listing);
      if (!opts.dryRun) {
        const result = upsertListing(db, withDistance);
        if (result === "inserted") newCount++;
        else if (result === "updated") updatedCount++;
      }
    } catch (e) {
      errors.push(`${listing.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  finishScrapeRun(db, runId, errors.length === 0 ? "success" : "partial", {
    total: mocks.length,
    new: newCount,
    updated: updatedCount,
    errors,
  });

  console.log(
    `[mock] Done. total=${mocks.length} new=${newCount} updated=${updatedCount} errors=${errors.length}` +
      (opts.dryRun ? " (dry-run, no DB writes)" : "")
  );
}

async function runLive(opts: ScrapeOptions): Promise<void> {
  // Lazy-load Playwright so the mock path doesn't require Chromium to be installed.
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (e) {
    throw new Error(
      "Playwright is not installed. Run `npx playwright install chromium`, " +
        "or use `npm run scrape:mock` to seed synthetic data."
    );
  }
  ensureDebugDir();

  const startedAt = new Date().toISOString();
  const runId = startScrapeRun(db, startedAt);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });

  const page = await context.newPage();
  let totalSeen = 0;
  let newCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];
  let consecutiveFailures = 0;

  try {
    console.log(`[scrape] Loading ${SEARCH_URL}`);
    const response = await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (response && response.status() >= 400) {
      throw new Error(`Search page returned HTTP ${response.status()} — possible block`);
    }

    // Look for blocker phrases.
    const bodyText = (await page.locator("body").textContent({ timeout: 5000 })) ?? "";
    if (/captcha|access denied|blocked|please verify/i.test(bodyText)) {
      // Save a screenshot for forensics, then bail.
      await page.screenshot({ path: path.join(DEBUG_DIR, "blocked-search-page.png") });
      throw new Error("Anti-bot wall detected on search page (see data/debug/)");
    }

    // Realtor renders cards client-side; wait for at least one.
    await page
      .waitForSelector('[data-testid="property-card"], a[href*="/realestateandhomes-detail/"]', {
        timeout: 30000,
      })
      .catch(() => {
        throw new Error(
          "Listing cards never rendered. Realtor may have updated DOM — check src/realtor-parse.ts"
        );
      });

    const listingUrls: string[] = await page.evaluate(() => {
      const anchors = document.querySelectorAll<HTMLAnchorElement>(
        'a[href*="/realestateandhomes-detail/"]'
      );
      const seen = new Set<string>();
      const urls: string[] = [];
      anchors.forEach((a) => {
        const href = a.href;
        if (!seen.has(href)) {
          seen.add(href);
          urls.push(href);
        }
      });
      return urls;
    });

    console.log(`[scrape] Search page yielded ${listingUrls.length} listing URLs`);
    totalSeen = listingUrls.length;

    if (listingUrls.length === 0) {
      throw new Error("Zero listing URLs extracted — selectors may need adjustment");
    }

    for (let i = 0; i < listingUrls.length; i++) {
      const url = listingUrls[i];
      try {
        console.log(`[scrape] [${i + 1}/${listingUrls.length}] ${url}`);
        const detailResp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        if (detailResp && detailResp.status() >= 400) {
          throw new Error(`HTTP ${detailResp.status()}`);
        }

        const detailBody = (await page.locator("body").textContent({ timeout: 5000 })) ?? "";
        if (/captcha|access denied/i.test(detailBody)) {
          throw new Error("captcha on detail page");
        }

        // Try __NEXT_DATA__ first, fall back to DOM.
        const nextDataRaw = await page
          .locator('script[id="__NEXT_DATA__"]')
          .first()
          .textContent({ timeout: 2000 })
          .catch(() => null);

        let parsed: ParsedListing | null = null;
        if (nextDataRaw) {
          try {
            parsed = parseNextData(JSON.parse(nextDataRaw), url);
          } catch (e) {
            // fall through to DOM parser
          }
        }

        if (!parsed) {
          const fields = await page.evaluate(() => {
            const get = (sel: string) =>
              document.querySelector(sel)?.textContent?.trim() ?? null;
            return {
              address: get('[data-testid="address"]') ?? get("h1"),
              price: get('[data-testid="price"]'),
              beds: get('[data-testid="property-meta-beds"]'),
              baths: get('[data-testid="property-meta-baths"]'),
              sqft: get('[data-testid="property-meta-sqft"]'),
              lotSize: get('[data-testid="property-meta-lot-size"]'),
              city: null,
              zip: null,
            };
          });
          parsed = parseDom(fields, url);
        }

        if (!parsed) {
          errors.push(`parse-failed: ${url}`);
          consecutiveFailures++;
        } else {
          consecutiveFailures = 0;
          // Only keep listings actually in the target ZIP — search page sometimes
          // bleeds in nearby ZIPs.
          if (parsed.zip !== "84043") {
            console.log(`[scrape]   skipping (zip=${parsed.zip}, not 84043)`);
          } else if (!opts.dryRun) {
            const result = upsertListing(db, attachDistance(parsed));
            if (result === "inserted") newCount++;
            else if (result === "updated") updatedCount++;
          }
        }

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          throw new Error(
            `${MAX_CONSECUTIVE_FAILURES} consecutive failures — stopping early`
          );
        }

        await page.waitForTimeout(randomDelayMs());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${url}: ${msg}`);
        if (/captcha|http 4|consecutive/i.test(msg)) {
          throw e;
        }
      }
    }

    finishScrapeRun(db, runId, errors.length === 0 ? "success" : "partial", {
      total: totalSeen,
      new: newCount,
      updated: updatedCount,
      errors,
    });

    console.log(
      `[scrape] Done. total=${totalSeen} new=${newCount} updated=${updatedCount} errors=${errors.length}` +
        (opts.dryRun ? " (dry-run)" : "")
    );
  } catch (e) {
    finishScrapeRun(db, runId, "failed", {
      total: totalSeen,
      new: newCount,
      updated: updatedCount,
      errors: [...errors, e instanceof Error ? e.message : String(e)],
    });
    console.error("[scrape] Failed:", e instanceof Error ? e.message : e);
    throw e;
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  console.log(`[scrape] options:`, opts);

  if (opts.useMock) {
    await runMock(opts);
  } else {
    await runLive(opts);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
