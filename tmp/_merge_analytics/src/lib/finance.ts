/**
 * Pure financial calculation functions that never produce NaN
 */

export const pmt = (r: number, n: number, pv: number) => r === 0 ? pv / n : (r * pv) / (1 - Math.pow(1 + r, -n))

interface RoiInput {
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

export function compute(v: RoiInput) {
  const downPayment = v.purchasePrice * v.downPct
  const loanAmount = Math.max(0, v.purchasePrice - downPayment)
  const r = v.interestPct / 12
  const n = Math.max(0, Math.floor(v.years * 12))
  const pi = n > 0 ? pmt(r, n, loanAmount) : 0
  const tax = v.purchasePrice * v.taxPct / 12
  const mgmt = v.rentMonthly * v.mgmtPct
  const maint = v.purchasePrice * v.maintPct / 12
  const vac = v.rentMonthly * v.vacancyPct
  const fixed = v.expensesMonthly + v.insuranceMonthly + v.hoaMonthly + tax
  const totalExpenses = pi + fixed + mgmt + maint + vac
  const monthlyCashFlow = v.rentMonthly - totalExpenses
  const annualCashFlow = monthlyCashFlow * 12
  const capRate = v.purchasePrice > 0 ? annualCashFlow / v.purchasePrice : 0
  const coc = downPayment > 0 ? annualCashFlow / downPayment : 0
  const dscr = (v.rentMonthly) / Math.max(1e-9, pi + fixed) // guard
  const breakEvenRent = totalExpenses
  
  return {
    downPayment,
    loanAmount,
    pi,
    tax,
    mgmt,
    maint,
    vac,
    fixed,
    totalExpenses,
    monthlyCashFlow,
    annualCashFlow,
    capRate,
    coc,
    dscr,
    breakEvenRent,
    // Add missing properties for backward compatibility
    purchasePrice: v.purchasePrice,
    rentMonthly: v.rentMonthly
  }
}

// Legacy aliases for backward compatibility
export const calculateRoiResults = compute
export type RoiInputs = RoiInput
export type RoiResults = ReturnType<typeof compute>