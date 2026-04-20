import path from "node:path";
import { computeMetricStats } from "./stats";
import {
  CameraGroupedStats,
  GroupBy,
  ImageDataRecord,
  ImageRecord,
  MetricStats,
  ReportData,
  ReportStats,
} from "./types";

function toCountMap(items: Array<string | null>, fallbackLabel: string): Record<string, number> {
  const map: Record<string, number> = {};

  for (const item of items) {
    const key = item && item.trim().length > 0 ? item : fallbackLabel;
    map[key] = (map[key] ?? 0) + 1;
  }

  return map;
}

function toSortedEntries(counts: Record<string, number>): Array<{ name: string; count: number }> {
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function toResolutions(records: ImageDataRecord[]): Array<{ resolution: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const record of records) {
    if (record.width !== null && record.height !== null) {
      const key = `${record.width}x${record.height}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return toSortedEntries(counts).map(({ name, count }) => ({ resolution: name, count }));
}

function formatNumber(value: number | null, digits: number = 2): string {
  if (value === null) {
    return "N/A";
  }
  return value.toFixed(digits);
}

function formatAperture(value: number | null): string {
  if (value === null) {
    return "N/A";
  }
  return `f/${value.toFixed(1)}`;
}

function formatShutter(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  if (value >= 1) {
    return `${value.toFixed(2)}s`;
  }

  const denom = Math.round(1 / value);
  if (denom > 0) {
    return `1/${denom}s`;
  }

  return `${value.toFixed(4)}s`;
}

export const MAX_ERROR_SAMPLES = 10;
const UNKNOWN_CAMERA = "Unknown Camera";
const MAX_CAMERA_GROUPS_IN_TABLE = 10;

function computeStats(records: ImageDataRecord[]): ReportStats {
  return {
    exposureValue: computeMetricStats(records.map((r) => r.exposureValue)),
    focalLength: computeMetricStats(records.map((r) => r.focalLength)),
    shutterSpeed: computeMetricStats(records.map((r) => r.shutterSpeed)),
    aperture: computeMetricStats(records.map((r) => r.aperture)),
    iso: computeMetricStats(records.map((r) => r.iso)),
  };
}

function buildCameraGroups(records: ImageDataRecord[]): CameraGroupedStats[] {
  const grouped = new Map<string, ImageDataRecord[]>();

  for (const record of records) {
    const key = record.cameraName && record.cameraName.trim().length > 0
      ? record.cameraName
      : UNKNOWN_CAMERA;
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(record);
    } else {
      grouped.set(key, [record]);
    }
  }

  return Array.from(grouped.entries())
    .map(([cameraName, cameraRecords]) => ({
      cameraName,
      imageCount: cameraRecords.length,
      stats: computeStats(cameraRecords),
    }))
    .sort((a, b) => b.imageCount - a.imageCount || a.cameraName.localeCompare(b.cameraName));
}

export function buildReport(
  records: ImageRecord[],
  scannedDirectory: string,
  recursive: boolean,
  groupBy: GroupBy = "none",
): ReportData {
  const errors: Array<{ filePath: string; message: string }> = [];
  const processed: ImageDataRecord[] = [];

  for (const record of records) {
    if (record.error !== null) {
      if (errors.length < MAX_ERROR_SAMPLES) {
        errors.push({ filePath: record.filePath, message: record.error });
      }
    } else {
      processed.push(record);
    }
  }

  const imageTypes = toSortedEntries(toCountMap(processed.map((r) => r.fileType), "unknown"));
  const cameraCounts = toCountMap(processed.map((r) => r.cameraName), UNKNOWN_CAMERA);
  const stats = computeStats(processed);
  const cameraGroups = groupBy === "camera" ? buildCameraGroups(processed) : undefined;

  return {
    numberOfImages: records.length,
    scannedDirectory,
    recursive,
    groupBy,
    processedCount: processed.length,
    errorCount: records.length - processed.length,
    imageTypes,
    topCameraNames: toSortedEntries(cameraCounts).slice(0, 10),
    resolutions: toResolutions(processed).slice(0, 50),
    stats,
    cameraGroups,
    errors,
  };
}

function formatMetricBlock(
  name: string,
  stat: MetricStats,
  unit: string = "",
  customFormatter?: (value: number | null) => string,
): string {
  const formatter = customFormatter ?? ((value: number | null) => formatNumber(value, 2));

  return [
    `${name} (samples: ${stat.sampleCount})`,
    `  min: ${formatter(stat.min)}${unit}`,
    `  max: ${formatter(stat.max)}${unit}`,
    `  avg: ${formatter(stat.average)}${unit}`,
    `  std: ${formatter(stat.std)}${unit}`,
    `  p1:  ${formatter(stat.p1)}${unit}`,
    `  p5:  ${formatter(stat.p5)}${unit}`,
    `  p10: ${formatter(stat.p10)}${unit}`,
    `  p20: ${formatter(stat.p20)}${unit}`,
    `  p50: ${formatter(stat.p50)}${unit}`,
    `  p80: ${formatter(stat.p80)}${unit}`,
    `  p90: ${formatter(stat.p90)}${unit}`,
    `  p95: ${formatter(stat.p95)}${unit}`,
    `  p99: ${formatter(stat.p99)}${unit}`,
  ].join("\n");
}

export function renderTableReport(report: ReportData): string {
  const typeRows = report.imageTypes
    .map(({ name, count }) => `  ${name}: ${count}`)
    .join("\n");

  const cameraRows = report.topCameraNames
    .map((camera) => `  ${camera.name}: ${camera.count}`)
    .join("\n");

  const resolutionRows = report.resolutions.slice(0, 10)
    .map((item) => `  ${item.resolution}: ${item.count}`)
    .join("\n");

  const errorPreview = report.errors.slice(0, 5)
    .map((error) => `  ${path.basename(error.filePath)} -> ${error.message}`)
    .join("\n");

  const cameraGroupSections = report.groupBy === "camera"
    ? (report.cameraGroups ?? [])
      .slice(0, MAX_CAMERA_GROUPS_IN_TABLE)
      .flatMap((group) => [
        "",
        `${group.cameraName} (${group.imageCount} images):`,
        formatMetricBlock("Exposure (EV)", group.stats.exposureValue, ""),
        formatMetricBlock("Focal Length", group.stats.focalLength, "mm"),
        formatMetricBlock("Shutter Speed", group.stats.shutterSpeed, undefined, formatShutter),
        formatMetricBlock("Aperture", group.stats.aperture, undefined, formatAperture),
        formatMetricBlock("ISO", group.stats.iso, ""),
      ])
    : [];

  const lines = [
    "Image Habit Report",
    "=================",
    `Directory: ${report.scannedDirectory}`,
    `Recursive: ${report.recursive}`,
    `Number of images: ${report.numberOfImages}`,
    `Processed: ${report.processedCount}`,
    `Errors: ${report.errorCount}`,
    "",
    "Image types:",
    typeRows || "  (none)",
    "",
    "Top camera names:",
    cameraRows || "  (none)",
    "",
    "Top resolutions:",
    resolutionRows || "  (none)",
    "",
    "Statistics:",
    formatMetricBlock("Exposure (EV)", report.stats.exposureValue, ""),
    formatMetricBlock("Focal Length", report.stats.focalLength, "mm"),
    formatMetricBlock("Shutter Speed", report.stats.shutterSpeed, undefined, formatShutter),
    formatMetricBlock("Aperture", report.stats.aperture, undefined, formatAperture),
    formatMetricBlock("ISO", report.stats.iso, ""),
  ];

  if (report.groupBy === "camera") {
    lines.push(
      "",
      `Per-camera statistics (top ${MAX_CAMERA_GROUPS_IN_TABLE} by image count):`,
      ...cameraGroupSections,
    );

    if ((report.cameraGroups?.length ?? 0) > MAX_CAMERA_GROUPS_IN_TABLE) {
      lines.push(
        "",
        `  ... and ${(report.cameraGroups?.length ?? 0) - MAX_CAMERA_GROUPS_IN_TABLE} more camera group(s)`,
      );
    }
  }

  if (report.errorCount > 0) {
    lines.push("", "Error samples:", errorPreview);
  }

  return lines.join("\n");
}
