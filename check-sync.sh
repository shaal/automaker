#!/usr/bin/env bash
set -euo pipefail

DEFAULT_RC_PATTERN="v*rc"
DEFAULT_PREVIEW_COUNT=5

PREVIEW_COUNT="${PREVIEW_COUNT:-$DEFAULT_PREVIEW_COUNT}"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

ORIGIN_REF="origin/${CURRENT_BRANCH}"
TARGET_RC_SOURCE="auto"

print_header() {
  echo "=== Sync Status Check ==="
  echo
  printf "Target RC: %s (%s)\n" "$TARGET_RC" "$TARGET_RC_SOURCE"
  echo
}

ensure_git_repo() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Not inside a git repository."
    exit 1
  fi
}

ensure_remote() {
  local remote="$1"
  if ! git remote get-url "$remote" >/dev/null 2>&1; then
    echo "Remote '$remote' is not configured."
    exit 1
  fi
}

fetch_remote() {
  local remote="$1"
  git fetch --quiet "$remote"
}

warn_if_dirty() {
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Warning: working tree has uncommitted changes."
    echo
  fi
}

resolve_target_rc() {
  if [[ -n "${TARGET_RC:-}" ]]; then
    return
  fi

  local rc_candidates
  rc_candidates="$(git for-each-ref --format='%(refname:short)' "refs/remotes/upstream/${DEFAULT_RC_PATTERN}" || true)"
  if [[ -n "$rc_candidates" ]]; then
    TARGET_RC="$(printf "%s\n" "$rc_candidates" | sed 's|^upstream/||' | sort -V | tail -n 1)"
    TARGET_RC_SOURCE="auto:latest"
    return
  fi

  local upstream_head
  upstream_head="$(git symbolic-ref --quiet --short refs/remotes/upstream/HEAD 2>/dev/null || true)"
  if [[ -n "$upstream_head" ]]; then
    TARGET_RC="${upstream_head#upstream/}"
    TARGET_RC_SOURCE="auto:upstream-head"
    return
  fi

  echo "Unable to resolve target RC automatically. Use --rc <branch>."
  exit 1
}

ref_exists() {
  local ref="$1"
  git show-ref --verify --quiet "refs/remotes/${ref}"
}

print_status_line() {
  local label="$1"
  local behind="$2"
  local ahead="$3"

  if [[ "$behind" -eq 0 && "$ahead" -eq 0 ]]; then
    printf "✅ %s: in sync (behind %s, ahead %s)\n" "$label" "$behind" "$ahead"
  elif [[ "$behind" -eq 0 ]]; then
    printf "⬆️  %s: ahead %s (behind %s)\n" "$label" "$ahead" "$behind"
  elif [[ "$ahead" -eq 0 ]]; then
    printf "⬇️  %s: behind %s (ahead %s)\n" "$label" "$behind" "$ahead"
  else
    printf "⚠️  %s: %s behind, %s ahead (diverged)\n" "$label" "$behind" "$ahead"
  fi
}

print_preview() {
  local title="$1"
  local range="$2"

  echo
  echo "$title"
  git log --oneline -n "$PREVIEW_COUNT" "$range"
}

print_branch_context() {
  echo "Branch: $CURRENT_BRANCH"
  echo "Upstream RC: $UPSTREAM_REF"
  echo "Upstream push: enabled for sync workflow"
  echo
}

print_upstream_summary() {
  local behind="$1"
  local ahead="$2"

  if [[ "$behind" -eq 0 && "$ahead" -eq 0 ]]; then
    echo "Branch vs upstream RC: in sync (behind $behind, ahead $ahead)"
  else
    echo "Branch vs upstream RC: behind $behind, ahead $ahead"
  fi
}

print_workflow_hint() {
  local behind="$1"
  local ahead="$2"

  if [[ "$behind" -eq 0 && "$ahead" -eq 0 ]]; then
    echo "Workflow: sync"
  elif [[ "$behind" -gt 0 && "$ahead" -eq 0 ]]; then
    echo "Workflow: sync (merge upstream RC)"
  elif [[ "$ahead" -gt 0 && "$behind" -eq 0 ]]; then
    echo "Workflow: pr (local work not in upstream)"
  else
    echo "Workflow: diverged (resolve manually)"
  fi
}

print_usage() {
  echo "Usage: ./check-sync.sh [--rc <branch>] [--preview <count>]"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --rc)
        shift
        if [[ -z "${1-}" ]]; then
          echo "Missing value for --rc"
          exit 1
        fi
        TARGET_RC="$1"
        TARGET_RC_SOURCE="flag"
        ;;
      --preview)
        shift
        if [[ -z "${1-}" ]]; then
          echo "Missing value for --preview"
          exit 1
        fi
        if ! [[ "$1" =~ ^[0-9]+$ ]]; then
          echo "Invalid preview count: $1"
          exit 1
        fi
        PREVIEW_COUNT="$1"
        ;;
      -h|--help)
        print_usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1"
        print_usage
        exit 1
        ;;
    esac
    shift
  done
}

ensure_git_repo
ensure_remote origin
ensure_remote upstream
parse_args "$@"

fetch_remote origin
fetch_remote upstream
resolve_target_rc

UPSTREAM_REF="upstream/${TARGET_RC}"

print_header
warn_if_dirty
print_branch_context

if ! ref_exists "$ORIGIN_REF"; then
  echo "Origin branch '$ORIGIN_REF' does not exist."
else
  read -r origin_behind origin_ahead < <(git rev-list --left-right --count "$ORIGIN_REF...HEAD")
  print_status_line "Origin" "$origin_behind" "$origin_ahead"
fi

if ! ref_exists "$UPSTREAM_REF"; then
  echo "Upstream ref '$UPSTREAM_REF' does not exist."
else
  read -r upstream_behind upstream_ahead < <(git rev-list --left-right --count "$UPSTREAM_REF...HEAD")
  print_status_line "Upstream" "$upstream_behind" "$upstream_ahead"
  echo
  print_upstream_summary "$upstream_behind" "$upstream_ahead"
  print_workflow_hint "$upstream_behind" "$upstream_ahead"

  if [[ "$upstream_behind" -gt 0 ]]; then
    print_preview "Recent upstream commits:" "HEAD..$UPSTREAM_REF"
  fi

  if [[ "$upstream_ahead" -gt 0 ]]; then
    print_preview "Commits on this branch not in upstream:" "$UPSTREAM_REF..HEAD"
  fi
fi
