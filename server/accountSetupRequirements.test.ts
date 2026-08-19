import { describe, expect, it } from "vitest";
import { validateFirstTimeSetupRequirements } from "./accountSetupRequirements";

const validSetup = {
  acceptedTerms: true,
  contactEmail: "member@example.com",
  contactPhone: "(212) 555-1212",
};

const verifiedContacts = {
  accountEmail: "member@example.com",
  contactEmail: "member@example.com",
  emailVerified: true,
  contactPhone: "+12125551212",
  phoneVerified: true,
};

describe("first-time account setup requirements", () => {
  it("accepts server-verified email and phone after normalizing phone presentation", () => {
    expect(() => validateFirstTimeSetupRequirements(validSetup, verifiedContacts)).not.toThrow();
  });

  it("rejects browser-only phone claims when no matching verification was persisted", () => {
    expect(() =>
      validateFirstTimeSetupRequirements(validSetup, { ...verifiedContacts, phoneVerified: false }),
    ).toThrow("Verify this phone number");
  });

  it("rejects a verified different phone number and missing terms", () => {
    expect(() =>
      validateFirstTimeSetupRequirements(validSetup, { ...verifiedContacts, contactPhone: "+12125550100" }),
    ).toThrow("Verify this phone number");
    expect(() =>
      validateFirstTimeSetupRequirements({ ...validSetup, acceptedTerms: false }, verifiedContacts),
    ).toThrow("Terms");
  });

  it("requires complete merchant verification-request fields when selected", () => {
    expect(() =>
      validateFirstTimeSetupRequirements(
        { ...validSetup, isMerchant: true, storeName: "Example Store" },
        verifiedContacts,
      ),
    ).toThrow("Business license");
  });

  it("requires a server-verified account email rather than a browser-only contact email", () => {
    expect(() =>
      validateFirstTimeSetupRequirements(validSetup, { ...verifiedContacts, emailVerified: false }),
    ).toThrow("Verify the email address");
    expect(() =>
      validateFirstTimeSetupRequirements({ ...validSetup, contactEmail: "other@example.com" }, verifiedContacts),
    ).toThrow("Verify the email address");
  });
});
