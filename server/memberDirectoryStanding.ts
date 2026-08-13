export type MemberStandingKey = "verified" | "established" | "rising";

export function resolveMemberStanding(input: {
  merchantVerified: boolean | number | null | undefined;
  completedTradeCount: number;
  reviewCount: number;
}): { key: MemberStandingKey; label: string } {
  if (Boolean(input.merchantVerified)) {
    return { key: "verified", label: "Verified Merchant" };
  }

  if (input.completedTradeCount >= 3 || input.reviewCount >= 3) {
    return { key: "established", label: "Established" };
  }

  return { key: "rising", label: "Rising" };
}
