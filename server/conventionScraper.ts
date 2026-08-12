// @ts-nocheck
/**
 * Convention scraper runner — called from the admin tRPC endpoint.
 * Runs all scrapers and inserts new events into the database.
 * Deduplicates by name + startDate to avoid double-inserting.
 */
import { requireDb } from "./db";
import { conventions } from "../drizzle/schema";
import { and, eq, gte } from "drizzle-orm";
import { JSDOM } from "jsdom";

const TODAY = () => new Date().toISOString().split("T")[0];
const YEAR = new Date().getFullYear();
const NEXT_YEAR = YEAR + 1;

const MONTH_MAP: Record<string, string> = {
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
};

const US_STATE_ABBR: Record<string, string> = {
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

function expandState(abbr: string | undefined): string | null {
  if (!abbr) return null;
  return US_STATE_ABBR[abbr.trim().toUpperCase()] || abbr.trim();
}

function parseDate(text: string): { startDate: string; endDate: string | null } | null {
  const m = text.match(/([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[-–]\s*(?:[A-Za-z]+\.?\s+)?(\d{1,2})(?:st|nd|rd|th)?)?,?\s+(\d{4})/);
  if (!m) return null;
  const month = MONTH_MAP[m[1].toLowerCase()];
  if (!month) return null;
  const year = m[4];
  const startDate = `${year}-${month}-${m[2].padStart(2, "0")}`;
  const endDate = m[3] ? `${year}-${month}-${m[3].padStart(2, "0")}` : null;
  if (startDate < TODAY()) return null;
  return { startDate, endDate };
}

interface ConventionEvent {
  name: string;
  category: string;
  startDate: string;
  endDate: string | null;
  city: string | null;
  state: string | null;
  country: string;
  venue: string | null;
  website: string;
  admission: string | null;
  description: string | null;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "curl/7.88.1", "Accept": "*/*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ============================================================================
// CARD SHOW HUB — Sports Cards (up to 2 pages to keep it fast)
// ============================================================================
async function scrapeCardShowHub(): Promise<ConventionEvent[]> {
  const events: ConventionEvent[] = [];
  const monthMap: Record<string, string> = {
    Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
    Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12",
  };

  for (let page = 1; page <= 3; page++) {
    try {
      const url = page === 1 ? "https://cardshowhub.com/events" : `https://cardshowhub.com/events?page=${page}`;
      const html = await fetchHtml(url);
      const doc = new JSDOM(html).window.document;
      const cards = doc.querySelectorAll("a[href^='/events/']");
      let found = 0;

      for (const card of Array.from(cards)) {
        const h3 = card.querySelector("h3");
        if (!h3) continue;
        const name = h3.textContent?.trim();
        if (!name) continue;

        const allText: string[] = [];
        Array.from(card.querySelectorAll("*")).forEach((el: Element) => {
          el.childNodes.forEach((n: ChildNode) => {
            if (n.nodeType === 3 && n.textContent?.trim()) allText.push(n.textContent.trim());
          });
        });

        const dateText = allText.find((t: string) => /^[A-Z][a-z]{2}\s+\d/.test(t));
        if (!dateText) continue;
        const dm = dateText.match(/^([A-Z][a-z]{2})\s+(\d{1,2})(?:[–\-](\d{1,2}))?/);
        if (!dm) continue;
        const month = monthMap[dm[1]];
        if (!month) continue;
        const now = new Date();
        let year = YEAR;
        if (parseInt(month) < now.getMonth() + 1) year = NEXT_YEAR;
        const startDate = `${year}-${month}-${dm[2].padStart(2,"0")}`;
        if (startDate < TODAY()) continue;
        const endDate = dm[3] ? `${year}-${month}-${dm[3].padStart(2,"0")}` : null;

        const locText = allText.find((t: string) => /^[A-Za-z\s]+,\s+[A-Za-z\s]+$/.test(t) && !t.includes("Entry"));
        let city = null, state = null;
        if (locText) {
          const parts = locText.split(",").map((p: string) => p.trim());
          city = parts[0]; state = parts[1];
        }

        const admText = allText.find((t: string) => /free entry|^\$\d|free$/i.test(t));
        const admission = admText ? (admText.toLowerCase().includes("free") ? "Free" : admText.match(/\$[\d.]+/)?.[0] || null) : null;

        events.push({
          name, category: "sports_cards", startDate, endDate,
          city, state, country: "United States",
          venue: null,
          website: `https://cardshowhub.com${card.getAttribute("href")}`,
          admission, description: null,
        });
        found++;
      }
      if (found < 10) break;
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      break;
    }
  }
  return events;
}

// ============================================================================
// TOYCONS / VIDEOGAMECONS — shared platform
// ============================================================================
async function scrapeToyConsPage(url: string, category: string): Promise<ConventionEvent[]> {
  const events: ConventionEvent[] = [];
  try {
    const html = await fetchHtml(url);
    const doc = new JSDOM(html).window.document;
    const text = doc.body.textContent || "";
    const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 2);

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

      const venueLine = lines[i + 1] || "";
      if (!venueLine || parseDate(venueLine)) continue;

      const locMatch = venueLine.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})$/);
      if (!locMatch) continue;

      const city = locMatch[1].trim();
      const state = expandState(locMatch[2]);
      const venueOnly = venueLine.substring(0, venueLine.lastIndexOf(locMatch[0])).trim() || null;
      const cleanName = name.replace(/\s*\(?\d{4}\)?$/, "").trim();
      if (!cleanName || cleanName.length < 3) continue;

      events.push({
        name: cleanName, category, ...dateResult,
        city, state, country: "United States",
        venue: venueOnly && venueOnly.length > 2 ? venueOnly : null,
        website: url, admission: null, description: null,
      });
    }
  } catch {}
  return events;
}

// ============================================================================
// POPVERSE — Comics
// ============================================================================
async function scrapePopverse(): Promise<ConventionEvent[]> {
  const events: ConventionEvent[] = [];
  const US_STATES = new Set(Object.values(US_STATE_ABBR));
  try {
    const html = await fetchHtml("https://www.thepopverse.com/comics-conventions-cons-con-near-me-nycc-san-diego-anime-tickets");
    const doc = new JSDOM(html).window.document;
    const text = doc.body.textContent || "";
    const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 2);

    for (let i = 0; i < lines.length - 2; i++) {
      const dateResult = parseDate(lines[i]);
      if (!dateResult) continue;
      const name = lines[i + 1];
      if (!name || name.length < 3 || /^[A-Z][a-z]+ \d/.test(name) || /^\d{4}/.test(name)) continue;
      const locationText = lines[i + 2];
      if (!locationText || /^[A-Z][a-z]+ \d/.test(locationText)) continue;
      const parts = locationText.split(",").map((p: string) => p.trim());
      const city = parts[0];
      const state = parts[parts.length - 1];
      if (state && !US_STATES.has(state)) continue;

      events.push({
        name: name.trim(), category: "comics", ...dateResult,
        city, state, country: "United States",
        venue: null,
        website: "https://www.thepopverse.com/comics-conventions-cons-con-near-me-nycc-san-diego-anime-tickets",
        admission: null, description: null,
      });
      i += 2;
    }
  } catch {}
  return events;
}

// ============================================================================
// NUMISMATIC NEWS — Coins
// ============================================================================
async function scrapeNumismaticNews(): Promise<ConventionEvent[]> {
  const events: ConventionEvent[] = [];
  try {
    const html = await fetchHtml("https://www.numismaticnews.net/events/show-calendar");
    const doc = new JSDOM(html).window.document;
    const text = doc.body.textContent || "";
    const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 3);

    for (const line of lines) {
      const m = line.match(/^([A-Z][a-z]{2})\s+(\d{1,2})(?:-(\d{1,2}))?\s+([A-Z]{2}),\s+([^.]+)\.\s+([^.]+)/);
      if (!m) continue;
      const month = MONTH_MAP[m[1].toLowerCase()];
      if (!month) continue;
      const now = new Date();
      let year = YEAR;
      if (parseInt(month) < now.getMonth() + 1) year = NEXT_YEAR;
      const startDate = `${year}-${month}-${m[2].padStart(2,"0")}`;
      if (startDate < TODAY()) continue;
      const endDate = m[3] ? `${year}-${month}-${m[3].padStart(2,"0")}` : null;
      const state = US_STATE_ABBR[m[4]] || m[4];
      const city = m[5].trim();
      const name = m[6].trim();
      if (!name || name.length < 3) continue;

      const admMatch = line.match(/\bA:\s*([^.]+?)(?:\.|T:|F:|SP:|SH:|$)/);
      const admission = admMatch ? admMatch[1].trim() : null;

      events.push({
        name, category: "coins", startDate, endDate,
        city, state, country: "United States",
        venue: null,
        website: "https://www.numismaticnews.net/events/show-calendar",
        admission: admission === "Free" ? "Free" : admission,
        description: null,
      });
    }
  } catch {}
  return events;
}

// ============================================================================
// AMERICAN STAMP DEALER — Stamps
// ============================================================================
async function scrapeAmericanStampDealer(): Promise<ConventionEvent[]> {
  const events: ConventionEvent[] = [];
  try {
    const html = await fetchHtml("https://www.americanstampdealer.com/Show_Calendar.aspx");
    const doc = new JSDOM(html).window.document;
    const rows = Array.from(doc.querySelectorAll("table tr"));
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td"));
      if (cells.length < 2) continue;
      const dateText = cells[0]?.textContent?.trim() || "";
      const dateResult = parseDate(dateText);
      if (!dateResult) continue;
      const name = cells[1]?.textContent?.trim();
      if (!name || name.length < 3) continue;
      const locText = cells[2]?.textContent?.trim() || cells[3]?.textContent?.trim() || "";
      const locMatch = locText.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/);
      events.push({
        name, category: "stamps", ...dateResult,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://www.americanstampdealer.com/Show_Calendar.aspx",
        admission: null, description: null,
      });
    }
  } catch {}
  return events;
}

// ============================================================================
// WFSC STAMPS — Stamps
// ============================================================================
async function scrapeWFSCStamps(): Promise<ConventionEvent[]> {
  const events: ConventionEvent[] = [];
  try {
    const html = await fetchHtml("https://www.wfscstamps.org/Shows/");
    const doc = new JSDOM(html).window.document;
    const text = doc.body.textContent || "";
    const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 5);
    for (const line of lines) {
      const dateResult = parseDate(line);
      if (!dateResult) continue;
      const dashIdx = line.indexOf(" - ", line.search(/\d{4}/));
      const name = dashIdx > 0 ? line.substring(dashIdx + 3).trim() : "";
      if (!name || name.length < 3) continue;
      const locMatch = line.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/);
      events.push({
        name, category: "stamps", ...dateResult,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://www.wfscstamps.org/Shows/",
        admission: null, description: null,
      });
    }
  } catch {}
  return events;
}

// ============================================================================
// HALL OF FAME SIGNINGS — Autographs
// ============================================================================
async function scrapeHallOfFameSignings(): Promise<ConventionEvent[]> {
  const events: ConventionEvent[] = [];
  try {
    const html = await fetchHtml("https://halloffamesignings.com/");
    const doc = new JSDOM(html).window.document;
    const text = doc.body.textContent || "";
    const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 5);
    for (let i = 0; i < lines.length; i++) {
      const dateResult = parseDate(lines[i]);
      if (!dateResult) continue;
      const name = lines[i - 1] || "";
      if (!name || name.length < 3 || name === "Hall of Fame Signings") continue;
      const locMatch = lines[i + 1]?.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/) ||
                       lines[i].match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/);
      events.push({
        name: name.trim(), category: "autographs", ...dateResult,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://halloffamesignings.com",
        admission: null, description: null,
      });
    }
  } catch {}
  return events;
}

// ============================================================================
// CREATION ENTERTAINMENT — Autographs / Movies
// ============================================================================
async function scrapeCreationEnt(): Promise<ConventionEvent[]> {
  const events: ConventionEvent[] = [];
  try {
    const html = await fetchHtml("https://www.creationent.com/calendar.htm");
    const doc = new JSDOM(html).window.document;
    const paras = Array.from(doc.querySelectorAll("p"));
    for (const p of paras) {
      const strong = p.querySelector("strong");
      const dateLink = p.querySelector("a.small1, a");
      if (!strong || !dateLink) continue;
      const locationText = strong.textContent?.trim() || "";
      const dateText = dateLink.textContent?.trim() || "";
      const dateResult = parseDate(dateText);
      if (!dateResult) continue;
      const locMatch = locationText.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/);
      const name = `Creation Entertainment — ${locationText}`;
      events.push({
        name, category: "autographs", ...dateResult,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://www.creationent.com/calendar.htm",
        admission: null, description: "Celebrity autograph convention",
      });
    }
  } catch {}
  return events;
}

// ============================================================================
// D23 EVENTS — Disney Pins
// ============================================================================
async function scrapeD23(): Promise<ConventionEvent[]> {
  const events: ConventionEvent[] = [];
  try {
    const html = await fetchHtml("https://d23.com/events");
    const doc = new JSDOM(html).window.document;
    const articles = Array.from(doc.querySelectorAll("article, .event-item"));
    for (const article of articles as Element[]) {
      const name = (article.querySelector("a, h2, h3") as HTMLElement)?.getAttribute("title") ||
                   (article.querySelector("a, h2, h3") as HTMLElement)?.textContent?.trim() || "";
      if (!name || name.length < 3) continue;
      const dateText = article.querySelector(".d23-events-meta-text, time, .event-date")?.textContent?.trim() || article.textContent || "";
      const dateResult = parseDate(dateText);
      if (!dateResult) continue;
      const locMatch = dateText.match(/([A-Za-z][A-Za-z\s.]+),\s+([A-Z]{2})/);
      events.push({
        name, category: "disney_pins", ...dateResult,
        city: locMatch ? locMatch[1].trim() : null,
        state: locMatch ? expandState(locMatch[2]) : null,
        country: "United States", venue: null,
        website: "https://d23.com/events",
        admission: null, description: null,
      });
    }
  } catch {}
  return events;
}

// ============================================================================
// VIDEOGAMECONS 2026 CALENDAR — Video Games + Pokemon/TCG
// Tags events with Pokemon/TCG keywords as pokemon category
// ============================================================================
async function scrapeVideoGameCons2026(): Promise<ConventionEvent[]> {
  const allEvents = await scrapeToyConsPage("https://videogamecons.com/calendar/calendar.php?year=2026", "video_games");
  // Re-tag Pokemon/TCG events
  return allEvents.map(e => ({
    ...e,
    category: /pokemon|poke|tcg|trading card/i.test(e.name) ? "pokemon" : e.category,
  }));
}

// ============================================================================
// MAIN RUNNER — called from tRPC endpoint
// ============================================================================
export async function runConventionScraper(): Promise<{ inserted: number; skipped: number; errors: number; byCategory: Record<string, number> }> {
  const db = await requireDb();

  // Get existing entries to avoid duplicates
  const existing = await db.select({ name: conventions.name, startDate: conventions.startDate }).from(conventions);
  const existingSet = new Set(existing.map(r => `${r.name.substring(0, 50)}||${r.startDate}`));

  const allEvents: ConventionEvent[] = [];

  // Run all scrapers
  const scrapers: Array<{ name: string; fn: () => Promise<ConventionEvent[]> }> = [
    // Sports Cards
    { name: "CardShowHub", fn: scrapeCardShowHub },
    // Vintage Toys
    { name: "ToysCons", fn: () => scrapeToyConsPage("https://toycons.com/calendar/calendar.php?year=2026&loc=us", "vintage_toys") },
    { name: "ToyConsFuture", fn: () => scrapeToyConsPage("https://toycons.com/calendar/", "vintage_toys") },
    // Video Games + Pokemon/TCG
    { name: "VideoGameCons", fn: () => scrapeToyConsPage("https://videogamecons.com/calendar/", "video_games") },
    { name: "VideoGameCons2026", fn: scrapeVideoGameCons2026 },
    // Comics
    { name: "Popverse", fn: scrapePopverse },
    // Coins
    { name: "NumismaticNews", fn: scrapeNumismaticNews },
    // Stamps
    { name: "AmericanStampDealer", fn: scrapeAmericanStampDealer },
    { name: "WFSCStamps", fn: scrapeWFSCStamps },
    // Autographs
    { name: "HallOfFameSignings", fn: scrapeHallOfFameSignings },
    { name: "CreationEnt", fn: scrapeCreationEnt },
    // Disney Pins
    { name: "D23", fn: scrapeD23 },
  ];

  for (const { name, fn } of scrapers) {
    try {
      const events = await fn();
      allEvents.push(...events);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e: any) {
      console.error(`Scraper ${name} failed:`, e.message);
    }
  }

  // Deduplicate within this batch
  const seen = new Set<string>();
  const deduped = allEvents.filter(e => {
    if (!e.name || !e.startDate) return false;
    const key = `${e.name.substring(0, 50)}||${e.startDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Insert new events
  let inserted = 0, skipped = 0, errors = 0;
  const byCategory: Record<string, number> = {};

  for (const e of deduped) {
    const key = `${e.name.substring(0, 50)}||${e.startDate}`;
    if (existingSet.has(key)) { skipped++; continue; }

    try {
      await db.insert(conventions).values({
        name: e.name,
        category: e.category as any,
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        city: e.city ?? null,
        state: e.state ?? null,
        country: e.country,
        venue: e.venue ?? null,
        website: e.website ?? null,
        admission: e.admission ?? null,
        description: e.description ?? null,
        source: "scraper",
        status: "approved",
      });
      inserted++;
      existingSet.add(key);
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    } catch (err: any) {
      errors++;
    }
  }

  return { inserted, skipped, errors, byCategory };
}
