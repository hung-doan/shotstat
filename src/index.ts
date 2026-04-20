#!/usr/bin/env node
import { promptCliOptions } from "./cli";
import { extractImageRecord } from "./extract";
import { walkImageFiles } from "./fileWalker";
import { buildReport, renderTableReport } from "./report";
import { ImageRecord } from "./types";

const EXIF_CONCURRENCY = 16;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
  onProgress?: (processed: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  let processed = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = index;
      index += 1;
      try {
        results[current] = await task(items[current]);
      } finally {
        processed += 1;
        onProgress?.(processed, items.length);
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  try {
    const options = await promptCliOptions();

    console.log(`\nScanning ${options.targetDirectory} ...\n`);

    const files = await walkImageFiles(options.targetDirectory, options.recursive);
    const progressStream = options.outputMode === "json" ? process.stderr : process.stdout;

    if (files.length > 0) {
      progressStream.write(`Processing: 0% (0/${files.length})`);
    }

    const records: ImageRecord[] = await mapWithConcurrency(
      files,
      EXIF_CONCURRENCY,
      extractImageRecord,
      (processed, total) => {
        const percent = Math.floor((processed / total) * 100);
        progressStream.write(`\rProcessing: ${percent}% (${processed}/${total})`);
      },
    );

    if (files.length > 0) {
      progressStream.write("\n");
    }

    const report = buildReport(
      records,
      options.targetDirectory,
      options.recursive,
      options.groupBy,
    );

    if (options.outputMode === "json") {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(renderTableReport(report));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

void main();
