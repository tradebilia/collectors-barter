import { requireDb } from "./db";
import { users, listings } from "../drizzle/schema";

async function main() {
  try {
    const db = await requireDb();
    
    const allUsers = await db.select().from(users);
    console.log(`TOTAL_USERS: ${allUsers.length}`);
    allUsers.forEach(u => console.log(`- ${u.id}: ${u.username} (${u.email})`));

    const allListings = await db.select().from(listings);
    console.log(`TOTAL_LISTINGS: ${allListings.length}`);
    allListings.slice(0, 10).forEach(l => console.log(`- ${l.id}: ${l.title} (Owner: ${l.ownerId})`));

  } catch (error) {
    console.error("DIAGNOSTIC_ERROR:", error);
  }
}

main();
