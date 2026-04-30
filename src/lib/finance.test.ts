/**
 * Tests for the simplified finance calculations
 */

import { describe, it, expect } from 'vitest'
import { pmt, compute } from '../lib/finance'

describe('Financial Calculations', () => {
  describe('PMT Function', () => {
    it('should calculate monthly payment correctly', () => {
      // Test case: $300,000 loan, 6.5% annual rate, 30 years
      const result = pmt(0.065/12, 30*12, 300000)
      expect(result).toBeCloseTo(1896.20, 2)
    })

    it('should handle zero interest rate', () => {
      const result = pmt(0, 30*12, 300000)
      expect(result).toBeCloseTo(833.33, 2)
    })

    it('should handle edge case with very small principal', () => {
      const result = pmt(0.065/12, 30*12, 1000)
      expect(result).toBeCloseTo(6.32, 2)
    })
  })

  describe('Compute Function', () => {
    it('should calculate ROI metrics correctly', () => {
      const input = {
        purchasePrice: 300000,
        downPct: 0.2,
        rentMonthly: 2400,
        expensesMonthly: 800,
        interestPct: 0.065,
        years: 30,
        taxPct: 0.012,
        insuranceMonthly: 150,
        hoaMonthly: 0,
        mgmtPct: 0.08,
        maintPct: 0.05,
        vacancyPct: 0.05
      }

      const result = compute(input)

      expect(result.downPayment).toBe(60000)
      expect(result.loanAmount).toBe(240000)
      expect(result.monthlyCashFlow).toBeTypeOf('number')
      expect(result.annualCashFlow).toBeTypeOf('number')
      expect(result.capRate).toBeTypeOf('number')
      expect(result.coc).toBeTypeOf('number')
      expect(result.dscr).toBeTypeOf('number')
    })

    it('should never produce NaN', () => {
      const input = {
        purchasePrice: 0,
        downPct: 0,
        rentMonthly: 0,
        expensesMonthly: 0,
        interestPct: 0,
        years: 0,
        taxPct: 0,
        insuranceMonthly: 0,
        hoaMonthly: 0,
        mgmtPct: 0,
        maintPct: 0,
        vacancyPct: 0
      }

      const result = compute(input)

      expect(Number.isFinite(result.downPayment)).toBe(true)
      expect(Number.isFinite(result.loanAmount)).toBe(true)
      expect(Number.isFinite(result.monthlyCashFlow)).toBe(true)
      expect(Number.isFinite(result.annualCashFlow)).toBe(true)
      expect(Number.isFinite(result.capRate)).toBe(true)
      expect(Number.isFinite(result.coc)).toBe(true)
      expect(Number.isFinite(result.dscr)).toBe(true)
    })

    it('should handle realistic property scenario', () => {
      const input = {
        purchasePrice: 400000,
        downPct: 0.25,
        rentMonthly: 3000,
        expensesMonthly: 1200,
        interestPct: 0.07,
        years: 30,
        taxPct: 0.015,
        insuranceMonthly: 200,
        hoaMonthly: 150,
        mgmtPct: 0.1,
        maintPct: 0.08,
        vacancyPct: 0.05
      }

      const result = compute(input)

      // Basic sanity checks
      expect(result.downPayment).toBe(100000)
      expect(result.loanAmount).toBe(300000)
      expect(result.monthlyCashFlow).toBeLessThan(result.rentMonthly)
      expect(result.annualCashFlow).toBe(result.monthlyCashFlow * 12)
      // Cap rate can be negative for cash-flow negative properties
      expect(result.capRate).toBeTypeOf('number')
      expect(result.coc).toBeTypeOf('number')
      expect(result.dscr).toBeGreaterThan(0)
    })
  })
})