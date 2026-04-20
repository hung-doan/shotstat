import path from "node:path";
import * as exifr from "exifr";
import { ImageRecord } from "./types";

function extensionToType(filePath: string): string {
  return path.extname(filePath).toLowerCase().replace(".", "");
}

function normalizeCameraName(make?: unknown, model?: unknown): string | null {
  const safeMake = typeof make === "string" ? make.trim() : "";
  const safeModel = typeof model === "string" ? model.trim() : "";

  const cameraName = [safeMake, safeModel].filter(Boolean).join(" ");
  return cameraName.length > 0 ? cameraName : null;
}

function readNumberTag(tags: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = tags[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
  }
  return null;
}

function normalizeFocalLength(value: number | null): number | null {
  // Focal length <= 0 is invalid in EXIF and should be treated as missing metadata.
  if (value === null || value <= 0) {
    return null;
  }
  return value;
}

export async function extractImageRecord(filePath: string): Promise<ImageRecord> {
  const base = { filePath, fileType: extensionToType(filePath) };

  try {
    const tags = (await exifr.parse(filePath, {
      pick: [
        "Make", "Model",
        "ImageWidth", "ExifImageWidth", "PixelXDimension",
        "ImageHeight", "ExifImageHeight", "PixelYDimension",
        "ExposureValue", "BrightnessValue",
        "FocalLength", "ExposureTime",
        "FNumber", "ApertureValue",
        "ISO", "PhotographicSensitivity",
      ],
    })) as Record<string, unknown> | null;

    if (!tags) {
      return { ...base, error: "No EXIF metadata found" };
    }

    return {
      ...base,
      error: null,
      cameraName: normalizeCameraName(tags.Make, tags.Model),
      width: readNumberTag(tags, ["ImageWidth", "ExifImageWidth", "PixelXDimension"]),
      height: readNumberTag(tags, ["ImageHeight", "ExifImageHeight", "PixelYDimension"]),
      exposureValue: readNumberTag(tags, ["ExposureValue", "BrightnessValue"]),
      focalLength: normalizeFocalLength(readNumberTag(tags, ["FocalLength"])),
      shutterSpeed: readNumberTag(tags, ["ExposureTime"]),
      aperture: readNumberTag(tags, ["FNumber", "ApertureValue"]),
      iso: readNumberTag(tags, ["ISO", "PhotographicSensitivity"]),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown metadata read failure";
    return { ...base, error: message };
  }
}
