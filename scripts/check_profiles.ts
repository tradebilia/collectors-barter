import dotenv from "dotenv";
dotenv.config();
async function main() {
  const { requireDb } = await import("/home/ubuntu/collectors-barter/server/db");
  const { userProfiles } = await import("/home/ubuntu/collectors-barter/drizzle/schema");
  const db = await requireDb();
  const rows = await db.select({
    userId: userProfiles.userId,
    displayName: userProfiles.displayName,
    acceptedTerms: userProfiles.acceptedTerms,
    contactEmail: userProfiles.contactEmail,
    firstName: userProfiles.firstName,
  }).from(userProfiles);
  console.log(JSON.stringify(rows, null, 1));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
