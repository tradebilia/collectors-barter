import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const connection = await mysql.createConnection(connectionString);

console.log('Testing signin flow...\n');

// Get the AdminTavani user
const [users] = await connection.execute(
  'SELECT id, username, passwordHash FROM users WHERE username = ?',
  ['AdminTavani']
);

if (users.length === 0) {
  console.error('❌ User not found');
  process.exit(1);
}

const user = users[0];
console.log('✅ Found user:', user.username, 'ID:', user.id);
console.log('   Password hash:', user.passwordHash.substring(0, 50) + '...');

// Test password verification
const password = 'Fizz7718!!!!';
console.log('\nTesting password verification...');
console.log('   Testing password:', password);

const isValid = bcrypt.compareSync(password, user.passwordHash);
console.log('   Password valid:', isValid ? '✅ YES' : '❌ NO');

if (!isValid) {
  console.error('\n❌ Password verification failed!');
  process.exit(1);
}

console.log('\n✅ Signin test passed!');
await connection.end();
