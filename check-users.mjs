import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
const connection = await mysql.createConnection(connectionString);

// Check users in database
const [users] = await connection.execute('SELECT id, username, email, role, passwordHash FROM users');
console.log('Users in database:');
users.forEach(user => {
  console.log(`  ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
  console.log(`    Password Hash: ${user.passwordHash ? user.passwordHash.substring(0, 50) + '...' : 'NULL'}`);
});

await connection.end();
