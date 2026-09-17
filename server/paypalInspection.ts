import { customAuth } from "./_core/customAuth";
import { decrypt, encrypt } from "./_core/crypto";
import type { PayPalComparisonInspection } from "./paypalIdentity";

const PAYPAL_INSPECTION_COOKIE = "tradebilia_paypal_comparison_inspection";
const PAYPAL_INSPECTION_TTL_MS = 5 * 60 * 1000;

type PayPalInspectionEnvelope = {
  userId: number;
  expiresAt: number;
  preview: PayPalComparisonInspection;
};

type CookieResponse = {
  cookie: (name: string, value: string, options: Record<string, unknown>) => unknown;
  clearCookie: (name: string, options: Record<string, unknown>) => unknown;
};

export function setPayPalComparisonInspectionCookie(
  res: CookieResponse,
  userId: number,
  preview: PayPalComparisonInspection,
): void {
  const envelope: PayPalInspectionEnvelope = {
    userId,
    expiresAt: Date.now() + PAYPAL_INSPECTION_TTL_MS,
    preview,
  };
  const encrypted = encrypt(JSON.stringify(envelope));
  if (!encrypted) throw new Error("Could not prepare the PayPal comparison preview.");
  res.cookie(PAYPAL_INSPECTION_COOKIE, encrypted, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api",
    maxAge: PAYPAL_INSPECTION_TTL_MS,
  });
}

export function consumePayPalComparisonInspection(
  req: { headers?: { cookie?: string } },
  res: CookieResponse,
  userId: number,
): PayPalComparisonInspection | null {
  const cookies = customAuth.parseCookies(req.headers?.cookie || "");
  const encrypted = cookies.get(PAYPAL_INSPECTION_COOKIE);
  res.clearCookie(PAYPAL_INSPECTION_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api",
  });
  if (!encrypted) return null;
  const decoded = decrypt(encrypted);
  if (!decoded) return null;
  try {
    const envelope = JSON.parse(decoded) as PayPalInspectionEnvelope;
    if (envelope.userId !== userId || envelope.expiresAt < Date.now() || !envelope.preview) return null;
    return envelope.preview;
  } catch {
    return null;
  }
}

export const paypalComparisonInspectionConfig = {
  cookieName: PAYPAL_INSPECTION_COOKIE,
  ttlMs: PAYPAL_INSPECTION_TTL_MS,
};
