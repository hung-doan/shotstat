import { Dirent } from "node:fs";
import { readdir, realpath } from "node:fs/promises";
import path from "node:path";

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
  ".dng",
  ".cr2",
  ".nef",
  ".arw",
]);

export function isSupportedImageFile(filePath: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export async function walkImageFiles(
  targetDirectory: string,
  recursive: boolean,
): Promise<string[]> {
  const visited = new Set<string>();
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let resolvedDir: string;

    try {
      resolvedDir = await realpath(currentDir);
    } catch {
      return;
    }

    if (visited.has(resolvedDir)) {
      return;
    }

    visited.add(resolvedDir);

    let entries: Dirent[];
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    const subdirs: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (recursive) subdirs.push(fullPath);
        continue;
      }

      // isFile() returns false for symlinks, so symlinked image files are skipped
      if (entry.isFile() && isSupportedImageFile(fullPath)) {
        files.push(fullPath);
      }
    }

    if (subdirs.length > 0) {
      await Promise.all(subdirs.map(walk));
    }
  }

  await walk(targetDirectory);
  return files;
}
