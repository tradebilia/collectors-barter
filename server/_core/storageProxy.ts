import type { Express } from "express";
import { ENV } from "./env";
import { customAuth } from "./customAuth";
import { COOKIE_NAME } from "@shared/const";

export function getPrivateReportEvidenceOwnerId(key: string): number | null {
  const matched = /^reports\/(\d+)\/[^/]+/.exec(key);
  if (!matched) return null;
  const ownerId = Number(matched[1]);
  return Number.isSafeInteger(ownerId) && ownerId > 0 ? ownerId : null;
}

export function canAccessPrivateReportEvidence(
  user: { id: number; role?: string } | null,
  ownerId: number,
): boolean {
  return user?.role === "admin" || user?.id === ownerId;
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const reportEvidenceOwnerId = getPrivateReportEvidenceOwnerId(key);
    if (reportEvidenceOwnerId !== null) {
      const cookies = customAuth.parseCookies(req.headers.cookie || "");
      const user = await customAuth.getUserFromSession(cookies.get(COOKIE_NAME));
      if (!user) {
        res.status(401).send("Authentication required");
        return;
      }
      if (!canAccessPrivateReportEvidence(user, reportEvidenceOwnerId)) {
        res.status(403).send("Forbidden");
        return;
      }
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
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

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
