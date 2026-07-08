/**
 * Final cleanup and insert for new convention sources.
 * Uses a targeted approach for each data source.
 */
import mysql from "mysql2/promise";
import fs from "fs";

const today = new Date().toISOString().split("T")[0];

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

// Extract the LAST "City, ST" occurrence from a messy string
// (addresses often have "City, ST Zip" at the end)
function extractLastCityState(text) {
  const matches = [...text.matchAll(/([A-Za-z][A-Za-z\s\.]+),\s+([A-Z]{2})\s*\d*/g)];
  if (!matches.length) return { city: null, state: null };
  const last = matches[matches.length - 1];
  return { city: last[1].trim(), state: expandState(last[2]) };
}

// Extract the show name: everything before the first number or venue indicator
function extractShowName(rawName) {
  if (!rawName) return null;
  
  // Remove everything from first street number onwards
  let name = rawName
    .replace(/\d+\s+[A-Z][a-z]+\s+(St|Ave|Blvd|Dr|Rd|Way|Ln|Ct|Pl|Pkwy|Hwy)\b.*/i, "")
    .replace(/\bP\.?O\.?\s*Box\s+\d+.*/i, "")
    .replace(/\d{5}(-\d{4})?.*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  
  // If there's still venue info (hotel/hall names after the show name), try to split
  const venueKeywords = /\b(Hilton|Marriott|Sheraton|Holiday Inn|Best Western|Comfort Inn|Hampton Inn|Doubletree|Hyatt|Westin|Radisson|Crowne Plaza|Embassy Suites|Masonic|VFW|American Legion|Community Center|Convention Center|Conference Center|Event Center|Expo Center|Fairgrounds|Civic Center|Park District|Church|School|Library|Mall|Hotel|Inn|Lodge|Suites|Resort)\b/i;
  const venueMatch = name.search(venueKeywords);
  if (venueMatch > 5) {
    name = name.substring(0, venueMatch).trim();
  }
  
  // Clean trailing punctuation and whitespace
  name = name.replace(/[,\.\-–\s]+$/, "").trim();
  
  return name.length > 2 ? name : null;
}

const data = JSON.parse(fs.readFileSync("scripts/new-sources-results.json", "utf8"));

const goodEvents = [];
const seen = new Set();

for (const event of data) {
  if (!event.startDate || event.startDate < today) continue;
  
  let name = event.name;
  let city = event.city;
  let state = event.state;
  
  // For stamps with messy names, extract properly
  if (event.category === "stamps") {
    const cleanedName = extractShowName(event.name);
    if (!cleanedName) continue;
    name = cleanedName;
    
    if (!city || !state) {
      const loc = extractLastCityState(event.name);
      city = city || loc.city;
      state = state || loc.state;
    }
  }
  
  // For autographs, clean bullet-separated names
  if (event.category === "autographs") {
    if (name === "Hall of Fame Signings") continue; // Too generic
    const bulletParts = name.split("•");
    if (bulletParts.length > 1) {
      name = bulletParts[0].trim();
      if (!city) {
        const loc = extractLastCityState(bulletParts[bulletParts.length - 1]);
        city = city || loc.city;
        state = state || loc.state;
      }
    }
    // Skip future year events (2027+)
    if (event.startDate.startsWith("2027") || event.startDate.startsWith("2028")) continue;
  }
  
  // Final cleanup
  name = name.replace(/\s{2,}/g, " ").replace(/[,\.\-–]+$/, "").trim();
  if (!name || name.length < 3) continue;
  
  // Deduplicate
  const key = `${name.substring(0, 50)}||${event.startDate}`;
  if (seen.has(key)) continue;
  seen.add(key);
  
  goodEvents.push({ ...event, name, city: city || null, state: state || null });
}

console.log(`Good events to insert: ${goodEvents.length}`);
const byCat = goodEvents.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {});
console.log("By category:", JSON.stringify(byCat));

console.log("\nAll stamps:");
goodEvents.filter(e=>e.category==="stamps").forEach(e=>console.log(` ${e.name} | ${e.startDate} | ${e.city}, ${e.state}`));
console.log("\nAll autographs:");
goodEvents.filter(e=>e.category==="autographs").forEach(e=>console.log(` ${e.name} | ${e.startDate} | ${e.city}, ${e.state}`));

// Insert into database
const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
const conn = await mysql.createConnection(url);
const [existing] = await conn.execute("SELECT name, startDate FROM conventions");
const existingSet = new Set(existing.map(r => `${r.name.substring(0,50)}||${r.startDate}`));

let inserted = 0, skipped = 0, errors = 0;
for (const e of goodEvents) {
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
    console.error(`Error: ${e.name} - ${err.message}`);
    errors++;
  }
}
await conn.end();
console.log(`\nInserted: ${inserted} | Skipped: ${skipped} | Errors: ${errors}`);
