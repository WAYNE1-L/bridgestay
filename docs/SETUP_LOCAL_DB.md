# Local Dev Database Setup (BridgeStay)

This guide gets a working local Postgres for BridgeStay using Docker, end‑to‑end.
It exists because round‑6 setup hit a `drizzle-kit push` enum‑ordering bug
(`type "property_type" does not exist`); the fix below uses `drizzle-kit migrate`
against the committed SQL files in `app/drizzle/`, which create enums first.

## Prerequisites

- Docker Desktop (Windows / macOS) running.
- Node + pnpm/npm (this repo uses pnpm 10, but `npx` works for one‑offs).
- Port `5432` free on the host. If you have a local Postgres service, stop it:
  - Windows: `Stop-Service postgresql-x64-17` (run elevated).
  - macOS:   `brew services stop postgresql@17`.

## 1. Start the Postgres container

```powershell
docker run -d `
  --name bridgestay-pg `
  -e POSTGRES_PASSWORD=devonly `
  -e POSTGRES_DB=bridgestay `
  -p 5432:5432 `
  postgres:16
```

If the container already exists from a previous setup, just start it:

```powershell
docker start bridgestay-pg
```

Verify it is up:

```powershell
docker exec bridgestay-pg pg_isready -U postgres
# expects: /var/run/postgresql:5432 - accepting connections
```

## 2. Configure `app/.env`

`app/.env` is git‑ignored. Create it with at least:

```ini
DATABASE_URL=postgres://postgres:devonly@localhost:5432/bridgestay
DEV_DEMO_MODE=true
JWT_SECRET=dev-secret-bridgestay-placeholder-32chars-min
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
# Optional, only needed for AI paste‑fill (R4):
# GEMINI_API_KEY=...
```

Sanity‑check the connection from Node:

```powershell
node -e "const {Client}=require('pg');const c=new Client({connectionString:'postgres://postgres:devonly@localhost:5432/bridgestay'});c.connect().then(()=>c.query('SELECT 1')).then(r=>{console.log('ok',r.rows);return c.end()}).catch(e=>{console.error(e);process.exit(1)})"
```

## 3. Run migrations (the right way)

Use `drizzle-kit migrate`, **not** `drizzle-kit push`.

`push` introspects the schema and emits CREATE TABLE statements before the
required `CREATE TYPE` statements, so any table referencing a `pgEnum` column
fails with `type "<enum>" does not exist` (PG error 42704).
The committed SQL in `app/drizzle/0000_*.sql` puts `CREATE TYPE` first, in the
correct order. `migrate` just executes those files in journal order.

`drizzle-kit` does **not** auto‑load `.env`. Export the URL inline:

```powershell
$env:DATABASE_URL = "postgres://postgres:devonly@localhost:5432/bridgestay"
cd app
npx drizzle-kit migrate
```

Bash equivalent:

```bash
DATABASE_URL=postgres://postgres:devonly@localhost:5432/bridgestay \
  npx --prefix ./app drizzle-kit migrate
```

Expected output:

```
Reading config file '.../app/drizzle.config.ts'
Using 'pg' driver for database querying
[✓] migrations applied successfully!
```

The `npm run db:migrate` script in `app/package.json` does the same thing
(it just shells out to `drizzle-kit migrate`); it still requires
`DATABASE_URL` in the calling shell.

## 4. Verify the schema

```powershell
docker exec bridgestay-pg psql -U postgres -d bridgestay -c "\dt"
```

You should see 13 tables:

```
 apartments | applications | documents | landlord_profiles | listing_reports
 messages   | notifications | payments | promotions | saved_apartments
 student_profiles | universities | users
```

Quick smoke INSERT/SELECT (no FK constraints in dev schema, so any
`landlordId` works):

```powershell
docker exec bridgestay-pg psql -U postgres -d bridgestay -c @'
INSERT INTO apartments ("landlordId", title, "propertyType", address, city, state, "zipCode", bedrooms, bathrooms, "monthlyRent", "securityDeposit", "availableFrom")
VALUES (1, 'Smoke Test Apt', 'apartment', '123 Test St', 'Salt Lake City', 'UT', '84112', 2, 1.5, 1500, 1500, NOW())
RETURNING id, title, "propertyType", "monthlyRent";
'@
```

Then clean up:

```powershell
docker exec bridgestay-pg psql -U postgres -d bridgestay -c "DELETE FROM apartments WHERE title = 'Smoke Test Apt';"
```

## 5. Day‑to‑day workflow

- Container lifecycle: `docker start bridgestay-pg` / `docker stop bridgestay-pg`.
- New schema change in `app/drizzle/schema.ts`:
  1. `cd app && npx drizzle-kit generate` — emits a new `NNNN_*.sql` file.
  2. `npx drizzle-kit migrate` — applies pending migrations in journal order.
- **Avoid `drizzle-kit push`** in this repo; the schema has 17 enums and push
  reliably hits the ordering bug. Always go through generate → migrate.
- Wipe the dev DB hard (rare): `docker exec bridgestay-pg psql -U postgres -d bridgestay -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"` then re‑run step 3.
- Open a psql shell: `docker exec -it bridgestay-pg psql -U postgres -d bridgestay`.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `type "property_type" does not exist` (42704) | Used `drizzle-kit push` against an empty DB | Use `drizzle-kit migrate` (this guide). |
| `DATABASE_URL is required to run drizzle commands` | Drizzle does not read `app/.env` | `$env:DATABASE_URL = "..."` (or `export DATABASE_URL=...`) before running. |
| `connection refused on 5432` | Container not running, or host Postgres still bound | `docker start bridgestay-pg`; stop the host service. |
| `password authentication failed for user "postgres"` | Container created with a different password | Recreate: `docker rm -f bridgestay-pg`, then re‑run step 1. |
| `relation "apartments" does not exist` after migrate appeared to succeed | Migrated against the wrong DB (URL pointed at host's Postgres) | Confirm `\dt` against the container, re‑check `DATABASE_URL`. |
