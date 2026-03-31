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
  availableFrom?: string; // ISO-8601 date string
  petsAllowed?: boolean;
  parkingIncluded?: boolean;
  amenities?: string[];
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
        description: "List of amenities in English",
      },
      wechatContact: {
        type: "string",
        description: "Landlord WeChat ID if mentioned",
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
• 微信 / WX / WeChat → WeChat contact
• 公寓 → apartment, 工作室 → studio, 独栋 → house, 单间 → room

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
    amenities: ["WiFi", "In-unit Laundry", "Air Conditioning"],
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
