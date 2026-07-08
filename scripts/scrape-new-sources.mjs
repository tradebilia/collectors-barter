/**
 * Scrapers for newly discovered convention calendar sites:
 * - Stamps: stampnewsnow.com, americanstampdealer.com, wfscstamps.org
 * - Coins: uscoinshows.com, numismaticnews.net
 * - Autographs: halloffamesignings.com, creationent.com
 * - Comics: covrprice.com
 */
import { chromium } from "playwright";
import { JSDOM } from "jsdom";
import fs from "fs";

const TODAY = new Date().toISOString().split("T")[0];
const YEAR = new Date().getFullYear();
const NEXT_YEAR = YEAR + 1;

const MONTH_MAP = {
  jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
  jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
  january:"01",february:"02",march:"03",april:"04",june:"06",
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
  if (!abbr) return null;
  return US_STATE_ABBR[abbr.trim().toUpperCase()] || abbr.trim();
}

function parseDate(text) {
  if (!text) return null;
  // Handles: "July 10-12, 2026", "Jul. 10-12", "July 10, 2026", "Jul 10–12 2026"
  const m = text.match(/([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–\-]\s*(?:[A-Za-z]+\.?\s+)?(\d{1,2})(?:st|nd|rd|th)?)?,?\s+(\d{4})/);
  if (!m) return null;
  const month = MONTH_MAP[m[1].toLowerCase()];
  if (!month) return null;
  const year = m[4];
  const startDate = `${year}-${month}-${m[2].padStart(2,"0")}`;
  const endDate = m[3] ? `${year}-${month}-${m[3].padStart(2,"0")}` : null;
  if (startDate < TODAY) return null;
  return { startDate, endDate };
}

function parseLocation(text) {
  if (!text) return { city: null, state: null };
  // "City, ST" or "City, State"
  const m = text.match(/([A-Za-z\s\.]+),\s+([A-Za-z]{2,})\b/);
  if (!m) return { city: null, state: null };
  const stateRaw = m[2].trim();
  return {
    city: m[1].trim(),
    state: stateRaw.length === 2 ? expandState(stateRaw) : stateRaw,
  };
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; TradebiliaBot/1.0)", "Accept": "text/html" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function dom(html) { return new JSDOM(html).window.document; }

// ============================================================================
// STAMP NEWS NOW (stampnewsnow.com) — Stamps
// Plain text calendar, very easy
// ============================================================================
async function scrapeStampNewsNow() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.stampnewsnow.com/calendarevents.html");
    const doc = dom(html);
    const text = doc.body.textContent;
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Pattern: "July 5 – Van Nuys, CA Van Nuys Sunday Stamp Show, Masonic Hall"
      const dateResult = parseDate(line);
      if (!dateResult) continue;
      
      // Location is often on the same line after the date
      const afterDate = line.substring(line.search(/\d{4}/) + 4).trim();
      const loc = parseLocation(afterDate) || parseLocation(line);
      
      // Name: look for show name in the same line or next line
      const nameMatch = afterDate.match(/([A-Z][A-Za-z\s]+(?:Show|Expo|Exhibition|Fair|Convention|Congress|Club)[^\n,]*)/);
      const name = nameMatch ? nameMatch[1].trim() : (afterDate.split(",")[1] || "").trim() || lines[i + 1] || "";
      if (!name || name.length < 3) continue;
      
      const venueMatch = afterDate.match(/,\s*([A-Za-z\s]+(?:Hall|Center|Center|Church|School|Hotel|Inn|Lodge|Building|Facility)[^\n,]*)/i);
      
      events.push({
        name: name.replace(/\s+/g, " ").trim(),
        category: "stamps", ...dateResult,
        ...loc, country: "United States",
        venue: venueMatch ? venueMatch[1].trim() : null,
        website: "https://www.stampnewsnow.com/calendarevents.html",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("StampNewsNow error:", e.message);
  }
  console.log(`  StampNewsNow: ${events.length} events`);
  return events;
}

// ============================================================================
// AMERICAN STAMP DEALER (americanstampdealer.com) — Stamps
// ============================================================================
async function scrapeAmericanStampDealer() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.americanstampdealer.com/Show_Calendar.aspx");
    const doc = dom(html);
    
    // Try table rows
    const rows = doc.querySelectorAll("table tr, .show-row");
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) continue;
      
      const dateText = cells[0]?.textContent.trim();
      const dateResult = parseDate(dateText);
      if (!dateResult) continue;
      
      const name = cells[1]?.textContent.trim();
      if (!name || name.length < 3) continue;
      
      const locText = cells[2]?.textContent.trim() || cells[3]?.textContent.trim() || "";
      const loc = parseLocation(locText);
      
      events.push({
        name, category: "stamps", ...dateResult,
        ...loc, country: "United States",
        venue: locText || null,
        website: "https://www.americanstampdealer.com/Show_Calendar.aspx",
        admission: null, description: null, status: "approved",
      });
    }
    
    // If no table rows, try plain text
    if (events.length === 0) {
      const text = doc.body.textContent;
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
      for (const line of lines) {
        const dateResult = parseDate(line);
        if (!dateResult) continue;
        const loc = parseLocation(line);
        const nameMatch = line.match(/([A-Z][A-Za-z\s]+(?:Show|Expo|Exhibition|Fair|Convention)[^\n,]*)/);
        if (!nameMatch) continue;
        events.push({
          name: nameMatch[1].trim(), category: "stamps", ...dateResult,
          ...loc, country: "United States", venue: null,
          website: "https://www.americanstampdealer.com/Show_Calendar.aspx",
          admission: null, description: null, status: "approved",
        });
      }
    }
  } catch (e) {
    console.error("AmericanStampDealer error:", e.message);
  }
  console.log(`  AmericanStampDealer: ${events.length} events`);
  return events;
}

// ============================================================================
// WFSC STAMPS (wfscstamps.org) — Stamps
// ============================================================================
async function scrapeWFSCStamps() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.wfscstamps.org/Shows/");
    const doc = dom(html);
    const text = doc.body.textContent;
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    for (const line of lines) {
      // Pattern: "July 18, 2026 - Lakeland Coin and Stamp Show"
      const dateResult = parseDate(line);
      if (!dateResult) continue;
      
      const dashIdx = line.indexOf(" - ", line.search(/\d{4}/));
      const name = dashIdx > 0 ? line.substring(dashIdx + 3).trim() : "";
      if (!name || name.length < 3) continue;
      
      const loc = parseLocation(line);
      
      events.push({
        name, category: "stamps", ...dateResult,
        ...loc, country: "United States", venue: null,
        website: "https://www.wfscstamps.org/Shows/",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("WFSCStamps error:", e.message);
  }
  console.log(`  WFSCStamps: ${events.length} events`);
  return events;
}

// ============================================================================
// US COIN SHOWS (uscoinshows.com) — Coins
// ============================================================================
async function scrapeUSCoinShows(browser) {
  const events = [];
  try {
    const page = await browser.newPage();
    await page.goto("https://www.uscoinshows.com/blog/coin-show-calendar-2026", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const text = await page.evaluate(() => document.body.innerText);
    await page.close();
    
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateResult = parseDate(line);
      if (!dateResult) continue;
      
      // Name is often on the line before or after the date
      const name = lines[i - 1] || lines[i + 1] || "";
      if (!name || name.length < 3 || /^\d/.test(name)) continue;
      
      const loc = parseLocation(line) || parseLocation(lines[i + 1] || "");
      
      events.push({
        name: name.trim(), category: "coins", ...dateResult,
        ...loc, country: "United States", venue: null,
        website: "https://www.uscoinshows.com/blog/coin-show-calendar-2026",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("USCoinShows error:", e.message);
  }
  console.log(`  USCoinShows: ${events.length} events`);
  return events;
}

// ============================================================================
// NUMISMATIC NEWS (numismaticnews.net) — Coins
// ============================================================================
async function scrapeNumismaticNews() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.numismaticnews.net/events/show-calendar");
    const doc = dom(html);
    const text = doc.body.textContent;
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    // Structure: state header, then "Date City, ST Show Name Venue Contact"
    let currentState = null;
    for (const line of lines) {
      // State headers are short all-caps lines
      if (/^[A-Z]{2,20}$/.test(line) && line.length < 20) {
        currentState = expandState(line) || line;
        continue;
      }
      
      const dateResult = parseDate(line);
      if (!dateResult) continue;
      
      const afterDate = line.substring(line.search(/\d{4}/) + 4).trim();
      const loc = parseLocation(afterDate);
      const nameMatch = afterDate.match(/,\s*([A-Z][A-Za-z\s]+(?:Show|Expo|Exhibition|Fair|Convention|Club|Coin|Numismatic)[^\n.]*)/i);
      const name = nameMatch ? nameMatch[1].trim() : afterDate.split(",").slice(2).join(",").trim();
      if (!name || name.length < 3) continue;
      
      events.push({
        name: name.replace(/\s+/g, " ").trim(),
        category: "coins", ...dateResult,
        city: loc.city, state: loc.state || currentState,
        country: "United States", venue: null,
        website: "https://www.numismaticnews.net/events/show-calendar",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("NumismaticNews error:", e.message);
  }
  console.log(`  NumismaticNews: ${events.length} events`);
  return events;
}

// ============================================================================
// HALL OF FAME SIGNINGS (halloffamesignings.com) — Autographs
// ============================================================================
async function scrapeHallOfFameSignings() {
  const events = [];
  try {
    const html = await fetchHtml("https://halloffamesignings.com/");
    const doc = dom(html);
    
    // Structure: div.banner__text.body with date and location separated by "•"
    const banners = doc.querySelectorAll("div.banner__text, .event-listing, article, .show-item");
    for (const banner of banners) {
      const text = banner.textContent.trim();
      const dateResult = parseDate(text);
      if (!dateResult) continue;
      
      const name = banner.querySelector("h2, h3, .title, strong")?.textContent.trim() || "";
      if (!name || name.length < 3) continue;
      
      // Location after "•" separator
      const parts = text.split("•");
      const locText = parts.length > 1 ? parts[parts.length - 1].trim() : "";
      const loc = parseLocation(locText);
      
      events.push({
        name, category: "autographs", ...dateResult,
        ...loc, country: "United States",
        venue: parts.length > 2 ? parts[1].trim() : null,
        website: "https://halloffamesignings.com",
        admission: null, description: null, status: "approved",
      });
    }
    
    // Fallback: plain text parsing
    if (events.length === 0) {
      const text = doc.body.textContent;
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
      for (let i = 0; i < lines.length; i++) {
        const dateResult = parseDate(lines[i]);
        if (!dateResult) continue;
        const name = lines[i - 1] || "";
        if (!name || name.length < 3) continue;
        const loc = parseLocation(lines[i + 1] || lines[i]);
        events.push({
          name: name.trim(), category: "autographs", ...dateResult,
          ...loc, country: "United States", venue: null,
          website: "https://halloffamesignings.com",
          admission: null, description: null, status: "approved",
        });
      }
    }
  } catch (e) {
    console.error("HallOfFameSignings error:", e.message);
  }
  console.log(`  HallOfFameSignings: ${events.length} events`);
  return events;
}

// ============================================================================
// CREATION ENTERTAINMENT (creationent.com) — Autographs / Movies
// ============================================================================
async function scrapeCreationEnt() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.creationent.com/calendar.htm");
    const doc = dom(html);
    
    // Structure: p tags with strong (city/state) and a.small1 (date)
    const paras = doc.querySelectorAll("p");
    for (const p of paras) {
      const strong = p.querySelector("strong");
      const dateLink = p.querySelector("a.small1, a");
      if (!strong || !dateLink) continue;
      
      const locationText = strong.textContent.trim();
      const dateText = dateLink.textContent.trim();
      const dateResult = parseDate(dateText);
      if (!dateResult) continue;
      
      const loc = parseLocation(locationText);
      
      // Event name: look for text before the strong tag
      const fullText = p.textContent.trim();
      const nameMatch = fullText.match(/^([A-Za-z][^\n]+?)(?:\s+[A-Z][a-z]+,\s+[A-Z]{2})/);
      const name = nameMatch ? nameMatch[1].trim() : `Creation Entertainment — ${locationText}`;
      
      events.push({
        name: name.replace(/\s+/g, " ").trim(),
        category: "autographs", ...dateResult,
        ...loc, country: "United States", venue: null,
        website: "https://www.creationent.com/calendar.htm",
        admission: null, description: "Celebrity autograph convention", status: "approved",
      });
    }
  } catch (e) {
    console.error("CreationEnt error:", e.message);
  }
  console.log(`  CreationEnt: ${events.length} events`);
  return events;
}

// ============================================================================
// COVRPRICE (covrprice.com) — Comics
// ============================================================================
async function scrapeCovrPrice() {
  const events = [];
  try {
    const html = await fetchHtml("https://covrprice.com/cp-content/2026/01/2026-comic-book-convention-list/");
    const doc = dom(html);
    
    // Structure: h3 = "Date | Location", h2 = event name
    const h3s = doc.querySelectorAll("h3");
    for (const h3 of h3s) {
      const text = h3.textContent.trim();
      const dateResult = parseDate(text);
      if (!dateResult) continue;
      
      // Location is after "|" in the h3
      const pipeIdx = text.indexOf("|");
      const locText = pipeIdx > 0 ? text.substring(pipeIdx + 1).trim() : "";
      const loc = parseLocation(locText);
      
      // Name is in the next h2
      let next = h3.nextElementSibling;
      let name = "";
      while (next && !name) {
        if (next.tagName === "H2" || next.tagName === "H3") {
          name = next.textContent.trim();
          break;
        }
        next = next.nextElementSibling;
      }
      if (!name || name.length < 3) continue;
      
      events.push({
        name, category: "comics", ...dateResult,
        ...loc, country: "United States", venue: null,
        website: "https://covrprice.com/cp-content/2026/01/2026-comic-book-convention-list/",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("CovrPrice error:", e.message);
  }
  console.log(`  CovrPrice: ${events.length} events`);
  return events;
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  const browser = await chromium.launch({ headless: true });
  
  const allEvents = [];
  const scrapers = [
    { name: "StampNewsNow", fn: () => scrapeStampNewsNow() },
    { name: "AmericanStampDealer", fn: () => scrapeAmericanStampDealer() },
    { name: "WFSCStamps", fn: () => scrapeWFSCStamps() },
    { name: "USCoinShows", fn: () => scrapeUSCoinShows(browser) },
    { name: "NumismaticNews", fn: () => scrapeNumismaticNews() },
    { name: "HallOfFameSignings", fn: () => scrapeHallOfFameSignings() },
    { name: "CreationEnt", fn: () => scrapeCreationEnt() },
    { name: "CovrPrice", fn: () => scrapeCovrPrice() },
  ];

  for (const { name, fn } of scrapers) {
    console.log(`Scraping ${name}...`);
    try {
      const events = await fn();
      allEvents.push(...events);
    } catch (e) {
      console.error(`  ERROR: ${e.message.slice(0, 100)}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();

  // Deduplicate within this batch
  const seen = new Set();
  const deduped = allEvents.filter(e => {
    if (!e.name || !e.startDate) return false;
    const key = `${e.name}||${e.startDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\nTotal: ${allEvents.length} | After dedup: ${deduped.length}`);
  
  // Show breakdown by category
  const byCat = {};
  deduped.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + 1; });
  console.log("By category:", JSON.stringify(byCat));
  
  fs.writeFileSync("scripts/new-sources-results.json", JSON.stringify(deduped, null, 2));
  console.log("Results saved to scripts/new-sources-results.json");
}

main().catch(console.error);
