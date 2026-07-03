import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  const clientTemplate = path.resolve(
    import.meta.dirname,
    "../..",
    "client",
    "index.html"
  );

  // Cache the template in memory for dev speed, but let it be re-read if needed
  let cachedTemplate: string | null = null;

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      if (!cachedTemplate) {
        cachedTemplate = await fs.promises.readFile(clientTemplate, "utf-8");
      }
      
      const page = await vite.transformIndexHtml(url, cachedTemplate);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      // Clear cache on error so we try reading again
      cachedTemplate = null;
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
