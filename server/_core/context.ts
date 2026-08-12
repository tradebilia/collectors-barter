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
    // Parse the session cookie and authenticate via custom auth (username/password system)
    const cookieHeader = opts.req.headers.cookie;
    const cookies = customAuth.parseCookies(cookieHeader);
    const sessionToken = cookies.get(COOKIE_NAME);
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
