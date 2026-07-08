/**
 * Multi-site convention scraper
 * Covers 16 Easy sites across all categories.
 * Each scraper function returns an array of convention objects.
 * Deduplication is handled by the insert-conventions.mjs script.
 */
import { JSDOM } from "jsdom";
import fs from "fs";

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
  return US_STATE_ABBR[abbr?.toUpperCase()] || abbr;
}

function parseMonthDay(monthStr, dayStr, yearHint) {
  const m = MONTH_MAP[monthStr?.toLowerCase()];
  if (!m) return null;
  const d = String(parseInt(dayStr)).padStart(2, "0");
  const now = new Date();
  let y = yearHint || YEAR;
  if (!yearHint && parseInt(m) < now.getMonth() + 1) y = NEXT_YEAR;
  return `${y}-${m}-${d}`;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TradebiliaBot/1.0; +https://tradebilia.com)",
      "Accept": "text/html",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function dom(html) {
  return new JSDOM(html).window.document;
}

// ============================================================================
// CONVENTION SCENE (conventionscene.com) — Comics, Video Games, Movies, Toys
// ============================================================================
async function scrapeConventionScene() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.conventionscene.com/");  // homepage has event list
    const doc = dom(html);
    const rows = doc.querySelectorAll("table tr, .convention-list li, article.convention");
    
    // Try multiple selectors since structure varies
    const links = doc.querySelectorAll("a[href*='convention'], a[href*='expo'], a[href*='con']");
    const seen = new Set();
    
    for (const link of links) {
      const name = link.textContent.trim();
      if (!name || name.length < 5 || seen.has(name)) continue;
      seen.add(name);
      
      // Look for date and location in surrounding text
      const parent = link.closest("tr, li, div, article") || link.parentElement;
      const text = parent?.textContent || "";
      
      // Try to find a date pattern
      const dateMatch = text.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
      if (!dateMatch) continue;
      
      const month = MONTH_MAP[dateMatch[1].toLowerCase()];
      if (!month) continue;
      const startDay = dateMatch[2].padStart(2, "0");
      const endDay = dateMatch[3] ? dateMatch[3].padStart(2, "0") : null;
      const year = dateMatch[4];
      
      // Skip past events
      const startDate = `${year}-${month}-${startDay}`;
      if (startDate < new Date().toISOString().split("T")[0]) continue;
      
      const endDate = endDay ? `${year}-${month}-${endDay}` : null;
      
      // Location
      const locMatch = text.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
      const city = locMatch ? locMatch[1].trim() : null;
      const state = locMatch ? expandState(locMatch[2]) : null;
      
      events.push({
        name, category: "all", startDate, endDate,
        city, state, country: "United States",
        venue: null, website: link.href?.startsWith("http") ? link.href : `https://www.conventionscene.com${link.getAttribute("href")}`,
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("ConventionScene error:", e.message);
  }
  return events;
}

// ============================================================================
// COMIC CONS NEAR ME (comiccons.xyz) — Comics
// ============================================================================
async function scrapeComicConsXyz() {
  const events = [];
  try {
    const html = await fetchHtml("https://comiccons.xyz/all-conventions/");
    const doc = dom(html);
    
    // Try table rows or list items
    const rows = doc.querySelectorAll("table tr, .event-row, article");
    for (const row of rows) {
      const cells = row.querySelectorAll("td, .event-field");
      if (cells.length < 2) continue;
      
      const name = cells[0]?.textContent.trim();
      if (!name || name.length < 3) continue;
      
      const dateText = cells[1]?.textContent.trim() || row.textContent;
      const dateMatch = dateText.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
      if (!dateMatch) continue;
      
      const month = MONTH_MAP[dateMatch[1].toLowerCase()];
      if (!month) continue;
      const startDay = dateMatch[2].padStart(2, "0");
      const endDay = dateMatch[3] ? dateMatch[3].padStart(2, "0") : null;
      const year = dateMatch[4];
      const startDate = `${year}-${month}-${startDay}`;
      if (startDate < new Date().toISOString().split("T")[0]) continue;
      
      const locText = cells[2]?.textContent.trim() || "";
      const locMatch = locText.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
      
      events.push({
        name, category: "comics", startDate,
        endDate: endDay ? `${year}-${month}-${endDay}` : null,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null, website: "https://comiccons.xyz",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("ComicConsXyz error:", e.message);
  }
  return events;
}

// ============================================================================
// GENO TALKS COMICS (genotalkscomics.com) — Comics
// ============================================================================
async function scrapeGenoTalks() {
  const events = [];
  try {
    const html = await fetchHtml("https://genotalkscomics.com/comic-con-events");
    const doc = dom(html);
    
    const text = doc.body.textContent;
    // Pattern: "Event Name: Date" or similar
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    for (const line of lines) {
      const dateMatch = line.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
      if (!dateMatch) continue;
      
      const month = MONTH_MAP[dateMatch[1].toLowerCase()];
      if (!month) continue;
      const startDay = dateMatch[2].padStart(2, "0");
      const endDay = dateMatch[3] ? dateMatch[3].padStart(2, "0") : null;
      const year = dateMatch[4];
      const startDate = `${year}-${month}-${startDay}`;
      if (startDate < new Date().toISOString().split("T")[0]) continue;
      
      // Name is the part before the date
      const namePart = line.substring(0, line.indexOf(dateMatch[0])).replace(/[:\-–]+$/, "").trim();
      if (!namePart || namePart.length < 3) continue;
      
      const locMatch = line.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
      
      events.push({
        name: namePart, category: "comics", startDate,
        endDate: endDay ? `${year}-${month}-${endDay}` : null,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://genotalkscomics.com/comic-con-events",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("GenoTalks error:", e.message);
  }
  return events;
}

// ============================================================================
// CARDBOARD CONNECTION (cardboardconnection.com) — Sports Cards
// ============================================================================
async function scrapeCardboardConnection() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.cardboardconnection.com/major-regional-sports-entertainment-card-memorabilia-convention-guide");
    const doc = dom(html);
    
    const allText = doc.body.textContent;
    const lines = allText.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    for (const line of lines) {
      const dateMatch = line.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
      if (!dateMatch) continue;
      
      const month = MONTH_MAP[dateMatch[1].toLowerCase()];
      if (!month) continue;
      const startDay = dateMatch[2].padStart(2, "0");
      const endDay = dateMatch[3] ? dateMatch[3].padStart(2, "0") : null;
      const year = dateMatch[4];
      const startDate = `${year}-${month}-${startDay}`;
      if (startDate < new Date().toISOString().split("T")[0]) continue;
      
      const namePart = line.substring(0, line.indexOf(dateMatch[0])).replace(/[:\-–,]+$/, "").trim();
      if (!namePart || namePart.length < 3) continue;
      
      const locMatch = line.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
      
      events.push({
        name: namePart, category: "sports_cards", startDate,
        endDate: endDay ? `${year}-${month}-${endDay}` : null,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://www.cardboardconnection.com/major-regional-sports-entertainment-card-memorabilia-convention-guide",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("CardboardConnection error:", e.message);
  }
  return events;
}

// ============================================================================
// SPORTS COLLECTORS DIGEST (sportscollectorsdigest.com) — Sports Cards
// ============================================================================
async function sportscollectorsDigest() {
  const events = [];
  try {
    const html = await fetchHtml("https://sportscollectorsdigest.com/collecting-101/show-calendar");
    const doc = dom(html);
    
    const rows = doc.querySelectorAll("table tr, .show-row, .event-row");
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) continue;
      
      const name = cells[0]?.textContent.trim();
      if (!name || name.length < 3 || name.toLowerCase() === "show name") continue;
      
      const dateText = cells[1]?.textContent.trim() || "";
      const dateMatch = dateText.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
      if (!dateMatch) continue;
      
      const month = MONTH_MAP[dateMatch[1].toLowerCase()];
      if (!month) continue;
      const startDay = dateMatch[2].padStart(2, "0");
      const endDay = dateMatch[3] ? dateMatch[3].padStart(2, "0") : null;
      const year = dateMatch[4];
      const startDate = `${year}-${month}-${startDay}`;
      if (startDate < new Date().toISOString().split("T")[0]) continue;
      
      const locText = cells[2]?.textContent.trim() || cells[3]?.textContent.trim() || "";
      const locMatch = locText.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
      
      events.push({
        name, category: "sports_cards", startDate,
        endDate: endDay ? `${year}-${month}-${endDay}` : null,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States",
        venue: cells[3]?.textContent.trim() || null,
        website: "https://sportscollectorsdigest.com/show-calendar",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("SportsCollectorsDigest error:", e.message);
  }
  return events;
}

// ============================================================================
// RETRO WORLD EXPO (retroworldexpo.com) — Video Games (single event)
// ============================================================================
async function scrapeRetroWorldExpo() {
  try {
    const html = await fetchHtml("https://retroworldexpo.com");
    const doc = dom(html);
    const text = doc.body.textContent;
    const dateMatch = text.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
    if (!dateMatch) return [];
    const month = MONTH_MAP[dateMatch[1].toLowerCase()];
    if (!month) return [];
    const year = dateMatch[4];
    const startDate = `${year}-${month}-${dateMatch[2].padStart(2,"0")}`;
    if (startDate < new Date().toISOString().split("T")[0]) return [];
    
    const locMatch = text.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
    return [{
      name: "RetroWorld Expo", category: "video_games", startDate,
      endDate: dateMatch[3] ? `${year}-${month}-${dateMatch[3].padStart(2,"0")}` : null,
      city: locMatch ? locMatch[1].trim() : "Hartford",
      state: locMatch ? expandState(locMatch[2]) : "Connecticut",
      country: "United States", venue: null,
      website: "https://retroworldexpo.com",
      admission: null, description: "Annual retro gaming convention", status: "approved",
    }];
  } catch (e) {
    console.error("RetroWorldExpo error:", e.message);
    return [];
  }
}

// ============================================================================
// AMERICAN PHILATELIC SOCIETY (stamps.org) — Stamps
// ============================================================================
async function scrapeStampsOrg() {
  const events = [];
  try {
    const html = await fetchHtml("https://stamps.org/events/events-calendar");
    const doc = dom(html);
    
    const items = doc.querySelectorAll("article, .event-item, .tribe-event, li.event");
    for (const item of items) {
      const name = item.querySelector("h2, h3, .event-title, a")?.textContent.trim();
      if (!name || name.length < 3) continue;
      
      const dateText = item.querySelector(".event-date, time, .tribe-event-date-start")?.textContent.trim()
        || item.textContent;
      const dateMatch = dateText.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
      if (!dateMatch) continue;
      
      const month = MONTH_MAP[dateMatch[1].toLowerCase()];
      if (!month) continue;
      const startDay = dateMatch[2].padStart(2, "0");
      const endDay = dateMatch[3] ? dateMatch[3].padStart(2, "0") : null;
      const year = dateMatch[4];
      const startDate = `${year}-${month}-${startDay}`;
      if (startDate < new Date().toISOString().split("T")[0]) continue;
      
      const locText = item.querySelector(".event-location, .tribe-venue")?.textContent.trim() || "";
      const locMatch = locText.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
      
      events.push({
        name, category: "stamps", startDate,
        endDate: endDay ? `${year}-${month}-${endDay}` : null,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://stamps.org/events/events-calendar",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("StampsOrg error:", e.message);
  }
  return events;
}

// ============================================================================
// AMERICAN NUMISMATIC ASSOCIATION (money.org) — Coins
// ============================================================================
async function scrapeMoneyOrg() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.money.org/events/");
    const doc = dom(html);
    
    const items = doc.querySelectorAll("article, .event-item, .views-row, li.event");
    for (const item of items) {
      const name = item.querySelector("h2, h3, .event-title, a")?.textContent.trim();
      if (!name || name.length < 3) continue;
      
      const dateText = item.textContent;
      const dateMatch = dateText.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
      if (!dateMatch) continue;
      
      const month = MONTH_MAP[dateMatch[1].toLowerCase()];
      if (!month) continue;
      const startDay = dateMatch[2].padStart(2, "0");
      const endDay = dateMatch[3] ? dateMatch[3].padStart(2, "0") : null;
      const year = dateMatch[4];
      const startDate = `${year}-${month}-${startDay}`;
      if (startDate < new Date().toISOString().split("T")[0]) continue;
      
      const locMatch = dateText.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
      
      events.push({
        name, category: "coins", startDate,
        endDate: endDay ? `${year}-${month}-${endDay}` : null,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://money.org/events",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("MoneyOrg error:", e.message);
  }
  return events;
}

// ============================================================================
// TRISTAR PRODUCTIONS (tristarproductions.com) — Autographs
// ============================================================================
async function scrapeTristar() {
  const events = [];
  try {
    const html = await fetchHtml("https://tristarproductions.com/");  // shows & signings on homepage
    const doc = dom(html);
    
    const items = doc.querySelectorAll("article, .event-item, .show-item, tr");
    for (const item of items) {
      const name = item.querySelector("h2, h3, .event-title, td:first-child")?.textContent.trim();
      if (!name || name.length < 3) continue;
      
      const dateText = item.textContent;
      const dateMatch = dateText.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
      if (!dateMatch) continue;
      
      const month = MONTH_MAP[dateMatch[1].toLowerCase()];
      if (!month) continue;
      const startDay = dateMatch[2].padStart(2, "0");
      const endDay = dateMatch[3] ? dateMatch[3].padStart(2, "0") : null;
      const year = dateMatch[4];
      const startDate = `${year}-${month}-${startDay}`;
      if (startDate < new Date().toISOString().split("T")[0]) continue;
      
      const locMatch = dateText.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
      
      events.push({
        name, category: "autographs", startDate,
        endDate: endDay ? `${year}-${month}-${endDay}` : null,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://tristarproductions.com/events",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("Tristar error:", e.message);
  }
  return events;
}

// ============================================================================
// HOLLYWOOD SHOW (hollywoodshow.com) — Movies (single recurring event)
// ============================================================================
async function scrapeHollywoodShow() {
  try {
    const html = await fetchHtml("https://www.hollywoodshow.com/");
    const doc = dom(html);
    const text = doc.body.textContent;
    const dateMatch = text.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
    if (!dateMatch) return [];
    const month = MONTH_MAP[dateMatch[1].toLowerCase()];
    if (!month) return [];
    const year = dateMatch[4];
    const startDate = `${year}-${month}-${dateMatch[2].padStart(2,"0")}`;
    if (startDate < new Date().toISOString().split("T")[0]) return [];
    
    return [{
      name: "The Hollywood Show", category: "movies", startDate,
      endDate: dateMatch[3] ? `${year}-${month}-${dateMatch[3].padStart(2,"0")}` : null,
      city: "Los Angeles", state: "California", country: "United States",
      venue: null, website: "https://hollywoodshow.com",
      admission: null, description: "Celebrity autograph and memorabilia show", status: "approved",
    }];
  } catch (e) {
    console.error("HollywoodShow error:", e.message);
    return [];
  }
}

// ============================================================================
// MONSTERPALOOZA (monsterpalooza.com) — Movies (single annual event)
// ============================================================================
async function scrapeMonsterpalooza() {
  try {
    const html = await fetchHtml("https://www.monsterpalooza.com/");
    const doc = dom(html);
    const text = doc.body.textContent;
    const dateMatch = text.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
    if (!dateMatch) return [];
    const month = MONTH_MAP[dateMatch[1].toLowerCase()];
    if (!month) return [];
    const year = dateMatch[4];
    const startDate = `${year}-${month}-${dateMatch[2].padStart(2,"0")}`;
    if (startDate < new Date().toISOString().split("T")[0]) return [];
    
    const locMatch = text.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
    return [{
      name: "Monsterpalooza", category: "movies", startDate,
      endDate: dateMatch[3] ? `${year}-${month}-${dateMatch[3].padStart(2,"0")}` : null,
      city: locMatch ? locMatch[1].trim() : "Burbank",
      state: locMatch ? expandState(locMatch[2]) : "California",
      country: "United States", venue: null,
      website: "https://monsterpalooza.com",
      admission: null, description: "Horror and monster memorabilia convention", status: "approved",
    }];
  } catch (e) {
    console.error("Monsterpalooza error:", e.message);
    return [];
  }
}

// ============================================================================
// TCG CONS (tcgcons.com) — Pokemon + Sports Cards
// ============================================================================
async function scrapeTCGCons() {
  const events = [];
  try {
    // TCGCons has past events only currently — scrape all and filter by date
    const html = await fetchHtml("https://www.tcgcons.com/");
    const doc = dom(html);
    
    const cards = doc.querySelectorAll("div.event-card, .event-listing, article");
    for (const card of cards) {
      const name = card.querySelector("div.event-name, h2, h3, .title")?.textContent.trim();
      if (!name || name.length < 3) continue;
      
      const dateText = card.textContent;
      const dateMatch = dateText.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
      if (!dateMatch) continue;
      
      const month = MONTH_MAP[dateMatch[1].toLowerCase()];
      if (!month) continue;
      const startDay = dateMatch[2].padStart(2, "0");
      const endDay = dateMatch[3] ? dateMatch[3].padStart(2, "0") : null;
      const year = dateMatch[4];
      const startDate = `${year}-${month}-${startDay}`;
      if (startDate < new Date().toISOString().split("T")[0]) continue;
      
      const locMatch = dateText.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
      
      events.push({
        name, category: "pokemon", startDate,
        endDate: endDay ? `${year}-${month}-${endDay}` : null,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://www.tcgcons.com",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("TCGCons error:", e.message);
  }
  return events;
}

// ============================================================================
// COLLECT-A-CON (collectaconusa.com) — Pokemon + Sports Cards
// ============================================================================
async function scrapeCollectACon() {
  const events = [];
  try {
    const html = await fetchHtml("https://collectaconusa.com/");
    const doc = dom(html);
    
    // Events are in image alt text and src filenames
    const imgs = doc.querySelectorAll("img[alt], img[src]");
    for (const img of imgs) {
      const alt = img.getAttribute("alt") || "";
      const src = img.getAttribute("src") || "";
      
      // Look for date pattern in src: e.g., JUL-11-12-2026
      const srcDateMatch = src.match(/([A-Z]{3})-(\d{1,2})-(\d{1,2})-(\d{4})/i);
      if (srcDateMatch) {
        const month = MONTH_MAP[srcDateMatch[1].toLowerCase()];
        if (!month) continue;
        const year = srcDateMatch[4];
        const startDate = `${year}-${month}-${srcDateMatch[2].padStart(2,"0")}`;
        if (startDate < new Date().toISOString().split("T")[0]) continue;
        
        // Location from alt text
        const locMatch = alt.match(/([A-Za-z\s]+)\s+(\d{4})/);
        const city = locMatch ? locMatch[1].trim() : null;
        
        events.push({
          name: `Collect-A-Con ${city || ""}`.trim(),
          category: "pokemon", startDate,
          endDate: `${year}-${month}-${srcDateMatch[3].padStart(2,"0")}`,
          city, state: null, country: "United States",
          venue: null, website: "https://collectaconusa.com",
          admission: null, description: "Trading card and collectibles convention", status: "approved",
        });
      }
    }
  } catch (e) {
    console.error("CollectACon error:", e.message);
  }
  return events;
}

// ============================================================================
// D23 EVENTS (d23.com/events) — Disney Pins
// ============================================================================
async function scrapeD23() {
  const events = [];
  try {
    const html = await fetchHtml("https://d23.com/events");
    const doc = dom(html);
    
    const articles = doc.querySelectorAll("article.d23module_event, article, .event-item");
    for (const article of articles) {
      const name = article.querySelector("a, h2, h3")?.getAttribute("title")
        || article.querySelector("a, h2, h3")?.textContent.trim();
      if (!name || name.length < 3) continue;
      
      const dateText = article.querySelector(".d23-events-meta-text, time, .event-date")?.textContent.trim()
        || article.textContent;
      const dateMatch = dateText.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:[–\-](\d{1,2})(?:st|nd|rd|th)?)?,?\s+(\d{4})/);
      if (!dateMatch) continue;
      
      const month = MONTH_MAP[dateMatch[1].toLowerCase()];
      if (!month) continue;
      const startDay = dateMatch[2].padStart(2, "0");
      const endDay = dateMatch[3] ? dateMatch[3].padStart(2, "0") : null;
      const year = dateMatch[4];
      const startDate = `${year}-${month}-${startDay}`;
      if (startDate < new Date().toISOString().split("T")[0]) continue;
      
      const locMatch = dateText.match(/([A-Za-z\s]+),\s+([A-Z]{2})\b/);
      
      events.push({
        name, category: "disney_pins", startDate,
        endDate: endDay ? `${year}-${month}-${endDay}` : null,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://d23.com/events",
        admission: null, description: null, status: "approved",
      });
    }
  } catch (e) {
    console.error("D23 error:", e.message);
  }
  return events;
}

// ============================================================================
// JOEFEST (joefestusa.com) — Vintage Toys (single annual event)
// ============================================================================
async function scrapeJoeFest() {
  try {
    const html = await fetchHtml("https://joefestusa.com");
    const doc = dom(html);
    const text = doc.body.textContent;
    const dateMatch = text.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/);
    if (!dateMatch) return [];
    const month = MONTH_MAP[dateMatch[1].toLowerCase()];
    if (!month) return [];
    const year = dateMatch[4];
    const startDate = `${year}-${month}-${dateMatch[2].padStart(2,"0")}`;
    if (startDate < new Date().toISOString().split("T")[0]) return [];
    
    const locMatch = text.match(/([A-Z]+),\s+([A-Z]{2})\b/);
    return [{
      name: "JoeFest Toy and Comic Convention", category: "vintage_toys", startDate,
      endDate: dateMatch[3] ? `${year}-${month}-${dateMatch[3].padStart(2,"0")}` : null,
      city: locMatch ? locMatch[1].charAt(0) + locMatch[1].slice(1).toLowerCase() : "Augusta",
      state: locMatch ? expandState(locMatch[2]) : "Georgia",
      country: "United States", venue: null,
      website: "https://joefestusa.com",
      admission: null, description: "G.I. Joe toy and comic convention", status: "approved",
    }];
  } catch (e) {
    console.error("JoeFest error:", e.message);
    return [];
  }
}

// ============================================================================
// BRICKUNIVERSE (brickuniverse.com) — Vintage Toys (LEGO tour)
// ============================================================================
async function scrapeBrickUniverse() {
  const events = [];
  try {
    const html = await fetchHtml("https://www.brickuniverseusa.com/cities");
    const doc = dom(html);
    
    // Structure: h1 = "CITY, ST", h2 = "JAN 10-11, 2026"
    const headings = doc.querySelectorAll("h1, h2");
    let currentCity = null, currentState = null;
    
    for (const h of headings) {
      const text = h.textContent.trim();
      
      // City heading: "LYNCHBURG, VA"
      if (h.tagName === "H1") {
        const locMatch = text.match(/^([A-Z\s]+),\s+([A-Z]{2})$/);
        if (locMatch) {
          currentCity = locMatch[1].charAt(0) + locMatch[1].slice(1).toLowerCase();
          currentState = expandState(locMatch[2]);
        }
        continue;
      }
      
      // Date heading: "JAN 10-11, 2026"
      if (h.tagName === "H2" && currentCity) {
        const dateMatch = text.match(/([A-Z]{3})\s+(\d{1,2})(?:[–\-](\d{1,2}))?,?\s+(\d{4})/i);
        if (!dateMatch) continue;
        
        const month = MONTH_MAP[dateMatch[1].toLowerCase()];
        if (!month) continue;
        const year = dateMatch[4];
        const startDate = `${year}-${month}-${dateMatch[2].padStart(2,"0")}`;
        if (startDate < new Date().toISOString().split("T")[0]) continue;
        
        events.push({
          name: `BrickUniverse LEGO Fan Convention — ${currentCity}`,
          category: "vintage_toys", startDate,
          endDate: dateMatch[3] ? `${year}-${month}-${dateMatch[3].padStart(2,"0")}` : null,
          city: currentCity, state: currentState, country: "United States",
          venue: null, website: "https://brickuniverse.com",
          admission: null, description: "LEGO fan convention", status: "approved",
        });
      }
    }
  } catch (e) {
    console.error("BrickUniverse error:", e.message);
  }
  return events;
}

// ============================================================================
// MAIN: Run all scrapers and save combined results
// ============================================================================
async function main() {
  const scrapers = [
    { name: "ConventionScene", fn: scrapeConventionScene },
    { name: "ComicConsXyz", fn: scrapeComicConsXyz },
    { name: "GenoTalks", fn: scrapeGenoTalks },
    { name: "CardboardConnection", fn: scrapeCardboardConnection },
    { name: "SportsCollectorsDigest", fn: sportscollectorsDigest },
    { name: "RetroWorldExpo", fn: scrapeRetroWorldExpo },
    { name: "StampsOrg", fn: scrapeStampsOrg },
    { name: "MoneyOrg", fn: scrapeMoneyOrg },
    { name: "Tristar", fn: scrapeTristar },
    { name: "HollywoodShow", fn: scrapeHollywoodShow },
    { name: "Monsterpalooza", fn: scrapeMonsterpalooza },
    { name: "TCGCons", fn: scrapeTCGCons },
    { name: "CollectACon", fn: scrapeCollectACon },
    { name: "D23", fn: scrapeD23 },
    { name: "JoeFest", fn: scrapeJoeFest },
    { name: "BrickUniverse", fn: scrapeBrickUniverse },
  ];

  const allEvents = [];
  for (const { name, fn } of scrapers) {
    console.log(`Scraping ${name}...`);
    try {
      const events = await fn();
      console.log(`  → ${events.length} events`);
      allEvents.push(...events);
    } catch (e) {
      console.error(`  → ERROR: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // Deduplicate within this batch by name+startDate
  const seen = new Set();
  const deduped = allEvents.filter(e => {
    const key = `${e.name}||${e.startDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\nTotal scraped: ${allEvents.length} | After dedup: ${deduped.length}`);
  fs.writeFileSync("scripts/all-sites-results.json", JSON.stringify(deduped, null, 2));
  console.log("Results saved to scripts/all-sites-results.json");
}

main().catch(console.error);
