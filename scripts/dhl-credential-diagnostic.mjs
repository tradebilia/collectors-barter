const apiKey = process.env.DHL_API_KEY;
const apiSecret = process.env.DHL_API_SECRET;

if (!apiKey || !apiSecret) {
  console.log(JSON.stringify({ configured: false }));
  process.exit(0);
}

const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
const requests = [
  {
    name: "mydhl_production",
    url: "https://express.api.dhl.com/mydhlapi/shipments/0000000000/tracking?service=express",
    headers: { Authorization: `Basic ${basicAuth}`, Accept: "application/json" },
  },
  {
    name: "mydhl_test",
    url: "https://express.api.dhl.com/mydhlapi/test/shipments/0000000000/tracking?service=express",
    headers: { Authorization: `Basic ${basicAuth}`, Accept: "application/json" },
  },
  {
    name: "unified_tracking",
    url: "https://api-eu.dhl.com/track/shipments?trackingNumber=0000000000",
    headers: { "DHL-API-Key": apiKey, Accept: "application/json" },
  },
];

const results = [];
for (const request of requests) {
  try {
    const response = await fetch(request.url, { headers: request.headers, signal: AbortSignal.timeout(15_000) });
    results.push({ name: request.name, status: response.status });
  } catch {
    results.push({ name: request.name, status: "network_error" });
  }
}

console.log(JSON.stringify({ configured: true, results }));
