import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureDirectThread,
  getDirectThread,
  listDirectThreads,
  loadFavoriteMemberIds,
  loadPresenceMap,
  saveFavoriteMemberIds,
  sendDirectMessage,
  updatePresence,
} from "../client/src/lib/memberMessaging";

class BroadcastChannelMock {
  constructor(public name: string) {}
  addEventListener() {}
  removeEventListener() {}
  postMessage() {}
  close() {}
}

function createWindowStub() {
  const storage = new Map<string, string>();
  return {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
      get length() {
        return storage.size;
      },
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    BroadcastChannel: BroadcastChannelMock,
  };
}

describe("memberMessaging helpers", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("window", createWindowStub());
    vi.stubGlobal("CustomEvent", class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    });
  });

  it("creates and persists direct threads between two Tradebilia members", () => {
    const created = ensureDirectThread({
      currentUserId: 7,
      counterpartId: 12,
      counterpartName: "Jordan Vault",
      counterpartAvatarUrl: null,
    });

    const stored = getDirectThread(7, 12);

    expect(created.threadKey).toBe("7:12");
    expect(stored?.counterpartName).toBe("Jordan Vault");
    expect(listDirectThreads(7)).toHaveLength(1);
  });

  it("appends direct messages and keeps the newest thread data", () => {
    sendDirectMessage({
      currentUserId: 7,
      currentUserName: "Alex Collector",
      counterpartId: 12,
      counterpartName: "Jordan Vault",
      counterpartAvatarUrl: null,
      message: "Interested in your vintage toy listing.",
    });

    const stored = getDirectThread(7, 12);

    expect(stored?.messages).toHaveLength(1);
    expect(stored?.messages[0]?.senderName).toBe("Alex Collector");
    expect(stored?.messages[0]?.message).toContain("vintage toy");
  });

  it("persists favorite member ids per Tradebilia subscriber", () => {
    saveFavoriteMemberIds(7, [12, 18]);

    expect(loadFavoriteMemberIds(7)).toEqual([12, 18]);
    expect(loadFavoriteMemberIds(9)).toEqual([]);
  });

  it("stores presence timestamps for live browser-based messaging indicators", () => {
    updatePresence(7, "Alex Collector");

    const presence = loadPresenceMap();

    expect(presence[7]?.displayName).toBe("Alex Collector");
    expect(typeof presence[7]?.updatedAt).toBe("number");
  });
});
