import mysql from 'mysql2/promise';

// Parse DATABASE_URL to get connection details
const dbUrl = process.env.DATABASE_URL;
// Extract just the database name, removing any query parameters
const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);

if (!urlMatch) {
  console.error('Could not parse DATABASE_URL');
  process.exit(1);
}

const [, user, password, host, port, database] = urlMatch;

console.log('Resetting database:', database);

// Try connecting as root
const rootConnection = await mysql.createConnection({
  host,
  port: parseInt(port),
  user: '4ZXfWh5QbDJhQ4C.root',
  password: 'jd27D0PpU38RgXd9KqoT',
  ssl: {
    rejectUnauthorized: false,
  },
});

console.log('✅ Connected as root!');

// Drop the database
try {
  console.log('Dropping database:', database);
  await rootConnection.execute(`DROP DATABASE IF EXISTS \`${database}\``);
  console.log('✅ Dropped database');
} catch (error) {
  console.error('❌ Error dropping database:', error.message);
  process.exit(1);
}

// Create the database
try {
  console.log('Creating database:', database);
  await rootConnection.execute(`CREATE DATABASE \`${database}\` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log('✅ Created database');
} catch (error) {
  console.error('❌ Error creating database:', error.message);
  process.exit(1);
}

await rootConnection.end();
console.log('✅ Database reset complete!');
process.exit(0);
