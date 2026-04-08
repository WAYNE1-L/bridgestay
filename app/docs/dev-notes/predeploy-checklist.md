# BridgeStay — Pre-Deploy Checklist

> **Target environment:** Render · Node 22 · MySQL (PlanetScale or compatible)
> Generated: 2026-04-08

---

## 1. Required Environment Variables

Set all of these in the Render dashboard (Environment → Add Environment Variable) before first deploy.

- [ ] `NODE_ENV` = `production`
- [ ] `DATABASE_URL` — MySQL connection string (`mysql://user:pass@host:port/dbname`)
- [ ] `JWT_SECRET` — long random string (≥ 32 chars); used for session cookie signing
- [ ] `OAUTH_SERVER_URL` — Manus OAuth server base URL
- [ ] `VITE_APP_ID` — OAuth app ID registered with the OAuth provider
- [ ] `VITE_OAUTH_PORTAL_URL` — OAuth portal URL (login redirect target)
- [ ] `OWNER_OPEN_ID` — first admin user's `openId` (see bootstrap step §5 below)
- [ ] `GEMINI_API_KEY` — Google AI Studio key for the AI import feature

### Optional (features degrade gracefully when absent)

- [ ] `PORT` — Render sets this automatically; omit unless overriding
- [ ] `STRIPE_SECRET_KEY` — required for payment flows
- [ ] `STRIPE_WEBHOOK_SECRET` — required for Stripe webhook signature validation
- [ ] `VITE_GOOGLE_MAPS_API_KEY` — required for map views
- [ ] `VITE_ANALYTICS_ENDPOINT` — analytics ingest URL
- [ ] `VITE_ANALYTICS_WEBSITE_ID` — analytics site ID
- [ ] `VITE_SUPABASE_URL` — Supabase project URL (if using Supabase storage)
- [ ] `VITE_SUPABASE_ANON_KEY` — Supabase anon key

### Hardcoded in render.yaml (do not override)

- `DEV_DEMO_MODE` = `false` — enforced at the service level; overriding to `true` would bypass OAuth in production

---

## 2. Database Migration

Run migrations against the production database **before** starting the service.
The migration runner reads `DATABASE_URL` from the environment.

```bash
# Set production DATABASE_URL in your shell first:
export DATABASE_URL="mysql://user:pass@host:port/bridgestay"

cd app
pnpm db:migrate
```

> ⚠️ **Migration gap — human decision required before running:**
>
> The drizzle journal tracks migrations through **`0004_nervous_psynapse`** (idx 4).
> Two SQL files exist in `drizzle/` that are **not recorded in the journal**:
>
> | File | In journal? | Note |
> |------|-------------|------|
> | `0004_phase3_sublease.sql` | ❌ No | **idx collision** — journal already has a different `0004_*` entry |
> | `0005_admin_listing_workflow.sql` | ❌ No | Untracked by drizzle-kit |
>
> **Do not run `pnpm db:migrate` until you decide:**
> - If these SQL files contain schema that is already applied to the DB → update the journal to reflect that
> - If they represent pending changes → regenerate snapshots with `pnpm db:generate` and add them to the journal properly
> - **Running `pnpm db:migrate` as-is will NOT apply these two files** (drizzle only runs journal-tracked entries)

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
