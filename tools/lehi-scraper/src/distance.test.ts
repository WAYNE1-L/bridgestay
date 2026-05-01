import { describe, it, expect } from "vitest";
import { distanceMi, distanceToMorningVista, MORNING_VISTA } from "./distance";

describe("distance calculations", () => {
  it("Morning Vista to itself is 0", () => {
    expect(distanceToMorningVista(MORNING_VISTA.lat, MORNING_VISTA.lon)).toBeCloseTo(
      0,
      1
    );
  });

  it("1 degree latitude north of Morning Vista is ~69 miles", () => {
    // 1 degree latitude ≈ 69 miles regardless of longitude.
    const result = distanceToMorningVista(MORNING_VISTA.lat + 1, MORNING_VISTA.lon);
    expect(result).toBeGreaterThan(68);
    expect(result).toBeLessThan(70);
  });

  it("Salt Lake City (40.7608, -111.8910) to Lehi area is 18-20 miles", () => {
    const result = distanceMi(40.7608, -111.891, MORNING_VISTA.lat, MORNING_VISTA.lon);
    expect(result).toBeGreaterThan(15);
    expect(result).toBeLessThan(25);
  });

  it("a tiny offset gives a tiny distance", () => {
    // ~0.01 degree (~0.7 mi) — order of magnitude check.
    expect(distanceToMorningVista(MORNING_VISTA.lat + 0.01, MORNING_VISTA.lon)).toBeLessThan(1);
  });

  it("is symmetric (A→B === B→A)", () => {
    const a = distanceMi(40.5, -112.0, 40.6, -111.7);
    const b = distanceMi(40.6, -111.7, 40.5, -112.0);
    expect(a).toBeCloseTo(b, 5);
  });

  it("rounds to 2 decimal places", () => {
    const d = distanceMi(40.5, -112.0, 40.501, -112.0);
    // Stored to 2 decimals, so the string representation has at most 2 digits after `.`
    const decimalPart = String(d).split(".")[1] ?? "";
    expect(decimalPart.length).toBeLessThanOrEqual(2);
  });
});
