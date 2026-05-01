/**
 * Airbnb sublet arbitrage business model.
 *
 * You sign a 1–12 month lease with the property owner (paying them monthly
 * rent), put the unit on Airbnb, and pocket the spread. This module computes
 * the math for one property and a portfolio of them.
 *
 * Revenue model: blended ADR. We compute a single yearly-blended ADR from
 * peak-season and off-season rates, then assume that average for every month
 * in the analysis horizon. Error vs. an exact-by-calendar-month model is
 * roughly ±10% — acceptable for a v1 decision tool.
 *
 * Conventions:
 * - All monetary values are USD.
 * - Percentages are stored as 0–100 unless otherwise noted (e.g.
 *   `airbnbHostFeeRate` is decimal 0–1).
 * - "Monthly" totals use a 30-day month for revenue calculations.
 */

export interface PropertyInputs {
  /** Stable client-side id (typically `crypto.randomUUID()`). */
  id: string;
  /** User-facing label, e.g. "SLC summer A". May be empty. */
  nickname: string;

  // ─── Lease cost ───────────────────────────────────────────────────────
  /** Monthly rent paid to property owner, USD. */
  monthlyRentToOwner: number;
  /** Refundable security deposit paid to owner up-front, USD. */
  initialDeposit: number;
  /** Lease length in months (1–24). Drives default analysis horizon. */
  leaseLengthMonths: number;
  /** Whether the deposit is expected back at lease end. Captured for
   *  future use; v1 math treats it as opportunity cost only. */
  depositRefundable: boolean;

  // ─── Setup cost (one-time, charged in month 1 of cashflow) ────────────
  /** Furniture and durable goods, USD. */
  furnitureCost: number;
  /** Light renovation / paint / repairs, USD. */
  renovationCost: number;
  /** First professional deep clean before listing, USD. */
  initialDeepClean: number;
  /** Listing photography, USD. */
  photographyCost: number;

  // ─── Airbnb revenue model ─────────────────────────────────────────────
  /** Average daily rate during peak season, USD/night. */
  peakAdr: number;
  /** Average daily rate during off-season, USD/night. */
  offSeasonAdr: number;
  /** First month of peak season (1–12, where 1 = January). */
  peakSeasonStartMonth: number;
  /** Last month of peak season (1–12). May wrap year-end (start > end). */
  peakSeasonEndMonth: number;
  /** % of available nights booked, 0–100. */
  occupancyRate: number;
  /** Average stay length in nights — drives turnover frequency. */
  avgNightsPerBooking: number;

  // ─── Operating cost / month ───────────────────────────────────────────
  /** Utilities (water/power/internet) USD/month. Ignored when
   *  `utilitiesIncludedInLease` is true. */
  utilities: number;
  /** True if owner-provided lease covers utilities (zeros them out). */
  utilitiesIncludedInLease: boolean;
  /** Per-turnover cleaning cost, USD. Ignored when
   *  `cleaningPassedToGuest` is true. */
  cleaningPerTurnover: number;
  /** True if the cleaning fee is charged to the guest (zeros it out). */
  cleaningPassedToGuest: boolean;
  /** Recurring supplies (toiletries, coffee, etc.) USD/month. */
  supplies: number;
  /** Reserve for occasional repairs, USD/month. */
  maintenanceReserve: number;
  /** Short-term-rental insurance premium, USD/month. */
  strInsurance: number;

  // ─── Risk ─────────────────────────────────────────────────────────────
  /** Approximate % of revenue lost to damage / deposit holds, 0–50. */
  damageDepositHoldRate: number;

  // ─── Platform & tax ───────────────────────────────────────────────────
  /** Airbnb host fee as a decimal (0.03 = 3%). Locked at 3% by default. */
  airbnbHostFeeRate: number;
  /** True if Airbnb auto-collects lodging tax on the host's behalf. */
  lodgingTaxHandledByAirbnb: boolean;
  /** Manually-entered lodging tax % (0–100), only used when
   *  `lodgingTaxHandledByAirbnb` is false. */
  manualLodgingTaxRate: number;
  /** Income tax rate on positive monthly profit (0–100, %). */
  incomeTaxRate: number;
}

export interface PropertyOutputs {
  /** Sum of furniture + renovation + deep clean + photography, USD. */
  totalSetupCost: number;
  /** Average gross revenue per month using blended ADR, USD. */
  monthlyRevenue: number;
  /** Sum of all recurring monthly costs (utilities, cleaning, supplies,
   *  maintenance, STR insurance), USD. Excludes lease rent and taxes. */
  monthlyOperatingCost: number;
  /** Income tax charged on positive monthly pretax profit, USD. */
  monthlyTaxCost: number;
  /** Final after-tax monthly profit, USD. */
  monthlyNetProfit: number;
  /** Months until cumulative cashflow breaks even.
   *  - `0` when there is no setup cost ("immediate")
   *  - `Infinity` when monthly net ≤ 0 (never recovers) */
  paybackMonths: number;
  /** Annualised return on setup cost, as a percentage (0–∞). */
  annualROI: number;
  /** Same as `annualROI`; kept as a separate field for clarity at call sites. */
  cashOnCashReturn: number;
  /** Total net over the analysis horizon, USD (monthly net × N − setup). */
  totalPeriodNet: number;
  /** Per-month cashflow array, length = horizon. Setup hits index 0. */
  monthlyCashflows: number[];
  /** Running cumulative cashflow, parallel to `monthlyCashflows`. */
  cumulativeCashflows: number[];
  /** First 1-indexed month where cumulative ≥ 0; `null` if never. */
  breakEvenMonth: number | null;
}

export interface PortfolioInputs {
  /** All properties under consideration. */
  properties: PropertyInputs[];
  /** Number of months to project. Cashflow series are this long. */
  analysisHorizonMonths: number;
}

export interface PortfolioOutputs {
  /** Sum of every property's monthlyNetProfit. */
  totalMonthlyNet: number;
  /** Sum of every property's totalSetupCost. */
  totalSetupCost: number;
  /** Aggregate payback months using portfolio totals.
   *  - `0` when totalSetupCost === 0
   *  - `Infinity` when totalMonthlyNet ≤ 0 */
  portfolioPaybackMonths: number;
  /** Sum of every property's totalPeriodNet over the shared horizon. */
  totalPeriodNet: number;
  /** Per-property outputs, in the same order as `inputs.properties`. */
  perProperty: PropertyOutputs[];
}

/**
 * Length in months of a peak-season window. Handles year-wrap (e.g.
 * `Nov(11) → Feb(2)` = 4 months: Nov, Dec, Jan, Feb).
 */
function peakSeasonLength(startMonth: number, endMonth: number): number {
  if (startMonth <= endMonth) return endMonth - startMonth + 1;
  return 12 - startMonth + 1 + endMonth;
}

/**
 * Compute Airbnb-sublet economics for a single property.
 *
 * Revenue uses a 12-month blended ADR (peak × peakLen + off × offLen) / 12,
 * times 30 nights, times occupancy. Damage / deposit hold is applied as a
 * linear deduction on revenue.
 *
 * Costs subtracted in order: lease rent → operating costs → Airbnb host fee
 * → optional manual lodging tax → income tax (only on positive profit).
 *
 * Cashflow series: setup cost is realised in month 1; subsequent months are
 * the steady-state monthly net.
 *
 * @param inputs Property configuration.
 * @param horizonMonths Optional horizon. Defaults to `leaseLengthMonths`
 *   when called from a single-property context; the portfolio caller passes
 *   `analysisHorizonMonths` so all properties share a horizon.
 * @returns Headline numbers, breakeven, and per-month cashflow arrays.
 */
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

/**
 * Aggregate `calculateProperty` across an entire portfolio under a shared
 * analysis horizon.
 *
 * Math is straightforward summation; each property is independent. The
 * portfolio payback uses portfolio totals (not the max of per-property
 * paybacks) because cashflows pool.
 *
 * @returns Totals plus the per-property breakdowns in input order.
 */
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
