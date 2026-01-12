#!/bin/bash

# Bash completion for proj CLI
# Source this file in your .bashrc:
#   source ~/bin/proj/_proj_completion.bash

_proj_completion() {
  local cur prev commands
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  commands="list path docs add set-docs set-category set-description set-visibility remove scan export-daemon complete pause archive reactivate help version"

  if [ $COMP_CWORD -eq 1 ]; then
    # Complete commands
    COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )
    return 0
  fi

  if [ $COMP_CWORD -eq 2 ]; then
    case "${prev}" in
      path|docs|remove|complete|pause|archive|reactivate|set-docs|set-category|set-description|set-visibility)
        # Complete with project names
        local projects=$(proj list --json 2>/dev/null | jq -r '.projects[].name' 2>/dev/null)
        COMPREPLY=( $(compgen -W "${projects}" -- ${cur}) )
        return 0
        ;;
      add|scan)
        # Complete with directories
        COMPREPLY=( $(compgen -d -- ${cur}) )
        return 0
        ;;
    esac
  fi
}

complete -F _proj_completion proj
