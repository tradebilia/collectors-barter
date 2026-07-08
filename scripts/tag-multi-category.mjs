/**
 * Multi-category tagger for existing conventions.
 * Scans event names for keywords that indicate multiple categories
 * and adds extra entries to the conventionCategories junction table.
 * 
 * Rules:
 * - If name contains Pokemon/TCG/Trading Card keywords → add pokemon
 * - If name contains Comic/Comics keywords → add comics
 * - If name contains Sports Card/Memorabilia keywords → add sports_cards
 * - If name contains Toy/Action Figure/LEGO/Brick keywords → add vintage_toys
 * - If name contains Video Game/Gaming/Retro Game keywords → add video_games
 * - If name contains Stamp/Philatelic keywords → add stamps
 * - If name contains Coin/Numismatic keywords → add coins
 * - If name contains Autograph/Signing keywords → add autographs
 * - If name contains Disney/Pin keywords → add disney_pins
 * - If name contains Movie/Film/Hollywood keywords → add movies
 */
import mysql from "mysql2/promise";
import fs from "fs";

const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];

// Keyword rules: each entry is [regex, category]
const KEYWORD_RULES = [
  [/pokemon|pokémon|poke\s*con|poke\s*fest|tcg|trading card/i, "pokemon"],
  [/comic|manga|anime|cosplay|pop culture|sci-fi|sci fi|fantasy|horror/i, "comics"],
  [/sports card|memorabilia|autograph show|card show|hobby show|collectible/i, "sports_cards"],
  [/toy|action figure|lego|brick|vintage toy|retro toy|diecast|model kit|plush|funko/i, "vintage_toys"],
  [/video game|gaming|retro game|game con|game expo|game fest|arcade|nintendo|playstation|xbox/i, "video_games"],
  [/stamp|philatelic|philately|postal/i, "stamps"],
  [/coin|numismatic|currency|paper money|bullion/i, "coins"],
  [/autograph|signing|celebrity|celebrity guest/i, "autographs"],
  [/disney|pin trading|d23/i, "disney_pins"],
  [/movie|film|hollywood|cinema|horror film|sci-fi film/i, "movies"],
];

async function main() {
  const conn = await mysql.createConnection(url);
  
  // Get all approved conventions with their current primary category
  const [conventions] = await conn.execute(
    "SELECT id, name, category FROM conventions WHERE status = 'approved'"
  );
  
  // Get existing junction table entries
  const [existing] = await conn.execute("SELECT conventionId, category FROM conventionCategories");
  const existingSet = new Set(existing.map(r => `${r.conventionId}||${r.category}`));
  
  let added = 0;
  let checked = 0;
  
  for (const conv of conventions) {
    checked++;
    const detectedCategories = new Set([conv.category]); // always include primary
    
    // Apply keyword rules
    for (const [regex, cat] of KEYWORD_RULES) {
      if (regex.test(conv.name)) {
        detectedCategories.add(cat);
      }
    }
    
    // Add any new categories to the junction table
    for (const cat of detectedCategories) {
      const key = `${conv.id}||${cat}`;
      if (!existingSet.has(key)) {
        try {
          await conn.execute(
            "INSERT IGNORE INTO conventionCategories (conventionId, category) VALUES (?, ?)",
            [conv.id, cat]
          );
          added++;
          existingSet.add(key);
          console.log(`  +${cat} → "${conv.name.substring(0, 60)}"`);
        } catch (e) {
          console.error(`  Error: ${e.message.slice(0, 60)}`);
        }
      }
    }
  }
  
  await conn.end();
  console.log(`\nChecked: ${checked} conventions | Added: ${added} new category tags`);
  
  // Show summary of multi-category events
  const conn2 = await mysql.createConnection(url);
  const [multiCat] = await conn2.execute(`
    SELECT c.name, GROUP_CONCAT(cc.category ORDER BY cc.category SEPARATOR ', ') as cats, COUNT(*) as n
    FROM conventions c
    JOIN conventionCategories cc ON cc.conventionId = c.id
    WHERE c.status = 'approved'
    GROUP BY c.id
    HAVING n > 1
    ORDER BY n DESC
    LIMIT 20
  `);
  console.log(`\nTop multi-category events (${multiCat.length} total):`);
  multiCat.forEach(r => console.log(`  [${r.cats}] ${r.name.substring(0, 70)}`));
  await conn2.end();
}

main().catch(console.error);
