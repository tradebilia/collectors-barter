let previewSessionToken: string | null = null;

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

export function clearPreviewSessionToken(): void {
  previewSessionToken = null;
  try {
    sessionStorage.removeItem("manus-cookie");
  } catch {}
}
