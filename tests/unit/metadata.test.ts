import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { getDirectoryMetadata } from "../../proj";

describe("Metadata", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `proj-metadata-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("getDirectoryMetadata", () => {
    test("returns metadata for valid directory", () => {
      const metadata = getDirectoryMetadata(testDir);

      expect(metadata).toBeDefined();
      expect(metadata.lastModified).toBeDefined();
      expect(metadata.size).toBeDefined();
      expect(typeof metadata.lastModified).toBe("string");
      expect(typeof metadata.size).toBe("number");
    });

    test("returns ISO 8601 timestamp", () => {
      const metadata = getDirectoryMetadata(testDir);

      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(isoRegex.test(metadata.lastModified)).toBe(true);
    });

    test("timestamp is parseable as Date", () => {
      const metadata = getDirectoryMetadata(testDir);

      const date = new Date(metadata.lastModified);
      expect(date.toString()).not.toBe("Invalid Date");
      expect(date.getTime()).toBeGreaterThan(0);
    });

    test("returns numeric size", () => {
      const metadata = getDirectoryMetadata(testDir);

      expect(metadata.size).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(metadata.size)).toBe(true);
    });

    test("handles non-existent directory gracefully", () => {
      const nonExistentDir = join(tmpdir(), `non-existent-${Date.now()}`);

      const metadata = getDirectoryMetadata(nonExistentDir);

      expect(metadata.lastModified).toBeDefined();
      expect(metadata.size).toBe(0);

      // Should return current timestamp
      const date = new Date(metadata.lastModified);
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      // Timestamp should be within last second
      expect(diff).toBeLessThan(1000);
    });

    test("returns valid metadata for nested directory", () => {
      const nestedDir = join(testDir, "level1", "level2", "level3");
      mkdirSync(nestedDir, { recursive: true });

      const metadata = getDirectoryMetadata(nestedDir);

      expect(metadata).toBeDefined();
      expect(metadata.lastModified).toBeDefined();
      expect(metadata.size).toBeGreaterThanOrEqual(0);
    });

    test("metadata timestamp reflects recent modification", () => {
      const metadata1 = getDirectoryMetadata(testDir);
      const date1 = new Date(metadata1.lastModified);

      // Wait a bit and modify the directory
      const tempFile = join(testDir, "temp.txt");
      Bun.write(tempFile, "test");

      const metadata2 = getDirectoryMetadata(testDir);
      const date2 = new Date(metadata2.lastModified);

      // Second timestamp should be >= first
      expect(date2.getTime()).toBeGreaterThanOrEqual(date1.getTime());
    });
  });
});
