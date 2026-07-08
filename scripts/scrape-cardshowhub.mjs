/**
 * Scraper: Card Show Hub (cardshowhub.com)
 * Category: sports_cards
 * Scrapes up to 5 pages (300 events) of upcoming shows.
 */
import { JSDOM } from "jsdom";
import fs from "fs";

const BASE_URL = "https://cardshowhub.com/events";
const MAX_PAGES = 5;
const CURRENT_YEAR = new Date().getFullYear();

const MONTH_MAP = {
  Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
  Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12",
};

function parseDate(dateText) {
  const clean = dateText.trim();
  const m = clean.match(/^([A-Za-z]+)\s+(\d+)(?:[–\-](\d+))?/);
  if (!m) return { startDate: null, endDate: null };
  const month = MONTH_MAP[m[1]] ?? "01";
  const startDay = m[2].padStart(2, "0");
  const endDay = m[3] ? m[3].padStart(2, "0") : null;
  const now = new Date();
  let year = CURRENT_YEAR;
  if (parseInt(month) < now.getMonth() + 1) year = CURRENT_YEAR + 1;
  return {
    startDate: `${year}-${month}-${startDay}`,
    endDate: endDay ? `${year}-${month}-${endDay}` : null,
  };
}

function parseAdmission(text) {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  if (t.includes("free")) return "Free";
  const m = text.match(/\$[\d.]+/);
  return m ? m[0] : text.trim();
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TradebiliaBot/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function scrapePage(url) {
  const html = await fetchPage(url);
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const events = [];

  const cards = doc.querySelectorAll("a[href^='/events/']");
  for (const card of cards) {
    try {
      const h3 = card.querySelector("h3");
      if (!h3) continue;
      const name = h3.textContent.trim();
      if (!name) continue;

      const allText = [];
      card.querySelectorAll("*").forEach(el => {
        el.childNodes.forEach(n => {
          if (n.nodeType === 3 && n.textContent.trim()) allText.push(n.textContent.trim());
        });
      });

      const dateText = allText.find(t => /^[A-Z][a-z]{2}\s+\d/.test(t));
      const { startDate, endDate } = dateText ? parseDate(dateText) : { startDate: null, endDate: null };
      if (!startDate) continue;

      const locationText = allText.find(t => /^[A-Za-z\s]+,\s+[A-Za-z\s]+$/.test(t) && !t.includes("Entry"));
      let city = null, state = null;
      if (locationText) {
        const parts = locationText.split(",").map(p => p.trim());
        city = parts[0] || null;
        state = parts[1] || null;
      }

      const admissionText = allText.find(t => /free entry|^\$\d|free$/i.test(t));
      const admission = parseAdmission(admissionText);

      let venue = null;
      if (locationText) {
        const locIdx = allText.indexOf(locationText);
        if (locIdx >= 0 && locIdx + 1 < allText.length) {
          const next = allText[locIdx + 1];
          if (next && !/free entry|^\$|\d+:\d+|tables/i.test(next) && next !== name) venue = next;
        }
      }

      events.push({
        name, category: "sports_cards", startDate, endDate,
        city, state, country: "United States", venue,
        website: `https://cardshowhub.com${card.getAttribute("href")}`,
        admission, description: null, status: "approved",
      });
    } catch {}
  }

  return { events, hasMore: cards.length >= 60 };
}

async function scrapeAll() {
  const allEvents = [];
  let page = 1;
  while (page <= MAX_PAGES) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`;
    console.log(`Scraping page ${page}: ${url}`);
    try {
      const { events, hasMore } = await scrapePage(url);
      console.log(`  Found ${events.length} events`);
      allEvents.push(...events);
      if (!hasMore || events.length < 10) break;
      page++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error(`  Error on page ${page}:`, e.message);
      break;
    }
  }
  console.log(`\nTotal events scraped: ${allEvents.length}`);
  fs.writeFileSync("scripts/cardshowhub-results.json", JSON.stringify(allEvents, null, 2));
  console.log("Results saved to scripts/cardshowhub-results.json");
  return allEvents;
}

scrapeAll().catch(console.error);
