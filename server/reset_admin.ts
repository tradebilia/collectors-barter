import mysql from "mysql2/promise";
import bcrypt from 'bcrypt';

const connectionString = 'mysql://4ZXfWh5QbDJhQ4C.023db4f53938:9gg6EhlcJlBPkKU3111k@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/TzzwLt5FRwqjKKW5zhfchR?ssl={"rejectUnauthorized":true}';

async function main() {
  const connection = await mysql.createConnection(connectionString);
  try {
    const password = 'Fizz7718!!!!';
    const hash = bcrypt.hashSync(password, 10);
    
    // Reset password for AdminTavani (User ID 1)
    await connection.execute('UPDATE users SET passwordHash = ? WHERE id = 1', [hash]);
    console.log(`PASSWORD_RESET_SUCCESS for AdminTavani (ID: 1)`);

    // Reset password for rtavani
    await connection.execute('UPDATE users SET passwordHash = ? WHERE username = "rtavani"', [hash]);
    console.log(`PASSWORD_RESET_SUCCESS for rtavani`);
    
    console.log(`New Password for both: ${password}`);

    // Verify user info
    const [userRows] = await connection.execute('SELECT id, username, email FROM users WHERE id = 1 OR username = "rtavani"');
    console.log('USER_VERIFICATION:', userRows);

    // Verify listings
    const [listingRows] = await connection.execute('SELECT count(*) as count FROM listings WHERE ownerId = 1');
    console.log('LISTINGS_COUNT_FOR_ADMIN:', (listingRows as any)[0].count);

    // Verify active listings (what the frontend shows)
    const [activeRows] = await connection.execute('SELECT count(*) as count FROM listings WHERE status = "active" AND isActive = 1');
    console.log('TOTAL_ACTIVE_LISTINGS:', (activeRows as any)[0].count);

  } catch (error) {
    console.error("RESET_ERROR:", error);
  } finally {
    await connection.end();
  }
}

main();
