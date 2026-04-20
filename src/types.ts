export type OutputMode = "table" | "json";
export type GroupBy = "none" | "camera";

export interface CliOptions {
  targetDirectory: string;
  recursive: boolean;
  outputMode: OutputMode;
  groupBy: GroupBy;
}

export interface ImageDataRecord {
  filePath: string;
  fileType: string;
  error: null;
  cameraName: string | null;
  width: number | null;
  height: number | null;
  exposureValue: number | null;
  focalLength: number | null;
  shutterSpeed: number | null;
  aperture: number | null;
  iso: number | null;
}

export interface ImageErrorRecord {
  filePath: string;
  fileType: string;
  error: string;
}

export type ImageRecord = ImageDataRecord | ImageErrorRecord;

export interface MetricStats {
  sampleCount: number;
  min: number | null;
  max: number | null;
  average: number | null;
  std: number | null;
  p1: number | null;
  p5: number | null;
  p10: number | null;
  p20: number | null;
  p50: number | null;
  p80: number | null;
  p90: number | null;
  p95: number | null;
  p99: number | null;
}

export interface ReportStats {
  exposureValue: MetricStats;
  focalLength: MetricStats;
  shutterSpeed: MetricStats;
  aperture: MetricStats;
  iso: MetricStats;
}

export interface CameraGroupedStats {
  cameraName: string;
  imageCount: number;
  stats: ReportStats;
}

export interface ReportData {
  numberOfImages: number;
  scannedDirectory: string;
  recursive: boolean;
  groupBy: GroupBy;
  processedCount: number;
  errorCount: number;
  imageTypes: Array<{ name: string; count: number }>;
  topCameraNames: Array<{ name: string; count: number }>;
  resolutions: Array<{ resolution: string; count: number }>;
  stats: ReportStats;
  cameraGroups?: CameraGroupedStats[];
  errors: Array<{ filePath: string; message: string }>;
}
