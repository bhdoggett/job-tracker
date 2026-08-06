# Backup Export / Import UI — Design

**Date:** 2026-08-06
**Status:** Approved, not yet implemented
**Related:** [`2026-08-04-export-import-design.md`](./2026-08-04-export-import-design.md), [`../backup-recovery-status.md`](../backup-recovery-status.md)

## Problem

The export/import system shipped with two surfaces: a CLI (`npm run export` / `npm run import`)
and HTTP routes (`GET /api/backup/export`, `POST /api/backup/import`). Neither is reachable from
the app. Backing up or restoring means dropping to a terminal in the repo directory.

The routes already exist and work. What's missing is a way to use them without a shell.

## Goals

- Download a backup from inside the app.
- Restore a backup from inside the app, without being able to do it by accident.
- Show what an archive actually contains *before* it replaces anything.

## Non-goals

- Backup scheduling or controls for the nightly launchd job.
- Backup history, staleness warnings, or last-run status (review finding I9 stays open).
- Any change to the export/import core in `backend/src/lib/backup/`.
- Client-side test tooling. The client has none today; this feature does not add a harness.

## The central decision: preview before replace

Import is whole-snapshot replacement — it deletes every row and reinserts from the archive. The
backend already refuses a zero-row archive and writes a safety snapshot first, but neither
protects against the realistic mistake: **restoring the wrong file.**

The archive's `manifest.json` already carries everything needed to catch that — creation
timestamp, source hostname, and per-table row counts. The UI shows it and asks for confirmation:

```
Restore from backup

  Selected: 2026-08-05-MacBook-Air.tar.gz
  Created:  Aug 5, 2026 10:37 PM
  From:     MacBook-Air

                archive    current
  projects            2          2
  tasks              55         55
  time_entries       64         64
  ...
  ------------------------------------
  total             343        343

  This REPLACES all current data.
  A safety snapshot is saved first.

        [ Cancel ]  [ Replace my data ]
```

Rejected alternatives: a type-to-confirm prompt (friction without information — you still can't
see what's in the file), and a plain confirm dialog (fastest to build, weakest protection).

## Architecture

### New endpoint: `POST /api/backup/inspect`

Accepts the same multipart `file` field as the import route. Reads the archive, validates it,
and returns the manifest alongside current database counts. **It never writes to the database.**

```ts
// 200
{
  manifest: {
    createdAt: string;      // ISO
    hostname: string;
    rowCounts: Record<string, number>;
    warnings: string[];
  },
  current: Record<string, number>;
}
```

Because it runs `validateManifest`, an `ENCRYPTION_KEY` mismatch surfaces **at preview time**,
with the existing message naming the machine whose key is needed — rather than after the user has
committed to a restore. That is the main reason this endpoint exists rather than parsing the
archive in the browser.

Status mapping matches the existing routes: `400` for a malformed manifest or key mismatch,
`400` for a missing/non-file `file` field.

Parsing the archive client-side was rejected: it would require shipping a gzip+tar decoder to the
browser, could not verify the key fingerprint, and would duplicate logic that already exists.

### Refactor: extract `countAllRows`

`countAllRows` is currently a private function in `backend/src/lib/backup/import.ts`. The inspect
route needs the same counts. Move it to `backend/src/lib/backup/counts.ts` and import it from both
places, so there is one implementation rather than a copy.

No behavior change. `import.ts` keeps calling it exactly as it does now.

### Client files

```
client/src/api/backup.ts                          inspect() / restore() / downloadUrl()
client/src/components/BackupSection.tsx           the UI
client/src/components/BackupSection.module.css    styles
client/src/pages/ProfilePage.tsx                  renders <BackupSection />
```

`backup.ts` follows the existing `docs.ts` pattern (FormData upload, thrown `Error` carrying the
server's message).

`BackupSection` is rendered on the Profile page but **outside the profile `<form>`** — nesting a
file input and action buttons inside a form whose submit handler saves the profile invites
accidental submissions.

## Data flow

**Export.** One button → `GET /api/backup/export` → browser download. The route returns `409`
when the database has no rows; that message is shown inline.

**Import.**

```
1. user picks a file            (accept=".gz,.tar.gz")
2. POST /api/backup/inspect     → preview modal opens with the comparison table
3. user confirms                → POST /api/backup/import
4. result shown                 rows imported, safety-snapshot path, archive warnings
```

The file is uploaded twice — once to inspect, once to import. At typical archive size (~5 MB) over
localhost this is imperceptible, and the alternative (staging the upload server-side behind a
token) adds server state and a cleanup obligation for no practical gain.

Archive `warnings` (e.g. `Missing upload file: <name>.pdf`) are displayed after a successful
import. They are the only signal that a restored `docs` row points at a file that was already
missing when the archive was made.

## Error handling

| Condition | Status | UI |
|---|---|---|
| Key fingerprint mismatch | 400 | Message in modal; confirm never enables |
| Malformed / unsupported archive | 400 | Message in modal; confirm never enables |
| Zero-row archive refused | 409 | Message in modal |
| Export with empty database | 409 | Message inline in the export section |
| Post-import row-count mismatch | 500 | Error **plus the safety-snapshot path**, which the backend attaches to this error |
| Non–same-origin import request | 403 | Not expected from the app itself; shown verbatim |

Both network calls show explicit loading states — inspect reads and unpacks an archive, and import
does real database work.

## Testing

**Backend** — following the existing `setupTestDb()` integration pattern:

- inspect on a valid archive returns the manifest and current counts, and does not modify the database
- inspect on an archive whose key fingerprint does not match → 400
- inspect on a malformed archive → 400
- `countAllRows` continues to behave identically after being moved (covered by the existing import tests)

**Client** — `client/package.json` has no vitest, no testing-library, and no `test` script. This
feature does not add a client test harness as a side effect. The UI is verified manually:
download an archive, inspect it, confirm the preview matches `manifest.json`, and confirm the
cancel path leaves the database untouched.

This is stated explicitly rather than left implied: the UI ships without automated tests.

## Open items

- Review finding I9 (a backup that silently never runs) remains unaddressed. Surfacing last-backup
  time in this section would be the natural place, and was deliberately deferred.
- Review finding I8's deferred half — binding the server to `127.0.0.1` — is unaffected by this
  work and still open.
