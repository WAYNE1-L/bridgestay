// Airbnb sublet arbitrage business model.
//
// You sign a 1–12 month lease with the property owner (paying them monthly
// rent), put the unit on Airbnb, and pocket the spread. This module computes
// the math for one property and a portfolio of them.
//
// Revenue model: blended ADR. We compute a single yearly-blended ADR from
// peak-season and off-season rates, then assume that average for every month
// in the analysis horizon. Error vs. an exact-by-calendar-month model is
// roughly ±10% — acceptable for a v1 decision tool.

export interface PropertyInputs {
  id: string;
  nickname: string;

  // Lease cost
  monthlyRentToOwner: number;
  initialDeposit: number;
  leaseLengthMonths: number;
  depositRefundable: boolean;

  // Setup cost (one-time)
  furnitureCost: number;
  renovationCost: number;
  initialDeepClean: number;
  photographyCost: number;

  // Airbnb revenue model
  peakAdr: number;
  offSeasonAdr: number;
  peakSeasonStartMonth: number; // 1-12
  peakSeasonEndMonth: number; // 1-12
  occupancyRate: number; // 0-100 (%)
  avgNightsPerBooking: number;

  // Operating cost / month
  utilities: number;
  utilitiesIncludedInLease: boolean;
  cleaningPerTurnover: number;
  cleaningPassedToGuest: boolean;
  supplies: number;
  maintenanceReserve: number;
  strInsurance: number;

  // Risk
  damageDepositHoldRate: number; // 0-50 (%)

  // Platform & tax
  airbnbHostFeeRate: number; // 0-1 (decimal). Defaults to 0.03.
  lodgingTaxHandledByAirbnb: boolean;
  manualLodgingTaxRate: number; // 0-100 (%), only when above is false
  incomeTaxRate: number; // 0-100 (%)
}

export interface PropertyOutputs {
  totalSetupCost: number;
  monthlyRevenue: number;
  monthlyOperatingCost: number;
  monthlyTaxCost: number;
  monthlyNetProfit: number;
  paybackMonths: number;
  annualROI: number;
  cashOnCashReturn: number;
  totalPeriodNet: number;
  monthlyCashflows: number[];
  cumulativeCashflows: number[];
  breakEvenMonth: number | null;
}

export interface PortfolioInputs {
  properties: PropertyInputs[];
  analysisHorizonMonths: number;
}

export interface PortfolioOutputs {
  totalMonthlyNet: number;
  totalSetupCost: number;
  portfolioPaybackMonths: number;
  totalPeriodNet: number;
  perProperty: PropertyOutputs[];
}

function peakSeasonLength(startMonth: number, endMonth: number): number {
  if (startMonth <= endMonth) return endMonth - startMonth + 1;
  return 12 - startMonth + 1 + endMonth;
}

export function calculateProperty(
  inputs: PropertyInputs,
  horizonMonths: number = inputs.leaseLengthMonths
): PropertyOutputs {
  const totalSetupCost =
    inputs.furnitureCost +
    inputs.renovationCost +
    inputs.initialDeepClean +
    inputs.photographyCost;

  // Blended ADR over a 12-month year.
  const peakLen = peakSeasonLength(inputs.peakSeasonStartMonth, inputs.peakSeasonEndMonth);
  const offLen = 12 - peakLen;
  const blendedAdr = (inputs.peakAdr * peakLen + inputs.offSeasonAdr * offLen) / 12;

  const monthlyRevenue = blendedAdr * 30 * (inputs.occupancyRate / 100);

  // Damage hold reduces effective revenue (probabilistic deduction).
  const effectiveRevenue = monthlyRevenue * (1 - inputs.damageDepositHoldRate / 100);

  // Cleaning. If passed to guest, host eats $0; otherwise host pays per
  // turnover. Turnovers are derived from occupied-nights / avg stay length.
  const turnoversPerMonth =
    inputs.avgNightsPerBooking > 0
      ? (30 * (inputs.occupancyRate / 100)) / inputs.avgNightsPerBooking
      : 0;
  const monthlyCleaningCost = inputs.cleaningPassedToGuest
    ? 0
    : turnoversPerMonth * inputs.cleaningPerTurnover;

  const utilitiesActual = inputs.utilitiesIncludedInLease ? 0 : inputs.utilities;
  const monthlyOperatingCost =
    utilitiesActual +
    monthlyCleaningCost +
    inputs.supplies +
    inputs.maintenanceReserve +
    inputs.strInsurance;

  const airbnbFee = effectiveRevenue * inputs.airbnbHostFeeRate;
  const lodgingTax = inputs.lodgingTaxHandledByAirbnb
    ? 0
    : effectiveRevenue * (inputs.manualLodgingTaxRate / 100);

  const monthlyPretax =
    effectiveRevenue -
    inputs.monthlyRentToOwner -
    monthlyOperatingCost -
    airbnbFee -
    lodgingTax;

  // Tax only on positive profit — losses don't generate refunds in this tool.
  const monthlyTaxCost =
    monthlyPretax > 0 ? monthlyPretax * (inputs.incomeTaxRate / 100) : 0;

  const monthlyNetProfit = monthlyPretax - monthlyTaxCost;

  // Payback: setup ÷ monthly net. Special-case 0 setup → "immediate" (0 mo);
  // non-positive cashflow → never (Infinity).
  let paybackMonths: number;
  if (totalSetupCost === 0) {
    paybackMonths = 0;
  } else if (monthlyNetProfit <= 0) {
    paybackMonths = Infinity;
  } else {
    paybackMonths = totalSetupCost / monthlyNetProfit;
  }

  const annualNet = monthlyNetProfit * 12;
  const annualROI = totalSetupCost === 0 ? Infinity : (annualNet / totalSetupCost) * 100;
  const cashOnCashReturn = annualROI;

  // Per-month cashflow series for waterfall charts. Setup hits month 1.
  const monthlyCashflows: number[] = [];
  const cumulativeCashflows: number[] = [];
  let cumulative = 0;
  let breakEvenMonth: number | null = null;
  for (let m = 1; m <= horizonMonths; m++) {
    let cashflow = monthlyNetProfit;
    if (m === 1) cashflow -= totalSetupCost;
    monthlyCashflows.push(cashflow);
    cumulative += cashflow;
    cumulativeCashflows.push(cumulative);
    if (breakEvenMonth === null && cumulative >= 0) breakEvenMonth = m;
  }

  const totalPeriodNet = monthlyNetProfit * horizonMonths - totalSetupCost;

  return {
    totalSetupCost,
    monthlyRevenue,
    monthlyOperatingCost,
    monthlyTaxCost,
    monthlyNetProfit,
    paybackMonths,
    annualROI,
    cashOnCashReturn,
    totalPeriodNet,
    monthlyCashflows,
    cumulativeCashflows,
    breakEvenMonth,
  };
}

export function calculatePortfolio(inputs: PortfolioInputs): PortfolioOutputs {
  const perProperty = inputs.properties.map((p) =>
    calculateProperty(p, inputs.analysisHorizonMonths)
  );

  const totalMonthlyNet = perProperty.reduce((sum, p) => sum + p.monthlyNetProfit, 0);
  const totalSetupCost = perProperty.reduce((sum, p) => sum + p.totalSetupCost, 0);
  const totalPeriodNet = perProperty.reduce((sum, p) => sum + p.totalPeriodNet, 0);

  let portfolioPaybackMonths: number;
  if (totalSetupCost === 0) {
    portfolioPaybackMonths = 0;
  } else if (totalMonthlyNet <= 0) {
    portfolioPaybackMonths = Infinity;
  } else {
    portfolioPaybackMonths = totalSetupCost / totalMonthlyNet;
  }

  return {
    totalMonthlyNet,
    totalSetupCost,
    portfolioPaybackMonths,
    totalPeriodNet,
    perProperty,
  };
}

// SLC summer student-sublet preset (Wayne's actual scenario).
export const SLC_SUMMER_PRESET: Omit<PropertyInputs, "id"> = {
  nickname: "SLC summer student sublet",

  monthlyRentToOwner: 800,
  initialDeposit: 0,
  leaseLengthMonths: 3,
  depositRefundable: true,

  furnitureCost: 0,
  renovationCost: 0,
  initialDeepClean: 0,
  photographyCost: 0,

  peakAdr: 90,
  offSeasonAdr: 50,
  peakSeasonStartMonth: 5,
  peakSeasonEndMonth: 9,
  occupancyRate: 70,
  avgNightsPerBooking: 2,

  utilities: 0,
  utilitiesIncludedInLease: true,
  cleaningPerTurnover: 30,
  cleaningPassedToGuest: true,
  supplies: 0,
  maintenanceReserve: 30,
  strInsurance: 20,

  damageDepositHoldRate: 0,

  airbnbHostFeeRate: 0.03,
  lodgingTaxHandledByAirbnb: true,
  manualLodgingTaxRate: 0,
  incomeTaxRate: 22,
};

// Empty-form defaults used when user clicks "Add property".
export const EMPTY_PROPERTY: Omit<PropertyInputs, "id" | "nickname"> = {
  monthlyRentToOwner: 0,
  initialDeposit: 0,
  leaseLengthMonths: 3,
  depositRefundable: true,

  furnitureCost: 0,
  renovationCost: 0,
  initialDeepClean: 0,
  photographyCost: 0,

  peakAdr: 0,
  offSeasonAdr: 0,
  peakSeasonStartMonth: 5,
  peakSeasonEndMonth: 9,
  occupancyRate: 0,
  avgNightsPerBooking: 2,

  utilities: 0,
  utilitiesIncludedInLease: false,
  cleaningPerTurnover: 0,
  cleaningPassedToGuest: true,
  supplies: 0,
  maintenanceReserve: 0,
  strInsurance: 0,

  damageDepositHoldRate: 0,

  airbnbHostFeeRate: 0.03,
  lodgingTaxHandledByAirbnb: true,
  manualLodgingTaxRate: 0,
  incomeTaxRate: 22,
};
