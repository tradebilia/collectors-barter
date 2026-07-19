import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const connection = await createConnection(process.env.DATABASE_URL!);

  console.log("Adding moderation columns to users table...");

  const userColumns = [
    ["isBanned", "TINYINT NOT NULL DEFAULT 0"],
    ["bannedAt", "TIMESTAMP NULL"],
    ["banReason", "TEXT NULL"],
    ["warnCount", "INT NOT NULL DEFAULT 0"],
    ["lastWarnedAt", "TIMESTAMP NULL"],
  ];

  for (const [col, def] of userColumns) {
    try {
      await connection.execute(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
      console.log(`  ✓ Added column: ${col}`);
    } catch (e: any) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log(`  - Column already exists: ${col}`);
      } else {
        throw e;
      }
    }
  }

  console.log("\nCreating moderationLog table...");
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS moderationLog (
      id INT AUTO_INCREMENT PRIMARY KEY,
      adminId INT NOT NULL,
      targetUserId INT NOT NULL,
      action ENUM('warn','ban','unban','suspend','unsuspend','delete') NOT NULL,
      reason TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      INDEX moderationLog_admin_idx (adminId),
      INDEX moderationLog_target_idx (targetUserId),
      INDEX moderationLog_action_idx (action),
      INDEX moderationLog_createdAt_idx (createdAt)
    )
  `);
  console.log("  ✓ moderationLog table ready");

  console.log("\nCreating userWarnings table...");
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS userWarnings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      adminId INT NOT NULL,
      message TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      INDEX userWarnings_user_idx (userId),
      INDEX userWarnings_admin_idx (adminId)
    )
  `);
  console.log("  ✓ userWarnings table ready");

  console.log("\nAll moderation tables and columns are ready.");
  await connection.end();
}

main().catch(console.error);
