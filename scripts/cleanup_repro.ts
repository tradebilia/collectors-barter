import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, like, inArray } from "drizzle-orm";
import { users, listings, listingPhotos, userProfiles } from "../drizzle/schema";

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);

  const testUsers = await db.select({ id: users.id }).from(users).where(eq(users.username, "reprotester1"));
  const ids = testUsers.map(u => u.id);
  console.log("repro user ids:", ids);

  const testListings = await db
    .select({ id: listings.id })
    .from(listings)
    .where(like(listings.title, "Repro Comic Test%"));
  const lids = testListings.map(l => l.id);
  console.log("repro listing ids:", lids);

  if (lids.length) {
    await db.delete(listingPhotos).where(inArray(listingPhotos.listingId, lids));
    await db.delete(listings).where(inArray(listings.id, lids));
    console.log(`deleted ${lids.length} test listings + photos`);
  }
  if (ids.length) {
    await db.delete(userProfiles).where(inArray(userProfiles.userId, ids));
    await db.delete(users).where(inArray(users.id, ids));
    console.log(`deleted ${ids.length} repro user(s)`);
  }

  const remaining = await db.select({ id: users.id, username: users.username }).from(users);
  console.log("remaining users:", remaining);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
