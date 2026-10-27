import { describe, expect, it, vi } from "vitest";
import { closeMysql2PoolClient, createDatabasePoolLifecycle } from "./databasePoolLifecycle";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("mysql2 pool lifecycle", () => {
  it("waits for the real callback-pool completion signal", async () => {
    let complete: ((error?: unknown) => void) | undefined;
    const client = {
      end: vi.fn((callback?: (error?: unknown) => void) => {
        complete = callback;
      }),
    };
    let settled = false;
    const closing = closeMysql2PoolClient(client).then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(client.end).toHaveBeenCalledOnce();
    expect(settled).toBe(false);

    complete?.();
    await closing;
    expect(settled).toBe(true);
  });

  it("rejects when the mysql2 callback reports a close error", async () => {
    const client = {
      end: vi.fn((callback?: (error?: unknown) => void) => callback?.(new Error("pool close failed"))),
    };

    await expect(closeMysql2PoolClient(client)).rejects.toThrow("pool close failed");
  });

  it("supports promise-style clients without double-settling", async () => {
    const client = { end: vi.fn(() => Promise.resolve()) };

    await expect(closeMysql2PoolClient(client)).resolves.toBeUndefined();
    expect(client.end).toHaveBeenCalledOnce();
  });

  it("waits for in-flight initialization, rejects acquisitions while draining, and closes the adopted pool once", async () => {
    const pendingPool = deferred<{ id: string }>();
    const initialize = vi.fn(() => pendingPool.promise);
    const release = vi.fn(async () => undefined);
    const lifecycle = createDatabasePoolLifecycle({ initialize, close: release });
    const target = { connectionFingerprint: "new-target" };

    const acquiring = lifecycle.acquire(target);
    const closing = lifecycle.close();

    await expect(lifecycle.acquire(target)).rejects.toThrow("Database pool is shutting down");
    expect(release).not.toHaveBeenCalled();

    pendingPool.resolve({ id: "attested-new-pool" });
    await expect(acquiring).resolves.toEqual({ id: "attested-new-pool" });
    await expect(Promise.all([closing, lifecycle.close()])).resolves.toEqual([undefined, undefined]);
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith({ id: "attested-new-pool" });
  });

  it("allows a later fresh pool only after the prior pool is fully closed", async () => {
    const pools = [{ id: "first" }, { id: "second" }];
    const initialize = vi.fn(async () => pools.shift()!);
    const release = vi.fn(async () => undefined);
    const lifecycle = createDatabasePoolLifecycle({ initialize, close: release });
    const target = { connectionFingerprint: "new-target" };

    await expect(lifecycle.acquire(target)).resolves.toEqual({ id: "first" });
    await lifecycle.close();
    await expect(lifecycle.acquire(target)).resolves.toEqual({ id: "second" });

    expect(initialize).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("fails closed after a pool-close failure instead of opening another pool", async () => {
    const initialize = vi.fn(async () => ({ id: "active" }));
    const closeFailure = new Error("close callback failed");
    const release = vi.fn(async () => {
      throw closeFailure;
    });
    const lifecycle = createDatabasePoolLifecycle({ initialize, close: release });
    const target = { connectionFingerprint: "new-target" };

    await lifecycle.acquire(target);
    await expect(lifecycle.close()).rejects.toThrow("close callback failed");
    await expect(lifecycle.acquire(target)).rejects.toThrow("Database pool shutdown previously failed");
    await expect(lifecycle.close()).rejects.toThrow("close callback failed");
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
