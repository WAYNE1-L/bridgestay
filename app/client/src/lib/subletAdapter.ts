/**
 * Adapts a db apartments row (returned by sublets.list / sublets.getById)
 * into the MockSublet shape so all card/map components work unchanged.
 */

import type { MockSublet, MockSubletContact } from "./subletMockData";

export function adaptDbRowToSublet(row: Record<string, unknown>): MockSublet {
  const num = (k: string, fallback = 0): number => {
    const v = row[k];
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };
  const str = (k: string, fallback = ""): string => {
    const v = row[k];
    return typeof v === "string" ? v : fallback;
  };
  const arr = (k: string): string[] => {
    const v = row[k];
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
    if (typeof v === "string") {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  const dateIso = (k: string): string => {
    const v = row[k];
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "string") return v.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  };

  const wechatContact =
    typeof row.wechatContact === "string" && row.wechatContact.trim()
      ? row.wechatContact.trim()
      : undefined;

  const contact: MockSubletContact = wechatContact
    ? { primary: "wechat", wechatId: wechatContact }
    : { primary: "email", email: "contact@bridgestay.local" };

  return {
    id: String(row.id ?? ""),
    title: str("title", "Sublet listing"),
    titleZh: typeof row.titleZh === "string" ? row.titleZh : undefined,
    address: str("address"),
    city: str("city", "Salt Lake City"),
    state: str("state", "UT"),
    zipCode: str("zipCode"),
    area: "u_district",
    latitude: num("latitude", 40.7649),
    longitude: num("longitude", -111.8421),
    monthlyRent: num("monthlyRent"),
    securityDeposit: num("securityDeposit"),
    bedrooms: num("bedrooms"),
    bathrooms: num("bathrooms"),
    squareFeet: row.squareFeet != null ? num("squareFeet") : null,
    amenities: arr("amenities"),
    subleaseEndDate: dateIso("subleaseEndDate"),
    availableFrom: dateIso("availableFrom"),
    petsAllowed: Boolean(row.petsAllowed),
    parkingIncluded: Boolean(row.parkingIncluded),
    nearbyUniversities: arr("nearbyUniversities"),
    distanceToUofU: 0,
    source: "manual_other",
    wechatContact,
    contact,
    description: str("description"),
    hostIsStudent: false,
    images: arr("images"),
  };
}
