/**
 * Type-safe number parsing with support for human-readable formats
 * Handles: 2500, "$2,500", "2.5k", etc.
 */

export function toNumber(v: unknown, def = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (!s) return def;
    
    // Handle 'k' suffix (e.g., "2.5k" → 2500)
    if (s.endsWith('k')) {
      const num = Number(s.slice(0, -1));
      if (Number.isFinite(num)) {
        return num * 1000;
      }
      return def;
    }
    
    // Remove non-numeric characters except decimal point and minus sign
    const cleaned = s.replace(/[^\d.-]/g, '');
    const num = Number(cleaned);
    
    return Number.isFinite(num) ? num : def;
  }
  
  return def;
}

/**
 * Alias for toNumber (backward compatibility)
 */
export const toNum = toNumber
export const parseNumber = toNumber

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse percentage string to number (e.g., "5%" → 0.05, "10" → 0.1)
 */
export function toPercent(v: unknown, def = 0): number {
  const num = toNumber(v, def * 100);
  return num / 100;
}

/**
 * Alias for toPercent (backward compatibility)
 */
export const toPct = toPercent

/**
 * Format percentage with % sign
 */
export function formatPercent(num: number): string {
  return `${(num * 100).toFixed(2)}%`;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}