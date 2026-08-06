#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOSTNAME_SHORT="$(hostname -s)"
DATE="$(date +%F)"
LOCAL_DIR="$HOME/job-tracker-backups"
ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/job-tracker-backups"
OUT_FILE="$LOCAL_DIR/${DATE}-${HOSTNAME_SHORT}.tar.gz"

mkdir -p "$LOCAL_DIR"

cd "$REPO_DIR/backend"
if ! npm run --silent export -- "$OUT_FILE"; then
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
