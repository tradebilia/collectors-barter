import mysql from "mysql2/promise";

const url = process.env.CUSTOM_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error("No runtime database URL is configured");
const connection = await mysql.createConnection(url);
try {
  const [rows] = await connection.query(
    "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND (COLUMN_NAME LIKE '%categor%' OR COLUMN_TYPE LIKE 'enum%') ORDER BY TABLE_NAME, ORDINAL_POSITION",
  );
  for (const row of rows) console.log(JSON.stringify(row));
} finally {
  await connection.end();
}
