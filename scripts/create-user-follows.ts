import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL!;

async function main() {
  const conn = await mysql.createConnection(url);
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`userFollows\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`followerId\` int NOT NULL,
        \`followingId\` int NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`userFollows_follower_idx\` (\`followerId\`),
        INDEX \`userFollows_following_idx\` (\`followingId\`),
        INDEX \`userFollows_unique\` (\`followerId\`, \`followingId\`)
      )
    `);
    console.log("✅ userFollows table created (or already exists)");
  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
