# Project Creation with Templates

Design for adding `proj create` command with template support.

## Command Interface

**Primary command:** `proj create [template] [name]`

**Modes:**
- **Interactive:** `proj create` prompts for template selection, name, location, docs, and git init
- **Direct:** `proj create typescript-cli my-app` uses defaults, prompts only for missing required values
- **Fully specified:** `proj create typescript-cli my-app --path=~/projects --docs=~/Obsidian/Projects/my-app --git`

**Flags:**
- `--path` / `-p` - where to create the project (default: current dir + name)
- `--docs` / `-d` - docs location (default: from template)
- `--git` / `--no-git` - initialize git repo (default: from template or true)
- `--json` - output result as JSON (consistent with existing proj commands)

**Output:** After creation, displays what was created and the initial next steps.

## Template Structure

**Location:** `~/.config/proj/templates/<template-name>/`

**Contents:**
```
~/.config/proj/templates/typescript-cli/
├── template.json        # Config and metadata
└── files/               # Everything here gets copied
    ├── src/
    │   └── index.ts
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

**template.json:**
```json
{
  "name": "TypeScript CLI",
  "description": "Bun-based CLI application",
  "docsLocation": "~/Obsidian/Projects/{{name}}",
  "gitInit": true,
  "nextSteps": [
    "Set up dependencies",
    "Define CLI commands",
    "Write tests"
  ]
}
```

**Variable substitution:** In any file inside `files/`, these placeholders get replaced:
- `{{name}}` - project name
- `{{docs}}` - resolved docs path
- `{{location}}` - project path
- `{{date}}` - creation date (ISO format)

## Creation Flow

When `proj create` runs:

1. **Select template** - list templates from `~/.config/proj/templates/`, user picks one (or passed as arg)
2. **Get name** - prompt or use arg
3. **Resolve location** - use `--path` or prompt (default: `./<name>`)
4. **Resolve docs** - use `--docs` or template default (with `{{name}}` substituted)
5. **Git decision** - use flag or template default
6. **Validate** - check location doesn't exist, template is valid
7. **Create directory** - mkdir at location
8. **Copy files** - copy `files/` contents, substituting variables in file contents
9. **Create docs directory** - mkdir at docs location if it doesn't exist
10. **Git init** - if enabled, run `git init`
11. **Register project** - call existing proj logic to add project with name, path, docs, and next steps
12. **Display summary** - show what was created

**Error handling:**
- Directory already exists: error with suggestion to use different path
- Template not found: list available templates
- Docs location not writable: warn but continue (user can set docs later)

## Template Management

**Listing templates:** `proj templates` (new command)
- Lists all templates in `~/.config/proj/templates/`
- Shows name, description from each template.json
- `--json` flag for scripted access

**First-run experience:**
- If `~/.config/proj/templates/` doesn't exist, create it on first `proj create`
- If no templates exist, display helpful message with path and link to docs

**Bonus: `proj template init <name>`**
- Creates `~/.config/proj/templates/<name>/` with starter template.json and empty `files/` directory

**Bonus: Remote templates**
- Future: `proj template add <git-url>` clones a template repo
- Not in initial scope

## Implementation Notes

**Code organization:**
- Add template functions near existing config management (~line 50-108)
- Add `create` command function with the other commands (~line 204-597)
- Add `templates` command for listing
- Interactive prompts use Node.js `readline` (Bun compatible, no dependencies)

**New functions needed:**
- `loadTemplate(name)` - read template.json, validate structure
- `listTemplates()` - scan templates directory
- `copyTemplateFiles(templatePath, destPath, variables)` - recursive copy with substitution
- `promptForInput(question, defaultValue)` - simple readline wrapper
- `createProject(options)` - orchestrates the full creation flow

**File substitution:**
- Only substitute in text files (skip binary files like images)
- Use simple `{{variable}}` syntax with string replace
- Process files as UTF-8

**Testing approach:**
- Create a test template in a temp directory
- Run `proj create` with all flags specified (non-interactive)
- Verify project registered, files copied, variables substituted
