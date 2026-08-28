/**
 * Tradebilia Email Service (powered by Resend)
 * Sends transactional emails to users for key events.
 */

const FROM_ADDRESS = "Tradebilia <noreply@tradebilia.com>";
const SITE_URL = "https://tradebilia.manus.space";
import { isStagingSafetyEnabled, stagingSafetyReason } from "./stagingSafety";
import { classifyApiFailure, recordApiFailure } from "../apiHealth";

const RESEND_REQUEST_TIMEOUT_MS = 15_000;

/** Treat all template values as plain text before inserting them into email HTML. */
export function escapeEmailHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeEmailTextWithBreaks(value: string): string {
  return escapeEmailHtml(value).replace(/\r?\n/g, "<br>");
}

/** Remove characters that could otherwise be interpreted as a second mail header. */
export function toSafeEmailSubject(value: string): string {
  return value.replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (isStagingSafetyEnabled()) {
    console.warn(`[Email] ${stagingSafetyReason("Email delivery")}`);
    return false;
  }
  if (!resendApiKey) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping email notification");
    return false;
  }
  if (!to || !to.includes("@")) {
    console.warn("[Email] Invalid recipient email address — skipping");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject: toSafeEmailSubject(subject), html }),
      signal: AbortSignal.timeout(RESEND_REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      await recordApiFailure({
        provider: "Resend",
        operation: "transactional_email",
        failureClass: classifyApiFailure({ statusCode: res.status }),
        statusCode: res.status,
        safeMessage: "Transactional email request was rejected by the provider.",
      });
      console.warn(`[Email] Resend transactional email request failed with HTTP ${res.status}.`);
      return false;
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resend request failed";
    await recordApiFailure({
      provider: "Resend",
      operation: "transactional_email",
      failureClass: classifyApiFailure({ message }),
      safeMessage: "Transactional email provider is temporarily unavailable.",
    });
    console.warn("[Email] Transactional email provider is temporarily unavailable.");
    return false;
  }
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#0a0d22;padding:24px 16px;text-align:center;">
          <img
            src="https://assets.tradebilia.com/tradebilia_final_transparent_58812c5a.svg"
            alt="Tradebilia"
            width="520"
            style="display:block;margin:0 auto;width:100%;max-width:520px;height:auto;"
          />
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8f8f6;padding:20px 32px;text-align:center;border-top:1px solid #ebebeb;">
          <p style="color:#999;font-size:12px;margin:0 0 8px;">You're receiving this because you have an account on <a href="${SITE_URL}" style="color:#7f31ff;text-decoration:none;">Tradebilia</a>.</p>
          <p style="color:#999;font-size:11px;margin:0;">Don't want to receive these emails? <a href="${SITE_URL}/account-settings?tab=notifications" style="color:#7f31ff;text-decoration:none;">Manage your notification preferences</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendAccountEmailVerificationCode(params: {
  recipientEmail: string;
  code: string;
}): Promise<boolean> {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">Verify your Tradebilia email</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">Use this code to complete your Tradebilia account setup. It expires in 10 minutes.</p>
    <div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:0.24em;color:#0a0d22;">${escapeEmailHtml(params.code)}</p>
    </div>
    <p style="color:#666;font-size:13px;margin:0;">If you did not start account setup, you can ignore this email.</p>
  `);
  return sendEmail(params.recipientEmail, "Verify your Tradebilia email", html);
}

export async function sendPasswordRecoveryEmail(params: {
  recipientEmail: string;
  token: string;
}): Promise<boolean> {
  const resetUrl = `${SITE_URL}/reset-password?token=${encodeURIComponent(params.token)}`;
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">Reset your Tradebilia password</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">Use the secure link below to choose a new password. It expires in 30 minutes and can only be used once.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">Reset Password</a>
    <p style="color:#666;font-size:13px;margin:24px 0 0;">If you did not request a password reset, you can ignore this email.</p>
  `);
  return sendEmail(params.recipientEmail, "Reset your Tradebilia password", html);
}

/**
 * Notify a user that they received a new direct message.
 */
export async function sendNewDirectMessageEmail(params: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  subject: string;
  bodyPreview: string;
}): Promise<boolean> {
  const preview = params.bodyPreview.length > 200
    ? params.bodyPreview.slice(0, 200) + "..."
    : params.bodyPreview;

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">New message from ${escapeEmailHtml(params.senderName)}</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">You have a new direct message on Tradebilia.</p>

    <div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Subject</p>
      <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#0a0d22;">${escapeEmailHtml(params.subject)}</p>
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Message</p>
      <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">${escapeEmailTextWithBreaks(preview)}</p>
    </div>

    <a href="${SITE_URL}/messages" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">View Message &amp; Reply</a>
  `);

  return sendEmail(
    params.recipientEmail,
    `New message from ${params.senderName} on Tradebilia`,
    html
  );
}

/**
 * Helper to look up a user's notification preference and email.
 * Returns { email, enabled } or null if no email or preference check fails.
 */
export async function getUserEmailAndPref(
  userId: number,
  prefKey: string,
  channel: 'email' | 'text' = 'email'
): Promise<{ email: string; name: string } | null> {
  // This is called from the router where db is available
  // We keep this as a pure email utility — preference checking happens in the router
  return null; // placeholder — preference checking is done inline in routers
}

/**
 * Notify a user that someone initiated a trade proposal with them.
 */
export async function sendTradeInitiatedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  itemTitle: string;
  tradeRef: string;
}): Promise<boolean> {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">New Trade Proposal from ${escapeEmailHtml(params.senderName)}</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">Someone wants to trade with you on Tradebilia.</p>
    <div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Item</p>
      <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#0a0d22;">${escapeEmailHtml(params.itemTitle)}</p>
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Trade Reference</p>
      <p style="margin:0;font-size:14px;color:#444;">TR-${escapeEmailHtml(params.tradeRef)}</p>
    </div>
    <a href="${SITE_URL}/trade-hub" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">View Trade Proposal</a>
  `);
  return sendEmail(params.recipientEmail, `New trade proposal from ${params.senderName} on Tradebilia`, html);
}

/**
 * Notify a user that a counter proposal was submitted.
 */
export async function sendCounterProposalEmail(params: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  tradeRef: string;
}): Promise<boolean> {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">Counter Proposal from ${escapeEmailHtml(params.senderName)}</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">A counter proposal has been submitted for your trade (TR-${escapeEmailHtml(params.tradeRef)}).</p>
    <a href="${SITE_URL}/trade-hub" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">Review Counter Proposal</a>
  `);
  return sendEmail(params.recipientEmail, `Counter proposal from ${params.senderName} — TR-${params.tradeRef}`, html);
}

/**
 * Notify a user that their trade proposal was accepted.
 */
export async function sendProposalAcceptedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  otherPartyName: string;
  itemTitle: string;
  tradeRef: string;
}): Promise<boolean> {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">🎉 Trade Proposal Accepted!</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${escapeEmailHtml(params.otherPartyName)} accepted your trade proposal for <strong>${escapeEmailHtml(params.itemTitle)}</strong>.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#166534;">Trade Reference: TR-${escapeEmailHtml(params.tradeRef)}</p>
    </div>
    <a href="${SITE_URL}/trade-hub" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">Go to Trade Hub</a>
  `);
  return sendEmail(params.recipientEmail, `Your trade proposal was accepted — TR-${params.tradeRef}`, html);
}

/**
 * Notify a user that their trade proposal was rejected.
 */
export async function sendProposalRejectedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  otherPartyName: string;
  tradeRef: string;
  reason?: string;
}): Promise<boolean> {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">Trade Proposal Declined</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${escapeEmailHtml(params.otherPartyName)} declined your trade proposal (TR-${escapeEmailHtml(params.tradeRef)}).</p>
    ${params.reason ? `<div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;"><p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Reason</p><p style="margin:0;font-size:14px;color:#444;">${escapeEmailTextWithBreaks(params.reason)}</p></div>` : ''}
    <a href="${SITE_URL}/trade-hub" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">Browse Other Items</a>
  `);
  return sendEmail(params.recipientEmail, `Trade proposal declined — TR-${params.tradeRef}`, html);
}

/**
 * Notify a user that items have been shipped.
 */
export async function sendItemsShippedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  tradeRef: string;
  trackingNumber?: string;
}): Promise<boolean> {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">📦 Items Shipped!</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${escapeEmailHtml(params.senderName)} has shipped their items for trade TR-${escapeEmailHtml(params.tradeRef)}.</p>
    ${params.trackingNumber ? `<div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;"><p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Tracking Number</p><p style="margin:0;font-size:15px;font-weight:600;color:#0a0d22;">${escapeEmailHtml(params.trackingNumber)}</p></div>` : ''}
    <a href="${SITE_URL}/trade-hub" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">View Trade Details</a>
  `);
  return sendEmail(params.recipientEmail, `Items shipped for trade TR-${params.tradeRef}`, html);
}

export async function sendShippingDeadlineReminderEmail(params: {
  recipientEmail: string;
  recipientName: string;
  tradeRef: string;
  deadline: string;
  overdue: boolean;
}): Promise<boolean> {
  const heading = params.overdue ? "Shipping Deadline Overdue" : "Shipping Deadline Approaching";
  const detail = params.overdue
    ? `Your tracking information is overdue for trade TR-${escapeEmailHtml(params.tradeRef)}. Please ship your items and add tracking as soon as possible.`
    : `Please ship your items and add tracking for trade TR-${escapeEmailHtml(params.tradeRef)} by ${escapeEmailHtml(params.deadline)}.`;
  const html = emailWrapper(`<h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">${heading}</h2><p style="color:#666;font-size:14px;margin:0 0 24px;">${detail}</p><a href="${SITE_URL}/trade-hub" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">Open Trade Room</a>`);
  return sendEmail(params.recipientEmail, `${heading} — TR-${params.tradeRef}`, html);
}

/**
 * Notify a user that items have been received.
 */
export async function sendItemsReceivedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  otherPartyName: string;
  tradeRef: string;
}): Promise<boolean> {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">✅ Items Received!</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${escapeEmailHtml(params.otherPartyName)} has confirmed receipt of items for trade TR-${escapeEmailHtml(params.tradeRef)}.</p>
    <a href="${SITE_URL}/trade-hub" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">Leave Feedback</a>
  `);
  return sendEmail(params.recipientEmail, `Items received confirmed — TR-${params.tradeRef}`, html);
}

/**
 * Notify a user that they received trade feedback.
 */
export async function sendFeedbackReceivedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  reviewerName: string;
  rating: number;
  tradeRef: string;
}): Promise<boolean> {
  const stars = '★'.repeat(Math.round(params.rating)) + '☆'.repeat(5 - Math.round(params.rating));
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">New Feedback Received</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${escapeEmailHtml(params.reviewerName)} left you feedback for trade TR-${escapeEmailHtml(params.tradeRef)}.</p>
    <div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:28px;color:#f59e0b;letter-spacing:4px;">${stars}</p>
      <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#0a0d22;">${params.rating.toFixed(1)} / 5.0</p>
    </div>
    <a href="${SITE_URL}/profile" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">View Your Profile</a>
  `);
  return sendEmail(params.recipientEmail, `New feedback from ${params.reviewerName} — TR-${params.tradeRef}`, html);
}

/**
 * Notify a user that their trade was cancelled.
 */
export async function sendTradeCancelledEmail(params: {
  recipientEmail: string;
  recipientName: string;
  cancelledByName: string;
  tradeRef: string;
}): Promise<boolean> {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">Trade Cancelled</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${escapeEmailHtml(params.cancelledByName)} has cancelled trade TR-${escapeEmailHtml(params.tradeRef)}.</p>
    <a href="${SITE_URL}/trade-hub" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">Browse Other Items</a>
  `);
  return sendEmail(params.recipientEmail, `Trade cancelled — TR-${params.tradeRef}`, html);
}

/**
 * Notify a user that they received a reply to a direct message thread.
 */
export async function sendDirectMessageReplyEmail(params: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  bodyPreview: string;
}): Promise<boolean> {
  const preview = params.bodyPreview.length > 200
    ? params.bodyPreview.slice(0, 200) + "..."
    : params.bodyPreview;

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">${escapeEmailHtml(params.senderName)} replied to your message</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">You have a new reply in your Tradebilia inbox.</p>

    <div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Reply</p>
      <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">${escapeEmailTextWithBreaks(preview)}</p>
    </div>

    <a href="${SITE_URL}/messages" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">View Conversation</a>
  `);

  return sendEmail(
    params.recipientEmail,
    `${params.senderName} replied to your message on Tradebilia`,
    html
  );
}

export async function sendReferralInviteEmail(params: {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  // Convert plain text body to HTML (preserve line breaks)
  // Replace {{name}} placeholder with recipient's first name
  const firstName = params.recipientName.split(' ')[0];
  const bodyWithName = params.body.replace(/\{\{name\}\}/g, firstName);
  
  const bodyHtml = escapeEmailTextWithBreaks(bodyWithName);

  // Use a dedicated wrapper with the official Tradebilia logo image
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#0a0d22;padding:24px 16px;text-align:center;">
          <img
            src="https://assets.tradebilia.com/tradebilia_final_transparent_58812c5a.svg"
            alt="Tradebilia"
            width="520"
            style="display:block;margin:0 auto;width:100%;max-width:520px;height:auto;"
          />
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">${bodyHtml}</p>
          <a href="${SITE_URL}" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;margin-top:8px;">Visit Tradebilia</a>
        </td></tr>
        <tr><td style="background:#f8f8f6;padding:20px 32px;text-align:center;border-top:1px solid #ebebeb;">
          <p style="color:#999;font-size:12px;margin:0 0 8px;">You're receiving this because you were referred to <a href="${SITE_URL}" style="color:#7f31ff;text-decoration:none;">Tradebilia</a>.</p>
          <p style="color:#999;font-size:11px;margin:0;">If you believe this was sent in error, please disregard this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail(params.recipientEmail, params.subject, html);
}
