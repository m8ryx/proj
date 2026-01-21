import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import type { Template } from "../../proj";
import { getTemplatesDir, getTemplateDir, listTemplates, loadTemplate, substituteVariables, copyTemplateFiles } from "../../proj";
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

describe("listTemplates", () => {
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

  test("returns empty array when templates directory does not exist", () => {
    const templates = listTemplates();
    expect(templates).toEqual([]);
  });

  test("returns empty array when templates directory is empty", () => {
    mkdirSync(join(configDir, "templates"), { recursive: true });
    const templates = listTemplates();
    expect(templates).toEqual([]);
  });

  test("returns template info for valid templates", () => {
    const templatesDir = join(configDir, "templates");
    const templateDir = join(templatesDir, "test-template");
    mkdirSync(join(templateDir, "files"), { recursive: true });
    writeFileSync(
      join(templateDir, "template.json"),
      JSON.stringify({
        name: "Test Template",
        description: "A test template",
      })
    );

    const templates = listTemplates();

    expect(templates.length).toBe(1);
    expect(templates[0].id).toBe("test-template");
    expect(templates[0].name).toBe("Test Template");
    expect(templates[0].description).toBe("A test template");
  });

  test("skips directories without template.json", () => {
    const templatesDir = join(configDir, "templates");
    mkdirSync(join(templatesDir, "invalid-template", "files"), { recursive: true });
    // No template.json

    const templates = listTemplates();
    expect(templates).toEqual([]);
  });
});

describe("loadTemplate", () => {
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

  test("throws error when template does not exist", () => {
    expect(() => loadTemplate("nonexistent")).toThrow("Template 'nonexistent' not found");
  });

  test("throws error when template.json is missing", () => {
    const templateDir = join(configDir, "templates", "no-config");
    mkdirSync(join(templateDir, "files"), { recursive: true });

    expect(() => loadTemplate("no-config")).toThrow("template.json not found");
  });

  test("returns parsed template config", () => {
    const templateDir = join(configDir, "templates", "valid-template");
    mkdirSync(join(templateDir, "files"), { recursive: true });
    writeFileSync(
      join(templateDir, "template.json"),
      JSON.stringify({
        name: "Valid Template",
        description: "A valid template",
        docsLocation: "~/Obsidian/{{name}}",
        gitInit: true,
        nextSteps: ["Step 1", "Step 2"],
      })
    );

    const template = loadTemplate("valid-template");

    expect(template.name).toBe("Valid Template");
    expect(template.description).toBe("A valid template");
    expect(template.docsLocation).toBe("~/Obsidian/{{name}}");
    expect(template.gitInit).toBe(true);
    expect(template.nextSteps).toEqual(["Step 1", "Step 2"]);
  });
});

describe("substituteVariables", () => {
  test("replaces {{name}} with project name", () => {
    const result = substituteVariables("Hello {{name}}!", { name: "world" });
    expect(result).toBe("Hello world!");
  });

  test("replaces multiple variables", () => {
    const result = substituteVariables(
      "Project: {{name}} at {{location}}",
      { name: "my-app", location: "/home/user/my-app" }
    );
    expect(result).toBe("Project: my-app at /home/user/my-app");
  });

  test("replaces multiple occurrences of same variable", () => {
    const result = substituteVariables(
      "{{name}} is called {{name}}",
      { name: "test" }
    );
    expect(result).toBe("test is called test");
  });

  test("leaves unknown variables unchanged", () => {
    const result = substituteVariables("Hello {{unknown}}!", { name: "world" });
    expect(result).toBe("Hello {{unknown}}!");
  });

  test("handles all standard variables", () => {
    const vars = {
      name: "my-project",
      location: "/home/user/my-project",
      docs: "/home/user/docs/my-project",
      date: "2026-01-19",
    };
    const result = substituteVariables(
      "# {{name}}\nPath: {{location}}\nDocs: {{docs}}\nCreated: {{date}}",
      vars
    );
    expect(result).toBe("# my-project\nPath: /home/user/my-project\nDocs: /home/user/docs/my-project\nCreated: 2026-01-19");
  });
});

describe("copyTemplateFiles", () => {
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

  test("copies files from template to destination", () => {
    // Create template with files
    const templateDir = join(configDir, "templates", "copy-test");
    const filesDir = join(templateDir, "files");
    mkdirSync(filesDir, { recursive: true });
    writeFileSync(join(filesDir, "README.md"), "# {{name}}");
    writeFileSync(
      join(templateDir, "template.json"),
      JSON.stringify({ name: "Copy Test", description: "Test" })
    );

    // Create destination
    const destDir = join(configDir, "dest-project");
    mkdirSync(destDir, { recursive: true });

    copyTemplateFiles("copy-test", destDir, { name: "my-project", location: destDir, docs: "", date: "2026-01-19" });

    // Verify file was copied and variables substituted
    const readmeContent = readFileSync(join(destDir, "README.md"), "utf-8");
    expect(readmeContent).toBe("# my-project");
  });

  test("copies nested directory structure", () => {
    const templateDir = join(configDir, "templates", "nested-test");
    const filesDir = join(templateDir, "files");
    mkdirSync(join(filesDir, "src"), { recursive: true });
    writeFileSync(join(filesDir, "src", "index.ts"), "// {{name}}");
    writeFileSync(
      join(templateDir, "template.json"),
      JSON.stringify({ name: "Nested Test", description: "Test" })
    );

    const destDir = join(configDir, "dest-nested");
    mkdirSync(destDir, { recursive: true });

    copyTemplateFiles("nested-test", destDir, { name: "nested-app", location: destDir, docs: "", date: "2026-01-19" });

    const indexContent = readFileSync(join(destDir, "src", "index.ts"), "utf-8");
    expect(indexContent).toBe("// nested-app");
  });

  test("skips binary files for substitution", () => {
    const templateDir = join(configDir, "templates", "binary-test");
    const filesDir = join(templateDir, "files");
    mkdirSync(filesDir, { recursive: true });

    // Create a simple PNG header (binary file)
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    writeFileSync(join(filesDir, "image.png"), pngHeader);
    writeFileSync(
      join(templateDir, "template.json"),
      JSON.stringify({ name: "Binary Test", description: "Test" })
    );

    const destDir = join(configDir, "dest-binary");
    mkdirSync(destDir, { recursive: true });

    copyTemplateFiles("binary-test", destDir, { name: "binary-app", location: destDir, docs: "", date: "2026-01-19" });

    // Binary file should be copied as-is
    const copiedContent = readFileSync(join(destDir, "image.png"));
    expect(copiedContent.equals(pngHeader)).toBe(true);
  });
});
