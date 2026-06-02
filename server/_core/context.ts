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
    // Extract session cookie from request
    const cookieHeader = opts.req.headers.cookie;
    const cookies = new Map<string, string>();
    
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const [key, value] = cookie.split("=");
        if (key && value) {
          cookies.set(key.trim(), decodeURIComponent(value.trim()));
        }
      });
    }
    
    const sessionCookie = cookies.get(COOKIE_NAME);
    
    // Verify custom auth session
    if (sessionCookie) {
      user = await customAuth.getUserFromSession(sessionCookie);
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
