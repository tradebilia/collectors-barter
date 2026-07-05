// Removes leftover "Test User" accounts created by previous failed test runs.
// Only targets rows whose openId matches the test-user pattern to avoid
// touching real accounts.
import dotenv from "dotenv";
dotenv.config();
import { like, inArray } from "drizzle-orm";

async function main() {
  const { requireDb } = await import("../server/db");
  const { users, userProfiles, draftListings, listingPhotos } = await import("../drizzle/schema");
  const db = await requireDb();

  const testUsers = await db
    .select({ id: users.id, openId: users.openId, username: users.username })
    .from(users)
    .where(like(users.openId, "test-user-%"));

  if (testUsers.length === 0) {
    console.log("No leftover test users found.");
    process.exit(0);
  }

  const ids = testUsers.map(u => u.id);
  console.log(`Found ${testUsers.length} leftover test user(s):`, testUsers.map(u => `${u.id}/${u.username}`).join(", "));

  const drafts = await db
    .select({ id: draftListings.id })
    .from(draftListings)
    .where(inArray(draftListings.userId, ids));
  const draftIds = drafts.map(d => d.id);

  if (draftIds.length > 0) {
    await db.delete(listingPhotos).where(inArray(listingPhotos.listingId, draftIds));
    await db.delete(draftListings).where(inArray(draftListings.id, draftIds));
    console.log(`Deleted ${draftIds.length} leftover draft(s).`);
  }
  await db.delete(userProfiles).where(inArray(userProfiles.userId, ids));
  await db.delete(users).where(inArray(users.id, ids));
  console.log("Leftover test users removed.");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
