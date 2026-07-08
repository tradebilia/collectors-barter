import mysql from "mysql2/promise";
import fs from "fs";
const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
const conn = await mysql.createConnection(url);
const [rows] = await conn.execute("SELECT id, title, category, `condition`, grade, itemDetails FROM listings WHERE isActive=1");
for (const r of rows) {
  const d = typeof r.itemDetails === 'string' ? JSON.parse(r.itemDetails) : (r.itemDetails || {});
  console.log(`[${r.category}] #${r.id} ${r.title}`);
  console.log(`  top-level: condition=${r.condition} grade=${r.grade}`);
  console.log(`  itemDetails keys: ${Object.keys(d || {}).join(", ")}`);
}
await conn.end();
