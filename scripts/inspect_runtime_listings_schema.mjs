import mysql from "mysql2/promise";

const url = process.env.CUSTOM_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error("No runtime database URL is configured");
const connection = await mysql.createConnection(url);
try {
  const [rows] = await connection.query("SHOW COLUMNS FROM listings");
  for (const row of rows) {
    console.log(JSON.stringify({ field: row.Field, type: row.Type, nullable: row.Null, default: row.Default, extra: row.Extra }));
  }
} finally {
  await connection.end();
}
