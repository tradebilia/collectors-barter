import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { listingPhotos } from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";

const ENV = {
  databaseUrl: process.env.DATABASE_URL,
};

async function main() {
  const connection = await mysql.createConnection(ENV.databaseUrl);
  const db = drizzle(connection);

  console.log("Fetching all listing photos...");
  const photos = await db.select().from(listingPhotos);

  console.log(`Found ${photos.length} photos to update`);

  for (const photo of photos) {
    console.log(`Updating photo ${photo.id}: ${photo.fileKey}`);
    const proxyUrl = `/manus-storage/${photo.fileKey}`;
    
    await db
      .update(listingPhotos)
      .set({ imageUrl: proxyUrl })
      .where(eq(listingPhotos.id, photo.id));
    console.log(`  ✓ Updated to proxy URL: ${proxyUrl}`);
  }

  console.log("Revert complete!");
  await connection.end();
}

main().catch(console.error);
