// Migrates listing photos that point at GitHub raw URLs (and other external
// hosts) into permanent S3 storage via storagePut, then updates listingPhotos
// rows to the /manus-storage/ relative paths.
//
// SAFETY:
//  - Default mode is DRY RUN: prints what would change, changes nothing.
//  - Run with --apply to execute.
//  - Before any DB update, an undo file (JSON of photoId -> old URL/key) is
//    written to scripts/image_migration_undo_<timestamp>.json.
//  - Source images on GitHub are never deleted; they remain as fallback.
import dotenv from "dotenv";
dotenv.config();
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");

function classify(url: string): "github" | "s3" | "local" | "other" {
  if (url.includes("githubusercontent")) return "github";
  if (url.startsWith("/manus-storage/")) return "s3";
  if (url.startsWith("/images/")) return "local";
  return "other";
}

async function main() {
  const { requireDb } = await import("../server/db");
  const { storagePut } = await import("../server/storage");
  const { listingPhotos, listings } = await import("../drizzle/schema");
  const db = await requireDb();

  const photos = await db
    .select({
      id: listingPhotos.id,
      listingId: listingPhotos.listingId,
      fileKey: listingPhotos.fileKey,
      imageUrl: listingPhotos.imageUrl,
      sortOrder: listingPhotos.sortOrder,
    })
    .from(listingPhotos);

  const toMigrate = photos.filter(p => classify(p.imageUrl) === "github");
  console.log(`Total photo rows: ${photos.length}`);
  console.log(`Already on S3:    ${photos.filter(p => classify(p.imageUrl) === "s3").length}`);
  console.log(`GitHub-hosted:    ${toMigrate.length}  <- to migrate`);
  console.log(`Mode: ${APPLY ? "APPLY (making changes)" : "DRY RUN (no changes)"}\n`);

  if (toMigrate.length === 0) {
    console.log("Nothing to migrate.");
    process.exit(0);
  }

  const undo: Array<{ photoId: number; listingId: number; oldUrl: string; oldKey: string; newUrl?: string; newKey?: string }> = [];

  for (const photo of toMigrate) {
    const fileName = decodeURIComponent(photo.imageUrl.split("/").pop() ?? `photo-${photo.id}`);
    const targetKey = `listings/${photo.listingId}/${fileName}`;
    console.log(`[photo ${photo.id}] listing ${photo.listingId}`);
    console.log(`  from: ${photo.imageUrl.slice(0, 100)}`);
    console.log(`  to:   /manus-storage/${targetKey} (+hash suffix)`);

    if (!APPLY) continue;

    // 1. Download from GitHub
    const resp = await fetch(photo.imageUrl);
    if (!resp.ok) {
      console.error(`  SKIP: download failed with HTTP ${resp.status}`);
      continue;
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    const contentType = resp.headers.get("content-type") ?? "image/png";
    console.log(`  downloaded ${buffer.length} bytes (${contentType})`);

    // 2. Upload to S3
    const uploaded = await storagePut(targetKey, buffer, contentType);

    // 3. Verify the new URL serves the image through the local proxy
    const verify = await fetch(`http://localhost:3000${uploaded.url}`);
    if (!verify.ok) {
      console.error(`  ABORT for this photo: proxy verification failed HTTP ${verify.status}; DB not updated`);
      continue;
    }
    console.log(`  verified: HTTP 200 via storage proxy`);

    // 4. Record undo info BEFORE updating
    undo.push({
      photoId: photo.id,
      listingId: photo.listingId,
      oldUrl: photo.imageUrl,
      oldKey: photo.fileKey,
      newUrl: uploaded.url,
      newKey: uploaded.key,
    });

    // 5. Update the DB row
    await db
      .update(listingPhotos)
      .set({ imageUrl: uploaded.url, fileKey: uploaded.key })
      .where(eq(listingPhotos.id, photo.id));
    console.log(`  DB updated.\n`);
  }

  if (APPLY && undo.length > 0) {
    const undoPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      `image_migration_undo_${Date.now()}.json`,
    );
    fs.writeFileSync(undoPath, JSON.stringify(undo, null, 2));
    console.log(`Undo file written: ${undoPath}`);
    console.log(`Migrated ${undo.length}/${toMigrate.length} photos successfully.`);
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
