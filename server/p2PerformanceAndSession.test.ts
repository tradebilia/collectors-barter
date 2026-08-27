import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const user = { id: 7, name: "Collector", username: "collector", role: "user", displayName: "Collector", avatarUrl: null };
let store = new Map<string, string>();

function installEmbeddedWindow() {
  const self = {};
  const sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  vi.stubGlobal("sessionStorage", sessionStorage);
  vi.stubGlobal("window", {
    self,
    top: {},
    dispatchEvent: vi.fn(),
    sessionStorage,
  });
}

async function loadSession() {
  return import("../client/src/lib/previewSession");
}

describe("P2 preview session and route-loading contracts", () => {
  beforeEach(() => {
    store = new Map();
    installEmbeddedWindow();
    vi.resetModules();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("restores only a valid unexpired embedded-preview user after a module reload", async () => {
    const first = await loadSession();
    first.setPreviewAuthenticatedUser(user);
    expect(store.get("tradebilia-preview-user")).toBeTruthy();

    vi.resetModules();
    const reloaded = await loadSession();
    expect(reloaded.getPreviewAuthenticatedUser()).toEqual(user);
  });

  it("removes expired embedded-preview user data", async () => {
    store.set("tradebilia-preview-user", JSON.stringify({ user, expiresAt: Date.now() - 1 }));
    const session = await loadSession();
    expect(session.getPreviewAuthenticatedUser()).toBeNull();
    expect(store.has("tradebilia-preview-user")).toBe(false);
  });

  it("clears both preview fallback values on logout cleanup", async () => {
    const session = await loadSession();
    session.setPreviewSessionToken("token");
    session.setPreviewAuthenticatedUser(user);
    session.clearPreviewSessionToken();
    expect(store.has("manus-cookie")).toBe(false);
    expect(store.has("tradebilia-preview-user")).toBe(false);
    expect(session.getPreviewAuthenticatedUser()).toBeNull();
  });

  it("loads infrequently used routes only when they are opened", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const app = readFileSync(resolve(import.meta.dirname, "../client/src/App.tsx"), "utf8");
    expect(app).toContain('lazy(() => import("./pages/AdminDashboard"))');
    expect(app).toContain('lazy(() => import("./pages/WarRoom"))');
    expect(app).toContain('lazy(() => import("./pages/TestAI"))');
    expect(app).toContain("<Suspense fallback={<RouteLoadingFallback />}>");
  });
});
