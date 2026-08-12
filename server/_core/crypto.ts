/**
 * AES-256-GCM at-rest encryption utility for sensitive OAuth tokens.
 *
 * Uses Node.js built-in `crypto` module — no external dependencies required.
 * The encryption key is read lazily from ENCRYPTION_KEY env var (32-byte hex string).
 *
 * Format of encrypted output: base64( iv[12] + authTag[16] + ciphertext )
 * This is a single opaque string that can be stored in any VARCHAR/TEXT column.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plain-text string. Returns a base64-encoded string.
 * Returns null if input is null/undefined.
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Pack: iv (12) + tag (16) + ciphertext
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypt a base64-encoded encrypted string. Returns plain text.
 * Returns null if input is null/undefined.
 * Returns the original value unchanged if it doesn't look like an encrypted token
 * (safety fallback for any plain-text values already in the DB during migration).
 */
export function decrypt(encoded: string | null | undefined): string | null {
  if (encoded == null) return null;
  try {
    const packed = Buffer.from(encoded, "base64");
    if (packed.length < IV_LENGTH + TAG_LENGTH + 1) {
      // Too short to be a valid encrypted token — return as-is (plain-text fallback)
      return encoded;
    }
    const iv = packed.subarray(0, IV_LENGTH);
    const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);
    const key = getKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    // Decryption failed — value is likely plain-text (pre-migration); return as-is
    return encoded;
  }
}
