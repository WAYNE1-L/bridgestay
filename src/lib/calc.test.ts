import { describe, it, expect } from 'vitest'
import { calc, validateInput } from '../lib/calc'
import type { RoiInput } from '../lib/calc'

describe('calc', () => {
  const sampleInput: RoiInput = {
    purchasePrice: 300000,
    downPct: 20,
    rentMonthly: 2400,
    expensesMonthly: 800,
    interestPct: 6.5,
    years: 30,
    taxPct: 1.2,
    insuranceMonthly: 150,
    hoaMonthly: 0,
    mgmtPct: 8,
    maintPct: 5,
    vacancyPct: 5,
  }

  it('should calculate ROI metrics correctly', () => {
    const result = calc(sampleInput)

    // Basic property calculations
    expect(result.purchasePrice).toBe(300000)
    expect(result.downPayment).toBe(60000) // 20% of 300000
    expect(result.loanAmount).toBe(240000) // 300000 - 60000

    // Monthly expenses should be positive
    expect(result.pi).toBeGreaterThan(0) // Principal & Interest
    expect(result.tax).toBeGreaterThan(0) // Property tax
    expect(result.insurance).toBe(150)
    expect(result.hoa).toBe(0)
    expect(result.mgmt).toBeGreaterThan(0) // Management fee
    expect(result.maint).toBeGreaterThan(0) // Maintenance
    expect(result.vac).toBeGreaterThan(0) // Vacancy

    // Total expenses should be sum of all expenses
    const expectedTotal = result.pi + result.tax + result.insurance + result.hoa + 
                         result.mgmt + result.maint + result.vac + sampleInput.expensesMonthly
    expect(result.totalExpenses).toBeCloseTo(expectedTotal, 2)

    // Cash flow calculations
    expect(result.monthlyCashFlow).toBeCloseTo(sampleInput.rentMonthly - result.totalExpenses, 2)
    expect(result.annualCashFlow).toBeCloseTo(result.monthlyCashFlow * 12, 2)

    // Key metrics should be reasonable
    expect(result.capRate).toBeGreaterThan(0)
    // Cash on cash can be negative for unprofitable properties
    expect(typeof result.coc).toBe('number')
    expect(result.dscr).toBeGreaterThan(0)
    expect(result.breakEvenRent).toBeCloseTo(result.totalExpenses, 2)
  })

  it('should handle edge cases', () => {
    const zeroLoanInput: RoiInput = {
      ...sampleInput,
      downPct: 100, // 100% down payment = no loan
    }

    const result = calc(zeroLoanInput)
    expect(result.loanAmount).toBe(0)
    expect(result.pi).toBe(0) // No principal & interest with no loan
  })

  it('should handle zero rent', () => {
    const zeroRentInput: RoiInput = {
      ...sampleInput,
      rentMonthly: 0,
    }

    const result = calc(zeroRentInput)
    expect(result.monthlyCashFlow).toBeLessThan(0) // Should be negative
    expect(result.annualCashFlow).toBeLessThan(0)
  })
})

describe('validateInput', () => {
  const validInput: RoiInput = {
    purchasePrice: 300000,
    downPct: 20,
    rentMonthly: 2400,
    expensesMonthly: 800,
    interestPct: 6.5,
    years: 30,
    taxPct: 1.2,
    insuranceMonthly: 150,
    hoaMonthly: 0,
    mgmtPct: 8,
    maintPct: 5,
    vacancyPct: 5,
  }

  it('should validate correct input', () => {
    const result = validateInput(validInput)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should catch invalid purchase price', () => {
    const invalidInput = { ...validInput, purchasePrice: -1000 }
    const result = validateInput(invalidInput)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Purchase price must be greater than 0')
  })

  it('should catch invalid down payment percentage', () => {
    const invalidInput = { ...validInput, downPct: 150 }
    const result = validateInput(invalidInput)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Down payment percentage must be between 0 and 100')
  })

  it('should catch multiple validation errors', () => {
    const invalidInput = { 
      ...validInput, 
      purchasePrice: -1000,
      downPct: 150,
      interestPct: 60
    }
    const result = validateInput(invalidInput)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})
