// Removes the throwaway test account created to verify the saveProfile fix.
import dotenv from "dotenv";
dotenv.config();
import { eq } from "drizzle-orm";

async function main() {
  const { requireDb } = await import("../server/db");
  const { users, userProfiles } = await import("../drizzle/schema");
  const db = await requireDb();
  const u = await db.select({ id: users.id }).from(users).where(eq(users.username, "testthrowaway1"));
  if (u[0]) {
    await db.delete(userProfiles).where(eq(userProfiles.userId, u[0].id));
    await db.delete(users).where(eq(users.id, u[0].id));
    console.log("Throwaway user", u[0].id, "removed");
  } else {
    console.log("Throwaway user not found (already removed)");
  }
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
