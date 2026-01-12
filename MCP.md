# MCP Server for proj

The `proj` CLI includes an MCP (Model Context Protocol) server that exposes project management functionality to Claude and other LLMs.

## What is MCP?

MCP is a standardized protocol that allows AI assistants to interact with external tools and data sources. Think of it as a USB-C port for AI - it provides a consistent interface for connecting Claude to your project management system.

## Features

The proj MCP server exposes:

- **Tools**: Functions that LLMs can call to interact with your projects
- **Resources**: Direct access to project data in a structured format

### Available Tools

1. **list_projects** - List all projects with optional filtering
   - Filter by state (active, paused, completed, archived)
   - Filter by category
   - Filter by visibility

2. **get_project** - Get detailed information about a specific project
   - Returns full project metadata including path, description, repo URL, next steps, etc.

3. **update_project_state** - Update project state
   - Change between active, paused, completed, archived

4. **update_project_field** - Update project fields
   - Update category, description, visibility, repoUrl, or nextSteps

5. **get_project_stats** - Get project statistics
   - Counts by state, category, and visibility

6. **search_projects** - Search projects
   - Search by name, description, or category

### Resources

Each project is exposed as a resource with URI: `proj://project/{project-name}`

Resources allow LLMs to read project data directly without calling tools.

## Setup

### 1. Configure Claude Code

Add the MCP server to your Claude Code settings. There are two ways to do this:

#### Option A: User-level Configuration (Recommended)

Edit `~/.claude/claude.json`:

```json
{
  "mcpServers": {
    "proj": {
      "command": "bun",
      "args": ["run", "/usr/lib/node_modules/proj/mcp-server.ts"]
    }
  }
}
```

#### Option B: Project-level Configuration

Create `.claude/claude.json` in your project directory:

```json
{
  "mcpServers": {
    "proj": {
      "command": "bun",
      "args": ["run", "/usr/lib/node_modules/proj/mcp-server.ts"]
    }
  }
}
```

### 2. Restart Claude Code

After adding the configuration, restart Claude Code or reload the window.

### 3. Verify Connection

You should see the proj MCP server listed in your Claude Code status bar or MCP server list.

## Usage Examples

Once configured, you can ask Claude to interact with your projects:

### List Projects

```
"Show me all active projects"
"List all projects in the infrastructure category"
"What projects are marked as public?"
```

### Get Project Details

```
"Tell me about the Daemon project"
"What's the repository URL for proj?"
"What are the next steps for my website project?"
```

### Update Projects

```
"Mark the legacy-app project as archived"
"Update the description for my blog project to 'Personal tech blog'"
"Set the repo URL for the api-server project to https://github.com/..."
```

### Project Statistics

```
"How many projects do I have?"
"Show me a breakdown of projects by state"
"What categories do I have?"
```

### Search Projects

```
"Find all projects related to web development"
"Search for projects mentioning API"
```

## Testing

You can test the MCP server manually using the MCP Inspector:

```bash
cd /usr/lib/node_modules/proj
npx @modelcontextprotocol/inspector bun run mcp-server.ts
```

This opens a web interface where you can:
- View available tools
- Test tool calls
- Browse resources
- See request/response logs

## Architecture

The MCP server:
- Runs locally using stdio transport (no network exposure)
- Reads/writes to the same `~/.config/proj/projects.json` file as the CLI
- Validates all inputs before modifying data
- Returns structured JSON responses to the LLM

## Security

- The MCP server only has access to your project metadata (not file contents)
- All project modifications go through the same validation as the CLI
- No network access required (runs locally via stdio)
- All operations are logged to stderr for auditing

## Troubleshooting

### Server Not Connecting

1. Check that Bun is installed: `bun --version`
2. Verify the path in your configuration is correct
3. Check Claude Code logs for error messages
4. Try running the server manually: `bun run /usr/lib/node_modules/proj/mcp-server.ts`

### Tools Not Appearing

1. Restart Claude Code completely
2. Check that the configuration is valid JSON
3. Look for error messages in the Claude Code output panel

### Permission Errors

Make sure the MCP server script is executable:

```bash
chmod +x /usr/lib/node_modules/proj/mcp-server.ts
```

## Development

To modify or extend the MCP server:

1. Edit `/usr/lib/node_modules/proj/mcp-server.ts`
2. Add new tools to the `ListToolsRequestSchema` handler
3. Implement the tool logic in the `CallToolRequestSchema` handler
4. Test with the MCP Inspector

## Learn More

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Code Documentation](https://github.com/anthropics/claude-code)
