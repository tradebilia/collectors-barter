export const EXTERNAL_PAYMENT_METHODS = ["paypal", "venmo", "cash_app", "zelle"] as const;

export type ExternalPaymentMethod = typeof EXTERNAL_PAYMENT_METHODS[number];

export type ExternalPaymentProfile = {
  paypalEmail?: string | null;
  venmoUsername?: string | null;
  cashAppCashtag?: string | null;
  zelleEmail?: string | null;
  zellePhone?: string | null;
};

export function getExternalPaymentMethodLabel(method: ExternalPaymentMethod) {
  return method === "paypal" ? "PayPal" : method === "venmo" ? "Venmo" : method === "cash_app" ? "Cash App" : "Zelle";
}

export function getExternalPaymentIdentifier(method: ExternalPaymentMethod, profile: ExternalPaymentProfile) {
  if (method === "paypal") return profile.paypalEmail ?? null;
  if (method === "venmo") return profile.venmoUsername ? `@${profile.venmoUsername.replace(/^@+/, "")}` : null;
  if (method === "cash_app") return profile.cashAppCashtag ?? null;
  return profile.zelleEmail ?? profile.zellePhone ?? null;
}

export function maskExternalPaymentIdentifier(identifier?: string | null) {
  if (!identifier) return "Not set";
  if (identifier.includes("@")) {
    const [local, domain] = identifier.split("@");
    return `${local.slice(0, 1)}•••@${domain}`;
  }
  return identifier.length <= 4 ? "••••" : `${identifier.slice(0, 2)}•••${identifier.slice(-2)}`;
}

export function getAvailableExternalPaymentMethods(profile: ExternalPaymentProfile) {
  return EXTERNAL_PAYMENT_METHODS
    .map((method) => ({
      method,
      label: getExternalPaymentMethodLabel(method),
      identifier: getExternalPaymentIdentifier(method, profile),
    }))
    .filter((entry): entry is { method: ExternalPaymentMethod; label: string; identifier: string } => Boolean(entry.identifier))
    .map((entry) => ({ ...entry, identifier: maskExternalPaymentIdentifier(entry.identifier) }));
}

/** Returns only the member-provided methods that have a saved usable destination. */
export function getEnabledExternalPaymentMethods(profile: ExternalPaymentProfile): ExternalPaymentMethod[] {
  return EXTERNAL_PAYMENT_METHODS.filter((method) => Boolean(getExternalPaymentIdentifier(method, profile)));
}

/**
 * A direct-cash obligation is eligible only when both participants have enabled
 * the same member-provided method. Method labels are safe to show in Trade Room;
 * identifiers remain private and are never included here.
 */
export function getSharedExternalPaymentMethods(
  firstProfile: ExternalPaymentProfile,
  secondProfile: ExternalPaymentProfile,
): Array<{ method: ExternalPaymentMethod; label: string }> {
  const secondMethods = new Set(getEnabledExternalPaymentMethods(secondProfile));
  return getEnabledExternalPaymentMethods(firstProfile)
    .filter((method) => secondMethods.has(method))
    .map((method) => ({ method, label: getExternalPaymentMethodLabel(method) }));
}
