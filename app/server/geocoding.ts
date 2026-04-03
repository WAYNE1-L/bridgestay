/**
 * Geocoding utilities for BridgeStay listing import.
 *
 * Uses Nominatim (OpenStreetMap) — free, no API key required.
 * Uses Google Places Text Search through the existing proxy when we need
 * to normalize a building/property name into a reviewable street address.
 * University proximity uses the Haversine formula against the
 * universities already stored in the BridgeStay DB.
 */

import { makeRequest, type PlacesSearchResult } from "./_core/map";

// ── Types ──────────────────────────────────────────────────────────────────

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  /** Human-readable address returned by Nominatim for display only */
  displayName: string;
};

export type PropertyLookupResult = {
  propertyName: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude: number;
  longitude: number;
  confidence: "high" | "medium";
  placeId: string;
};

/** Minimal subset of the University row we actually need */
type UniversityRow = {
  name: string;
  latitude?: string | null;
  longitude?: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
// Nominatim usage policy requires a descriptive User-Agent
const USER_AGENT = "BridgeStay/1.0 (student-housing; contact@bridgestay.com)";
const NEARBY_UNIVERSITIES_RADIUS_MILES = 15;
const PROPERTY_NAME_ALIASES: Record<string, string[]> = {
  bridges: ["bridges apartment homes", "bridges apartments"],
  "avia downtown": ["avia downtown", "avia"],
};

// ── Nominatim geocoding ────────────────────────────────────────────────────

/**
 * Geocode a US address using Nominatim structured search.
 * Falls back to a free-text query if the structured search returns nothing.
 * Returns null when the address cannot be resolved.
 */
export async function geocodeAddress(params: {
  address: string;
  city: string;
  state: string;
  zipCode?: string;
}): Promise<GeocodeResult | null> {
  const { address, city, state, zipCode } = params;

  // ── Attempt 1: structured params (more accurate for US addresses) ───────
  const structured = new URLSearchParams({
    format: "json",
    limit: "1",
    addressdetails: "0",
    street: address,
    city,
    state,
    countrycodes: "us",
  });
  if (zipCode) structured.set("postalcode", zipCode);

  try {
    const r1 = await nominatimFetch(`${NOMINATIM_BASE}?${structured}`);
    if (r1.length > 0) return toGeocodeResult(r1[0]);
  } catch {
    // fall through to free-text attempt
  }

  // ── Attempt 2: free-text fallback ────────────────────────────────────────
  const freeText = [address, city, state, zipCode, "USA"]
    .filter(Boolean)
    .join(", ");
  const loose = new URLSearchParams({
    format: "json",
    limit: "1",
    addressdetails: "0",
    q: freeText,
    countrycodes: "us",
  });

  try {
    const r2 = await nominatimFetch(`${NOMINATIM_BASE}?${loose}`);
    if (r2.length > 0) return toGeocodeResult(r2[0]);
  } catch {
    // both attempts failed
  }

  return null;
}

export async function lookupPropertyLocation(params: {
  propertyName: string;
  city: string;
  state: string;
}): Promise<PropertyLookupResult | null> {
  const aliases = expandPropertyQueries(params.propertyName);
  const city = params.city.trim();
  const state = params.state.trim().toUpperCase();

  let bestMatch: PropertyLookupResult | null = null;
  let bestScore = -Infinity;
  let secondBestScore = -Infinity;

  for (const alias of aliases) {
    const query = `${alias}, ${city}, ${state}`;
    const response = await makeRequest<PlacesSearchResult>(
      "/maps/api/place/textsearch/json",
      { query }
    );

    for (const result of response.results ?? []) {
      const score = scorePropertyMatch(alias, city, state, result);
      if (score > bestScore) {
        secondBestScore = bestScore;
        bestScore = score;
        bestMatch = toPropertyLookupResult(params.propertyName, result, score);
      } else if (score > secondBestScore) {
        secondBestScore = score;
      }
    }
  }

  if (!bestMatch) return null;
  if (bestScore < 5) return null;
  if (secondBestScore > -Infinity && bestScore - secondBestScore < 2) return null;

  return bestMatch;
}

async function nominatimFetch(url: string): Promise<NominatimResult[]> {
  // AbortSignal.timeout() requires Node ≥ 17.3 — use AbortController for
  // broader compatibility.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    return res.json() as Promise<NominatimResult[]>;
  } finally {
    clearTimeout(timer);
  }
}

function toGeocodeResult(r: NominatimResult): GeocodeResult {
  return {
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    displayName: r.display_name,
  };
}

function expandPropertyQueries(propertyName: string): string[] {
  const normalized = normalizePlaceText(propertyName);
  const explicitAliases = PROPERTY_NAME_ALIASES[normalized] ?? [];
  const stripped = stripGenericPropertyTerms(propertyName);

  return Array.from(
    new Set(
      [propertyName.trim(), ...explicitAliases, stripped]
        .map(value => value.trim())
        .filter(Boolean)
    )
  );
}

function scorePropertyMatch(
  alias: string,
  city: string,
  state: string,
  result: PlacesSearchResult["results"][number]
): number {
  const aliasNormalized = normalizePlaceText(alias);
  const resultNameNormalized = normalizePlaceText(result.name);
  const formatted = result.formatted_address.toLowerCase();
  let score = 0;

  if (resultNameNormalized === aliasNormalized) {
    score += 5;
  } else if (
    resultNameNormalized.includes(aliasNormalized) ||
    aliasNormalized.includes(resultNameNormalized)
  ) {
    score += 3;
  }

  if (formatted.includes(city.toLowerCase())) score += 2;
  if (new RegExp(`\\b${escapeRegExp(state)}\\b`, "i").test(result.formatted_address)) {
    score += 1;
  }

  if (
    result.types.some(type =>
      ["premise", "lodging", "establishment", "point_of_interest"].includes(type)
    )
  ) {
    score += 1;
  }

  if (result.business_status && result.business_status !== "OPERATIONAL") {
    score -= 1;
  }

  return score;
}

function toPropertyLookupResult(
  propertyName: string,
  result: PlacesSearchResult["results"][number],
  score: number
): PropertyLookupResult | null {
  const parsed = parseFormattedAddress(result.formatted_address);
  if (!parsed.address) return null;

  return {
    propertyName,
    address: parsed.address,
    city: parsed.city,
    state: parsed.state,
    zipCode: parsed.zipCode,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    confidence: score >= 7 ? "high" : "medium",
    placeId: result.place_id,
  };
}

function parseFormattedAddress(formattedAddress: string) {
  const parts = formattedAddress.split(",").map(part => part.trim()).filter(Boolean);
  const address = parts[0] ?? "";
  const city = parts.length >= 2 ? parts[1] : undefined;
  const stateZip = parts.length >= 3 ? parts[2] : undefined;
  const match = stateZip?.match(/\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/);

  return {
    address,
    city,
    state: match?.[1],
    zipCode: match?.[2],
  };
}

function normalizePlaceText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(apartment|apartments|homes|home|residences?|residence|tower|towers|lofts|loft)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripGenericPropertyTerms(value: string): string {
  return value
    .replace(/\bApartment Homes\b/i, "")
    .replace(/\bApartments\b/i, "")
    .replace(/\bResidences\b/i, "")
    .replace(/\bHomes\b/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

// ── Haversine university proximity ────────────────────────────────────────

/**
 * Return the names of universities within `maxMiles` of (lat, lng).
 * Silently skips rows that have no coordinates.
 */
export function findNearbyUniversities(
  lat: number,
  lng: number,
  universityRows: UniversityRow[],
  maxMiles = NEARBY_UNIVERSITIES_RADIUS_MILES
): string[] {
  const nearby: string[] = [];

  for (const uni of universityRows) {
    if (!uni.latitude || !uni.longitude) continue;
    const uLat = parseFloat(uni.latitude);
    const uLng = parseFloat(uni.longitude);
    if (isNaN(uLat) || isNaN(uLng)) continue;
    if (haversineMiles(lat, lng, uLat, uLng) <= maxMiles) {
      nearby.push(uni.name);
    }
  }

  return nearby;
}

/** Haversine distance between two lat/lng points, in miles */
function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3_958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
