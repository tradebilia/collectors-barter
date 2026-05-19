import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

const COOKIE_NAME = "session";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export type SessionPayload = {
  userId: number;
  username: string;
  role: string;
};

/**
 * Custom authentication service - no Manus OAuth dependency
 */
export class CustomAuthService {
  private getSessionSecret(): Uint8Array {
    const secret = ENV.jwtSecret;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is not set");
    }
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a session token for a custom auth user
   */
  async createSessionToken(
    userId: number,
    username: string,
    role: string,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      userId,
      username,
      role,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * Verify and decode a session token
   */
  async verifySession(token: string | null | undefined): Promise<SessionPayload | null> {
    if (!token) return null;

    try {
      const secretKey = this.getSessionSecret();
      const verified = await jwtVerify(token, secretKey);
      return verified.payload as SessionPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract session cookie from request headers
   */
  parseCookies(cookieHeader: string | undefined): Map<string, string> {
    const cookies = new Map<string, string>();
    if (!cookieHeader) return cookies;

    cookieHeader.split(";").forEach((cookie) => {
      const [key, value] = cookie.split("=");
      if (key && value) {
        cookies.set(key.trim(), decodeURIComponent(value.trim()));
      }
    });

    return cookies;
  }

  /**
   * Get user from session cookie
   */
  async getUserFromSession(sessionCookie: string | undefined): Promise<User | null> {
    if (!sessionCookie) return null;

    const session = await this.verifySession(sessionCookie);
    if (!session) return null;

    try {
      const user = await db.getUserById(session.userId);
      return user || null;
    } catch (error) {
      console.error("[CustomAuth] Failed to get user from session:", error);
      return null;
    }
  }

  /**
   * Create session cookie header value
   */
  createSessionCookie(token: string, expiresInMs: number = ONE_YEAR_MS): string {
    const expiresAt = new Date(Date.now() + expiresInMs);
    return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${expiresAt.toUTCString()}`;
  }
}

export const customAuth = new CustomAuthService();
