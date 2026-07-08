/**
 * Improved cleanup for new-sources-results.json
 * The American Stamp Dealer data has names with embedded addresses.
 * This script properly splits them.
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

function extractCityState(text) {
  const m = text.match(/([A-Za-z][A-Za-z\s\.]+),\s+([A-Z]{2})\b/);
  if (!m) return null;
  return { city: m[1].trim(), state: expandState(m[2]) };
}

function cleanStampName(rawName) {
  if (!rawName) return { name: null, city: null, state: null, venue: null };
  
  // The American Stamp Dealer format: "ShowName\nVenueName\nAddress\nCity, ST Zip"
  // or "ShowNameVenueNameAddressCity, ST Zip" (all concatenated)
  
  // First try to find the city/state pattern
  const cityStateMatch = rawName.match(/([A-Za-z][A-Za-z\s\.]+),\s+([A-Z]{2})\s*\d*/);
  
  if (!cityStateMatch) {
    // No location found, just clean the name
    return { 
      name: rawName.replace(/\s{2,}/g, " ").trim().substring(0, 100),
      city: null, state: null, venue: null 
    };
  }
  
  const city = cityStateMatch[1].trim();
  const state = expandState(cityStateMatch[2]);
  
  // Everything before the city/state is name + venue
  const beforeCity = rawName.substring(0, rawName.indexOf(cityStateMatch[0])).trim();
  
  // Split name from venue: venue is usually after the show name
  // Show names often end with "Show", "Expo", "Exhibition", "Fair", "Convention", "NAPEX", etc.
  const showNameMatch = beforeCity.match(/^([A-Za-z][A-Za-z\s\-&\.]+?(?:Show|Expo|Exhibition|Fair|Convention|Congress|Club|Bourse|NAPEX|MILCOPEX|WESTPEX|NOJEX|COMPEX|NWPEX|NASPEX|INTERPEX|ASDA|MSDA|WFSC|APS|PNSC|AFDCS|AAPE|AAMS))\s*/i);
  
  let name, venue;
  if (showNameMatch) {
    name = showNameMatch[1].trim();
    venue = beforeCity.substring(showNameMatch[0].length).trim() || null;
  } else {
    // Take first "word group" as name (up to first number or second capital sequence)
    const firstPart = beforeCity.match(/^([A-Za-z][A-Za-z\s\-&'\.]{3,50}?)(?=\s*\d|\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s+\d)/);
    name = firstPart ? firstPart[1].trim() : beforeCity.substring(0, 60).trim();
    venue = null;
  }
  
  // Clean up name
  name = name.replace(/\s{2,}/g, " ").replace(/[,\.\-–]+$/, "").trim();
  if (name.length < 3) name = beforeCity.substring(0, 60).trim();
  
  return { name, city, state, venue };
}

const data = JSON.parse(fs.readFileSync("scripts/new-sources-results.json", "utf8"));
const today = new Date().toISOString().split("T")[0];

const cleaned = [];
const seen = new Set();

for (const event of data) {
  if (!event.startDate || event.startDate < today) continue;
  
  let name = event.name;
  let city = event.city;
  let state = event.state;
  let venue = event.venue;
  
  // For stamps from American Stamp Dealer (names with embedded addresses)
  if (event.category === "stamps" && (!city || !state)) {
    const parsed = cleanStampName(event.name);
    if (parsed.name) name = parsed.name;
    if (!city && parsed.city) city = parsed.city;
    if (!state && parsed.state) state = parsed.state;
    if (!venue && parsed.venue) venue = parsed.venue;
  }
  
  // For autographs, clean up names that have bullet-separated info
  if (event.category === "autographs") {
    // "Hall of Fame Signings" is too generic, use the event description
    if (name === "Hall of Fame Signings") {
      // Skip this generic entry
      continue;
    }
    // Clean bullet-separated names: "Baseball HOF Induction Weekend • July 24 - 27, 2026 • Cooperstown, NY"
    const bulletParts = name.split("•");
    if (bulletParts.length > 1) {
      name = bulletParts[0].trim();
      if (!city) {
        const loc = extractCityState(bulletParts[bulletParts.length - 1]);
        if (loc) { city = loc.city; state = loc.state; }
      }
    }
  }
  
  // Final name cleanup
  name = name.replace(/\s{2,}/g, " ").replace(/[,\.\-–]+$/, "").trim();
  if (!name || name.length < 3) continue;
  
  // Deduplicate
  const key = `${name.substring(0, 40)}||${event.startDate}`;
  if (seen.has(key)) continue;
  seen.add(key);
  
  cleaned.push({ ...event, name, city: city || null, state: state || null, venue: venue || null });
}

console.log(`Original: ${data.length} | Cleaned: ${cleaned.length}`);
const byCat = cleaned.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {});
console.log("By category:", JSON.stringify(byCat));
console.log("\nSample stamps:");
cleaned.filter(e=>e.category==="stamps").slice(0,8).forEach(e=>console.log(` ${e.name} | ${e.startDate} | ${e.city}, ${e.state}`));
console.log("\nSample autographs:");
cleaned.filter(e=>e.category==="autographs").slice(0,8).forEach(e=>console.log(` ${e.name} | ${e.startDate} | ${e.city}, ${e.state}`));

fs.writeFileSync("scripts/new-sources-clean.json", JSON.stringify(cleaned, null, 2));
console.log("\nSaved to scripts/new-sources-clean.json");
