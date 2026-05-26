# Job Tracker

Personal project and time tracking tool for freelancers. Track projects, tasks, and hours — then generate invoices.

## Features

- **Projects** — track clients, rates (hourly or fixed), and status
- **Tasks** — sortable table across all projects, or filtered per-project with the same UI
- **Time Entries** — log hours per project, associate with specific tasks
- **Timesheets** — weekly view of logged hours across projects
- **Expenses** — track project-related costs with category tagging
- **Mileage** — log trips with from/to addresses; driving distance is auto-calculated via OpenRouteService and multiplied by the IRS standard mileage rate ($0.70/mi for 2026)
- **Invoices** — generate invoices from logged time and expenses
- **Notes** — rich-text notes panel per project
- **Business & Profile** — store your business info, default tax rate, and payment instructions used on invoices

## Requirements

- [Node.js](https://nodejs.org/) 20+
- [npm](https://docs.npmjs.com/) 10+
- PostgreSQL 14+ — either local (Homebrew) or via Docker
- [OpenRouteService API key](https://openrouteservice.org/dev/#/login) — free, no credit card required (needed for mileage route calculation)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/bhdoggett/job-tracker.git
cd job-tracker
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials (see the two options below).

#### ORS API key (required for mileage)

Mileage route calculation uses [OpenRouteService](https://openrouteservice.org/dev/#/login). Sign up for a free account (no credit card), copy your API key, and add it to `client/.env`:

```bash
echo "VITE_ORS_API_KEY=your_key_here" > client/.env
```

Without this key the mileage form still works — the Calculate Route button is disabled, but you can type miles in manually.

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
- **Monorepo:** npm workspaces (`client`, `backend`, `packages/shared`)

## Project structure

```
client/src/
  components/     # Shared UI — TasksTable, Badge, Button, Modal, etc.
  pages/          # One file per route
  api/            # Typed fetch wrappers per resource
backend/src/
  routes/         # Hono route handlers
  db/
    schema/       # Drizzle table definitions
    migrations/   # Generated SQL migrations
packages/shared/  # Types shared between frontend and backend
```
