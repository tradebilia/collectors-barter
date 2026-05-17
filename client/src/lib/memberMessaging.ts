export type DirectMessage = {
  id: string;
  senderId: number;
  senderName: string;
  message: string;
  createdAt: number;
};

export type DirectThread = {
  threadKey: string;
  participantIds: [number, number];
  counterpartId: number;
  counterpartName: string;
  counterpartAvatarUrl: string | null;
  messages: DirectMessage[];
  updatedAt: number;
};

const MESSAGE_PREFIX = "tradebilia-direct-thread:";
const FAVORITES_PREFIX = "tradebilia-member-favorites:";
const PRESENCE_KEY = "tradebilia-presence";
const channelName = "tradebilia-member-messaging";

function getBrowserChannel() {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  return new BroadcastChannel(channelName);
}

export function getDirectThreadKey(userA: number, userB: number) {
  return [userA, userB].sort((a, b) => a - b).join(":");
}

function getThreadStorageKey(threadKey: string) {
  return `${MESSAGE_PREFIX}${threadKey}`;
}

export function listDirectThreads(userId: number) {
  if (typeof window === "undefined") return [] as DirectThread[];
  const threads: DirectThread[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(MESSAGE_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      const thread = JSON.parse(raw) as DirectThread;
      if (thread.participantIds.includes(userId)) threads.push(thread);
    } catch {
      continue;
    }
  }
  return threads.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getDirectThread(userA: number, userB: number) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getThreadStorageKey(getDirectThreadKey(userA, userB)));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DirectThread;
  } catch {
    return null;
  }
}

export function ensureDirectThread(input: {
  currentUserId: number;
  counterpartId: number;
  counterpartName: string;
  counterpartAvatarUrl?: string | null;
}) {
  const existing = getDirectThread(input.currentUserId, input.counterpartId);
  if (existing) return existing;
  const thread: DirectThread = {
    threadKey: getDirectThreadKey(input.currentUserId, input.counterpartId),
    participantIds: [Math.min(input.currentUserId, input.counterpartId), Math.max(input.currentUserId, input.counterpartId)],
    counterpartId: input.counterpartId,
    counterpartName: input.counterpartName,
    counterpartAvatarUrl: input.counterpartAvatarUrl ?? null,
    messages: [],
    updatedAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getThreadStorageKey(thread.threadKey), JSON.stringify(thread));
  }
  broadcastMessaging();
  return thread;
}

export function sendDirectMessage(input: {
  currentUserId: number;
  currentUserName: string;
  counterpartId: number;
  counterpartName: string;
  counterpartAvatarUrl?: string | null;
  message: string;
}) {
  const nextMessage: DirectMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    senderId: input.currentUserId,
    senderName: input.currentUserName,
    message: input.message.trim(),
    createdAt: Date.now(),
  };
  const existing = ensureDirectThread({
    currentUserId: input.currentUserId,
    counterpartId: input.counterpartId,
    counterpartName: input.counterpartName,
    counterpartAvatarUrl: input.counterpartAvatarUrl ?? null,
  });
  const updated: DirectThread = {
    ...existing,
    counterpartName: input.counterpartName,
    counterpartAvatarUrl: input.counterpartAvatarUrl ?? existing.counterpartAvatarUrl ?? null,
    messages: [...existing.messages, nextMessage],
    updatedAt: nextMessage.createdAt,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getThreadStorageKey(updated.threadKey), JSON.stringify(updated));
  }
  broadcastMessaging();
  return updated;
}

function broadcastMessaging() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tradebilia-direct-messages-updated"));
  }
  const channel = getBrowserChannel();
  channel?.postMessage({ type: "messages" });
  channel?.close();
}

export function subscribeToDirectMessaging(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener("tradebilia-direct-messages-updated", handler as EventListener);
  const channel = getBrowserChannel();
  channel?.addEventListener("message", handler as EventListener);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("tradebilia-direct-messages-updated", handler as EventListener);
    channel?.removeEventListener("message", handler as EventListener);
    channel?.close();
  };
}

export function loadFavoriteMemberIds(userId: number) {
  if (typeof window === "undefined") return [] as number[];
  try {
    const raw = window.localStorage.getItem(`${FAVORITES_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function saveFavoriteMemberIds(userId: number, ids: number[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${FAVORITES_PREFIX}${userId}`, JSON.stringify(ids));
}

export function updatePresence(userId: number, displayName: string) {
  if (typeof window === "undefined") return;
  const current = loadPresenceMap();
  current[userId] = {
    displayName,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(PRESENCE_KEY, JSON.stringify(current));
  const channel = getBrowserChannel();
  channel?.postMessage({ type: "presence" });
  channel?.close();
}

export function loadPresenceMap() {
  if (typeof window === "undefined") return {} as Record<number, { displayName: string; updatedAt: number }>;
  try {
    return JSON.parse(window.localStorage.getItem(PRESENCE_KEY) ?? "{}") as Record<number, { displayName: string; updatedAt: number }>;
  } catch {
    return {} as Record<number, { displayName: string; updatedAt: number }>;
  }
}

export function subscribeToPresence(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => callback();
  window.addEventListener("storage", handler);
  const channel = getBrowserChannel();
  channel?.addEventListener("message", handler as EventListener);
  return () => {
    window.removeEventListener("storage", handler);
    channel?.removeEventListener("message", handler as EventListener);
    channel?.close();
  };
}
