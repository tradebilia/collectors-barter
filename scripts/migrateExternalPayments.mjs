import mysql from "mysql2/promise";

const connectionUrl = process.env.CUSTOM_DATABASE_URL;

if (!connectionUrl) {
  throw new Error("CUSTOM_DATABASE_URL is required for the external payment migration.");
}

const connection = await mysql.createConnection(connectionUrl);

try {
  const [tableRows] = await connection.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('users', 'tradePayments', 'tradeActivityLog')"
  );
  const availableTables = new Set(tableRows.map((row) => row.table_name));
  for (const table of ["users", "tradePayments", "tradeActivityLog"]) {
    if (!availableTables.has(table)) throw new Error(`Required table ${table} is missing from the custom database.`);
  }

  async function columnExists(table, column) {
    const [rows] = await connection.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1",
      [table, column]
    );
    return rows.length > 0;
  }

  async function applyIfMissing(table, column, definition) {
    if (await columnExists(table, column)) return false;
    await connection.query(`ALTER TABLE \`${table}\` ADD \`${column}\` ${definition}`);
    console.log(`Added ${table}.${column}`);
    return true;
  }

  await applyIfMissing("users", "venmoUsername", "varchar(80)");
  await applyIfMissing("users", "cashAppCashtag", "varchar(80)");
  await applyIfMissing("users", "zelleEmail", "varchar(320)");
  await applyIfMissing("users", "zellePhone", "varchar(32)");
  await applyIfMissing("users", "externalPaymentMethodsUpdatedAt", "timestamp NULL");

  if (await columnExists("tradePayments", "paypalEmail")) {
    await connection.query("ALTER TABLE `tradePayments` MODIFY COLUMN `paypalEmail` varchar(320) NULL");
  } else {
    await applyIfMissing("tradePayments", "paypalEmail", "varchar(320)");
  }
  await applyIfMissing("tradePayments", "paymentMethod", "enum('paypal','venmo','cash_app','zelle') NULL");
  await applyIfMissing("tradePayments", "paymentIdentifier", "varchar(320)");
  await applyIfMissing("tradePayments", "paymentMethodSelectedAt", "timestamp NULL");
  await connection.query("ALTER TABLE `tradePayments` MODIFY COLUMN `status` enum('pending','method_selected','sent','received','disputed','submitted','verified','failed') NOT NULL DEFAULT 'pending'");
  await applyIfMissing("tradePayments", "sentAt", "timestamp NULL");
  await applyIfMissing("tradePayments", "receivedAt", "timestamp NULL");
  await applyIfMissing("tradePayments", "disputeOpenedAt", "timestamp NULL");
  await applyIfMissing("tradePayments", "disputeOpenedBy", "int");
  await applyIfMissing("tradePayments", "disputeReason", "varchar(500)");

  await connection.query("ALTER TABLE `tradeActivityLog` MODIFY COLUMN `eventType` enum('trade_created','partner_joined','item_added','item_removed','cash_added','cash_removed','proposal_sent','proposal_accepted','proposal_declined','trade_cancelled','tracking_submitted','items_received','trade_completed','payment_step_started','payment_verification_started','payment_verified','payment_verification_failed','cash_payment_method_selected','cash_payment_marked_sent','cash_payment_received_confirmed','cash_payment_dispute_opened','cash_payment_terms_reset') NOT NULL");

  await connection.query(
    "UPDATE `tradePayments` SET `paymentMethod` = 'paypal', `paymentIdentifier` = `paypalEmail`, `paymentMethodSelectedAt` = COALESCE(`paymentMethodSelectedAt`, `createdAt`) WHERE `paymentMethod` IS NULL AND `paypalEmail` IS NOT NULL"
  );

  console.log("External payment migration completed against the custom database.");
} finally {
  await connection.end();
}
