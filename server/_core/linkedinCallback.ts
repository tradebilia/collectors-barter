/**
 * Handles the LinkedIn OAuth callback after the user approves access.
 * Called from the /api/linkedin/callback Express route in index.ts.
 */
import { exchangeLinkedInCode, getLinkedInUserInfo } from "./linkedin";
import { requireDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { mysqlNow } from "../db";
import { encrypt } from "./crypto";
import { claimIdentity } from "../identityRegistry";

export async function handleLinkedInCallback(
  code: string,
  userId: number
): Promise<{
  success: true;
  linkedinName: string;
  linkedinId: string;
}> {
  // Step 1: Exchange authorization code for access token
  const tokenData = await exchangeLinkedInCode(code);

  // Step 2: Fetch user profile from LinkedIn UserInfo endpoint
  const userInfo = await getLinkedInUserInfo(tokenData.access_token);

  // Step 3: Persist to database using Drizzle ORM
  // Access token is encrypted at rest using AES-256-GCM
  const db = await requireDb();
  await db.transaction(async tx => {
    await claimIdentity(tx, { userId, identityType: "linkedin", value: userInfo.id });
    await tx.update(users).set({
      linkedinId: userInfo.id,
      linkedinName: userInfo.name,
      linkedinEmail: userInfo.email ?? null,
      linkedinPicture: userInfo.picture ?? null,
      linkedinHeadline: userInfo.headline ?? null,
      linkedinProfileUrl: userInfo.profileUrl ?? null,
      linkedinAccessToken: encrypt(tokenData.access_token),
      linkedinConnectedAt: mysqlNow(),
    }).where(eq(users.id, userId));
  });

  return {
    success: true,
    linkedinName: userInfo.name,
    linkedinId: userInfo.id,
  };
}
