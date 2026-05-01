import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { applySchema, upsertListing, type Listing } from "./db";

function makeListing(overrides: Partial<Listing> = {}): Omit<
  Listing,
  "first_seen_at" | "last_seen_at"
> {
  return {
    id: "L1",
    url: "https://example.com/1",
    address: "123 Main St",
    city: "Lehi",
    zip: "84043",
    price: 500000,
    bed: 3,
    bath: 2,
    sqft: 1800,
    lot_sqft: 6000,
    year_built: 2018,
    lat: 40.485,
    lon: -111.882,
    distance_to_morning_vista_mi: 0.05,
    listing_status: "for_sale",
    listing_type: "single_family",
    last_price_change_at: null,
    raw_json: null,
    ...overrides,
  };
}

describe("upsertListing", () => {
  let handle: Database.Database;

  beforeEach(() => {
    handle = new Database(":memory:");
    applySchema(handle);
  });

  it("inserts a new listing on first sight", () => {
    const result = upsertListing(handle, makeListing(), "2026-05-01T10:00:00Z");
    expect(result).toBe("inserted");
    const row = handle.prepare("SELECT * FROM listings WHERE id = ?").get("L1") as Listing;
    expect(row.first_seen_at).toBe("2026-05-01T10:00:00Z");
    expect(row.last_seen_at).toBe("2026-05-01T10:00:00Z");
    expect(row.price).toBe(500000);
  });

  it("creates a price_history row when first inserted", () => {
    upsertListing(handle, makeListing(), "2026-05-01T10:00:00Z");
    const history = handle
      .prepare("SELECT * FROM price_history WHERE listing_id = ?")
      .all("L1");
    expect(history.length).toBe(1);
  });

  it("re-seeing the same listing updates last_seen_at, not first_seen_at", () => {
    upsertListing(handle, makeListing(), "2026-05-01T10:00:00Z");
    upsertListing(handle, makeListing(), "2026-05-02T10:00:00Z");
    const row = handle.prepare("SELECT * FROM listings WHERE id = ?").get("L1") as Listing;
    expect(row.first_seen_at).toBe("2026-05-01T10:00:00Z");
    expect(row.last_seen_at).toBe("2026-05-02T10:00:00Z");
  });

  it("price change creates a price_history row and stamps last_price_change_at", () => {
    upsertListing(handle, makeListing({ price: 500000 }), "2026-05-01T10:00:00Z");
    upsertListing(handle, makeListing({ price: 480000 }), "2026-05-03T10:00:00Z");
    const row = handle.prepare("SELECT * FROM listings WHERE id = ?").get("L1") as Listing;
    expect(row.price).toBe(480000);
    expect(row.last_price_change_at).toBe("2026-05-03T10:00:00Z");
    const history = handle
      .prepare("SELECT * FROM price_history WHERE listing_id = ? ORDER BY seen_at")
      .all("L1") as Array<{ price: number }>;
    expect(history).toHaveLength(2);
    expect(history.map((r) => r.price)).toEqual([500000, 480000]);
  });

  it("unchanged price doesn't add a price_history row", () => {
    upsertListing(handle, makeListing({ price: 500000 }), "2026-05-01T10:00:00Z");
    upsertListing(handle, makeListing({ price: 500000 }), "2026-05-02T10:00:00Z");
    const history = handle
      .prepare("SELECT * FROM price_history WHERE listing_id = ?")
      .all("L1");
    expect(history).toHaveLength(1);
  });

  it("multiple listings coexist independently", () => {
    upsertListing(handle, makeListing({ id: "A" }), "2026-05-01T10:00:00Z");
    upsertListing(handle, makeListing({ id: "B", price: 700000 }), "2026-05-01T10:00:00Z");
    const count = handle.prepare("SELECT COUNT(*) AS n FROM listings").get() as {
      n: number;
    };
    expect(count.n).toBe(2);
  });
});
