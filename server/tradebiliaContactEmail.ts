export function resolveTradebiliaContactEmail(contactEmail: string | null | undefined): string {
  return contactEmail?.trim() || "";
}
