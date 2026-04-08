# BridgeStay — Pre-Deploy Checklist

> **Target environment:** Render · Node 22 · PostgreSQL
> Generated: 2026-04-08

---

## 1. Required Environment Variables

Set all of these in the Render dashboard (Environment → Add Environment Variable) before first deploy.

- [ ] `NODE_ENV` = `production`
- [ ] `DATABASE_URL` — PostgreSQL connection string (`postgres://user:pass@host:port/dbname`)
- [ ] `JWT_SECRET` — long random string (≥ 32 chars); used for session cookie signing
- [ ] `GOOGLE_CLIENT_ID` — Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- [ ] `APP_URL` — public app base URL
- [ ] `OWNER_OPEN_ID` — first admin user's `openId` (see bootstrap step §5 below)
- [ ] `GEMINI_API_KEY` — Google AI Studio key for the AI import feature

### Optional (features degrade gracefully when absent)

- [ ] `PORT` — Render sets this automatically; omit unless overriding
- [ ] `STRIPE_SECRET_KEY` — required for payment flows
- [ ] `STRIPE_WEBHOOK_SECRET` — required for Stripe webhook signature validation
- [ ] `VITE_GOOGLE_MAPS_API_KEY` — required for map views
- [ ] `VITE_ANALYTICS_ENDPOINT` — analytics ingest URL
- [ ] `VITE_ANALYTICS_WEBSITE_ID` — analytics site ID

### Hardcoded in render.yaml (do not override)

- `DEV_DEMO_MODE` = `false` — enforced at the service level for production deployments

---

## 2. Database Migration

Generate and review migrations against the PostgreSQL schema before applying them to a real database.
The migration runner reads `DATABASE_URL` from the environment.

```bash
# Set production DATABASE_URL in your shell first:
export DATABASE_URL="postgres://user:pass@host:port/bridgestay"

cd app
pnpm db:generate
```

> Do not run `pnpm db:migrate` or `pnpm db:push` against production until the new PostgreSQL migration set has been reviewed and approved.

---

## 3. Smoke Test URLs

After the service is up, hit each URL and confirm expected behavior:

| URL | Expected | Check |
|-----|----------|-------|
| `https://bridgestay.onrender.com/` | Homepage renders, language toggle works | - [ ] |
| `https://bridgestay.onrender.com/healthz` | `{"status":"ok","ts":<unix_ms>}` | - [ ] |
| `https://bridgestay.onrender.com/apartments` | Listings page renders | - [ ] |
| `https://bridgestay.onrender.com/admin/import` | Redirects to login / returns 401 (must NOT be accessible without auth) | - [ ] |

---

## 4. Rollback Triggers

Roll back immediately (redeploy previous commit) if any of the following occur post-deploy:

- [ ] `/healthz` returns non-200 or `{"status":"ok"}` is absent
- [ ] Any page returns a 500 that is not auth-related
- [ ] `DATABASE_URL` connection errors appear in Render logs within 60 s of startup
- [ ] OAuth callback (`/api/oauth/callback`) returns 500 (503 is acceptable if OAuth keys are intentionally absent)
- [ ] The homepage fails to load assets (CSS/JS 404s indicate a broken Vite build)
- [ ] Admin or import UI is reachable by a logged-out user (security regression)

---

## 5. OWNER_OPEN_ID Bootstrap

The first admin account must be seeded **before** anyone logs in, or the admin panel will be inaccessible.

```
1. Deploy the service with OWNER_OPEN_ID temporarily set to a placeholder ("bootstrap").
2. Have the intended admin user log in via OAuth (this creates their user row).
3. Connect to the production DB and run:

   SELECT openId FROM users WHERE email = '<admin-email>';

4. Copy the returned openId value.
5. In Render dashboard → Environment, update OWNER_OPEN_ID to that value.
6. Trigger a manual redeploy so the server re-reads the env var.
7. Verify the admin user can reach /admin/import.
```

> The server checks `OWNER_OPEN_ID` at runtime in `getMissingProductionEnv()`.
> If it is blank, the server will refuse to start in production mode.

---

## 6. Final Pre-Deploy Sign-off

- [ ] All required env vars set in Render dashboard
- [ ] Migration gap resolved (see §2)
- [ ] `pnpm db:migrate` run successfully against production DB
- [ ] `/healthz` returns 200 on first health check after deploy
- [ ] All four smoke test URLs pass
- [ ] `OWNER_OPEN_ID` bootstrap complete and admin access verified
- [ ] `DEV_DEMO_MODE` confirmed `false` in Render environment panel
