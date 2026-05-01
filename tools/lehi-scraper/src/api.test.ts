import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import Database from "better-sqlite3";
import { applySchema, upsertListing, type Listing } from "./db";
import { createApiRouter } from "./api";

function seed(handle: Database.Database): void {
  const make = (overrides: Partial<Listing>): Omit<Listing, "first_seen_at" | "last_seen_at"> => ({
    id: "X",
    url: "https://example.com",
    address: "1 Main",
    city: "Lehi",
    zip: "84043",
    price: 500_000,
    bed: 3,
    bath: 2,
    sqft: 1800,
    lot_sqft: 5000,
    year_built: 2018,
    lat: 40.485,
    lon: -111.882,
    distance_to_morning_vista_mi: 0.05,
    listing_status: "for_sale",
    listing_type: "single_family",
    last_price_change_at: null,
    raw_json: null,
    ...overrides,
  });

  upsertListing(handle, make({ id: "A", price: 350_000, bed: 2, distance_to_morning_vista_mi: 0.5 }));
  upsertListing(handle, make({ id: "B", price: 500_000, bed: 3, distance_to_morning_vista_mi: 1.5 }));
  upsertListing(handle, make({ id: "C", price: 700_000, bed: 4, distance_to_morning_vista_mi: 3.0 }));
  upsertListing(handle, make({ id: "D", price: 900_000, bed: 5, distance_to_morning_vista_mi: 6.0 }));
  upsertListing(handle, make({ id: "PENDING", price: 600_000, listing_status: "pending" }));
  upsertListing(handle, make({ id: "SOLD", price: 450_000, listing_status: "sold" }));
}

async function makeRequest(app: express.Express, url: string): Promise<{ status: number; body: any }> {
  // Tiny inline supertest replacement so we don't pull a new dep.
  const server = app.listen(0);
  const port = (server.address() as any).port;
  try {
    const r = await fetch(`http://127.0.0.1:${port}${url}`);
    const body = await r.json();
    return { status: r.status, body };
  } finally {
    server.close();
  }
}

describe("/api/listings", () => {
  let app: express.Express;
  let handle: Database.Database;

  beforeEach(() => {
    handle = new Database(":memory:");
    applySchema(handle);
    seed(handle);
    app = express();
    app.use("/api", createApiRouter(handle));
  });

  it("returns all for_sale listings by default", async () => {
    const { status, body } = await makeRequest(app, "/api/listings");
    expect(status).toBe(200);
    expect(body.count).toBe(4); // A, B, C, D — pending and sold excluded
    const ids = body.listings.map((r: any) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["A", "B", "C", "D"]));
    expect(ids).not.toContain("PENDING");
    expect(ids).not.toContain("SOLD");
  });

  it("minPrice filter excludes lower-priced listings", async () => {
    const { body } = await makeRequest(app, "/api/listings?minPrice=600000");
    const ids = body.listings.map((r: any) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["C", "D"]));
    expect(ids).not.toContain("A");
    expect(ids).not.toContain("B");
  });

  it("minBed=4 keeps only listings with 4+ bedrooms", async () => {
    const { body } = await makeRequest(app, "/api/listings?minBed=4");
    expect(body.listings.map((r: any) => r.id).sort()).toEqual(["C", "D"]);
  });

  it("maxDistanceMi=2 keeps only close listings", async () => {
    const { body } = await makeRequest(app, "/api/listings?maxDistanceMi=2");
    expect(body.listings.map((r: any) => r.id).sort()).toEqual(["A", "B"]);
  });

  it("sortBy=price&order=asc returns cheapest first", async () => {
    const { body } = await makeRequest(app, "/api/listings?sortBy=price&order=asc");
    const prices = body.listings.map((r: any) => r.price);
    expect(prices).toEqual([350_000, 500_000, 700_000, 900_000]);
  });

  it("status=sold returns only sold listings", async () => {
    const { body } = await makeRequest(app, "/api/listings?status=sold");
    expect(body.listings.map((r: any) => r.id)).toEqual(["SOLD"]);
  });

  it("rejects invalid sortBy", async () => {
    const { status, body } = await makeRequest(app, "/api/listings?sortBy=DROP_TABLE");
    expect(status).toBe(400);
    expect(body.error).toMatch(/sortBy/);
  });
});

describe("/api/listings/:id", () => {
  let app: express.Express;
  let handle: Database.Database;

  beforeEach(() => {
    handle = new Database(":memory:");
    applySchema(handle);
    seed(handle);
    app = express();
    app.use("/api", createApiRouter(handle));
  });

  it("returns the listing plus its price history", async () => {
    const { status, body } = await makeRequest(app, "/api/listings/A");
    expect(status).toBe(200);
    expect(body.listing.id).toBe("A");
    expect(Array.isArray(body.priceHistory)).toBe(true);
    expect(body.priceHistory.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 404 for missing id", async () => {
    const { status } = await makeRequest(app, "/api/listings/NONE");
    expect(status).toBe(404);
  });
});

describe("/api/summary", () => {
  it("returns totals + last run", async () => {
    const handle = new Database(":memory:");
    applySchema(handle);
    seed(handle);
    const app = express();
    app.use("/api", createApiRouter(handle));

    const { status, body } = await makeRequest(app, "/api/summary");
    expect(status).toBe(200);
    expect(body.totals.total).toBe(6);
    expect(body.totals.for_sale).toBe(4);
    expect(body.totals.pending).toBe(1);
    expect(body.totals.sold).toBe(1);
  });
});
