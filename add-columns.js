import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;

async function addColumns() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionString);
    
    console.log('🔄 Adding missing columns to users table...');
    
    // Add columns if they don't exist
    const columnsToAdd = [
      { name: 'username', sql: 'ALTER TABLE users ADD COLUMN username varchar(64) UNIQUE' },
      { name: 'passwordHash', sql: 'ALTER TABLE users ADD COLUMN passwordHash varchar(255)' },
      { name: 'displayName', sql: 'ALTER TABLE users ADD COLUMN displayName varchar(255)' },
      { name: 'avatarUrl', sql: 'ALTER TABLE users ADD COLUMN avatarUrl text' },
      { name: 'securityQuestion', sql: 'ALTER TABLE users ADD COLUMN securityQuestion varchar(255)' },
      { name: 'securityAnswerHash', sql: 'ALTER TABLE users ADD COLUMN securityAnswerHash varchar(255)' },
      { name: 'lastActivityAt', sql: 'ALTER TABLE users ADD COLUMN lastActivityAt timestamp DEFAULT CURRENT_TIMESTAMP' },
      { name: 'ebayUsername', sql: 'ALTER TABLE users ADD COLUMN ebayUsername varchar(64)' },
      { name: 'ebayUserId', sql: 'ALTER TABLE users ADD COLUMN ebayUserId varchar(64)' },
      { name: 'ebayFeedbackScore', sql: 'ALTER TABLE users ADD COLUMN ebayFeedbackScore int' },
      { name: 'ebayFeedbackPercentage', sql: 'ALTER TABLE users ADD COLUMN ebayFeedbackPercentage decimal(5,2)' },
      { name: 'ebayMemberSince', sql: 'ALTER TABLE users ADD COLUMN ebayMemberSince timestamp' },
      { name: 'ebayConnectedAt', sql: 'ALTER TABLE users ADD COLUMN ebayConnectedAt timestamp' },
      { name: 'ebayAccessToken', sql: 'ALTER TABLE users ADD COLUMN ebayAccessToken text' },
      { name: 'ebayRefreshToken', sql: 'ALTER TABLE users ADD COLUMN ebayRefreshToken text' },
      { name: 'ebayTokenExpiresAt', sql: 'ALTER TABLE users ADD COLUMN ebayTokenExpiresAt timestamp' },
    ];
    
    for (const col of columnsToAdd) {
      try {
        await connection.execute(col.sql);
        console.log(`✅ Added column: ${col.name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️ Column already exists: ${col.name}`);
        } else {
          console.error(`❌ Error adding ${col.name}:`, error.message.substring(0, 80));
        }
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
    const [rows] = await connection.execute('SELECT id, username, loginMethod FROM users WHERE id = 1');
    if (rows.length > 0) {
      console.log('Updated user:', rows[0]);
    }
    
    await connection.end();
    console.log('\n✅ Setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

addColumns();
