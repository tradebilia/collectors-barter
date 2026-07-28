import { requireDb } from './server/db';
import { listings, listingPhotos } from './drizzle/schema';
import { eq, like } from 'drizzle-orm';

async function main() {
  try {
    const db = await requireDb();
    const results = await db
      .select({
        imageUrl: listingPhotos.imageUrl,
        fileKey: listingPhotos.fileKey,
        title: listings.title,
      })
      .from(listingPhotos)
      .innerJoin(listings, eq(listingPhotos.listingId, listings.id))
      .where(like(listings.title, '%Kobe%'));

    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error querying database:', error);
    process.exit(1);
  }
}

main();
