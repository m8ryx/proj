import { test, expect, describe, afterEach } from "bun:test";
import { looksLikeProject } from "../../proj";
import { createMockProject, cleanupPaths } from "../helpers/test-utils";

describe("Project Detection", () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    cleanupPaths(...createdDirs);
    createdDirs.length = 0;
  });

  describe("looksLikeProject", () => {
    test("detects Git repository (.git)", () => {
      const projectDir = createMockProject("git-project", [".git"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("detects Git repository (.gitignore)", () => {
      const projectDir = createMockProject("gitignore-project", [".gitignore"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("detects Node.js project (package.json)", () => {
      const projectDir = createMockProject("node-project", ["package.json"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("detects Rust project (Cargo.toml)", () => {
      const projectDir = createMockProject("rust-project", ["Cargo.toml"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("detects Go project (go.mod)", () => {
      const projectDir = createMockProject("go-project", ["go.mod"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("detects Java/Maven project (pom.xml)", () => {
      const projectDir = createMockProject("maven-project", ["pom.xml"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("detects Java/Gradle project (build.gradle)", () => {
      const projectDir = createMockProject("gradle-project", ["build.gradle"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("detects C/C++ project (CMakeLists.txt)", () => {
      const projectDir = createMockProject("cmake-project", ["CMakeLists.txt"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("detects Make project (Makefile)", () => {
      const projectDir = createMockProject("make-project", ["Makefile"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("detects Python project (pyproject.toml)", () => {
      const projectDir = createMockProject("python-project", ["pyproject.toml"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("detects Python project (setup.py)", () => {
      const projectDir = createMockProject("python-setup", ["setup.py"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("detects PHP project (composer.json)", () => {
      const projectDir = createMockProject("php-project", ["composer.json"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("returns false for empty directory", () => {
      const emptyDir = createMockProject("empty-dir", []);
      createdDirs.push(emptyDir);

      expect(looksLikeProject(emptyDir)).toBe(false);
    });

    test("returns false for directory with unrelated files", () => {
      const projectDir = createMockProject("random-files", ["README.txt", "data.csv"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(false);
    });

    test("returns true with multiple indicators", () => {
      const projectDir = createMockProject("multi-indicator", [".git", "package.json", "Makefile"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("returns false for non-existent directory", () => {
      const nonExistentDir = "/tmp/non-existent-project-" + Date.now();

      expect(looksLikeProject(nonExistentDir)).toBe(false);
    });

    test("detects project with just .git directory", () => {
      const projectDir = createMockProject("just-git", [".git"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(true);
    });

    test("case-sensitive detection", () => {
      // Should NOT detect PACKAGE.JSON (uppercase)
      const projectDir = createMockProject("case-test", ["PACKAGE.JSON"]);
      createdDirs.push(projectDir);

      expect(looksLikeProject(projectDir)).toBe(false);
    });
  });

  describe("Project type identification", () => {
    test("identifies typical Node.js/TypeScript project", () => {
      const nodeProject = createMockProject("typical-node", [
        ".git",
        "package.json",
        "tsconfig.json",
      ]);
      createdDirs.push(nodeProject);

      expect(looksLikeProject(nodeProject)).toBe(true);
    });

    test("identifies typical Python project", () => {
      const pythonProject = createMockProject("typical-python", [
        ".git",
        "pyproject.toml",
        "requirements.txt",
      ]);
      createdDirs.push(pythonProject);

      expect(looksLikeProject(pythonProject)).toBe(true);
    });

    test("identifies typical Rust project", () => {
      const rustProject = createMockProject("typical-rust", [
        ".git",
        "Cargo.toml",
        "Cargo.lock",
      ]);
      createdDirs.push(rustProject);

      expect(looksLikeProject(rustProject)).toBe(true);
    });

    test("identifies typical Go project", () => {
      const goProject = createMockProject("typical-go", [
        ".git",
        "go.mod",
        "go.sum",
      ]);
      createdDirs.push(goProject);

      expect(looksLikeProject(goProject)).toBe(true);
    });
  });
});
