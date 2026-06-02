import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;

async function updateAdminTavani() {
  try {
    const connection = await mysql.createConnection(connectionString);
    const db = drizzle(connection);

    const result = await db.update(users)
      .set({
        username: 'AdminTavani',
        passwordHash: '$2b$10$h1K1PTP/06za5bRPXll2xOUHmDTvLapBqNFMR1f41dqdGRtyELyZC',
        loginMethod: 'password'
      })
      .where(eq(users.id, 1));
    
    console.log('✅ AdminTavani updated successfully');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating user:', error);
    process.exit(1);
  }
}

updateAdminTavani();
