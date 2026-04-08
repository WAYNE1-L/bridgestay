import { drizzle } from "drizzle-orm/mysql2";
import { mysqlTable, int, mysqlEnum, text, timestamp } from "drizzle-orm/mysql-core";
import { eq, sql } from "drizzle-orm";

const listingReports = mysqlTable("listing_reports", {
  id: int("id").autoincrement().primaryKey(),
  apartmentId: int("apartmentId").notNull(),
  reason: mysqlEnum("reason", ["unavailable", "wrong_details", "suspicious", "other"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

const DB_URL = process.env.DATABASE_URL;

async function main() {
  if (!DB_URL) {
    console.error("DATABASE_URL is required for the smoke test.");
    process.exit(1);
  }

  console.log("Connecting to:", DB_URL.replace(/:[^@]+@/, ':***@'));
  const db = drizzle(DB_URL);

  // Phase A: Insert a test apartment via raw SQL (matching actual table schema)
  console.log("\n=== Phase A: Insert test apartment ===");
  const aptInsert = await db.execute(sql`
    INSERT INTO apartments (landlordId, title, propertyType, address, city, state, zipCode, bedrooms, bathrooms, monthlyRent, securityDeposit, nearbyUniversities, availableFrom, status)
    VALUES (9999, 'Smoke Test Apt', 'apartment', '123 Test St', 'Salt Lake City', 'UT', '84101', 2, 1.0, 1200.00, 500.00, ${JSON.stringify([
      "University of Utah",
      "Westminster University",
    ])}, NOW(), 'active')
  `);
  const aptId = aptInsert[0].insertId;
  console.log("✓ Apartment inserted, ID:", aptId);

  // Phase B: Insert listing reports for all 4 reason enums
  console.log("\n=== Phase B: Insert listing reports ===");
  const reasons = ["unavailable", "wrong_details", "suspicious", "other"];
  for (const reason of reasons) {
    const r = await db.insert(listingReports).values({
      apartmentId: aptId,
      reason,
      notes: reason === "unavailable" ? "This listing appears to have been taken down already." : null,
    });
    console.log("  ✓ reason='" + reason + "' → ID:" + r[0].insertId);
  }

  // Phase C: Verify report persistence
  console.log("\n=== Phase C: Verify report persistence ===");
  const rows = await db.select().from(listingReports).where(eq(listingReports.apartmentId, aptId));
  console.log("  Found " + rows.length + " reports for apartment " + aptId);

  let allPassed = true;
  const checks = [
    ["4 reports inserted", rows.length === 4],
    ["first report reason is unavailable", rows[0].reason === "unavailable"],
    ["first report has notes", rows[0].notes && rows[0].notes.includes("taken down")],
    ["all reasons present", new Set(rows.map(r => r.reason)).size === 4],
    ["all createdAt set", rows.every(r => r.createdAt instanceof Date)],
    ["all IDs positive", rows.every(r => r.id > 0)],
  ];
  for (const [label, ok] of checks) {
    console.log("  " + (ok ? "✓" : "✗") + " " + label);
    if (!ok) allPassed = false;
  }

  // Phase D: Verify nearbyUniversities round-trip
  console.log("\n=== Phase D: Verify nearbyUniversities ===");
  const aptRows = await db.execute(sql`SELECT id, title, nearbyUniversities FROM apartments WHERE id = ${aptId}`);
  const apt = aptRows[0][0];
  console.log("  Raw type:", typeof apt.nearbyUniversities);
  const unis = typeof apt.nearbyUniversities === "string"
    ? JSON.parse(apt.nearbyUniversities)
    : apt.nearbyUniversities;
  console.log("  Parsed:", JSON.stringify(unis));
  const uniChecks = [
    ["is array", Array.isArray(unis)],
    ["has 2 entries", unis.length === 2],
    ["first is U of U", unis[0] === "University of Utah"],
    ["all entries are strings", unis.every(u => typeof u === "string")],
  ];
  for (const [label, ok] of uniChecks) {
    console.log("  " + (ok ? "✓" : "✗") + " " + label);
    if (!ok) allPassed = false;
  }

  // Cleanup
  console.log("\n=== Cleanup ===");
  await db.delete(listingReports).where(eq(listingReports.apartmentId, aptId));
  await db.execute(sql`DELETE FROM apartments WHERE id = ${aptId}`);
  console.log("✓ Test data cleaned up");

  console.log("\n" + "=".repeat(50));
  console.log(allPassed ? "ALL CHECKS PASSED ✓" : "SOME CHECKS FAILED ✗");
  process.exit(allPassed ? 0 : 1);
}

main().catch(e => {
  console.error("Fatal:", e.message || e);
  process.exit(1);
});
