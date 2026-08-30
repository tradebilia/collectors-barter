import { updateUserEtsyInfo } from "../db";
import { encrypt } from "./crypto";
import { exchangeEtsyCode, getEtsyUser, getEtsyUserShops } from "./etsy";

export async function handleEtsyCallback(
  code: string,
  codeVerifier: string,
  userId: number
) {
  const tokenData = await exchangeEtsyCode(code, codeVerifier);
  const encryptedAccessToken = encrypt(tokenData.access_token);
  if (!encryptedAccessToken) throw new Error("Etsy token encryption unavailable");
  const etsyUser = await getEtsyUser(tokenData.access_token);
  const shopData = await getEtsyUserShops(
    etsyUser.user_id,
    tokenData.access_token
  );
  const shop = shopData.results?.[0] ?? null;
  const shopUrl =
    shop?.url ||
    (shop?.shop_name
      ? `https://www.etsy.com/shop/${encodeURIComponent(shop.shop_name)}`
      : null);
  await updateUserEtsyInfo({
    userId,
    etsyUserId: String(etsyUser.user_id),
    etsyEmail: etsyUser.primary_email ?? null,
    etsyDisplayName:
      [etsyUser.first_name, etsyUser.last_name].filter(Boolean).join(" ") ||
      null,
    etsyShopId: shop ? String(shop.shop_id) : null,
    etsyShopName: shop?.shop_name ?? shop?.title ?? null,
    etsyShopUrl: shopUrl,
    etsyShopAvatarUrl:
      shop?.icon_url_fullxfull ?? shop?.image_url_760x100 ?? null,
    etsyShopStatus: shop?.status ?? null,
    etsyAccessToken: encryptedAccessToken,
    etsyRefreshToken: tokenData.refresh_token
      ? encrypt(tokenData.refresh_token)
      : null,
    etsyTokenExpiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null,
  });
  return {
    success: true as const,
    etsyUserId: String(etsyUser.user_id),
    etsyShopName: shop?.shop_name ?? shop?.title ?? null,
  };
}
