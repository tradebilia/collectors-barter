/**
 * Playwright-based scraper for JS-rendered convention sites.
 * Covers: Comics, Video Games, Stamps, Coins, Movies, Autographs
 */
import { chromium } from "playwright";
import fs from "fs";

const YEAR = new Date().getFullYear();
const NEXT_YEAR = YEAR + 1;
const TODAY = new Date().toISOString().split("T")[0];

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
  return US_STATE_ABBR[abbr?.toUpperCase()] || abbr;
}

function parseDate(text) {
  if (!text) return null;
  // "July 10-12, 2026" or "July 10, 2026" or "Jul 10–12 2026"
  const m = text.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:[–\-](\d{1,2})(?:st|nd|rd|th)?)?,?\s+(\d{4})/);
  if (!m) return null;
  const month = MONTH_MAP[m[1].toLowerCase()];
  if (!month) return null;
  const year = m[4];
  const startDate = `${year}-${month}-${m[2].padStart(2,"0")}`;
  const endDate = m[3] ? `${year}-${month}-${m[3].padStart(2,"0")}` : null;
  return { startDate, endDate };
}

function parseLocation(text) {
  if (!text) return { city: null, state: null };
  const m = text.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
  if (!m) return { city: null, state: null };
  return { city: m[1].trim(), state: expandState(m[2]) };
}

async function withPage(browser, url, waitFor, fn) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (waitFor) await page.waitForSelector(waitFor, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000); // Let JS settle
    return await fn(page);
  } catch (e) {
    console.error(`  Error on ${url}:`, e.message.slice(0, 100));
    return [];
  } finally {
    await page.close();
  }
}

// ============================================================================
// CONVENTION SCENE — Comics, Video Games, Movies, Vintage Toys
// ============================================================================
async function scrapeConventionScene(browser) {
  return withPage(browser, "https://www.conventionscene.com/", null, async (page) => {
    const events = [];
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateResult = parseDate(line);
      if (!dateResult || dateResult.startDate < TODAY) continue;
      
      // Name is likely the line before the date
      const name = lines[i - 1] || "";
      if (!name || name.length < 3 || /^\d/.test(name)) continue;
      
      const loc = parseLocation(lines[i + 1] || lines[i + 2] || "");
      
      events.push({
        name, category: "all", ...dateResult,
        ...loc, country: "United States",
        venue: null, website: "https://www.conventionscene.com",
        admission: null, description: null, status: "approved",
      });
    }
    console.log(`  ConventionScene: ${events.length} events`);
    return events;
  });
}

// ============================================================================
// GENO TALKS COMICS — Comics
// ============================================================================
async function scrapeGenoTalks(browser) {
  return withPage(browser, "https://genotalkscomics.com/comic-con-events", null, async (page) => {
    const events = [];
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    for (const line of lines) {
      const dateResult = parseDate(line);
      if (!dateResult || dateResult.startDate < TODAY) continue;
      
      const namePart = line.substring(0, line.search(/[A-Z][a-z]+ \d/)).replace(/[:\-–,]+$/, "").trim();
      if (!namePart || namePart.length < 3) continue;
      
      const loc = parseLocation(line);
      
      events.push({
        name: namePart, category: "comics", ...dateResult,
        ...loc, country: "United States",
        venue: null, website: "https://genotalkscomics.com/comic-con-events",
        admission: null, description: null, status: "approved",
      });
    }
    console.log(`  GenoTalks: ${events.length} events`);
    return events;
  });
}

// ============================================================================
// CARDBOARD CONNECTION — Sports Cards (additional)
// ============================================================================
async function scrapeCardboardConnection(browser) {
  return withPage(browser, "https://www.cardboardconnection.com/major-regional-sports-entertainment-card-memorabilia-convention-guide", null, async (page) => {
    const events = [];
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    for (const line of lines) {
      const dateResult = parseDate(line);
      if (!dateResult || dateResult.startDate < TODAY) continue;
      
      const dateIdx = line.search(/[A-Z][a-z]+ \d/);
      if (dateIdx < 3) continue;
      const namePart = line.substring(0, dateIdx).replace(/[:\-–,]+$/, "").trim();
      if (!namePart || namePart.length < 3) continue;
      
      const loc = parseLocation(line);
      
      events.push({
        name: namePart, category: "sports_cards", ...dateResult,
        ...loc, country: "United States",
        venue: null, website: "https://www.cardboardconnection.com/major-regional-sports-entertainment-card-memorabilia-convention-guide",
        admission: null, description: null, status: "approved",
      });
    }
    console.log(`  CardboardConnection: ${events.length} events`);
    return events;
  });
}

// ============================================================================
// SPORTS COLLECTORS DIGEST — Sports Cards (additional)
// ============================================================================
async function scrapeSportsCollectorsDigest(browser) {
  return withPage(browser, "https://sportscollectorsdigest.com/collecting-101/show-calendar", "table, .show-list", async (page) => {
    const events = [];
    const rows = await page.$$("table tr");
    for (const row of rows) {
      const cells = await row.$$("td");
      if (cells.length < 2) continue;
      const name = await cells[0].textContent();
      if (!name || name.trim().length < 3) continue;
      const dateText = await cells[1].textContent();
      const dateResult = parseDate(dateText);
      if (!dateResult || dateResult.startDate < TODAY) continue;
      const locText = cells.length > 2 ? await cells[2].textContent() : "";
      const loc = parseLocation(locText);
      events.push({
        name: name.trim(), category: "sports_cards", ...dateResult,
        ...loc, country: "United States",
        venue: cells.length > 3 ? (await cells[3].textContent()).trim() : null,
        website: "https://sportscollectorsdigest.com/collecting-101/show-calendar",
        admission: null, description: null, status: "approved",
      });
    }
    console.log(`  SportsCollectorsDigest: ${events.length} events`);
    return events;
  });
}

// ============================================================================
// STAMPS.ORG — Stamps
// ============================================================================
async function scrapeStampsOrg(browser) {
  return withPage(browser, "https://stamps.org/events/events-calendar", ".tribe-events-calendar, .tribe-event, article", async (page) => {
    const events = [];
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateResult = parseDate(line);
      if (!dateResult || dateResult.startDate < TODAY) continue;
      
      const name = lines[i - 1] || "";
      if (!name || name.length < 3) continue;
      
      const loc = parseLocation(lines[i + 1] || "");
      
      events.push({
        name, category: "stamps", ...dateResult,
        ...loc, country: "United States",
        venue: null, website: "https://stamps.org/events/events-calendar",
        admission: null, description: null, status: "approved",
      });
    }
    console.log(`  StampsOrg: ${events.length} events`);
    return events;
  });
}

// ============================================================================
// MONEY.ORG — Coins
// ============================================================================
async function scrapeMoneyOrg(browser) {
  return withPage(browser, "https://www.money.org/events/", null, async (page) => {
    const events = [];
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateResult = parseDate(line);
      if (!dateResult || dateResult.startDate < TODAY) continue;
      
      const name = lines[i - 1] || "";
      if (!name || name.length < 3 || /^\d/.test(name)) continue;
      
      const loc = parseLocation(lines[i + 1] || line);
      
      events.push({
        name, category: "coins", ...dateResult,
        ...loc, country: "United States",
        venue: null, website: "https://www.money.org/events/",
        admission: null, description: null, status: "approved",
      });
    }
    console.log(`  MoneyOrg: ${events.length} events`);
    return events;
  });
}

// ============================================================================
// TRISTAR PRODUCTIONS — Autographs
// ============================================================================
async function scrapeTristar(browser) {
  return withPage(browser, "https://tristarproductions.com/", null, async (page) => {
    const events = [];
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateResult = parseDate(line);
      if (!dateResult || dateResult.startDate < TODAY) continue;
      
      const name = lines[i - 1] || "";
      if (!name || name.length < 3) continue;
      
      const loc = parseLocation(lines[i + 1] || line);
      
      events.push({
        name, category: "autographs", ...dateResult,
        ...loc, country: "United States",
        venue: null, website: "https://tristarproductions.com",
        admission: null, description: null, status: "approved",
      });
    }
    console.log(`  Tristar: ${events.length} events`);
    return events;
  });
}

// ============================================================================
// HOLLYWOOD SHOW — Movies
// ============================================================================
async function scrapeHollywoodShow(browser) {
  return withPage(browser, "https://www.hollywoodshow.com/", null, async (page) => {
    const text = await page.evaluate(() => document.body.innerText);
    const dateResult = parseDate(text);
    if (!dateResult || dateResult.startDate < TODAY) return [];
    const loc = parseLocation(text);
    console.log("  HollywoodShow: 1 event");
    return [{
      name: "The Hollywood Show", category: "movies", ...dateResult,
      city: loc.city || "Los Angeles", state: loc.state || "California",
      country: "United States", venue: null,
      website: "https://www.hollywoodshow.com",
      admission: null, description: "Celebrity autograph and memorabilia show", status: "approved",
    }];
  });
}

// ============================================================================
// MONSTERPALOOZA — Movies
// ============================================================================
async function scrapeMonsterpalooza(browser) {
  return withPage(browser, "https://www.monsterpalooza.com/", null, async (page) => {
    const text = await page.evaluate(() => document.body.innerText);
    const dateResult = parseDate(text);
    if (!dateResult || dateResult.startDate < TODAY) return [];
    const loc = parseLocation(text);
    console.log("  Monsterpalooza: 1 event");
    return [{
      name: "Monsterpalooza", category: "movies", ...dateResult,
      city: loc.city || "Burbank", state: loc.state || "California",
      country: "United States", venue: null,
      website: "https://www.monsterpalooza.com",
      admission: null, description: "Horror and monster memorabilia convention", status: "approved",
    }];
  });
}

// ============================================================================
// JOEFEST — Vintage Toys
// ============================================================================
async function scrapeJoeFest(browser) {
  return withPage(browser, "https://joefestusa.com", null, async (page) => {
    const text = await page.evaluate(() => document.body.innerText);
    const dateResult = parseDate(text);
    if (!dateResult || dateResult.startDate < TODAY) return [];
    const loc = parseLocation(text);
    console.log("  JoeFest: 1 event");
    return [{
      name: "JoeFest Toy and Comic Convention", category: "vintage_toys", ...dateResult,
      city: loc.city || "Augusta", state: loc.state || "Georgia",
      country: "United States", venue: null,
      website: "https://joefestusa.com",
      admission: null, description: "G.I. Joe toy and comic convention", status: "approved",
    }];
  });
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  const browser = await chromium.launch({ headless: true });
  
  const scrapers = [
    { name: "ConventionScene", fn: scrapeConventionScene },
    { name: "GenoTalks", fn: scrapeGenoTalks },
    { name: "CardboardConnection", fn: scrapeCardboardConnection },
    { name: "SportsCollectorsDigest", fn: scrapeSportsCollectorsDigest },
    { name: "StampsOrg", fn: scrapeStampsOrg },
    { name: "MoneyOrg", fn: scrapeMoneyOrg },
    { name: "Tristar", fn: scrapeTristar },
    { name: "HollywoodShow", fn: scrapeHollywoodShow },
    { name: "Monsterpalooza", fn: scrapeMonsterpalooza },
    { name: "JoeFest", fn: scrapeJoeFest },
  ];

  const allEvents = [];
  for (const { name, fn } of scrapers) {
    console.log(`Scraping ${name}...`);
    try {
      const events = await fn(browser);
      allEvents.push(...events);
    } catch (e) {
      console.error(`  ERROR: ${e.message.slice(0, 100)}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  // Deduplicate within this batch
  const seen = new Set();
  const deduped = allEvents.filter(e => {
    const key = `${e.name}||${e.startDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\nTotal: ${allEvents.length} | After dedup: ${deduped.length}`);
  fs.writeFileSync("scripts/playwright-results.json", JSON.stringify(deduped, null, 2));
  console.log("Results saved to scripts/playwright-results.json");
}

main().catch(console.error);
