const clientId = process.env.UPS_CLIENT_ID;
const clientSecret = process.env.UPS_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error("UPS credentials are not configured.");
}

const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
const tokenResponse = await fetch("https://wwwcie.ups.com/security/v1/oauth/token", {
  method: "POST",
  headers: {
    Authorization: `Basic ${basicAuth}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: "grant_type=client_credentials",
  signal: AbortSignal.timeout(15_000),
});
const tokenPayload = await tokenResponse.json().catch(() => null);

if (!tokenResponse.ok || typeof tokenPayload?.access_token !== "string") {
  console.log(JSON.stringify({ oauth_authenticated: false, cie_tracking_checked: false }));
  process.exitCode = 1;
} else {
  const trackResponse = await fetch(
    "https://wwwcie.ups.com/api/track/v1/details/1ZCIETST0111111114?locale=en_US&returnSignature=false&returnMilestones=false&returnPOD=false",
    {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        transId: crypto.randomUUID(),
        transactionSrc: "tradebilia-cie-validation",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    },
  );
  const trackPayload = await trackResponse.json().catch(() => null);
  const errorCode = trackPayload?.response?.errors?.[0]?.code ?? null;
  const hasShipment = Array.isArray(trackPayload?.trackResponse?.shipment);

  console.log(JSON.stringify({
    oauth_authenticated: true,
    cie_track_status: trackResponse.status,
    cie_track_response_shape: hasShipment ? "shipment" : errorCode ? "api_error" : "unknown",
    cie_track_error_code: errorCode,
  }));

  if (![200, 404].includes(trackResponse.status)) {
    process.exitCode = 1;
  }
}
