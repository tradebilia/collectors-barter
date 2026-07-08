import mysql from "mysql2/promise";
import fs from "fs";
const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
const conn = await mysql.createConnection(url);
const [rows] = await conn.execute("SELECT title, itemDetails FROM listings WHERE category='disney_pins' AND isActive=1");
rows.forEach(r => {
  const d = typeof r.itemDetails === 'string' ? JSON.parse(r.itemDetails) : r.itemDetails;
  console.log(r.title, '-> series:', JSON.stringify(d?.series), 'character:', JSON.stringify(d?.character), 'pinName:', JSON.stringify(d?.pinName));
});
await conn.end();
