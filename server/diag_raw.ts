import mysql from "mysql2/promise";

const connectionString = 'mysql://4ZXfWh5QbDJhQ4C.023db4f53938:9gg6EhlcJlBPkKU3111k@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/TzzwLt5FRwqjKKW5zhfchR?ssl={"rejectUnauthorized":true}';

async function main() {
  const connection = await mysql.createConnection(connectionString);
  try {
    const [userRows] = await connection.execute('SELECT id, username, email, openId FROM users');
    console.log(`TOTAL_USERS: ${(userRows as any[]).length}`);
    (userRows as any[]).forEach(u => console.log(`- ${u.id}: ${u.username} / ${u.openId} (${u.email})`));

    const [listingRows] = await connection.execute('SELECT id, title, ownerId FROM listings');
    console.log(`TOTAL_LISTINGS: ${(listingRows as any[]).length}`);
    (listingRows as any[]).slice(0, 20).forEach(l => console.log(`- ${l.id}: ${l.title} (Owner: ${l.ownerId})`));

  } catch (error) {
    console.error("RAW_DIAGNOSTIC_ERROR:", error);
  } finally {
    await connection.end();
  }
}

main();
