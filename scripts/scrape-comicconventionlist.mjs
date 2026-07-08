/**
 * Scraper: comicconventionlist.com
 * Uses the monthly http:// pages from the sitemap which bypass bot detection.
 * Format:
 *   July 10 - 11
 *   Empire Comic Fest
 *   - Louis S. Wolk JCC
 *   Rochester, NY
 *   - Comics, Artists, Collectables
 */
import { JSDOM } from "jsdom";
import mysql from "mysql2/promise";
import fs from "fs";

const TODAY = new Date().toISOString().split("T")[0];
const YEAR = new Date().getFullYear();

const MONTH_MAP = {
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
};

const US_STATE_ABBR = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",
  CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",
  IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",
  ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",
  MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",
  OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",
  WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",DC:"Washington D.C.",
};

function expandState(abbr) {
  return US_STATE_ABBR[abbr?.trim().toUpperCase()] || abbr?.trim() || null;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function scrapeMonth(monthName, year) {
  const events = [];
  const url = `http://comicconventionlist.com/${year}-${monthName}.html`;
  
  try {
    const html = await fetchPage(url);
    const doc = new JSDOM(html).window.document;
    const text = doc.body.textContent;
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    
    const monthNum = MONTH_MAP[monthName.toLowerCase()];
    if (!monthNum) return events;
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // Date line: "July 10 - 11" or "July 10" or "July 10 - August 1"
      const dateMatch = line.match(/^[A-Z][a-z]+ (\d{1,2})(?:\s*-\s*(?:[A-Z][a-z]+ )?(\d{1,2}))?$/);
      if (!dateMatch) { i++; continue; }
      
      const startDay = dateMatch[1].padStart(2, "0");
      const endDay = dateMatch[2] ? dateMatch[2].padStart(2, "0") : null;
      const startDate = `${year}-${monthNum}-${startDay}`;
      const endDate = endDay ? `${year}-${monthNum}-${endDay}` : null;
      
      if (startDate < TODAY) { i++; continue; }
      
      // Next line: event name
      const name = lines[i + 1] || "";
      if (!name || name.length < 3 || name.startsWith("-") || /^[A-Z][a-z]+ \d/.test(name)) {
        i++;
        continue;
      }
      
      // Following lines: venue (starts with "- "), location "City, ST", description (starts with "- ")
      let venue = null;
      let city = null;
      let state = null;
      let j = i + 2;
      
      while (j < lines.length && j < i + 6) {
        const nextLine = lines[j];
        
        // Venue: starts with "- " and contains a place name
        if (nextLine.startsWith("- ") && !nextLine.match(/Comics|Sci-Fi|Pop|Anime|Artist|Celebrity|Collectible|Gaming|Cosplay|Horror|Fantasy/i)) {
          venue = nextLine.substring(2).trim();
          j++;
          continue;
        }
        
        // Location: "City, ST" pattern
        const locMatch = nextLine.match(/^([A-Za-z][A-Za-z\s\.]+),\s+([A-Z]{2})$/);
        if (locMatch) {
          city = locMatch[1].trim();
          state = expandState(locMatch[2]);
          j++;
          continue;
        }
        
        // Description: starts with "- " and contains genre keywords
        if (nextLine.startsWith("- ")) {
          j++;
          continue;
        }
        
        // Stop if we hit another date or unrelated content
        break;
      }
      
      events.push({
        name: name.trim(),
        category: "comics",
        startDate,
        endDate,
        city,
        state,
        country: "United States",
        venue,
        website: `http://comicconventionlist.com/${year}-${monthName}.html`,
        admission: null,
        description: null,
        status: "approved",
      });
      
      i = j;
    }
  } catch (e) {
    console.error(`  Error scraping ${monthName}: ${e.message}`);
  }
  
  return events;
}

async function main() {
  const months = ["July", "August", "September", "October", "November", "December"];
  const allEvents = [];
  
  for (const month of months) {
    console.log(`Scraping ${month} ${YEAR}...`);
    const events = await scrapeMonth(month, YEAR);
    console.log(`  → ${events.length} events`);
    allEvents.push(...events);
    await new Promise(r => setTimeout(r, 800));
  }
  
  // Deduplicate
  const seen = new Set();
  const deduped = allEvents.filter(e => {
    if (!e.name || !e.startDate) return false;
    const key = `${e.name.substring(0,50)}||${e.startDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  console.log(`\nTotal: ${allEvents.length} | After dedup: ${deduped.length}`);
  
  // Sample output
  console.log("\nSample events:");
  deduped.slice(0, 5).forEach(e => console.log(` ${e.name} | ${e.startDate} | ${e.city}, ${e.state} | ${e.venue}`));
  
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
  
  fs.writeFileSync("scripts/comicconventionlist-results.json", JSON.stringify(deduped, null, 2));
}

main().catch(console.error);
