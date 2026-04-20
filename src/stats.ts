import { MetricStats } from "./types";

function percentile(sorted: number[], percentileValue: number): number {
  if (sorted.length === 0) {
    throw new Error("Cannot compute percentile for empty array");
  }

  const index = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function computeMetricStats(values: Array<number | null>): MetricStats {
  const numeric = values.filter((value): value is number => value !== null && Number.isFinite(value));

  if (numeric.length === 0) {
    return {
      sampleCount: 0,
      min: null,
      max: null,
      average: null,
      std: null,
      p1: null,
      p5: null,
      p10: null,
      p20: null,
      p50: null,
      p80: null,
      p90: null,
      p95: null,
      p99: null,
    };
  }

  const sorted = numeric.sort((a, b) => a - b);
  const sum = sorted.reduce((accumulator, value) => accumulator + value, 0);
  const mean = sum / sorted.length;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / sorted.length;

  return {
    sampleCount: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    average: mean,
    std: Math.sqrt(variance),
    p1: percentile(sorted, 0.01),
    p5: percentile(sorted, 0.05),
    p10: percentile(sorted, 0.1),
    p20: percentile(sorted, 0.2),
    p50: percentile(sorted, 0.5),
    p80: percentile(sorted, 0.8),
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
  };
}
