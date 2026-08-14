const trackingNumber = process.env.USPS_DEBUG_TRACKING_NUMBER;
const clientId = process.env.USPS_CONSUMER_KEY;
const clientSecret = process.env.USPS_CONSUMER_SECRET;

if (!trackingNumber || !clientId || !clientSecret) {
  throw new Error("USPS diagnostic prerequisites are not available.");
}

const tokenResponse = await fetch("https://apis.usps.com/oauth2/v3/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
});
const tokenPayload = await tokenResponse.json().catch(() => null);
if (!tokenResponse.ok || !tokenPayload?.access_token) {
  console.log(JSON.stringify({ tokenStatus: tokenResponse.status, tokenIssued: false }));
  process.exit(1);
}

const trackingResponse = await fetch("https://apis.usps.com/tracking/v3r2/tracking", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${tokenPayload.access_token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify([{ trackingNumber }]),
});
const payload = await trackingResponse.json().catch(() => null);
const first = Array.isArray(payload) ? payload[0] : payload;
const errorEntries = Array.isArray(first?.errors) ? first.errors : Array.isArray(payload?.errors) ? payload.errors : [];
const topLevelError = payload?.error && typeof payload.error === "object"
  ? Object.fromEntries(Object.entries(payload.error).map(([key, value]) => [key, typeof value === "string" ? value.replaceAll(trackingNumber, "[tracking-number]") : value]))
  : payload?.error ?? null;

console.log(JSON.stringify({
  trackingStatus: trackingResponse.status,
  responseType: Array.isArray(payload) ? "array" : typeof payload,
  topLevelKeys: payload && !Array.isArray(payload) ? Object.keys(payload) : [],
  firstEntryKeys: first && typeof first === "object" ? Object.keys(first) : [],
  errorCodes: errorEntries.map((entry) => entry?.code ?? entry?.errorCode ?? entry?.status).filter(Boolean),
  errorLabels: errorEntries.map((entry) => entry?.message ?? entry?.errorDescription ?? entry?.title).filter(Boolean).map((value) => String(value).replaceAll(trackingNumber, "[tracking-number]")),
  topLevelError,
}));
