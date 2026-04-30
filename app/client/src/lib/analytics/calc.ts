import { pmt } from "./finance";

export interface RoiInput {
  purchasePrice: number;
  downPct: number;
  rentMonthly: number;
  expensesMonthly: number;
  interestPct: number;
  years: number;
  taxPct: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  mgmtPct: number;
  maintPct: number;
  vacancyPct: number;
}

export interface CalcResult {
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  pi: number;
  tax: number;
  insurance: number;
  hoa: number;
  mgmt: number;
  maint: number;
  vac: number;
  totalExpenses: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  capRate: number;
  coc: number;
  dscr: number;
  breakEvenRent: number;
  monthlyRent: number;
  grossRent: number;
  netOperatingIncome: number;
  totalReturn: number;
}

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
    vacancyPct,
  } = input;

  const downPayment = purchasePrice * (downPct / 100);
  const loanAmount = purchasePrice - downPayment;

  const monthlyRate = interestPct / 100 / 12;
  const totalPayments = years * 12;
  const pi = loanAmount > 0 && totalPayments > 0 ? pmt(monthlyRate, totalPayments, loanAmount) : 0;

  const tax = (purchasePrice * (taxPct / 100)) / 12;
  const insurance = insuranceMonthly;
  const hoa = hoaMonthly;
  const mgmt = rentMonthly * (mgmtPct / 100);
  const maint = rentMonthly * (maintPct / 100);
  const vac = rentMonthly * (vacancyPct / 100);

  const totalExpenses = pi + tax + insurance + hoa + mgmt + maint + vac + expensesMonthly;

  const monthlyCashFlow = rentMonthly - totalExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  const grossRent = rentMonthly * 12;
  const netOperatingIncome =
    grossRent -
    (tax * 12 + insurance * 12 + hoa * 12 + mgmt * 12 + maint * 12 + vac * 12 + expensesMonthly * 12);
  const capRate = purchasePrice > 0 ? netOperatingIncome / purchasePrice : 0;
  const coc = downPayment > 0 ? annualCashFlow / downPayment : 0;
  const dscr =
    pi > 0
      ? (rentMonthly - (tax + insurance + hoa + mgmt + maint + vac + expensesMonthly)) / pi
      : 0;
  const breakEvenRent = totalExpenses;

  const totalReturn = downPayment > 0 ? (annualCashFlow + purchasePrice * 0.03) / downPayment : 0;

  return {
    purchasePrice,
    downPayment,
    loanAmount,
    pi,
    tax,
    insurance,
    hoa,
    mgmt,
    maint,
    vac,
    totalExpenses,
    monthlyCashFlow,
    annualCashFlow,
    capRate,
    coc,
    dscr,
    breakEvenRent,
    monthlyRent: rentMonthly,
    grossRent,
    netOperatingIncome,
    totalReturn,
  };
}

export function calcGRM(price: number, rent: number): number {
  const annualRent = rent * 12;
  return annualRent > 0 ? price / annualRent : 0;
}

export function calcCapRate(noi: number, price: number): number {
  return price > 0 ? (noi / price) * 100 : 0;
}
