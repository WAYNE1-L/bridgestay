import { z } from "zod";

export const SubleaseInputSchema = z.object({
  leaseInRent: z.number().positive(),
  leaseTermMonths: z.number().int().positive(),
  securityDeposit: z.number().nonnegative(),
  setupCost: z.number().nonnegative(),
  expectedRent: z.number().positive(),
  vacancyRate: z.number().min(0).max(1),
  platformFee: z.number().min(0).max(1),
  utilities: z.number().nonnegative(),
  cleaning: z.number().nonnegative(),
  other: z.number().nonnegative(),
  rentEscalation: z.number().default(0),
  priceGrowth: z.number().default(0),
  discountRate: z.number().default(0.05),
});

export type SubleaseInput = z.infer<typeof SubleaseInputSchema>;

export interface CashflowRow {
  month: number;
  leaseIn: number;
  leaseOut: number;
  operating: number;
  net: number;
  cumulative: number;
}

export interface MaxBreakevenRent {
  breakeven: number;
  healthy: number;
  excellent: number;
}

export interface SubleaseOutput {
  monthlyNetProfit: number;
  annualNetProfit: number;
  paybackMonths: number;
  annualROI: number;
  totalProfitOverTerm: number;
  npv: number;
  cashflowSchedule: CashflowRow[];
  maxBreakevenRent: MaxBreakevenRent;
}

export const DEFAULT_SUBLEASE_INPUT: SubleaseInput = {
  leaseInRent: 1500,
  leaseTermMonths: 12,
  securityDeposit: 1500,
  setupCost: 2500,
  expectedRent: 2200,
  vacancyRate: 0.05,
  platformFee: 0,
  utilities: 150,
  cleaning: 50,
  other: 0,
  rentEscalation: 0,
  priceGrowth: 0,
  discountRate: 0.05,
};

export function calculateSublease(input: SubleaseInput): SubleaseOutput {
  const {
    leaseInRent,
    leaseTermMonths,
    securityDeposit,
    setupCost,
    expectedRent,
    vacancyRate,
    platformFee,
    utilities,
    cleaning,
    other,
    rentEscalation,
    priceGrowth,
    discountRate,
  } = input;

  const operating = utilities + cleaning + other;
  const effectiveRevenue = expectedRent * (1 - vacancyRate) * (1 - platformFee);
  const monthlyNetProfit = effectiveRevenue - leaseInRent - operating;
  const annualNetProfit = monthlyNetProfit * 12;

  const upfrontCash = setupCost + securityDeposit;

  const monthlyDiscountRate = discountRate / 12;
  const cashflowSchedule: CashflowRow[] = [];

  cashflowSchedule.push({
    month: 0,
    leaseIn: 0,
    leaseOut: 0,
    operating: 0,
    net: -upfrontCash,
    cumulative: -upfrontCash,
  });

  let cumulative = -upfrontCash;
  let npv = -upfrontCash;

  for (let month = 1; month <= leaseTermMonths; month++) {
    const yearsElapsed = Math.floor((month - 1) / 12);
    const escalatedLeaseIn = leaseInRent * Math.pow(1 + rentEscalation, yearsElapsed);
    const escalatedExpectedRent = expectedRent * Math.pow(1 + priceGrowth, yearsElapsed);
    const monthlyEffectiveRevenue =
      escalatedExpectedRent * (1 - vacancyRate) * (1 - platformFee);

    let net = monthlyEffectiveRevenue - escalatedLeaseIn - operating;

    if (month === leaseTermMonths) {
      net += securityDeposit;
    }

    cumulative += net;
    npv += net / Math.pow(1 + monthlyDiscountRate, month);

    cashflowSchedule.push({
      month,
      leaseIn: escalatedLeaseIn,
      leaseOut: monthlyEffectiveRevenue,
      operating,
      net,
      cumulative,
    });
  }

  let paybackMonths = Infinity;
  for (const row of cashflowSchedule) {
    if (row.month > 0 && row.cumulative >= 0) {
      paybackMonths = row.month;
      break;
    }
  }

  const annualROI = upfrontCash > 0 ? annualNetProfit / upfrontCash : 0;

  const totalProfitOverTerm = cashflowSchedule[cashflowSchedule.length - 1].cumulative;

  const breakeven = effectiveRevenue - operating;
  const healthy = effectiveRevenue * (1 - 0.2) - operating;
  const excellent = effectiveRevenue * (1 - 0.35) - operating;

  return {
    monthlyNetProfit,
    annualNetProfit,
    paybackMonths,
    annualROI,
    totalProfitOverTerm,
    npv,
    cashflowSchedule,
    maxBreakevenRent: {
      breakeven,
      healthy,
      excellent,
    },
  };
}
