# Take-Home Challenge: Lead Tracker

Build and deploy a full-stack lead tracker. We're looking for a tightly scoped,
real application — deployed, working, and built the way you'd build for
production.

We respect your time: aim for **6–8 focused hours**. If you're going well past
that, cut scope and tell us what you'd have done next — honest scoping is part
of what we're evaluating.

## What to build

### 1. Public lead form
- One public page with a form (name, email, message — or similar) that creates a lead.
- No auth required to submit.

### 2. Leads dashboard (auth required)
- List leads with search.
- Move leads through 3 pipeline stages (e.g. New → Contacted → Closed).

### 3. One integration: Google OAuth
- "Sign in with Google" as the login for the dashboard.
- Free Google Cloud credentials are fine; document the setup in your README.

### 4. Required stack
- **Frontend and backend as separate apps** (your choice of languages/frameworks).
- **PostgreSQL** for persistent data.
- **Valkey** (or Redis-compatible) used for something real — e.g. sessions, or
  rate-limiting the public form. Decorative usage doesn't count.

### 5. Deploy it
- Live URL on a free tier. Any works; **Render** covers the whole stack
  (web services + Postgres + Key Value), or mix e.g. Vercel + Koyeb + Neon + Upstash.
- Heads up: Fly.io and Railway no longer have real free tiers.

## Deliverables

1. **Live URL** we can open and use (we'll submit a lead and log in).
2. **This repo, forked or cloned**, with your source code.
3. **README** covering:
   - How to run it locally (ideally `docker compose up` for Postgres/Valkey).
   - How you deployed it.
   - What you'd do next with more time (a short list is enough).

## What we evaluate

- Does it work, end to end, at the live URL?
- Sensible data model and API design.
- Real (not decorative) use of Postgres and Valkey.
- Clear README and reasonable git history.
- Honest scoping — a tight scope done well beats a broad scope half-done.

## Questions?

Email us — asking good questions is a positive signal, not a negative one.
