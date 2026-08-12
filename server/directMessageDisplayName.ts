export function resolveDirectMessageDisplayName(
  profileDisplayName: string | null | undefined,
  accountName: string | null | undefined,
  userId: number,
) {
  const profileName = profileDisplayName?.trim();
  const genericPlaceholder = `Collector ${userId}`;
  if (profileName && profileName !== genericPlaceholder) return profileName;

  const userName = accountName?.trim();
  if (userName) return userName;

  return profileName || genericPlaceholder;
}
