import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;

async function setupUsers() {
  const connection = await mysql.createConnection(connectionString);
  
  try {
    console.log('Setting up user accounts...\n');
    
    // Hash the passwords
    const adminPassword = 'Fizz7718!!!!';
    const rtavaniPassword = 'Fizz7718!!!!'; // Same password for now
    
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const rtavaniHash = await bcrypt.hash(rtavaniPassword, 10);
    
    console.log('✅ Passwords hashed');
    
    // Create AdminTavani user
    console.log('\nCreating AdminTavani user...');
    const [adminResult] = await connection.execute(
      `INSERT INTO users (
        username, 
        passwordHash, 
        displayName, 
        email, 
        loginMethod, 
        role,
        createdAt,
        updatedAt,
        lastSignedIn,
        lastActivityAt
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), NOW())`,
      [
        'AdminTavani',
        adminHash,
        'Admin Tavani',
        'admin@tradebilia.local',
        'password',
        'admin'
      ]
    );
    console.log('✅ AdminTavani created (ID:', adminResult.insertId, ')');
    
    // Create rtavani user
    console.log('\nCreating rtavani user...');
    const [rtavaniResult] = await connection.execute(
      `INSERT INTO users (
        username, 
        passwordHash, 
        displayName, 
        email, 
        loginMethod, 
        role,
        createdAt,
        updatedAt,
        lastSignedIn,
        lastActivityAt
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), NOW())`,
      [
        'rtavani',
        rtavaniHash,
        'Rich Tavani',
        'rich@tradebilia.local',
        'password',
        'user'
      ]
    );
    console.log('✅ rtavani created (ID:', rtavaniResult.insertId, ')');
    
    // Verify the users were created
    console.log('\nVerifying users...');
    const [users] = await connection.execute(
      'SELECT id, username, displayName, email, role FROM users ORDER BY id'
    );
    
    console.log('\nUsers in database:');
    users.forEach(user => {
      console.log(`  - ${user.username} (ID: ${user.id}, Role: ${user.role})`);
    });
    
    await connection.end();
    console.log('\n✅ User setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await connection.end();
    process.exit(1);
  }
}

setupUsers();
