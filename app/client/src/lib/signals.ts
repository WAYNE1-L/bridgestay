/**
 * signals.ts — Phase 4 lightweight listing analysis
 *
 * Pure rule-based signals derived from existing apartment fields.
 * No server calls, no ML. Runs client-side on any apartment-shaped object.
 *
 * Design goals:
 *  - Zero new DB columns or API endpoints
 *  - Fully defensive: every field is treated as optional/nullable
 *  - Works for both DB apartments and context-listing shapes
 *  - Transparent rules — each signal has a human-readable description
 */

export type Signal = {
  id: string;
  label: string;
  emoji: string;
  /** Tailwind bg + text color classes for the pill */
  colorClasses: string;
  /** One-line explanation shown in the detail view */
  description: string;
  /** Lower number = shown first when truncating to a max */
  priority: number;
};

// ── Month helpers ─────────────────────────────────────────────────────────────

/** Returns 0-based month from a Date, string, or null/undefined */
function monthOf(value: unknown): number | null {
  if (!value) return null;
  try {
    const d = value instanceof Date ? value : new Date(value as string);
    if (isNaN(d.getTime())) return null;
    return d.getMonth(); // 0 = Jan, 4 = May, 7 = Aug
  } catch {
    return null;
  }
}

/** True if a date value is within the next `days` calendar days from today */
function isWithinDays(value: unknown, days: number): boolean {
  if (!value) return false;
  try {
    const d = value instanceof Date ? value : new Date(value as string);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const msLimit = days * 24 * 60 * 60 * 1000;
    return d.getTime() >= now.getTime() && d.getTime() <= now.getTime() + msLimit;
  } catch {
    return false;
  }
}

// ── JSON array helpers ────────────────────────────────────────────────────────

function parseJsonArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function includesCaseInsensitive(arr: string[], term: string): boolean {
  const lower = term.toLowerCase();
  return arr.some((s) => typeof s === "string" && s.toLowerCase().includes(lower));
}

// ── Signal definitions ────────────────────────────────────────────────────────

const SIGNAL_DEFS: Omit<Signal, "priority">[] = [
  {
    id: "summer_sublease",
    label: "Summer Sublease",
    emoji: "☀️",
    colorClasses: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    description: "Available this summer — ideal for students going home in the fall",
  },
  {
    id: "near_campus",
    label: "Near Campus",
    emoji: "🎓",
    colorClasses: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    description: "Within 15 miles of a university",
  },
  {
    id: "furnished",
    label: "Furnished",
    emoji: "🪑",
    colorClasses: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    description: "Comes with furniture — no moving costs",
  },
  {
    id: "utilities_included",
    label: "Utilities Included",
    emoji: "💡",
    colorClasses: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    description: "Some or all utilities are included in the monthly rent",
  },
  {
    id: "sublease",
    label: "Sublease",
    emoji: "📋",
    colorClasses: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    description: "The current tenant is subletting — flexible and often cheaper",
  },
  {
    id: "short_term",
    label: "Short-Term",
    emoji: "⏱️",
    colorClasses: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
    description: "Lease of 6 months or less — great for gap semesters or co-ops",
  },
  {
    id: "move_in_soon",
    label: "Available Soon",
    emoji: "🔑",
    colorClasses: "bg-green-500/15 text-green-700 dark:text-green-400",
    description: "Ready to move in within the next 30 days",
  },
];

// Map id → priority (lower = higher priority in truncated views)
const PRIORITY: Record<string, number> = {
  summer_sublease: 1,
  near_campus: 2,
  furnished: 3,
  utilities_included: 4,
  sublease: 5,
  short_term: 6,
  move_in_soon: 7,
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Compute analysis signals for any apartment-shaped object.
 *
 * All fields are treated as optional/nullable — safe for both DB apartments
 * (full schema) and context listings (partial shape from ListingsContext).
 */
export function computeSignals(apartment: Record<string, unknown>): Signal[] {
  const signals: Signal[] = [];

  const isSublease = Boolean(apartment.isSublease);
  const availableFromMonth = monthOf(apartment.availableFrom);
  // May (4) through August (7) = typical summer window
  const isSummerAvailable =
    availableFromMonth !== null && availableFromMonth >= 4 && availableFromMonth <= 7;

  const amenities = parseJsonArray(apartment.amenities);
  const utilities = parseJsonArray(apartment.utilitiesIncluded);
  const nearbyUniversities = parseJsonArray(apartment.nearbyUniversities);

  const minLeaseTerm =
    apartment.minLeaseTerm != null ? Number(apartment.minLeaseTerm) : null;

  const addSignal = (id: string) => {
    const def = SIGNAL_DEFS.find((d) => d.id === id);
    if (!def) return;
    signals.push({ ...def, priority: PRIORITY[id] ?? 99 });
  };

  // ── Rule 1: Summer Sublease ────────────────────────────────────────────────
  // Sublease AND available in May-Aug. Takes priority over plain "Sublease".
  if (isSublease && isSummerAvailable) {
    addSignal("summer_sublease");
  }

  // ── Rule 2: Near Campus ───────────────────────────────────────────────────
  if (nearbyUniversities.length > 0) {
    addSignal("near_campus");
  }

  // ── Rule 3: Furnished ────────────────────────────────────────────────────
  if (includesCaseInsensitive(amenities, "furnished")) {
    addSignal("furnished");
  }

  // ── Rule 4: Utilities Included ───────────────────────────────────────────
  if (utilities.length > 0) {
    addSignal("utilities_included");
  }

  // ── Rule 5: Sublease (plain) — only when NOT summer ──────────────────────
  // Avoids showing both "Summer Sublease" and "Sublease" on the same card.
  if (isSublease && !isSummerAvailable) {
    addSignal("sublease");
  }

  // ── Rule 6: Short-Term ───────────────────────────────────────────────────
  if (minLeaseTerm !== null && minLeaseTerm >= 1 && minLeaseTerm <= 6) {
    addSignal("short_term");
  }

  // ── Rule 7: Available Soon ────────────────────────────────────────────────
  if (isWithinDays(apartment.availableFrom, 30)) {
    addSignal("move_in_soon");
  }

  // Return sorted by priority
  return signals.sort((a, b) => a.priority - b.priority);
}

/**
 * Convenience: top N signals, sorted by priority.
 * Used by list cards which only have room for a few badges.
 */
export function topSignals(apartment: Record<string, unknown>, max: number): Signal[] {
  return computeSignals(apartment).slice(0, max);
}
