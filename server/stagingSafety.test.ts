import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { isStagingSafetyEnabled, stagingSafetyReason } from "./_core/stagingSafety";
import { sendNewDirectMessageEmail } from "./_core/email";
import { verifyPayPalTransaction } from "./paypal";
import { checkVerificationCode, sendVerificationCode } from "./twilio";

describe("staging safety mode", () => {
  const original = process.env.TRADEBILIA_STAGING_MODE;

  afterEach(() => {
    if (original === undefined) delete process.env.TRADEBILIA_STAGING_MODE;
    else process.env.TRADEBILIA_STAGING_MODE = original;
    vi.restoreAllMocks();
  });

  it("is disabled by default and only activates for explicit true values", () => {
    delete process.env.TRADEBILIA_STAGING_MODE;
    expect(isStagingSafetyEnabled()).toBe(false);
    process.env.TRADEBILIA_STAGING_MODE = "1";
    expect(isStagingSafetyEnabled()).toBe(true);
    process.env.TRADEBILIA_STAGING_MODE = "true";
    expect(isStagingSafetyEnabled()).toBe(true);
    process.env.TRADEBILIA_STAGING_MODE = "false";
    expect(isStagingSafetyEnabled()).toBe(false);
  });

  it("returns a user-safe explanation for blocked staging side effects", () => {
    expect(stagingSafetyReason("SMS verification")).toContain("TRADEBILIA_STAGING_MODE");
  });

  it("blocks email, Twilio, and PayPal outbound calls when explicitly enabled", async () => {
    process.env.TRADEBILIA_STAGING_MODE = "1";
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(sendNewDirectMessageEmail({
      recipientEmail: "test@example.com",
      recipientName: "Test",
      senderName: "Sender",
      subject: "Subject",
      bodyPreview: "Preview",
    })).resolves.toBe(false);
    await expect(sendVerificationCode("+15551234567")).resolves.toMatchObject({ ok: false });
    await expect(checkVerificationCode("+15551234567", "123456")).resolves.toMatchObject({ ok: false });
    await expect(verifyPayPalTransaction("transaction", "seller@example.com", 1)).resolves.toMatchObject({
      found: false,
      verified: false,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows normal integration entry points when staging mode is unset", async () => {
    delete process.env.TRADEBILIA_STAGING_MODE;
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ to: "+15551234567", channel: "sms" }), { status: 201 }));
    vi.spyOn(axios, "post").mockResolvedValue({ data: { access_token: "test-token", expires_in: 3600 } } as any);
    vi.spyOn(axios, "get").mockResolvedValue({
      data: {
        transaction_details: [{
          transaction_info: {
            transaction_id: "transaction",
            transaction_status: "S",
            transaction_amount: { value: "1.00", currency_code: "USD" },
            transaction_initiation_date: "2026-08-12T00:00:00Z",
          },
          payee_info: { email_address: "seller@example.com" },
        }],
      },
    } as any);

    await expect(sendNewDirectMessageEmail({
      recipientEmail: "test@example.com",
      recipientName: "Test",
      senderName: "Sender",
      subject: "Subject",
      bodyPreview: "Preview",
    })).resolves.toBe(true);
    await expect(sendVerificationCode("+15551234567")).resolves.toMatchObject({ ok: true });
    await expect(verifyPayPalTransaction("transaction", "seller@example.com", 1)).resolves.toMatchObject({
      found: true,
      verified: true,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});
