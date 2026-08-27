import { describe, expect, it } from "vitest";
import { decrypt, encrypt, hasValidProviderTokenEncryptionKey } from "./_core/crypto";

describe("provider OAuth token encryption configuration", () => {
  it.skipIf(!process.env.ENCRYPTION_KEY)("has a valid configured AES-256-GCM key and encrypts a token without retaining plaintext", () => {
    expect(process.env.ENCRYPTION_KEY).toMatch(/^[a-f0-9]{64}$/i);
    expect(hasValidProviderTokenEncryptionKey()).toBe(true);

    const plaintext = "provider-token-round-trip-test";
    const encrypted = encrypt(plaintext);

    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("reports an unavailable encryption configuration without attempting provider token storage", () => {
    const configuredKey = process.env.ENCRYPTION_KEY;
    try {
      process.env.ENCRYPTION_KEY = "invalid";
      expect(hasValidProviderTokenEncryptionKey()).toBe(false);
    } finally {
      if (configuredKey === undefined) delete process.env.ENCRYPTION_KEY;
      else process.env.ENCRYPTION_KEY = configuredKey;
    }
  });
});
