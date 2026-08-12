/**
 * OTP (One-Time Password) verification helper functions
 */

export function generateOtp(): string {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOtpExpiryTime(minutesFromNow: number = 10): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutesFromNow);
  return now;
}

export function isOtpExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

export function isOtpValid(otp: string, storedOtp: string, expiresAt: Date, maxAttempts: number = 5, attempts: number = 0): { valid: boolean; reason?: string } {
  if (isOtpExpired(expiresAt)) {
    return { valid: false, reason: "OTP has expired" };
  }

  if (attempts >= maxAttempts) {
    return { valid: false, reason: "Too many failed attempts" };
  }

  if (otp !== storedOtp) {
    return { valid: false, reason: "Invalid OTP" };
  }

  return { valid: true };
}
