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
