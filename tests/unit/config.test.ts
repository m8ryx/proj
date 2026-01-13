import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import {
  ensureConfigDir,
  loadConfig,
  saveConfig,
  type ProjectConfig,
} from "../../proj";
import { createTestEnv } from "../helpers/test-utils";

describe("Config I/O", () => {
  let configDir: string;
  let cleanup: () => void;
  let originalEnv: string | undefined;

  beforeEach(() => {
    const testEnv = createTestEnv();
    configDir = testEnv.configDir;
    cleanup = testEnv.cleanup;
    originalEnv = process.env.PROJ_CONFIG_DIR;
    process.env.PROJ_CONFIG_DIR = configDir;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PROJ_CONFIG_DIR = originalEnv;
    } else {
      delete process.env.PROJ_CONFIG_DIR;
    }
    cleanup();
  });

  describe("ensureConfigDir", () => {
    test("creates config directory when it doesn't exist", () => {
      expect(existsSync(configDir)).toBe(false);

      ensureConfigDir();

      expect(existsSync(configDir)).toBe(true);
    });

    test("does nothing when config directory already exists", () => {
      ensureConfigDir();
      const firstCheck = existsSync(configDir);

      ensureConfigDir();
      const secondCheck = existsSync(configDir);

      expect(firstCheck).toBe(true);
      expect(secondCheck).toBe(true);
    });
  });

  describe("loadConfig", () => {
    test("creates default config when file doesn't exist", () => {
      const config = loadConfig();

      expect(config.version).toBe("1.0.0");
      expect(config.projects).toEqual([]);
      expect(Array.isArray(config.projects)).toBe(true);
    });

    test("writes default config to disk when created", () => {
      loadConfig();

      const configFile = join(configDir, "projects.json");
      expect(existsSync(configFile)).toBe(true);

      const content = readFileSync(configFile, "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe("1.0.0");
      expect(parsed.projects).toEqual([]);
    });

    test("parses existing valid config correctly", () => {
      const testConfig: ProjectConfig = {
        version: "1.0.0",
        projects: [
          {
            name: "test-project",
            path: "/tmp/test",
            added: "2024-01-01T00:00:00.000Z",
            lastModified: "2024-01-01T00:00:00.000Z",
            state: "active",
          },
        ],
      };

      ensureConfigDir();
      const configFile = join(configDir, "projects.json");
      writeFileSync(configFile, JSON.stringify(testConfig, null, 2));

      const config = loadConfig();

      expect(config.version).toBe("1.0.0");
      expect(config.projects.length).toBe(1);
      expect(config.projects[0].name).toBe("test-project");
      expect(config.projects[0].path).toBe("/tmp/test");
      expect(config.projects[0].state).toBe("active");
    });

    test("migrates old configs by adding state field", () => {
      const oldConfig = {
        version: "1.0.0",
        projects: [
          {
            name: "old-project",
            path: "/tmp/old",
            added: "2024-01-01T00:00:00.000Z",
            lastModified: "2024-01-01T00:00:00.000Z",
            // No state field
          },
        ],
      };

      ensureConfigDir();
      const configFile = join(configDir, "projects.json");
      writeFileSync(configFile, JSON.stringify(oldConfig, null, 2));

      const config = loadConfig();

      expect(config.projects[0].state).toBe("active");
    });

    test("handles config with multiple projects", () => {
      const testConfig: ProjectConfig = {
        version: "1.0.0",
        projects: [
          {
            name: "project-1",
            path: "/tmp/project-1",
            added: "2024-01-01T00:00:00.000Z",
            lastModified: "2024-01-01T00:00:00.000Z",
            state: "active",
          },
          {
            name: "project-2",
            path: "/tmp/project-2",
            added: "2024-01-02T00:00:00.000Z",
            lastModified: "2024-01-02T00:00:00.000Z",
            state: "paused",
          },
          {
            name: "project-3",
            path: "/tmp/project-3",
            added: "2024-01-03T00:00:00.000Z",
            lastModified: "2024-01-03T00:00:00.000Z",
            state: "completed",
          },
        ],
      };

      ensureConfigDir();
      const configFile = join(configDir, "projects.json");
      writeFileSync(configFile, JSON.stringify(testConfig, null, 2));

      const config = loadConfig();

      expect(config.projects.length).toBe(3);
      expect(config.projects[0].name).toBe("project-1");
      expect(config.projects[1].name).toBe("project-2");
      expect(config.projects[2].name).toBe("project-3");
    });

    test("preserves optional fields", () => {
      const testConfig: ProjectConfig = {
        version: "1.0.0",
        projects: [
          {
            name: "full-project",
            path: "/tmp/full",
            added: "2024-01-01T00:00:00.000Z",
            lastModified: "2024-01-01T00:00:00.000Z",
            state: "active",
            size: 4096,
            docs: "/tmp/full/docs",
            category: "Technical",
            description: "A test project",
            visibility: "public",
            repoUrl: "https://github.com/test/repo",
            nextSteps: "Add tests",
          },
        ],
      };

      ensureConfigDir();
      const configFile = join(configDir, "projects.json");
      writeFileSync(configFile, JSON.stringify(testConfig, null, 2));

      const config = loadConfig();

      const project = config.projects[0];
      expect(project.size).toBe(4096);
      expect(project.docs).toBe("/tmp/full/docs");
      expect(project.category).toBe("Technical");
      expect(project.description).toBe("A test project");
      expect(project.visibility).toBe("public");
      expect(project.repoUrl).toBe("https://github.com/test/repo");
      expect(project.nextSteps).toBe("Add tests");
    });
  });

  describe("saveConfig", () => {
    test("saves valid config to disk", () => {
      const config: ProjectConfig = {
        version: "1.0.0",
        projects: [
          {
            name: "new-project",
            path: "/tmp/new",
            added: "2024-01-01T00:00:00.000Z",
            lastModified: "2024-01-01T00:00:00.000Z",
            state: "active",
          },
        ],
      };

      saveConfig(config);

      const configFile = join(configDir, "projects.json");
      expect(existsSync(configFile)).toBe(true);

      const content = readFileSync(configFile, "utf-8");
      const parsed = JSON.parse(content) as ProjectConfig;

      expect(parsed.version).toBe("1.0.0");
      expect(parsed.projects.length).toBe(1);
      expect(parsed.projects[0].name).toBe("new-project");
    });

    test("formats JSON with proper indentation", () => {
      const config: ProjectConfig = {
        version: "1.0.0",
        projects: [
          {
            name: "formatted-project",
            path: "/tmp/formatted",
            added: "2024-01-01T00:00:00.000Z",
            lastModified: "2024-01-01T00:00:00.000Z",
            state: "active",
          },
        ],
      };

      saveConfig(config);

      const configFile = join(configDir, "projects.json");
      const content = readFileSync(configFile, "utf-8");

      // Check that JSON is formatted (contains newlines and indentation)
      expect(content).toContain("\n");
      expect(content).toContain("  ");
      expect(content).toContain('"version": "1.0.0"');
    });

    test("overwrites existing config", () => {
      const firstConfig: ProjectConfig = {
        version: "1.0.0",
        projects: [
          {
            name: "first",
            path: "/tmp/first",
            added: "2024-01-01T00:00:00.000Z",
            lastModified: "2024-01-01T00:00:00.000Z",
            state: "active",
          },
        ],
      };

      saveConfig(firstConfig);

      const secondConfig: ProjectConfig = {
        version: "1.0.0",
        projects: [
          {
            name: "second",
            path: "/tmp/second",
            added: "2024-01-02T00:00:00.000Z",
            lastModified: "2024-01-02T00:00:00.000Z",
            state: "active",
          },
        ],
      };

      saveConfig(secondConfig);

      const config = loadConfig();

      expect(config.projects.length).toBe(1);
      expect(config.projects[0].name).toBe("second");
    });

    test("preserves all project fields", () => {
      const config: ProjectConfig = {
        version: "1.0.0",
        projects: [
          {
            name: "complete-project",
            path: "/tmp/complete",
            added: "2024-01-01T00:00:00.000Z",
            lastModified: "2024-01-01T00:00:00.000Z",
            state: "completed",
            completedAt: "2024-01-15T00:00:00.000Z",
            size: 8192,
            docs: "/tmp/complete/docs",
            category: "Personal",
            description: "A complete project",
            visibility: "private",
            repoUrl: "https://github.com/user/complete",
            nextSteps: "Archive it",
          },
        ],
      };

      saveConfig(config);

      const loadedConfig = loadConfig();
      const project = loadedConfig.projects[0];

      expect(project.name).toBe("complete-project");
      expect(project.state).toBe("completed");
      expect(project.completedAt).toBe("2024-01-15T00:00:00.000Z");
      expect(project.size).toBe(8192);
      expect(project.docs).toBe("/tmp/complete/docs");
      expect(project.category).toBe("Personal");
      expect(project.description).toBe("A complete project");
      expect(project.visibility).toBe("private");
      expect(project.repoUrl).toBe("https://github.com/user/complete");
      expect(project.nextSteps).toBe("Archive it");
    });
  });

  describe("Integration: load and save", () => {
    test("round-trip preserves all data", () => {
      const originalConfig: ProjectConfig = {
        version: "1.0.0",
        projects: [
          {
            name: "round-trip-project",
            path: "/tmp/round-trip",
            added: "2024-01-01T00:00:00.000Z",
            lastModified: "2024-01-01T00:00:00.000Z",
            state: "active",
            category: "Technical",
            description: "Test round trip",
          },
        ],
      };

      saveConfig(originalConfig);
      const loadedConfig = loadConfig();

      expect(loadedConfig).toEqual(originalConfig);
    });
  });
});
