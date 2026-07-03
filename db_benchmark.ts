import { requireDb } from './server/db';
import { listings, users } from './drizzle/schema';
import { sql } from 'drizzle-orm';

async function runBenchmark() {
  console.log('--- Database Performance Audit ---');
  const start = Date.now();
  
  try {
    const db = await requireDb();
    
    // 1. Test raw connection latency
    const pingStart = Date.now();
    await db.execute(sql`SELECT 1`);
    console.log(`Raw Connection Latency: ${Date.now() - pingStart}ms`);

    // 2. Test fetching listings
    const fetchStart = Date.now();
    const allListings = await db.select().from(listings).limit(20);
    console.log(`Fetch 20 Listings: ${Date.now() - fetchStart}ms (Count: ${allListings.length})`);

    // 3. Test site statistics (multiple counts)
    const statsStart = Date.now();
    await Promise.all([
      db.select({ value: sql`count(*)` }).from(listings),
      db.select({ value: sql`count(*)` }).from(users),
      db.select({ value: sql`coalesce(sum(cast(estimatedValue as decimal(12,2))), 0)` }).from(listings)
    ]);
    console.log(`Site Statistics Queries: ${Date.now() - statsStart}ms`);

    console.log(`Total Benchmark Time: ${Date.now() - start}ms`);
  } catch (error) {
    console.error('Benchmark failed:', error);
  } finally {
    process.exit(0);
  }
}

runBenchmark();
