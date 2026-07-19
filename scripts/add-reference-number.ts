import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const connection = await createConnection(process.env.DATABASE_URL!);

  console.log("Adding referenceNumber column to tradeProposals...");

  // Add the column (ignore error if it already exists)
  try {
    await connection.execute(`
      ALTER TABLE tradeProposals
      ADD COLUMN referenceNumber VARCHAR(20) NULL
    `);
    console.log("Column added.");
  } catch (e: any) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("Column already exists, skipping.");
    } else {
      throw e;
    }
  }

  // Backfill existing completed trades that don't have a reference number
  const [rows]: any = await connection.execute(`
    SELECT id FROM tradeProposals
    WHERE status = 'completed' AND referenceNumber IS NULL
    ORDER BY id ASC
  `);

  console.log(`Backfilling ${rows.length} completed trades...`);

  for (const row of rows) {
    const refNum = `TR-${String(row.id).padStart(5, "0")}`;
    await connection.execute(
      `UPDATE tradeProposals SET referenceNumber = ? WHERE id = ?`,
      [refNum, row.id]
    );
  }

  console.log("Done! All completed trades now have a reference number.");
  await connection.end();
}

main().catch(console.error);
