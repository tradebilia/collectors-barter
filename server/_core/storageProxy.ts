import type { Express } from "express";
import { ENV } from "./env";
import path from "path";
import fs from "fs";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // Aggressive local search:
    // 1. Try exact key in public/images
    // 2. Try basename of key in public/images (strips listings/1/ etc)
    // 3. Try key in client/public/images
    // 4. Try basename of key in client/public/images
    
    const baseName = path.basename(key);
    const searchPaths = [
      path.join(process.cwd(), "server/_core/public/images", key),
      path.join(process.cwd(), "server/_core/public/images", baseName),
      path.join(process.cwd(), "client/public/images", key),
      path.join(process.cwd(), "client/public/images", baseName),
    ];

    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        res.sendFile(p);
        return;
      }
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey || ENV.forgeApiKey === "dummy") {
      res.status(500).send("Storage proxy not configured and local fallback failed for key: " + key);
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      const imageResp = await fetch(url);
      if (!imageResp.ok) {
        console.error(`[StorageProxy] CloudFront error: ${imageResp.status}`);
        res.status(502).send("Failed to fetch image from storage");
        return;
      }

      const contentType = imageResp.headers.get("content-type");
      const contentLength = imageResp.headers.get("content-length");
      if (contentType) res.set("Content-Type", contentType);
      if (contentLength) res.set("Content-Length", contentLength);

      res.set("Cache-Control", "public, max-age=31536000");
      res.set("Vary", "Accept-Encoding");

      const buffer = await imageResp.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
