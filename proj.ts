#!/usr/bin/env bun

/**
 * proj - Project Directory Management CLI
 *
 * A clean, deterministic CLI for managing and navigating project directories.
 * Stores project metadata and provides fast access to project paths.
 *
 * @author Rick Rezinas
 * @version 1.1.0
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
  mkdirSync,
} from "fs";
import { homedir } from "os";
import { join, resolve, basename } from "path";

// ============================================================================
// Type Definitions
// ============================================================================

export type ProjectState = "active" | "paused" | "completed" | "archived";

export interface Project {
  name: string;
  path: string;
  added: string;
  lastModified: string;
  size?: number;
  docs?: string;
  state?: ProjectState;
  completedAt?: string;
  category?: string;
  description?: string;
  visibility?: string;
  repoUrl?: string;
  nextSteps?: string;
}

export interface ProjectConfig {
  version: string;
  projects: Project[];
}

export interface Template {
  name: string;
  description: string;
  docsLocation?: string;
  gitInit?: boolean;
  nextSteps?: string[];
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get config directory path (evaluated dynamically for testing)
 */
function getConfigDir(): string {
  return process.env.PROJ_CONFIG_DIR || join(homedir(), ".config", "proj");
}

/**
 * Get config file path (evaluated dynamically for testing)
 */
function getConfigFile(): string {
  return join(getConfigDir(), "projects.json");
}

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

/**
 * Ensure config directory exists
 */
export function ensureConfigDir(): void {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
}

/**
 * Load project configuration
 */
export function loadConfig(): ProjectConfig {
  ensureConfigDir();
  const configFile = getConfigFile();

  if (!existsSync(configFile)) {
    const defaultConfig: ProjectConfig = {
      version: "1.0.0",
      projects: [],
    };
    writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }

  try {
    const content = readFileSync(configFile, "utf-8");
    const config = JSON.parse(content) as ProjectConfig;

    // Migrate projects without state to "active" (transparent migration)
    config.projects = config.projects.map((project) => ({
      ...project,
      state: project.state || "active",
    }));

    return config;
  } catch (error) {
    console.error(`Error: Failed to parse config file at ${configFile}`);
    console.error(
      "The file may be corrupted. Please fix it manually or delete it to reset.",
    );
    process.exit(1);
  }
}

/**
 * Save project configuration
 */
export function saveConfig(config: ProjectConfig): void {
  ensureConfigDir();
  const configFile = getConfigFile();
  try {
    writeFileSync(configFile, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(`Error: Failed to write config file at ${configFile}`);
    process.exit(1);
  }
}

/**
 * Set project state and manage completion date
 */
function setProjectState(
  name: string,
  newState: ProjectState,
  clearCompletedDate: boolean = true,
): void {
  if (!name || name.trim() === "") {
    console.error("Error: Project name is required");
    process.exit(1);
  }

  const config = loadConfig();
  const project = config.projects.find((p) => p.name === name);

  if (!project) {
    console.error(`Error: Project '${name}' not found`);
    console.error(`Run 'proj list' to see available projects`);
    process.exit(1);
  }

  project.state = newState;

  if (newState === "completed") {
    project.completedAt = new Date().toISOString();
  } else if (clearCompletedDate) {
    delete project.completedAt;
  }

  saveConfig(config);

  const messages = {
    active: "Reactivated",
    paused: "Paused",
    completed: "Completed",
    archived: "Archived",
  };

  console.log(`✓ ${messages[newState]} project '${name}'`);
}

/**
 * Get directory metadata
 */
export function getDirectoryMetadata(dirPath: string): {
  lastModified: string;
  size: number;
} {
  try {
    const stats = statSync(dirPath);
    return {
      lastModified: stats.mtime.toISOString(),
      size: stats.size,
    };
  } catch (error) {
    return {
      lastModified: new Date().toISOString(),
      size: 0,
    };
  }
}

/**
 * Check if directory looks like a project (has .git, package.json, etc.)
 */
export function looksLikeProject(dirPath: string): boolean {
  const indicators = [
    ".git",
    ".gitignore",
    "package.json",
    "Cargo.toml",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "CMakeLists.txt",
    "Makefile",
    "pyproject.toml",
    "setup.py",
    "composer.json",
  ];

  try {
    const files = readdirSync(dirPath);
    return indicators.some((indicator) => files.includes(indicator));
  } catch {
    return false;
  }
}

// ============================================================================
// CLI Commands
// ============================================================================

/**
 * List all projects with metadata
 */
function listProjects(
  options: {
    json?: boolean;
    verbose?: boolean;
    all?: boolean;
    completed?: boolean;
    paused?: boolean;
    archived?: boolean;
  } = {},
): void {
  const config = loadConfig();

  if (config.projects.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ projects: [] }, null, 2));
    } else {
      console.error(
        "No projects found. Add projects with: proj add <name> <path>",
      );
      console.error("Or scan a directory with: proj scan <directory>");
    }
    return;
  }

  // Update metadata for all projects
  const updatedProjects = config.projects.map((project) => {
    if (existsSync(project.path)) {
      const metadata = getDirectoryMetadata(project.path);
      return { ...project, ...metadata };
    }
    return project;
  });

  // Filter projects based on state
  let filteredProjects = updatedProjects;

  if (!options.all) {
    if (options.completed) {
      filteredProjects = filteredProjects.filter(
        (p) => (p.state || "active") === "completed",
      );
    } else if (options.paused) {
      filteredProjects = filteredProjects.filter(
        (p) => (p.state || "active") === "paused",
      );
    } else if (options.archived) {
      filteredProjects = filteredProjects.filter(
        (p) => (p.state || "active") === "archived",
      );
    } else {
      // Default: show only active projects
      filteredProjects = filteredProjects.filter(
        (p) => (p.state || "active") === "active",
      );
    }
  }
  // If --all is specified, show everything (no filter)

  if (filteredProjects.length === 0) {
    const stateLabel = options.completed
      ? "completed"
      : options.paused
        ? "paused"
        : options.archived
          ? "archived"
          : "active";
    console.log(`No ${stateLabel} projects found.`);
    if (!options.all) {
      console.log(`Use 'proj list --all' to see all projects.`);
    }
    return;
  }

  const stateIndicators = {
    active: "▶",
    paused: "⏸",
    completed: "✓",
    archived: "📦",
  };

  if (options.json) {
    console.log(JSON.stringify({ projects: filteredProjects }, null, 2));
  } else {
    console.log("\nProjects:\n");
    filteredProjects.forEach((project) => {
      const exists = existsSync(project.path);
      const state = (project.state || "active") as ProjectState;
      const statusIcon = exists
        ? stateIndicators[state]
        : `✗${stateIndicators[state]}`;
      const lastMod = new Date(project.lastModified).toLocaleDateString();

      console.log(`${statusIcon} ${project.name}`);
      console.log(`  Path: ${project.path}`);
      console.log(`  Last Modified: ${lastMod}`);

      // Show state label if not active, or if --all flag
      if (options.all || state !== "active") {
        const stateLabels = {
          active: "Active",
          paused: "Paused",
          completed: "Completed",
          archived: "Archived",
        };
        console.log(`  State: ${stateLabels[state]}`);
      }

      // Show completion date if completed
      if (state === "completed" && project.completedAt) {
        const completedDate = new Date(
          project.completedAt,
        ).toLocaleDateString();
        console.log(`  Completed: ${completedDate}`);
      }

      if (project.category) {
        console.log(`  Category: ${project.category}`);
      }

      if (project.visibility) {
        console.log(`  Visibility: ${project.visibility}`);
      }

      if (project.description) {
        console.log(`  Description: ${project.description}`);
      }

      if (project.repoUrl) {
        console.log(`  Repo: ${project.repoUrl}`);
      }

      if (project.nextSteps) {
        console.log(`  Next Steps: ${project.nextSteps}`);
      }

      if (project.docs) {
        console.log(`  Docs: ${project.docs}`);
      }

      if (options.verbose) {
        console.log(`  Added: ${new Date(project.added).toLocaleDateString()}`);
        if (project.size) {
          console.log(`  Size: ${project.size} bytes`);
        }
      }
      console.log("");
    });
  }

  // Save updated config
  saveConfig({ ...config, projects: updatedProjects });
}

/**
 * Get path to a project (for cd usage)
 */
function getProjectPath(name: string): void {
  const config = loadConfig();
  const project = config.projects.find((p) => p.name === name);

  if (!project) {
    console.error(`Error: Project '${name}' not found`);
    console.error(`Run 'proj list' to see available projects`);
    process.exit(1);
  }

  if (!existsSync(project.path)) {
    console.error(`Error: Project directory does not exist: ${project.path}`);
    console.error(`Remove it with: proj remove ${name}`);
    process.exit(1);
  }

  // Output path to stdout (for cd usage)
  console.log(project.path);
}

/**
 * Add a project to the list
 */
function addProject(name: string, pathArg: string, docsPath?: string): void {
  if (!name || name.trim() === "") {
    console.error("Error: Project name is required");
    console.error("Usage: proj add <name> <path> [--docs <docs-path>]");
    process.exit(1);
  }

  if (!pathArg || pathArg.trim() === "") {
    console.error("Error: Project path is required");
    console.error("Usage: proj add <name> <path> [--docs <docs-path>]");
    process.exit(1);
  }

  const projectPath = resolve(pathArg);

  if (!existsSync(projectPath)) {
    console.error(`Error: Directory does not exist: ${projectPath}`);
    process.exit(1);
  }

  // Validate docs path if provided
  let resolvedDocsPath: string | undefined;
  if (docsPath) {
    resolvedDocsPath = resolve(docsPath);
    if (!existsSync(resolvedDocsPath)) {
      console.error(`Error: Documentation directory does not exist: ${resolvedDocsPath}`);
      process.exit(1);
    }
  }

  const config = loadConfig();

  // Check if project with this name already exists
  const existing = config.projects.find((p) => p.name === name);
  if (existing) {
    console.error(
      `Error: Project '${name}' already exists at: ${existing.path}`,
    );
    console.error(`Remove it first with: proj remove ${name}`);
    process.exit(1);
  }

  // Get metadata
  const metadata = getDirectoryMetadata(projectPath);
  const now = new Date().toISOString();

  const newProject: Project = {
    name,
    path: projectPath,
    added: now,
    lastModified: metadata.lastModified,
    size: metadata.size,
    ...(resolvedDocsPath && { docs: resolvedDocsPath }),
  };

  config.projects.push(newProject);
  saveConfig(config);

  console.log(`✓ Added project '${name}' at ${projectPath}`);
  if (resolvedDocsPath) {
    console.log(`  Docs: ${resolvedDocsPath}`);
  }
}

/**
 * Remove a project from the list
 */
function removeProject(name: string): void {
  if (!name || name.trim() === "") {
    console.error("Error: Project name is required");
    console.error("Usage: proj remove <name>");
    process.exit(1);
  }

  const config = loadConfig();
  const index = config.projects.findIndex((p) => p.name === name);

  if (index === -1) {
    console.error(`Error: Project '${name}' not found`);
    console.error(`Run 'proj list' to see available projects`);
    process.exit(1);
  }

  const removed = config.projects.splice(index, 1)[0];
  saveConfig(config);

  console.log(`✓ Removed project '${name}' (${removed.path})`);
}

/**
 * Get docs path for a project (for cd usage)
 */
function getDocsPath(name: string): void {
  const config = loadConfig();
  const project = config.projects.find((p) => p.name === name);

  if (!project) {
    console.error(`Error: Project '${name}' not found`);
    console.error(`Run 'proj list' to see available projects`);
    process.exit(1);
  }

  if (!project.docs) {
    console.error(`Error: Project '${name}' has no docs directory configured`);
    console.error(`Set one with: proj set-docs ${name} <docs-path>`);
    process.exit(1);
  }

  if (!existsSync(project.docs)) {
    console.error(`Error: Documentation directory does not exist: ${project.docs}`);
    console.error(`Update it with: proj set-docs ${name} <docs-path>`);
    process.exit(1);
  }

  // Output docs path to stdout (for cd usage)
  console.log(project.docs);
}

/**
 * Set or update docs directory for a project
 */
function setDocs(name: string, docsPath: string): void {
  if (!name || name.trim() === "") {
    console.error("Error: Project name is required");
    console.error("Usage: proj set-docs <name> <docs-path>");
    process.exit(1);
  }

  if (!docsPath || docsPath.trim() === "") {
    console.error("Error: Documentation path is required");
    console.error("Usage: proj set-docs <name> <docs-path>");
    process.exit(1);
  }

  const resolvedDocsPath = resolve(docsPath);

  if (!existsSync(resolvedDocsPath)) {
    console.error(`Error: Documentation directory does not exist: ${resolvedDocsPath}`);
    process.exit(1);
  }

  const config = loadConfig();
  const project = config.projects.find((p) => p.name === name);

  if (!project) {
    console.error(`Error: Project '${name}' not found`);
    console.error(`Run 'proj list' to see available projects`);
    process.exit(1);
  }

  const hadDocs = !!project.docs;
  project.docs = resolvedDocsPath;
  saveConfig(config);

  if (hadDocs) {
    console.log(`✓ Updated docs for '${name}' to ${resolvedDocsPath}`);
  } else {
    console.log(`✓ Set docs for '${name}' to ${resolvedDocsPath}`);
  }
}

/**
 * Set category for a project
 */
function setCategory(name: string, category: string): void {
  if (!name || name.trim() === "") {
    console.error("Error: Project name is required");
    console.error("Usage: proj set-category <name> <category>");
    process.exit(1);
  }

  if (!category || category.trim() === "") {
    console.error("Error: Category is required");
    console.error("Usage: proj set-category <name> <category>");
    process.exit(1);
  }

  const config = loadConfig();
  const project = config.projects.find((p) => p.name === name);

  if (!project) {
    console.error(`Error: Project '${name}' not found`);
    console.error(`Run 'proj list' to see available projects`);
    process.exit(1);
  }

  project.category = category;
  saveConfig(config);

  console.log(`✓ Set category for '${name}' to '${category}'`);
}

/**
 * Set description for a project
 */
function setDescription(name: string, description: string): void {
  if (!name || name.trim() === "") {
    console.error("Error: Project name is required");
    console.error("Usage: proj set-description <name> <description>");
    process.exit(1);
  }

  if (!description || description.trim() === "") {
    console.error("Error: Description is required");
    console.error("Usage: proj set-description <name> <description>");
    process.exit(1);
  }

  const config = loadConfig();
  const project = config.projects.find((p) => p.name === name);

  if (!project) {
    console.error(`Error: Project '${name}' not found`);
    console.error(`Run 'proj list' to see available projects`);
    process.exit(1);
  }

  project.description = description;
  saveConfig(config);

  console.log(`✓ Set description for '${name}'`);
}

/**
 * Set visibility for a project
 */
function setVisibility(name: string, visibility: string): void {
  if (!name || name.trim() === "") {
    console.error("Error: Project name is required");
    console.error("Usage: proj set-visibility <name> <visibility>");
    process.exit(1);
  }

  if (!visibility || visibility.trim() === "") {
    console.error("Error: Visibility is required");
    console.error("Usage: proj set-visibility <name> <visibility>");
    console.error("Common values: private, internal, public");
    process.exit(1);
  }

  const config = loadConfig();
  const project = config.projects.find((p) => p.name === name);

  if (!project) {
    console.error(`Error: Project '${name}' not found`);
    console.error(`Run 'proj list' to see available projects`);
    process.exit(1);
  }

  project.visibility = visibility;
  saveConfig(config);

  console.log(`✓ Set visibility for '${name}' to '${visibility}'`);
}

/**
 * Set repository URL for a project
 */
function setRepoUrl(name: string, repoUrl: string): void {
  if (!name || name.trim() === "") {
    console.error("Error: Project name is required");
    console.error("Usage: proj set-repo <name> <url>");
    process.exit(1);
  }

  if (!repoUrl || repoUrl.trim() === "") {
    console.error("Error: Repository URL is required");
    console.error("Usage: proj set-repo <name> <url>");
    process.exit(1);
  }

  const config = loadConfig();
  const project = config.projects.find((p) => p.name === name);

  if (!project) {
    console.error(`Error: Project '${name}' not found`);
    console.error(`Run 'proj list' to see available projects`);
    process.exit(1);
  }

  project.repoUrl = repoUrl;
  saveConfig(config);

  console.log(`✓ Set repository URL for '${name}'`);
}

/**
 * Set next steps for a project
 */
function setNextSteps(name: string, nextSteps: string): void {
  if (!name || name.trim() === "") {
    console.error("Error: Project name is required");
    console.error("Usage: proj set-next-steps <name> <steps>");
    process.exit(1);
  }

  if (!nextSteps || nextSteps.trim() === "") {
    console.error("Error: Next steps is required");
    console.error("Usage: proj set-next-steps <name> <steps>");
    process.exit(1);
  }

  const config = loadConfig();
  const project = config.projects.find((p) => p.name === name);

  if (!project) {
    console.error(`Error: Project '${name}' not found`);
    console.error(`Run 'proj list' to see available projects`);
    process.exit(1);
  }

  project.nextSteps = nextSteps;
  saveConfig(config);

  console.log(`✓ Set next steps for '${name}'`);
}

/**
 * Export projects in daemon format
 */
function exportDaemon(options: { state?: "active" | "all"; visibility?: string } = {}): void {
  const config = loadConfig();

  // Filter projects based on state
  let projects = config.projects;
  if (options.state !== "all") {
    projects = projects.filter((p) => (p.state || "active") === "active");
  }

  // Filter by visibility if specified
  if (options.visibility) {
    projects = projects.filter((p) => p.visibility === options.visibility);
  }

  // Group by category
  const categories = new Map<string, Project[]>();

  for (const project of projects) {
    const category = project.category || "Uncategorized";
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(project);
  }

  // Output in daemon format
  console.log("[PROJECTS]");
  console.log("");

  // Sort categories alphabetically
  const sortedCategories = Array.from(categories.keys()).sort();

  for (const category of sortedCategories) {
    const categoryProjects = categories.get(category)!;
    console.log(`${category}:`);
    for (const project of categoryProjects) {
      let output = "- ";

      if (project.repoUrl) {
        // Format: [name](url) - description
        output += `[${project.name}](${project.repoUrl})`;
        if (project.description) {
          output += ` - ${project.description}`;
        }
      } else {
        // No repo URL: use description or name
        output += project.description || project.name;
      }

      console.log(output);
    }
    console.log("");
  }
}

/**
 * Scan a directory for projects
 */
function scanDirectory(dirPath: string): void {
  if (!dirPath || dirPath.trim() === "") {
    console.error("Error: Directory path is required");
    console.error("Usage: proj scan <directory>");
    process.exit(1);
  }

  const scanPath = resolve(dirPath);

  if (!existsSync(scanPath)) {
    console.error(`Error: Directory does not exist: ${scanPath}`);
    process.exit(1);
  }

  const config = loadConfig();
  let foundCount = 0;
  let addedCount = 0;

  try {
    const entries = readdirSync(scanPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = join(scanPath, entry.name);

        if (looksLikeProject(fullPath)) {
          foundCount++;

          // Check if already exists
          const existing = config.projects.find((p) => p.path === fullPath);
          if (!existing) {
            const metadata = getDirectoryMetadata(fullPath);
            const now = new Date().toISOString();

            const newProject: Project = {
              name: entry.name,
              path: fullPath,
              added: now,
              lastModified: metadata.lastModified,
              size: metadata.size,
            };

            config.projects.push(newProject);
            addedCount++;
            console.log(`✓ Added: ${entry.name} (${fullPath})`);
          } else {
            console.log(`  Skipped: ${entry.name} (already exists)`);
          }
        }
      }
    }

    if (foundCount === 0) {
      console.log(`No projects found in ${scanPath}`);
      console.log(
        "Projects are identified by presence of .git, package.json, Cargo.toml, etc.",
      );
    } else {
      saveConfig(config);
      console.log(
        `\nScan complete: Found ${foundCount} projects, added ${addedCount} new projects`,
      );
    }
  } catch (error) {
    console.error(`Error: Failed to scan directory: ${scanPath}`);
    process.exit(1);
  }
}

// ============================================================================
// Help Documentation
// ============================================================================

function showHelp(): void {
  console.log(`
proj - Project Directory Management CLI
========================================

A clean, deterministic CLI for managing and navigating project directories.

USAGE:
  proj <command> [arguments] [options]

COMMANDS:
  list                           List projects (default: active only)
  path <name>                    Output project path (use with: cd $(proj path <name>))
  docs <name>                    Output docs path (use with: cd $(proj docs <name>))
  add <name> <path>              Add a project to the list
  set-docs <name> <docs-path>    Set or update docs directory for a project
  set-category <name> <cat>      Set category for a project
  set-description <name> <desc>  Set description for a project
  set-visibility <name> <vis>    Set visibility for a project (e.g., private, internal, public)
  set-repo <name> <url>          Set repository URL for a project
  set-next-steps <name> <steps>  Set next steps for a project
  remove <name>                  Remove a project from the list
  scan <directory>               Auto-discover and add projects in a directory
  export-daemon                  Export projects in daemon format

  complete <name>                Mark project as completed
  pause <name>                   Mark project as paused
  archive <name>                 Mark project as archived
  reactivate <name>              Mark project as active again

  help, --help, -h               Show this help message
  version, --version, -v         Show version information

OPTIONS:
  --json                         Output as JSON (for list command)
  --verbose, -v                  Show verbose output (for list command)
  --docs <path>                  Specify docs directory (for add command)
  --visibility <value>           Filter by visibility (for export-daemon command)

  --all                          Show all projects regardless of state
  --completed                    Show only completed projects
  --paused                       Show only paused projects
  --archived                     Show only archived projects

PROJECT STATES:
  Active      ▶  Currently working on (default for new projects)
  Paused      ⏸  Temporarily on hold
  Completed   ✓  Finished and done
  Archived    📦 Long-term storage, not actively used

EXAMPLES:
  # Add a project
  proj add my-app ~/projects/my-app

  # Add a project with docs directory
  proj add my-app ~/projects/my-app --docs ~/projects/my-app/docs

  # Set docs for an existing project
  proj set-docs my-app ~/projects/my-app/docs

  # Set category, description, and visibility
  proj set-category my-app Technical
  proj set-description my-app "A web application for task management"
  proj set-visibility my-app public

  # Export projects in daemon format
  proj export-daemon > ~/Projects/Daemon/public/sections/projects.md

  # Export only public projects
  proj export-daemon --visibility public > ~/Projects/Daemon/public/sections/projects.md

  # List active projects (default)
  proj list

  # List all projects
  proj list --all

  # List only completed projects
  proj list --completed

  # List projects as JSON (pipe to jq)
  proj list --json | jq '.projects[] | select(.name == "my-app")'

  # Mark a project as completed
  proj complete my-app

  # Pause a project temporarily
  proj pause side-project

  # Archive old projects
  proj archive legacy-code

  # Reactivate a project
  proj reactivate my-app

  # Change directory to a project (works for all states)
  cd $(proj path my-app)

  # Change directory to project docs
  cd $(proj docs my-app)

  # Scan a directory for projects
  proj scan ~/projects

  # Remove a project
  proj remove my-app

OUTPUT:
  - 'list' command outputs human-readable format by default, JSON with --json
  - 'path' command outputs the directory path to stdout
  - 'docs' command outputs the documentation directory path to stdout
  - Other commands output confirmation messages
  - All errors go to stderr
  - Exit code 0 on success, 1 on error

CONFIGURATION:
  Projects are stored in: ~/.config/proj/projects.json
  This file is auto-generated and can be edited manually if needed.

SHELL INTEGRATION:
  For easier navigation, add these functions to your shell rc file (.bashrc, .zshrc):

  # Bash/Zsh - Navigate to project
  pd() {
    local path=$(proj path "$1" 2>/dev/null)
    if [ -n "$path" ]; then
      cd "$path"
    else
      echo "Error: Project not found" >&2
      return 1
    fi
  }

  # Bash/Zsh - Navigate to project docs
  pdd() {
    local path=$(proj docs "$1" 2>/dev/null)
    if [ -n "$path" ]; then
      cd "$path"
    else
      echo "Error: Project or docs not found" >&2
      return 1
    fi
  }

  Then use: pd my-app  or  pdd my-app

PHILOSOPHY:
  proj follows CLI-First Architecture:
  - Deterministic: Same input → Same output
  - Clean: Single responsibility (project management only)
  - Composable: JSON output pipes to jq, grep, etc.
  - Documented: Full help and examples
  - Testable: Predictable behavior

For more information, see ~/bin/proj/README.md

Version: 1.1.0
Author: Rick Rezinas
`);
}

function showVersion(): void {
  console.log("proj version 1.1.0");
}

// ============================================================================
// Main CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Handle help/version
  if (
    args.length === 0 ||
    args[0] === "help" ||
    args[0] === "--help" ||
    args[0] === "-h"
  ) {
    showHelp();
    return;
  }

  if (args[0] === "version" || args[0] === "--version" || args[0] === "-v") {
    showVersion();
    return;
  }

  const command = args[0];

  // Parse common options
  const jsonFlag = args.includes("--json");
  const verboseFlag = args.includes("--verbose") || args.includes("-v");

  // Parse --docs flag for add command
  const docsIndex = args.indexOf("--docs");
  const docsPath = docsIndex !== -1 && args[docsIndex + 1] ? args[docsIndex + 1] : undefined;

  // Parse --visibility flag for export-daemon command
  const visibilityIndex = args.indexOf("--visibility");
  const visibilityFilter = visibilityIndex !== -1 && args[visibilityIndex + 1] ? args[visibilityIndex + 1] : undefined;

  // Parse state filter flags
  const allFlag = args.includes("--all");
  const completedFlag = args.includes("--completed");
  const pausedFlag = args.includes("--paused");
  const archivedFlag = args.includes("--archived");

  // Validate mutually exclusive state flags
  const stateFlags = [completedFlag, pausedFlag, archivedFlag].filter(Boolean);
  if (stateFlags.length > 1) {
    console.error("Error: Cannot use multiple state filters simultaneously");
    console.error("Use only one of: --completed, --paused, --archived");
    console.error("Or use --all to see all projects");
    process.exit(1);
  }

  // Route to commands
  switch (command) {
    case "list":
      listProjects({
        json: jsonFlag,
        verbose: verboseFlag,
        all: allFlag,
        completed: completedFlag,
        paused: pausedFlag,
        archived: archivedFlag,
      });
      break;

    case "path":
      if (args.length < 2) {
        console.error("Error: Project name is required");
        console.error("Usage: proj path <name>");
        process.exit(1);
      }
      getProjectPath(args[1]);
      break;

    case "docs":
      if (args.length < 2) {
        console.error("Error: Project name is required");
        console.error("Usage: proj docs <name>");
        process.exit(1);
      }
      getDocsPath(args[1]);
      break;

    case "add":
      if (args.length < 3) {
        console.error("Error: Both name and path are required");
        console.error("Usage: proj add <name> <path> [--docs <docs-path>]");
        process.exit(1);
      }
      addProject(args[1], args[2], docsPath);
      break;

    case "set-docs":
      if (args.length < 3) {
        console.error("Error: Both name and docs path are required");
        console.error("Usage: proj set-docs <name> <docs-path>");
        process.exit(1);
      }
      setDocs(args[1], args[2]);
      break;

    case "set-category":
      if (args.length < 3) {
        console.error("Error: Both name and category are required");
        console.error("Usage: proj set-category <name> <category>");
        process.exit(1);
      }
      setCategory(args[1], args[2]);
      break;

    case "set-description":
      if (args.length < 3) {
        console.error("Error: Both name and description are required");
        console.error("Usage: proj set-description <name> <description>");
        process.exit(1);
      }
      // Join remaining args to allow multi-word descriptions
      setDescription(args[1], args.slice(2).join(" "));
      break;

    case "set-visibility":
      if (args.length < 3) {
        console.error("Error: Both name and visibility are required");
        console.error("Usage: proj set-visibility <name> <visibility>");
        console.error("Common values: private, internal, public");
        process.exit(1);
      }
      setVisibility(args[1], args[2]);
      break;

    case "set-repo":
      if (args.length < 3) {
        console.error("Error: Both name and repository URL are required");
        console.error("Usage: proj set-repo <name> <url>");
        process.exit(1);
      }
      setRepoUrl(args[1], args[2]);
      break;

    case "set-next-steps":
      if (args.length < 3) {
        console.error("Error: Both name and next steps are required");
        console.error("Usage: proj set-next-steps <name> <steps>");
        process.exit(1);
      }
      // Join remaining args to allow multi-word next steps
      setNextSteps(args[1], args.slice(2).join(" "));
      break;

    case "export-daemon":
      exportDaemon({
        state: allFlag ? "all" : "active",
        visibility: visibilityFilter
      });
      break;

    case "remove":
      if (args.length < 2) {
        console.error("Error: Project name is required");
        console.error("Usage: proj remove <name>");
        process.exit(1);
      }
      removeProject(args[1]);
      break;

    case "scan":
      if (args.length < 2) {
        console.error("Error: Directory path is required");
        console.error("Usage: proj scan <directory>");
        process.exit(1);
      }
      scanDirectory(args[1]);
      break;

    case "complete":
      if (args.length < 2) {
        console.error("Error: Project name is required");
        console.error("Usage: proj complete <name>");
        process.exit(1);
      }
      setProjectState(args[1], "completed", false);
      break;

    case "pause":
      if (args.length < 2) {
        console.error("Error: Project name is required");
        console.error("Usage: proj pause <name>");
        process.exit(1);
      }
      setProjectState(args[1], "paused");
      break;

    case "archive":
      if (args.length < 2) {
        console.error("Error: Project name is required");
        console.error("Usage: proj archive <name>");
        process.exit(1);
      }
      setProjectState(args[1], "archived", false);
      break;

    case "reactivate":
      if (args.length < 2) {
        console.error("Error: Project name is required");
        console.error("Usage: proj reactivate <name>");
        process.exit(1);
      }
      setProjectState(args[1], "active");
      break;

    default:
      console.error(`Error: Unknown command '${command}'`);
      console.error('Run "proj --help" for usage information');
      process.exit(1);
  }
}

// Run CLI only when executed directly (not when imported as module)
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
