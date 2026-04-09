export function safeJsonArray(value: unknown): string[] {
  if (!value || typeof value !== "string") return [];
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // fall through to comma split
    }
  }
  // Fallback: treat as comma-separated string
  return trimmed.split(",").map(s => s.trim()).filter(Boolean);
}
