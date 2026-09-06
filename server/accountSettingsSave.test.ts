import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const settingsSource = readFileSync(resolve(process.cwd(), "client/src/pages/AccountSettings.tsx"), "utf8");

describe("Profile save persistence", () => {
  it("persists profile and private payment settings from one save handler", () => {
    expect(settingsSource).toContain("await saveProfileMutation.mutateAsync(payload);");
    expect(settingsSource).toContain("await saveExternalPaymentMethodsMutation.mutateAsync({");
    expect(settingsSource).toContain("enabledMethods: enabledPaymentMethods");
    expect(settingsSource).toContain("These private payment preferences are saved together with your Profile Changes.");
    expect(settingsSource).toContain('message: paymentResult.preferencesChanged');
  });

  it("does not render a second payment-method save button or handler", () => {
    expect(settingsSource).not.toContain("handleSaveExternalPaymentMethods");
    expect(settingsSource).not.toContain("Save payment methods");
    expect(settingsSource).toContain("Save Profile Changes");
  });

  it("keeps the combined action disabled while either save operation is active", () => {
    expect(settingsSource).toContain("disabled={saveProfileMutation.isPending || externalPaymentSaving}");
  });
});
