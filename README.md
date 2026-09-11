# Lead Tracker

A small CRM for inbound leads: a public form and a partner webhook feed
leads in, and a signed-in team triages them through a pipeline (New →
Contacted → Closed) from a dashboard.

- **`api/`** — NestJS, PostgreSQL (TypeORM), sessions and rate limiting on
  Valkey.
- **`web/`** — Angular, standalone components.

See [`CLAUDE.md`](./CLAUDE.md) for architecture and conventions.

## Running it locally

Requires Docker, and Node 20+ for both apps.

```bash
# 1. Postgres + Valkey
docker compose up -d

# 2. API
cd api
cp .env.example .env   # fill in Google OAuth credentials, see below
npm install
npm run migration:run
npm run start:dev      # http://localhost:3000

# 3. Web app (separate terminal)
cd web
npm install
npm start               # http://localhost:4200
```

The public form is at `http://localhost:4200/`, the dashboard at
`http://localhost:4200/dashboard` (redirects to `/login` until you sign
in with Google).

### Google OAuth setup

The dashboard's only login is Google. To get a client ID/secret:

1. In the [Google Cloud Console](https://console.cloud.google.com/), create
   a project (or reuse one) and open **APIs & Services → OAuth consent
   screen**. Choose **External**, fill in the required fields, and add your
   own Google account as a test user (this keeps the app in "Testing" mode,
   which is fine — no Google review needed for personal/test use).
2. Under **APIs & Services → Credentials**, create an **OAuth client ID** of
   type **Web application**.
3. Add an authorized redirect URI for local dev:
   `http://localhost:3000/api/auth/google/callback`. Add the production
   one (see below) too once you know it.
4. Copy the client ID and secret into `api/.env` as `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`.
5. Set `ALLOWED_EMAILS` in `api/.env` to your own email (comma-separate
   more if needed) — anyone who completes the OAuth flow is only let into
   the dashboard if their email is on this list. Leave it unset and any
   Google account can sign in, which is fine for a first local test but
   not for anything actually deployed.

### Trying the webhook and rate limiting

```bash
# A lead via the webhook (needs the shared secret from .env)
curl -X POST http://localhost:3000/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: change-me-too" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","message":"Interested in a demo"}'

# Hit the public form's rate limit (5/min) — the 6th call in a minute gets a 429
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/leads \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test@example.com","message":"hi"}'
done
```

## How it's deployed

[`render.yaml`](./render.yaml) is a Render Blueprint covering the whole
stack: the API as a Node web service, a free Postgres database, a free Key
Value (Valkey) instance, and the Angular build as a static site.

1. Push this repo to GitHub, then in Render: **New → Blueprint**, point it
   at the repo. Render reads `render.yaml` and provisions all four
   resources.
2. In the API service's environment settings, fill in `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, and `ALLOWED_EMAILS` (all left blank in the
   blueprint on purpose — never committed, and the dashboard is wide open
   to any Google account until `ALLOWED_EMAILS` is set).
3. Once the API and static site have their real `onrender.com` URLs,
   update:
   - `GOOGLE_CALLBACK_URL` and `FRONTEND_URL` on the API service to match,
   - the matching redirect URI on the Google OAuth client,
   - `apiUrl` in `web/src/environments/environment.prod.ts` to match the
     API's URL, then push (Render redeploys the static site on push).
4. Redeploy the API service so the updated env vars take effect.

`SESSION_SECRET` and `WEBHOOK_SECRET` are generated automatically by
Render (`generateValue: true`) — no need to set those by hand.

## Notable decisions

- **Sessions, not JWT.** The dashboard is small and trusted; a session
  lets access be revoked server-side (delete the Redis key) rather than
  waiting out a token's lifetime. Valkey backs the session store.
- **Valkey does two real jobs**: sessions, and a hand-rolled fixed-window
  rate limiter (`INCR`/`EXPIRE` per route+IP) on the public form and the
  webhook — not just a cache sitting there decoratively.
- **CSV export streams.** `GET /api/leads/export.csv` pipes a TypeORM
  query-builder `.stream()` straight through a CSV transform into the
  response; the lead table is never held in memory as an array.
- **The webhook requires a shared secret** (`X-Webhook-Secret`) on top of
  rate limiting — not asked for explicitly, but a public ingestion
  endpoint with zero auth is an easy abuse vector.

## What I'd do next

- Full-text/trigram search (`pg_trgm`) instead of plain `ILIKE` — fine at
  this scale, wouldn't be at real volume.
- Cursor-based pagination instead of offset, once lists get long.
- A CI pipeline (lint + unit tests + build) on every push.
- More frontend test coverage — the backend has unit tests per feature,
  the Angular side currently only has the scaffold-level app test.
- Real end-to-end verification against deployed infra with a live Google
  test account, beyond the build/unit-test/manual-smoke-check level this
  was verified at during development.
- A managed allowlist (admin UI + DB table) instead of a comma-separated
  `ALLOWED_EMAILS` env var — fine for a small fixed team, not for one
  that changes often.
