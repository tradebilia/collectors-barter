import mysql from "mysql2/promise";
import fs from "fs";
const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
const conn = await mysql.createConnection(url);

// Test the exact SQL pattern the fixed filter uses
const [r1] = await conn.execute(
  `SELECT id, title, JSON_UNQUOTE(JSON_EXTRACT(itemDetails, '$.setName')) AS setName FROM listings WHERE category='sports_cards' AND isActive=1`
);
console.log("JSON_EXTRACT setName results:");
r1.forEach(r => console.log(` ${r.title}: ${JSON.stringify(r.setName)}`));

// Check raw column type/content
const [r2] = await conn.execute(`SELECT id, title, SUBSTRING(itemDetails,1,80) AS raw FROM listings WHERE category='sports_cards' AND isActive=1 LIMIT 2`);
console.log("\nRaw itemDetails:");
r2.forEach(r => console.log(` ${r.title}: ${r.raw}`));
await conn.end();
