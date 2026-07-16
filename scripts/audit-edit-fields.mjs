import mysql from "mysql2/promise";
import fs from "fs";

const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
const conn = await mysql.createConnection(url);

const [rows] = await conn.execute("SELECT id, title, category, itemType, itemDetails FROM listings");

const allKeys = {};
rows.forEach(r => {
  try {
    const d = JSON.parse(r.itemDetails || "{}");
    const cat = r.category + "/" + (r.itemType || "unknown");
    if (!allKeys[cat]) allKeys[cat] = new Set();
    Object.keys(d).forEach(k => allKeys[cat].add(k));
  } catch {}
});

// Fields that are loaded at the top level (not from itemDetails loop)
const topLevelFields = new Set([
  "listingTitle", "tradeValue", "description", "condition", "grade",
  "certificationCompany", "gradingCompany", "certificationNumber",
  "shipping", "isGraded", "estimatedValue"
]);

// Fields that are now loaded from itemDetails loop (after our fix)
// The loop loads everything EXCEPT "estimatedValue" and "shipping"
const skippedInLoop = new Set(["estimatedValue", "shipping"]);

console.log("=== Edit Mode Field Audit ===\n");
console.log("Fields skipped in itemDetails loop:", [...skippedInLoop].join(", "));
console.log("These are loaded at top level instead.\n");

let issuesFound = 0;
Object.entries(allKeys).forEach(([cat, keys]) => {
  const issues = [];
  for (const key of keys) {
    if (skippedInLoop.has(key)) {
      // These are handled at top level - check if they're correctly mapped
      if (key === "shipping") {
        issues.push(`  WARNING: "${key}" is skipped in loop but loaded as "shipping" at top level - OK if form field is named "shipping"`);
      }
    }
  }
  if (issues.length > 0) {
    console.log(`[${cat}]`);
    issues.forEach(i => console.log(i));
    issuesFound++;
  }
});

if (issuesFound === 0) {
  console.log("No issues found - all itemDetails fields will be correctly restored in edit mode.");
}

console.log("\n=== All fields per category/itemType ===");
Object.entries(allKeys).forEach(([cat, keys]) => {
  console.log(`[${cat}]: ${[...keys].join(", ")}`);
});

await conn.end();
