/**
 * Clean up the new-sources-results.json data before inserting:
 * 1. Fix names that have address/venue text embedded in them
 * 2. Extract city/state from the name field where possible
 * 3. Remove duplicate entries (same show appearing from multiple scrapers)
 * 4. Remove entries with no meaningful name
 */
import fs from "fs";

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

function extractLocationFromText(text) {
  // Try "City, ST" pattern
  const m = text.match(/([A-Za-z\s\.]+),\s+([A-Z]{2})\b/);
  if (m) return { city: m[1].trim(), state: expandState(m[2]) };
  // Try "City, State" full name
  const m2 = text.match(/([A-Za-z\s]+),\s+(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)/i);
  if (m2) return { city: m2[1].trim(), state: m2[2] };
  return { city: null, state: null };
}

function cleanName(name) {
  if (!name) return null;
  // Remove address-like content (numbers, zip codes, street names)
  let clean = name
    .replace(/\d{5}(-\d{4})?/g, "") // zip codes
    .replace(/\d+\s+[A-Z][a-z]+\s+(St|Ave|Blvd|Dr|Rd|Way|Ln|Ct|Pl)\b.*/i, "") // street addresses
    .replace(/\b(PO Box|P\.O\. Box)\s+\d+.*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  
  // If name has embedded location (e.g., "Show Name\nCity, ST\nVenue"), take first line
  const lines = clean.split(/[\n\r]/);
  if (lines.length > 1 && lines[0].length > 3) {
    clean = lines[0].trim();
  }
  
  // Remove trailing punctuation
  clean = clean.replace(/[,\.\-–]+$/, "").trim();
  
  return clean.length > 2 ? clean : null;
}

const data = JSON.parse(fs.readFileSync("scripts/new-sources-results.json", "utf8"));
const today = new Date().toISOString().split("T")[0];

const cleaned = [];
const seen = new Set();

for (const event of data) {
  // Fix name
  const name = cleanName(event.name);
  if (!name || name.length < 3) continue;
  
  // Must have a valid future date
  if (!event.startDate || event.startDate < today) continue;
  
  // Extract location from name if not already set
  let city = event.city;
  let state = event.state;
  if (!city || !state) {
    const loc = extractLocationFromText(event.name + " " + (event.venue || ""));
    city = city || loc.city;
    state = state || loc.state;
  }
  
  // Deduplicate: same name + startDate
  const key = `${name}||${event.startDate}`;
  if (seen.has(key)) continue;
  seen.add(key);
  
  // Also deduplicate by similar name (Hall of Fame Signings has duplicates)
  const shortKey = `${name.substring(0, 30)}||${event.startDate}`;
  if (seen.has(shortKey)) continue;
  seen.add(shortKey);
  
  cleaned.push({
    ...event,
    name,
    city: city || null,
    state: state || null,
  });
}

console.log(`Original: ${data.length} | Cleaned: ${cleaned.length}`);
console.log("By category:", JSON.stringify(
  cleaned.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {})
));
console.log("\nSample cleaned:");
cleaned.slice(0, 8).forEach(e => console.log(` ${e.category} | ${e.name} | ${e.startDate} | ${e.city}, ${e.state}`));

fs.writeFileSync("scripts/new-sources-clean.json", JSON.stringify(cleaned, null, 2));
console.log("\nSaved to scripts/new-sources-clean.json");
