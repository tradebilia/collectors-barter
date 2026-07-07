// Audit script: dump itemDetails keys per category to compare with filter keys
import mysql from "mysql2/promise";
import fs from "fs";

const url = process.env.DATABASE_URL || fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];

const conn = await mysql.createConnection(url);
const [rows] = await conn.execute(
  "SELECT id, category, itemType, itemDetails FROM listings WHERE isActive = 1"
);

const byCategory = {};
for (const row of rows) {
  const cat = row.category;
  if (!byCategory[cat]) byCategory[cat] = { itemTypes: new Set(), keys: new Set(), count: 0 };
  byCategory[cat].count++;
  if (row.itemType) byCategory[cat].itemTypes.add(row.itemType);
  let details = row.itemDetails;
  if (typeof details === "string") {
    try { details = JSON.parse(details); } catch { details = null; }
  }
  if (details && typeof details === "object") {
    Object.keys(details).forEach(k => byCategory[cat].keys.add(k));
  }
}

for (const [cat, info] of Object.entries(byCategory)) {
  console.log(`\n=== ${cat} (${info.count} listings) ===`);
  console.log("item types:", [...info.itemTypes].join(", ") || "(none)");
  console.log("itemDetails keys:", [...info.keys].sort().join(", ") || "(none)");
}

await conn.end();
