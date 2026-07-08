/**
 * Scraper: Popverse (thepopverse.com) — Comics
 * Clean 3-column table: Date | Convention Name | City, State
 * No bot protection, fully accessible via fetch.
 */
import { JSDOM } from "jsdom";
import mysql from "mysql2/promise";
import fs from "fs";

const TODAY = new Date().toISOString().split("T")[0];
const YEAR = new Date().getFullYear();
const NEXT_YEAR = YEAR + 1;

const MONTH_MAP = {
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
};

// US state names to keep only US events
const US_STATES = new Set([
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","Washington D.C.",
]);

function parseDate(dateText) {
  if (!dateText) return null;
  // "July 10 - 12" or "July 10" or "July 10 - August 1"
  const m = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:\s*-\s*(?:[A-Za-z]+\s+)?(\d{1,2}))?/);
  if (!m) return null;
  const month = MONTH_MAP[m[1].toLowerCase()];
  if (!month) return null;
  const now = new Date();
  let year = YEAR;
  if (parseInt(month) < now.getMonth() + 1) year = NEXT_YEAR;
  const startDate = `${year}-${month}-${m[2].padStart(2,"0")}`;
  const endDate = m[3] ? `${year}-${month}-${m[3].padStart(2,"0")}` : null;
  if (startDate < TODAY) return null;
  return { startDate, endDate };
}

function parseLocation(locationText) {
  if (!locationText) return { city: null, state: null };
  // "Miami Beach, Florida" or "New Orleans, Louisiana"
  const parts = locationText.split(",").map(p => p.trim());
  if (parts.length < 2) return { city: locationText.trim(), state: null };
  return { city: parts[0], state: parts[parts.length - 1] };
}

async function scrape() {
  const events = [];
  const url = "https://www.thepopverse.com/comics-conventions-cons-con-near-me-nycc-san-diego-anime-tickets";
  
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const doc = new JSDOM(html).window.document;
  
  // The page has a table with columns: Date | Convention | City
  // But since it's rendered as text, parse the text content
  const text = doc.body.textContent;
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 2);
  
  // The pattern is three consecutive lines: date, name, location
  // Dates look like "July 10 - 12" or "July 10"
  for (let i = 0; i < lines.length - 2; i++) {
    const line = lines[i];
    
    // Check if this line is a date
    const dateResult = parseDate(line);
    if (!dateResult) continue;
    
    // Next line should be the convention name
    const name = lines[i + 1];
    if (!name || name.length < 3 || /^[A-Z][a-z]+ \d/.test(name) || /^\d{4}/.test(name)) continue;
    
    // Line after that should be the location
    const locationText = lines[i + 2];
    const loc = parseLocation(locationText);
    
    // Only include US events
    if (loc.state && !US_STATES.has(loc.state)) continue;
    
    // Skip if location looks like another date or event name
    if (!locationText || /^[A-Z][a-z]+ \d/.test(locationText) || locationText.length < 3) continue;
    
    events.push({
      name: name.trim(),
      category: "comics",
      ...dateResult,
      city: loc.city,
      state: loc.state,
      country: "United States",
      venue: null,
      website: url,
      admission: null,
      description: null,
      status: "approved",
    });
    
    i += 2; // Skip the name and location lines
  }
  
  return events;
}

async function main() {
  console.log("Scraping Popverse (comics)...");
  const events = await scrape();
  
  // Deduplicate
  const seen = new Set();
  const deduped = events.filter(e => {
    if (!e.name || !e.startDate) return false;
    const key = `${e.name.substring(0,50)}||${e.startDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  console.log(`Total: ${events.length} | After dedup: ${deduped.length}`);
  console.log("\nSample events:");
  deduped.slice(0, 10).forEach(e => console.log(` ${e.name} | ${e.startDate}${e.endDate ? '–'+e.endDate.slice(8) : ''} | ${e.city}, ${e.state}`));
  
  // Insert into database
  const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
  const conn = await mysql.createConnection(url);
  const [existing] = await conn.execute("SELECT name, startDate FROM conventions");
  const existingSet = new Set(existing.map(r => `${r.name.substring(0,50)}||${r.startDate}`));
  
  let inserted = 0, skipped = 0, errors = 0;
  for (const e of deduped) {
    const key = `${e.name.substring(0,50)}||${e.startDate}`;
    if (existingSet.has(key)) { skipped++; continue; }
    try {
      await conn.execute(
        "INSERT INTO conventions (name, category, startDate, endDate, city, state, country, venue, website, admission, description, source, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [e.name, e.category, e.startDate, e.endDate||null, e.city, e.state, e.country, e.venue||null, e.website, e.admission||null, e.description||null, "scraper", "approved"]
      );
      inserted++;
      existingSet.add(key);
    } catch (err) {
      console.error(`Error: ${e.name} - ${err.message.slice(0,80)}`);
      errors++;
    }
  }
  await conn.end();
  console.log(`\nInserted: ${inserted} | Skipped: ${skipped} | Errors: ${errors}`);
  
  fs.writeFileSync("scripts/popverse-results.json", JSON.stringify(deduped, null, 2));
  console.log("Results saved to scripts/popverse-results.json");
}

main().catch(console.error);
