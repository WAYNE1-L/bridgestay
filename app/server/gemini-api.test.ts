import { describe, it, expect } from "vitest";

describe("Gemini API Key Validation", () => {
  it("should have VITE_GEMINI_API_KEY environment variable set", () => {
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey?.length).toBeGreaterThan(10);
  });

  it("should be able to list models with the API key", async () => {
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_GEMINI_API_KEY is not set");
    }

    // Call the ListModels endpoint to validate the API key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.models).toBeDefined();
    expect(Array.isArray(data.models)).toBe(true);
    expect(data.models.length).toBeGreaterThan(0);
    
    // Check that gemini-2.0-flash model exists
    const modelNames = data.models.map((m: { name: string }) => m.name);
    const hasGeminiModel = modelNames.some((name: string) => 
      name.includes("gemini-2.0-flash") || name.includes("gemini-pro")
    );
    expect(hasGeminiModel).toBe(true);
  });
});
