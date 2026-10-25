const OAUTH = "https://onlinetools.ups.com/security/v1/oauth/token";
const TRACK = "https://onlinetools.ups.com/api/track/v1/details";
let token = null;
let expires = 0;

function out(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

async function getToken(env) {
  const now = Date.now();
  if (token && expires > now + 60000) return token;

  const values = await Promise.all([
    env.UPS_CLIENT_ID.get(),
    env.UPS_CLIENT_SECRET.get()
  ]);
  const clientId = values[0];
  const clientSecret = values[1];
  if (!clientId || !clientSecret) {
    throw new Error("UPS credentials are not configured in Cloudflare Secrets Store.");
  }

  const basic = btoa(clientId + ":" + clientSecret);
  const response = await fetch(OAUTH, {
    method: "POST",
    headers: {
      Authorization: "Basic " + basic,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const payload = await response.json().catch(function () { return null; });
  if (!response.ok || !payload || !payload.access_token) {
    throw new Error("UPS OAuth authentication failed.");
  }

  token = payload.access_token;
  expires = now + Math.max(Number(payload.expires_in || 300) - 60, 60) * 1000;
  return token;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return out({ cloudflareConnection: "successful", upsTrackingProxy: "ready" });
    }

    if (request.method !== "GET" || url.pathname.indexOf("/ups/track/") !== 0) {
      return out({ error: "Not found" }, 404);
    }

    const trackingNumber = decodeURIComponent(url.pathname.slice(11));
    if (!/^[A-Za-z0-9]{7,34}$/.test(trackingNumber)) {
      return out({ error: "Invalid tracking number" }, 400);
    }

    try {
      const accessToken = await getToken(env);
      const upsUrl = new URL(TRACK + "/" + encodeURIComponent(trackingNumber));
      upsUrl.searchParams.set("locale", "en_US");
      upsUrl.searchParams.set("returnSignature", "false");
      upsUrl.searchParams.set("returnMilestones", "false");
      upsUrl.searchParams.set("returnPOD", "false");

      const response = await fetch(upsUrl, {
        headers: {
          Authorization: "Bearer " + accessToken,
          transId: crypto.randomUUID(),
          transactionSrc: "tradebilia",
          Accept: "application/json"
        }
      });
      return new Response(await response.text(), {
        status: response.status,
        headers: {
          "content-type": response.headers.get("content-type") || "application/json",
          "cache-control": "no-store"
        }
      });
    } catch (error) {
      console.error("UPS proxy request failed", error instanceof Error ? error.message : "unknown error");
      return out({ error: "UPS tracking is temporarily unavailable." }, 502);
    }
  }
};
