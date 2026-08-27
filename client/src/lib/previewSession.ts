let previewSessionToken: string | null = null;
let previewAuthenticatedUser: PreviewAuthenticatedUser | null = null;

export const PREVIEW_AUTH_CHANGED_EVENT = "tradebilia-preview-auth-changed";
const PREVIEW_USER_STORAGE_KEY = "tradebilia-preview-user";
const PREVIEW_USER_TTL_MS = 30 * 60 * 1000;

export type PreviewAuthenticatedUser = {
  id: number;
  name: string;
  username: string | null;
  role: string;
  displayName: string;
  avatarUrl: string | null;
};

function announcePreviewAuthChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PREVIEW_AUTH_CHANGED_EVENT));
}

export function isEmbeddedPreview(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function getPreviewSessionToken(): string | null {
  try {
    return sessionStorage.getItem("manus-cookie") ?? previewSessionToken;
  } catch {
    return previewSessionToken;
  }
}

export function setPreviewSessionToken(token: string): void {
  previewSessionToken = token;
  try {
    sessionStorage.setItem("manus-cookie", token);
  } catch {
    // Embedded previews can block browser storage. The in-memory token keeps
    // this page session authenticated without affecting the live cookie path.
  }
}

export function getPreviewAuthenticatedUser(): PreviewAuthenticatedUser | null {
  if (previewAuthenticatedUser) return previewAuthenticatedUser;
  if (!isEmbeddedPreview()) return null;
  try {
    const raw = sessionStorage.getItem(PREVIEW_USER_STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as { user?: unknown; expiresAt?: unknown };
    if (!isValidPreviewUser(stored.user) || typeof stored.expiresAt !== "number" || stored.expiresAt <= Date.now()) {
      sessionStorage.removeItem(PREVIEW_USER_STORAGE_KEY);
      return null;
    }
    previewAuthenticatedUser = stored.user;
    return previewAuthenticatedUser;
  } catch {
    return null;
  }
}

export function setPreviewAuthenticatedUser(user: PreviewAuthenticatedUser): void {
  previewAuthenticatedUser = user;
  if (isEmbeddedPreview()) {
    try {
      sessionStorage.setItem(PREVIEW_USER_STORAGE_KEY, JSON.stringify({ user, expiresAt: Date.now() + PREVIEW_USER_TTL_MS }));
    } catch {
      // The in-memory state still supports this embedded-preview page session.
    }
  }
  announcePreviewAuthChange();
}

export function clearPreviewSessionToken(): void {
  previewSessionToken = null;
  previewAuthenticatedUser = null;
  try {
    sessionStorage.removeItem("manus-cookie");
    sessionStorage.removeItem(PREVIEW_USER_STORAGE_KEY);
  } catch {}
  announcePreviewAuthChange();
}

function isValidPreviewUser(value: unknown): value is PreviewAuthenticatedUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === "number"
    && typeof user.name === "string"
    && (typeof user.username === "string" || user.username === null)
    && typeof user.role === "string"
    && typeof user.displayName === "string"
    && (typeof user.avatarUrl === "string" || user.avatarUrl === null);
}
