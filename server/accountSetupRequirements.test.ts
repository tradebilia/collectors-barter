import { describe, expect, it } from "vitest";
import { validateFirstTimeSetupRequirements } from "./accountSetupRequirements";

const validSetup = {
  acceptedTerms: true,
  contactPhone: "(212) 555-1212",
  securityQuestion: "What was your first pet?",
  securityAnswer: "Juniper",
};

describe("first-time account setup requirements", () => {
  it("accepts a server-verified phone after normalizing its presentation", () => {
    expect(() =>
      validateFirstTimeSetupRequirements(validSetup, {
        contactPhone: "+12125551212",
        phoneVerified: true,
      }),
    ).not.toThrow();
  });

  it("rejects browser-only phone claims when no matching verification was persisted", () => {
    expect(() =>
      validateFirstTimeSetupRequirements(validSetup, {
        contactPhone: "+12125551212",
        phoneVerified: false,
      }),
    ).toThrow("Verify this phone number");
  });

  it("rejects a verified different phone number and missing terms", () => {
    expect(() =>
      validateFirstTimeSetupRequirements(validSetup, {
        contactPhone: "+12125550100",
        phoneVerified: true,
      }),
    ).toThrow("Verify this phone number");
    expect(() =>
      validateFirstTimeSetupRequirements(
        { ...validSetup, acceptedTerms: false },
        { contactPhone: "+12125551212", phoneVerified: true },
      ),
    ).toThrow("Terms");
  });

  it("requires the complete merchant verification-request fields when selected", () => {
    expect(() =>
      validateFirstTimeSetupRequirements(
        { ...validSetup, isMerchant: true, storeName: "Example Store" },
        { contactPhone: "+12125551212", phoneVerified: true },
      ),
    ).toThrow("Business license");
  });
});
