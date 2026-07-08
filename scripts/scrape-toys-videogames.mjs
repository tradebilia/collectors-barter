/**
 * Scraper for ToysCons.com, VideoGameCons.com, and FanCons.com schedule pages.
 * All three share the same platform with identical HTML structure.
 * 
 * Format (repeating block):
 *   Convention Name (Year)
 *   [Cancelled/Postponed]  (optional status line)
 *   Month Day-Day, Year
 *   Venue Name
 *   City, ST
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

function parseDate(dateText) {
  if (!dateText) return null;
  // "January 10-11, 2026" or "February 13-15, 2026" or "July 10, 2026"
  const m = dateText.match(/([A-Za-z]+)\s+(\d{1,2})(?:-(\d{1,2}))?,?\s+(\d{4})/);
  if (!m) return null;
  const month = MONTH_MAP[m[1].toLowerCase()];
  if (!month) return null;
  const year = m[4];
  const startDate = `${year}-${month}-${m[2].padStart(2,"0")}`;
  const endDate = m[3] ? `${year}-${month}-${m[3].padStart(2,"0")}` : null;
  if (startDate < TODAY) return null;
  return { startDate, endDate };
}

async function fetchHtml(url) {
  // Use a curl-like request to bypass basic bot detection
  const res = await fetch(url, {
    headers: {
      "User-Agent": "curl/7.88.1",
      "Accept": "*/*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function scrapeFanConsPage(url, category) {
  const events = [];
  try {
    const html = await fetchHtml(url);
    const doc = new JSDOM(html).window.document;
    const text = doc.body.textContent;
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 2);
    
    // The data repeats in blocks of: Name, [Cancelled?], Date, Venue, City ST
    // Find all date lines first, then extract surrounding context
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Date line: "January 10-11, 2026" or "July 10-12, 2026"
      const dateResult = parseDate(line);
      if (!dateResult) continue;
      
      // Skip cancelled/postponed — check the line immediately before the date
      const prevLine = lines[i - 1] || "";
      if (/^(Cancelled|Postponed|Rescheduled)$/i.test(prevLine)) continue;
      
      // Name is 1-2 lines before the date (skip status lines)
      let name = "";
      for (let back = 1; back <= 3; back++) {
        const prev = lines[i - back] || "";
        if (/^(Cancelled|Postponed|Rescheduled|TBD|Date|Location|Convention|Name)$/i.test(prev)) continue;
        if (prev.length > 3 && !/^\d/.test(prev) && !/^[A-Z]{2}$/.test(prev) && !parseDate(prev)) {
          name = prev;
          break;
        }
      }
      if (!name || name.length < 3) continue;
      
      // Venue+location is the line after the date (may be concatenated: "River RidgeLynchburg, VA")
      const venueLine = lines[i + 1] || "";
      if (!venueLine || parseDate(venueLine)) continue;
      
      // Extract city/state from the venue line — it's always at the end: "...City, ST"
      const locMatch = venueLine.match(/([A-Za-z][A-Za-z\s\.]+),\s+([A-Z]{2})$/);
      if (!locMatch) continue;
      
      const city = locMatch[1].trim();
      const state = expandState(locMatch[2]);
      // Venue is everything before the city/state
      const venueOnly = venueLine.substring(0, venueLine.lastIndexOf(locMatch[0])).trim() || null;
      
      // Clean up name — remove year suffix like "2026" or "(2026)"
      const cleanName = name.replace(/\s*\(?\d{4}\)?$/, "").trim();
      if (!cleanName || cleanName.length < 3) continue;
      
      events.push({
        name: cleanName,
        category,
        ...dateResult,
        city,
        state,
        country: "United States",
        venue: venueOnly && venueOnly.length > 2 ? venueOnly : null,
        website: url,
        admission: null,
        description: null,
        status: "approved",
      });
    }
  } catch (e) {
    console.error(`  Error scraping ${url}: ${e.message.slice(0, 100)}`);
  }
  return events;
}

async function main() {
  const sources = [
    { url: "https://toycons.com/calendar/calendar.php?year=2026&loc=us", category: "vintage_toys", name: "ToysCons (toys)" },
    { url: "https://toycons.com/calendar/", category: "vintage_toys", name: "ToysCons future" },
    { url: "https://videogamecons.com/calendar/", category: "video_games", name: "VideoGameCons" },
  ];

  const allEvents = [];
  for (const { url, category, name } of sources) {
    console.log(`Scraping ${name}...`);
    const events = await scrapeFanConsPage(url, category);
    console.log(`  → ${events.length} events`);
    allEvents.push(...events);
    await new Promise(r => setTimeout(r, 1000));
  }

  // Deduplicate across all sources
  const seen = new Set();
  const deduped = allEvents.filter(e => {
    if (!e.name || !e.startDate) return false;
    const key = `${e.name.substring(0,50)}||${e.startDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const byCat = deduped.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {});
  console.log(`\nTotal: ${allEvents.length} | After dedup: ${deduped.length}`);
  console.log("By category:", JSON.stringify(byCat));

  console.log("\nSample toys:");
  deduped.filter(e => e.category === "vintage_toys").slice(0, 5).forEach(e =>
    console.log(` ${e.name} | ${e.startDate} | ${e.city}, ${e.state}`)
  );
  console.log("\nSample video games:");
  deduped.filter(e => e.category === "video_games").slice(0, 5).forEach(e =>
    console.log(` ${e.name} | ${e.startDate} | ${e.city}, ${e.state}`)
  );

  // Insert into database
  const dbUrl = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
  const conn = await mysql.createConnection(dbUrl);
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

  fs.writeFileSync("scripts/toys-videogames-results.json", JSON.stringify(deduped, null, 2));
}

main().catch(console.error);
