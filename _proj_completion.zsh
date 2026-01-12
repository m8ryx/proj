#compdef proj

# Zsh completion for proj CLI
# Source this file in your .zshrc:
#   source ~/bin/proj/_proj_completion.zsh

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
