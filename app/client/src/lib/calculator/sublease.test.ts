import { describe, it, expect } from "vitest";
import {
  calculateProperty,
  calculatePortfolio,
  SLC_SUMMER_PRESET,
  EMPTY_PROPERTY,
  type PropertyInputs,
} from "./sublease";

const slcInput: PropertyInputs = { id: "test-1", ...SLC_SUMMER_PRESET };

describe("calculateProperty — SLC summer preset (real Wayne case)", () => {
  const result = calculateProperty(slcInput);

  it("total setup cost is 0 for furnished sublet", () => {
    expect(result.totalSetupCost).toBe(0);
  });

  it("monthly revenue is approximately 1400-1700 for SLC summer", () => {
    // peak = May–Sep (5 mo), off = 7 mo
    // blended ADR = (90*5 + 50*7) / 12 = 66.67
    // monthly rev = 66.67 * 30 * 0.70 ≈ 1400
    expect(result.monthlyRevenue).toBeGreaterThan(1300);
    expect(result.monthlyRevenue).toBeLessThan(1700);
  });

  it("monthly net profit is positive", () => {
    expect(result.monthlyNetProfit).toBeGreaterThan(0);
  });

  it("payback is 0 because no setup cost", () => {
    expect(result.paybackMonths).toBe(0);
  });

  it("annual ROI is Infinity (no upfront)", () => {
    expect(result.annualROI).toBe(Infinity);
  });

  it("break-even is month 1 (positive cashflow from day 1)", () => {
    expect(result.breakEvenMonth).toBe(1);
  });

  it("3-month total net matches monthly net × 3 (no setup cost)", () => {
    const expected = result.monthlyNetProfit * 3;
    expect(result.totalPeriodNet).toBeCloseTo(expected, 0);
  });

  it("default cashflows array length matches lease length (3)", () => {
    expect(result.monthlyCashflows.length).toBe(3);
    expect(result.cumulativeCashflows.length).toBe(3);
  });
});

describe("calculateProperty — edge cases", () => {
  it("empty property has 0 revenue and non-positive net", () => {
    const empty: PropertyInputs = { id: "e", nickname: "Empty", ...EMPTY_PROPERTY };
    const result = calculateProperty(empty);
    expect(result.monthlyRevenue).toBe(0);
    expect(result.monthlyNetProfit).toBeLessThanOrEqual(0);
  });

  it("high setup cost + low revenue → Infinity payback", () => {
    const bad: PropertyInputs = {
      id: "bad",
      nickname: "Bad deal",
      ...EMPTY_PROPERTY,
      furnitureCost: 10000,
      monthlyRentToOwner: 2000,
      peakAdr: 30,
      offSeasonAdr: 30,
      occupancyRate: 30,
    };
    const result = calculateProperty(bad);
    expect(result.paybackMonths).toBe(Infinity);
  });

  it("peak season cross year (Nov–Feb) computes blended ADR correctly", () => {
    const ski: PropertyInputs = {
      id: "ski",
      nickname: "Park City",
      ...EMPTY_PROPERTY,
      peakAdr: 200,
      offSeasonAdr: 50,
      peakSeasonStartMonth: 11, // Nov
      peakSeasonEndMonth: 2, // Feb
      occupancyRate: 75,
    };
    const result = calculateProperty(ski);
    // peak = Nov, Dec, Jan, Feb = 4 months; off = 8 months
    // blended ADR = (200*4 + 50*8) / 12 = 100
    // monthly rev = 100 * 30 * 0.75 = 2250
    expect(result.monthlyRevenue).toBeGreaterThan(2100);
    expect(result.monthlyRevenue).toBeLessThan(2400);
  });

  it("utilities included in lease zeroes out utilities cost", () => {
    const a: PropertyInputs = {
      id: "a",
      nickname: "A",
      ...EMPTY_PROPERTY,
      utilities: 200,
      utilitiesIncludedInLease: true,
      peakAdr: 100,
      offSeasonAdr: 100,
      occupancyRate: 50,
    };
    const b: PropertyInputs = {
      ...a,
      id: "b",
      utilitiesIncludedInLease: false,
    };
    const aResult = calculateProperty(a);
    const bResult = calculateProperty(b);
    expect(bResult.monthlyOperatingCost - aResult.monthlyOperatingCost).toBe(200);
  });

  it("cleaning passed to guest zeroes cleaning cost", () => {
    const a: PropertyInputs = {
      id: "a",
      nickname: "A",
      ...EMPTY_PROPERTY,
      cleaningPerTurnover: 50,
      cleaningPassedToGuest: true,
      occupancyRate: 70,
      avgNightsPerBooking: 2,
      peakAdr: 100,
      offSeasonAdr: 100,
    };
    const b: PropertyInputs = { ...a, id: "b", cleaningPassedToGuest: false };
    expect(calculateProperty(a).monthlyOperatingCost).toBeLessThan(
      calculateProperty(b).monthlyOperatingCost
    );
  });

  it("damage deposit hold reduces effective revenue and thus net", () => {
    const a: PropertyInputs = {
      id: "a",
      nickname: "A",
      ...EMPTY_PROPERTY,
      peakAdr: 100,
      offSeasonAdr: 100,
      occupancyRate: 70,
      damageDepositHoldRate: 0,
    };
    const b: PropertyInputs = { ...a, id: "b", damageDepositHoldRate: 10 };
    expect(calculateProperty(b).monthlyNetProfit).toBeLessThan(
      calculateProperty(a).monthlyNetProfit
    );
  });

  it("income tax only applies to positive profit (loss → 0 tax)", () => {
    const losing: PropertyInputs = {
      id: "l",
      nickname: "Losing",
      ...EMPTY_PROPERTY,
      monthlyRentToOwner: 5000,
      peakAdr: 50,
      offSeasonAdr: 50,
      occupancyRate: 30,
      incomeTaxRate: 22,
    };
    const result = calculateProperty(losing);
    expect(result.monthlyTaxCost).toBe(0);
    expect(result.monthlyNetProfit).toBeLessThan(0);
  });

  it("custom horizon overrides leaseLengthMonths in the cashflow array", () => {
    const result = calculateProperty(slcInput, 6);
    expect(result.monthlyCashflows.length).toBe(6);
    expect(result.cumulativeCashflows.length).toBe(6);
  });

  it("break-even null when cumulative never reaches 0", () => {
    const result = calculateProperty({
      id: "lose",
      nickname: "Lose",
      ...EMPTY_PROPERTY,
      monthlyRentToOwner: 5000,
    });
    expect(result.breakEvenMonth).toBeNull();
  });

  it("airbnb host fee reduces net by exactly fee × effective revenue", () => {
    const noFee: PropertyInputs = {
      id: "f0",
      nickname: "no fee",
      ...EMPTY_PROPERTY,
      peakAdr: 100,
      offSeasonAdr: 100,
      occupancyRate: 100,
      airbnbHostFeeRate: 0,
      incomeTaxRate: 0,
    };
    const withFee: PropertyInputs = { ...noFee, id: "f1", airbnbHostFeeRate: 0.03 };
    const noFeeResult = calculateProperty(noFee);
    const withFeeResult = calculateProperty(withFee);
    const expectedDelta = noFeeResult.monthlyRevenue * 0.03;
    expect(noFeeResult.monthlyNetProfit - withFeeResult.monthlyNetProfit).toBeCloseTo(
      expectedDelta,
      4
    );
  });

  it("manual lodging tax applies only when airbnb does not handle it", () => {
    const auto: PropertyInputs = {
      id: "a",
      nickname: "A",
      ...EMPTY_PROPERTY,
      peakAdr: 100,
      offSeasonAdr: 100,
      occupancyRate: 80,
      lodgingTaxHandledByAirbnb: true,
      manualLodgingTaxRate: 12,
      incomeTaxRate: 0,
    };
    const manual: PropertyInputs = { ...auto, id: "m", lodgingTaxHandledByAirbnb: false };
    expect(calculateProperty(manual).monthlyNetProfit).toBeLessThan(
      calculateProperty(auto).monthlyNetProfit
    );
  });

  it("setup cost is deducted in month 1 of cashflow series", () => {
    const setup: PropertyInputs = {
      id: "s",
      nickname: "Setup",
      ...EMPTY_PROPERTY,
      furnitureCost: 1000,
      peakAdr: 100,
      offSeasonAdr: 100,
      occupancyRate: 70,
    };
    const result = calculateProperty(setup, 6);
    expect(result.monthlyCashflows[0]).toBe(result.monthlyNetProfit - 1000);
    expect(result.monthlyCashflows[1]).toBe(result.monthlyNetProfit);
  });
});

describe("calculatePortfolio", () => {
  it("aggregates 3 SLC properties into 3× the single-unit math", () => {
    const portfolio = calculatePortfolio({
      properties: [
        { id: "1", ...SLC_SUMMER_PRESET, nickname: "A" },
        { id: "2", ...SLC_SUMMER_PRESET, nickname: "B" },
        { id: "3", ...SLC_SUMMER_PRESET, nickname: "C" },
      ],
      analysisHorizonMonths: 3,
    });
    const single = calculateProperty(
      { id: "1", ...SLC_SUMMER_PRESET, nickname: "A" },
      3
    );
    expect(portfolio.totalMonthlyNet).toBeCloseTo(single.monthlyNetProfit * 3, 0);
    expect(portfolio.perProperty.length).toBe(3);
  });

  it("empty portfolio is all zeros, payback 0 (no setup cost)", () => {
    const portfolio = calculatePortfolio({
      properties: [],
      analysisHorizonMonths: 12,
    });
    expect(portfolio.totalMonthlyNet).toBe(0);
    expect(portfolio.totalSetupCost).toBe(0);
    expect(portfolio.totalPeriodNet).toBe(0);
    expect(portfolio.portfolioPaybackMonths).toBe(0);
  });

  it("portfolio with positive setup but zero net → Infinity payback", () => {
    const portfolio = calculatePortfolio({
      properties: [
        {
          id: "x",
          nickname: "X",
          ...EMPTY_PROPERTY,
          furnitureCost: 1000,
        },
      ],
      analysisHorizonMonths: 6,
    });
    expect(portfolio.portfolioPaybackMonths).toBe(Infinity);
  });
});

// ─── Pass B additions: extreme-value sanity tests ────────────────────────────

describe("calculateProperty — extreme value scenarios (Pass B)", () => {
  it("very high lease rent ($50k/mo) does not produce NaN / Infinity in cashflow", () => {
    const luxury: PropertyInputs = {
      id: "lux",
      nickname: "Luxury",
      ...EMPTY_PROPERTY,
      monthlyRentToOwner: 50_000,
      peakAdr: 1500,
      offSeasonAdr: 1000,
      occupancyRate: 80,
      avgNightsPerBooking: 3,
      furnitureCost: 25_000,
    };
    const result = calculateProperty(luxury, 12);
    expect(Number.isFinite(result.monthlyRevenue)).toBe(true);
    expect(Number.isFinite(result.monthlyOperatingCost)).toBe(true);
    result.monthlyCashflows.forEach((cashflow) => {
      expect(Number.isFinite(cashflow)).toBe(true);
    });
    result.cumulativeCashflows.forEach((cumulative) => {
      expect(Number.isFinite(cumulative)).toBe(true);
    });
  });

  it("12-month full-year horizon completes without errors", () => {
    const result = calculateProperty(slcInput, 12);
    expect(result.monthlyCashflows).toHaveLength(12);
    expect(result.cumulativeCashflows).toHaveLength(12);
    // Cumulative should be monotonically increasing for the SLC preset
    // (no setup cost, positive monthly net)
    for (let i = 1; i < result.cumulativeCashflows.length; i++) {
      expect(result.cumulativeCashflows[i]).toBeGreaterThanOrEqual(
        result.cumulativeCashflows[i - 1]
      );
    }
  });

  it("peak ADR < off-season ADR is unusual but not an error", () => {
    // Inverse-seasonal: e.g. a beach property where peak season is "off"
    // for some macro reason. The math should still run.
    const inverted: PropertyInputs = {
      id: "inv",
      nickname: "Inverted",
      ...EMPTY_PROPERTY,
      peakAdr: 50,
      offSeasonAdr: 90,
      peakSeasonStartMonth: 5,
      peakSeasonEndMonth: 9,
      occupancyRate: 60,
    };
    const result = calculateProperty(inverted);
    // blended = (50*5 + 90*7)/12 ≈ 73.33
    // monthly rev = 73.33 * 30 * 0.6 ≈ 1320
    expect(result.monthlyRevenue).toBeGreaterThan(1200);
    expect(result.monthlyRevenue).toBeLessThan(1500);
  });

  it("100% occupancy is a valid upper bound", () => {
    const fullOcc: PropertyInputs = {
      id: "100",
      nickname: "Always full",
      ...EMPTY_PROPERTY,
      peakAdr: 100,
      offSeasonAdr: 100,
      occupancyRate: 100,
      avgNightsPerBooking: 2,
    };
    const result = calculateProperty(fullOcc);
    // Constant ADR 100, occ 100 → revenue 100 * 30 * 1.0 = 3000
    expect(result.monthlyRevenue).toBeCloseTo(3000, 0);
    // 30 / 2 = 15 turnovers per month (no cleaning passed, so reflects)
    expect(Number.isFinite(result.monthlyOperatingCost)).toBe(true);
  });

  it("zero avg nights / booking guards against divide-by-zero", () => {
    const broken: PropertyInputs = {
      id: "z",
      nickname: "Z",
      ...EMPTY_PROPERTY,
      avgNightsPerBooking: 0,
      cleaningPassedToGuest: false,
      cleaningPerTurnover: 50,
      peakAdr: 100,
      offSeasonAdr: 100,
      occupancyRate: 70,
    };
    const result = calculateProperty(broken);
    // turnoversPerMonth guarded → 0 → cleaning cost 0
    expect(result.monthlyOperatingCost).toBe(0);
    expect(Number.isFinite(result.monthlyNetProfit)).toBe(true);
  });

  it("peak season exactly the full year (Jan-Dec) collapses to peak ADR only", () => {
    const yearRound: PropertyInputs = {
      id: "yr",
      nickname: "Year-round",
      ...EMPTY_PROPERTY,
      peakAdr: 120,
      offSeasonAdr: 60,
      peakSeasonStartMonth: 1,
      peakSeasonEndMonth: 12,
      occupancyRate: 80,
    };
    const result = calculateProperty(yearRound);
    // peakLen = 12, offLen = 0 → blended = peakAdr = 120
    // revenue = 120 * 30 * 0.8 = 2880
    expect(result.monthlyRevenue).toBeCloseTo(2880, 0);
  });
});

describe("calculatePortfolio — extreme value scenarios (Pass B)", () => {
  it("seven-property portfolio (above SERIES_COLORS palette length) computes without error", () => {
    const properties: PropertyInputs[] = Array.from({ length: 7 }, (_, idx) => ({
      id: `seven-${idx}`,
      ...SLC_SUMMER_PRESET,
      nickname: `P${idx + 1}`,
    }));
    const portfolio = calculatePortfolio({ properties, analysisHorizonMonths: 3 });
    expect(portfolio.perProperty).toHaveLength(7);
    expect(Number.isFinite(portfolio.totalMonthlyNet)).toBe(true);
  });

  it("portfolio with mixed winners and losers nets correctly", () => {
    const winner: PropertyInputs = {
      id: "w",
      ...SLC_SUMMER_PRESET,
      nickname: "Winner",
    };
    const loser: PropertyInputs = {
      id: "l",
      nickname: "Loser",
      ...EMPTY_PROPERTY,
      monthlyRentToOwner: 5000,
      peakAdr: 30,
      offSeasonAdr: 30,
      occupancyRate: 30,
    };
    const portfolio = calculatePortfolio({
      properties: [winner, loser],
      analysisHorizonMonths: 3,
    });
    const w = calculateProperty(winner, 3);
    const l = calculateProperty(loser, 3);
    expect(portfolio.totalMonthlyNet).toBeCloseTo(w.monthlyNetProfit + l.monthlyNetProfit, 4);
  });
});
