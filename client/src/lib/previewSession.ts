let previewSessionToken: string | null = null;
let previewAuthenticatedUser: PreviewAuthenticatedUser | null = null;

export const PREVIEW_AUTH_CHANGED_EVENT = "tradebilia-preview-auth-changed";

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
  return previewAuthenticatedUser;
}

export function setPreviewAuthenticatedUser(user: PreviewAuthenticatedUser): void {
  previewAuthenticatedUser = user;
  announcePreviewAuthChange();
}

export function clearPreviewSessionToken(): void {
  previewSessionToken = null;
  previewAuthenticatedUser = null;
  try {
    sessionStorage.removeItem("manus-cookie");
  } catch {}
  announcePreviewAuthChange();
}
