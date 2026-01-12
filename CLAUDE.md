# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**proj** is a TypeScript-based CLI tool for managing project directories. It's a single-file application (proj.ts) that runs on Bun runtime and stores project metadata in `~/.config/proj/projects.json`.

**Runtime:** Bun (not Node.js)
**Language:** TypeScript with strict mode enabled
**Dependencies:** Zero - uses only Node.js/Bun built-ins

## Development Commands

```bash
# Run the CLI directly
bun run proj.ts <command> [args]

# Test basic functionality
bun run proj.ts --version
bun run proj.ts --help

# Quick tests using npm scripts
npm run help
npm run list
npm test  # Actually runs: bun run proj.ts --version

# Make executable for system-wide use
chmod +x proj.ts
```

## Architecture Overview

### Single-File Design
The entire application is contained in `proj.ts` (~900 lines). Code is organized into logical sections:

1. **Type Definitions** (lines 28-44): Core TypeScript interfaces
   - `Project` interface with optional state management
   - `ProjectConfig` for the JSON storage format
   - `ProjectState` type for lifecycle states

2. **Configuration Management** (lines 50-108): File I/O operations
   - Config stored at `~/.config/proj/projects.json`
   - Auto-creates config directory and file if missing
   - Transparent migration for projects without state field

3. **State Management** (lines 111-150): Project lifecycle
   - Four states: `active`, `paused`, `completed`, `archived`
   - Completion timestamps managed automatically
   - State transitions via dedicated functions

4. **Metadata Operations** (lines 153-198): File system queries
   - Directory modification times and sizes
   - Auto-detection of project indicators (.git, package.json, etc.)

5. **CLI Commands** (lines 204-597): Command implementations
   - Each command is a standalone function
   - Consistent error handling with stderr + exit(1)
   - JSON output mode for scripting

6. **Main Entry Point** (lines 754-912): Argument parsing and routing
   - Simple switch-case command dispatcher
   - Flag parsing for --json, --verbose, state filters

### Key Design Patterns

**State Management Pattern:**
- Projects default to "active" state when added
- State changes are isolated in `setProjectState()` function
- Completion date auto-set when marking completed, auto-cleared when changing state
- Migration handles old projects without state field

**Config File Philosophy:**
- Single source of truth: `~/.config/proj/projects.json`
- Metadata updates happen transparently during `list` command
- Config is loaded/saved for every operation (no in-memory caching)
- Manual editing is supported and validated on load

**Output Determinism:**
- Human-readable mode uses consistent formatting with Unicode symbols
- JSON mode (`--json`) outputs parseable data for scripting
- Errors always go to stderr, success output to stdout
- Exit codes: 0 = success, 1 = error

## Project Structure

```
proj/
├── proj.ts           # Single TypeScript file (~900 lines)
├── package.json      # Metadata only (no runtime dependencies)
├── tsconfig.json     # TypeScript config (strict mode, ESNext)
├── README.md         # Comprehensive documentation
└── QUICKSTART.md     # 30-second getting started guide
```

## Data Model

### Project Object
```typescript
{
  name: string;           // Unique identifier
  path: string;           // Absolute directory path
  added: string;          // ISO timestamp
  lastModified: string;   // ISO timestamp (updated on list)
  size?: number;          // Directory size in bytes
  docs?: string;          // Optional docs directory path
  state?: ProjectState;   // "active" | "paused" | "completed" | "archived"
  completedAt?: string;   // ISO timestamp (set when state="completed")
}
```

### Config File Format
```json
{
  "version": "1.0.0",
  "projects": [/* Project[] */]
}
```

## Shell Integration

The CLI is designed to be used with shell functions for seamless navigation:

```bash
# Navigate to project directory
pd() {
  local path=$(proj path "$1" 2>/dev/null)
  if [ -n "$path" ]; then cd "$path"; fi
}

# Navigate to project docs
pdd() {
  local path=$(proj docs "$1" 2>/dev/null)
  if [ -n "$path" ]; then cd "$path"; fi
}
```

## CLI Philosophy

The tool follows **CLI-First Architecture**:

1. **Deterministic:** Same input always produces same output
2. **Zero Dependencies:** No npm packages, only built-ins
3. **Type-Safe:** Full TypeScript with strict mode
4. **Composable:** JSON output for piping to jq, grep, etc.
5. **File-Based:** Simple JSON config that can be manually edited
6. **Shell-Friendly:** Designed to work with bash/zsh functions

## Project Detection Logic

The `scan` command identifies projects by looking for these indicators:
- `.git` or `.gitignore` (Git repositories)
- `package.json` (Node.js)
- `Cargo.toml` (Rust)
- `go.mod` (Go)
- `pom.xml` or `build.gradle` (Java)
- `CMakeLists.txt` or `Makefile` (C/C++)
- `pyproject.toml` or `setup.py` (Python)
- `composer.json` (PHP)

## State Filtering

By default, `proj list` shows only active projects. Use flags to filter:
- `--all` - Show all projects regardless of state
- `--completed` - Show only completed projects
- `--paused` - Show only paused projects
- `--archived` - Show only archived projects

These flags are mutually exclusive (except `--all`).

## Common Modification Patterns

When adding new features:

1. **New Commands:** Add case in main() switch statement, implement command function
2. **New Flags:** Parse in main(), pass to command functions via options object
3. **Data Model Changes:** Update Project interface, handle migration in loadConfig()
4. **New Project Indicators:** Add to indicators array in looksLikeProject()

## Testing Strategy

No formal test suite exists. Manual testing approach:

```bash
# Test adding/removing
bun run proj.ts add test-proj .
bun run proj.ts list
bun run proj.ts remove test-proj

# Test state transitions
bun run proj.ts add test-proj .
bun run proj.ts pause test-proj
bun run proj.ts list --paused
bun run proj.ts reactivate test-proj

# Test JSON output
bun run proj.ts list --json | jq .

# Test scanning
bun run proj.ts scan ~/projects
```

## Error Handling

All errors follow consistent pattern:
- Write to stderr using `console.error()`
- Call `process.exit(1)`
- Provide helpful error messages with usage hints
- Suggest corrective actions when applicable

## Version History

- **v1.0.0:** Initial release (Daniel Miessler)
- **v1.1.0:** Added project state management (active/paused/completed/archived), docs directory support
