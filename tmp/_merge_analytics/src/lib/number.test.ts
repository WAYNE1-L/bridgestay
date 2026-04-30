import { describe, it, expect } from 'vitest'
import { parseNumber, clamp, formatPercent } from '../lib/number'

describe('parseNumber', () => {
  it('should parse valid numbers', () => {
    expect(parseNumber('123')).toBe(123)
    expect(parseNumber('123.45')).toBe(123.45)
    expect(parseNumber('1,234.56')).toBe(1234.56)
    expect(parseNumber('1,234')).toBe(1234)
    expect(parseNumber('0')).toBe(0)
    expect(parseNumber('0.0')).toBe(0)
  })

  it('should handle edge cases', () => {
    expect(parseNumber('')).toBe(null)
    expect(parseNumber('   ')).toBe(null)
    expect(parseNumber('abc')).toBe(null)
    expect(parseNumber('12.34.56')).toBe(null)
    expect(parseNumber('--123')).toBe(null)
    expect(parseNumber('++123')).toBe(null)
  })

  it('should handle whitespace', () => {
    expect(parseNumber('  123  ')).toBe(123)
    expect(parseNumber('  1,234.56  ')).toBe(1234.56)
  })

  it('should handle negative numbers', () => {
    expect(parseNumber('-123')).toBe(-123)
    expect(parseNumber('-1,234.56')).toBe(-1234.56)
  })
})

describe('clamp', () => {
  it('should clamp values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it('should clamp values below minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(0.5, 1, 10)).toBe(1)
  })

  it('should clamp values above maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10)
    expect(clamp(9.5, 0, 9)).toBe(9)
  })

  it('should handle edge cases', () => {
    expect(clamp(NaN, 0, 10)).toBe(NaN)
    expect(clamp(Infinity, 0, 10)).toBe(10)
    expect(clamp(-Infinity, 0, 10)).toBe(0)
  })
})

describe('formatPercent', () => {
  it('should format percentages correctly', () => {
    expect(formatPercent(0.065)).toBe('6.50%')
    expect(formatPercent(0.1)).toBe('10.00%')
    expect(formatPercent(0)).toBe('0.00%')
    expect(formatPercent(1)).toBe('100.00%')
  })

  it('should handle edge cases', () => {
    expect(formatPercent(NaN)).toBe('0.00%')
    expect(formatPercent(Infinity)).toBe('0.00%')
    expect(formatPercent(-Infinity)).toBe('0.00%')
  })
})