import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { customAuth } from "./customAuth";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Prefer the HttpOnly cookie. A short-lived request-header fallback supports
    // mobile WebViews and privacy modes that reject an otherwise valid Set-Cookie.
    const cookieHeader = opts.req.headers.cookie;
    const cookies = customAuth.parseCookies(cookieHeader);
    const authorization = opts.req.headers.authorization;
    const bearerToken =
      typeof authorization === "string" && authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : undefined;
    const sessionToken = cookies.get(COOKIE_NAME) ?? bearerToken;
    if (sessionToken) {
      user = await customAuth.getUserFromSession(sessionToken);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
