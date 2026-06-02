import { requireDb } from "./server/db";
import { users } from "./drizzle/schema";

async function list() {
  try {
    const db = await requireDb();
    const allUsers = await db.select().from(users);
    console.log("Total users:", allUsers.length);
    allUsers.forEach(u => {
      console.log(`- ID: ${u.id}, Username: ${u.username}, Role: ${u.role}`);
    });
  } catch (error) {
    console.error("Error listing users:", error);
  }
  process.exit(0);
}

list();
