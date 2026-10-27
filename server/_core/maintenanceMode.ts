import type { Express, NextFunction, Request, Response } from "express";

const MAINTENANCE_ENV_NAME = "TRADEBILIA_MAINTENANCE_MODE";

/**
 * Maintenance must be deliberate. Only the literal value "1" freezes the
 * server; missing, empty, or malformed values leave normal operation intact.
 */
export function isTradebiliaMaintenanceModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env[MAINTENANCE_ENV_NAME] ?? "").trim() === "1";
}

export function makeTradebiliaMaintenanceModeGuard(env: NodeJS.ProcessEnv = process.env) {
  const enabled = isTradebiliaMaintenanceModeEnabled(env);

  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled || (req.method === "GET" && req.path === "/health")) {
      return next();
    }

    res
      .status(503)
      .set("Retry-After", "120")
      .set("Cache-Control", "no-store")
      .json({
        error: "maintenance-mode",
        message: "Tradebilia is temporarily unavailable while database maintenance is in progress.",
      });
  };
}

/**
 * This guard is intentionally mounted before every webhook, OAuth callback,
 * scheduled writer, tRPC procedure, storage proxy, and SPA route.
 */
export function registerTradebiliaMaintenanceModeGuard(app: Express, env: NodeJS.ProcessEnv = process.env) {
  app.use(makeTradebiliaMaintenanceModeGuard(env));
}
