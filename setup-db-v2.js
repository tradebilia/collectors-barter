import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL;

function parseSQLFile(content) {
  // Remove comments like --> statement-breakpoint
  let sql = content.replace(/-->\s*statement-breakpoint/g, '');
  // Remove SQL line comments
  sql = sql.replace(/--.*$/gm, '');
  // Split by semicolon and filter empty statements
  return sql.split(';').filter(s => s.trim()).map(s => s.trim());
}

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
    let totalExecuted = 0;
    for (const file of migrationFiles) {
      const filePath = path.join('./drizzle', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const statements = parseSQLFile(content);
        
        for (const statement of statements) {
          try {
            await connection.execute(statement);
            totalExecuted++;
          } catch (error) {
            if (error.code !== 'ER_TABLE_EXISTS_ERROR' && error.code !== 'ER_DUP_KEYNAME') {
              console.error(`⚠️ Error in ${file}:`, error.message.substring(0, 100));
            }
          }
        }
        console.log(`✅ Processed: ${file} (${statements.length} statements)`);
      }
    }
    
    console.log(`\n✅ Total statements executed: ${totalExecuted}`);
    
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
    console.log('\n✅ Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

setupDatabase();
