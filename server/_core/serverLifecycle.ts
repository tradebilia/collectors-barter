import type { Server } from "node:http";
import { closeDb } from "../db";
import { safeDatabaseErrorCode } from "./databaseError";

type CloseableServer = Pick<Server, "close">;

type ShutdownDependencies = {
  closeDb?: () => Promise<void>;
  exit?: (code: number) => void;
  timeoutMs?: number;
  forceExitGraceMs?: number;
};

/**
 * Creates an idempotent shutdown handler that stops HTTP traffic before
 * releasing the database pool. The forced timeout prevents a stuck connection
 * from making a deployment/restart hang indefinitely.
 */
export function createGracefulShutdownHandler(
  server: CloseableServer,
  deps: ShutdownDependencies = {},
): () => void {
  const closeDatabase = deps.closeDb ?? closeDb;
  const exit = deps.exit ?? ((code: number) => process.exit(code));
  const timeoutMs = deps.timeoutMs ?? 10_000;
  const forceExitGraceMs = deps.forceExitGraceMs ?? 1_000;
  let shuttingDown = false;

  return () => {
    if (shuttingDown) return;
    shuttingDown = true;
    let finished = false;
    let timedOut = false;
    let closeDatabasePromise: Promise<void> | null = null;
    let forcedExitTimeout: NodeJS.Timeout | undefined;
    const closeDatabaseOnce = () => {
      closeDatabasePromise ??= closeDatabase();
      return closeDatabasePromise;
    };
    const finish = (code: number) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (forcedExitTimeout) clearTimeout(forcedExitTimeout);
      exit(code);
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      console.error("[shutdown] Timed out while draining HTTP traffic; closing database pool before forced exit");
      forcedExitTimeout = setTimeout(() => finish(1), forceExitGraceMs);
      forcedExitTimeout.unref?.();
      void closeDatabaseOnce()
        .catch(error => console.error(`[shutdown] Database pool close after timeout failed code=${safeDatabaseErrorCode(error)}`))
        .finally(() => finish(1));
    }, timeoutMs);
    timeout.unref?.();

    server.close(async error => {
      if (error) {
        console.error(`[shutdown] HTTP server close failed code=${safeDatabaseErrorCode(error)}`);
        try {
          await closeDatabaseOnce();
        } catch (databaseError) {
          console.error(`[shutdown] Database pool close after HTTP failure failed code=${safeDatabaseErrorCode(databaseError)}`);
        }
        finish(1);
        return;
      }
      try {
        await closeDatabaseOnce();
        finish(timedOut ? 1 : 0);
      } catch (error) {
        console.error(`[shutdown] Database pool close failed code=${safeDatabaseErrorCode(error)}`);
        finish(1);
      }
    });
  };
}

export function installGracefulShutdownHandlers(server: CloseableServer): () => void {
  const shutdown = createGracefulShutdownHandler(server);
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  return () => {
    process.off("SIGTERM", shutdown);
    process.off("SIGINT", shutdown);
  };
}
