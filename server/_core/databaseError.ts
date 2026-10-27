type DatabaseErrorLike = {
  code?: unknown;
};

/**
 * Error messages can include provider/network details. Only a bounded driver
 * code is safe to expose in logs or public operational responses.
 */
export function safeDatabaseErrorCode(error: unknown): string {
  const code = error && typeof error === "object" ? (error as DatabaseErrorLike).code : undefined;
  const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
  return /^[A-Z0-9_]{2,64}$/.test(normalized) ? normalized : "DATABASE_UNAVAILABLE";
}
