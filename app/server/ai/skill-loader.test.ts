import { describe, it, expect } from "vitest";
import { loadSkill, listSkills } from "./skill-loader";

describe("Skill Loader", () => {
  // ── loadSkill — valid names ──────────────────────────────────────────────

  it("loads student-housing-operator skill successfully", async () => {
    const skill = await loadSkill("student-housing-operator");
    expect(skill.name).toBe("student-housing-operator");
    expect(skill.meta.name).toBe("student-housing-operator");
    expect(skill.meta.description).toBeTruthy();
    expect(skill.body.length).toBeGreaterThan(100);
    expect(skill.body).toContain("student");
  });

  it("loads listing-conversion-optimizer skill successfully", async () => {
    const skill = await loadSkill("listing-conversion-optimizer");
    expect(skill.name).toBe("listing-conversion-optimizer");
    expect(skill.body).toContain("listing");
    expect(skill.body).toContain("conversion");
  });

  it("loads sublease-risk-analyst skill successfully", async () => {
    const skill = await loadSkill("sublease-risk-analyst");
    expect(skill.name).toBe("sublease-risk-analyst");
    expect(skill.body).toContain("sublease");
    expect(skill.body).toContain("risk");
  });

  it("parses YAML frontmatter correctly", async () => {
    const skill = await loadSkill("student-housing-operator");
    expect(skill.meta.name).toBe("student-housing-operator");
    expect(skill.meta.description).toContain("international student");
    // Body should NOT contain the frontmatter delimiters
    expect(skill.body).not.toMatch(/^---/);
  });

  // ── loadSkill — invalid names ────────────────────────────────────────────

  it("rejects empty skill name", async () => {
    await expect(loadSkill("")).rejects.toThrow("Invalid skill name");
  });

  it("rejects skill name with path traversal", async () => {
    await expect(loadSkill("../etc/passwd")).rejects.toThrow("Invalid skill name");
  });

  it("rejects skill name with slashes", async () => {
    await expect(loadSkill("foo/bar")).rejects.toThrow("Invalid skill name");
  });

  it("rejects skill name with uppercase", async () => {
    await expect(loadSkill("Student-Housing")).rejects.toThrow("Invalid skill name");
  });

  it("rejects skill name with spaces", async () => {
    await expect(loadSkill("student housing")).rejects.toThrow("Invalid skill name");
  });

  it("rejects skill name with dots", async () => {
    await expect(loadSkill("skill.name")).rejects.toThrow("Invalid skill name");
  });

  // ── loadSkill — missing skill ────────────────────────────────────────────

  it("throws clear error for non-existent skill", async () => {
    await expect(loadSkill("nonexistent-skill")).rejects.toThrow(
      'Skill "nonexistent-skill" not found'
    );
  });

  // ── listSkills ───────────────────────────────────────────────────────────

  it("lists all available skills", async () => {
    const skills = await listSkills();
    expect(skills).toContain("student-housing-operator");
    expect(skills).toContain("listing-conversion-optimizer");
    expect(skills).toContain("sublease-risk-analyst");
    expect(skills.length).toBeGreaterThanOrEqual(3);
    // Should be sorted
    const sorted = [...skills].sort();
    expect(skills).toEqual(sorted);
  });
});
