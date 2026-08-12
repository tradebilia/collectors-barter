import { createConnection } from "mysql2/promise";

const databaseUrl = process.env.CUSTOM_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("CUSTOM_DATABASE_URL is not available");
}

const connection = await createConnection(databaseUrl);

try {
  const [rows] = await connection.query(
    `SELECT
      u.id,
      u.username,
      u.name,
      u.displayName,
      p.displayName AS profileDisplayName
    FROM users u
    LEFT JOIN userProfiles p ON p.userId = u.id
    WHERE u.id = ?`,
    [30002],
  );

  const row = rows[0] ?? null;
  console.log(JSON.stringify({ senderIdentity: row }));
} finally {
  await connection.end();
}
