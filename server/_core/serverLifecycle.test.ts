import { describe, expect, it, vi } from "vitest";
import { createGracefulShutdownHandler } from "./serverLifecycle";

describe("graceful server shutdown", () => {
  it("stops HTTP traffic before closing the database pool and exits successfully", async () => {
    let closeCallback: ((error?: Error) => void) | undefined;
    const server = { close: vi.fn((callback: (error?: Error) => void) => { closeCallback = callback; }) } as any;
    const closeDb = vi.fn(async () => undefined);
    const exit = vi.fn();
    const shutdown = createGracefulShutdownHandler(server, { closeDb, exit, timeoutMs: 5_000 });

    shutdown();
    expect(server.close).toHaveBeenCalledOnce();
    expect(closeDb).not.toHaveBeenCalled();
    closeCallback?.();
    await Promise.resolve();

    expect(closeDb).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("is idempotent and closes the database safely when the HTTP server cannot close", async () => {
    const server = { close: vi.fn((callback: (error?: Error) => void) => callback(new Error("socket failure"))) } as any;
    const closeDb = vi.fn(async () => undefined);
    const exit = vi.fn();
    const shutdown = createGracefulShutdownHandler(server, { closeDb, exit, timeoutMs: 5_000 });

    shutdown();
    shutdown();
    await Promise.resolve();

    expect(server.close).toHaveBeenCalledOnce();
    expect(closeDb).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("fails safely when closing the database pool fails", async () => {
    const server = { close: vi.fn((callback: (error?: Error) => void) => callback()) } as any;
    const closeDb = vi.fn(async () => { throw new Error("driver details"); });
    const exit = vi.fn();
    const shutdown = createGracefulShutdownHandler(server, { closeDb, exit, timeoutMs: 5_000 });

    shutdown();
    await Promise.resolve();

    expect(exit).toHaveBeenCalledWith(1);
  });

  it("awaits database-pool closure during the timeout grace before forced exit", async () => {
    vi.useFakeTimers();
    try {
      const server = { close: vi.fn(() => undefined) } as any;
      const closeDb = vi.fn(async () => undefined);
      const exit = vi.fn();
      const shutdown = createGracefulShutdownHandler(server, { closeDb, exit, timeoutMs: 50 });

      shutdown();
      await vi.advanceTimersByTimeAsync(50);

      expect(closeDb).toHaveBeenCalledOnce();
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
