import { describe, it, expect } from "vitest";
import { normalizePhone, maskPhone, isTwilioConfigured } from "./twilio";

describe("Twilio Verify credential validation", () => {
  it("has all three Twilio env vars present", () => {
    expect(process.env.TWILIO_ACCOUNT_SID, "TWILIO_ACCOUNT_SID missing").toBeTruthy();
    expect(process.env.TWILIO_AUTH_TOKEN, "TWILIO_AUTH_TOKEN missing").toBeTruthy();
    expect(process.env.TWILIO_VERIFY_SERVICE_SID, "TWILIO_VERIFY_SERVICE_SID missing").toBeTruthy();
    expect(isTwilioConfigured()).toBe(true);
  });

  it("authenticates against the Twilio Verify Service endpoint", async () => {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");

    const res = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    expect(res.status, "Twilio Verify Service lookup should return 200").toBe(200);
    const data: any = await res.json();
    expect(data.sid).toBe(serviceSid);
    // Our Verify Service is configured for 6-digit codes
    expect(data.code_length).toBe(6);
  }, 20000);
});

describe("normalizePhone", () => {
  it("converts a 10-digit US number to E.164", () => {
    expect(normalizePhone("5551234567")).toBe("+15551234567");
  });

  it("strips formatting characters", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("+15551234567");
    expect(normalizePhone("555.123.4567")).toBe("+15551234567");
    expect(normalizePhone(" 555 123 4567 ")).toBe("+15551234567");
  });

  it("handles an 11-digit number starting with 1", () => {
    expect(normalizePhone("15551234567")).toBe("+15551234567");
    expect(normalizePhone("1 (555) 123-4567")).toBe("+15551234567");
  });

  it("preserves an already-E.164 international number", () => {
    expect(normalizePhone("+447911123456")).toBe("+447911123456");
  });

  it("rejects numbers that are too short or empty", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("   ")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("+123")).toBeNull();
  });

  it("rejects numbers that are too long", () => {
    expect(normalizePhone("+1234567890123456789")).toBeNull();
  });
});

describe("maskPhone", () => {
  it("shows only the last four digits", () => {
    expect(maskPhone("+15551234567")).toBe("(***) ***-4567");
  });

  it("never leaks the full number", () => {
    const masked = maskPhone("+15551234567");
    expect(masked).not.toContain("5551");
    expect(masked).not.toContain("+1555");
  });
});
