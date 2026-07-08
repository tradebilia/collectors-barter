/**
 * Insert scraped convention data into the conventions table.
 * Skips duplicates based on name + startDate combination.
 */
import mysql from "mysql2/promise";
import fs from "fs";

const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
const dataFile = process.argv[2] || "scripts/cardshowhub-results.json";
const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));

const conn = await mysql.createConnection(url);

const [existing] = await conn.execute("SELECT name, startDate FROM conventions");
const existingSet = new Set(existing.map(r => `${r.name}||${r.startDate}`));

let inserted = 0, skipped = 0, errors = 0;

for (const event of data) {
  const key = `${event.name}||${event.startDate}`;
  if (existingSet.has(key)) { skipped++; continue; }

  try {
    await conn.execute(
      `INSERT INTO conventions (name, category, startDate, endDate, city, state, country, venue, website, admission, description, source, status, submittedBy, approvedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
      [event.name, event.category, event.startDate, event.endDate ?? null,
       event.city ?? null, event.state ?? null, event.country,
       event.venue ?? null, event.website ?? null, event.admission ?? null,
       event.description ?? null, "scraper", event.status ?? "approved"]
    );
    inserted++;
    existingSet.add(key);
  } catch (e) {
    console.error(`Error inserting "${event.name}":`, e.message);
    errors++;
  }
}

await conn.end();
console.log(`Done: ${inserted} inserted, ${skipped} skipped (duplicates), ${errors} errors`);
