const { ensureMusicCategory, requireDb } = await import("../server/db.ts");
await ensureMusicCategory();
const db = await requireDb();
const result = await db.execute("SHOW COLUMNS FROM listings LIKE 'category'");
for (const row of result[0]) console.log(JSON.stringify({ field: row.Field, type: row.Type }));
process.exit(0);
