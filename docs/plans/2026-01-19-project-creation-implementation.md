# Project Creation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `proj create` and `proj templates` commands with template-based project scaffolding.

**Architecture:** Templates live in `~/.config/proj/templates/<name>/` with a `template.json` config and `files/` directory. The create command supports both interactive and flag-based modes, copying template files with variable substitution and registering the new project.

**Tech Stack:** TypeScript, Bun runtime, Node.js built-ins (fs, path, os, readline)

---

## Task 1: Add Template Type Definition

**Files:**
- Modify: `proj.ts:28-49` (add after existing type definitions)

**Step 1: Write the failing test**

Create test file:

```typescript
// tests/unit/templates.test.ts
import { test, expect, describe } from "bun:test";
import type { Template } from "../../proj";

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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/unit/templates.test.ts`
Expected: FAIL with "Template" not exported

**Step 3: Write minimal implementation**

Add to `proj.ts` after line 49:

```typescript
export interface Template {
  name: string;
  description: string;
  docsLocation?: string;
  gitInit?: boolean;
  nextSteps?: string[];
}
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/unit/templates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add proj.ts tests/unit/templates.test.ts
git commit -m "feat: add Template type definition"
```

---

## Task 2: Add Template Directory Helpers

**Files:**
- Modify: `proj.ts:58-67` (add after getConfigFile)
- Modify: `tests/unit/templates.test.ts`

**Step 1: Write the failing test**

Add to `tests/unit/templates.test.ts`:

```typescript
import { getTemplatesDir, getTemplateDir } from "../../proj";
import { createTestEnv } from "../helpers/test-utils";
import { join } from "path";

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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/unit/templates.test.ts`
Expected: FAIL with "getTemplatesDir" not exported

**Step 3: Write minimal implementation**

Add to `proj.ts` after `getConfigFile()` function (around line 67):

```typescript
/**
 * Get templates directory path
 */
export function getTemplatesDir(): string {
  return join(getConfigDir(), "templates");
}

/**
 * Get specific template directory path
 */
export function getTemplateDir(templateName: string): string {
  return join(getTemplatesDir(), templateName);
}
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/unit/templates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add proj.ts tests/unit/templates.test.ts
git commit -m "feat: add template directory helper functions"
```

---

## Task 3: Add listTemplates Function

**Files:**
- Modify: `proj.ts` (add after template directory helpers)
- Modify: `tests/unit/templates.test.ts`

**Step 1: Write the failing test**

Add to `tests/unit/templates.test.ts`:

```typescript
import { mkdirSync, writeFileSync } from "fs";

describe("listTemplates", () => {
  // ... use same beforeEach/afterEach as above

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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/unit/templates.test.ts`
Expected: FAIL with "listTemplates" not exported

**Step 3: Write minimal implementation**

Add to `proj.ts`:

```typescript
export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
}

/**
 * List all available templates
 */
export function listTemplates(): TemplateInfo[] {
  const templatesDir = getTemplatesDir();

  if (!existsSync(templatesDir)) {
    return [];
  }

  const templates: TemplateInfo[] = [];

  try {
    const entries = readdirSync(templatesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const templateJsonPath = join(templatesDir, entry.name, "template.json");

        if (existsSync(templateJsonPath)) {
          try {
            const content = readFileSync(templateJsonPath, "utf-8");
            const config = JSON.parse(content) as Template;
            templates.push({
              id: entry.name,
              name: config.name,
              description: config.description,
            });
          } catch {
            // Skip invalid template.json files
          }
        }
      }
    }
  } catch {
    return [];
  }

  return templates;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/unit/templates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add proj.ts tests/unit/templates.test.ts
git commit -m "feat: add listTemplates function"
```

---

## Task 4: Add loadTemplate Function

**Files:**
- Modify: `proj.ts`
- Modify: `tests/unit/templates.test.ts`

**Step 1: Write the failing test**

Add to `tests/unit/templates.test.ts`:

```typescript
describe("loadTemplate", () => {
  // ... use same beforeEach/afterEach

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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/unit/templates.test.ts`
Expected: FAIL with "loadTemplate" not exported

**Step 3: Write minimal implementation**

Add to `proj.ts`:

```typescript
/**
 * Load a template configuration
 */
export function loadTemplate(templateId: string): Template {
  const templateDir = getTemplateDir(templateId);

  if (!existsSync(templateDir)) {
    throw new Error(`Template '${templateId}' not found`);
  }

  const templateJsonPath = join(templateDir, "template.json");

  if (!existsSync(templateJsonPath)) {
    throw new Error(`template.json not found in template '${templateId}'`);
  }

  try {
    const content = readFileSync(templateJsonPath, "utf-8");
    return JSON.parse(content) as Template;
  } catch (error) {
    throw new Error(`Failed to parse template.json for '${templateId}'`);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/unit/templates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add proj.ts tests/unit/templates.test.ts
git commit -m "feat: add loadTemplate function"
```

---

## Task 5: Add Variable Substitution Helper

**Files:**
- Modify: `proj.ts`
- Modify: `tests/unit/templates.test.ts`

**Step 1: Write the failing test**

Add to `tests/unit/templates.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/unit/templates.test.ts`
Expected: FAIL with "substituteVariables" not exported

**Step 3: Write minimal implementation**

Add to `proj.ts`:

```typescript
export interface TemplateVariables {
  name: string;
  location: string;
  docs: string;
  date: string;
}

/**
 * Substitute template variables in a string
 */
export function substituteVariables(
  content: string,
  variables: Partial<TemplateVariables>
): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(pattern, value);
    }
  }

  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/unit/templates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add proj.ts tests/unit/templates.test.ts
git commit -m "feat: add substituteVariables helper"
```

---

## Task 6: Add copyTemplateFiles Function

**Files:**
- Modify: `proj.ts`
- Modify: `tests/unit/templates.test.ts`
- Modify: `tests/helpers/test-utils.ts`

**Step 1: Write the failing test**

Add to `tests/unit/templates.test.ts`:

```typescript
describe("copyTemplateFiles", () => {
  // ... use same beforeEach/afterEach

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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/unit/templates.test.ts`
Expected: FAIL with "copyTemplateFiles" not exported

**Step 3: Write minimal implementation**

Add to `proj.ts` (also add `copyFileSync` to imports at top):

```typescript
import { copyFileSync } from "fs";

/**
 * Check if a file is likely binary
 */
function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = [
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp",
    ".pdf", ".zip", ".tar", ".gz",
    ".exe", ".dll", ".so", ".dylib",
    ".woff", ".woff2", ".ttf", ".eot",
  ];

  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf("."));
  return binaryExtensions.includes(ext);
}

/**
 * Copy template files to destination with variable substitution
 */
export function copyTemplateFiles(
  templateId: string,
  destPath: string,
  variables: TemplateVariables
): void {
  const templateDir = getTemplateDir(templateId);
  const filesDir = join(templateDir, "files");

  if (!existsSync(filesDir)) {
    return; // No files directory, nothing to copy
  }

  function copyRecursive(srcDir: string, destDir: string): void {
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    const entries = readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(srcDir, entry.name);
      const destPath = join(destDir, entry.name);

      if (entry.isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else if (entry.isFile()) {
        if (isBinaryFile(srcPath)) {
          // Copy binary files as-is
          copyFileSync(srcPath, destPath);
        } else {
          // Read, substitute, and write text files
          const content = readFileSync(srcPath, "utf-8");
          const substituted = substituteVariables(content, variables);
          writeFileSync(destPath, substituted);
        }
      }
    }
  }

  copyRecursive(filesDir, destPath);
}
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/unit/templates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add proj.ts tests/unit/templates.test.ts
git commit -m "feat: add copyTemplateFiles function"
```

---

## Task 7: Add `templates` Command

**Files:**
- Modify: `proj.ts` (add command function and case in main switch)

**Step 1: Write the failing test**

Create integration test:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/integration/templates-command.test.ts`
Expected: FAIL with "Unknown command 'templates'"

**Step 3: Write minimal implementation**

Add command function to `proj.ts` (after other command functions, around line 850):

```typescript
/**
 * List available templates
 */
function templatesCommand(options: { json?: boolean } = {}): void {
  const templates = listTemplates();

  if (templates.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ templates: [] }, null, 2));
    } else {
      console.log("No templates found.");
      console.log(`\nTemplates are stored in: ${getTemplatesDir()}`);
      console.log("Create a template directory with a template.json and files/ subdirectory.");
    }
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({ templates }, null, 2));
  } else {
    console.log("\nAvailable Templates:\n");
    for (const template of templates) {
      console.log(`  ${template.id}`);
      console.log(`    Name: ${template.name}`);
      console.log(`    ${template.description}`);
      console.log("");
    }
  }
}
```

Add case in main switch (around line 1170):

```typescript
    case "templates":
      templatesCommand({ json: jsonFlag });
      break;
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/integration/templates-command.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add proj.ts tests/integration/templates-command.test.ts
git commit -m "feat: add proj templates command"
```

---

## Task 8: Add Non-Interactive `create` Command

**Files:**
- Modify: `proj.ts`
- Create: `tests/integration/create-command.test.ts`

**Step 1: Write the failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/integration/create-command.test.ts`
Expected: FAIL with "Unknown command 'create'"

**Step 3: Write minimal implementation**

Add to `proj.ts` (imports at top):

```typescript
import { execSync } from "child_process";
```

Add command function:

```typescript
interface CreateOptions {
  path?: string;
  docs?: string;
  git?: boolean;
  json?: boolean;
}

/**
 * Create a new project from a template
 */
function createProjectCommand(
  templateId: string | undefined,
  projectName: string | undefined,
  options: CreateOptions
): void {
  // Validate required args for non-interactive mode
  if (!templateId) {
    console.error("Error: Template is required");
    console.error("Usage: proj create <template> <name> [--path <path>] [--docs <docs>] [--git|--no-git]");
    console.error("Run 'proj templates' to see available templates");
    process.exit(1);
  }

  if (!projectName) {
    console.error("Error: Project name is required");
    console.error("Usage: proj create <template> <name> [--path <path>] [--docs <docs>] [--git|--no-git]");
    process.exit(1);
  }

  // Load template
  let template: Template;
  try {
    template = loadTemplate(templateId);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }

  // Resolve project path
  const projectPath = options.path
    ? resolve(options.path)
    : resolve(process.cwd(), projectName);

  // Check if directory exists
  if (existsSync(projectPath)) {
    console.error(`Error: Directory already exists: ${projectPath}`);
    console.error("Choose a different path or name");
    process.exit(1);
  }

  // Resolve docs path
  const date = new Date().toISOString().split("T")[0];
  let docsPath = options.docs;
  if (!docsPath && template.docsLocation) {
    docsPath = substituteVariables(template.docsLocation, {
      name: projectName,
      location: projectPath,
      docs: "",
      date,
    });
    // Handle relative paths
    if (docsPath.startsWith("./") || docsPath.startsWith("../")) {
      docsPath = resolve(projectPath, docsPath);
    } else if (docsPath.startsWith("~")) {
      docsPath = docsPath.replace("~", homedir());
    }
  }
  if (docsPath) {
    docsPath = resolve(docsPath);
  }

  // Determine git init
  const shouldGitInit = options.git !== undefined ? options.git : (template.gitInit ?? true);

  // Create project directory
  mkdirSync(projectPath, { recursive: true });

  // Copy template files
  const variables: TemplateVariables = {
    name: projectName,
    location: projectPath,
    docs: docsPath || "",
    date,
  };
  copyTemplateFiles(templateId, projectPath, variables);

  // Create docs directory if specified and doesn't exist
  if (docsPath && !existsSync(docsPath)) {
    try {
      mkdirSync(docsPath, { recursive: true });
    } catch {
      console.log(`Warning: Could not create docs directory: ${docsPath}`);
    }
  }

  // Initialize git if requested
  if (shouldGitInit) {
    try {
      execSync("git init", { cwd: projectPath, stdio: "ignore" });
    } catch {
      console.log("Warning: Could not initialize git repository");
    }
  }

  // Register project
  const config = loadConfig();
  const metadata = getDirectoryMetadata(projectPath);
  const now = new Date().toISOString();

  const newProject: Project = {
    name: projectName,
    path: projectPath,
    added: now,
    lastModified: metadata.lastModified,
    size: metadata.size,
    state: "active",
    ...(docsPath && { docs: docsPath }),
    ...(template.nextSteps && { nextSteps: template.nextSteps.join("; ") }),
  };

  config.projects.push(newProject);
  saveConfig(config);

  // Output result
  if (options.json) {
    console.log(JSON.stringify({ success: true, project: newProject }, null, 2));
  } else {
    console.log(`✓ Created project '${projectName}' at ${projectPath}`);
    if (docsPath) {
      console.log(`  Docs: ${docsPath}`);
    }
    if (shouldGitInit) {
      console.log(`  Git: initialized`);
    }
    if (template.nextSteps && template.nextSteps.length > 0) {
      console.log(`\nNext steps:`);
      template.nextSteps.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step}`);
      });
    }
  }
}
```

Add case in main switch and parse flags:

```typescript
    // Parse --git/--no-git flags
    const gitFlagIndex = args.indexOf("--git");
    const noGitFlagIndex = args.indexOf("--no-git");
    let gitFlag: boolean | undefined;
    if (gitFlagIndex !== -1) {
      gitFlag = true;
    } else if (noGitFlagIndex !== -1) {
      gitFlag = false;
    }

    // Parse --path flag
    const pathIndex = args.indexOf("--path");
    const pathArg = pathIndex !== -1 && args[pathIndex + 1] ? args[pathIndex + 1] : undefined;

    // ... in switch statement:
    case "create":
      createProjectCommand(args[1], args[2], {
        path: pathArg,
        docs: docsPath,
        git: gitFlag,
        json: jsonFlag,
      });
      break;
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/integration/create-command.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add proj.ts tests/integration/create-command.test.ts
git commit -m "feat: add proj create command (non-interactive)"
```

---

## Task 9: Add Interactive Mode for Create Command

**Files:**
- Modify: `proj.ts`

**Step 1: Write the failing test**

This is harder to test automatically. We'll add the implementation and test manually.

**Step 2: Write implementation**

Add readline-based prompting to `proj.ts`:

```typescript
import * as readline from "readline";

/**
 * Prompt user for input
 */
async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const displayQuestion = defaultValue
    ? `${question} [${defaultValue}]: `
    : `${question}: `;

  return new Promise((resolve) => {
    rl.question(displayQuestion, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

/**
 * Prompt user to select from options
 */
async function promptSelect(
  question: string,
  options: { value: string; label: string }[]
): Promise<string> {
  console.log(`\n${question}\n`);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.label}`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("\nEnter number: ", (answer) => {
      rl.close();
      const index = parseInt(answer.trim(), 10) - 1;
      if (index >= 0 && index < options.length) {
        resolve(options[index].value);
      } else {
        // Default to first option
        resolve(options[0].value);
      }
    });
  });
}

/**
 * Interactive project creation
 */
async function createProjectInteractive(): Promise<void> {
  const templates = listTemplates();

  if (templates.length === 0) {
    console.error("No templates found.");
    console.error(`\nCreate templates in: ${getTemplatesDir()}`);
    process.exit(1);
  }

  // Select template
  const templateId = await promptSelect(
    "Select a template:",
    templates.map((t) => ({ value: t.id, label: `${t.id} - ${t.name}` }))
  );

  const template = loadTemplate(templateId);

  // Get project name
  const projectName = await prompt("Project name");
  if (!projectName) {
    console.error("Error: Project name is required");
    process.exit(1);
  }

  // Get path
  const defaultPath = resolve(process.cwd(), projectName);
  const projectPath = await prompt("Project path", defaultPath);

  // Get docs path
  let defaultDocs = "";
  if (template.docsLocation) {
    defaultDocs = substituteVariables(template.docsLocation, {
      name: projectName,
      location: projectPath,
      docs: "",
      date: new Date().toISOString().split("T")[0],
    });
    if (defaultDocs.startsWith("./") || defaultDocs.startsWith("../")) {
      defaultDocs = resolve(projectPath, defaultDocs);
    } else if (defaultDocs.startsWith("~")) {
      defaultDocs = defaultDocs.replace("~", homedir());
    }
  }
  const docsPath = await prompt("Docs directory", defaultDocs);

  // Git init?
  const defaultGit = template.gitInit ?? true;
  const gitAnswer = await prompt("Initialize git repository? (y/n)", defaultGit ? "y" : "n");
  const shouldGitInit = gitAnswer.toLowerCase() === "y";

  // Call the main create function
  createProjectCommand(templateId, projectName, {
    path: projectPath,
    docs: docsPath || undefined,
    git: shouldGitInit,
  });
}
```

Update the `create` case in main:

```typescript
    case "create":
      if (!args[1]) {
        // Interactive mode
        await createProjectInteractive();
      } else {
        createProjectCommand(args[1], args[2], {
          path: pathArg,
          docs: docsPath,
          git: gitFlag,
          json: jsonFlag,
        });
      }
      break;
```

**Step 3: Test manually**

Run: `bun run proj.ts create`
Verify: Prompts appear and project is created

**Step 4: Commit**

```bash
git add proj.ts
git commit -m "feat: add interactive mode for proj create"
```

---

## Task 10: Update Help Documentation

**Files:**
- Modify: `proj.ts` (showHelp function)

**Step 1: Update showHelp**

Add to the COMMANDS section in `showHelp()`:

```typescript
  create [template] [name]       Create a new project from a template
  templates                      List available templates
```

Add to EXAMPLES section:

```typescript
  # List available templates
  proj templates

  # Create a project interactively
  proj create

  # Create a project from template
  proj create typescript-cli my-app

  # Create with custom path and docs
  proj create typescript-cli my-app --path ~/projects/my-app --docs ~/Obsidian/my-app

  # Create without git initialization
  proj create typescript-cli my-app --no-git
```

Add new section:

```typescript
TEMPLATES:
  Templates are stored in: ~/.config/proj/templates/
  Each template is a directory containing:
    template.json    Configuration file with name, description, nextSteps, etc.
    files/           Directory of files to copy (supports {{name}}, {{date}} variables)

  Example template.json:
    {
      "name": "TypeScript CLI",
      "description": "Bun-based CLI application",
      "docsLocation": "~/Obsidian/Projects/{{name}}",
      "gitInit": true,
      "nextSteps": ["Install dependencies", "Add commands"]
    }
```

**Step 2: Test**

Run: `bun run proj.ts --help`
Verify: New commands and examples appear

**Step 3: Commit**

```bash
git add proj.ts
git commit -m "docs: update help with create and templates commands"
```

---

## Task 11: Run Full Test Suite

**Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass

**Step 2: Manual testing**

```bash
# Create a test template
mkdir -p ~/.config/proj/templates/test-template/files
echo '{"name": "Test", "description": "A test template", "nextSteps": ["Step 1"]}' > ~/.config/proj/templates/test-template/template.json
echo '# {{name}}' > ~/.config/proj/templates/test-template/files/README.md

# List templates
bun run proj.ts templates

# Create project non-interactively
bun run proj.ts create test-template my-test-app --path /tmp/my-test-app --no-git

# Verify
ls /tmp/my-test-app
cat /tmp/my-test-app/README.md
bun run proj.ts list --json | grep my-test-app

# Cleanup
bun run proj.ts remove my-test-app
rm -rf /tmp/my-test-app
```

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete project creation with templates

- Add Template type and related interfaces
- Add template directory helpers
- Add listTemplates and loadTemplate functions
- Add variable substitution and file copying
- Add 'proj templates' command
- Add 'proj create' command (interactive and non-interactive)
- Update help documentation
- Add comprehensive tests"
```

---

## Bonus Task: Add `proj template init` Command

**Files:**
- Modify: `proj.ts`

**Step 1: Write the implementation**

```typescript
/**
 * Initialize a new template
 */
function templateInitCommand(templateName: string): void {
  if (!templateName || templateName.trim() === "") {
    console.error("Error: Template name is required");
    console.error("Usage: proj template init <name>");
    process.exit(1);
  }

  const templateDir = getTemplateDir(templateName);

  if (existsSync(templateDir)) {
    console.error(`Error: Template '${templateName}' already exists`);
    process.exit(1);
  }

  // Create template structure
  mkdirSync(join(templateDir, "files"), { recursive: true });

  const defaultConfig: Template = {
    name: templateName.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    description: "A project template",
    docsLocation: "./docs",
    gitInit: true,
    nextSteps: ["Install dependencies", "Start building"],
  };

  writeFileSync(
    join(templateDir, "template.json"),
    JSON.stringify(defaultConfig, null, 2)
  );

  // Create a starter README
  writeFileSync(
    join(templateDir, "files", "README.md"),
    "# {{name}}\n\nCreated on {{date}}\n"
  );

  console.log(`✓ Created template '${templateName}' at ${templateDir}`);
  console.log("\nNext steps:");
  console.log(`  1. Edit ${join(templateDir, "template.json")}`);
  console.log(`  2. Add files to ${join(templateDir, "files")}`);
}
```

Add case in main:

```typescript
    case "template":
      if (args[1] === "init") {
        templateInitCommand(args[2]);
      } else {
        console.error("Error: Unknown template subcommand");
        console.error("Usage: proj template init <name>");
        process.exit(1);
      }
      break;
```

**Step 2: Test**

```bash
bun run proj.ts template init my-new-template
ls ~/.config/proj/templates/my-new-template
```

**Step 3: Commit**

```bash
git add proj.ts
git commit -m "feat: add proj template init command"
```
