// Fixes the two photos the bulk migration could not handle:
//  - photo 300016 (Charizard): filename contained spaces, which the storage
//    proxy cannot serve (502). Re-upload from the local file with a sanitized
//    (space-free) filename and update the row.
//  - photo 300015 (Chip-Easter-2): the GitHub source is HTTP 404 — this link
//    was ALREADY broken in production. The image exists nowhere else, so we
//    delete the orphaned photo row (listing 690006 keeps its working photo 1).
import dotenv from "dotenv";
dotenv.config();
import fs from "node:fs";
import { eq } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");

async function main() {
  const { requireDb } = await import("../server/db");
  const { storagePut } = await import("../server/storage");
  const { listingPhotos } = await import("../drizzle/schema");
  const db = await requireDb();

  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  // --- Fix 1: Charizard (photo 300016) ---
  const localPath = "client/public/images/1999 Charizard - Holo.png";
  const sanitizedName = "1999-Charizard-Holo.png";
  console.log(`[photo 300016] re-upload '${localPath}' as '${sanitizedName}'`);
  if (APPLY) {
    const buffer = fs.readFileSync(localPath);
    const uploaded = await storagePut(`listings/690007/${sanitizedName}`, buffer, "image/png");
    const verify = await fetch(`http://localhost:3000${uploaded.url}`);
    if (!verify.ok) throw new Error(`Verification failed: HTTP ${verify.status}`);
    console.log(`  verified: HTTP 200 -> ${uploaded.url}`);
    await db
      .update(listingPhotos)
      .set({ imageUrl: uploaded.url, fileKey: uploaded.key })
      .where(eq(listingPhotos.id, 300016));
    console.log("  DB updated.");
  }

  // --- Fix 2: Chip-Easter-2 (photo 300015, source 404) ---
  console.log(`[photo 300015] source is 404 on GitHub (already-broken link); deleting orphaned row`);
  if (APPLY) {
    await db.delete(listingPhotos).where(eq(listingPhotos.id, 300015));
    console.log("  Orphaned photo row deleted (listing 690006 retains photo 1).");
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
