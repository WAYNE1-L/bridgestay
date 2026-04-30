import { describe, it, expect } from "vitest";
import { calculateSublease, DEFAULT_SUBLEASE_INPUT } from "./sublease";

describe("calculateSublease", () => {
  it("computes positive monthly profit for the international student default scenario", () => {
    const out = calculateSublease(DEFAULT_SUBLEASE_INPUT);
    expect(out.monthlyNetProfit).toBeGreaterThan(0);
    expect(out.annualNetProfit).toBe(out.monthlyNetProfit * 12);
  });

  it("returns Infinity payback when monthly profit is non-positive", () => {
    const out = calculateSublease({
      ...DEFAULT_SUBLEASE_INPUT,
      leaseInRent: 5000,
      expectedRent: 1500,
    });
    expect(out.monthlyNetProfit).toBeLessThan(0);
    expect(out.paybackMonths).toBe(Infinity);
  });

  it("with zero vacancy revenue equals expectedRent * (1 - platformFee) - leaseIn - operating", () => {
    const input = { ...DEFAULT_SUBLEASE_INPUT, vacancyRate: 0, platformFee: 0 };
    const out = calculateSublease(input);
    const expected =
      input.expectedRent - input.leaseInRent - (input.utilities + input.cleaning + input.other);
    expect(out.monthlyNetProfit).toBeCloseTo(expected, 4);
  });

  it("higher vacancy reduces effective revenue and thus profit", () => {
    const lowVac = calculateSublease({ ...DEFAULT_SUBLEASE_INPUT, vacancyRate: 0.0 });
    const highVac = calculateSublease({ ...DEFAULT_SUBLEASE_INPUT, vacancyRate: 0.3 });
    expect(highVac.monthlyNetProfit).toBeLessThan(lowVac.monthlyNetProfit);
  });

  it("applies rent escalation year-over-year", () => {
    const out = calculateSublease({
      ...DEFAULT_SUBLEASE_INPUT,
      leaseTermMonths: 24,
      rentEscalation: 0.05,
      priceGrowth: 0.0,
    });
    const month12 = out.cashflowSchedule.find((r) => r.month === 12)!;
    const month13 = out.cashflowSchedule.find((r) => r.month === 13)!;
    expect(month13.leaseIn).toBeGreaterThan(month12.leaseIn);
    expect(month13.leaseIn).toBeCloseTo(DEFAULT_SUBLEASE_INPUT.leaseInRent * 1.05, 2);
  });

  it("breakeven max-rent is the leaseIn that drives monthly profit to zero", () => {
    const out = calculateSublease(DEFAULT_SUBLEASE_INPUT);
    const verify = calculateSublease({
      ...DEFAULT_SUBLEASE_INPUT,
      leaseInRent: out.maxBreakevenRent.breakeven,
    });
    expect(verify.monthlyNetProfit).toBeCloseTo(0, 4);
  });

  it("healthy breakeven gives ~20% margin of effective revenue", () => {
    const out = calculateSublease(DEFAULT_SUBLEASE_INPUT);
    const verify = calculateSublease({
      ...DEFAULT_SUBLEASE_INPUT,
      leaseInRent: out.maxBreakevenRent.healthy,
    });
    const effectiveRev =
      DEFAULT_SUBLEASE_INPUT.expectedRent *
      (1 - DEFAULT_SUBLEASE_INPUT.vacancyRate) *
      (1 - DEFAULT_SUBLEASE_INPUT.platformFee);
    expect(verify.monthlyNetProfit).toBeCloseTo(effectiveRev * 0.2, 2);
  });

  it("excellent breakeven gives ~35% margin of effective revenue", () => {
    const out = calculateSublease(DEFAULT_SUBLEASE_INPUT);
    const verify = calculateSublease({
      ...DEFAULT_SUBLEASE_INPUT,
      leaseInRent: out.maxBreakevenRent.excellent,
    });
    const effectiveRev =
      DEFAULT_SUBLEASE_INPUT.expectedRent *
      (1 - DEFAULT_SUBLEASE_INPUT.vacancyRate) *
      (1 - DEFAULT_SUBLEASE_INPUT.platformFee);
    expect(verify.monthlyNetProfit).toBeCloseTo(effectiveRev * 0.35, 2);
  });

  it("schedule has leaseTermMonths + 1 rows (month 0 + 1..N)", () => {
    const out = calculateSublease({ ...DEFAULT_SUBLEASE_INPUT, leaseTermMonths: 12 });
    expect(out.cashflowSchedule).toHaveLength(13);
    expect(out.cashflowSchedule[0].month).toBe(0);
    expect(out.cashflowSchedule[12].month).toBe(12);
  });

  it("final month adds the security deposit back", () => {
    const out = calculateSublease(DEFAULT_SUBLEASE_INPUT);
    const lastRow = out.cashflowSchedule[out.cashflowSchedule.length - 1];
    const secondLast = out.cashflowSchedule[out.cashflowSchedule.length - 2];
    expect(lastRow.net - secondLast.net).toBeCloseTo(DEFAULT_SUBLEASE_INPUT.securityDeposit, 2);
  });
});
