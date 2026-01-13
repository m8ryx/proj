# proj - Project Directory Management CLI

**Version:** 1.1.1
**Author:** Rick Rezinas
**Last Updated:** 2026-01-12

---

## Overview

`proj` is a clean, deterministic command-line interface for managing and navigating project directories. It provides fast access to your projects with metadata tracking, auto-discovery, and seamless shell integration.

### Philosophy

`proj` was built to remove friction when moving between multiple projects. It is not designed for team collaboration in a larger sense, but it can be used to give collaborators visibility into current projects.

#### What proj is not

`proj` is not 
- a todo list
- project manager
- gantt chart
- reminder system or Eisenhower Matrix

#### What proj is

`proj` is designed to give you a high level overview of current projects. It is intended to meet you where you are, provide at-a-glance information to reduce the inertia of picking something back up. Where are the docs, what are some key notes, where was I at, what am I doing next.

As I work in an ecosystem, it's easy to configure and integrate with proj. I have a Makefile to export public projects to my Daemon. `proj` contains an MCP Server so that your AI can see what you have going on also.

But the focus of `proj` is to reduce human friction.

#### Design
'proj' follows **CLI-First Architecture**:

1. **Deterministic** - Same input always produces same output
2. **Clean** - Single responsibility (project directory management)
3. **Composable** - JSON output pipes to jq, grep, other tools
4. **Documented** - Comprehensive help and examples
5. **Testable** - Predictable, verifiable behavior

---

## Installation

### Quick Setup

```bash
# Navigate to the CLI directory
cd ~/bin/proj

# Make executable
chmod +x proj.ts

# Create symlink (optional, for system-wide access)
sudo ln -s ~/bin/proj/proj.ts /usr/local/bin/proj

# Or add to PATH in your shell rc file
echo 'export PATH="$HOME/bin/proj:$PATH"' >> ~/.bashrc  # or ~/.zshrc
```

### Shell Integration (Recommended)

Add these functions to your `.bashrc` or `.zshrc` for easier navigation:

```bash
# Quick project directory change
pd() {
  local path=$(proj path "$1" 2>/dev/null)
  if [ -n "$path" ]; then
    cd "$path"
  else
    echo "Error: Project not found" >&2
    return 1
  fi
}

# Quick project docs directory change
pdd() {
  local path=$(proj docs "$1" 2>/dev/null)
  if [ -n "$path" ]; then
    cd "$path"
  else
    echo "Error: Project or docs not found" >&2
    return 1
  fi
}
```

Then use: `pd my-app` or `pdd my-app` instead of `cd $(proj path my-app)`

---

## Usage

### Commands

#### `proj list`

List all projects with metadata.

```bash
# Human-readable format
proj list

# JSON output (for scripting)
proj list --json

# Verbose mode (shows added date and size)
proj list --verbose
```

**Example output:**

```
Projects:

✓ my-app
  Path: /home/user/projects/my-app
  Last Modified: 12/2/2025

✓ website
  Path: /home/user/projects/website
  Last Modified: 12/1/2025
```

#### `proj path <name>`

Get the path to a project (for use with `cd`).

```bash
# Change directory to project
cd $(proj path my-app)

# Or use the shell function (if configured)
pd my-app

# Use in scripts
PROJECT_DIR=$(proj path my-app)
cd "$PROJECT_DIR"
```

#### `proj add <name> <path>`

Add a project to the list.

```bash
# Add current directory
proj add my-app .

# Add specific path
proj add website ~/projects/website

# Add with absolute path
proj add api-server /var/www/api
```

#### `proj remove <name>`

Remove a project from the list.

```bash
proj remove my-app
```

#### `proj scan <directory>`

Auto-discover and add projects in a directory.

```bash
# Scan ~/projects for all projects
proj scan ~/projects

# Scan current directory
proj scan .

# Scan specific directory
proj scan /var/www
```

**What gets detected as a project:**

A directory is considered a project if it contains any of:
- `.git` (Git repository)
- `package.json` (Node.js)
- `Cargo.toml` (Rust)
- `go.mod` (Go)
- `pom.xml` / `build.gradle` (Java)
- `CMakeLists.txt` / `Makefile` (C/C++)
- `pyproject.toml` / `setup.py` (Python)
- `composer.json` (PHP)

#### `proj set-category <name> <category>`

Set a category for a project (any custom value).

```bash
# Set category
proj set-category my-app Technical
proj set-category novel Creative
proj set-category fitness Personal

# Categories are flexible - use any value you want
proj set-category work-project "Client Work"
```

#### `proj set-description <name> <description>`

Set a description for a project (supports multi-word descriptions).

```bash
# Set description
proj set-description my-app "A web application for task management"
proj set-description blog "Personal blog about technology and coffee"

# Description can be used in daemon export
proj set-description cli-tool "CLI tool to help manage personal projects"
```

#### `proj set-visibility <name> <visibility>`

Set visibility for a project (any custom value).

```bash
# Common visibility values
proj set-visibility my-app public
proj set-visibility work-project internal
proj set-visibility personal-notes private

# Use any custom value
proj set-visibility prototype experimental
proj set-visibility legacy archived
```

#### `proj set-docs <name> <docs-path>`

Set or update documentation directory for a project.

```bash
# Set docs directory
proj set-docs my-app ~/projects/my-app/docs
proj set-docs website ~/projects/website/documentation
```

#### `proj docs <name>`

Get the documentation path for a project.

```bash
# Change to docs directory
cd $(proj docs my-app)

# Or use with shell function
pdd my-app
```

#### `proj export-daemon`

Export projects in daemon format (grouped by category).

```bash
# Export all active projects
proj export-daemon

# Export only public projects
proj export-daemon --visibility public

# Export all projects (including completed/paused/archived)
proj export-daemon --all

# Save to file
proj export-daemon --visibility public > ~/Projects/Daemon/public/sections/projects.md
```

**Output format:**
```
[PROJECTS]

Technical:
- A CLI tool to help manage personal projects
- Personal API website serving as digital representative

Creative:
- Unspecified narrative RPG

Personal:
- Increase personal reach
```

#### `proj complete <name>`

Mark a project as completed.

```bash
proj complete my-app
```

#### `proj pause <name>`

Mark a project as paused.

```bash
proj pause side-project
```

#### `proj archive <name>`

Mark a project as archived.

```bash
proj archive old-project
```

#### `proj reactivate <name>`

Mark a project as active again.

```bash
proj reactivate my-app
```

---

## Examples

### Basic Workflow

```bash
# Scan your projects directory
proj scan ~/projects

# List all projects
proj list

# Navigate to a project
pd my-app  # Using shell function

# Or without shell function
cd $(proj path my-app)

# View projects as JSON
proj list --json
```

### Daemon Integration Workflow

```bash
# Set up your projects with metadata
proj set-category my-app Technical
proj set-description my-app "A CLI tool to help manage personal projects"
proj set-visibility my-app public

proj set-category novel Creative
proj set-description novel "Unspecified narrative RPG"
proj set-visibility novel public

proj set-category fitness Personal
proj set-description fitness "Increase personal reach"
proj set-visibility fitness private

# Export only public projects to daemon
proj export-daemon --visibility public > ~/Projects/Daemon/public/sections/projects.md

# Build and deploy daemon
cd ~/Projects/Daemon
make deploy
```

### Advanced Usage with jq

```bash
# Find projects modified in the last 7 days
proj list --json | jq '.projects[] | select(.lastModified > (now - 604800 | todate))'

# Get all project paths
proj list --json | jq -r '.projects[].path'

# Count total projects
proj list --json | jq '.projects | length'

# Find projects by name pattern
proj list --json | jq '.projects[] | select(.name | contains("api"))'

# Export project list to CSV
proj list --json | jq -r '.projects[] | [.name, .path, .lastModified] | @csv'
```

### Integration with Other Tools

```bash
# Open project in VS Code
code $(proj path my-app)

# Clone and add in one step
git clone https://github.com/user/repo.git ~/projects/repo && proj add repo ~/projects/repo

# Batch operations on all projects
proj list --json | jq -r '.projects[].path' | while read path; do
  cd "$path" && git pull
done

# Find largest projects
proj list --json | jq '.projects | sort_by(.size) | reverse | .[0:5]'
```

### Scripting Examples

```bash
#!/bin/bash
# Update all git projects

proj list --json | jq -r '.projects[].path' | while read project_path; do
  if [ -d "$project_path/.git" ]; then
    echo "Updating $project_path..."
    cd "$project_path" && git pull
  fi
done
```

```bash
#!/bin/bash
# Backup all projects

BACKUP_DIR="/mnt/backup/projects"
mkdir -p "$BACKUP_DIR"

proj list --json | jq -r '.projects[] | "\(.name):\(.path)"' | while IFS=: read name path; do
  echo "Backing up $name..."
  rsync -av "$path" "$BACKUP_DIR/$name"
done
```

---

## Configuration

### Config File Location

Projects are stored in: `~/.config/proj/projects.json`

### Config File Format

```json
{
  "version": "1.0.0",
  "projects": [
    {
      "name": "my-app",
      "path": "/home/user/projects/my-app",
      "added": "2025-12-02T10:30:00.000Z",
      "lastModified": "2025-12-02T15:45:00.000Z",
      "size": 4096,
      "state": "active",
      "category": "Technical",
      "description": "A web application for task management",
      "visibility": "public",
      "docs": "/home/user/projects/my-app/docs"
    }
  ]
}
```

### Manual Editing

You can manually edit the config file if needed. The CLI will validate it on next run.

---

## Output Format

### Human-Readable Mode (default)

```
Projects:

✓ my-app
  Path: /home/user/projects/my-app
  Last Modified: 12/2/2025
```

- `✓` = Directory exists
- `✗` = Directory missing (was deleted)

### JSON Mode (`--json`)

```json
{
  "projects": [
    {
      "name": "my-app",
      "path": "/home/user/projects/my-app",
      "added": "2025-12-02T10:30:00.000Z",
      "lastModified": "2025-12-02T15:45:00.000Z",
      "size": 4096
    }
  ]
}
```

---

## Philosophy

### Why This CLI Exists

As developers, we work on many projects across multiple directories. Remembering where each project lives and typing out full paths is tedious. Existing tools like `autojump` and `z` use frequency-based heuristics, but sometimes we want explicit project management.

`proj` solves this by:
1. **Explicit tracking** - You decide what's a project
2. **Fast navigation** - One command to get anywhere
3. **Metadata** - Track when projects were last touched
4. **Discovery** - Auto-scan directories for projects
5. **Composability** - Pipe JSON to any tool

### Design Principles

**1. Zero Dependencies**

No external packages. Pure TypeScript with Node.js built-ins.

**2. Type-Safe**

Full TypeScript with strict mode. No `any` types.

**3. File-Based Config**

Simple JSON file you can read, edit, and version control.

**4. Shell-Friendly**

Works with bash/zsh functions for seamless integration.

**5. Deterministic Output**

Same projects → Same JSON output. Perfect for scripts.

---

## Troubleshooting

### "Project not found"

```bash
# List all projects to verify name
proj list

# Check config file
cat ~/.config/proj/projects.json
```

### Directory no longer exists

```bash
# Remove the stale entry
proj remove old-project

# Re-scan to refresh
proj scan ~/projects
```

### Permission denied

```bash
# Make sure CLI is executable
chmod +x ~/bin/proj/proj.ts

# Check if Bun is installed
bun --version
```

### Shell function not working

Make sure you've added the `pd()` function to your shell rc file and reloaded:

```bash
source ~/.bashrc  # or ~/.zshrc
```

---

## Integration

### VS Code Task

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Open Project",
      "type": "shell",
      "command": "code $(proj path ${input:projectName})"
    }
  ],
  "inputs": [
    {
      "id": "projectName",
      "type": "promptString",
      "description": "Project name"
    }
  ]
}
```

### Git Alias

```bash
# Add to ~/.gitconfig
[alias]
  proj = "!f() { cd $(proj path $1); }; f"

# Usage: git proj my-app
```

### tmux Session Manager

```bash
#!/bin/bash
# Create tmux session for project

PROJECT_NAME="$1"
PROJECT_PATH=$(proj path "$PROJECT_NAME")

if [ -z "$PROJECT_PATH" ]; then
  echo "Project not found"
  exit 1
fi

tmux new-session -s "$PROJECT_NAME" -c "$PROJECT_PATH"
```

### MCP Server (AI Integration)

`proj` includes an MCP (Model Context Protocol) server that allows Claude and other LLMs to interact with your projects.

**Setup:**

Run this command to add the MCP server:

```bash
mcp add --transport stdio proj -- bun /usr/lib/node_modules/proj/mcp-server.ts
```

This will automatically configure the server in your `~/.claude.json`:

```json
{
  "mcpServers": {
    "proj": {
      "command": "bun",
      "args": ["/usr/lib/node_modules/proj/mcp-server.ts"],
      "transport": "stdio"
    }
  }
}
```

**Available Tools:**
- `list_projects` - List and filter projects
- `get_project` - Get project details
- `update_project_state` - Change project state
- `update_project_field` - Update project metadata
- `get_project_stats` - View project statistics
- `search_projects` - Search by name/description/category

**Usage Examples:**

```
"Show me all active projects in the infrastructure category"
"What are the next steps for the Daemon project?"
"Mark the legacy-app as archived"
"How many projects do I have by state?"
```

See [MCP.md](./MCP.md) for complete documentation.

---

## Best Practices

### Organize by Purpose

```bash
proj add work-api ~/work/api-server
proj add work-frontend ~/work/web-app
proj add personal-blog ~/personal/blog
proj add personal-tools ~/personal/scripts
```

### Use Scan for Bulk Import

```bash
# Instead of adding one-by-one
proj scan ~/projects
proj scan ~/work
proj scan ~/personal
```

### Combine with Other CLIs

```bash
# Open in editor
code $(proj path my-app)

# Deploy
cd $(proj path api-server) && ./deploy.sh

# Run tests
cd $(proj path my-app) && npm test

# Check status
proj list --json | jq -r '.projects[].path' | xargs -I {} sh -c 'cd {} && git status'
```

## CLI Autocompetion

```shell
  _proj() {
    local -a commands projects
    commands=(
      'list:List all projects'
      'path:Get project path'
      'docs:Get docs path'
      'add:Add a project'
      'set-docs:Set docs directory'
      'set-category:Set project category'
      'set-description:Set project description'
      'set-visibility:Set project visibility'
      'remove:Remove a project'
      'scan:Scan directory for projects'
      'export-daemon:Export projects in daemon format'
      'complete:Mark as completed'
      'pause:Mark as paused'
      'archive:Mark as archived'
      'reactivate:Mark as active'
      'help:Show help'
      'version:Show version'
    )

    if (( CURRENT == 2 )); then
      _describe 'command' commands
    elif (( CURRENT == 3 )); then
      case "$words[2]" in
        path|docs|remove|complete|pause|archive|reactivate|set-docs|set-category|set-description|set-visibility)
          projects=(${(f)"$(proj list --json 2>/dev/null | jq -r '.projects[].name' 2>/dev/null)"})
          _describe 'project' projects
          ;;
        add|scan)
          _directories
          ;;
      esac
    fi
  }

  compdef _proj proj
```
  After adding:

  # Reload your shell
  source ~/.bashrc  # or ~/.zshrc



---

## Comparison with Other Tools

### vs. `autojump` / `z`

**autojump/z:**
- Frequency-based (learns from history)
- Automatic tracking
- Heuristic matching (sometimes wrong)

**proj:**
- Explicit tracking (you choose)
- Manual or scan-based addition
- Exact name matching (always correct)
- Shows metadata
- JSON output for scripting

### vs. `cdargs` / `bookmarks`

**cdargs/bookmarks:**
- Simple bookmark system
- No metadata
- Text-based storage

**proj:**
- Metadata tracking (last modified, size)
- Auto-discovery (scan feature)
- JSON output for automation
- Project indicators (.git, package.json, etc.)

---

## Recent Enhancements (v1.1.0)

- ✅ **Categories** - Organize projects by custom categories
- ✅ **Descriptions** - Add descriptions to projects for better context
- ✅ **Visibility** - Control project visibility (public/private/internal/custom)
- ✅ **Repository URLs** - Track GitHub/GitLab repository links
- ✅ **Next Steps** - Document next actions for each project
- ✅ **Daemon Export** - Export projects in daemon format with filtering
- ✅ **MCP Server** - AI integration for Claude and other LLMs
- ✅ **Documentation Paths** - Set and navigate to project docs directories
- ✅ **Project States** - Track active/paused/completed/archived projects

## Future Enhancements

Potential features for future versions:

- **Search** - Find projects by keyword (`proj search "api"`)
- **Stats** - Show project statistics (`proj stats`)
- **Git integration** - Show git status in list
- **Recent** - Track recently accessed projects
- **Fuzzy matching** - `pd my` → matches `my-app`
- **Templates** - Project templates for quick scaffolding

---

## License

MIT License - Feel free to use, modify, and distribute.

---

## Support

For issues, questions, or feature requests, open an issue on GitHub or contact the author.

---

**Built with CLI-First Architecture principles. Simple, deterministic, composable.**
