#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOSTNAME_SHORT="$(hostname -s)"
DATE="$(date +%F)"
LOCAL_DIR="$HOME/job-tracker-backups"
ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/job-tracker-backups"
OUT_FILE="$LOCAL_DIR/${DATE}-${HOSTNAME_SHORT}.tar.gz"

# launchd runs jobs with a minimal PATH (/usr/bin:/bin:/usr/sbin:/sbin), which
# never contains node/npm (homebrew, nvm, etc. all install elsewhere). Resolve
# both at runtime instead of relying on the caller's PATH, so the nightly job
# works from a scheduler as well as an interactive shell.
resolve_bin() {
  local name="$1"
  local found
  if found="$(command -v "$name" 2>/dev/null)"; then
    echo "$found"
    return 0
  fi

  local candidates=("/opt/homebrew/bin/$name" "/usr/local/bin/$name")
  local nvm_dir="$HOME/.nvm/versions/node"
  if [ -d "$nvm_dir" ]; then
    # Prefer the most recently installed nvm version if several are present.
    local versions
    versions="$(ls -1 "$nvm_dir" 2>/dev/null | sort -Vr)"
    while IFS= read -r version; do
      [ -n "$version" ] && candidates+=("$nvm_dir/$version/bin/$name")
    done <<< "$versions"
  fi

  local candidate
  for candidate in "${candidates[@]}"; do
    if [ -x "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

fail_missing_bin() {
  local name="$1"
  echo "Error: could not locate the '$name' executable (checked PATH, /opt/homebrew/bin, /usr/local/bin, and \$HOME/.nvm/versions/node/*/bin)." >&2
  osascript -e "display notification \"job-tracker nightly export failed — '$name' not found\" with title \"job-tracker backup\"" || true
  exit 1
}

NODE_BIN="$(resolve_bin node)" || fail_missing_bin node
# Put the resolved node's directory on PATH so npm's `#!/usr/bin/env node`
# shebang (and any child processes npm spawns) can find it too.
export PATH="$(dirname "$NODE_BIN"):$PATH"
NPM_BIN="$(resolve_bin npm)" || fail_missing_bin npm

mkdir -p "$LOCAL_DIR"

cd "$REPO_DIR/backend"
if ! "$NPM_BIN" run --silent export -- "$OUT_FILE"; then
  osascript -e 'display notification "job-tracker nightly export failed — see ~/Library/Logs/job-tracker-backup.log" with title "job-tracker backup"' || true
  echo "Export failed; leaving iCloud untouched." >&2
  exit 1
fi

mkdir -p "$ICLOUD_DIR"
if ! cp "$OUT_FILE" "$ICLOUD_DIR/"; then
  osascript -e 'display notification "job-tracker export succeeded locally but the iCloud copy failed" with title "job-tracker backup"' || true
  echo "Local backup succeeded; iCloud copy failed." >&2
  exit 0
fi

# Prune only this host's own files, older than 30 days, in each location.
# Non-fatal: a cleanup failure must never mask a successful export.
find "$LOCAL_DIR" -maxdepth 1 -name "*-${HOSTNAME_SHORT}.tar.gz" -mtime +30 -delete || true
find "$ICLOUD_DIR" -maxdepth 1 -name "*-${HOSTNAME_SHORT}.tar.gz" -mtime +30 -delete || true

echo "Backup complete: $OUT_FILE"
