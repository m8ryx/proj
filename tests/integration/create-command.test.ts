// tests/integration/create-command.test.ts
import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { createTestEnv } from "../helpers/test-utils";
import { $ } from "bun";

describe("proj create command (non-interactive)", () => {
  let configDir: string;
  let cleanup: () => void;
  let testDir: string;

  beforeEach(() => {
    const testEnv = createTestEnv(true);
    configDir = testEnv.configDir;
    cleanup = testEnv.cleanup;

    // Create a test template
    const templateDir = join(configDir, "templates", "basic");
    mkdirSync(join(templateDir, "files"), { recursive: true });
    writeFileSync(
      join(templateDir, "template.json"),
      JSON.stringify({
        name: "Basic Template",
        description: "A basic project template",
        docsLocation: "./docs",
        gitInit: true,
        nextSteps: ["Install dependencies", "Start coding"],
      })
    );
    writeFileSync(join(templateDir, "files", "README.md"), "# {{name}}\n\nCreated on {{date}}");

    // Create test output directory
    testDir = join(configDir, "projects");
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    cleanup();
  });

  test("creates project from template with all flags", async () => {
    const projectPath = join(testDir, "my-app");

    const result = await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts create basic my-app --path=${projectPath} --no-git`.text();

    expect(result).toContain("Created project 'my-app'");
    expect(existsSync(projectPath)).toBe(true);
    expect(existsSync(join(projectPath, "README.md"))).toBe(true);

    const readme = readFileSync(join(projectPath, "README.md"), "utf-8");
    expect(readme).toContain("# my-app");
  });

  test("registers project in config", async () => {
    const projectPath = join(testDir, "registered-app");

    await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts create basic registered-app --path=${projectPath} --no-git`.quiet();

    const listResult = await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts list --json`.json();

    expect(listResult.projects.some((p: any) => p.name === "registered-app")).toBe(true);
  });

  test("fails when template does not exist", async () => {
    const projectPath = join(testDir, "fail-app");

    const result = await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts create nonexistent fail-app --path=${projectPath}`.nothrow();

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Template 'nonexistent' not found");
  });

  test("fails when directory already exists", async () => {
    const projectPath = join(testDir, "existing-app");
    mkdirSync(projectPath, { recursive: true });

    const result = await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts create basic existing-app --path=${projectPath}`.nothrow();

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("already exists");
  });

  test("initializes git repo with --git flag", async () => {
    const projectPath = join(testDir, "git-app");

    await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts create basic git-app --path=${projectPath} --git`.quiet();

    expect(existsSync(join(projectPath, ".git"))).toBe(true);
  });

  test("sets docs directory from template default", async () => {
    const projectPath = join(testDir, "docs-app");

    await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts create basic docs-app --path=${projectPath} --no-git`.quiet();

    const listResult = await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts list --json`.json();
    const project = listResult.projects.find((p: any) => p.name === "docs-app");

    expect(project.docs).toBe(join(projectPath, "docs"));
  });

  test("sets next steps from template", async () => {
    const projectPath = join(testDir, "steps-app");

    await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts create basic steps-app --path=${projectPath} --no-git`.quiet();

    const listResult = await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts list --json`.json();
    const project = listResult.projects.find((p: any) => p.name === "steps-app");

    expect(project.nextSteps).toContain("Install dependencies");
  });
});
