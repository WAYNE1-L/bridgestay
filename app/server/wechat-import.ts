import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

// ── Extracted listing shape ────────────────────────────────────────────────
export type ExtractedListing = {
  title: string;
  description?: string;
  propertyType?: "apartment" | "studio" | "house" | "room" | "condo" | "townhouse";
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
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
};

// ── JSON schema for structured LLM output ─────────────────────────────────
const LISTING_OUTPUT_SCHEMA = {
  name: "apartment_listing",
  strict: true,
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
If a field cannot be determined, omit it entirely (do not guess).`;

// ── Dev mock (used when API key is absent) ─────────────────────────────────
function mockExtraction(): ExtractedListing {
  const next30 = new Date();
  next30.setDate(next30.getDate() + 30);
  return {
    title: "[DEV MOCK] 2BR Apartment near Campus",
    description:
      "This is a mock extraction returned because BUILT_IN_FORGE_API_KEY is not configured. " +
      "Add the key to your .env to enable real AI extraction via Gemini 2.5 Flash.",
    propertyType: "apartment",
    address: "123 University Ave",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90024",
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 850,
    monthlyRent: 1800,
    securityDeposit: 1800,
    availableFrom: next30.toISOString().split("T")[0],
    petsAllowed: false,
    parkingIncluded: true,
    amenities: ["In-unit Laundry", "Air Conditioning"],
    utilitiesIncluded: ["Water", "Internet"],
    isSublease: true,
    subleaseEndDate: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      return d.toISOString().split("T")[0];
    })(),
    leaseTerm: 6,
    furnished: true,
    wechatContact: "mock_landlord_wx",
    confidence: "low",
  };
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

  // Return mock when the LLM is not configured so the UI stays usable in dev
  if (!ENV.forgeApiKey) {
    console.warn(
      "[WeChat Import] BUILT_IN_FORGE_API_KEY not set – returning mock extraction"
    );
    return mockExtraction();
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

  const result = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent as any },
    ],
    outputSchema: LISTING_OUTPUT_SCHEMA,
    maxTokens: 1024,
  });

  const raw = result.choices[0]?.message?.content;
  if (!raw || typeof raw !== "string") {
    throw new Error("LLM returned no content");
  }

  let parsed: ExtractedListing;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  return parsed;
}
