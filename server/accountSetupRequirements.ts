import { normalizePhone } from "./twilio";

export type FirstTimeSetupInput = {
  acceptedTerms?: boolean;
  contactEmail?: string;
  contactPhone?: string;
  isMerchant?: boolean;
  storeName?: string;
  businessLicense?: string;
  taxId?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
};

export type PersistedSetupVerification = {
  accountEmail?: string | null;
  contactEmail?: string | null;
  emailVerified?: boolean | number | null;
  contactPhone?: string | null;
  phoneVerified?: boolean | number | null;
};

function required(value: string | undefined, message: string) {
  if (!value?.trim()) {
    throw new Error(message);
  }
}

/**
 * Validates setup fields that must be true at the server boundary. Phone verification
 * is deliberately checked against the server-persisted verification result, never a
 * browser-supplied boolean.
 */
export function validateFirstTimeSetupRequirements(
  input: FirstTimeSetupInput,
  persisted: PersistedSetupVerification | undefined,
) {
  if (input.acceptedTerms !== true) {
    throw new Error("You must accept the Terms & Conditions and Privacy Policy before completing setup.");
  }

  required(input.contactEmail, "A verified email address is required before completing setup.");
  const submittedEmail = input.contactEmail!.trim().toLowerCase();
  const accountEmail = persisted?.accountEmail?.trim().toLowerCase();
  const verifiedEmail = persisted?.contactEmail?.trim().toLowerCase();
  const emailIsVerified = persisted?.emailVerified === true || persisted?.emailVerified === 1;

  if (!accountEmail || !emailIsVerified || submittedEmail !== accountEmail || verifiedEmail !== accountEmail) {
    throw new Error("Verify the email address used to create your account before completing setup.");
  }

  required(input.contactPhone, "A verified phone number is required before completing setup.");
  const submittedPhone = normalizePhone(input.contactPhone!);
  const verifiedPhone = normalizePhone(persisted?.contactPhone ?? "");
  const phoneIsVerified = persisted?.phoneVerified === true || persisted?.phoneVerified === 1;

  if (!submittedPhone || !phoneIsVerified || submittedPhone !== verifiedPhone) {
    throw new Error("Verify this phone number before completing setup.");
  }

  if (input.isMerchant) {
    required(input.storeName, "Store name is required for a merchant verification request.");
    required(input.businessLicense, "Business license number is required for a merchant verification request.");
    required(input.taxId, "Tax ID or EIN is required for a merchant verification request.");
    required(input.businessAddress, "Business address is required for a merchant verification request.");
    required(input.businessPhone, "Business phone is required for a merchant verification request.");
    required(input.businessEmail, "Business email is required for a merchant verification request.");
  }
}
