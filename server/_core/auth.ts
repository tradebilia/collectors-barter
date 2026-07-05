import bcrypt from 'bcrypt';

/**
 * Hash a password using bcrypt (async).
 *
 * NOTE: previously used bcrypt.hashSync, which blocks the Node event loop
 * ~100ms per call and froze ALL in-flight requests during login/signup
 * bursts. The async version does the work on the libuv thread pool.
 */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a bcrypt hash (async).
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
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
