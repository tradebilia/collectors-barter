import mysql from 'mysql2/promise';

// Parse DATABASE_URL to get connection details
const dbUrl = process.env.DATABASE_URL;
const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

if (!urlMatch) {
  console.error('Could not parse DATABASE_URL');
  process.exit(1);
}

const [, user, password, host, port, database] = urlMatch;

console.log('Connection details:');
console.log('  Host:', host);
console.log('  Port:', port);
console.log('  User:', user);
console.log('  Database:', database);

// Try connecting as root
const rootConnection = await mysql.createConnection({
  host,
  port: parseInt(port),
  user: '4ZXfWh5QbDJhQ4C.root',
  password: 'jd27D0PpU38RgXd9KqoT',
  ssl: {
    rejectUnauthorized: false,
  },
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0,
});

console.log('\n✅ Connected as root!');

// Drop and recreate the database
try {
  await rootConnection.execute(`DROP DATABASE IF EXISTS \`${database}\``);
  console.log('✅ Dropped database:', database);
} catch (error) {
  console.error('❌ Error dropping database:', error.message);
}

try {
  await rootConnection.execute(`CREATE DATABASE \`${database}\` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log('✅ Created database:', database);
} catch (error) {
  console.error('❌ Error creating database:', error.message);
}

await rootConnection.end();
console.log('\n✅ Database reset complete!');
