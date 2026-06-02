import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;

async function finalSetup() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionString);
    
    console.log('🔄 Adding username column (without UNIQUE constraint)...');
    
    try {
      await connection.execute('ALTER TABLE users ADD COLUMN username varchar(64)');
      console.log('✅ Added column: username');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ Column already exists: username');
      } else {
        console.error('❌ Error:', error.message);
      }
    }
    
    console.log('\n🔄 Updating AdminTavani...');
    const updateQuery = `
      UPDATE users 
      SET username = 'AdminTavani', 
          passwordHash = '$2b$10$h1K1PTP/06za5bRPXll2xOUHmDTvLapBqNFMR1f41dqdGRtyELyZC',
          loginMethod = 'password'
      WHERE id = 1
    `;
    
    const [result] = await connection.execute(updateQuery);
    console.log('✅ AdminTavani updated successfully');
    console.log('Rows affected:', result.affectedRows);
    
    // Verify the update
    const [rows] = await connection.execute('SELECT id, username, passwordHash, loginMethod FROM users WHERE id = 1');
    if (rows.length > 0) {
      console.log('✅ Updated user:');
      console.log('   ID:', rows[0].id);
      console.log('   Username:', rows[0].username);
      console.log('   Password Hash:', rows[0].passwordHash ? '***' : 'null');
      console.log('   Login Method:', rows[0].loginMethod);
    }
    
    await connection.end();
    console.log('\n✅ AdminTavani setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

finalSetup();
