/**
 * Skill Runner — executes a loaded skill as an AI perspective analysis.
 *
 * Takes a skill name + question + optional context, builds a system prompt
 * from the skill's SKILL.md body, calls the existing invokeLLM pathway
 * (Gemini 2.5 Flash), and returns a structured response.
 */

import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import { loadSkill } from "./skill-loader";

// ── Types ─────────────────────────────────────────────────────────────────

export interface SkillPerspectiveInput {
  skillName: string;
  question: string;
  context?: string;
}

export interface SkillPerspectiveResult {
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  confidence: "high" | "medium" | "low";
  /** Extra fields the skill may return (e.g. suggestedTitle, suggestedTags) */
  extra?: Record<string, unknown>;
}

export interface SkillPerspectiveResponse {
  skillName: string;
  result: SkillPerspectiveResult;
  /** Which model was used */
  model: string;
  /** Token usage if available */
  usage?: { prompt: number; completion: number };
}

// ── Output schema for structured JSON ─────────────────────────────────────

const PERSPECTIVE_OUTPUT_SCHEMA = {
  name: "skill_perspective",
  schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "One-paragraph assessment",
      },
      strengths: {
        type: "array",
        items: { type: "string" },
        description: "Positive factors identified",
      },
      risks: {
        type: "array",
        items: { type: "string" },
        description: "Risk factors or concerns",
      },
      recommendations: {
        type: "array",
        items: { type: "string" },
        description: "Actionable recommendations",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Confidence in the assessment given available information",
      },
      suggestedTitle: {
        type: "string",
        description: "Improved listing title (only if the skill suggests one)",
      },
      missingFields: {
        type: "array",
        items: { type: "string" },
        description: "Important fields that are missing from the listing",
      },
      suggestedTags: {
        type: "array",
        items: { type: "string" },
        description: "Recommended tags for the listing",
      },
    },
    required: ["summary", "strengths", "risks", "recommendations", "confidence"],
    additionalProperties: false,
  },
};

// ── JSON parse helpers (mirrors wechat-import.ts strategies) ──────────────

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
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }

  return raw.slice(start).trim() || null;
}

/**
 * Try multiple strategies to parse a JSON string from the LLM.
 * Returns the parsed object and the strategy name, or null.
 */
function resilientJsonParse(raw: string): { parsed: Record<string, unknown>; strategy: string } | null {
  const candidates: { label: string; value: string }[] = [];

  candidates.push({ label: "raw", value: raw.trim() });

  const stripped = stripMarkdownFences(raw);
  if (stripped !== raw.trim()) {
    candidates.push({ label: "stripped-fences", value: stripped });
  }

  const extracted = findFirstJsonObjectBlock(raw);
  if (extracted && !candidates.some((c) => c.value === extracted)) {
    candidates.push({ label: "extracted-object", value: extracted });
  }

  for (const candidate of candidates) {
    try {
      const obj = JSON.parse(candidate.value);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        return { parsed: obj as Record<string, unknown>, strategy: candidate.label };
      }
    } catch {
      // try next strategy
    }
  }

  return null;
}

/**
 * Build a best-effort fallback result from raw LLM text when JSON parse fails.
 */
function buildFallbackResult(raw: string, skillName: string): SkillPerspectiveResult {
  const trimmed = raw.trim().slice(0, 500);
  return {
    summary: trimmed || `Skill "${skillName}" returned a non-JSON response.`,
    strengths: [],
    risks: [],
    recommendations: [],
    confidence: "low",
    extra: { parseFailed: true },
  };
}

// ── Runner ─────────────────────────────────────────────────────────────────

/**
 * Run a skill perspective analysis.
 *
 * Loads the skill's SKILL.md, uses it as the system prompt, sends the
 * question + context to Gemini, and parses the structured response.
 */
export async function runSkillPerspective(
  input: SkillPerspectiveInput
): Promise<SkillPerspectiveResponse> {
  const { skillName, question, context } = input;

  // Load the skill
  const skill = await loadSkill(skillName);

  // Check LLM availability
  if (!ENV.geminiApiKey) {
    console.warn("[Skill Runner] No Gemini API key — returning mock response");
    return {
      skillName,
      result: {
        summary: `[Mock] Skill "${skillName}" would analyze: ${question.slice(0, 100)}`,
        strengths: ["Mock response — configure GEMINI_API_KEY for real analysis"],
        risks: ["No AI analysis available without API key"],
        recommendations: ["Set GEMINI_API_KEY or BUILT_IN_FORGE_API_KEY in app/.env"],
        confidence: "low",
      },
      model: "mock",
    };
  }

  // Build the user message
  let userMessage = question;
  if (context) {
    userMessage = `${question}\n\n--- Context ---\n${context}`;
  }

  // Call LLM
  const result = await invokeLLM({
    messages: [
      { role: "system", content: skill.body },
      { role: "user", content: userMessage },
    ],
    outputSchema: PERSPECTIVE_OUTPUT_SCHEMA,
    maxTokens: 1024,
  });

  // Parse response with resilient multi-strategy approach
  const raw = result.choices[0]?.message?.content;
  if (!raw || typeof raw !== "string") {
    console.warn(`[Skill Runner] Skill "${skillName}" returned empty response — using fallback`);
    return {
      skillName,
      result: buildFallbackResult("", skillName),
      model: result.model || "gemini-2.5-flash",
    };
  }

  const parseResult = resilientJsonParse(raw);

  if (!parseResult) {
    console.warn(
      `[Skill Runner] Skill "${skillName}" returned unparseable response (len=${raw.length}). ` +
      `Preview: ${raw.slice(0, 300)}`
    );
    return {
      skillName,
      result: buildFallbackResult(raw, skillName),
      model: result.model || "gemini-2.5-flash",
      usage: result.usage
        ? { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens }
        : undefined,
    };
  }

  if (parseResult.strategy !== "raw") {
    console.info(
      `[Skill Runner] Skill "${skillName}" JSON recovered via "${parseResult.strategy}" strategy`
    );
  }

  const parsed = parseResult.parsed;

  // Validate required fields
  const summary = typeof parsed.summary === "string" ? parsed.summary : "";
  const strengths = Array.isArray(parsed.strengths)
    ? parsed.strengths.filter((s): s is string => typeof s === "string")
    : [];
  const risks = Array.isArray(parsed.risks)
    ? parsed.risks.filter((s): s is string => typeof s === "string")
    : [];
  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations.filter((s): s is string => typeof s === "string")
    : [];
  const confidence =
    parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
      ? parsed.confidence
      : "low";

  // Collect extra fields
  const extra: Record<string, unknown> = {};
  if (typeof parsed.suggestedTitle === "string" && parsed.suggestedTitle) {
    extra.suggestedTitle = parsed.suggestedTitle;
  }
  if (Array.isArray(parsed.missingFields) && parsed.missingFields.length > 0) {
    extra.missingFields = parsed.missingFields;
  }
  if (Array.isArray(parsed.suggestedTags) && parsed.suggestedTags.length > 0) {
    extra.suggestedTags = parsed.suggestedTags;
  }

  return {
    skillName,
    result: {
      summary,
      strengths,
      risks,
      recommendations,
      confidence,
      ...(Object.keys(extra).length > 0 ? { extra } : {}),
    },
    model: result.model || "gemini-2.5-flash",
    usage: result.usage
      ? { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens }
      : undefined,
  };
}
