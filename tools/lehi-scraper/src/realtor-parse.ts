/**
 * Pure parsers for Realtor.com listing data.
 *
 * Realtor.com is a Next.js site, so most pages embed a `<script id="__NEXT_DATA__">`
 * block with the page's complete props as JSON. Reading that is dramatically
 * more reliable than scraping the rendered DOM, but the shape changes
 * occasionally — so this module accepts unknown JSON, hunts for the
 * recognizable property fields, and returns null on miss instead of throwing.
 *
 * If __NEXT_DATA__ is missing or unparseable, callers can fall back to DOM
 * extraction (`parseDom`).
 */

export interface ParsedListing {
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
  listing_status: string;
  listing_type: string | null;
  raw_json: string | null;
}

/** Walk a deeply-nested object and return the first value at `key` we hit. */
function findValue(obj: unknown, key: string, depth = 0): unknown {
  if (depth > 8 || obj === null || obj === undefined) return undefined;
  if (typeof obj !== "object") return undefined;

  const record = obj as Record<string, unknown>;
  if (key in record) return record[key];

  for (const v of Object.values(record)) {
    const found = findValue(v, key, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Walk and find the first object that has ALL the named keys. */
function findObjectWithKeys(obj: unknown, keys: string[], depth = 0): Record<string, unknown> | null {
  if (depth > 10 || obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  if (keys.every((k) => k in record)) return record;

  for (const v of Object.values(record)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        const found = findObjectWithKeys(item, keys, depth + 1);
        if (found) return found;
      }
    } else if (typeof v === "object") {
      const found = findObjectWithKeys(v, keys, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,\s]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  return null;
}

/**
 * Parse the `__NEXT_DATA__` JSON blob. Returns null if it doesn't look like a
 * single-property page.
 */
export function parseNextData(json: unknown, fallbackUrl: string): ParsedListing | null {
  // Look for the property record. Realtor's various API versions use
  // nested keys like `pageProps.listing` or `pageProps.property`.
  const property = findObjectWithKeys(json, ["address"]) ??
                   findObjectWithKeys(json, ["location", "list_price"]);
  if (!property) return null;

  const address = property.address ?? findValue(json, "address");
  const addressLine =
    toString((address as Record<string, unknown> | null)?.line) ??
    toString(findValue(json, "line")) ??
    toString(findValue(json, "address_line1"));
  if (!addressLine) return null;

  const city =
    toString((address as Record<string, unknown> | null)?.city) ??
    toString(findValue(json, "city"));
  const postal =
    toString((address as Record<string, unknown> | null)?.postal_code) ??
    toString(findValue(json, "postal_code")) ??
    toString(findValue(json, "zip"));
  if (!postal) return null;

  const coords =
    (address as Record<string, unknown> | null)?.coordinate ??
    findValue(json, "coordinate");
  const lat = toNumber((coords as Record<string, unknown> | null)?.lat);
  const lon = toNumber((coords as Record<string, unknown> | null)?.lon);

  const description = findValue(json, "description") as Record<string, unknown> | undefined;
  const beds =
    toNumber(description?.beds) ??
    toNumber(findValue(json, "beds")) ??
    toNumber(findValue(json, "beds_min"));
  const baths =
    toNumber(description?.baths_consolidated) ??
    toNumber(description?.baths) ??
    toNumber(findValue(json, "baths_consolidated")) ??
    toNumber(findValue(json, "baths"));
  const sqft =
    toNumber(description?.sqft) ??
    toNumber(findValue(json, "sqft")) ??
    toNumber(findValue(json, "building_size"));

  const lot =
    description?.lot_sqft ??
    findValue(json, "lot_sqft") ??
    findValue(json, "lot_size");
  const lotSqft = toNumber(
    typeof lot === "object" && lot !== null
      ? (lot as Record<string, unknown>).size
      : lot
  );

  const yearBuilt =
    toNumber(description?.year_built) ??
    toNumber(findValue(json, "year_built"));

  const price =
    toNumber(findValue(json, "list_price")) ??
    toNumber(findValue(json, "price"));

  const status =
    toString(findValue(json, "status")) ??
    toString(findValue(json, "listing_status")) ??
    "for_sale";

  const propertyType =
    toString(description?.type) ??
    toString(findValue(json, "prop_type")) ??
    toString(findValue(json, "property_type"));

  const id =
    toString(findValue(json, "property_id")) ??
    toString(findValue(json, "listing_id")) ??
    toString(findValue(json, "mpr_id")) ??
    extractIdFromUrl(fallbackUrl);
  if (!id) return null;

  return {
    id,
    url: fallbackUrl,
    address: addressLine,
    city,
    zip: postal,
    price,
    bed: beds,
    bath: baths,
    sqft,
    lot_sqft: lotSqft,
    year_built: yearBuilt,
    lat,
    lon,
    listing_status: status,
    listing_type: propertyType,
    raw_json: JSON.stringify(property).slice(0, 8192), // cap to keep DB sane
  };
}

/**
 * Try to pull a stable identifier out of the URL.
 * e.g. /realestateandhomes-detail/123-Main-St_Lehi_UT_84043_M12345-67890
 */
export function extractIdFromUrl(url: string): string | null {
  // Realtor IDs typically end the URL after the last `_`. Look for `M\d+-\d+`.
  const m = url.match(/M\d+-\d+/);
  if (m) return m[0];
  // Fallback: last meaningful segment
  const segments = url.replace(/\/+$/, "").split("/");
  const last = segments[segments.length - 1];
  return last && last.length > 0 ? last : null;
}

export interface DomFields {
  address: string | null;
  price: string | null;
  beds: string | null;
  baths: string | null;
  sqft: string | null;
  lotSize: string | null;
  city: string | null;
  zip: string | null;
}

/**
 * Fallback parser: best-effort interpretation of strings scraped from the DOM.
 * Used only when __NEXT_DATA__ is absent. Returns null on hopeless input.
 */
export function parseDom(fields: DomFields, url: string): ParsedListing | null {
  if (!fields.address || !fields.zip) return null;

  const id = extractIdFromUrl(url);
  if (!id) return null;

  return {
    id,
    url,
    address: fields.address,
    city: fields.city,
    zip: fields.zip,
    price: toNumber(fields.price?.replace(/[^\d.]/g, "")),
    bed: toNumber(fields.beds?.match(/[\d.]+/)?.[0]),
    bath: toNumber(fields.baths?.match(/[\d.]+/)?.[0]),
    sqft: toNumber(fields.sqft?.replace(/[^\d]/g, "")),
    lot_sqft: parseLotString(fields.lotSize),
    year_built: null,
    lat: null,
    lon: null,
    listing_status: "for_sale",
    listing_type: null,
    raw_json: null,
  };
}

/** "0.25 acres" → 10890; "5,000 sqft" → 5000. */
export function parseLotString(input: string | null): number | null {
  if (!input) return null;
  const numMatch = input.match(/([\d.,]+)/);
  if (!numMatch) return null;
  const num = Number(numMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  if (/acre/i.test(input)) return Math.round(num * 43560);
  return Math.round(num);
}
