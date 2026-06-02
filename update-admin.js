import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;

async function updateAdminTavani() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionString);
    
    const query = `
      UPDATE users 
      SET username = 'AdminTavani', 
          passwordHash = '$2b$10$h1K1PTP/06za5bRPXll2xOUHmDTvLapBqNFMR1f41dqdGRtyELyZC',
          loginMethod = 'password'
      WHERE id = 1
    `;
    
    const [result] = await connection.execute(query);
    console.log('✅ AdminTavani updated successfully');
    console.log('Rows affected:', result.affectedRows);
    
    // Verify the update
    const [rows] = await connection.execute('SELECT id, username, loginMethod FROM users WHERE id = 1');
    console.log('Updated user:', rows[0]);
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating user:', error.message);
    process.exit(1);
  }
}

updateAdminTavani();
