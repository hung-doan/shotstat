import { beforeEach, describe, expect, it, vi } from "vitest";
import * as exifr from "exifr";
import { extractImageRecord } from "../src/extract";

vi.mock("exifr", () => ({
  parse: vi.fn(),
}));

const mockParse = vi.mocked(exifr.parse);

describe("extractImageRecord", () => {
  beforeEach(() => {
    mockParse.mockReset();
  });

  it("returns an error record when exifr.parse returns null (no EXIF)", async () => {
    mockParse.mockResolvedValue(null);
    const result = await extractImageRecord("/photos/img.jpg");
    expect(result.filePath).toBe("/photos/img.jpg");
    expect(result.fileType).toBe("jpg");
    expect(result.error).toBe("No EXIF metadata found");
  });

  it("returns an error record when exifr.parse throws", async () => {
    mockParse.mockRejectedValue(new Error("File corrupted"));
    const result = await extractImageRecord("/photos/img.jpg");
    expect(result.error).toBe("File corrupted");
  });

  it("returns a generic error message for non-Error throws", async () => {
    mockParse.mockRejectedValue("something went wrong");
    const result = await extractImageRecord("/photos/img.jpg");
    expect(result.error).toBe("Unknown metadata read failure");
  });

  it("extracts all fields from valid EXIF tags", async () => {
    mockParse.mockResolvedValue({
      Make: "Canon",
      Model: "EOS R5",
      ImageWidth: 8192,
      ImageHeight: 5464,
      ExposureValue: 8.0,
      FocalLength: 50,
      ExposureTime: 0.005,
      FNumber: 2.8,
      ISO: 400,
    });
    const result = await extractImageRecord("/photos/img.jpg");
    expect(result.error).toBeNull();
    if (result.error !== null) return;
    expect(result.cameraName).toBe("Canon EOS R5");
    expect(result.width).toBe(8192);
    expect(result.height).toBe(5464);
    expect(result.exposureValue).toBe(8.0);
    expect(result.focalLength).toBe(50);
    expect(result.shutterSpeed).toBe(0.005);
    expect(result.aperture).toBe(2.8);
    expect(result.iso).toBe(400);
  });

  it("infers file type from extension", async () => {
    mockParse.mockResolvedValue(null);
    const jpg = await extractImageRecord("/photos/img.jpg");
    expect(jpg.fileType).toBe("jpg");
    const raw = await extractImageRecord("/photos/shot.NEF");
    expect(raw.fileType).toBe("nef");
  });

  it("returns null cameraName when Make and Model are absent", async () => {
    mockParse.mockResolvedValue({ ISO: 200 });
    const result = await extractImageRecord("/photos/img.jpg");
    expect(result.error).toBeNull();
    if (result.error !== null) return;
    expect(result.cameraName).toBeNull();
  });

  it("uses only Model when Make is missing", async () => {
    mockParse.mockResolvedValue({ Model: "Pixel 8 Pro" });
    const result = await extractImageRecord("/photos/img.jpg");
    if (result.error !== null) return;
    expect(result.cameraName).toBe("Pixel 8 Pro");
  });

  it("falls back to alternative dimension tags", async () => {
    mockParse.mockResolvedValue({
      Make: "Sony",
      Model: "A7R V",
      ExifImageWidth: 9504,
      ExifImageHeight: 6336,
    });
    const result = await extractImageRecord("/photos/img.jpg");
    if (result.error !== null) return;
    expect(result.width).toBe(9504);
    expect(result.height).toBe(6336);
  });

  it("falls back to PhotographicSensitivity for ISO", async () => {
    mockParse.mockResolvedValue({
      Make: "Nikon",
      Model: "Z9",
      PhotographicSensitivity: 800,
    });
    const result = await extractImageRecord("/photos/img.jpg");
    if (result.error !== null) return;
    expect(result.iso).toBe(800);
  });

  it("falls back to BrightnessValue for exposure", async () => {
    mockParse.mockResolvedValue({
      Make: "Nikon",
      Model: "Z9",
      BrightnessValue: 4.5,
    });
    const result = await extractImageRecord("/photos/img.jpg");
    if (result.error !== null) return;
    expect(result.exposureValue).toBe(4.5);
  });

  it("returns null focalLength for zero or negative values", async () => {
    mockParse.mockResolvedValue({ Make: "Canon", Model: "EOS", FocalLength: 0 });
    const result = await extractImageRecord("/photos/img.jpg");
    if (result.error !== null) return;
    expect(result.focalLength).toBeNull();

    mockParse.mockResolvedValue({ Make: "Canon", Model: "EOS", FocalLength: -10 });
    const result2 = await extractImageRecord("/photos/img.jpg");
    if (result2.error !== null) return;
    expect(result2.focalLength).toBeNull();
  });

  it("returns null for non-finite numeric tag values", async () => {
    mockParse.mockResolvedValue({ Make: "Canon", Model: "EOS", ISO: Infinity });
    const result = await extractImageRecord("/photos/img.jpg");
    if (result.error !== null) return;
    expect(result.iso).toBeNull();
  });
});
