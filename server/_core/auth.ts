import bcrypt from 'bcrypt';

/**
 * Hash a password using bcrypt
 */
export function hashPassword(password: string): string {
  // Note: In production, this should be async. For now, use sync version.
  // bcryptSync is used here because the signup flow needs synchronous hashing.
  return bcrypt.hashSync(password, 10);
}

/**
 * Verify a password against a bcrypt hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
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
