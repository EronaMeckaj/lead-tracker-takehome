# Lead Tracker

Lead Tracker is a small CRM for inbound leads: a public form and a partner
webhook feed leads in, and a signed-in team triages them through a pipeline
(New → Contacted → Closed) from a dashboard.

## Architecture

Two independent apps, no shared monorepo tooling:

- `api/` — NestJS (TypeScript). Owns the data model, auth, rate limiting,
  and CSV export. Talks to Postgres via TypeORM and to Valkey for sessions
  and rate-limit counters.
- `web/` — Angular (standalone components, latest stable). Two surfaces:
  the public lead form and the authenticated dashboard.

They communicate over a versioned REST API (`/api/...`) and nothing else —
no shared types package, no server-rendering coupling. Each app can be built,
tested, and deployed on its own.

## Data stores

- **PostgreSQL** — system of record for leads and users. Migrations live in
  `api/src/migrations`; never hand-edit the schema in a deployed environment.
- **Valkey** — used for two real things, not as a cache-flavored decoration:
  1. Dashboard session storage (`connect-redis`-style session store).
  2. Sliding-window rate limiting on the public form and the webhook endpoint.

## Conventions

- Commits follow Conventional Commits (`feat`, `fix`, `chore`, `docs`, `test`,
  `refactor`), imperative mood, scoped where it helps (`feat(leads): ...`).
  Keep commits to one logical change each — this repo's history is meant to
  be read, not squashed.
- Backend: NestJS module-per-domain (`leads`, `auth`, `webhooks`), DTOs
  validated with `class-validator`, TypeORM entities/migrations checked in.
- Frontend: standalone Angular components, signals for local state, one
  feature area per route (`public-form`, `dashboard`).
- No secrets in the repo. Local config comes from `.env` (see `.env.example`
  in each app); deployed config comes from the hosting platform's env vars.

## Local development

Requires Docker for Postgres + Valkey, and Node 20+ for both apps.

```bash
docker compose up -d        # Postgres on 5432, Valkey on 6379
cd api && npm install && npm run start:dev    # http://localhost:3000
cd web && npm install && npm start            # http://localhost:4200
```

Copy `.env.example` to `.env` in `api/` before starting it — it needs DB and
Valkey connection strings plus Google OAuth client credentials.

## Testing

- `api`: `npm test` (unit) and `npm run test:e2e` (Nest's e2e harness against
  a real Postgres/Valkey via `docker-compose.yml`).
- `web`: `npm test` (Karma/Jasmine unit tests).

Run the relevant suite before committing a change to that app.
