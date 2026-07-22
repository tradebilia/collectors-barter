/**
 * Handles the Facebook OAuth callback after the user approves access.
 * Called from the /api/facebook/callback Express route in index.ts.
 */

import { exchangeFacebookCode, getFacebookUserInfo } from "./facebook";
import { requireDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { mysqlNow } from "../db";
import { encrypt } from "./crypto";

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
  const db = await requireDb();
  await db
    .update(users)
    .set({
      facebookId: userInfo.id,
      facebookName: userInfo.name,
      facebookVerified: 1, // Successfully connected via OAuth = verified
      facebookConnectedAt: mysqlNow(),
      facebookAccessToken: encrypt(tokenData.access_token),
      facebookEmail: userInfo.email ?? null,
      facebookPicture: userInfo.picture ?? null,
      facebookLocation: userInfo.location ?? null,
      facebookLink: userInfo.link ?? null,
      facebookLikes: userInfo.likes ? JSON.stringify(userInfo.likes) : null,
    })
    .where(eq(users.id, userId));

  return {
    success: true,
    facebookName: userInfo.name,
    facebookId: userInfo.id,
    verified: userInfo.verified ?? false,
  };
}
