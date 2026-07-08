import mysql from "mysql2/promise";
import fs from "fs";
const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
const conn = await mysql.createConnection(url);
const [rows] = await conn.execute("SELECT title, category, itemDetails FROM listings WHERE isActive=1 AND category IN ('autographs','pokemon','sports_cards')");
for (const r of rows) {
  const d = typeof r.itemDetails === 'string' ? JSON.parse(r.itemDetails) : (r.itemDetails || {});
  if (r.category === 'autographs') console.log(`[autographs] ${r.title}: signedItemType=${JSON.stringify(d.signedItemType)} autographCategory=${JSON.stringify(d.autographCategory)}`);
  if (r.category === 'pokemon') console.log(`[pokemon] ${r.title}: rarity=${JSON.stringify(d.rarity)} customRarity=${JSON.stringify(d.customRarity)}`);
  if (r.category === 'sports_cards' && r.title.includes('Gretzky')) console.log(`[sports_cards] ${r.title}: player=${JSON.stringify(d.player)}`);
}
await conn.end();
