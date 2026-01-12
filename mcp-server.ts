#!/usr/bin/env bun

/**
 * MCP Server for proj CLI
 * Exposes project management tools to Claude and other LLMs
 *
 * @author Rick Rezinas
 * @version 1.0.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// ============================================================================
// Type Definitions
// ============================================================================

type ProjectState = "active" | "paused" | "completed" | "archived";

interface Project {
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

interface ProjectConfig {
  version: string;
  projects: Project[];
}

// ============================================================================
// Configuration Management
// ============================================================================

const CONFIG_DIR = join(homedir(), ".config", "proj");
const CONFIG_FILE = join(CONFIG_DIR, "projects.json");

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig(): ProjectConfig {
  ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    const defaultConfig: ProjectConfig = {
      version: "1.0.0",
      projects: [],
    };
    writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }

  try {
    const content = readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(content) as ProjectConfig;

    // Migrate projects without state to "active"
    config.projects = config.projects.map((project) => ({
      ...project,
      state: project.state || "active",
    }));

    return config;
  } catch (error) {
    throw new Error(`Failed to parse config file: ${error}`);
  }
}

function saveConfig(config: ProjectConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDirectorySize(dirPath: string): number {
  try {
    const stats = statSync(dirPath);
    return stats.size;
  } catch {
    return 0;
  }
}

function updateProjectTimestamp(project: Project): Project {
  const size = getDirectorySize(project.path);
  return {
    ...project,
    lastModified: new Date().toISOString(),
    size,
  };
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: "proj-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ============================================================================
// Tool Definitions
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_projects",
        description: "List all projects with optional filtering by state, category, or visibility",
        inputSchema: {
          type: "object",
          properties: {
            state: {
              type: "string",
              enum: ["active", "paused", "completed", "archived"],
              description: "Filter by project state",
            },
            category: {
              type: "string",
              description: "Filter by category",
            },
            visibility: {
              type: "string",
              description: "Filter by visibility (e.g., public, private, internal)",
            },
          },
        },
      },
      {
        name: "get_project",
        description: "Get detailed information about a specific project",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Project name",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "update_project_state",
        description: "Update the state of a project (active, paused, completed, archived)",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Project name",
            },
            state: {
              type: "string",
              enum: ["active", "paused", "completed", "archived"],
              description: "New project state",
            },
          },
          required: ["name", "state"],
        },
      },
      {
        name: "update_project_field",
        description: "Update a specific field of a project (category, description, visibility, repoUrl, nextSteps)",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Project name",
            },
            field: {
              type: "string",
              enum: ["category", "description", "visibility", "repoUrl", "nextSteps"],
              description: "Field to update",
            },
            value: {
              type: "string",
              description: "New value for the field",
            },
          },
          required: ["name", "field", "value"],
        },
      },
      {
        name: "get_project_stats",
        description: "Get statistics about all projects (counts by state, category, etc.)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "search_projects",
        description: "Search projects by name, description, or category",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

// ============================================================================
// Tool Handlers
// ============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const config = loadConfig();

    switch (name) {
      case "list_projects": {
        let projects = config.projects;

        // Apply filters
        if (args?.state) {
          projects = projects.filter((p) => p.state === args.state);
        }
        if (args?.category) {
          projects = projects.filter((p) => p.category === args.category);
        }
        if (args?.visibility) {
          projects = projects.filter((p) => p.visibility === args.visibility);
        }

        const output = projects.map((p) => {
          const parts = [`${p.name} (${p.state || "active"})`];
          if (p.category) parts.push(`Category: ${p.category}`);
          if (p.description) parts.push(`Description: ${p.description}`);
          if (p.visibility) parts.push(`Visibility: ${p.visibility}`);
          if (p.repoUrl) parts.push(`Repo: ${p.repoUrl}`);
          if (p.nextSteps) parts.push(`Next Steps: ${p.nextSteps}`);
          parts.push(`Path: ${p.path}`);
          return parts.join("\n  ");
        });

        return {
          content: [
            {
              type: "text",
              text: output.length > 0
                ? `Found ${output.length} project(s):\n\n${output.join("\n\n")}`
                : "No projects found",
            },
          ],
        };
      }

      case "get_project": {
        const projectName = args?.name as string;
        const project = config.projects.find((p) => p.name === projectName);

        if (!project) {
          return {
            content: [
              {
                type: "text",
                text: `Project "${projectName}" not found`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      }

      case "update_project_state": {
        const projectName = args?.name as string;
        const newState = args?.state as ProjectState;

        const projectIndex = config.projects.findIndex((p) => p.name === projectName);
        if (projectIndex === -1) {
          return {
            content: [
              {
                type: "text",
                text: `Project "${projectName}" not found`,
              },
            ],
            isError: true,
          };
        }

        config.projects[projectIndex] = updateProjectTimestamp({
          ...config.projects[projectIndex],
          state: newState,
          completedAt: newState === "completed" ? new Date().toISOString() : config.projects[projectIndex].completedAt,
        });

        saveConfig(config);

        return {
          content: [
            {
              type: "text",
              text: `Project "${projectName}" state updated to "${newState}"`,
            },
          ],
        };
      }

      case "update_project_field": {
        const projectName = args?.name as string;
        const field = args?.field as keyof Project;
        const value = args?.value as string;

        const projectIndex = config.projects.findIndex((p) => p.name === projectName);
        if (projectIndex === -1) {
          return {
            content: [
              {
                type: "text",
                text: `Project "${projectName}" not found`,
              },
            ],
            isError: true,
          };
        }

        config.projects[projectIndex] = updateProjectTimestamp({
          ...config.projects[projectIndex],
          [field]: value,
        });

        saveConfig(config);

        return {
          content: [
            {
              type: "text",
              text: `Project "${projectName}" ${field} updated to "${value}"`,
            },
          ],
        };
      }

      case "get_project_stats": {
        const stats = {
          total: config.projects.length,
          byState: {} as Record<string, number>,
          byCategory: {} as Record<string, number>,
          byVisibility: {} as Record<string, number>,
        };

        config.projects.forEach((p) => {
          const state = p.state || "active";
          stats.byState[state] = (stats.byState[state] || 0) + 1;

          if (p.category) {
            stats.byCategory[p.category] = (stats.byCategory[p.category] || 0) + 1;
          }

          if (p.visibility) {
            stats.byVisibility[p.visibility] = (stats.byVisibility[p.visibility] || 0) + 1;
          }
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case "search_projects": {
        const query = (args?.query as string).toLowerCase();
        const results = config.projects.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query) ||
            p.category?.toLowerCase().includes(query)
        );

        const output = results.map((p) => {
          const parts = [`${p.name} (${p.state || "active"})`];
          if (p.description) parts.push(`Description: ${p.description}`);
          if (p.category) parts.push(`Category: ${p.category}`);
          parts.push(`Path: ${p.path}`);
          return parts.join("\n  ");
        });

        return {
          content: [
            {
              type: "text",
              text: output.length > 0
                ? `Found ${output.length} matching project(s):\n\n${output.join("\n\n")}`
                : "No matching projects found",
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Resource Handlers
// ============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const config = loadConfig();

  return {
    resources: config.projects.map((p) => ({
      uri: `proj://project/${p.name}`,
      name: p.name,
      mimeType: "application/json",
      description: p.description || `Project: ${p.name}`,
    })),
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const projectName = uri.replace("proj://project/", "");

  const config = loadConfig();
  const project = config.projects.find((p) => p.name === projectName);

  if (!project) {
    throw new Error(`Project "${projectName}" not found`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(project, null, 2),
      },
    ],
  };
});

// ============================================================================
// Server Startup
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("proj MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
