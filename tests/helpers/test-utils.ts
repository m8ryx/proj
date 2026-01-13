import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { Project, ProjectConfig } from "../../proj";

/**
 * Create an isolated test environment with a temporary config directory
 * @param createDir Whether to create the directory immediately (default: false)
 * @returns Object with configDir path and cleanup function
 */
export function createTestEnv(createDir: boolean = false): {
  configDir: string;
  cleanup: () => void;
} {
  const configDir = join(tmpdir(), `proj-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);

  if (createDir) {
    mkdirSync(configDir, { recursive: true });
  }

  return {
    configDir,
    cleanup: () => {
      if (existsSync(configDir)) {
        rmSync(configDir, { recursive: true, force: true });
      }
    },
  };
}

/**
 * Create a mock project directory with specified indicator files
 * @param name Project name (used in path)
 * @param indicators Array of indicator file names (e.g., [".git", "package.json"])
 * @returns Absolute path to the created mock project directory
 */
export function createMockProject(
  name: string,
  indicators: string[]
): string {
  const projectDir = join(tmpdir(), `proj-mock-${name}-${Date.now()}`);

  mkdirSync(projectDir, { recursive: true });

  // Create indicator files/directories
  for (const indicator of indicators) {
    const indicatorPath = join(projectDir, indicator);

    // Handle directory indicators (like .git)
    if (indicator.startsWith(".git") || indicator.includes("node_modules")) {
      mkdirSync(indicatorPath, { recursive: true });
    } else {
      // Handle file indicators (like package.json, Cargo.toml)
      const content = indicator === "package.json"
        ? JSON.stringify({ name, version: "1.0.0" }, null, 2)
        : `# ${indicator}`;
      writeFileSync(indicatorPath, content);
    }
  }

  return projectDir;
}

/**
 * Load and parse test config from a test directory
 * @param configDir Path to test config directory
 * @returns Parsed ProjectConfig
 */
export function loadTestConfig(configDir: string): ProjectConfig {
  const configFile = join(configDir, "projects.json");

  if (!existsSync(configFile)) {
    throw new Error(`Config file not found at ${configFile}`);
  }

  const content = readFileSync(configFile, "utf-8");
  return JSON.parse(content) as ProjectConfig;
}

/**
 * Create a pre-populated test config file
 * @param configDir Path to test config directory
 * @param projects Array of projects to include
 * @returns Path to the created config file
 */
export function createTestConfig(
  configDir: string,
  projects: Project[]
): string {
  mkdirSync(configDir, { recursive: true });

  const config: ProjectConfig = {
    version: "1.0.0",
    projects,
  };

  const configFile = join(configDir, "projects.json");
  writeFileSync(configFile, JSON.stringify(config, null, 2));

  return configFile;
}

/**
 * Create a sample project object for testing
 * @param overrides Partial project properties to override defaults
 * @returns Complete Project object
 */
export function createSampleProject(
  overrides: Partial<Project> = {}
): Project {
  return {
    name: "sample-project",
    path: "/tmp/sample-project",
    added: "2024-01-01T00:00:00.000Z",
    lastModified: "2024-01-01T00:00:00.000Z",
    state: "active",
    ...overrides,
  };
}

/**
 * Cleanup helper for removing temporary directories
 * @param paths Array of paths to remove
 */
export function cleanupPaths(...paths: string[]): void {
  for (const path of paths) {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  }
}
