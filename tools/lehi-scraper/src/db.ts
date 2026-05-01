import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "listings.db");

export function openDb(dbPath: string = DB_PATH): Database.Database {
  const handle = new Database(dbPath);
  // WAL = Write-Ahead Log. Lets a viewer read while a scrape is writing.
  handle.pragma("journal_mode = WAL");
  applySchema(handle);
  return handle;
}

export function applySchema(handle: Database.Database): void {
  handle.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT,
      zip TEXT NOT NULL,

      price INTEGER,
      bed REAL,
      bath REAL,
      sqft INTEGER,
      lot_sqft INTEGER,
      year_built INTEGER,

      lat REAL,
      lon REAL,
      distance_to_morning_vista_mi REAL,

      listing_status TEXT,
      listing_type TEXT,

      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      last_price_change_at TEXT,

      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS price_history (
      listing_id TEXT NOT NULL,
      price INTEGER NOT NULL,
      seen_at TEXT NOT NULL,
      FOREIGN KEY (listing_id) REFERENCES listings(id)
    );

    CREATE TABLE IF NOT EXISTS scrape_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT,
      listings_total INTEGER,
      listings_new INTEGER,
      listings_updated INTEGER,
      error_log TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_listings_zip ON listings(zip);
    CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
    CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(listing_status);
    CREATE INDEX IF NOT EXISTS idx_listings_first_seen ON listings(first_seen_at);
    CREATE INDEX IF NOT EXISTS idx_price_history_listing ON price_history(listing_id);
  `);
}

export interface Listing {
  id: string;
  url: string;
  address: string;
  city: string | null;
  zip: string;
  price: number | null;
  bed: number | null;
  bath: number | null;
  sqft: number | null;
  lot_sqft: number | null;
  year_built: number | null;
  lat: number | null;
  lon: number | null;
  distance_to_morning_vista_mi: number | null;
  listing_status: string;
  listing_type: string | null;
  first_seen_at: string;
  last_seen_at: string;
  last_price_change_at: string | null;
  raw_json: string | null;
}

export type UpsertResult = "inserted" | "updated" | "unchanged";

/**
 * Upsert a listing. If the row already exists:
 *   - last_seen_at is bumped to now
 *   - if price differs, the new value goes into both `listings.price` and a
 *     fresh row in `price_history`, and `last_price_change_at` is set
 * If it doesn't exist, a fresh row is inserted with first_seen_at = now.
 */
export function upsertListing(
  handle: Database.Database,
  listing: Omit<Listing, "first_seen_at" | "last_seen_at">,
  now: string = new Date().toISOString()
): UpsertResult {
  const existing = handle
    .prepare<[string], Listing>("SELECT * FROM listings WHERE id = ?")
    .get(listing.id);

  if (!existing) {
    handle
      .prepare(
        `INSERT INTO listings (
          id, url, address, city, zip,
          price, bed, bath, sqft, lot_sqft, year_built,
          lat, lon, distance_to_morning_vista_mi,
          listing_status, listing_type,
          first_seen_at, last_seen_at, last_price_change_at,
          raw_json
        ) VALUES (
          @id, @url, @address, @city, @zip,
          @price, @bed, @bath, @sqft, @lot_sqft, @year_built,
          @lat, @lon, @distance_to_morning_vista_mi,
          @listing_status, @listing_type,
          @first_seen_at, @last_seen_at, @last_price_change_at,
          @raw_json
        )`
      )
      .run({
        ...listing,
        first_seen_at: now,
        last_seen_at: now,
        last_price_change_at: listing.price !== null ? now : null,
      });
    if (listing.price !== null) {
      handle
        .prepare(
          "INSERT INTO price_history (listing_id, price, seen_at) VALUES (?, ?, ?)"
        )
        .run(listing.id, listing.price, now);
    }
    return "inserted";
  }

  const priceChanged =
    listing.price !== null && existing.price !== listing.price;

  handle
    .prepare(
      `UPDATE listings SET
         url = @url,
         address = @address,
         city = @city,
         zip = @zip,
         price = @price,
         bed = @bed,
         bath = @bath,
         sqft = @sqft,
         lot_sqft = @lot_sqft,
         year_built = @year_built,
         lat = @lat,
         lon = @lon,
         distance_to_morning_vista_mi = @distance_to_morning_vista_mi,
         listing_status = @listing_status,
         listing_type = @listing_type,
         last_seen_at = @last_seen_at,
         last_price_change_at = CASE WHEN @price_changed = 1 THEN @last_seen_at ELSE last_price_change_at END,
         raw_json = COALESCE(@raw_json, raw_json)
       WHERE id = @id`
    )
    .run({
      ...listing,
      last_seen_at: now,
      price_changed: priceChanged ? 1 : 0,
    });

  if (priceChanged) {
    handle
      .prepare(
        "INSERT INTO price_history (listing_id, price, seen_at) VALUES (?, ?, ?)"
      )
      .run(listing.id, listing.price, now);
  }

  return priceChanged || existing.last_seen_at !== now ? "updated" : "unchanged";
}

export interface ScrapeRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string | null;
  listings_total: number | null;
  listings_new: number | null;
  listings_updated: number | null;
  error_log: string | null;
}

export function startScrapeRun(handle: Database.Database, now: string = new Date().toISOString()): number {
  const result = handle
    .prepare("INSERT INTO scrape_runs (started_at, status) VALUES (?, 'running')")
    .run(now);
  return result.lastInsertRowid as number;
}

export function finishScrapeRun(
  handle: Database.Database,
  runId: number,
  status: "success" | "partial" | "failed",
  totals: { total: number; new: number; updated: number; errors: string[] }
): void {
  handle
    .prepare(
      `UPDATE scrape_runs
       SET finished_at = ?, status = ?, listings_total = ?, listings_new = ?, listings_updated = ?, error_log = ?
       WHERE id = ?`
    )
    .run(
      new Date().toISOString(),
      status,
      totals.total,
      totals.new,
      totals.updated,
      totals.errors.length > 0 ? totals.errors.join("\n") : null,
      runId
    );
}

// Default singleton handle for the app's runtime — tests build their own
// in-memory handle via `openDb(":memory:")`.
export const db = openDb();
