import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module before importing the parser
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock ENV so the llm module doesn't throw on missing key during import
vi.mock("./_core/env", () => ({
  ENV: {
    geminiApiKey: "test-key-for-unit-tests",
  },
}));

import { parseSubletText } from "./sublets-parser";
import { invokeLLM } from "./_core/llm";

const mockInvokeLLM = vi.mocked(invokeLLM);

const VALID_PARSED = {
  titleEn: "2BR/2BA Sublease near University",
  titleZh: "大学附近2室2卫转租",
  monthlyRent: 1200,
  address: "127 W Scarlett Ave, Provo, UT 84604",
  bedrooms: 2,
  bathrooms: 2,
  squareFeet: 900,
  availableFrom: "2026-08-01",
  subleaseEndDate: "2026-12-31",
  sourceHint: "manual_wechat",
  rawDescription: "大学附近2室2卫转租，月租$1200，8月1日可入住，合同到年底。",
};

function makeLLMResponse(content: string) {
  return {
    id: "test-id",
    created: 0,
    model: "gemini-2.5-flash",
    choices: [
      {
        index: 0,
        message: { role: "assistant" as const, content },
        finish_reason: "stop",
      },
    ],
  };
}

describe("parseSubletText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path: valid JSON returned by mocked Gemini → returns { ok: true, parsed }", async () => {
    mockInvokeLLM.mockResolvedValueOnce(
      makeLLMResponse(JSON.stringify(VALID_PARSED))
    );

    const result = await parseSubletText(
      "大学附近2室2卫转租，月租$1200，8月1日可入住，合同到年底。微信联系。"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok=true");

    expect(result.parsed.titleEn).toBe("2BR/2BA Sublease near University");
    expect(result.parsed.titleZh).toBe("大学附近2室2卫转租");
    expect(result.parsed.monthlyRent).toBe(1200);
    expect(result.parsed.bedrooms).toBe(2);
    expect(result.parsed.bathrooms).toBe(2);
    expect(result.parsed.availableFrom).toBe("2026-08-01");
    expect(result.parsed.subleaseEndDate).toBe("2026-12-31");
    expect(result.parsed.sourceHint).toBe("manual_wechat");
    expect(typeof result.parsed.rawDescription).toBe("string");
    expect(result.parsed.rawDescription.length).toBeGreaterThan(0);
  });

  it("handles markdown-fenced JSON response from model", async () => {
    const fenced = "```json\n" + JSON.stringify(VALID_PARSED) + "\n```";
    mockInvokeLLM.mockResolvedValueOnce(makeLLMResponse(fenced));

    const result = await parseSubletText(
      "2BR sublet $1200/mo available August, ends December"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok=true");
    expect(result.parsed.monthlyRent).toBe(1200);
  });

  it("bad JSON: garbled response → returns { ok: false, error } without throwing", async () => {
    mockInvokeLLM.mockResolvedValueOnce(
      makeLLMResponse("Sorry, I cannot process this request.")
    );

    const result = await parseSubletText(
      "Some sublet listing text that is at least 20 characters long"
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(typeof result.error).toBe("string");
    expect(result.error.length).toBeGreaterThan(0);
  });

  it("missing required field titleEn → returns { ok: false, error } without throwing", async () => {
    const missingTitleEn = { ...VALID_PARSED, titleEn: undefined };
    mockInvokeLLM.mockResolvedValueOnce(
      makeLLMResponse(JSON.stringify(missingTitleEn))
    );

    const result = await parseSubletText(
      "Studio sublet available September near campus $950/mo"
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toMatch(/titleEn/);
  });

  it("invokeLLM throwing → returns { ok: false, error } without re-throwing", async () => {
    mockInvokeLLM.mockRejectedValueOnce(
      new Error("GEMINI_API_KEY is not configured")
    );

    const result = await parseSubletText(
      "2 bed 1 bath apartment for sublease $900/mo available now"
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("GEMINI_API_KEY");
  });

  it("null fields are preserved correctly when model returns nulls", async () => {
    const minimalParsed = {
      titleEn: "Studio Sublet",
      titleZh: null,
      monthlyRent: null,
      address: null,
      bedrooms: null,
      bathrooms: null,
      squareFeet: null,
      availableFrom: null,
      subleaseEndDate: null,
      sourceHint: "manual_other",
      rawDescription: "Studio sublet near campus.",
    };
    mockInvokeLLM.mockResolvedValueOnce(
      makeLLMResponse(JSON.stringify(minimalParsed))
    );

    const result = await parseSubletText(
      "Studio sublet near campus, contact for details and pricing"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok=true");
    expect(result.parsed.titleZh).toBeNull();
    expect(result.parsed.monthlyRent).toBeNull();
    expect(result.parsed.bedrooms).toBeNull();
    expect(result.parsed.sourceHint).toBe("manual_other");
  });
});
