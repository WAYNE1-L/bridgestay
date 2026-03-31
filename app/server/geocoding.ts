/**
 * Geocoding utilities for BridgeStay listing import.
 *
 * Uses Nominatim (OpenStreetMap) — free, no API key required.
 * University proximity uses the Haversine formula against the
 * universities already stored in the BridgeStay DB.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  /** Human-readable address returned by Nominatim for display only */
  displayName: string;
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
