# proj Quick Start

**The 30-second guide to using proj**

---

## Installation

```bash
cd ~/bin/proj
chmod +x proj.ts

# Add to your shell rc file (~/.bashrc or ~/.zshrc)
pd() {
  local path=$(proj path "$1" 2>/dev/null)
  if [ -n "$path" ]; then
    cd "$path"
  else
    echo "Error: Project not found" >&2
    return 1
  fi
}
```

Reload your shell: `source ~/.bashrc` or `source ~/.zshrc`

---

## Quick Usage

```bash
# Scan your projects directory
proj scan ~/projects

# List all projects
proj list

# Navigate to a project
pd my-app

# Add a project manually
proj add my-app ~/projects/my-app

# Remove a project
proj remove my-app
```

---

## Common Workflows

### Setup Projects

```bash
# Scan multiple directories
proj scan ~/projects
proj scan ~/work
proj scan ~/personal

# Verify
proj list
```

### Navigate

```bash
# Using shell function (recommended)
pd my-app

# Or directly
cd $(proj path my-app)

# Open in VS Code
code $(proj path my-app)
```

### Scripting

```bash
# List as JSON
proj list --json

# Get all project paths
proj list --json | jq -r '.projects[].path'

# Find specific project
proj list --json | jq '.projects[] | select(.name == "my-app")'
```

---

## Piping to jq

```bash
# Projects modified recently
proj list --json | jq '.projects[] | select(.lastModified > "2025-12-01")'

# All project names
proj list --json | jq -r '.projects[].name'

# Projects with "api" in the name
proj list --json | jq '.projects[] | select(.name | contains("api"))'

# Export to CSV
proj list --json | jq -r '.projects[] | [.name, .path] | @csv'
```

---

## Configuration

**Config file:** `~/.config/proj/projects.json`

**Edit manually if needed:**
```bash
code ~/.config/proj/projects.json
```

---

## Shell Integration Examples

### Open in Editor

```bash
alias pcode='code $(proj path $1)'
alias pvim='vim $(proj path $1)'
```

### Create tmux Session

```bash
pj() {
  local path=$(proj path "$1" 2>/dev/null)
  if [ -n "$path" ]; then
    tmux new-session -s "$1" -c "$path"
  fi
}
```

---

## Common Commands

| Command | Description |
|---------|-------------|
| `proj list` | Show all projects |
| `proj list --json` | Show as JSON |
| `proj path <name>` | Get project path |
| `proj add <name> <path>` | Add project |
| `proj remove <name>` | Remove project |
| `proj scan <dir>` | Auto-discover projects |
| `pd <name>` | Navigate (with shell function) |

---

## Full Documentation

See: `~/bin/proj/README.md` for complete documentation, examples, and integrations.

---

**Built with CLI-First Architecture. Fast, simple, composable.**
