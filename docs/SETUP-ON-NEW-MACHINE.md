# Running job-tracker on another machine

**Written:** 2026-09-11, from `MacBook-Air` (the machine that holds the live data).

Follow this top to bottom on the *other* machine. It assumes you are restoring the
`2026-09-11` backup, which was verified restorable before this was written.

---

## Before you leave the machine that has the data

Two things do **not** travel through git and must be carried by hand:

### 1. `ENCRYPTION_KEY` — without this, import refuses to run

`.env` is gitignored, so the key is not in the repo. `profile.ein_encrypted` is
exported as ciphertext; import compares a fingerprint of the key and **aborts** on a
mismatch rather than restoring a profile row you could never decrypt.

On the machine with the data, print it and copy it somewhere you'll have access to
(password manager, note on your phone — not a chat window):

```bash
grep '^ENCRYPTION_KEY=' ~/code/job-tracker/.env
```

### 2. The backup archive

`~/job-tracker-backups/2026-09-11-MacBook-Air.tar.gz` (5.0 MB, 414 rows, includes
all 5 uploaded PDFs).

Copies exist in three places:
- `~/job-tracker-backups/` (local)
- `~/Library/Mobile Documents/com~apple~CloudDocs/job-tracker-backups/` (iCloud)
- `~/Documents/job-tracker-archive-safe/verified-2026-09-11-414rows.tar.gz`

iCloud is the convenient route, but see the **iCloud warning** at the bottom — do that
step early.

---

## On the other machine

### Step 1 — Prerequisites

```bash
node -v      # needs v20+; the source machine runs v24
psql -V      # any modern Postgres; the source machine runs 14.18
```

Archives carry **data only, not schema**, and are not tied to a Postgres version — the
schema comes from migrations. A different Postgres major version is fine.

If Postgres isn't installed: `brew install postgresql@14 && brew services start postgresql@14`

### Step 2 — Get the code

```bash
cd ~/code/job-tracker      # or wherever it lives
git checkout main
git pull
npm install
```

This repo uses **npm workspaces**. Do not use pnpm — there is a stray, non-functional
`pnpm-lock.yaml` in the root; ignore it.

### Step 3 — Make sure the database exists

```bash
psql -l | grep job_tracker || createdb job_tracker
```

### Step 4 — Create `.env`

```bash
cat > .env <<'EOF'
DATABASE_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/job_tracker
PORT=3300
ENCRYPTION_KEY=PASTE_THE_KEY_FROM_THE_OTHER_MACHINE
EOF
```

Replace both placeholders. `whoami` gives your username. **The `ENCRYPTION_KEY` must be
byte-identical to the source machine's** or Step 6 will refuse to import.

### Step 5 — Baseline the migration ledger

```bash
npm run db:baseline
```

Run this **even if you think the database is fresh** — it is idempotent and tells you
which situation you're in:

| It prints | Meaning | What to do |
|---|---|---|
| `no tables in the public schema` | Truly fresh database | Nothing; migrations will apply on boot |
| `Baselined N migrations` | Schema was built by `drizzle-kit push`, ledger was empty | Nothing; it just fixed itself |
| `already tracked` | Migrations already recorded | Nothing |

**Why this matters here:** your other machine already had a `job_tracker` database with
tables but zero rows. That is the signature of a `drizzle-kit push` schema — tables
present, empty ledger. Without baselining, auto-migrate replays from `0000`, and
`0001`'s `ALTER TABLE projects ADD COLUMN notes` fails on a column push already made,
and **the backend never boots.**

### Step 6 — Restore the data

```bash
npm run import -- ~/Library/Mobile\ Documents/com~apple~CloudDocs/job-tracker-backups/2026-09-11-MacBook-Air.tar.gz
```

If the file is in iCloud and hasn't downloaded yet, force it first:
`brctl download <path>` — or just open the folder in Finder and wait for the cloud icon
to clear. A dataless placeholder still reports its true size, so "it looks fine" is not
proof it's local.

Expect:

```
Imported 414 rows. Safety export of the previous state: ~/job-tracker-backups/pre-import/pre-import-....tar.gz
```

Import is a **whole-snapshot replace** — it deletes every row first. That's correct
here (the target is empty), and it snapshots whatever was there beforehand regardless.

If it aborts with an `ENCRYPTION_KEY` mismatch, Step 4's key is wrong. Fix it and rerun;
nothing was changed.

### Step 7 — Start it

```bash
npm run dev
```

Then open http://localhost:5275 and confirm you see **2 projects, 7 invoices**, and that
a project's Time Entries tab has data.

Or check from the terminal:

```bash
psql "postgresql://$(whoami)@localhost:5432/job_tracker" -c \
  "select 'projects',count(*) from projects union all select 'tasks',count(*) from tasks union all select 'time_entries',count(*) from time_entries union all select 'invoices',count(*) from invoices;"
```

Expected: projects 2, tasks 65, time_entries 78, invoices 7.

### Step 8 — Turn on nightly backups

```bash
./scripts/install-backup.sh
launchctl list | grep job-tracker      # want exit code 0, not 1
```

Then grant **Full Disk Access** (System Settings → Privacy & Security → Full Disk
Access) to whatever runs launchd jobs, so the iCloud copy step can write to
`~/Library/Mobile Documents/`. Without it the local backup still succeeds and the
iCloud copy reports a failure — by design, so a permission problem can't silently
produce nothing.

---

## iCloud warning — do this early

The **old, broken** backup job may still be installed on that machine. Its retention
step was:

```bash
find .../job-tracker-backups -mtime +30 -delete    # no hostname filter
```

In a *shared* iCloud folder that deletes **every** machine's backups once they pass 30
days — including the 2026-09-11 archive you are about to depend on.

Unload it before anything else:

```bash
launchctl list | grep job-tracker
launchctl unload ~/Library/LaunchAgents/com.job-tracker.backup.plist 2>/dev/null
```

The replacement installed in Step 8 prunes only `*-<hostname>.tar.gz`, so machines can
no longer delete each other's history.

---

## Known cosmetic issues (not errors)

- Every export prints two `Missing upload file:` warnings. Two `docs` rows reference
  PDFs that are already absent from disk on the source machine. Warnings, not failures —
  the backup is complete for everything that exists.
- `npm run typecheck` reports 3 backend and 2 client pre-existing errors in files
  unrelated to any of this. Tests pass; the app runs.

## If something goes wrong

Nothing here is destructive to the *source* data — that machine keeps its database and
its three archive copies. The worst case is that the other machine doesn't come up, and
you restore from the same archive again later.

Every import writes a pre-import snapshot to `~/job-tracker-backups/pre-import/` before
touching anything, so even a wrong-archive import is recoverable.
