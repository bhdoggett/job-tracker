# Job Tracker

Personal project and time tracking tool for freelancers. Track projects, tasks, and hours — then generate invoices.

## Requirements

- [Node.js](https://nodejs.org/) 20+
- [npm](https://docs.npmjs.com/) 10+
- PostgreSQL 14+ — either local (Homebrew) or via Docker

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd job-tracker
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials (see the two options below).

### 3. Start PostgreSQL

**Option A — Local Postgres (Homebrew on macOS)**

```bash
brew install postgresql@14
brew services start postgresql@14
psql -d postgres -c "CREATE DATABASE job_tracker;"
```

Set your `.env`:
```
DATABASE_URL=postgresql://YOUR_MACOS_USERNAME@localhost:5432/job_tracker
PORT=3001
```

**Option B — Docker**

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up -d
```

Set your `.env`:
```
DATABASE_URL=postgresql://job_tracker:job_tracker@localhost:5432/job_tracker
PORT=3001
```

The Docker Compose file starts Postgres only — the app itself runs natively.

### 4. Run migrations

```bash
npm run db:migrate
```

### 5. Start the app

```bash
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173

## Database commands

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |
| `npm run db:push` | Push schema directly without a migration file (dev only) |

## Stack

- **Frontend:** Vite, React, TypeScript, CSS Modules
- **Backend:** Hono, TypeScript
- **Database:** PostgreSQL, Drizzle ORM
- **Monorepo:** npm workspaces
