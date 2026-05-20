import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

/**
 * Hash a password using scrypt
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  try {
    const [saltHex, hashHex] = hash.split(":");
    const salt = Buffer.from(saltHex, "hex");
    const storedHash = Buffer.from(hashHex, "hex");
    const computedHash = scryptSync(password, salt, 64);
    return timingSafeEqual(computedHash, storedHash);
  } catch (error) {
    return false;
  }
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  // 3-32 characters, alphanumeric + underscore/hyphen
  return /^[a-zA-Z0-9_-]{3,32}$/.test(username);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  // At least 8 characters, must include uppercase, lowercase, number
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
