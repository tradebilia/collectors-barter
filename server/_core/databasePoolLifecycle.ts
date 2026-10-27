type FingerprintedTarget = {
  connectionFingerprint: string;
};

type PoolEndCallback = (error?: unknown) => void;

type CallbackPoolClient = {
  end?: (callback?: PoolEndCallback) => unknown;
};

/**
 * mysql2's callback pool only signals completion through `end(callback)`.
 * Drizzle retains that original pool at `$client`, so callers must not await
 * the return value of `end()` directly.
 */
export function closeMysql2PoolClient(client: unknown): Promise<void> {
  const end = (client as CallbackPoolClient | null | undefined)?.end;
  if (typeof end !== "function") return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish: PoolEndCallback = error => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };

    try {
      const result = end.call(client, finish);
      if (result && typeof (result as PromiseLike<unknown>).then === "function") {
        void Promise.resolve(result).then(() => finish(), finish);
      }
    } catch (error) {
      finish(error);
    }
  });
}

export type DatabasePoolLifecycle<TPool, TTarget extends FingerprintedTarget> = {
  acquire: (target: TTarget) => Promise<TPool>;
  close: () => Promise<void>;
};

/**
 * Coordinates an attested database pool across concurrent application callers.
 * Shutdown is deliberately single-flight and refuses new acquisitions until it
 * has finished draining an in-flight initialization and closing the adopted
 * pool. A later request may initialize a fresh pool only after close completes.
 */
export function createDatabasePoolLifecycle<TPool, TTarget extends FingerprintedTarget>(input: {
  initialize: (target: TTarget) => Promise<TPool>;
  close: (pool: TPool) => Promise<void>;
}): DatabasePoolLifecycle<TPool, TTarget> {
  let activePool: TPool | null = null;
  let activeFingerprint: string | null = null;
  let initialization: Promise<TPool> | null = null;
  let initializationFingerprint: string | null = null;
  let closing: Promise<void> | null = null;
  let terminalCloseFailure: unknown | null = null;

  const assertSameTarget = (actual: string | null, expected: string, phase: "running" | "initializing") => {
    if (actual && actual !== expected) {
      throw new Error(`Database target changed while the process was ${phase}; restart is required before reconnecting.`);
    }
  };

  const acquire = async (target: TTarget): Promise<TPool> => {
    if (terminalCloseFailure) {
      throw new Error("Database pool shutdown previously failed; restart is required before reconnecting.");
    }
    if (closing) {
      throw new Error("Database pool is shutting down; wait for shutdown to finish before reconnecting.");
    }

    assertSameTarget(activeFingerprint, target.connectionFingerprint, "running");
    if (activePool) return activePool;

    assertSameTarget(initializationFingerprint, target.connectionFingerprint, "initializing");
    if (initialization) return initialization;

    initializationFingerprint = target.connectionFingerprint;
    const currentInitialization = input.initialize(target)
      .then(pool => {
        activePool = pool;
        activeFingerprint = target.connectionFingerprint;
        return pool;
      })
      .finally(() => {
        if (initialization === currentInitialization) {
          initialization = null;
          initializationFingerprint = null;
        }
      });
    initialization = currentInitialization;
    return currentInitialization;
  };

  const close = async (): Promise<void> => {
    if (terminalCloseFailure) {
      throw terminalCloseFailure;
    }
    if (closing) return closing;

    const initializationToDrain = initialization;
    const currentClose = (async () => {
      if (initializationToDrain) {
        try {
          await initializationToDrain;
        } catch {
          // The initializer already releases a failed candidate. There is no
          // adopted pool to close when attestation failed.
        }
      }

      const poolToClose = activePool;
      if (poolToClose) {
        await input.close(poolToClose);
        activePool = null;
        activeFingerprint = null;
      }
    })().catch(error => {
      terminalCloseFailure = error;
      throw error;
    }).finally(() => {
      if (closing === currentClose && !terminalCloseFailure) closing = null;
    });
    closing = currentClose;
    return currentClose;
  };

  return { acquire, close };
}
