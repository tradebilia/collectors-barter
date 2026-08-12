export function resolveDirectMessageDisplayName(
  profileDisplayName: string | null | undefined,
  accountName: string | null | undefined,
  userId: number,
) {
  const profileName = profileDisplayName?.trim();
  if (profileName) return profileName;

  const userName = accountName?.trim();
  if (userName) return userName;

  return `Collector ${userId}`;
}
