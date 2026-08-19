import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("single-account setup handoff", () => {
  it("routes every Sign Up entry to Create Account and keeps account creation out of Account Setup", () => {
    const setup = read("client/src/pages/AccountSetup.tsx");
    const signInModal = read("client/src/components/SignInModal.tsx");
    const signUp = read("client/src/pages/SignUp.tsx");
    expect(signInModal).toContain('navigate("/signup")');
    expect(setup).not.toContain("signupMutation.mutateAsync");
    expect(setup).toContain("saveProfileMutation.mutateAsync");
    expect(setup).not.toContain('name="password"');
    expect(setup).not.toContain("onClick={() => setCurrentStep(step)}");
    expect(signUp).toContain('newErrors.email = "Email is required"');
    expect(signUp).toContain('queryClient.refetchQueries({ queryKey: ["auth.me"] })');
  });

  it("requires persisted verified contacts and ignores browser verification flags at the router boundary", () => {
    const routerSource = read("server/routers.ts");
    expect(routerSource).toContain("verifyPhoneCode: protectedProcedure");
    expect(routerSource).toContain("verifyEmailCode: protectedProcedure");
    expect(routerSource).toContain("accountEmail: account?.email");
    expect(routerSource).toContain("validateFirstTimeSetupRequirements(input, {");
    expect(routerSource).toContain("emailVerified: isFirstTimeSetup ? true : undefined");
    expect(routerSource).toContain("phoneVerified: isFirstTimeSetup ? true : undefined");
  });

  it("retires the non-persisting Profile Completion workflow in favor of authoritative routes", () => {
    const app = read("client/src/App.tsx");
    const legacyRedirect = read("client/src/pages/LegacyProfileCompletionRedirect.tsx");

    expect(app).toContain('path="/profile-completion" component={LegacyProfileCompletionRedirect}');
    expect(legacyRedirect).toContain('"/account-settings?tab=profile"');
    expect(legacyRedirect).toContain('"/account-setup"');
    expect(legacyRedirect).toContain("setLocation(destination, { replace: true })");
    expect(legacyRedirect).toContain("enabled: isAuthenticated");
    expect(legacyRedirect).not.toContain("saveProfileMutation");
    expect(legacyRedirect).not.toContain("mutateAsync");
    expect(() => read("client/src/pages/ProfileCompletion.tsx")).toThrow();
  });
});
