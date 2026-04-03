/**
 * Plain ESM script (no tsx/esbuild) — runs with: node scripts/remove-dev-mock-listings.mjs
 * Requires mysql2 and dotenv already installed in app/node_modules.
 */
import { createRequire } from "module";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

const require = createRequire(import.meta.url);
const mysql2 = require("mysql2/promise");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set — aborting");
  process.exit(1);
}

const connection = await mysql2.createConnection(DATABASE_URL);

// ── Step 1: preview rows that will be deleted ─────────────────────────────
const [devMockRows] = await connection.execute(
  "SELECT id, title, createdAt FROM apartments WHERE title LIKE ? ORDER BY createdAt",
  ["[DEV MOCK]%"]
);

if (devMockRows.length === 0) {
  console.log("✅  No [DEV MOCK] rows found in the apartments table — nothing to delete.");
  await connection.end();
  process.exit(0);
}

console.log(`\nFound ${devMockRows.length} [DEV MOCK] row(s) to delete:\n`);
for (const row of devMockRows) {
  console.log(`  id=${row.id}  title="${row.title}"  created=${row.createdAt}`);
}

const apartmentIds = devMockRows.map((row) => row.id);
const placeholders = apartmentIds.map(() => "?").join(",");

// Preview dependent rows so we don't leave app-level orphans behind.
const dependentTables = [
  { table: "saved_apartments", column: "apartmentId" },
  { table: "applications", column: "apartmentId" },
  { table: "payments", column: "apartmentId" },
  { table: "messages", column: "apartmentId" },
];

console.log("\nDependent rows referencing those apartment ids:");
for (const ref of dependentTables) {
  const [[{ count }]] = await connection.execute(
    `SELECT COUNT(*) AS count FROM ${ref.table} WHERE ${ref.column} IN (${placeholders})`,
    apartmentIds
  );
  console.log(`  ${ref.table}: ${count}`);
}

// ── Step 2: delete dependent rows first, then target apartments ───────────
for (const ref of dependentTables) {
  const [result] = await connection.execute(
    `DELETE FROM ${ref.table} WHERE ${ref.column} IN (${placeholders})`,
    apartmentIds
  );
  console.log(`🧹  Deleted ${result.affectedRows} row(s) from ${ref.table}.`);
}

const [deleteResult] = await connection.execute(
  `DELETE FROM apartments WHERE id IN (${placeholders})`,
  apartmentIds
);

console.log(`\n🗑️   Deleted ${deleteResult.affectedRows} row(s).`);

// ── Step 3: confirm total remaining ───────────────────────────────────────
const [[{ remaining }]] = await connection.execute(
  "SELECT COUNT(*) AS remaining FROM apartments"
);
console.log(`✅  Remaining apartments in DB: ${remaining}`);

// ── Step 4: verify zero [DEV MOCK] rows remain ────────────────────────────
const [[{ leftovers }]] = await connection.execute(
  "SELECT COUNT(*) AS leftovers FROM apartments WHERE title LIKE ?",
  ["[DEV MOCK]%"]
);

if (leftovers > 0) {
  console.error(`⚠️  ${leftovers} [DEV MOCK] row(s) still remain — check manually.`);
} else {
  console.log("✅  Zero [DEV MOCK] rows remain.");
}

await connection.end();
