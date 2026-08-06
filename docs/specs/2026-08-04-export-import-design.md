# Data Export / Import — Design

**Date:** 2026-08-04
**Status:** Approved, not yet implemented
**Related:** [`docs/backup-recovery-status.md`](../backup-recovery-status.md)

## Problem

The nightly `pg_dump` → iCloud backup has been producing schema-only dumps with zero
data rows, exiting successfully the whole time. See the recovery-status doc for the
full evidence. Three weaknesses caused it:

1. The success check was `[ -s "$TMP_FILE" ]` — a file-size test that passes happily on
   a 21.5K schema-only dump.
2. `pg_dump` was referenced by a hardcoded, machine-specific absolute path.
3. Neither the script nor its launchd plist was in version control, so the two machines
   drifted independently and neither could be fixed by a `git pull`.

Separately, the app has no way to move data between machines. The 2026-07-10
multi-machine sync plan was never implemented.

## Goals

- Move a complete account snapshot between machines.
- Make a data-less backup impossible to produce silently.
- Put the backup logic in the repo so `git pull` updates it everywhere.
- Reuse one implementation for manual export/import, nightly backup, and in-app restore.

## Non-goals

- Schema backup. Snapshots carry data only; schema comes from migrations (see
  "Trade-off" below).
- Merging data from two machines. Import is whole-snapshot replacement.
- Multi-user or auth concerns. Single-user local app.
- Automatic conflict resolution between machines' snapshots.

## Architecture

One core module; thin wrappers own all I/O.

```
backend/src/lib/backup/
  archive.ts     read/write the .tar.gz container
  export.ts      DB + uploads  → archive
  import.ts      archive → DB + uploads
  order.ts       FK-derived table ordering
  manifest.ts    manifest build + validation
backend/src/cli/backup.ts       npm run export / npm run import
backend/src/routes/backup.ts    thin HTTP wrapper
```

Core functions take a db handle and paths and return a result object. No `process.exit`,
no `console.log` — wrappers handle process control and output. This is what allows the
core to be tested without a running server, a cron, or a browser.

CLI surface:

```
npm run export -- [<path>]     default: ~/job-tracker-backups/<date>-<hostname>.tar.gz
npm run import -- <path>       path required; no default, to avoid a destructive typo
```

## Archive format

A `.tar.gz` containing:

```
manifest.json     format version, createdAt, hostname, row counts per table,
                  ENCRYPTION_KEY fingerprint, warnings[]
data.json         all 10 tables, keyed by table name
uploads/          PDFs from backend/uploads/, named by their stored name
```

`manifest.json` row counts are the anti-regression mechanism. Counts are recorded at
export time and re-verified after import. A zero-row export is detectable at creation,
not months later when it's needed.

The key fingerprint is a hash of `ENCRYPTION_KEY`, never the key itself. Import compares
fingerprints and aborts on mismatch. A fingerprint works even when no EIN is set yet,
unlike a test decrypt.

## Table ordering

Derived from the FK graph rather than hand-maintained:

```
insert:  profile, projects, tasks, time_entries, docs, expenses,
         invoices, invoice_line_items, invoice_time_entries, time_entry_tasks
delete:  exact reverse
```

`invoices.project_id` is `onDelete: "restrict"`, so reverse-topological is the only
delete order that works — this is not merely a tidiness preference.

After insert, every serial sequence is reset via `setval` to `max(id)`. Without this the
next insert on the restored machine collides with an imported id.

## Export flow

```
1. read all 10 tables in FK order
2. collect uploads: for each docs row, read UPLOADS_DIR/file_path
   - missing file → record in manifest.warnings[], do NOT abort
3. build manifest (counts, hostname, fingerprint, timestamp)
4. write to <target>.tmp, then rename into place
5. assert total data rows > 0 → else fail with non-zero exit
   - suppressed when called as a safety export (see below)
```

**Step 5 is the core fix.** An empty database is an error condition, not a valid backup.

The assertion is opt-out via a flag, used by exactly one caller: the safety export in
import step 2. Snapshotting an empty database before overwriting it is legitimate — and
without the opt-out, the first recovery import on a machine with an empty database would
abort on its own safety net. `MacBook-Air-3` is in precisely that state today.

**Step 2 does not abort** on missing files. `MacBook-Air-3` currently holds the mirror
case — 4 orphaned PDFs in `backend/uploads/` with an empty `docs` table — and a backup
that refuses to run over one stale file is a backup that gets disabled.

## Import flow

```
1. read + validate manifest (format version, key fingerprint)
2. safety export of current DB → ~/job-tracker-backups/pre-import-<timestamp>.tar.gz
3. BEGIN
4.   delete all tables in reverse FK order
5.   insert all tables in FK order
6.   setval each serial sequence to max(id)
7. COMMIT
8. restore uploads/ into UPLOADS_DIR (skip identical; never delete extras)
9. verify live row counts == manifest counts → else fail loudly
```

Steps 3–7 are one transaction: import either fully succeeds or leaves the database
untouched. With step 2, a wrong archive path costs nothing.

Step 8 is deliberately outside the transaction — filesystem writes cannot be rolled back,
and pretending otherwise would be dishonest. It never deletes extra files; cleaning up
orphans is not this process's job.

Step 9 catches an archive that parses correctly but restores incorrectly.

## Encryption handling

`profile.ein_encrypted` is the only encrypted column (AES-256-GCM, `ENCRYPTION_KEY`
from `.env`).

Ciphertext is exported unchanged, so the EIN is never in plaintext in iCloud or the local
backup folder. **Consequence: `ENCRYPTION_KEY` must match across machines.** Copy it from
the source machine's `.env` before importing. Import aborts with a clear message on
fingerprint mismatch rather than producing an undecryptable profile row.

## Migrations

The backend runs pending Drizzle migrations at startup (`migrate()` from
`drizzle-orm/postgres-js/migrator`) before serving requests. The CLI import path does the
same before importing.

A fresh machine therefore self-heals: `git pull`, `npm run dev`, app works, import through
the UI. No manual `npm run db:migrate` to remember at the exact moment data is at risk.

Auto-migrate-on-boot is only hazardous with concurrent instances or destructive
migrations; neither applies to this single-user local app.

## Nightly backup integration

`scripts/backup.sh` becomes a thin wrapper around `npm run export`:

```
1. export → ~/job-tracker-backups/YYYY-MM-DD-<hostname>.tar.gz
2. non-zero exit → notify, stop, leave iCloud untouched
3. cp to the iCloud backup folder
4. prune each location, matching ONLY *-<hostname>.tar.gz, older than 30 days
```

Retention is 30 days in both locations, matching the previous script's policy. Pruning is
non-fatal: a cleanup failure must never mask a successful export, which is how the current
script ends up reporting exit 1 on nights the dump actually worked.

Local is authoritative; iCloud is a sync channel. Local writes do not require Full Disk
Access — the permission the launchd job currently lacks — so backups keep working when
the iCloud leg fails, and the failure surfaces instead of hiding.

Step 4's hostname restriction permanently removes the cross-machine deletion hazard: the
current `find -mtime +30 -delete` prunes every machine's files, which is why one machine
can destroy another's history.

`scripts/install-backup.sh` generates the launchd plist pointing at the repo copy of the
script and loads it. The plist must live in `~/Library/LaunchAgents/` (launchd reads only
from there), but the script it invokes stays version-controlled, so `git pull` updates
backup behavior on every machine.

Full Disk Access must still be granted for the iCloud copy step. Verify with
`launchctl list | grep job-tracker` returning exit 0.

## Error handling

Every failure exits non-zero with a specific stderr message and an `osascript`
notification. Named cases:

| Condition | Message intent |
|---|---|
| Export finds zero data rows | Refuse to write; the DB is empty |
| Archive unreadable / bad format version | Name the version found vs expected |
| Key fingerprint mismatch | Say which machine's `ENCRYPTION_KEY` is needed |
| Post-import row-count mismatch | Report expected vs actual per table |
| Missing upload file at export | Warning in manifest, not a failure |
| iCloud copy fails | Report it; local backup still succeeded |

The defining bug of this whole incident was a *successful exit* on a worthless backup.
Making that state unreachable is the design's main job.

## Testing

Vitest is already configured in `backend` (`invoice-helpers.test.ts`).

- **Unit:** FK topological ordering; manifest validation; fingerprint mismatch rejection;
  sequence-reset SQL generation.
- **Integration:** round-trip export → import against a scratch database, asserting row
  counts, FK integrity, and sequence values.
- **Regression:** export against an empty database MUST fail. This pins the exact bug
  that caused months of worthless backups.

## Trade-off: no schema in snapshots

Dropping `pg_dump` removes the Postgres-version and Homebrew-path fragility that caused
the original failure, and makes archives portable across Postgres versions. The cost is
that snapshots carry data only — restoring onto a fresh machine requires migrations to
have run first.

Auto-migrate-on-boot covers that for every normal path. Stated here explicitly so it is
not a surprise during a future recovery.

## Open items

- Determine which machine owns the plain `YYYY-MM-DD.sql` filename vs the ` 2.sql`
  conflict copy in iCloud. Undetermined from `MacBook-Air-3`. Not blocking: the new
  naming scheme (`.tar.gz` with hostname suffix) does not collide with the old files.
- `docker-compose.yml` describes a Postgres that does not match `.env` (which points at a
  Homebrew Postgres 18). Appears to be a leftover; delete or reconcile separately.
- Cleanup of the 62 zero-byte `.sql` files and two stale `.tmp` files in iCloud, once a
  verified real backup exists.
