import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module before importing the runner
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock the ENV module
vi.mock("../_core/env", () => ({
  ENV: {
    geminiApiKey: "test-key-for-unit-tests",
  },
}));

import { runSkillPerspective } from "./skill-runner";
import { invokeLLM } from "../_core/llm";

const mockInvokeLLM = vi.mocked(invokeLLM);

describe("Skill Runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns structured response with all required fields", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      id: "test-id",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              summary: "This is a well-priced studio near campus.",
              strengths: ["Furnished", "Near transit", "Utilities included"],
              risks: ["No photos mentioned", "Short sublease term"],
              recommendations: ["Add photos", "Clarify move-in process"],
              confidence: "medium",
              suggestedTitle: "Furnished Studio near U of Utah — Sublease May-Aug",
              missingFields: ["squareFeet", "securityDeposit"],
              suggestedTags: ["furnished", "near-campus", "utilities-included"],
            }),
          },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 500, completion_tokens: 200, total_tokens: 700 },
    });

    const response = await runSkillPerspective({
      skillName: "listing-conversion-optimizer",
      question: "Analyze this listing",
      context: '{"title":"Studio near campus","monthlyRent":1180}',
    });

    // Structure checks
    expect(response.skillName).toBe("listing-conversion-optimizer");
    expect(response.model).toBe("gemini-2.5-flash");
    expect(response.usage).toEqual({ prompt: 500, completion: 200 });

    // Result checks
    const r = response.result;
    expect(r.summary).toContain("studio");
    expect(r.strengths).toHaveLength(3);
    expect(r.risks).toHaveLength(2);
    expect(r.recommendations).toHaveLength(2);
    expect(r.confidence).toBe("medium");

    // Extra fields
    expect(r.extra?.suggestedTitle).toBe("Furnished Studio near U of Utah — Sublease May-Aug");
    expect(r.extra?.missingFields).toEqual(["squareFeet", "securityDeposit"]);
    expect(r.extra?.suggestedTags).toEqual(["furnished", "near-campus", "utilities-included"]);
  });

  it("passes skill body as system prompt to LLM", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              summary: "Test",
              strengths: [],
              risks: [],
              recommendations: [],
              confidence: "low",
            }),
          },
          finish_reason: "stop",
        },
      ],
    });

    await runSkillPerspective({
      skillName: "student-housing-operator",
      question: "Is this listing good?",
    });

    expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
    const call = mockInvokeLLM.mock.calls[0][0];

    // System message should contain skill body content
    const systemMsg = call.messages.find((m) => m.role === "system");
    expect(systemMsg).toBeDefined();
    expect(typeof systemMsg!.content).toBe("string");
    expect(systemMsg!.content as string).toContain("student housing");

    // User message should contain the question
    const userMsg = call.messages.find((m) => m.role === "user");
    expect(userMsg).toBeDefined();
    expect(userMsg!.content).toContain("Is this listing good?");
  });

  it("includes context in user message when provided", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              summary: "Test",
              strengths: [],
              risks: [],
              recommendations: [],
              confidence: "low",
            }),
          },
          finish_reason: "stop",
        },
      ],
    });

    await runSkillPerspective({
      skillName: "sublease-risk-analyst",
      question: "Assess this sublease",
      context: "Monthly rent: $1180, Sublease May-Aug",
    });

    const userMsg = mockInvokeLLM.mock.calls[0][0].messages.find((m) => m.role === "user");
    expect(userMsg!.content).toContain("Assess this sublease");
    expect(userMsg!.content).toContain("Monthly rent: $1180");
  });

  it("throws on invalid skill name", async () => {
    await expect(
      runSkillPerspective({
        skillName: "../etc/passwd",
        question: "test",
      })
    ).rejects.toThrow("Invalid skill name");
  });

  it("throws on non-existent skill", async () => {
    await expect(
      runSkillPerspective({
        skillName: "does-not-exist",
        question: "test",
      })
    ).rejects.toThrow('Skill "does-not-exist" not found');
  });

  it("returns fallback with parseFailed when LLM returns plain text (no JSON)", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "This is not JSON at all",
          },
          finish_reason: "stop",
        },
      ],
    });

    const response = await runSkillPerspective({
      skillName: "student-housing-operator",
      question: "test",
    });

    expect(response.result.confidence).toBe("low");
    expect(response.result.strengths).toEqual([]);
    expect(response.result.risks).toEqual([]);
    expect(response.result.recommendations).toEqual([]);
    expect(response.result.summary).toContain("This is not JSON at all");
    expect(response.result.extra?.parseFailed).toBe(true);
  });

  it("returns fallback with parseFailed when LLM returns empty response", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "",
          },
          finish_reason: "stop",
        },
      ],
    });

    const response = await runSkillPerspective({
      skillName: "student-housing-operator",
      question: "test",
    });

    expect(response.result.confidence).toBe("low");
    expect(response.result.extra?.parseFailed).toBe(true);
    expect(response.result.summary).toContain("non-JSON response");
  });

  it("recovers JSON wrapped in markdown code fences", async () => {
    const innerJson = {
      summary: "Fenced response",
      strengths: ["recovered"],
      risks: [],
      recommendations: [],
      confidence: "high",
    };
    mockInvokeLLM.mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "```json\n" + JSON.stringify(innerJson) + "\n```",
          },
          finish_reason: "stop",
        },
      ],
    });

    const response = await runSkillPerspective({
      skillName: "student-housing-operator",
      question: "test",
    });

    expect(response.result.summary).toBe("Fenced response");
    expect(response.result.strengths).toEqual(["recovered"]);
    expect(response.result.confidence).toBe("high");
    expect(response.result.extra?.parseFailed).toBeUndefined();
  });

  it("recovers JSON preceded by explanatory text", async () => {
    const innerJson = {
      summary: "Extracted from preamble",
      strengths: [],
      risks: ["found it"],
      recommendations: [],
      confidence: "medium",
    };
    mockInvokeLLM.mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Here is my analysis:\n\n" + JSON.stringify(innerJson),
          },
          finish_reason: "stop",
        },
      ],
    });

    const response = await runSkillPerspective({
      skillName: "student-housing-operator",
      question: "test",
    });

    expect(response.result.summary).toBe("Extracted from preamble");
    expect(response.result.risks).toEqual(["found it"]);
    expect(response.result.confidence).toBe("medium");
    expect(response.result.extra?.parseFailed).toBeUndefined();
  });

  it("defaults confidence to low when LLM returns invalid confidence", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              summary: "Test",
              strengths: ["good"],
              risks: [],
              recommendations: [],
              confidence: "very-high", // invalid value
            }),
          },
          finish_reason: "stop",
        },
      ],
    });

    const response = await runSkillPerspective({
      skillName: "student-housing-operator",
      question: "test",
    });

    expect(response.result.confidence).toBe("low");
  });
});

/**
 * Integration-style tests: exercise the full runSkillPerspective path with
 * every category of malformed model output, verifying the route never throws
 * and always returns a UI-safe SkillPerspectiveResponse.
 */
describe("Skill Runner — malformed output resilience (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeLLMResponse(content: string) {
    return {
      id: "int-test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [
        { index: 0, message: { role: "assistant" as const, content }, finish_reason: "stop" },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    };
  }

  const SKILL = "listing-conversion-optimizer";
  const BASE_INPUT = { skillName: SKILL, question: "Analyze this listing", context: '{"title":"Test"}' };

  const malformedCases = [
    { name: "plain English refusal", content: "I'm sorry, I cannot analyze this listing." },
    { name: "markdown-fenced valid JSON", content: '```json\n{"summary":"fenced","strengths":[],"risks":["x"],"recommendations":[],"confidence":"high"}\n```' },
    { name: "preamble + JSON", content: 'Sure, here is the analysis:\n\n{"summary":"preamble","strengths":[],"risks":[],"recommendations":["do x"],"confidence":"medium"}' },
    { name: "HTML instead of JSON", content: "<html><body>Not JSON</body></html>" },
    { name: "empty string", content: "" },
    { name: "only whitespace", content: "   \n\n  " },
    { name: "truncated JSON", content: '{"summary":"cut off","strengths":["a"],"ri' },
    { name: "JSON array (wrong shape)", content: '[{"summary":"array"}]' },
  ];

  for (const { name, content } of malformedCases) {
    it(`never throws on: ${name}`, async () => {
      mockInvokeLLM.mockResolvedValueOnce(makeLLMResponse(content));

      // Must not throw — this is the critical invariant
      const response = await runSkillPerspective(BASE_INPUT);

      // Structure invariants: always returns a valid shape
      expect(response.skillName).toBe(SKILL);
      expect(typeof response.result.summary).toBe("string");
      expect(Array.isArray(response.result.strengths)).toBe(true);
      expect(Array.isArray(response.result.risks)).toBe(true);
      expect(Array.isArray(response.result.recommendations)).toBe(true);
      expect(["high", "medium", "low"]).toContain(response.result.confidence);
      expect(typeof response.model).toBe("string");
    });
  }

  it("fenced JSON recovers full structured fields", async () => {
    mockInvokeLLM.mockResolvedValueOnce(
      makeLLMResponse('```json\n{"summary":"Good listing","strengths":["furnished"],"risks":["no photos"],"recommendations":["add photos"],"confidence":"high","suggestedTitle":"Nice Studio"}\n```')
    );

    const response = await runSkillPerspective(BASE_INPUT);
    expect(response.result.summary).toBe("Good listing");
    expect(response.result.strengths).toEqual(["furnished"]);
    expect(response.result.risks).toEqual(["no photos"]);
    expect(response.result.extra?.suggestedTitle).toBe("Nice Studio");
    expect(response.result.extra?.parseFailed).toBeUndefined();
  });

  it("plain-text fallback sets parseFailed for UI consumption", async () => {
    mockInvokeLLM.mockResolvedValueOnce(
      makeLLMResponse("I cannot provide structured analysis for this content.")
    );

    const response = await runSkillPerspective(BASE_INPUT);
    expect(response.result.extra?.parseFailed).toBe(true);
    expect(response.result.confidence).toBe("low");
    expect(response.result.summary).toContain("cannot provide");
  });
});
