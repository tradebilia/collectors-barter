import mysql from "mysql2/promise";
import fs from "fs";
const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
const conn = await mysql.createConnection(url);

// Test with parameterized path (how drizzle sends it)
const [r1] = await conn.execute(
  `SELECT id, title FROM listings WHERE category='sports_cards' AND isActive=1 AND JSON_UNQUOTE(JSON_EXTRACT(itemDetails, ?)) LIKE ?`,
  ['$.setName', '%Upper Deck%']
);
console.log("Parameterized path results:", r1.length);
r1.forEach(r => console.log(" -", r.title));

// Test rookieCard yes
const [r2] = await conn.execute(
  `SELECT id, title FROM listings WHERE category='sports_cards' AND isActive=1 AND JSON_UNQUOTE(JSON_EXTRACT(itemDetails, ?)) LIKE ?`,
  ['$.rookieCard', '%yes%']
);
console.log("rookieCard=yes results:", r2.length);
await conn.end();
