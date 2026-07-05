// Lists all user accounts with their roles to audit admin access policy.
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const { requireDb } = await import("../server/db");
  const { users } = await import("../drizzle/schema");
  const db = await requireDb();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users);
  console.log(`Total accounts: ${rows.length}`);
  for (const r of rows) {
    console.log(
      `  id=${r.id} username=${r.username} role=${r.role} email=${r.email ?? "-"} created=${r.createdAt} lastSignIn=${r.lastSignedIn}`,
    );
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
