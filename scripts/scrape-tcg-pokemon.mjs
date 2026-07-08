/**
 * TCG/Pokemon convention scrapers:
 * 1. Collect-A-Con — scrapes all city pages from sitemap
 * 2. Trading Card Con — scrapes event pages from sitemap
 * 3. VideoGameCons 2026 calendar — extracts Pokemon/TCG tagged events
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

function parseDate(text) {
  if (!text) return null;
  const m = text.match(/([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[-–]\s*(?:[A-Za-z]+\.?\s+)?(\d{1,2})(?:st|nd|rd|th)?)?,?\s+(\d{4})/);
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
  const res = await fetch(url, {
    headers: { "User-Agent": "curl/7.88.1", "Accept": "*/*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ============================================================================
// COLLECT-A-CON — scrape all city pages
// ============================================================================
const COLLECTACON_CITIES = [
  "minneapolis", "san-francisco", "las-vegas", "phoenix", "san-antonio",
  "kansas-city", "charlotte", "richmond", "newjersey", "cleveland",
  "dallas", "orlando", "chicago", "miami", "losangeles", "houston", "atlanta",
];

async function scrapeCollectACon() {
  const events = [];
  for (const city of COLLECTACON_CITIES) {
    try {
      const url = `https://collectaconusa.com/${city}/`;
      const html = await fetchHtml(url);
      const doc = new JSDOM(html).window.document;
      const text = doc.body.textContent || "";
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 3);
      
      // Find the date line (format: "July 18, 2026 010:00:00" — strip the time)
      for (const line of lines) {
        const cleanLine = line.replace(/\s*\d+:\d+:\d+$/, "").trim();
        const dateResult = parseDate(cleanLine);
        if (!dateResult) continue;
        
        // City name from URL slug
        const cityName = city.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
          .replace("Newjersey", "New Jersey").replace("Losangeles", "Los Angeles");
        
        // Find state from address on the page
        const addrMatch = text.match(/,\s+([A-Z]{2})\s+\d{5}/);
        const state = addrMatch ? expandState(addrMatch[1]) : null;
        
        // Find venue from address
        const venueMatch = text.match(/(\d+[^,\n]+(?:Mall|Center|Arena|Convention|Expo|Hall|Stadium)[^,\n]*)/i);
        
        events.push({
          name: `Collect-A-Con ${cityName}`,
          category: "pokemon",
          ...dateResult,
          city: cityName,
          state,
          country: "United States",
          venue: venueMatch ? venueMatch[1].trim() : null,
          website: url,
          admission: null,
          description: "Trading card, anime & pop culture convention",
          status: "approved",
        });
        break; // One date per city page
      }
    } catch (e) {
      // Skip failed cities
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return events;
}

// ============================================================================
// TRADING CARD CON — scrape event pages from sitemap
// ============================================================================
async function scrapeTradingCardCon() {
  const events = [];
  try {
    const sitemap = await fetchHtml("https://tradingcardcon.com/sitemap.xml");
    const eventUrls = [...sitemap.matchAll(/https:\/\/tradingcardcon\.com\/event\/[^<"]+/g)]
      .map(m => m[0])
      .filter((url, i, arr) => arr.indexOf(url) === i); // deduplicate
    
    for (const url of eventUrls.slice(0, 20)) { // Limit to 20 events
      try {
        const html = await fetchHtml(url);
        const doc = new JSDOM(html).window.document;
        const text = doc.body.textContent || "";
        const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 3);
        
        // Find date
        let dateResult = null;
        for (const line of lines) {
          dateResult = parseDate(line);
          if (dateResult) break;
        }
        if (!dateResult) continue;
        
        // Event name from URL slug: "st-louis-2026" → "Trading Card Con — St. Louis"
        const slug = url.split("/event/")[1]?.replace(/\/$/, "") || "";
        const cityPart = slug.replace(/-\d{4}$/, "").replace(/-/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());
        const name = `Trading Card Con — ${cityPart}`;
        
        // Location from address
        const locMatch = text.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})\s+\d{5}/);
        
        events.push({
          name,
          category: "pokemon",
          ...dateResult,
          city: locMatch ? locMatch[1].trim() : cityPart,
          state: locMatch ? expandState(locMatch[2]) : null,
          country: "United States",
          venue: null,
          website: url,
          admission: null,
          description: "Pokemon, Magic, and trading card convention",
          status: "approved",
        });
        await new Promise(r => setTimeout(r, 500));
      } catch {}
    }
  } catch (e) {
    console.error("TradingCardCon error:", e.message);
  }
  return events;
}

// ============================================================================
// VIDEOGAMECONS 2026 — Pokemon/TCG events only
// ============================================================================
async function scrapeVideoGameCons2026TCG() {
  const events = [];
  try {
    const html = await fetchHtml("https://videogamecons.com/calendar/calendar.php?year=2026");
    const doc = new JSDOM(html).window.document;
    const text = doc.body.textContent || "";
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 2);

    for (let i = 0; i < lines.length; i++) {
      const dateResult = parseDate(lines[i]);
      if (!dateResult) continue;

      const prevLine = lines[i - 1] || "";
      if (/^(Cancelled|Postponed|Rescheduled)$/i.test(prevLine)) continue;

      let name = "";
      for (let back = 1; back <= 3; back++) {
        const prev = lines[i - back] || "";
        if (/^(Cancelled|Postponed|Rescheduled|TBD|Date|Location|Convention|Name)$/i.test(prev)) continue;
        if (prev.length > 3 && !/^\d/.test(prev) && !/^[A-Z]{2}$/.test(prev) && !parseDate(prev)) {
          name = prev; break;
        }
      }
      if (!name || name.length < 3) continue;

      // Only Pokemon/TCG events
      if (!/pokemon|poke|tcg|trading card/i.test(name)) continue;

      const venueLine = lines[i + 1] || "";
      if (!venueLine || parseDate(venueLine)) continue;

      const locMatch = venueLine.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})$/);
      if (!locMatch) continue;

      const cleanName = name.replace(/\s*\(?\d{4}\)?$/, "").trim();
      if (!cleanName || cleanName.length < 3) continue;

      events.push({
        name: cleanName,
        category: "pokemon",
        ...dateResult,
        city: locMatch[1].trim(),
        state: expandState(locMatch[2]),
        country: "United States",
        venue: venueLine.substring(0, venueLine.lastIndexOf(locMatch[0])).trim() || null,
        website: "https://videogamecons.com/calendar/calendar.php?year=2026",
        admission: null,
        description: null,
        status: "approved",
      });
    }
  } catch (e) {
    console.error("VideoGameCons2026TCG error:", e.message);
  }
  return events;
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  const allEvents = [];
  
  console.log("Scraping Collect-A-Con (Pokemon/TCG)...");
  const collectaCon = await scrapeCollectACon();
  console.log(`  → ${collectaCon.length} events`);
  allEvents.push(...collectaCon);
  
  console.log("Scraping Trading Card Con...");
  const tradingCardCon = await scrapeTradingCardCon();
  console.log(`  → ${tradingCardCon.length} events`);
  allEvents.push(...tradingCardCon);
  
  console.log("Scraping VideoGameCons 2026 (TCG/Pokemon only)...");
  const vgcTCG = await scrapeVideoGameCons2026TCG();
  console.log(`  → ${vgcTCG.length} events`);
  allEvents.push(...vgcTCG);
  
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
  console.log("\nSample events:");
  deduped.slice(0, 10).forEach(e => console.log(` ${e.name} | ${e.startDate} | ${e.city}, ${e.state}`));
  
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
  
  fs.writeFileSync("scripts/tcg-pokemon-results.json", JSON.stringify(deduped, null, 2));
}

main().catch(console.error);
