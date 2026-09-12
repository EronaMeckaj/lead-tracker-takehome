# Lead Tracker

A small CRM for inbound leads: a public form and a partner webhook feed
leads in, and a signed-in team triages them through a pipeline (New →
Contacted → Closed) from a dashboard.

- **`api/`** — NestJS, PostgreSQL (TypeORM), sessions and rate limiting on
  Valkey.
- **`web/`** — Angular, standalone components.

See [`CLAUDE.md`](./CLAUDE.md) for architecture and conventions.

## Live

- **App**: https://lead-tracker-web-t370.onrender.com
- **API**: https://lead-tracker-api-p27s.onrender.com/api (health check at `/api/health`)

Verified directly against this deployment: submitting a lead through the
public form, signing in with Google, moving a lead through pipeline
stages (both the board's drag-and-drop and the list view's dropdown),
and downloading the CSV export.

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
   Google account can sign in. The live deployment above intentionally
   leaves it unset, so it can actually be evaluated by an account this
   repo doesn't know in advance — set it once that's no longer a
   concern.

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
Value (Valkey) instance, and the Angular build as a static site. This is
a record of what it actually took to get it live, not just the intended
steps — three things broke on the first real deploy, all fixed in
`render.yaml` now so they shouldn't recur:

1. Push this repo to GitHub, then in Render: **New → Blueprint**, point it
   at the repo. Render reads `render.yaml` and provisions all four
   resources.
2. **Fill in the blank secrets when Render prompts for them**:
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (left blank in the
   blueprint on purpose — never committed). Leave `ALLOWED_EMAILS` empty
   unless you want to restrict sign-in immediately (unset means any
   Google account can sign in — see the OAuth section above). **Gotcha
   we hit**: if this step gets skipped, the API doesn't fail to build —
   it builds fine and then crashes on boot with `Configuration key
   "GOOGLE_CLIENT_ID" does not exist`. If that happens, check the
   service's Environment tab; the sync-false fields may simply never
   have been saved.
3. **Don't assume the plain service names from `render.yaml` are what
   you actually got.** If `lead-tracker-api` or `lead-tracker-web` are
   already taken account-wide, Render silently appends a random suffix —
   ours came out as `lead-tracker-api-p27s` and `lead-tracker-web-t370`.
   Check each service's real URL before wiring anything else together.
4. With the real URLs in hand, update:
   - `GOOGLE_CALLBACK_URL` and `FRONTEND_URL` on the API service to match,
   - the matching redirect URI on the Google OAuth client — an exact
     match, scheme included; a mismatch here fails at Google's own
     consent screen with `redirect_uri_mismatch`, not an app error,
   - `apiUrl` in `web/src/environments/environment.prod.ts` to match the
     API's URL, then push (Render redeploys the static site on push).
5. Redeploy the API service so the updated env vars take effect.

Two build-time issues, both already fixed in the checked-in
`render.yaml`:

- **Node version.** Render's default build image didn't satisfy the
  Angular CLI's minimum supported version. Both services now pin
  `NODE_VERSION` explicitly to match local dev (`22.22.3`).
- **Dev dependencies during the build.** `NODE_ENV=production` (needed
  at runtime) is also visible during the build step, and a plain `npm
  install` respects it by skipping `devDependencies` — which is exactly
  where `@nestjs/cli` and `typescript` live. `nest build` needs both, so
  the API's build failed outright with `nest: not found` until the
  build command explicitly forced dev deps in
  (`npm install --include=dev`).

`SESSION_SECRET` and `WEBHOOK_SECRET` are generated automatically by
Render (`generateValue: true`) — no need to set those by hand.

## Decisions and trade-offs

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

## What I'd do next / improve with more time

- Full-text/trigram search (`pg_trgm`) instead of plain `ILIKE` — fine at
  this scale, wouldn't be at real volume.
- Cursor-based pagination instead of offset, once lists get long.
- A CI pipeline (lint + unit tests + build) on every push.
- Automated e2e coverage of a real Google login. `api/test/*.e2e-spec.ts`
  runs the full lead/webhook/rate-limit flow against real Postgres and
  Valkey, but authenticated routes there run with `SessionAuthGuard`
  overridden rather than a live OAuth round trip, since that can't be
  automated without real Google credentials in CI. The guard's own
  reject-when-anonymous behavior is covered separately, unmocked.
- A managed allowlist (admin UI + DB table) instead of a comma-separated
  `ALLOWED_EMAILS` env var — fine for a small fixed team, not for one
  that changes often.
