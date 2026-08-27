import mysql from "mysql2/promise";
import { writeFile } from "node:fs/promises";

const rawUrl = process.env.CUSTOM_DATABASE_URL;
if (!rawUrl) throw new Error("CUSTOM_DATABASE_URL is unavailable for the read-only audit.");

const url = new URL(rawUrl);
const sslParam = url.searchParams.get("ssl");
const ssl = sslParam ? JSON.parse(sslParam) : undefined;
url.searchParams.delete("ssl");

const pool = mysql.createPool({
  uri: url.toString(),
  ssl,
  connectionLimit: 1,
  enableKeepAlive: false,
  connectTimeout: 20_000,
});

try {
  const [tables] = await pool.query(`
    SELECT table_name AS tableName
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND (table_name LIKE '%membership%' OR table_name LIKE '%billing%' OR table_name LIKE '%verification%')
    ORDER BY table_name
  `);
  const names = tables.map((table) => table.tableName);
  const [columns] = names.length ? await pool.query(`
    SELECT table_name AS tableName, column_name AS columnName, column_type AS columnType,
           is_nullable AS isNullable, column_default AS columnDefault, column_key AS columnKey
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name IN (${names.map(() => "?").join(", ")})
    ORDER BY table_name, ordinal_position
  `, names) : [[]];
  const [indexes] = names.length ? await pool.query(`
    SELECT table_name AS tableName, index_name AS indexName, non_unique AS nonUnique,
           seq_in_index AS sequenceInIndex, column_name AS columnName
    FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name IN (${names.map(() => "?").join(", ")})
    ORDER BY table_name, index_name, seq_in_index
  `, names) : [[]];
  const [baseline] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS memberCount,
      (SELECT COUNT(*) FROM listings WHERE status = 'active' AND isActive = 1) AS activeListingCount,
      (SELECT COALESCE(SUM(estimatedValue), 0) FROM listings WHERE status = 'active' AND isActive = 1) AS activeListingValue
  `);
  const [billing] = names.includes("billingSettings") ? await pool.query(`
    SELECT billingMode, stripeBillingEnabled, paymentEnforcementEnabled
    FROM billingSettings ORDER BY id LIMIT 1
  `) : [[]];
  const [providerEvents] = names.includes("membershipProviderEvents") ? await pool.query(`
    SELECT eventType, processingStatus, processedAt IS NOT NULL AS processed, createdAt
    FROM membershipProviderEvents
    WHERE provider = 'stripe'
    ORDER BY createdAt DESC
    LIMIT 10
  `) : [[]];
  const [membership] = names.includes("userMemberships") ? await pool.query(`
    SELECT userId, status, billingTerm,
           stripeCustomerId IS NOT NULL AS hasStripeCustomer,
           stripeSubscriptionId IS NOT NULL AS hasStripeSubscription,
           cancelAtPeriodEnd
    FROM userMemberships WHERE userId = 30002 LIMIT 1
  `) : [[]];
  await writeFile(
    "/tmp/stripe-test-membership-schema-audit.json",
    JSON.stringify({ tables, columns, indexes, baseline, billing, providerEvents, user30002Membership: membership }, null, 2),
    "utf8",
  );
  console.log("Sanitized membership schema audit written.");
} finally {
  await pool.end();
}

process.exit(0);
