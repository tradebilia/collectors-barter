/**
 * Explicit opt-in safeguard for an unpublished migration/staging project.
 * Production stays unchanged unless TRADEBILIA_STAGING_MODE is set to 1 or true.
 */
export function isStagingSafetyEnabled(value = process.env.TRADEBILIA_STAGING_MODE): boolean {
  return value?.trim().toLowerCase() === "1" || value?.trim().toLowerCase() === "true";
}

export function stagingSafetyReason(channel: string): string {
  return `${channel} is disabled while TRADEBILIA_STAGING_MODE is enabled.`;
}
