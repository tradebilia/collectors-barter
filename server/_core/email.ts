/**
 * Tradebilia Email Service (powered by Resend)
 * Sends transactional emails to users for key events.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = "Tradebilia <noreply@tradebilia.com>";
const SITE_URL = "https://tradebilia.manus.space";
const EMAIL_LOGO_URL = `${SITE_URL}/manus-storage/tradebilia_final_transparent_8a1981e6.svg`;
import { isStagingSafetyEnabled, stagingSafetyReason } from "./stagingSafety";

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (isStagingSafetyEnabled()) {
    console.warn(`[Email] ${stagingSafetyReason("Email delivery")}`);
    return false;
  }
  if (!RESEND_API_KEY) {
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
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[Email] Resend error ${res.status}: ${detail}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send email:", err);
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
            src="${EMAIL_LOGO_URL}"
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
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">New message from ${params.senderName}</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">You have a new direct message on Tradebilia.</p>

    <div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Subject</p>
      <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#0a0d22;">${params.subject}</p>
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Message</p>
      <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">${preview}</p>
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
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">New Trade Proposal from ${params.senderName}</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">Someone wants to trade with you on Tradebilia.</p>
    <div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Item</p>
      <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#0a0d22;">${params.itemTitle}</p>
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Trade Reference</p>
      <p style="margin:0;font-size:14px;color:#444;">TR-${params.tradeRef}</p>
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
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">Counter Proposal from ${params.senderName}</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">A counter proposal has been submitted for your trade (TR-${params.tradeRef}).</p>
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
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${params.otherPartyName} accepted your trade proposal for <strong>${params.itemTitle}</strong>.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#166534;">Trade Reference: TR-${params.tradeRef}</p>
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
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${params.otherPartyName} declined your trade proposal (TR-${params.tradeRef}).</p>
    ${params.reason ? `<div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;"><p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Reason</p><p style="margin:0;font-size:14px;color:#444;">${params.reason}</p></div>` : ''}
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
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${params.senderName} has shipped their items for trade TR-${params.tradeRef}.</p>
    ${params.trackingNumber ? `<div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;"><p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Tracking Number</p><p style="margin:0;font-size:15px;font-weight:600;color:#0a0d22;">${params.trackingNumber}</p></div>` : ''}
    <a href="${SITE_URL}/trade-hub" style="display:inline-block;background:#7f31ff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:14px;">View Trade Details</a>
  `);
  return sendEmail(params.recipientEmail, `Items shipped for trade TR-${params.tradeRef}`, html);
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
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${params.otherPartyName} has confirmed receipt of items for trade TR-${params.tradeRef}.</p>
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
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${params.reviewerName} left you feedback for trade TR-${params.tradeRef}.</p>
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
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${params.cancelledByName} has cancelled trade TR-${params.tradeRef}.</p>
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
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a0d22;">${params.senderName} replied to your message</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">You have a new reply in your Tradebilia inbox.</p>

    <div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Reply</p>
      <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">${preview}</p>
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
  
  const bodyHtml = bodyWithName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

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
            src="${EMAIL_LOGO_URL}"
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
