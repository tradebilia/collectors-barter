import { exchangeCodeForToken, getUserInfo, getUserFeedback } from "./ebay";
import { updateUserEbayInfo, storeEbayFeedback, flagLowFeedback, requireDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function handleEbayCallback(code: string, userId: number) {
  try {
    // Exchange authorization code for access token
    const tokenData = await exchangeCodeForToken(code);

    // Get user info from eBay
    const userInfo = await getUserInfo(tokenData.access_token);

    // Get feedback from eBay (last 3 years)
    const feedback = await getUserFeedback(tokenData.access_token, userInfo.userId);

    // Check if feedback is low (less than 95%)
    const isLowFeedback = userInfo.feedbackPercentage < 95;

    // Update user with eBay info
    await updateUserEbayInfo({
      userId,
      ebayUsername: userInfo.username,
      ebayUserId: userInfo.userId,
      ebayFeedbackScore: userInfo.feedbackScore,
      ebayFeedbackPercentage: userInfo.feedbackPercentage,
      ebayMemberSince: userInfo.memberSince,
      ebaySellerLevel: userInfo.sellerLevel,
      ebayIdVerified: userInfo.idVerified,
      ebayStar: userInfo.star,
      ebayPositive12mo: userInfo.positive12mo,
      ebayNeutral12mo: userInfo.neutral12mo,
      ebayNegative12mo: userInfo.negative12mo,
      ebayIsStoreOwner: userInfo.isStoreOwner,
      ebayAccessToken: tokenData.access_token,
      ebayRefreshToken: tokenData.refresh_token,
      ebayTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    });

    // Store feedback records
    for (const fb of feedback) {
      await storeEbayFeedback({
        userId,
        ...fb,
      });
    }

    // Flag if low feedback
    if (isLowFeedback) {
      await flagLowFeedback({
        userId,
        feedbackScore: userInfo.feedbackScore,
        feedbackPercentage: userInfo.feedbackPercentage,
        flaggedReason: `Low eBay feedback: ${userInfo.feedbackPercentage}%`,
      });
    }

    return {
      success: true,
      username: userInfo.username,
      feedbackScore: userInfo.feedbackScore,
      feedbackPercentage: userInfo.feedbackPercentage,
      isLowFeedback,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("eBay callback error - Full error:", error);
    console.error("eBay callback error - Message:", errorMsg);
    console.error("eBay callback error - Stack:", error instanceof Error ? error.stack : "N/A");
    throw new Error(`Failed to connect eBay account: ${errorMsg}`);
  }
}
