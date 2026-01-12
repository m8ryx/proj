# Tab Completion for proj

Tab completion is available for both Zsh and Bash shells.

## Setup

### Zsh

Add this line to your `~/.zshrc`:

```bash
source ~/bin/proj/_proj_completion.zsh
```

Then reload your shell:

```bash
source ~/.zshrc
```

### Bash

Add this line to your `~/.bashrc`:

```bash
source ~/bin/proj/_proj_completion.bash
```

Then reload your shell:

```bash
source ~/.bashrc
```

## Updating Completions

When new commands are added to proj, the completion files are automatically updated. To get the latest completions:

1. **Option 1: Reload your shell**
   ```bash
   # Zsh
   source ~/.zshrc

   # Bash
   source ~/.bashrc
   ```

2. **Option 2: Re-source the completion file directly**
   ```bash
   # Zsh
   source ~/bin/proj/_proj_completion.zsh

   # Bash
   source ~/bin/proj/_proj_completion.bash
   ```

3. **Option 3: Open a new terminal window**
   - Completions are loaded automatically on shell startup

## What Gets Completed

- **Commands**: All proj commands (list, path, docs, add, remove, etc.)
- **Project names**: For commands that operate on projects (path, docs, remove, set-*, etc.)
- **Directories**: For commands that take directory paths (add, scan)

## Testing Completions

Try typing:

```bash
proj <TAB>           # Shows all commands
proj path <TAB>      # Shows all project names
proj add <TAB>       # Shows directories
```

## Troubleshooting

### Completions not working

1. Make sure the completion file is sourced in your rc file
2. Check that jq is installed (needed for project name completion):
   ```bash
   jq --version
   ```
3. Reload your shell or open a new terminal

### Completions showing old commands

If you've updated proj and don't see new commands:

```bash
# Force reload completions
unfunction _proj 2>/dev/null  # Zsh only
source ~/bin/proj/_proj_completion.zsh  # or .bash
```

### Project names not completing

Make sure you have projects added:

```bash
proj list
```

If you see projects in the list but they don't complete, check that jq is installed.
