import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dirent } from "node:fs";
import path from "node:path";
import * as fsPromises from "node:fs/promises";
import { isSupportedImageFile, walkImageFiles } from "../src/fileWalker";

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  realpath: vi.fn(),
}));

const mockReaddir = vi.mocked(fsPromises.readdir);
const mockRealpath = vi.mocked(fsPromises.realpath);

// Helper to create mock Dirent objects
function createDirent(name: string, isFile: boolean = true, isDirectory: boolean = false): Dirent {
  return {
    name,
    isFile: () => isFile,
    isDirectory: () => isDirectory,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    path: "",
    parentPath: "",
  } as Dirent;
}

describe("isSupportedImageFile", () => {
  it("returns true for all supported extensions", () => {
    const supported = [
      "photo.jpg",
      "photo.jpeg",
      "photo.png",
      "photo.heic",
      "photo.heif",
      "photo.dng",
      "photo.cr2",
      "photo.nef",
      "photo.arw",
    ];
    for (const file of supported) {
      expect(isSupportedImageFile(file), `expected ${file} to be supported`).toBe(true);
    }
  });

  it("returns false for unsupported extensions", () => {
    const unsupported = ["file.txt", "file.pdf", "file.mp4", "file.gif", "file.bmp", "file"];
    for (const file of unsupported) {
      expect(isSupportedImageFile(file), `expected ${file} to be unsupported`).toBe(false);
    }
  });

  it("is case-insensitive for extensions", () => {
    expect(isSupportedImageFile("photo.JPG")).toBe(true);
    expect(isSupportedImageFile("photo.JPEG")).toBe(true);
    expect(isSupportedImageFile("photo.PNG")).toBe(true);
    expect(isSupportedImageFile("photo.HEIC")).toBe(true);
    expect(isSupportedImageFile("photo.Cr2")).toBe(true);
  });

  it("handles full paths correctly", () => {
    expect(isSupportedImageFile("/photos/vacation/beach.jpg")).toBe(true);
    expect(isSupportedImageFile("C:\\Users\\photos\\img.nef")).toBe(true);
    expect(isSupportedImageFile("/docs/readme.txt")).toBe(false);
  });

  it("handles dotfiles and edge-case names", () => {
    // In Node.js, path.extname(".jpg") === "" — dotfiles have no extension
    expect(isSupportedImageFile(".jpg")).toBe(false);
    expect(isSupportedImageFile("no-extension")).toBe(false);
    expect(isSupportedImageFile("archive.tar.gz")).toBe(false);
  });
});

describe("walkImageFiles", () => {
  beforeEach(() => {
    mockReaddir.mockReset();
    mockRealpath.mockReset();
  });

  it("returns image files from a single directory (non-recursive)", async () => {
    mockRealpath.mockResolvedValue("/photos");
    mockReaddir.mockResolvedValue([
      createDirent("img1.jpg"),
      createDirent("img2.png"),
      createDirent("document.txt"),
      createDirent("video.mp4"),
    ] as Dirent[]);

    const result = await walkImageFiles("/photos", false);

    expect(result).toHaveLength(2);
    expect(result).toContain(path.join("/photos", "img1.jpg"));
    expect(result).toContain(path.join("/photos", "img2.png"));
  });

  it("skips subdirectories in non-recursive mode", async () => {
    mockRealpath.mockResolvedValue("/photos");
    mockReaddir.mockResolvedValue([
      createDirent("img.jpg"),
      createDirent("subdir", false, true),
    ] as Dirent[]);

    const result = await walkImageFiles("/photos", false);

    expect(result).toHaveLength(1);
    expect(result).toContain(path.join("/photos", "img.jpg"));
    expect(mockReaddir).toHaveBeenCalledTimes(1);
  });

  it("walks subdirectories in recursive mode", async () => {
    mockRealpath.mockImplementation(async (path) => path as string);
    mockReaddir
      .mockResolvedValueOnce([
        createDirent("root.jpg"),
        createDirent("subdir", false, true),
      ] as Dirent[])
      .mockResolvedValueOnce([createDirent("nested.png")] as Dirent[]);

    const result = await walkImageFiles("/photos", true);

    expect(result).toHaveLength(2);
    expect(result).toContain(path.join("/photos", "root.jpg"));
    expect(result).toContain(path.join("/photos", "subdir", "nested.png"));
    expect(mockReaddir).toHaveBeenCalledTimes(2);
  });

  it("returns empty array when directory read fails", async () => {
    mockRealpath.mockResolvedValue("/photos");
    mockReaddir.mockRejectedValue(new Error("Permission denied"));

    const result = await walkImageFiles("/photos", false);

    expect(result).toEqual([]);
  });

  it("returns empty array when realpath fails", async () => {
    mockRealpath.mockRejectedValue(new Error("Path does not exist"));

    const result = await walkImageFiles("/nonexistent", false);

    expect(result).toEqual([]);
    expect(mockReaddir).not.toHaveBeenCalled();
  });

  it("prevents infinite loops by tracking visited paths", async () => {
    // Simulate a symlink loop: /photos/loop -> /photos
    mockRealpath.mockResolvedValue("/photos");
    mockReaddir.mockResolvedValue([
      createDirent("img.jpg"),
      createDirent("loop", false, true),
    ] as Dirent[]);

    const result = await walkImageFiles("/photos", true);

    expect(result).toHaveLength(1);
    expect(result).toContain(path.join("/photos", "img.jpg"));
    // readdir should only be called once since the loop detection prevents re-visiting
    expect(mockReaddir).toHaveBeenCalledTimes(1);
  });

  it("filters out non-file entries (not files or directories)", async () => {
    mockRealpath.mockResolvedValue("/photos");
    mockReaddir.mockResolvedValue([
      createDirent("img.jpg", true, false),
      createDirent("socket", false, false), // Not a file, not a directory
    ] as Dirent[]);

    const result = await walkImageFiles("/photos", false);

    expect(result).toHaveLength(1);
    expect(result).toContain(path.join("/photos", "img.jpg"));
  });

  it("handles multiple subdirectories in parallel", async () => {
    mockRealpath.mockImplementation(async (path) => path as string);
    mockReaddir
      .mockResolvedValueOnce([
        createDirent("dir1", false, true),
        createDirent("dir2", false, true),
      ] as Dirent[])
      .mockResolvedValueOnce([createDirent("img1.jpg")] as Dirent[])
      .mockResolvedValueOnce([createDirent("img2.png")] as Dirent[]);

    const result = await walkImageFiles("/photos", true);

    expect(result).toHaveLength(2);
    expect(result).toContain(path.join("/photos", "dir1", "img1.jpg"));
    expect(result).toContain(path.join("/photos", "dir2", "img2.png"));
  });

  it("handles empty directories", async () => {
    mockRealpath.mockResolvedValue("/empty");
    mockReaddir.mockResolvedValue([] as Dirent[]);

    const result = await walkImageFiles("/empty", false);

    expect(result).toEqual([]);
  });

  it("handles deeply nested recursive structures", async () => {
    mockRealpath.mockImplementation(async (path) => path as string);
    mockReaddir
      .mockResolvedValueOnce([createDirent("level1", false, true)] as Dirent[])
      .mockResolvedValueOnce([createDirent("level2", false, true)] as Dirent[])
      .mockResolvedValueOnce([createDirent("deep.jpg")] as Dirent[]);

    const result = await walkImageFiles("/photos", true);

    expect(result).toHaveLength(1);
    expect(result).toContain(path.join("/photos", "level1", "level2", "deep.jpg"));
  });
});
