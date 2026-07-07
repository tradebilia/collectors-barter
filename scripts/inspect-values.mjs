// Inspect actual stored values for keys used by failing filters
import mysql from "mysql2/promise";
import fs from "fs";

const url = process.env.DATABASE_URL || fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
const conn = await mysql.createConnection(url);
const [rows] = await conn.execute(
  "SELECT id, title, category, itemDetails FROM listings WHERE isActive = 1 AND category IN ('sports_cards','comics','movies')"
);

for (const row of rows) {
  let d = row.itemDetails;
  if (typeof d === "string") { try { d = JSON.parse(d); } catch { d = {}; } }
  d = d || {};
  console.log(`[${row.category}] ${row.title}`);
  console.log(`  setName=${JSON.stringify(d.setName)} rookieCard=${JSON.stringify(d.rookieCard)} publicationYear=${JSON.stringify(d.publicationYear)} releaseYear=${JSON.stringify(d.releaseYear)} year=${JSON.stringify(d.year)}`);
}
await conn.end();
