import dotenv from 'dotenv';
dotenv.config();
import { requireDb } from './server/db';
import { sql } from 'drizzle-orm';

const db = await requireDb();

console.log('Checking and fixing column names...');

// Check what columns actually exist in the users table
const [cols] = await db.execute(sql`SHOW COLUMNS FROM users`);
const colNames = (cols as any[]).map((c: any) => c.Field);
console.log('Current users columns (relevant):', colNames.filter((c: string) => c.toLowerCase().includes('suspend') || c.toLowerCase().includes('ban')));

// Fix suspensionReason casing if needed
if (colNames.includes('suspensionreason') && !colNames.includes('suspensionReason')) {
  await db.execute(sql`ALTER TABLE users CHANGE suspensionreason suspensionReason TEXT NULL`);
  console.log('✅ Fixed: suspensionreason → suspensionReason');
} else if (colNames.includes('suspensionReason')) {
  console.log('⏭ suspensionReason already correct');
} else {
  await db.execute(sql`ALTER TABLE users ADD COLUMN suspensionReason TEXT NULL`);
  console.log('✅ Added suspensionReason');
}

// Fix suspendedBy casing if needed
if (colNames.includes('suspendedby') && !colNames.includes('suspendedBy')) {
  await db.execute(sql`ALTER TABLE users CHANGE suspendedby suspendedBy INT NULL`);
  console.log('✅ Fixed: suspendedby → suspendedBy');
} else if (colNames.includes('suspendedBy')) {
  console.log('⏭ suspendedBy already correct');
} else {
  await db.execute(sql`ALTER TABLE users ADD COLUMN suspendedBy INT NULL`);
  console.log('✅ Added suspendedBy');
}

// Fix bannedBy casing if needed
if (colNames.includes('bannedby') && !colNames.includes('bannedBy')) {
  await db.execute(sql`ALTER TABLE users CHANGE bannedby bannedBy INT NULL`);
  console.log('✅ Fixed: bannedby → bannedBy');
} else if (colNames.includes('bannedBy')) {
  console.log('⏭ bannedBy already correct');
} else {
  await db.execute(sql`ALTER TABLE users ADD COLUMN bannedBy INT NULL`);
  console.log('✅ Added bannedBy');
}

// Check tradeProposals columns
const [tpCols] = await db.execute(sql`SHOW COLUMNS FROM tradeProposals`);
const tpColNames = (tpCols as any[]).map((c: any) => c.Field);
console.log('Current tradeProposals columns (relevant):', tpColNames.filter((c: string) => c.toLowerCase().includes('freez') || c.toLowerCase().includes('frozen')));

// Fix preFreezStatus
if (tpColNames.includes('prefreezstatus') && !tpColNames.includes('preFreezStatus')) {
  await db.execute(sql`ALTER TABLE tradeProposals CHANGE prefreezstatus preFreezStatus VARCHAR(20) NULL`);
  console.log('✅ Fixed: prefreezstatus → preFreezStatus');
} else if (tpColNames.includes('preFreezStatus')) {
  console.log('⏭ preFreezStatus already correct');
}

// Fix frozenAt
if (tpColNames.includes('frozenat') && !tpColNames.includes('frozenAt')) {
  await db.execute(sql`ALTER TABLE tradeProposals CHANGE frozenat frozenAt TIMESTAMP NULL`);
  console.log('✅ Fixed: frozenat → frozenAt');
} else if (tpColNames.includes('frozenAt')) {
  console.log('⏭ frozenAt already correct');
}

// Fix frozenReason
if (tpColNames.includes('frozenreason') && !tpColNames.includes('frozenReason')) {
  await db.execute(sql`ALTER TABLE tradeProposals CHANGE frozenreason frozenReason TEXT NULL`);
  console.log('✅ Fixed: frozenreason → frozenReason');
} else if (tpColNames.includes('frozenReason')) {
  console.log('⏭ frozenReason already correct');
}

console.log('✅ All column fixes applied!');
process.exit(0);
