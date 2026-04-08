/**
 * Skill Loader — reads SKILL.md files from the local skills directory.
 *
 * Skills are stored as markdown files following the Claude Agent Skills format:
 *   app/server/ai/skills/<skill-name>/SKILL.md
 *
 * Each file has optional YAML frontmatter (---) and a markdown body that
 * serves as a system prompt / cognitive framework for the AI.
 */

import { readFile } from "node:fs/promises";
import { resolve, join, relative } from "node:path";

// ── Constants ─────────────────────────────────────────────────────────────

const SKILLS_DIR = resolve(import.meta.dirname, "skills");
const SKILL_FILENAME = "SKILL.md";

// Allowed characters in a skill name: lowercase letters, digits, hyphens
const VALID_SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ── Types ─────────────────────────────────────────────────────────────────

export interface SkillMeta {
  name: string;
  description: string;
  [key: string]: string;
}

export interface LoadedSkill {
  /** Sanitized skill name */
  name: string;
  /** Parsed YAML frontmatter fields */
  meta: SkillMeta;
  /** Markdown body (everything after the frontmatter) */
  body: string;
  /** Full raw content of SKILL.md */
  raw: string;
}

// ── Frontmatter parser (tiny, no dependency) ──────────────────────────────

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) {
    return { meta: {}, body: raw };
  }

  const endIndex = trimmed.indexOf("---", 3);
  if (endIndex === -1) {
    return { meta: {}, body: raw };
  }

  const yamlBlock = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 3).trim();

  const meta: Record<string, string> = {};
  for (const line of yamlBlock.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) meta[key] = value;
  }

  return { meta, body };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Load a skill by name from the skills directory.
 *
 * @throws if the name is invalid, contains path traversal, or the skill doesn't exist
 */
export async function loadSkill(skillName: string): Promise<LoadedSkill> {
  // 1. Validate name format
  if (!skillName || !VALID_SKILL_NAME.test(skillName)) {
    throw new Error(
      `Invalid skill name "${skillName}" — must be lowercase alphanumeric with hyphens (e.g. "student-housing-operator")`
    );
  }

  // 2. Resolve path and verify it stays inside SKILLS_DIR (path traversal guard)
  const skillPath = resolve(join(SKILLS_DIR, skillName, SKILL_FILENAME));
  const rel = relative(SKILLS_DIR, skillPath);
  if (rel.startsWith("..") || resolve(SKILLS_DIR, rel) !== skillPath) {
    throw new Error(`Skill name "${skillName}" resolves outside the skills directory`);
  }

  // 3. Read file
  let raw: string;
  try {
    raw = await readFile(skillPath, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(`Skill "${skillName}" not found — no SKILL.md at ${skillPath}`);
    }
    throw err;
  }

  // 4. Parse frontmatter
  const { meta, body } = parseFrontmatter(raw);

  return {
    name: skillName,
    meta: {
      name: meta.name || skillName,
      description: meta.description || "",
      ...meta,
    },
    body,
    raw,
  };
}

/**
 * List all available skill names (directories that contain a SKILL.md).
 */
export async function listSkills(): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const { existsSync } = await import("node:fs");

  try {
    const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
    return entries
      .filter(
        (e) =>
          e.isDirectory() &&
          VALID_SKILL_NAME.test(e.name) &&
          existsSync(join(SKILLS_DIR, e.name, SKILL_FILENAME))
      )
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}
