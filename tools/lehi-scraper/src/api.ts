/**
 * API route handlers, decoupled from the Express server bootstrap so the unit
 * tests can mount them onto a throwaway in-memory database.
 */

import type { Request, Response } from "express";
import express from "express";
import type Database from "better-sqlite3";

const ALLOWED_SORT_BY = new Set([
  "first_seen_at",
  "last_seen_at",
  "price",
  "bed",
  "bath",
  "sqft",
  "lot_sqft",
  "distance_to_morning_vista_mi",
]);

function parseIntOrDefault(v: unknown, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatOrDefault(v: unknown, fallback: number): number {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

export function createApiRouter(db: Database.Database): express.Router {
  const router = express.Router();

  // GET /api/listings — list + filter
  router.get("/listings", (req: Request, res: Response) => {
    const status = String(req.query.status ?? "for_sale");
    const minPrice = parseIntOrDefault(req.query.minPrice, 0);
    const maxPrice = parseIntOrDefault(req.query.maxPrice, 99_999_999);
    const minBed = parseFloatOrDefault(req.query.minBed, 0);
    const minBath = parseFloatOrDefault(req.query.minBath, 0);
    const minLotSqft = parseIntOrDefault(req.query.minLotSqft, 0);
    const maxDistanceMi = parseFloatOrDefault(req.query.maxDistanceMi, 999);
    const limit = Math.min(parseIntOrDefault(req.query.limit, 100), 500);
    const sortByRaw = String(req.query.sortBy ?? "first_seen_at");
    const order = String(req.query.order ?? "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    if (!ALLOWED_SORT_BY.has(sortByRaw)) {
      return res
        .status(400)
        .json({ error: `sortBy must be one of: ${[...ALLOWED_SORT_BY].join(", ")}` });
    }

    const sql = `
      SELECT * FROM listings
      WHERE listing_status = ?
        AND COALESCE(price, 0) BETWEEN ? AND ?
        AND COALESCE(bed, 0) >= ?
        AND COALESCE(bath, 0) >= ?
        AND COALESCE(lot_sqft, 0) >= ?
        AND COALESCE(distance_to_morning_vista_mi, 999) <= ?
      ORDER BY ${sortByRaw} ${order}
      LIMIT ?
    `;
    const rows = db
      .prepare(sql)
      .all(status, minPrice, maxPrice, minBed, minBath, minLotSqft, maxDistanceMi, limit);

    res.json({ count: rows.length, listings: rows });
  });

  // GET /api/listings/:id — single + price history
  router.get("/listings/:id", (req: Request, res: Response) => {
    const id = req.params.id;
    const listing = db.prepare("SELECT * FROM listings WHERE id = ?").get(id);
    if (!listing) {
      return res.status(404).json({ error: "Not found" });
    }
    const priceHistory = db
      .prepare(
        "SELECT price, seen_at FROM price_history WHERE listing_id = ? ORDER BY seen_at ASC"
      )
      .all(id);
    res.json({ listing, priceHistory });
  });

  // GET /api/stats/daily — new-listing trend, last N days
  router.get("/stats/daily", (req: Request, res: Response) => {
    const days = Math.max(1, Math.min(parseIntOrDefault(req.query.days, 30), 365));
    const rows = db
      .prepare(
        `SELECT
           DATE(first_seen_at) AS date,
           COUNT(*) AS new_listings,
           AVG(price) AS avg_price,
           MIN(price) AS min_price,
           MAX(price) AS max_price
         FROM listings
         WHERE first_seen_at >= DATE('now', '-' || ? || ' days')
         GROUP BY DATE(first_seen_at)
         ORDER BY date ASC`
      )
      .all(days);
    res.json(rows);
  });

  // GET /api/stats/median-by-month — median price trend by listing month
  router.get("/stats/median-by-month", (_req: Request, res: Response) => {
    // SQLite has no native median; group prices and pick the middle row per month.
    const rows = db
      .prepare(
        `WITH monthly AS (
          SELECT
            strftime('%Y-%m', first_seen_at) AS month,
            price,
            ROW_NUMBER() OVER (
              PARTITION BY strftime('%Y-%m', first_seen_at)
              ORDER BY price
            ) AS rn,
            COUNT(*) OVER (
              PARTITION BY strftime('%Y-%m', first_seen_at)
            ) AS cnt
          FROM listings
          WHERE price IS NOT NULL
        )
        SELECT
          month,
          MAX(cnt) AS listings_count,
          AVG(price) FILTER (WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)) AS median_price,
          AVG(price) AS avg_price
        FROM monthly
        GROUP BY month
        ORDER BY month ASC`
      )
      .all();
    res.json(rows);
  });

  // GET /api/scrape-runs — recent run audit log
  router.get("/scrape-runs", (_req: Request, res: Response) => {
    const rows = db
      .prepare("SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 20")
      .all();
    res.json(rows);
  });

  // GET /api/summary — top-of-page sanity numbers
  router.get("/summary", (_req: Request, res: Response) => {
    const totals = db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN listing_status = 'for_sale' THEN 1 ELSE 0 END) AS for_sale,
           SUM(CASE WHEN listing_status = 'pending'  THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN listing_status = 'sold'     THEN 1 ELSE 0 END) AS sold,
           AVG(price)            AS avg_price,
           MIN(price)            AS min_price,
           MAX(price)            AS max_price
         FROM listings`
      )
      .get();
    const lastRun = db
      .prepare("SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 1")
      .get();
    res.json({ totals, lastRun });
  });

  return router;
}
