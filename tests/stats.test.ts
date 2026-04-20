import { describe, expect, it } from "vitest";
import { computeMetricStats } from "../src/stats";

describe("computeMetricStats", () => {
  it("returns all-null stats for an empty array", () => {
    const result = computeMetricStats([]);
    expect(result.sampleCount).toBe(0);
    expect(result.min).toBeNull();
    expect(result.max).toBeNull();
    expect(result.average).toBeNull();
    expect(result.std).toBeNull();
    expect(result.p1).toBeNull();
    expect(result.p50).toBeNull();
    expect(result.p99).toBeNull();
  });

  it("returns all-null stats when all values are null", () => {
    const result = computeMetricStats([null, null, null]);
    expect(result.sampleCount).toBe(0);
    expect(result.min).toBeNull();
    expect(result.average).toBeNull();
  });

  it("filters out null and non-finite values", () => {
    const result = computeMetricStats([null, Infinity, NaN, 5, null, -Infinity]);
    expect(result.sampleCount).toBe(1);
    expect(result.min).toBe(5);
    expect(result.max).toBe(5);
    expect(result.average).toBe(5);
    expect(result.std).toBe(0);
  });

  it("computes correct stats for a single value", () => {
    const result = computeMetricStats([42]);
    expect(result.sampleCount).toBe(1);
    expect(result.min).toBe(42);
    expect(result.max).toBe(42);
    expect(result.average).toBe(42);
    expect(result.std).toBe(0);
    expect(result.p1).toBe(42);
    expect(result.p50).toBe(42);
    expect(result.p99).toBe(42);
  });

  it("computes correct stats for two values", () => {
    const result = computeMetricStats([10, 20]);
    expect(result.sampleCount).toBe(2);
    expect(result.min).toBe(10);
    expect(result.max).toBe(20);
    expect(result.average).toBe(15);
    expect(result.p50).toBe(15);
  });

  it("computes correct min, max, average for [1..5]", () => {
    const result = computeMetricStats([1, 2, 3, 4, 5]);
    expect(result.sampleCount).toBe(5);
    expect(result.min).toBe(1);
    expect(result.max).toBe(5);
    expect(result.average).toBe(3);
  });

  it("computes correct population standard deviation", () => {
    // population std dev of [2,4,4,4,5,5,7,9] = 2
    const result = computeMetricStats([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result.std).toBeCloseTo(2, 10);
  });

  it("computes correct interpolated percentiles for [1..10]", () => {
    // p50: index=4.5 → 5*0.5 + 6*0.5 = 5.5
    // p10: index=0.9 → 1*0.1 + 2*0.9 = 1.9
    // p90: index=8.1 → 9*0.9 + 10*0.1 = 9.1
    const result = computeMetricStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.p50).toBeCloseTo(5.5, 10);
    expect(result.p10).toBeCloseTo(1.9, 10);
    expect(result.p90).toBeCloseTo(9.1, 10);
  });

  it("p1 and p99 are within min/max range", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    const result = computeMetricStats(values);
    expect(result.p1).toBeGreaterThanOrEqual(result.min!);
    expect(result.p99).toBeLessThanOrEqual(result.max!);
  });

  it("handles negative values correctly", () => {
    const result = computeMetricStats([-10, -5, 0, 5, 10]);
    expect(result.min).toBe(-10);
    expect(result.max).toBe(10);
    expect(result.average).toBe(0);
    expect(result.p50).toBe(0);
  });
});
