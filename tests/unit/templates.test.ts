import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import type { Template } from "../../proj";
import { getTemplatesDir, getTemplateDir } from "../../proj";
import { createTestEnv } from "../helpers/test-utils";
import { join } from "path";

describe("Template type", () => {
  test("Template interface has required fields", () => {
    const template: Template = {
      name: "Test Template",
      description: "A test template",
      docsLocation: "./docs",
      gitInit: true,
      nextSteps: ["Step 1", "Step 2"],
    };

    expect(template.name).toBe("Test Template");
    expect(template.description).toBe("A test template");
    expect(template.docsLocation).toBe("./docs");
    expect(template.gitInit).toBe(true);
    expect(template.nextSteps).toEqual(["Step 1", "Step 2"]);
  });

  test("Template interface allows optional fields", () => {
    const minimalTemplate: Template = {
      name: "Minimal",
      description: "Minimal template",
    };

    expect(minimalTemplate.docsLocation).toBeUndefined();
    expect(minimalTemplate.gitInit).toBeUndefined();
    expect(minimalTemplate.nextSteps).toBeUndefined();
  });
});

describe("Template directory helpers", () => {
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

  test("getTemplatesDir returns templates subdirectory", () => {
    const templatesDir = getTemplatesDir();
    expect(templatesDir).toBe(join(configDir, "templates"));
  });

  test("getTemplateDir returns specific template directory", () => {
    const templateDir = getTemplateDir("my-template");
    expect(templateDir).toBe(join(configDir, "templates", "my-template"));
  });
});
