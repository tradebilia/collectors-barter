/**
 * Targeted scrapers for:
 * - Numismatic News show calendar (coins) — format: "Jul 17-19 AL, Bessemer. Show Name. Venue..."
 * - RosterCon (comics/movies) — format: list of conventions with dates
 */
import { chromium } from "playwright";
import mysql from "mysql2/promise";
import fs from "fs";

const TODAY = new Date().toISOString().split("T")[0];
const YEAR = new Date().getFullYear();
const NEXT_YEAR = YEAR + 1;

const MONTH_MAP = {
  jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
  jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
};

const US_STATES = {
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

function parseNumismaticDate(monthAbbr, startDay, endDay, yearHint) {
  const month = MONTH_MAP[monthAbbr.toLowerCase()];
  if (!month) return null;
  const now = new Date();
  let year = yearHint || YEAR;
  if (!yearHint && parseInt(month) < now.getMonth() + 1) year = NEXT_YEAR;
  const startDate = `${year}-${month}-${startDay.padStart(2,"0")}`;
  const endDate = endDay ? `${year}-${month}-${endDay.padStart(2,"0")}` : null;
  if (startDate < TODAY) return null;
  return { startDate, endDate };
}

// ============================================================================
// NUMISMATIC NEWS — Coins
// Format: "Jul 17-19 AL, Bessemer. Show Name. Venue. SH: hours. SP: sponsor. A: admission..."
// ============================================================================
async function scrapeNumismaticNews(browser) {
  const events = [];
  const page = await browser.newPage();
  try {
    await page.goto("https://www.numismaticnews.net/events/show-calendar", {
      waitUntil: "domcontentloaded", timeout: 30000
    });
    await page.waitForTimeout(2000);
    
    const text = await page.evaluate(() => document.body.innerText);
    
    // The format is: "Jul 17-19 AL, Bessemer. Alabama Numismatic Society Annual Convention. Venue..."
    // State sections are marked with headers like "## ALABAMA"
    
    let currentState = null;
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 3);
    
    for (const line of lines) {
      // State header: "ALABAMA", "ARIZONA", etc.
      if (/^[A-Z]{4,}$/.test(line) && US_STATES[line.substring(0,2)]) {
        // This is a state name header
        currentState = line.charAt(0) + line.slice(1).toLowerCase();
        continue;
      }
      
      // Event line: "Jul 17-19 AL, Bessemer. Show Name..."
      // Pattern: Month Day[-Day] STATE_ABBR, City. Name. ...
      const m = line.match(/^([A-Z][a-z]{2})\s+(\d{1,2})(?:-(\d{1,2}))?\s+([A-Z]{2}),\s+([^\.]+)\.\s+([^\.]+)/);
      if (!m) continue;
      
      const dates = parseNumismaticDate(m[1], m[2], m[3]);
      if (!dates) continue;
      
      const state = US_STATES[m[4]] || m[4];
      const city = m[5].trim();
      const name = m[6].trim();
      
      if (!name || name.length < 3) continue;
      
      // Extract admission from "A: Free" or "A: $2"
      const admissionMatch = line.match(/\bA:\s*([^\.]+?)(?:\.|T:|F:|SP:|SH:|$)/);
      const admission = admissionMatch ? admissionMatch[1].trim() : null;
      
      // Extract venue (first sentence after name)
      const venueMatch = line.match(/^[^\.]+\.[^\.]+\.\s*([^\.]+(?:Center|Hall|Hotel|Inn|Club|Arena|Auditorium|Building|Facility|Civic|Community|Convention|Shrine|Legion|VFW|Fairground)[^\.]*)/i);
      const venue = venueMatch ? venueMatch[1].trim() : null;
      
      events.push({
        name, category: "coins", ...dates,
        city, state, country: "United States",
        venue, website: "https://www.numismaticnews.net/events/show-calendar",
        admission: admission === "Free" ? "Free" : admission,
        description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("NumismaticNews error:", e.message.slice(0, 100));
  } finally {
    await page.close();
  }
  console.log(`  NumismaticNews (coins): ${events.length} events`);
  return events;
}

// ============================================================================
// ROSTERCON — Comics (US events only)
// Format: list items with date "Jul 9th 2026" and event name
// ============================================================================
async function scrapeRosterCon(browser) {
  const events = [];
  const page = await browser.newPage();
  try {
    await page.goto("https://www.rostercon.com/en/event-convention", {
      waitUntil: "domcontentloaded", timeout: 30000
    });
    await page.waitForTimeout(3000);
    
    // Get all event items from the page
    const items = await page.evaluate(() => {
      const results = [];
      // Each event is in a list item with date and name
      const listItems = document.querySelectorAll("li, .event-item, .convention-item");
      for (const item of listItems) {
        const text = item.innerText || item.textContent;
        if (!text || text.length < 10) continue;
        results.push(text.trim());
      }
      return results;
    });
    
    // Also get the full page text for parsing
    const fullText = await page.evaluate(() => document.body.innerText);
    const lines = fullText.split("\n").map(l => l.trim()).filter(l => l.length > 3);
    
    let currentDate = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Date line: "Jul 9th 2026" or "Jul 10th 2026"
      const dateMatch = line.match(/^([A-Z][a-z]{2})\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})$/);
      if (dateMatch) {
        const month = MONTH_MAP[dateMatch[1].toLowerCase()];
        if (month) {
          const year = dateMatch[3];
          const day = dateMatch[2].padStart(2, "0");
          const startDate = `${year}-${month}-${day}`;
          currentDate = startDate >= TODAY ? startDate : null;
        }
        continue;
      }
      
      // Event name line (bold text or link text)
      if (currentDate && line.length > 5 && line.length < 100 && !/^[A-Z]{2,}$/.test(line)) {
        // Skip lines that are clearly not event names
        if (/^(Multi-Fandom|Supernatural|Marvel|DC Comics|Star Wars|Disney|WWE|Anime|All events)/.test(line)) continue;
        if (/^\+$/.test(line)) continue;
        
        // Check if this looks like a convention name
        if (/con|expo|fest|convention|show|event/i.test(line) || /\d{4}/.test(line)) {
          // Try to find location from surrounding context
          const nextLine = lines[i + 1] || "";
          const locMatch = nextLine.match(/([A-Za-z\s]+),?\s+([A-Z]{2})\b/) ||
                           line.match(/\(([A-Za-z]+),?\s+([A-Z]{2})\)/);
          
          // Only include US events (skip if clearly international)
          const isUS = !nextLine.match(/\b(UK|France|Germany|Japan|Canada|Australia|Italy|Spain|Belgium|Netherlands|Brazil|Mexico)\b/i) &&
                       !line.match(/\b(UK|France|Germany|Japan|Canada|Australia|Italy|Spain|Belgium|Netherlands|Brazil|Mexico)\b/i);
          
          if (isUS) {
            events.push({
              name: line.trim(),
              category: "comics",
              startDate: currentDate,
              endDate: null,
              city: locMatch ? locMatch[1].trim() : null,
              state: locMatch ? locMatch[2] : null,
              country: "United States",
              venue: null,
              website: "https://www.rostercon.com/en/event-convention",
              admission: null,
              description: null,
              status: "approved",
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("RosterCon error:", e.message.slice(0, 100));
  } finally {
    await page.close();
  }
  console.log(`  RosterCon (comics): ${events.length} events`);
  return events;
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  const browser = await chromium.launch({ headless: true });
  const allEvents = [];
  
  console.log("Scraping NumismaticNews (coins)...");
  allEvents.push(...await scrapeNumismaticNews(browser));
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Scraping RosterCon (comics)...");
  allEvents.push(...await scrapeRosterCon(browser));
  
  await browser.close();
  
  // Deduplicate
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
        [e.name, e.category, e.startDate, e.endDate||null, e.city, e.state, e.country||"United States", e.venue||null, e.website||null, e.admission||null, e.description||null, "scraper", "approved"]
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
  
  // Save results for review
  fs.writeFileSync("scripts/coins-comics-results.json", JSON.stringify(deduped, null, 2));
}

main().catch(console.error);
