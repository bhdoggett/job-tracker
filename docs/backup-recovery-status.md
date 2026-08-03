# Backup & Multi-Machine Sync — Status and Recovery Plan

**Written:** 2026-08-03, from `MacBook-Air-3`
**Status:** Backups are non-functional. No job-tracker data exists on this machine.

This is a handoff doc. Read it before touching the backup script, the launchd job, or
the iCloud backup folder on any machine.

---

## TL;DR

Every backup in iCloud is schema-only — zero rows, on every date going back to at least
June. The nightly job runs, reports partial success, and copies an empty database. All
job-tracker data lives on exactly one machine (not this one), in its local Postgres, with
no working backup.

**Do not run the 30-day cleanup (`find -mtime +30 -delete`) or a "Backup Now" flow on any
machine until the real data is captured.** Retention prunes across all machines' files.

---

## Evidence

### 1. This machine's database is empty

```
$ psql "postgresql://bdoggett@localhost:5432/job_tracker" \
    -c "select relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc;"

       relname        | n_live_tup
----------------------+------------
 time_entries         |          0
 docs                 |          0
 time_entry_tasks     |          0
 invoice_line_items   |          0
 profile              |          0
 invoice_time_entries |          0
 invoices             |          0
 projects             |          0
 expenses             |          0
 tasks                |          0
```

Only one `job_tracker` database exists locally (`\l` confirms). Docker is no longer
installed — only a leftover `~/Library/Containers/com.docker.docker` directory, no
binary — so there is no stale Docker volume to recover from either, despite
`docker-compose.yml` still being in the repo.

### 2. Every iCloud snapshot is schema-only

The backup folder holds 23 files at 21.5K that look healthy and 62 at 0 bytes. The
21.5K ones contain no data:

```
2026-07-27.sql  total_data_rows= 0
2026-08-01.sql  total_data_rows= 0
2026-08-03.sql  total_data_rows= 0
```

Two snapshots taken two days apart differ by one line — pg_dump's random per-run token:

```
- \restrict zHWfjvtHsWy4gK8qk2frgfHgMLDr1o...
+ \restrict tWeVf7lNVbezjuDGd8Nr9fe54tR7jQ...
```

Byte-identical otherwise. The dumps succeed; they just dump an empty database.

### 3. The 0-byte files are genuinely empty, not undownloaded placeholders

Worth stating because it's easy to misread. A dataless (evicted) iCloud file still
reports its true size:

```
2026-07-15.sql    size=21967  flags=compressed,dataless   <- evicted, but real content
2026-08-03 2.sql  size=0      flags=compressed,dataless   <- actually empty
```

So `brctl`/Finder-download tricks will not recover anything from the 0-byte files.

### 4. Filename collision between machines

`~/job-tracker-backup.sh` writes `YYYY-MM-DD.sql` with no hostname suffix. Both machines
target the same filename in the same shared folder, so iCloud creates conflict copies
named `YYYY-MM-DD 2.sql`. Present daily since 2026-07-02.

**Unresolved:** which machine writes the plain name and which gets the ` 2` suffix could
not be determined from `MacBook-Air-3`. If the *other* machine owns the 0-byte
` 2.sql` files, its script is also broken and has never produced a working backup.
Determine this on the other machine before trusting any file.

### 5. The launchd job has no Full Disk Access

```
$ launchctl list | grep job-tracker
-	1	com.job-tracker.backup
```

Exit 1. From `~/Library/Logs/job-tracker-backup.log`:

```
find: .../job-tracker-backups: Operation not permitted        (20 occurrences)
mv: rename .../2026-07-16.sql.tmp to .../2026-07-16.sql: Operation not permitted
```

Consequences: the 30-day retention has never run (which is why 0-byte files from June
are still present), and on two days the dump could not be moved into place — leftover
`2026-07-16.sql.tmp` and `2026-07-18.sql.tmp` are still sitting in the folder.

The 83 older `pg_dump: command not found` lines are the pre-2026-07-10 script, already
fixed here by hardcoding an absolute path.

### 6. The app never reads iCloud

`docs/superpowers/plans/2026-07-10-multi-machine-backup-sync.md` specs `POST /api/backup`,
`GET /api/backup/status`, `POST /api/backup/sync`, and a `~/.job-tracker-sync-state.json`
marker. **None of it was implemented.**

- `backend/src/routes/` has no `backup.ts`; `registerRoutes` (`backend/src/routes/index.ts:11`)
  wires only projects, tasks, time-entries, invoices, profile, expenses, docs.
- No marker file exists.
- No client UI.
- `git log --all --grep="backup\|sync"` finds nothing relevant.

So "the app pulls from iCloud" describes a plan, not shipped code.

### 7. Neither the script nor the scheduler is in this repo

```
$ git ls-files | grep -i "backup\|\.sh$"
(empty)
```

Both live outside version control:

- `~/job-tracker-backup.sh`
- `~/Library/LaunchAgents/com.job-tracker.backup.plist`

Pulling this repo on another machine therefore installs nothing. Each machine has its own
untracked, independently-drifted copy — which is how the two ended up in different states.

---

## Recovery — run these on the OTHER machine

### Step 1: Confirm it has the data

```bash
psql "postgresql://$USER@localhost:5432/job_tracker" \
  -c "select relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc;"
```

If these are all 0 too, stop — the data is somewhere else entirely (different database
name, different Postgres install, or a Docker volume) and needs a wider search before
anything is overwritten.

### Step 2: Determine which filename that machine owns

```bash
hostname -s
ls -l "$HOME/Library/Mobile Documents/com~apple~CloudDocs/job-tracker-backups/" | tail -5
launchctl list | grep job-tracker
tail -20 ~/Library/Logs/job-tracker-backup.log
```

Records whether that machine writes the plain name or the ` 2` name, and whether its job
is failing.

### Step 3: Take a real dump, under a non-colliding name

```bash
pg_dump "postgresql://$USER@localhost:5432/job_tracker" \
  > "$HOME/Library/Mobile Documents/com~apple~CloudDocs/job-tracker-backups/manual-$(hostname -s)-$(date +%F).sql"
```

Verify before trusting it — a successful exit code is exactly what has been lying to us:

```bash
grep -c "^COPY" "$HOME/.../manual-$(hostname -s)-$(date +%F).sql"   # expect ~10
ls -l "$HOME/.../manual-$(hostname -s)-$(date +%F).sql"             # expect >> 21.5K
```

If the file is ~21.5K it is schema-only and the dump is still wrong.

Consider AirDrop or `scp` in addition to iCloud — iCloud is the system that has been
failing, and a second copy costs nothing.

---

## Fix plan (after the data is safe)

Ordered. Do not start at the end — the read side is meaningless until real snapshots exist.

1. **Move the script into the repo** as `scripts/backup.sh`, with:
   - `pg_dump` resolved at runtime (`command -v`, then known Homebrew prefixes) instead of
     a hardcoded `/usr/local/opt/postgresql@18/bin/pg_dump`. The current path is an
     Intel-prefix location; a standard Apple Silicon Homebrew install puts it under
     `/opt/homebrew`, so the hardcoded path is a likely failure on the other machine.
   - `$(hostname -s)` in the filename, per the original design doc, ending the collisions.
   - **A non-empty-data assertion**, not just `[ -s file ]`. The existing size check passes
     happily on a schema-only dump — that is the specific reason this went unnoticed for
     months. Assert at least one populated `COPY` block.
   - The `find -delete` retention made non-fatal, so cleanup failure can't mask a
     successful dump behind exit 1.

2. **Add `scripts/install-backup.sh`** that generates the plist with the local repo path
   and loads it. The plist must live in `~/Library/LaunchAgents/` — launchd reads only from
   there — but it can point at the repo copy of the script, so the script itself stays
   version-controlled and updates on `git pull`.

3. **Grant Full Disk Access** to whatever runs the job (System Settings → Privacy &
   Security → Full Disk Access). Without it, launchd cannot write to
   `~/Library/Mobile Documents/`. Re-verify with `launchctl list | grep job-tracker`
   returning exit 0.

4. **Clean up** the 62 zero-byte files and the two stale `.tmp` files — only once a
   verified real backup exists.

5. **Then** build the read side from the 2026-07-10 plan: `/api/backup/status`,
   `/api/backup/sync`, marker file, UI.

---

## Notes

- The repo uses **npm workspaces** (`package.json` `workspaces`, `package-lock.json`).
  Dev command is `npm run dev`, not `pnpm dev`.
- `docker-compose.yml` describes a Postgres on 5432 with user/db `job_tracker`, but `.env`
  points at `postgresql://bdoggett@localhost:5432/job_tracker` — a Homebrew Postgres 18
  instance. The compose file appears to be a leftover from an earlier setup and does not
  reflect how the app currently runs. Worth deleting or reconciling.
