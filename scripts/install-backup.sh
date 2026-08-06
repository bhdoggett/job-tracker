#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST_PATH="$HOME/Library/LaunchAgents/com.job-tracker.backup.plist"
LOG_PATH="$HOME/Library/Logs/job-tracker-backup.log"

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"

# launchd starts jobs with a minimal PATH (/usr/bin:/bin:/usr/sbin:/sbin), so
# node/npm (homebrew, nvm, etc.) would be unreachable even though backup.sh
# resolves them itself as a second line of defense. Bake the installing
# shell's own PATH into the job's environment so it matches what works
# interactively.
INSTALLER_PATH="$PATH"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.job-tracker.backup</string>
  <key>ProgramArguments</key>
  <array>
    <string>$REPO_DIR/scripts/backup.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$INSTALLER_PATH</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>23</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>$LOG_PATH</string>
  <key>StandardErrorPath</key>
  <string>$LOG_PATH</string>
</dict>
</plist>
EOF

# Verify the script actually works under a launchd-like environment before
# declaring success — this is the same class of bug (a tool unresolvable from
# the scheduler's environment) that caused the original silent-failure
# backup, so "the plist was written" is not proof the job will run.
echo "Verifying backup.sh under a stripped, launchd-like environment..."
if ! env -i HOME="$HOME" PATH=/usr/bin:/bin:/usr/sbin:/sbin USER="${USER:-}" "$REPO_DIR/scripts/backup.sh"; then
  echo "Install aborted: backup.sh failed under a stripped PATH (the environment launchd will actually use)." >&2
  echo "Fix backup.sh's binary resolution before installing the job." >&2
  rm -f "$PLIST_PATH"
  exit 1
fi
echo "Verification succeeded: backup.sh produced an archive under a stripped environment."

launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "Installed and loaded com.job-tracker.backup. Verify with: launchctl list | grep job-tracker"
echo "Grant Full Disk Access to the process running launchd jobs (System Settings -> Privacy & Security -> Full Disk Access)"
echo "so the iCloud copy step can succeed — this is the permission the old job was missing."
