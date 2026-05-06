import { invokeLLM } from "./_core/llm";

// ============ TYPES ============

export type SourceHint =
  | "craigslist"
  | "reddit"
  | "manual_wechat"
  | "manual_xhs"
  | "manual_other";

export type ParsedSublet = {
  titleEn: string;
  titleZh: string | null;
  monthlyRent: number | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  availableFrom: string | null;
  subleaseEndDate: string | null;
  sourceHint: SourceHint;
  rawDescription: string;
};

export type ParseSubletSuccess = { ok: true; parsed: ParsedSublet };
export type ParseSubletFailure = { ok: false; error: string };
export type ParseSubletResult = ParseSubletSuccess | ParseSubletFailure;

// ============ SYSTEM PROMPT ============

const SYSTEM_PROMPT = `You are a rental sublet listing parser. You will receive free-form text describing a single sublet listing — it may come from Chinese WeChat / 小红书 posts, Craigslist, Reddit, or manual input. The text may be in Chinese, English, or a mix.

Your task: extract structured data and return a single JSON object. Output ONLY the JSON — no markdown fences, no commentary, no explanation.

REQUIRED OUTPUT SCHEMA:
{
  "titleEn": <string — English title for the listing, required, always present>,
  "titleZh": <string | null — Chinese title if the input is primarily Chinese, otherwise null>,
  "monthlyRent": <number | null — monthly rent in USD, e.g. 1200>,
  "address": <string | null — street address if stated>,
  "bedrooms": <number | null — bedroom count; 0 means studio>,
  "bathrooms": <number | null — bathroom count>,
  "squareFeet": <number | null — square footage>,
  "availableFrom": <string | null — ISO date YYYY-MM-DD when available>,
  "subleaseEndDate": <string | null — ISO date YYYY-MM-DD when sublease ends>,
  "sourceHint": <one of: "craigslist" | "reddit" | "manual_wechat" | "manual_xhs" | "manual_other">,
  "rawDescription": <string — clean re-paragraphed version of the input, in the original language, max 2000 chars>
}

CRITICAL RULES:
- Missing or unclear fields MUST be null. NEVER guess or fabricate values.
- If the listing does not state bathroom count, return "bathrooms": null.
- If the listing does not state available-from date, return "availableFrom": null.
- Do not infer dates from context like "this summer" — return null.
- titleEn must always be a non-empty string (synthesize a brief English title from what you know).
- rawDescription must be in the original language of the input (Chinese if input is Chinese, English if English).

FIELD RECOGNITION CUES:
Chinese: 月租/租金 → monthlyRent; 押金 → security deposit (ignore, not in schema); 卧室/室/BR → bedrooms; 卫/卫生间/bath → bathrooms; 平方英尺/sqft/平方 → squareFeet; 可入住/起租 → availableFrom; 租到/到期 → subleaseEndDate; 微信/WX/微信号 → contact (ignore, not in schema); 转租/sublet → confirms it's a sublet.
English: BR/bed/bedroom → bedrooms; bath/BA → bathrooms; sqft/sq ft → squareFeet; available from/move-in → availableFrom; until/through/end date → subleaseEndDate; /mo → monthlyRent.

SOURCEHINT HEURISTICS:
- "craigslist" if input mentions "Craigslist" or contains a craigslist.org URL
- "reddit" if input mentions "Reddit" or contains a reddit.com URL or r/<subreddit> pattern
- "manual_wechat" if input contains heavy Chinese characters AND (微信 OR WX OR 微信号 OR WeChat)
- "manual_xhs" if input contains 小红书 or XHS-style emoji-heavy zh-CN
- "manual_other" otherwise (default)`;

// ============ VALIDATION ============

const SOURCE_HINTS = new Set<SourceHint>([
  "craigslist",
  "reddit",
  "manual_wechat",
  "manual_xhs",
  "manual_other",
]);

function validateParsed(raw: unknown): ParsedSublet {
  if (!raw || typeof raw !== "object") {
    throw new Error("LLM returned non-object JSON");
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.titleEn !== "string" || obj.titleEn.trim() === "") {
    throw new Error("Missing required field: titleEn must be a non-empty string");
  }

  const assertNullableString = (key: string) => {
    if (obj[key] !== null && obj[key] !== undefined && typeof obj[key] !== "string") {
      throw new Error(`Field ${key} must be a string or null`);
    }
  };
  const assertNullableNumber = (key: string) => {
    if (obj[key] !== null && obj[key] !== undefined && typeof obj[key] !== "number") {
      throw new Error(`Field ${key} must be a number or null`);
    }
  };

  assertNullableString("titleZh");
  assertNullableNumber("monthlyRent");
  assertNullableString("address");
  assertNullableNumber("bedrooms");
  assertNullableNumber("bathrooms");
  assertNullableNumber("squareFeet");
  assertNullableString("availableFrom");
  assertNullableString("subleaseEndDate");

  if (!SOURCE_HINTS.has(obj.sourceHint as SourceHint)) {
    throw new Error(
      `Field sourceHint must be one of: craigslist, reddit, manual_wechat, manual_xhs, manual_other`
    );
  }

  if (typeof obj.rawDescription !== "string" || obj.rawDescription.trim() === "") {
    throw new Error("Missing required field: rawDescription must be a non-empty string");
  }

  return {
    titleEn: obj.titleEn as string,
    titleZh: (obj.titleZh ?? null) as string | null,
    monthlyRent: (obj.monthlyRent ?? null) as number | null,
    address: (obj.address ?? null) as string | null,
    bedrooms: (obj.bedrooms ?? null) as number | null,
    bathrooms: (obj.bathrooms ?? null) as number | null,
    squareFeet: (obj.squareFeet ?? null) as number | null,
    availableFrom: (obj.availableFrom ?? null) as string | null,
    subleaseEndDate: (obj.subleaseEndDate ?? null) as string | null,
    sourceHint: obj.sourceHint as SourceHint,
    rawDescription: obj.rawDescription as string,
  };
}

// ============ MAIN HELPER ============

/**
 * Parse free-text sublet listing (Chinese or English) into a structured shape
 * suitable for prefilling the /sublets/post form.
 *
 * Returns { ok: true, parsed } on success, { ok: false, error } on any failure.
 * Never throws.
 */
export async function parseSubletText(text: string): Promise<ParseSubletResult> {
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 4096,
    });

    const rawContent = result.choices[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      return { ok: false, error: "LLM returned empty or non-string content" };
    }

    // Strip any accidental markdown fences (model may include them despite instructions)
    const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let jsonObj: unknown;
    try {
      jsonObj = JSON.parse(cleaned);
    } catch {
      return { ok: false, error: "LLM response was not valid JSON" };
    }

    const parsed = validateParsed(jsonObj);
    return { ok: true, parsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during sublet parsing";
    console.error("[sublets/parseFromText]", err);
    return { ok: false, error: message };
  }
}
