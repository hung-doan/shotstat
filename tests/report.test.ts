import { describe, expect, it } from "vitest";
import { buildReport, MAX_ERROR_SAMPLES, renderTableReport } from "../src/report";
import { ImageDataRecord, ImageErrorRecord, ImageRecord } from "../src/types";

function makeDataRecord(overrides: Partial<ImageDataRecord> = {}): ImageDataRecord {
  return {
    filePath: "/photos/img.jpg",
    fileType: "jpg",
    error: null,
    cameraName: "Canon EOS R5",
    width: 8192,
    height: 5464,
    exposureValue: 8.0,
    focalLength: 50,
    shutterSpeed: 0.01,
    aperture: 2.8,
    iso: 400,
    ...overrides,
  };
}

function makeErrorRecord(overrides: Partial<ImageErrorRecord> = {}): ImageErrorRecord {
  return {
    filePath: "/photos/broken.jpg",
    fileType: "jpg",
    error: "No EXIF metadata found",
    ...overrides,
  };
}

describe("buildReport", () => {
  it("counts total images, processed, and errors correctly", () => {
    const records: ImageRecord[] = [
      makeDataRecord(),
      makeDataRecord({ filePath: "/photos/b.jpg" }),
      makeErrorRecord(),
    ];
    const report = buildReport(records, "/photos", false);
    expect(report.numberOfImages).toBe(3);
    expect(report.processedCount).toBe(2);
    expect(report.errorCount).toBe(1);
  });

  it("reports correct scannedDirectory and recursive flag", () => {
    const report = buildReport([], "/my/dir", true);
    expect(report.scannedDirectory).toBe("/my/dir");
    expect(report.recursive).toBe(true);
  });

  it("builds imageTypes sorted by count descending", () => {
    const records: ImageRecord[] = [
      makeDataRecord({ fileType: "jpg" }),
      makeDataRecord({ fileType: "jpg" }),
      makeDataRecord({ fileType: "png" }),
    ];
    const report = buildReport(records, "/photos", false);
    expect(report.imageTypes[0].name).toBe("jpg");
    expect(report.imageTypes[0].count).toBe(2);
    expect(report.imageTypes[1].name).toBe("png");
    expect(report.imageTypes[1].count).toBe(1);
  });

  it("lists top camera names sorted by count", () => {
    const records: ImageRecord[] = [
      makeDataRecord({ cameraName: "Nikon Z9" }),
      makeDataRecord({ cameraName: "Nikon Z9" }),
      makeDataRecord({ cameraName: "Sony A7R V" }),
    ];
    const report = buildReport(records, "/photos", false);
    expect(report.topCameraNames[0].name).toBe("Nikon Z9");
    expect(report.topCameraNames[0].count).toBe(2);
    expect(report.topCameraNames[1].name).toBe("Sony A7R V");
  });

  it('uses "Unknown Camera" label for null cameraName', () => {
    const records: ImageRecord[] = [makeDataRecord({ cameraName: null })];
    const report = buildReport(records, "/photos", false);
    expect(report.topCameraNames[0].name).toBe("Unknown Camera");
  });

  it("aggregates resolution counts", () => {
    const records: ImageRecord[] = [
      makeDataRecord({ width: 1920, height: 1080 }),
      makeDataRecord({ width: 1920, height: 1080 }),
      makeDataRecord({ width: 3840, height: 2160 }),
    ];
    const report = buildReport(records, "/photos", false);
    const firstRes = report.resolutions[0];
    expect(firstRes.resolution).toBe("1920x1080");
    expect(firstRes.count).toBe(2);
  });

  it("excludes records with null dimensions from resolutions", () => {
    const records: ImageRecord[] = [
      makeDataRecord({ width: null, height: null }),
      makeDataRecord({ width: 1920, height: null }),
    ];
    const report = buildReport(records, "/photos", false);
    expect(report.resolutions).toHaveLength(0);
  });

  it("caps error samples at MAX_ERROR_SAMPLES", () => {
    const records: ImageRecord[] = Array.from({ length: 15 }, (_, i) =>
      makeErrorRecord({ filePath: `/photos/broken_${i}.jpg` }),
    );
    const report = buildReport(records, "/photos", false);
    expect(report.errorCount).toBe(15);
    expect(report.errors.length).toBe(MAX_ERROR_SAMPLES);
  });

  it("does not include cameraGroups when groupBy is 'none'", () => {
    const report = buildReport([makeDataRecord()], "/photos", false, "none");
    expect(report.cameraGroups).toBeUndefined();
  });

  it("includes cameraGroups when groupBy is 'camera'", () => {
    const records: ImageRecord[] = [
      makeDataRecord({ cameraName: "Canon EOS R5" }),
      makeDataRecord({ cameraName: "Canon EOS R5", filePath: "/photos/b.jpg" }),
      makeDataRecord({ cameraName: "Nikon Z9", filePath: "/photos/c.jpg" }),
    ];
    const report = buildReport(records, "/photos", false, "camera");
    expect(report.cameraGroups).toBeDefined();
    expect(report.cameraGroups).toHaveLength(2);
    expect(report.cameraGroups![0].cameraName).toBe("Canon EOS R5");
    expect(report.cameraGroups![0].imageCount).toBe(2);
  });

  it("computes stats correctly for numeric fields", () => {
    const records: ImageRecord[] = [
      makeDataRecord({ iso: 100 }),
      makeDataRecord({ iso: 200, filePath: "/photos/b.jpg" }),
      makeDataRecord({ iso: 400, filePath: "/photos/c.jpg" }),
    ];
    const report = buildReport(records, "/photos", false);
    expect(report.stats.iso.sampleCount).toBe(3);
    expect(report.stats.iso.min).toBe(100);
    expect(report.stats.iso.max).toBe(400);
    expect(report.stats.iso.average).toBeCloseTo(700 / 3, 5);
  });

  it("handles all-error records gracefully", () => {
    const records: ImageRecord[] = [makeErrorRecord(), makeErrorRecord({ filePath: "/b.jpg" })];
    const report = buildReport(records, "/photos", false);
    expect(report.processedCount).toBe(0);
    expect(report.errorCount).toBe(2);
    expect(report.imageTypes).toHaveLength(0);
    expect(report.stats.iso.sampleCount).toBe(0);
  });
});

describe("renderTableReport", () => {
  it("includes the header and directory info", () => {
    const report = buildReport([], "/my/photos", true);
    const output = renderTableReport(report);
    expect(output).toContain("Image Habit Report");
    expect(output).toContain("/my/photos");
    expect(output).toContain("Recursive: true");
  });

  it("includes image type and camera sections", () => {
    const records: ImageRecord[] = [
      makeDataRecord({ fileType: "jpg", cameraName: "Sony A1" }),
    ];
    const report = buildReport(records, "/photos", false);
    const output = renderTableReport(report);
    expect(output).toContain("Image types:");
    expect(output).toContain("jpg");
    expect(output).toContain("Top camera names:");
    expect(output).toContain("Sony A1");
  });

  it("shows (none) placeholders when no data", () => {
    const report = buildReport([], "/empty", false);
    const output = renderTableReport(report);
    expect(output).toContain("(none)");
  });

  it("shows error samples when errors exist", () => {
    const records: ImageRecord[] = [
      makeErrorRecord({ filePath: "/photos/bad.jpg", error: "Corrupt file" }),
    ];
    const report = buildReport(records, "/photos", false);
    const output = renderTableReport(report);
    expect(output).toContain("Error samples:");
    expect(output).toContain("bad.jpg");
    expect(output).toContain("Corrupt file");
  });

  it("does not show error section when there are no errors", () => {
    const records: ImageRecord[] = [makeDataRecord()];
    const report = buildReport(records, "/photos", false);
    const output = renderTableReport(report);
    expect(output).not.toContain("Error samples:");
  });

  it("shows per-camera statistics section when groupBy is camera", () => {
    const records: ImageRecord[] = [
      makeDataRecord({ cameraName: "Fuji X-T5" }),
    ];
    const report = buildReport(records, "/photos", false, "camera");
    const output = renderTableReport(report);
    expect(output).toContain("Per-camera statistics");
    expect(output).toContain("Fuji X-T5");
  });

  it("does not show per-camera section when groupBy is none", () => {
    const records: ImageRecord[] = [makeDataRecord({ cameraName: "Fuji X-T5" })];
    const report = buildReport(records, "/photos", false, "none");
    const output = renderTableReport(report);
    expect(output).not.toContain("Per-camera statistics");
  });
});
