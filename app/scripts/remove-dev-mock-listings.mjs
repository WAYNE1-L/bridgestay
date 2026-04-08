/**
 * Plain ESM script (no tsx/esbuild) — runs with: node scripts/remove-dev-mock-listings.mjs
 * Requires pg already installed in app/node_modules.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Manual .env loader (avoids needing dotenv/config via tsx) ─────────────
const envPath = resolve(__dirname, "../.env");
const envLines = readFileSync(envPath, "utf8").split("\n");
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim();
  if (key && val && !process.env[key]) process.env[key] = val;
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set — aborting");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

// ── Step 1: preview rows that will be deleted ─────────────────────────────
const devMockResult = await pool.query(
  "SELECT id, title, \"createdAt\" FROM apartments WHERE title LIKE $1 ORDER BY \"createdAt\"",
  ["[DEV MOCK]%"]
);
const devMockRows = devMockResult.rows;

if (devMockRows.length === 0) {
  console.log("✅  No [DEV MOCK] rows found in the apartments table — nothing to delete.");
  await pool.end();
  process.exit(0);
}

console.log(`\nFound ${devMockRows.length} [DEV MOCK] row(s) to delete:\n`);
for (const row of devMockRows) {
  console.log(`  id=${row.id}  title="${row.title}"  created=${row.createdAt}`);
}

const apartmentIds = devMockRows.map((row) => row.id);
const placeholders = apartmentIds.map((_, index) => `$${index + 1}`).join(",");

// Preview dependent rows so we don't leave app-level orphans behind.
const dependentTables = [
  { table: "saved_apartments", column: "apartmentId" },
  { table: "applications", column: "apartmentId" },
  { table: "payments", column: "apartmentId" },
  { table: "messages", column: "apartmentId" },
];

console.log("\nDependent rows referencing those apartment ids:");
for (const ref of dependentTables) {
  const countResult = await pool.query(
    `SELECT COUNT(*) AS count FROM ${ref.table} WHERE "${ref.column}" IN (${placeholders})`,
    apartmentIds
  );
  const count = Number(countResult.rows[0]?.count ?? 0);
  console.log(`  ${ref.table}: ${count}`);
}

// ── Step 2: delete dependent rows first, then target apartments ───────────
for (const ref of dependentTables) {
  const result = await pool.query(
    `DELETE FROM ${ref.table} WHERE "${ref.column}" IN (${placeholders})`,
    apartmentIds
  );
  console.log(`🧹  Deleted ${result.rowCount ?? 0} row(s) from ${ref.table}.`);
}

const deleteResult = await pool.query(
  `DELETE FROM apartments WHERE id IN (${placeholders})`,
  apartmentIds
);

console.log(`\n🗑️   Deleted ${deleteResult.rowCount ?? 0} row(s).`);

// ── Step 3: confirm total remaining ───────────────────────────────────────
const remainingResult = await pool.query(
  "SELECT COUNT(*) AS remaining FROM apartments"
);
const remaining = Number(remainingResult.rows[0]?.remaining ?? 0);
console.log(`✅  Remaining apartments in DB: ${remaining}`);

// ── Step 4: verify zero [DEV MOCK] rows remain ────────────────────────────
const leftoversResult = await pool.query(
  "SELECT COUNT(*) AS leftovers FROM apartments WHERE title LIKE $1",
  ["[DEV MOCK]%"]
);
const leftovers = Number(leftoversResult.rows[0]?.leftovers ?? 0);

if (leftovers > 0) {
  console.error(`⚠️  ${leftovers} [DEV MOCK] row(s) still remain — check manually.`);
} else {
  console.log("✅  Zero [DEV MOCK] rows remain.");
}

await pool.end();
