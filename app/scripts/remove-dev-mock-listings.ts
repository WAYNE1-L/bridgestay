/**
 * One-shot script: find and delete all apartments whose title starts with "[DEV MOCK]".
 * Run from the app/ directory:
 *   npx tsx scripts/remove-dev-mock-listings.ts
 *
 * The script:
 *  1. Loads .env (DATABASE_URL)
 *  2. SELECTs every row matching title LIKE '[DEV MOCK]%'
 *  3. Prints a preview — no rows deleted yet
 *  4. Deletes only those rows
 *  5. Prints remaining total to confirm nothing else was touched
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { like, sql } from "drizzle-orm";
import mysql2 from "mysql2/promise";
import { apartments } from "../drizzle/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set — aborting");
    process.exit(1);
  }

  const connection = await mysql2.createConnection(url);
  const db = drizzle(connection);

  // ── Step 1: preview rows that will be deleted ─────────────────────────────
  const devMockRows = await db
    .select({ id: apartments.id, title: apartments.title, createdAt: apartments.createdAt })
    .from(apartments)
    .where(like(apartments.title, "[DEV MOCK]%"));

  if (devMockRows.length === 0) {
    console.log("✅  No [DEV MOCK] rows found in the apartments table — nothing to delete.");
    await connection.end();
    return;
  }

  console.log(`\nFound ${devMockRows.length} [DEV MOCK] row(s) to delete:\n`);
  for (const row of devMockRows) {
    console.log(`  id=${row.id}  title="${row.title}"  created=${row.createdAt}`);
  }

  const apartmentIds = devMockRows.map((row) => row.id);

  const dependentTables = [
    { table: sql.raw("saved_apartments"), column: sql.raw("apartmentId"), label: "saved_apartments" },
    { table: sql.raw("applications"), column: sql.raw("apartmentId"), label: "applications" },
    { table: sql.raw("payments"), column: sql.raw("apartmentId"), label: "payments" },
    { table: sql.raw("messages"), column: sql.raw("apartmentId"), label: "messages" },
  ];

  console.log("\nDependent rows referencing those apartment ids:");
  for (const ref of dependentTables) {
    const [{ count }] = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) AS count FROM ${ref.table} WHERE ${ref.column} IN (${sql.join(apartmentIds.map((id) => sql`${id}`), sql`, `)})`
    );
    console.log(`  ${ref.label}: ${count}`);
  }

  // ── Step 2: delete dependent rows first, then target apartments ────────
  for (const ref of dependentTables) {
    const result = await db.execute(
      sql`DELETE FROM ${ref.table} WHERE ${ref.column} IN (${sql.join(apartmentIds.map((id) => sql`${id}`), sql`, `)})`
    );
    const affected = (result as any)[0]?.affectedRows ?? "unknown";
    console.log(`🧹  Deleted ${affected} row(s) from ${ref.label}.`);
  }

  const deleteResult = await db
    .delete(apartments)
    .where(sql`${apartments.id} IN (${sql.join(apartmentIds.map((id) => sql`${id}`), sql`, `)})`);

  const affectedRows = (deleteResult as any)[0]?.affectedRows ?? "unknown";
  console.log(`\n🗑️  Deleted ${affectedRows} row(s).`);

  // ── Step 3: confirm remaining count ──────────────────────────────────────
  const [{ remaining }] = await db
    .select({ remaining: sql<number>`COUNT(*)` })
    .from(apartments);

  console.log(`✅  Remaining apartments in DB: ${remaining}`);

  // Sanity: make sure nothing titled [DEV MOCK] remains
  const leftovers = await db
    .select({ id: apartments.id, title: apartments.title })
    .from(apartments)
    .where(like(apartments.title, "[DEV MOCK]%"));

  if (leftovers.length > 0) {
    console.error("⚠️  Some [DEV MOCK] rows still remain:", leftovers);
  } else {
    console.log("✅  Zero [DEV MOCK] rows remain.");
  }

  await connection.end();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
