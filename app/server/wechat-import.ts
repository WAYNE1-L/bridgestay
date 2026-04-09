import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

export type ImportIssueCode =
  | "gemini_unavailable"
  | "gemini_invalid_json"
  | "gemini_truncated"
  | "schema_mismatch"
  | "duplicate_content_removed"
  | "multiple_listing_candidates"
  | "conflicting_addresses"
  | "best_candidate_selected"
  | "property_name_only";

export type ImportDiagnostic = {
  code: ImportIssueCode;
  severity: "info" | "warning";
  message: string;
};

export type ExtractedLocationCandidate = {
  rawAddressText?: string;
  rawPropertyName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  evidenceType:
    | "street_address"
    | "property_name"
    | "city_state_only"
    | "conflicting"
    | "missing";
  confidence: "high" | "medium" | "low";
  issues: Array<
    | "multiple_candidates"
    | "conflicting_addresses"
    | "missing_city_or_state"
    | "property_name_only"
    | "address_incomplete"
  >;
};

// ── Extracted listing shape ────────────────────────────────────────────────
export type ExtractedListing = {
  title: string;
  description?: string;
  propertyType?: "apartment" | "studio" | "house" | "room" | "condo" | "townhouse";
  propertyName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  monthlyRent?: number;
  securityDeposit?: number;
  availableFrom?: string;        // ISO-8601 date string
  petsAllowed?: boolean;
  parkingIncluded?: boolean;
  amenities?: string[];
  utilitiesIncluded?: string[];  // e.g. ["Water", "Electric", "Internet"]
  isSublease?: boolean;          // true when listing is a sublease
  subleaseEndDate?: string;      // ISO-8601 end date for the sublease term
  leaseTerm?: number;            // duration in months (for minLeaseTerm/maxLeaseTerm)
  furnished?: boolean;           //带家具 → auto-adds "Furnished" to amenities
  wechatContact?: string;
  confidence: "high" | "medium" | "low";
  extractionSource?: "gemini" | "heuristic-fallback";
  extractionWarning?: string;
  extractionWarnings?: string[];
  locationSource?: "direct_text" | "place_lookup" | "unresolved";
  locationConfidence?: "high" | "medium" | "low";
  duplicateContentRemoved?: boolean;
  multipleListingCandidatesDetected?: boolean;
  conflictingAddressesDetected?: boolean;
  extractedFromBestCandidateChunk?: boolean;
  candidateChunkCount?: number;
  truncatedPreviewOfOtherChunks?: string[];
  otherCandidateChunks?: string[];
};

export type ExtractListingResponse = ExtractedListing & {
  listing: ExtractedListing;
  locationCandidate: ExtractedLocationCandidate;
  diagnostics: ImportDiagnostic[];
};

// ── JSON schema for structured LLM output ─────────────────────────────────
// NOTE: strict:true is intentionally omitted.
// Gemini's OpenAI-compat strict mode requires every property to appear in
// "required" — but most fields here are optional by design, so strict mode
// would return a 400 error. Without strict, Gemini still returns valid JSON
// that respects the schema shape.
const LISTING_OUTPUT_SCHEMA = {
  name: "apartment_listing",
  schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Short English listing title, e.g. '2BR Apartment near UCLA'",
      },
      description: {
        type: "string",
        description: "Full English description of the property",
      },
      propertyName: {
        type: "string",
        description: "Property or building name only, e.g. 'Bridges Apartment Homes'. If only a building name is mentioned, put it here and omit address.",
      },
      propertyType: {
        type: "string",
        enum: ["apartment", "studio", "house", "room", "condo", "townhouse"],
      },
      address: { type: "string" },
      city: { type: "string" },
      state: {
        type: "string",
        description: "2-letter US state abbreviation, e.g. CA",
      },
      zipCode: { type: "string" },
      bedrooms: { type: "number" },
      bathrooms: { type: "number" },
      squareFeet: { type: "number" },
      monthlyRent: {
        type: "number",
        description: "Monthly rent in USD (numeric only)",
      },
      securityDeposit: {
        type: "number",
        description: "Security deposit in USD (numeric only)",
      },
      availableFrom: {
        type: "string",
        description: "Move-in date as an ISO-8601 string, e.g. 2026-04-01",
      },
      petsAllowed: { type: "boolean" },
      parkingIncluded: { type: "boolean" },
      amenities: {
        type: "array",
        items: { type: "string" },
        description: "List of amenities in English (exclude utilities and furnished — those go in separate fields)",
      },
      utilitiesIncluded: {
        type: "array",
        items: { type: "string" },
        description: "Utilities included in rent, e.g. ['Water', 'Electric', 'Gas', 'Internet', 'Trash']. Only include utilities explicitly mentioned as included.",
      },
      isSublease: {
        type: "boolean",
        description: "true if this is a sublease (转租/转让/sublease), false if it's a direct lease from a landlord/property manager",
      },
      subleaseEndDate: {
        type: "string",
        description: "End date of the sublease as ISO-8601 (YYYY-MM-DD). Only set if isSublease is true and an end date is mentioned.",
      },
      leaseTerm: {
        type: "number",
        description: "Lease duration in months. For subleases, compute from availableFrom to subleaseEndDate. For regular leases, extract from text.",
      },
      furnished: {
        type: "boolean",
        description: "true if the unit is furnished (带家具/furnished/家具齐全). If furniture is not mentioned, omit this field.",
      },
      wechatContact: {
        type: "string",
        description: "Landlord or sublessor WeChat ID if mentioned",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description:
          "'high' if rent + location + bedrooms are all clear; 'medium' if some are missing; 'low' if very sparse",
      },
    },
    required: ["title", "confidence"],
    additionalProperties: false,
  },
};

// ── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a real estate data extraction assistant specializing in Chinese-language WeChat rental listings for international students in the United States.

The input may be Chinese text, English text, or a mixed-language WeChat screenshot. Extract all available rental listing information and return it in English (translate Chinese content).

Key Chinese rental terms to recognize:
• 月租 / 月付 / 每月 → monthly rent
• 押金 / 保证金 → security deposit
• 卧室 / 房间 / 室 → bedrooms (e.g. 2室 = 2 bedrooms)
• 卫生间 / 洗手间 / 卫 → bathrooms (e.g. 1卫 = 1 bathroom)
• 平方英尺 / sqft / 平方 → square footage
• 允许宠物 / 可养宠物 / 宠物友好 → pets allowed
• 停车位 / 停车 / 含车位 → parking included
• 可入住 / 入住日期 / 最早入住 → available from date
• 微信 / WX / WeChat → WeChat contact ID
• 公寓 → apartment, 工作室 / 开间 → studio, 独栋 / 独立屋 → house, 单间 / 独立房间 → room

Sublease terms (very common in WeChat):
• 转租 / 转让 / sublease / sublet → isSublease = true
• 合同到期 / 租约到 / 到期日 / lease ends / until [month year] → subleaseEndDate
• 剩余X个月 / X months remaining → leaseTerm = X

Utilities (水电网/水费/电费/网费 etc.):
• 含水电 / 水电全包 / utilities included → list which ones in utilitiesIncluded
• 含网 / WiFi included / 网费 → "Internet" in utilitiesIncluded
• 含水 / water included → "Water" in utilitiesIncluded
• 含电 / electric included → "Electric" in utilitiesIncluded
• 含气 / gas included → "Gas" in utilitiesIncluded

Furniture:
• 带家具 / 家具齐全 / fully furnished / furnished → furnished = true
• 不带家具 / 空房 / unfurnished → furnished = false

For prices shown as $1,800 or ¥1800 or 1800美金, extract the numeric USD value only.
For dates, output ISO-8601 format (YYYY-MM-DD). If only a month/year is given, use the 1st of that month.
For US state, infer from city if not explicitly stated (e.g. Los Angeles → CA, New York → NY).
If the text mentions only a property/building name and not a street address, put the building name in propertyName and omit address. Never invent or guess a street address.
If a field cannot be determined, omit it entirely (do not guess).

MULTI-LISTING INPUT:
The input may contain multiple distinct rental listings pasted together. If so:
• Extract data from only the single most complete listing (the one with the clearest rent, address, and bedroom details).
• Set confidence to "medium" or "low" to indicate the ambiguity.
• Do NOT merge data from different listings into one result.

ADDRESS HANDLING:
• Lines with "Address:", "地址:", or "📍地址:" contain verified street addresses — highest priority.
• Full US street addresses (number + street + city, state, zip) are second priority.
• Street-like fragments without city/state are lower priority.
• Property/building names (e.g. "Lattice Apartment") go in propertyName, NOT in address.
• Never substitute a property name for a street address.`;

// ── City/state lookup table for heuristic extraction ──────────────────────
const CITY_PATTERNS: Array<[RegExp, string, string]> = [
  [/los angeles|ucla|usc|\bla\b|洛杉矶|南加/i,         "Los Angeles",    "CA"],
  [/san francisco|\bsf\b|berkeley|stanford|旧金山|湾区/i, "San Francisco",  "CA"],
  [/san diego|ucsd|圣地亚哥/i,                           "San Diego",      "CA"],
  [/irvine|uci|orange county|尔湾/i,                    "Irvine",         "CA"],
  [/new york|\bnyc\b|columbia|nyu|纽约/i,               "New York",       "NY"],
  [/chicago|uchicago|northwestern|芝加哥/i,             "Chicago",        "IL"],
  [/boston|mit\b|harvard|波士顿/i,                      "Boston",         "MA"],
  [/seattle|\buw\b|washington|西雅图/i,                 "Seattle",        "WA"],
  [/salt lake|\bslc\b|\buofu\b|犹他|盐湖城/i,           "Salt Lake City", "UT"],
  [/austin|ut austin|奥斯汀/i,                          "Austin",         "TX"],
  [/houston|rice university|休斯顿/i,                   "Houston",        "TX"],
  [/dallas|smu|达拉斯/i,                                "Dallas",         "TX"],
  [/atlanta|georgia tech|emory|亚特兰大/i,              "Atlanta",        "GA"],
  [/miami|florida|迈阿密/i,                             "Miami",          "FL"],
  [/minneapolis|umn|明尼阿波利斯/i,                     "Minneapolis",    "MN"],
  [/columbus|ohio state|哥伦布/i,                       "Columbus",       "OH"],
  [/ann arbor|umich|密歇根/i,                           "Ann Arbor",      "MI"],
  [/pittsburgh|cmu|carnegie|匹兹堡/i,                   "Pittsburgh",     "PA"],
  [/philadelphia|penn|drexel|费城/i,                    "Philadelphia",   "PA"],
  [/washington.?dc|\bdc\b|georgetown|george mason/i,    "Washington",     "DC"],
];

/**
 * Regex-based heuristic extraction used when BUILT_IN_FORGE_API_KEY is absent.
 * Handles common Chinese/English WeChat listing patterns.
 * Returns confidence:"low" always — the user can correct fields before saving.
 */
function heuristicExtraction(params: {
  text?: string;
  imageBase64?: string;
}): ExtractedListing {
  const raw = params.text ?? "";

  // ── Rent ─────────────────────────────────────────────────────────────────
  // Matches: $1,800  |  $1800/mo  |  月租$1800  |  1800/month  |  1800美金
  const rentMatch =
    raw.match(/\$\s*([\d,]+)\s*(?:\/mo(?:nth)?)?/i) ??
    raw.match(/(?:月租|月付|rent)[^\d]*([\d,]+)/i) ??
    raw.match(/([\d,]{4,})\s*(?:\/mo(?:nth)?|美金|usd|美元)/i);
  const monthlyRent = rentMatch
    ? parseInt(rentMatch[1].replace(/,/g, ""), 10) || undefined
    : undefined;

  // ── Bedrooms / bathrooms ──────────────────────────────────────────────────
  // Matches: 2BR | 2bd | 2 bed | 2卧 | 2室 | 2房间 | 2B1B (bedrooms from first digit)
  const bedMatch =
    raw.match(/(\d)\s*(?:br|bd|bed(?:room)?s?)\b/i) ??
    raw.match(/(\d)\s*(?:卧室?|室|房间)/) ??
    raw.match(/(\d)[Bb]\s*\d[Bb]/); // 2B1B pattern — first digit is bedrooms
  const bedrooms = bedMatch ? parseInt(bedMatch[1], 10) : undefined;

  // Matches: 1BA | 1bath | 1卫 | 2B1B (bathrooms from second digit)
  const bathMatch =
    raw.match(/(\d)\s*(?:ba|bath(?:room)?s?)\b/i) ??
    raw.match(/(\d)\s*(?:卫生间?|卫|洗手间)/) ??
    raw.match(/\d[Bb]\s*(\d)[Bb]/); // 2B1B pattern — second digit
  const bathrooms = bathMatch ? parseInt(bathMatch[1], 10) : undefined;

  // ── Square footage ────────────────────────────────────────────────────────
  const sqftMatch =
    raw.match(/([\d,]+)\s*(?:sq\.?\s*ft\.?|sqft|square feet)/i) ??
    raw.match(/([\d,]+)\s*平方英尺/);
  const squareFeet = sqftMatch
    ? parseInt(sqftMatch[1].replace(/,/g, ""), 10) || undefined
    : undefined;

  // ── City / state ──────────────────────────────────────────────────────────
  let city: string | undefined;
  let state: string | undefined;
  for (const [pattern, c, s] of CITY_PATTERNS) {
    if (pattern.test(raw)) {
      city = c;
      state = s;
      break;
    }
  }

  // ── Property type ─────────────────────────────────────────────────────────
  let propertyType: ExtractedListing["propertyType"];
  if (/studio|开间|工作室/i.test(raw) || bedrooms === 0) {
    propertyType = "studio";
  } else if (/独栋|独立屋|\bhouse\b/i.test(raw)) {
    propertyType = "house";
  } else if (/单间|独立房间|\broom\b/i.test(raw)) {
    propertyType = "room";
  } else if (/condo|共管/i.test(raw)) {
    propertyType = "condo";
  } else if (/townhouse|联排/i.test(raw)) {
    propertyType = "townhouse";
  } else {
    propertyType = "apartment";
  }

  // ── Sublease ──────────────────────────────────────────────────────────────
  const isSublease = /转租|转让|sublease|sublet/i.test(raw) || undefined;

  // ── Available-from date ───────────────────────────────────────────────────
  // ISO date: 2026-05-01 or 2026/05/01
  const isoMatch = raw.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
  // "May 1" / "5/1" / "5月1日"
  const relativeMatch = raw.match(/(\d{1,2})[月/](\d{1,2})[日号]?/);
  let availableFrom: string | undefined;
  if (isoMatch) {
    availableFrom = isoMatch[1].replace(/\//g, "-");
  } else if (relativeMatch) {
    const year = new Date().getFullYear();
    const mm = relativeMatch[1].padStart(2, "0");
    const dd = relativeMatch[2].padStart(2, "0");
    availableFrom = `${year}-${mm}-${dd}`;
  }

  // ── Pets / parking ────────────────────────────────────────────────────────
  const petsAllowed =
    /允许宠物|可养宠|宠物友好|pet.?friendly|pets?\s*(ok|allowed)/i.test(raw) ||
    undefined;
  const parkingIncluded =
    /停车位|含车位|parking\s*(?:included|free)|免费停车/i.test(raw) ||
    undefined;

  // ── Furnished ─────────────────────────────────────────────────────────────
  const furnished =
    /带家具|家具齐全|fully.?furnished|\bfurnished\b/i.test(raw) || undefined;

  // ── Utilities ─────────────────────────────────────────────────────────────
  const utilitiesIncluded: string[] = [];
  if (/水电全包|all utilities|utilities included/i.test(raw))
    utilitiesIncluded.push("Water", "Electric", "Gas");
  else {
    if (/含水|water included|水费/i.test(raw)) utilitiesIncluded.push("Water");
    if (/含电|electric|电费/i.test(raw)) utilitiesIncluded.push("Electric");
    if (/含气|gas included|气费/i.test(raw)) utilitiesIncluded.push("Gas");
    if (/含网|wifi|internet|网费/i.test(raw)) utilitiesIncluded.push("Internet");
  }

  // ── WeChat ID ─────────────────────────────────────────────────────────────
  const wechatMatch = raw.match(
    /(?:微信|wechat|wx)[号码id：:＝=\s]*([A-Za-z0-9_\-]{4,20})/i
  );
  const wechatContact = wechatMatch?.[1];

  // ── Security deposit ──────────────────────────────────────────────────────
  const depositMatch =
    raw.match(/(?:押金|保证金|deposit)[^\d]*([\d,]+)/i) ??
    raw.match(/\$\s*([\d,]+)\s*(?:deposit|押金)/i);
  const securityDeposit = depositMatch
    ? parseInt(depositMatch[1].replace(/,/g, ""), 10) || undefined
    : undefined;

  // ── Address (tiered priority) ─────────────────────────────────────────
  // Tier 1: Explicit label — Address: / 地址: / 📍地址:
  const tier1Match = raw.match(
    /(?:address|地址|addr)\s*[:：]\s*([^\n]+)/i
  );
  const tier1 = tier1Match?.[1]?.trim();
  // Tier 2: Full US address — number + street, city, STATE zip
  const tier2Match = raw.match(
    /(\d{1,6}\s+[^,\n]{3,40},\s*[A-Za-z\s]{2,30},\s*[A-Z]{2}\s+\d{5})/
  );
  const tier2 = tier2Match?.[1]?.trim();
  // Tier 3: Street-like fragment (number + street suffix word)
  const tier3Match = raw.match(
    /(\d{1,6}\s+[A-Za-z0-9\s.]+\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|pkwy|place|pl|terrace|ter|circle|cir)\b[^\n,]*)/i
  );
  const tier3 = tier3Match?.[1]?.trim();
  const address = (tier1 && tier1.length >= 5 ? tier1 : undefined)
    ?? tier2
    ?? tier3;

  const propertyNameMatch = raw.match(
    /([A-Z][A-Za-z0-9&.'\- ]{2,80}(?:Apartment Homes|Apartments|Residences|Residence|Homes|Commons|Village|Lofts|Tower|Towers|Townhomes?))/m
  );
  const propertyName = propertyNameMatch?.[1]?.trim();

  // ── Build title ───────────────────────────────────────────────────────────
  const parts: string[] = [];
  if (bedrooms !== undefined) parts.push(`${bedrooms}BR`);
  if (bathrooms !== undefined) parts.push(`${bathrooms}BA`);
  parts.push(propertyType === "studio" ? "Studio" : propertyType === "house" ? "House" : "Apartment");
  if (isSublease) parts.push("Sublease");
  if (city) parts.push(`near ${city}`);
  const title = parts.join(" ") || "Rental Listing";

  // ── Confidence ────────────────────────────────────────────────────────────
  const filledCount = [monthlyRent, city, bedrooms].filter(Boolean).length;
  const confidence: ExtractedListing["confidence"] =
    filledCount >= 2 ? "medium" : "low";

  return {
    title,
    propertyType,
    propertyName,
    address,
    monthlyRent,
    securityDeposit,
    bedrooms,
    bathrooms,
    squareFeet,
    city,
    state,
    availableFrom,
    petsAllowed,
    parkingIncluded,
    furnished,
    utilitiesIncluded: utilitiesIncluded.length ? utilitiesIncluded : undefined,
    isSublease,
    wechatContact,
    confidence,
    extractionSource: "heuristic-fallback",
  };
}

function looksLikeStreetAddress(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim();
  if (!/\d/.test(normalized) || !/[A-Za-z]/.test(normalized)) return false;
  return (
    /\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|parkway|pkwy|place|pl|terrace|ter|circle|cir)\b/i.test(normalized) ||
    /^\d{1,6}\s+[A-Za-z0-9]/.test(normalized)
  );
}

function mergeWarnings(...messages: Array<string | undefined>): string | undefined {
  const unique = Array.from(new Set(messages.map(value => value?.trim()).filter(Boolean)));
  return unique.length ? unique.join(" | ") : undefined;
}

function toDiagnostic(
  code: ImportIssueCode,
  severity: "info" | "warning",
  message: string
): ImportDiagnostic {
  return { code, severity, message };
}

function diagnosticsToWarnings(diagnostics: ImportDiagnostic[]): {
  extractionWarning?: string;
  extractionWarnings?: string[];
} {
  const messages = diagnostics.map((diagnostic) => diagnostic.message);
  return {
    extractionWarning: mergeWarnings(...messages),
    extractionWarnings: messages.length ? messages : undefined,
  };
}

export function deriveLocationCandidate(listing: ExtractedListing): ExtractedLocationCandidate {
  const rawAddressText = looksLikeStreetAddress(listing.address)
    ? listing.address?.trim()
    : undefined;
  const rawPropertyName = listing.propertyName?.trim()
    || (!rawAddressText && listing.address && !looksLikeStreetAddress(listing.address)
      ? listing.address.trim()
      : undefined);

  const issues: ExtractedLocationCandidate["issues"] = [];
  if (listing.multipleListingCandidatesDetected) issues.push("multiple_candidates");
  if (listing.conflictingAddressesDetected) issues.push("conflicting_addresses");

  let evidenceType: ExtractedLocationCandidate["evidenceType"] = "missing";
  let confidence: ExtractedLocationCandidate["confidence"] = "low";

  if (listing.conflictingAddressesDetected) {
    evidenceType = "conflicting";
  } else if (rawAddressText) {
    evidenceType = "street_address";
    if (!listing.city || !listing.state) issues.push("address_incomplete");
    confidence = listing.city && listing.state ? "high" : "medium";
  } else if (rawPropertyName) {
    evidenceType = "property_name";
    issues.push("property_name_only");
    if (!listing.city || !listing.state) issues.push("missing_city_or_state");
    confidence = listing.city && listing.state ? "medium" : "low";
  } else if (listing.city || listing.state) {
    evidenceType = "city_state_only";
    issues.push("address_incomplete");
    if (!listing.city || !listing.state) issues.push("missing_city_or_state");
    confidence = listing.city && listing.state ? "medium" : "low";
  }

  return {
    rawAddressText,
    rawPropertyName,
    city: listing.city,
    state: listing.state,
    zipCode: listing.zipCode,
    evidenceType,
    confidence,
    issues,
  };
}

function diagnosticsFromPreprocess(preprocess: PreprocessResult | null): ImportDiagnostic[] {
  if (!preprocess) return [];

  const diagnostics: ImportDiagnostic[] = [];
  if (preprocess.duplicateContentRemoved) {
    diagnostics.push(
      toDiagnostic(
        "duplicate_content_removed",
        "info",
        "Duplicate repeated content was removed before extraction"
      )
    );
  }
  if (preprocess.multipleListingCandidatesDetected) {
    diagnostics.push(
      toDiagnostic(
        "multiple_listing_candidates",
        "warning",
        `Input appears to contain ~${preprocess.listingCount} listings; extraction covers the strongest candidate`
      )
    );
  }
  if (preprocess.conflictingAddressesDetected) {
    diagnostics.push(
      toDiagnostic(
        "conflicting_addresses",
        "warning",
        "Conflicting addresses were detected across candidate listings"
      )
    );
  }
  if (preprocess.extractedFromBestCandidateChunk) {
    diagnostics.push(
      toDiagnostic(
        "best_candidate_selected",
        "info",
        "Extraction used the strongest candidate chunk from multi-listing input"
      )
    );
  }
  return diagnostics;
}

function applyLegacyLocationFields(
  listing: ExtractedListing,
  locationCandidate: ExtractedLocationCandidate
): ExtractedListing {
  const propertyName = listing.propertyName?.trim()
    || (!looksLikeStreetAddress(listing.address) ? listing.address?.trim() : undefined);

  if (locationCandidate.evidenceType === "street_address") {
    return {
      ...listing,
      propertyName,
      address: locationCandidate.rawAddressText,
      locationSource: "direct_text",
      locationConfidence: locationCandidate.confidence,
    };
  }

  if (locationCandidate.evidenceType === "property_name") {
    return {
      ...listing,
      propertyName,
      address: undefined,
      latitude: undefined,
      longitude: undefined,
      locationSource: "unresolved",
      locationConfidence: locationCandidate.confidence,
    };
  }

  if (locationCandidate.evidenceType === "conflicting") {
    return {
      ...listing,
      propertyName,
      locationSource: "unresolved",
      locationConfidence: "low",
    };
  }

  return {
    ...listing,
    propertyName,
  };
}

function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function findFirstJsonObjectBlock(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  return raw.slice(start).trim() || null;
}

function summarizeRawForLog(raw: string) {
  return {
    length: raw.length,
    preview: raw.slice(0, 300),
    tail: raw.slice(-300),
  };
}

function logFullRawGeminiResponseOnFailure(raw: string, context: Record<string, unknown>) {
  console.error("[WeChat Import] Full raw Gemini response on parse failure:", {
    ...context,
    ...summarizeRawForLog(raw),
    raw,
  });
}

function isProbablyTruncated(raw: string, finishReason?: string | null) {
  if (finishReason && /length|max_tokens/i.test(finishReason)) {
    return true;
  }

  const candidate = stripMarkdownFences(raw);
  const openBraces = (candidate.match(/{/g) || []).length;
  const closeBraces = (candidate.match(/}/g) || []).length;
  return openBraces > closeBraces;
}

function normalizeParsedListing(value: unknown): ExtractedListing {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("schema mismatch: root is not a JSON object");
  }

  const parsed = value as Record<string, unknown>;
  if (typeof parsed.title !== "string" || parsed.title.trim().length === 0) {
    throw new Error("schema mismatch: missing title");
  }
  if (
    parsed.confidence !== "high" &&
    parsed.confidence !== "medium" &&
    parsed.confidence !== "low"
  ) {
    throw new Error("schema mismatch: missing or invalid confidence");
  }

  return parsed as unknown as ExtractedListing;
}

function parseGeminiListingResponse(params: {
  raw: string;
  finishReason?: string | null;
}): {
  parsed?: ExtractedListing;
  parseIssue?: "invalid JSON from Gemini" | "truncated response" | "schema mismatch";
  strategy?: "raw" | "stripped fences" | "extracted JSON block";
} {
  const candidates: Array<{
    label: "raw" | "stripped fences" | "extracted JSON block";
    value: string;
  }> = [];

  const stripped = stripMarkdownFences(params.raw);
  const extracted = findFirstJsonObjectBlock(stripped);

  candidates.push({ label: "raw", value: params.raw.trim() });
  if (stripped !== params.raw.trim()) {
    candidates.push({ label: "stripped fences", value: stripped });
  }
  if (extracted && !candidates.some((candidate) => candidate.value === extracted)) {
    candidates.push({ label: "extracted JSON block", value: extracted });
  }

  let lastIssue: "invalid JSON from Gemini" | "truncated response" | "schema mismatch" =
    isProbablyTruncated(params.raw, params.finishReason)
      ? "truncated response"
      : "invalid JSON from Gemini";

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.value);
      return {
        parsed: normalizeParsedListing(parsed),
        strategy: candidate.label,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/schema mismatch/i.test(message)) {
        lastIssue = "schema mismatch";
      } else if (isProbablyTruncated(candidate.value, params.finishReason)) {
        lastIssue = "truncated response";
      } else {
        lastIssue = "invalid JSON from Gemini";
      }
    }
  }

  return { parseIssue: lastIssue };
}

// ── Input preprocessing ──────────────────────────────────────────────────

interface PreprocessResult {
  /** Cleaned, deduplicated text */
  text: string;
  /** Estimated number of distinct listings in the input */
  listingCount: number;
  /** Warnings to surface to the user */
  warnings: string[];
  duplicateContentRemoved: boolean;
  multipleListingCandidatesDetected: boolean;
  conflictingAddressesDetected: boolean;
  extractedFromBestCandidateChunk: boolean;
  candidateChunkCount: number;
  truncatedPreviewOfOtherChunks?: string[];
  otherCandidateChunks?: string[];
}

/**
 * Lightweight preprocessing for noisy WeChat pasted text.
 * Normalizes punctuation, removes duplicate content blocks, and estimates
 * how many distinct listings are present so extraction can flag ambiguity.
 * For clean single-listing input this is effectively a no-op.
 */
export function preprocessInput(raw: string): PreprocessResult {
  const warnings: string[] = [];
  let duplicateContentRemoved = false;
  let conflictingAddressesDetected = false;
  let extractedFromBestCandidateChunk = false;
  let truncatedPreviewOfOtherChunks: string[] | undefined;
  let otherCandidateChunks: string[] | undefined;

  // ── Normalize full-width punctuation → ASCII equivalents ──────────────
  let text = raw
    .replace(/：/g, ":").replace(/（/g, "(").replace(/）/g, ")")
    .replace(/，/g, ",").replace(/；/g, ";").replace(/＝/g, "=")
    .replace(/[^\S\n]+/g, " ")       // collapse horizontal whitespace
    .replace(/\n{3,}/g, "\n\n")      // max 2 consecutive newlines
    .trim();

  // ── Insert linebreaks before listing headers glued without whitespace ─
  // Handles: "84111🏠 暑期转租" → "84111\n🏠 暑期转租"
  text = text.replace(/([^\n])(?=【[^】]+】)/g, "$1\n");
  // Emoji are multi-byte; use a simple string scan instead of a Unicode regex
  for (const emoji of ["🏠", "🏙", "🏢", "🏡", "🔑", "🏘"]) {
    text = text.split(emoji).reduce((acc, part, i) => {
      if (i === 0) return part;
      // Insert newline before emoji if not already preceded by newline/whitespace
      const prev = acc.slice(-1);
      return acc + (prev && prev !== "\n" && prev !== " " ? "\n" : "") + emoji + part;
    }, "");
  }

  // ── Deduplicate content blocks split at listing boundaries ────────────
  const chunks = splitAtBoundaries(text);
  let dedupedChunks = chunks;
  if (chunks.length > 1) {
    const seen = new Map<string, number>();
    const kept: string[] = [];
    let removedCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const fp = chunks[i]
        .split("\n")
        .filter(line => line.trim().length >= 5) // drop orphaned emoji lines
        .join("\n")
        .toLowerCase()
        .replace(/[\s\-.,;:!?'"()【】\[\]{}\/\\@#$%^&*_+=|<>~`]/g, "")
        .slice(0, 200);
      if (fp.length < 30 || !seen.has(fp)) {
        if (fp.length >= 30) seen.set(fp, i);
        kept.push(chunks[i]);
      } else {
        removedCount++;
      }
    }

    if (removedCount > 0) {
      dedupedChunks = kept;
      text = kept.join("\n");
      duplicateContentRemoved = true;
      warnings.push(`${removedCount} duplicate block(s) removed`);
    }
  }

  const explicitAddresses = extractExplicitAddresses(text);
  conflictingAddressesDetected = explicitAddresses.size > 1;
  if (conflictingAddressesDetected) {
    warnings.push("Conflicting addresses detected across candidate listings");
  }

  // ── Estimate listing count ────────────────────────────────────────────
  const listingCount = estimateListingCount(text);
  const multipleListingCandidatesDetected = listingCount > 1;
  const candidateChunkCount = dedupedChunks.length;
  if (multipleListingCandidatesDetected && dedupedChunks.length > 1) {
    const bestChunk = pickBestCandidateChunk(dedupedChunks);
    if (bestChunk && bestChunk.trim() && bestChunk.trim() !== text.trim()) {
      const otherChunks = dedupedChunks
        .filter(chunk => chunk.trim() !== bestChunk.trim())
        .map(chunk => chunk.trim())
        .filter(Boolean)
        .slice(0, 2);
      otherCandidateChunks = otherChunks;
      truncatedPreviewOfOtherChunks = otherChunks
        .map(makeChunkPreview)
        .filter(Boolean);
      text = bestChunk.trim();
      extractedFromBestCandidateChunk = true;
    }
  }
  if (listingCount > 1) {
    warnings.push(
      `Input appears to contain ~${listingCount} distinct listings; extraction covers the most complete one`,
    );
  }

  return {
    text,
    listingCount,
    warnings,
    duplicateContentRemoved,
    multipleListingCandidatesDetected,
    conflictingAddressesDetected,
    extractedFromBestCandidateChunk,
    candidateChunkCount,
    truncatedPreviewOfOtherChunks,
    otherCandidateChunks,
  };
}

/** Split text into chunks at lines that look like listing headers. */
function splitAtBoundaries(text: string): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let buf: string[] = [];

  for (const line of lines) {
    if (isLikelyListingHeader(line) && buf.length > 0 && buf.join("\n").length > 50) {
      chunks.push(buf.join("\n"));
      buf = [];
    }
    buf.push(line);
  }
  if (buf.length > 0) chunks.push(buf.join("\n"));
  return chunks;
}

/** Heuristic: does this line look like the beginning of a new listing? */
function isLikelyListingHeader(line: string): boolean {
  const t = line.trim();
  if (!t || t.length < 5) return false;
  // 【暑假短租】... bracket headers
  if (/^【[^】]+】/.test(t)) return true;
  // 🏠 + sublease / room-config keywords
  if (/^[🏠🏙🏢🏡🔑🏘]/.test(t) &&
      /转租|sublease|短租|出租|\d+[bB]\d+[bB]|studio/i.test(t)) return true;
  // PropertyName + 转租 / room config
  if (/^[A-Z][A-Za-z\s&'.]{2,30}\s*(?:转租|apartment|townhome|\d+[bB])/i.test(t)) return true;
  // 转租 + PropertyName
  if (/^转租\s*[A-Z]/i.test(t)) return true;
  return false;
}

function extractExplicitAddresses(text: string): Set<string> {
  const addresses = new Set<string>();
  const addrRe = /(?:address|地址|addr)\s*[:：]\s*([^\n]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = addrRe.exec(text)) !== null) {
    const value = match[1]?.trim().toLowerCase();
    if (value) addresses.add(value);
  }
  return addresses;
}

function pickBestCandidateChunk(chunks: string[]): string {
  return [...chunks]
    .map((chunk, index) => ({ chunk, index, score: scoreListingChunk(chunk) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.chunk ?? chunks[0] ?? "";
}

function scoreListingChunk(chunk: string): number {
  let score = 0;
  if (/(?:address|地址|addr)\s*[:：]\s*[^\n]+/i.test(chunk)) score += 5;
  if (/\d{1,6}\s+[A-Za-z0-9\s.]+\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|parkway|pkwy|place|pl|terrace|ter|circle|cir)\b/i.test(chunk)) score += 3;
  if (/\$\s*[\d,]+|[\d,]{3,}\s*\/?\s*month|月租|月付/i.test(chunk)) score += 3;
  if (/\d\s*(?:br|bd|bed(?:room)?s?)\b|\d\s*(?:卧室?|室|房间)|\d[Bb]\d[Bb]/i.test(chunk)) score += 2;
  if (/\b[A-Z]{2}\b\s+\d{5}\b/.test(chunk)) score += 1;
  score += Math.min(chunk.length / 200, 2);
  return score;
}

function makeChunkPreview(chunk: string): string {
  const normalized = chunk.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length <= 120 ? normalized : `${normalized.slice(0, 117).trimEnd()}...`;
}

function applyPreprocessSignals(
  listing: ExtractedListing,
  preprocess: Pick<
    PreprocessResult,
    | "warnings"
    | "duplicateContentRemoved"
    | "multipleListingCandidatesDetected"
    | "conflictingAddressesDetected"
    | "extractedFromBestCandidateChunk"
    | "candidateChunkCount"
    | "truncatedPreviewOfOtherChunks"
    | "otherCandidateChunks"
  >
): ExtractedListing {
  return {
    ...listing,
    extractionWarning: mergeWarnings(listing.extractionWarning, ...preprocess.warnings),
    extractionWarnings: preprocess.warnings.length > 0 ? preprocess.warnings : listing.extractionWarnings,
    duplicateContentRemoved: preprocess.duplicateContentRemoved,
    multipleListingCandidatesDetected: preprocess.multipleListingCandidatesDetected,
    conflictingAddressesDetected: preprocess.conflictingAddressesDetected,
    extractedFromBestCandidateChunk: preprocess.extractedFromBestCandidateChunk,
    candidateChunkCount: preprocess.candidateChunkCount,
    truncatedPreviewOfOtherChunks: preprocess.truncatedPreviewOfOtherChunks,
    otherCandidateChunks: preprocess.otherCandidateChunks,
  };
}

export function finalizeExtractionResponse(
  listing: ExtractedListing,
  preprocessSignals: PreprocessResult | null,
  extraDiagnostics: ImportDiagnostic[] = []
): ExtractListingResponse {
  const withPreprocess = preprocessSignals
    ? applyPreprocessSignals(listing, preprocessSignals)
    : listing;
  const locationCandidate = deriveLocationCandidate(withPreprocess);

  const diagnostics = [
    ...diagnosticsFromPreprocess(preprocessSignals),
    ...extraDiagnostics,
  ];

  if (
    locationCandidate.evidenceType === "property_name"
    && !diagnostics.some((diagnostic) => diagnostic.code === "property_name_only")
  ) {
    diagnostics.push(
      toDiagnostic(
        "property_name_only",
        "warning",
        "Property name found but no verified street address was extracted"
      )
    );
  }

  const compatibleListing = {
    ...applyLegacyLocationFields(withPreprocess, locationCandidate),
    ...diagnosticsToWarnings(diagnostics),
  };

  return {
    ...compatibleListing,
    listing: compatibleListing,
    locationCandidate,
    diagnostics,
  };
}

/**
 * Count distinct-listing signals in the (already deduplicated) text.
 * Uses multiple weak signals (rent amounts, property names, address lines,
 * listing headers) and requires ≥3 combined signal points to flag multi-listing.
 */
function estimateListingCount(text: string): number {
  let signals = 0;

  // Multiple distinct rent amounts
  const rents = new Set<number>();
  const rentRe = /\$\s*([\d,]+)/g;
  let rm: RegExpExecArray | null;
  while ((rm = rentRe.exec(text)) !== null) {
    const v = parseInt(rm[1].replace(/,/g, ""), 10);
    if (v >= 200 && v <= 20000) rents.add(v);
  }
  if (rents.size >= 3) signals += 2;
  else if (rents.size === 2) signals += 1;

  // Multiple property-name-like strings
  const propNames = new Set<string>();
  const propRe = /([A-Z][A-Za-z0-9&.' -]{2,40}(?:Apartment Homes|Apartments|Townhomes?|Lofts?|Village|Commons|Towers?|Homes|Residences?))/g;
  let pm: RegExpExecArray | null;
  while ((pm = propRe.exec(text)) !== null) {
    propNames.add(pm[1].toLowerCase().trim());
  }
  if (propNames.size >= 3) signals += 2;
  else if (propNames.size >= 2) signals += 1;

  // Multiple explicit address lines
  const addrRe = /(?:address|地址|addr)\s*[:：]\s*[^\n]+/gi;
  let addrCount = 0;
  while (addrRe.exec(text) !== null) addrCount++;
  if (addrCount >= 2) signals += 2;

  // Multiple listing headers
  const headerCount = text.split("\n").filter((l) => isLikelyListingHeader(l)).length;
  if (headerCount >= 3) signals += 2;
  else if (headerCount >= 2) signals += 1;

  if (signals >= 3) return Math.max(rents.size, propNames.size, headerCount, 2);
  return 1;
}

// ── Main extraction function ───────────────────────────────────────────────
export async function extractListingFromWeChat(params: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<ExtractListingResponse> {
  const { text, imageBase64, mimeType } = params;

  if (!text && !imageBase64) {
    throw new Error("Provide either text or an image to extract from");
  }

  // ── Preprocess text input ──────────────────────────────────────────────
  let processedText = text;
  let multiListing = false;
  let preprocessSignals: PreprocessResult | null = null;

  if (text) {
    const prep = preprocessInput(text);
    preprocessSignals = prep;
    processedText = prep.text;
    multiListing = prep.listingCount > 1;
    if (prep.warnings.length > 0) {
      console.log(
        `[WeChat Import] Preprocessed: ${text.length}→${prep.text.length} chars, ` +
        `~${prep.listingCount} listing(s), warnings: ${prep.warnings.join("; ")}`,
      );
    }
  }

  // No API key — fall back to regex heuristics so the form is still usable.
  // The user will need to review and correct the pre-filled fields manually.
  if (!ENV.geminiApiKey) {
    console.warn(
      "[WeChat Import] No Gemini key found (checked GEMINI_API_KEY and BUILT_IN_FORGE_API_KEY in app/.env) – " +
      "falling back to heuristic regex extraction. Set either key to enable AI extraction.",
    );
    const heuristic = heuristicExtraction({ ...params, text: processedText });
    return finalizeExtractionResponse({
      ...heuristic,
      confidence: multiListing ? "low" : heuristic.confidence,
    }, preprocessSignals, [
      toDiagnostic(
        "gemini_unavailable",
        "warning",
        "Gemini was unavailable; heuristic extraction was used"
      ),
    ]);
  }

  // Build multimodal user message
  const userContent: Array<{ type: string; [key: string]: unknown }> = [];

  if (processedText) {
    const intro = multiListing
      ? "This text contains multiple rental listings pasted together. " +
        "Extract ONLY the single most complete listing (the one with the clearest rent, " +
        "address, and bedroom details). Ignore the others.\n\n"
      : "";
    userContent.push({
      type: "text",
      text: `${intro}Extract rental listing data from this WeChat message:\n\n${processedText}`,
    });
  }

  if (imageBase64 && mimeType) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${imageBase64}`,
        detail: "high",
      },
    });
    if (!processedText) {
      userContent.push({
        type: "text",
        text: "Extract rental listing data from this WeChat screenshot.",
      });
    }
  }

  const inputSummary = processedText
    ? `text (${processedText.length} chars${multiListing ? ", multi-listing" : ""})`
    : `image (${imageBase64?.length ?? 0} base64 chars, ${mimeType})`;
  let result;
  try {
    result = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent as any },
      ],
      outputSchema: LISTING_OUTPUT_SCHEMA,
      maxTokens: 8192,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[WeChat Import] ✗ Gemini call failed:", msg);

    // Classify the error so the UI toast is actionable
    if (/401|403|invalid.{0,20}key|api.?key|unauthorized/i.test(msg)) {
      throw new Error(
        "Gemini API key rejected — verify GEMINI_API_KEY in app/.env is a valid Google AI Studio key"
      );
    }
    if (/429|quota|rate.?limit/i.test(msg)) {
      throw new Error("Gemini rate limit reached — wait a moment then try again");
    }
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(msg)) {
      throw new Error(
        "Cannot reach Gemini API — check network connectivity and that BUILT_IN_FORGE_API_URL is blank in app/.env"
      );
    }
    throw new Error(`Gemini extraction failed: ${msg}`);
  }

  const raw = result.choices[0]?.message?.content;
  if (!raw || typeof raw !== "string") {
    throw new Error("Gemini returned an empty response");
  }
  const finishReason = result.choices[0]?.finish_reason;
  const parseResult = parseGeminiListingResponse({ raw, finishReason });

  if (!parseResult.parsed) {
    logFullRawGeminiResponseOnFailure(raw, {
      finishReason,
      parseIssue: parseResult.parseIssue,
      model: result.model,
    });

    const fallback = heuristicExtraction({ ...params, text: processedText });
    console.warn(
      `[WeChat Import] ${parseResult.parseIssue}; fallback used`,
    );
    const diagnostics: ImportDiagnostic[] = [];
    if (parseResult.parseIssue === "invalid JSON from Gemini") {
      diagnostics.push(
        toDiagnostic(
          "gemini_invalid_json",
          "warning",
          "Gemini returned malformed JSON; heuristic extraction was used"
        )
      );
    } else if (parseResult.parseIssue === "schema mismatch") {
      diagnostics.push(
        toDiagnostic(
          "schema_mismatch",
          "warning",
          "Gemini returned JSON that did not match the listing schema; heuristic extraction was used"
        )
      );
    } else if (parseResult.parseIssue === "truncated response") {
      diagnostics.push(
        toDiagnostic(
          "gemini_truncated",
          "warning",
          "Gemini response was truncated; heuristic extraction was used"
        )
      );
    }

    return finalizeExtractionResponse({
      ...fallback,
      confidence: multiListing ? "low" : fallback.confidence,
    }, preprocessSignals, diagnostics);
  }

  const listing = parseResult.parsed;
  if (multiListing && listing.confidence === "high") {
    listing.confidence = "medium";
  }
  return finalizeExtractionResponse({
    ...listing,
    extractionSource: "gemini",
  }, preprocessSignals);
}
