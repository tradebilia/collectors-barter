/**
 * One-time migration script: encrypt existing plain-text OAuth tokens in the database.
 * Run with: node scripts/migrate-encrypt-tokens.mjs
 */

import { createCipheriv, randomBytes } from "crypto";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function encrypt(plaintext) {
  if (!plaintext) return null;
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("ENCRYPTION_KEY missing or invalid");
  const key = Buffer.from(hex, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString("base64");
}

function looksEncrypted(value) {
  if (!value) return true;
  try {
    const buf = Buffer.from(value, "base64");
    // Encrypted values are always > IV_LENGTH + TAG_LENGTH bytes and valid base64
    return buf.length > IV_LENGTH + TAG_LENGTH;
  } catch {
    return false;
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const conn = await mysql.createConnection(dbUrl);
  console.log("Connected to database.");

  // Fetch all users with tokens
  const [rows] = await conn.execute(
    "SELECT id, ebayAccessToken, ebayRefreshToken, facebookAccessToken FROM users WHERE ebayAccessToken IS NOT NULL OR ebayRefreshToken IS NOT NULL OR facebookAccessToken IS NOT NULL"
  );

  console.log(`Found ${rows.length} users with tokens to check.`);

  let migrated = 0;
  for (const row of rows) {
    const updates = {};

    if (row.ebayAccessToken && !looksEncrypted(row.ebayAccessToken)) {
      updates.ebayAccessToken = encrypt(row.ebayAccessToken);
    }
    if (row.ebayRefreshToken && !looksEncrypted(row.ebayRefreshToken)) {
      updates.ebayRefreshToken = encrypt(row.ebayRefreshToken);
    }
    if (row.facebookAccessToken && !looksEncrypted(row.facebookAccessToken)) {
      updates.facebookAccessToken = encrypt(row.facebookAccessToken);
    }

    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
      const values = [...Object.values(updates), row.id];
      await conn.execute(`UPDATE users SET ${setClauses} WHERE id = ?`, values);
      console.log(`  ✅ Encrypted tokens for user ID ${row.id}`);
      migrated++;
    } else {
      console.log(`  ⏭️  User ID ${row.id} — tokens already encrypted or null`);
    }
  }

  await conn.end();
  console.log(`\nMigration complete. ${migrated} users updated.`);
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
