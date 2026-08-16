import mysql from 'mysql2/promise';

const databaseUrl = process.env.CUSTOM_DATABASE_URL;
if (!databaseUrl) throw new Error('Custom database connection is unavailable');

const connection = await mysql.createConnection(databaseUrl);
const [rows] = await connection.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [30002]);
await connection.end();

const row = rows[0];
if (!row) throw new Error('Administrator record was not found');

const fields = Object.entries(row)
  .filter(([key]) => key.toLowerCase().includes('ebay'))
  .map(([key, value]) => {
    const lower = key.toLowerCase();
    if (lower.includes('token') || lower.includes('username') || lower.includes('userid')) {
      return [key, value ? '[present]' : null];
    }
    return [key, value];
  });

console.log(JSON.stringify(Object.fromEntries(fields), null, 2));
