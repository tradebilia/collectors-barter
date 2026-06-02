import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL;

async function setupDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionString);
    
    // Read and execute all migration SQL files
    const migrationFiles = [
      '0000_skinny_stephen_strange.sql',
      '0001_serious_ultimates.sql',
      '0002_pretty_franklin_storm.sql',
      '0003_nappy_quasar.sql',
      '0004_cold_katie_power.sql',
      '0005_clammy_saracen.sql',
      '0006_polite_gravity.sql',
      '0007_wise_tusk.sql',
      '0008_workable_mariko_yashida.sql',
      '0009_massive_captain_stacy.sql',
    ];
    
    console.log('🔄 Applying migrations...');
    for (const file of migrationFiles) {
      const filePath = path.join('./drizzle', file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf8');
        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(s => s.trim());
        for (const statement of statements) {
          try {
            await connection.execute(statement);
            console.log(`✅ Executed: ${file}`);
          } catch (error) {
            if (error.code !== 'ER_TABLE_EXISTS_ERROR') {
              console.error(`❌ Error in ${file}:`, error.message);
            }
          }
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
    console.log('Updated user:', rows[0]);
    
    await connection.end();
    console.log('\n✅ Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

setupDatabase();
