/**
 * Safe formatting utilities that never render NaN
 */

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const usd = (n: unknown): string => {
  if (n === null || n === undefined || n === '') return '—'
  const num = Number(n)
  return Number.isFinite(num) ? usdFormatter.format(num) : '—'
}

export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`
export const safeUSD = (n: unknown) => {
  if (n === null || n === undefined || n === '') return '—'
  const num = Number(n)
  return Number.isFinite(num) ? usdFormatter.format(num) : '—'
}

export const safePct = (n: unknown, d = 1) => {
  if (n === null || n === undefined || n === '') return '—'
  const num = Number(n)
  return Number.isFinite(num) ? pct(num, d) : '—'
}

// Additional formatting functions for backward compatibility
export const usd0 = (n: unknown) => Number.isFinite(Number(n)) ? usdFormatter.format(Number(n)) : '—'
export const usdCompact = (n: unknown) => {
  if (!Number.isFinite(Number(n))) return '—'
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1 
  }).format(Number(n))
}

export const date = (value: string | Date | null | undefined): string => {
  if (!value) return ''
  const dateObj = typeof value === 'string' ? new Date(value) : value
  if (isNaN(dateObj.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj)
}

// Legacy aliases for backward compatibility
export const formatCurrency = safeUSD
export const formatPercent = safePct