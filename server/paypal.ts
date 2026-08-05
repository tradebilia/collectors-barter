/**
 * PayPal Phase 1 Integration
 * - OAuth 2.0 client credentials token acquisition
 * - Transaction Search API for payment verification
 *
 * NOTE: Tradebilia does NOT process payments. This module only verifies
 * that a PayPal transaction exists between two parties. All payments are
 * made directly between users via PayPal. Tradebilia bears no liability.
 */

import axios from "axios";

// PayPal API base URLs
const PAYPAL_BASE_URL = (process.env.PAYPAL_ENV ?? process.env.PAYPAL_MODE) === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";

let _cachedToken: string | null = null;
let _tokenExpiresAt: number = 0;

/**
 * Acquire a PayPal OAuth 2.0 access token using client credentials.
 * Tokens are cached until 60 seconds before expiry.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiresAt) {
    return _cachedToken;
  }

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }

  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

  const response = await axios.post(
    `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const { access_token, expires_in } = response.data as { access_token: string; expires_in: number };
  _cachedToken = access_token;
  // Cache until 60 seconds before expiry
  _tokenExpiresAt = now + (expires_in - 60) * 1000;

  return access_token;
}

export interface PayPalTransactionDetails {
  transactionId: string;
  status: string;
  amount: string;
  currency: string;
  payerEmail: string | null;
  payeeEmail: string | null;
  transactionDate: string;
  note: string | null;
}

export interface PayPalVerificationResult {
  found: boolean;
  verified: boolean;
  reason?: string;
  transaction?: PayPalTransactionDetails;
}

/**
 * Verify a PayPal transaction by transaction ID.
 * Uses the Transaction Search API to look up the transaction and validate
 * that it matches the expected payee email and amount.
 */
export async function verifyPayPalTransaction(
  transactionId: string,
  expectedPayeeEmail: string,
  expectedAmount: number
): Promise<PayPalVerificationResult> {
  try {
    const token = await getPayPalAccessToken();

    // Search for the transaction in the last 31 days (PayPal API limit per call)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 31);

    const response = await axios.get(
      `${PAYPAL_BASE_URL}/v1/reporting/transactions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          transaction_id: transactionId,
          fields: "all",
        },
      }
    );

    const data = response.data as {
      transaction_details?: Array<{
        transaction_info?: {
          transaction_id: string;
          transaction_status: string;
          transaction_amount?: { value: string; currency_code: string };
          transaction_initiation_date: string;
          transaction_note?: string;
        };
        payer_info?: { email_address?: string };
        payee_info?: { email_address?: string };
      }>;
      total_items?: number;
    };

    if (!data.transaction_details || data.transaction_details.length === 0) {
      return { found: false, verified: false, reason: "Transaction not found in PayPal records." };
    }

    const tx = data.transaction_details[0];
    const txInfo = tx.transaction_info;
    if (!txInfo) {
      return { found: false, verified: false, reason: "Transaction details unavailable." };
    }

    const txAmount = parseFloat(txInfo.transaction_amount?.value ?? "0");
    const txStatus = txInfo.transaction_status;
    const payeeEmail = tx.payee_info?.email_address ?? null;
    const payerEmail = tx.payer_info?.email_address ?? null;

    const details: PayPalTransactionDetails = {
      transactionId: txInfo.transaction_id,
      status: txStatus,
      amount: txInfo.transaction_amount?.value ?? "0",
      currency: txInfo.transaction_amount?.currency_code ?? "USD",
      payerEmail,
      payeeEmail,
      transactionDate: txInfo.transaction_initiation_date,
      note: txInfo.transaction_note ?? null,
    };

    // Verify the transaction is completed/success
    if (txStatus !== "S") {
      return {
        found: true,
        verified: false,
        reason: `Transaction status is "${txStatus}" (expected "S" for Success/Completed).`,
        transaction: details,
      };
    }

    // Verify the payee email matches (case-insensitive)
    if (payeeEmail && payeeEmail.toLowerCase() !== expectedPayeeEmail.toLowerCase()) {
      return {
        found: true,
        verified: false,
        reason: `Transaction payee email does not match the seller's PayPal email.`,
        transaction: details,
      };
    }

    // Verify the amount is at least the expected amount (allow minor rounding)
    if (Math.abs(txAmount - expectedAmount) > 0.02) {
      return {
        found: true,
        verified: false,
        reason: `Transaction amount ($${txAmount}) does not match the expected amount ($${expectedAmount}).`,
        transaction: details,
      };
    }

    return { found: true, verified: true, transaction: details };
  } catch (err: unknown) {
    const error = err as { response?: { status?: number; data?: unknown }; message?: string };
    if (error?.response?.status === 401) {
      // Force token refresh on next call
      _cachedToken = null;
      _tokenExpiresAt = 0;
      return { found: false, verified: false, reason: "PayPal authentication failed. Please try again." };
    }
    if (error?.response?.status === 404) {
      return { found: false, verified: false, reason: "Transaction not found in PayPal records." };
    }
    console.error("[PayPal] Verification error:", error?.message, error?.response?.data);
    return { found: false, verified: false, reason: "PayPal verification service temporarily unavailable." };
  }
}
