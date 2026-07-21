/**
 * Handles the Facebook OAuth callback after the user approves access.
 * Called from the /api/facebook/callback Express route in index.ts.
 */

import { exchangeFacebookCode, getFacebookUserInfo } from "./facebook";
import { requireDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { mysqlNow } from "../db";

export async function handleFacebookCallback(code: string, userId: number): Promise<{
  success: true;
  facebookName: string;
  facebookId: string;
  verified: boolean;
}> {
  // Step 1: Exchange code for access token
  const tokenData = await exchangeFacebookCode(code);

  // Step 2: Fetch user profile from Facebook Graph API
  const userInfo = await getFacebookUserInfo(tokenData.access_token);

  // Step 3: Persist to database using Drizzle ORM
  // Column names match the database exactly (verified in SHOW COLUMNS)
  const db = await requireDb();
  await db
    .update(users)
    .set({
      facebookId: userInfo.id,
      facebookName: userInfo.name,
      facebookVerified: userInfo.verified ? 1 : 0,
      facebookConnectedAt: mysqlNow(),
      facebookAccessToken: tokenData.access_token,
    })
    .where(eq(users.id, userId));

  return {
    success: true,
    facebookName: userInfo.name,
    facebookId: userInfo.id,
    verified: userInfo.verified ?? false,
  };
}
