// tests/integration/templates-command.test.ts
import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { createTestEnv } from "../helpers/test-utils";
import { $ } from "bun";

describe("proj templates command", () => {
  let configDir: string;
  let cleanup: () => void;

  beforeEach(() => {
    const testEnv = createTestEnv(true);
    configDir = testEnv.configDir;
    cleanup = testEnv.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  test("shows message when no templates exist", async () => {
    const result = await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts templates`.text();
    expect(result).toContain("No templates found");
  });

  test("lists available templates", async () => {
    const templateDir = join(configDir, "templates", "test-template");
    mkdirSync(join(templateDir, "files"), { recursive: true });
    writeFileSync(
      join(templateDir, "template.json"),
      JSON.stringify({
        name: "Test Template",
        description: "A template for testing",
      })
    );

    const result = await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts templates`.text();

    expect(result).toContain("test-template");
    expect(result).toContain("Test Template");
    expect(result).toContain("A template for testing");
  });

  test("outputs JSON with --json flag", async () => {
    const templateDir = join(configDir, "templates", "json-template");
    mkdirSync(join(templateDir, "files"), { recursive: true });
    writeFileSync(
      join(templateDir, "template.json"),
      JSON.stringify({
        name: "JSON Template",
        description: "For JSON output test",
      })
    );

    const result = await $`PROJ_CONFIG_DIR=${configDir} bun run proj.ts templates --json`.json();

    expect(result.templates).toBeDefined();
    expect(result.templates.length).toBe(1);
    expect(result.templates[0].id).toBe("json-template");
  });
});
