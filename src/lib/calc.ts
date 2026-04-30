/**
 * Pure ROI calculation functions
 * These functions are pure and can be safely run in a Web Worker
 */

import { pmt } from './finance'

// Input types for ROI calculations
export interface RoiInput {
  purchasePrice: number
  downPct: number
  rentMonthly: number
  expensesMonthly: number
  interestPct: number
  years: number
  taxPct: number
  insuranceMonthly: number
  hoaMonthly: number
  mgmtPct: number
  maintPct: number
  vacancyPct: number
}

// Result types for ROI calculations
export interface CalcResult {
  // Property details
  purchasePrice: number
  downPayment: number
  loanAmount: number
  
  // Monthly expenses breakdown
  pi: number // Principal & Interest
  tax: number // Property tax (monthly)
  insurance: number
  hoa: number
  mgmt: number // Management fee (monthly)
  maint: number // Maintenance (monthly)
  vac: number // Vacancy (monthly)
  totalExpenses: number
  
  // Key metrics
  monthlyCashFlow: number
  annualCashFlow: number
  capRate: number
  coc: number // Cash on Cash return
  dscr: number // Debt Service Coverage Ratio
  breakEvenRent: number
  
  // Additional metrics
  monthlyRent: number
  grossRent: number // Annual gross rent
  netOperatingIncome: number
  totalReturn: number
}

/**
 * Pure function to calculate ROI metrics
 * This function is pure and can be safely run in a Web Worker
 */
export function calc(input: RoiInput): CalcResult {
  const {
    purchasePrice,
    downPct,
    rentMonthly,
    expensesMonthly,
    interestPct,
    years,
    taxPct,
    insuranceMonthly,
    hoaMonthly,
    mgmtPct,
    maintPct,
    vacancyPct
  } = input

  // Basic calculations
  const downPayment = purchasePrice * (downPct / 100)
  const loanAmount = purchasePrice - downPayment
  
  // Monthly mortgage payment (P&I)
  const monthlyRate = interestPct / 100 / 12
  const totalPayments = years * 12
  const pi = loanAmount > 0 ? pmt(monthlyRate, totalPayments, loanAmount) : 0
  
  // Monthly expenses breakdown
  const tax = (purchasePrice * taxPct / 100) / 12
  const insurance = insuranceMonthly
  const hoa = hoaMonthly
  const mgmt = rentMonthly * (mgmtPct / 100)
  const maint = rentMonthly * (maintPct / 100)
  const vac = rentMonthly * (vacancyPct / 100)
  
  const totalExpenses = pi + tax + insurance + hoa + mgmt + maint + vac + expensesMonthly
  
  // Cash flow calculations
  const monthlyCashFlow = rentMonthly - totalExpenses
  const annualCashFlow = monthlyCashFlow * 12
  
  // Key metrics
  const grossRent = rentMonthly * 12
  const netOperatingIncome = grossRent - (tax * 12 + insurance * 12 + hoa * 12 + mgmt * 12 + maint * 12 + vac * 12 + expensesMonthly * 12)
  const capRate = purchasePrice > 0 ? netOperatingIncome / purchasePrice : 0
  const coc = downPayment > 0 ? annualCashFlow / downPayment : 0
  const dscr = pi > 0 ? (rentMonthly - (tax + insurance + hoa + mgmt + maint + vac + expensesMonthly)) / pi : 0
  const breakEvenRent = totalExpenses
  
  // Total return calculation
  const totalReturn = downPayment > 0 ? (annualCashFlow + (purchasePrice * 0.03)) / downPayment : 0 // Assuming 3% appreciation

  return {
    // Property details
    purchasePrice,
    downPayment,
    loanAmount,
    
    // Monthly expenses breakdown
    pi,
    tax,
    insurance,
    hoa,
    mgmt,
    maint,
    vac,
    totalExpenses,
    
    // Key metrics
    monthlyCashFlow,
    annualCashFlow,
    capRate,
    coc,
    dscr,
    breakEvenRent,
    
    // Additional metrics
    monthlyRent: rentMonthly,
    grossRent,
    netOperatingIncome,
    totalReturn
  }
}

/**
 * Calculate GRM (Gross Rent Multiplier)
 */
export function calcGRM(price: number, rent: number): number {
  const annualRent = rent * 12
  return annualRent > 0 ? price / annualRent : 0
}

/**
 * Calculate Cap Rate (Capitalization Rate)
 */
export function calcCapRate(noi: number, price: number): number {
  return price > 0 ? (noi / price) * 100 : 0
}

/**
 * Validate input parameters
 */
export function validateInput(input: RoiInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (input.purchasePrice <= 0) errors.push('Purchase price must be greater than 0')
  if (input.downPct < 0 || input.downPct > 100) errors.push('Down payment percentage must be between 0 and 100')
  if (input.rentMonthly < 0) errors.push('Monthly rent must be non-negative')
  if (input.expensesMonthly < 0) errors.push('Monthly expenses must be non-negative')
  if (input.interestPct < 0 || input.interestPct > 50) errors.push('Interest rate must be between 0 and 50%')
  if (input.years <= 0 || input.years > 50) errors.push('Loan years must be between 1 and 50')
  if (input.taxPct < 0 || input.taxPct > 10) errors.push('Property tax rate must be between 0 and 10%')
  if (input.insuranceMonthly < 0) errors.push('Monthly insurance must be non-negative')
  if (input.hoaMonthly < 0) errors.push('Monthly HOA must be non-negative')
  if (input.mgmtPct < 0 || input.mgmtPct > 50) errors.push('Management fee must be between 0 and 50%')
  if (input.maintPct < 0 || input.maintPct > 50) errors.push('Maintenance fee must be between 0 and 50%')
  if (input.vacancyPct < 0 || input.vacancyPct > 50) errors.push('Vacancy rate must be between 0 and 50%')
  
  return {
    valid: errors.length === 0,
    errors
  }
}
