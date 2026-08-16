export function hasEbayPlatformVerification(
  ebayUsername: string | null | undefined,
  ebayIdVerified: number | boolean | null | undefined,
): boolean {
  return Boolean(ebayUsername?.trim()) || ebayIdVerified === 1 || ebayIdVerified === true;
}
