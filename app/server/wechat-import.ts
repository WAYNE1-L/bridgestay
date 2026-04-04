import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

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
  locationSource?: "direct_text" | "place_lookup" | "unresolved";
  locationConfidence?: "high" | "medium" | "low";
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
If a field cannot be determined, omit it entirely (do not guess).`;

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

  const addressMatch = raw.match(
    /(?:^|\n)\s*address[：:\s]+([^\n,]+(?:\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|parkway|pkwy|place|pl|terrace|ter|circle|cir)\b[^\n,]*)?)/i
  );
  const address = addressMatch?.[1]?.trim();

  const propertyNameMatch = raw.match(
    /([A-Z][A-Za-z0-9&.'\- ]{2,80}(?:Apartment Homes|Apartments|Residences|Residence|Homes|Commons|Village|Lofts|Tower|Towers))/m
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

async function normalizeListingLocation(listing: ExtractedListing): Promise<ExtractedListing> {
  const propertyName = listing.propertyName?.trim() || (!looksLikeStreetAddress(listing.address) ? listing.address?.trim() : undefined);
  const hasDirectStreetAddress = looksLikeStreetAddress(listing.address);

  if (hasDirectStreetAddress) {
    return {
      ...listing,
      propertyName,
      locationSource: "direct_text",
      locationConfidence: listing.city && listing.state ? "high" : "medium",
    };
  }

  if (!propertyName || !listing.city || !listing.state) {
    return {
      ...listing,
      propertyName,
      address: hasDirectStreetAddress ? listing.address : undefined,
      locationSource: propertyName ? "unresolved" : undefined,
      locationConfidence: propertyName ? "low" : undefined,
      extractionWarning: propertyName
        ? mergeWarnings(
            listing.extractionWarning,
            "Property name found but street address is unresolved; review required"
          )
        : listing.extractionWarning,
    };
  }

  try {
    const { lookupPropertyLocation } = await import("./geocoding");
    const match = await lookupPropertyLocation({
      propertyName,
      city: listing.city,
      state: listing.state,
    });

    if (!match) {
      return {
        ...listing,
        propertyName,
        address: undefined,
        latitude: undefined,
        longitude: undefined,
        locationSource: "unresolved",
        locationConfidence: "low",
        extractionWarning: mergeWarnings(
          listing.extractionWarning,
          "Property name found but street address could not be verified; review required"
        ),
      };
    }

    return {
      ...listing,
      propertyName,
      address: match.address,
      city: match.city ?? listing.city,
      state: match.state ?? listing.state,
      zipCode: match.zipCode ?? listing.zipCode,
      latitude: match.latitude,
      longitude: match.longitude,
      locationSource: "place_lookup",
      locationConfidence: match.confidence,
      extractionWarning: mergeWarnings(
        listing.extractionWarning,
        "Location matched from Google Places; review the normalized address before saving"
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[WeChat Import] Location normalization skipped:", message);
    return {
      ...listing,
      propertyName,
      address: undefined,
      latitude: undefined,
      longitude: undefined,
      locationSource: "unresolved",
      locationConfidence: "low",
      extractionWarning: mergeWarnings(
        listing.extractionWarning,
        "Property name found but Google Places lookup was unavailable; review required"
      ),
    };
  }
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

// ── Main extraction function ───────────────────────────────────────────────
export async function extractListingFromWeChat(params: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<ExtractedListing> {
  const { text, imageBase64, mimeType } = params;

  if (!text && !imageBase64) {
    throw new Error("Provide either text or an image to extract from");
  }

  // No API key — fall back to regex heuristics so the form is still usable.
  // The user will need to review and correct the pre-filled fields manually.
  if (!ENV.geminiApiKey) {
    console.warn(
      "[WeChat Import] No Gemini key found (checked GEMINI_API_KEY and BUILT_IN_FORGE_API_KEY in app/.env) – " +
      "falling back to heuristic regex extraction. Set either key to enable AI extraction."
    );
    return await normalizeListingLocation({
      ...heuristicExtraction(params),
      extractionWarning: "Gemini unavailable; fallback used",
    });
  }

  // Build multimodal user message
  const userContent: Array<{ type: string; [key: string]: unknown }> = [];

  if (text) {
    userContent.push({
      type: "text",
      text: `Extract rental listing data from this WeChat message:\n\n${text}`,
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
    if (!text) {
      userContent.push({
        type: "text",
        text: "Extract rental listing data from this WeChat screenshot.",
      });
    }
  }

  const inputSummary = text
    ? `text (${text.length} chars)`
    : `image (${imageBase64?.length ?? 0} base64 chars, ${mimeType})`;
  let result;
  try {
    result = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent as any },
      ],
      outputSchema: LISTING_OUTPUT_SCHEMA,
      maxTokens: 1024,
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

    const fallback = heuristicExtraction(params);
    console.warn(
      `[WeChat Import] ${parseResult.parseIssue}; fallback used`
    );
    return await normalizeListingLocation({
      ...fallback,
      extractionWarning: `${parseResult.parseIssue}; fallback used`,
    });
  }

  return await normalizeListingLocation({
    ...parseResult.parsed,
    extractionSource: "gemini",
  });
}
