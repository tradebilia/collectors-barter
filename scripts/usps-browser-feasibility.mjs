#!/usr/bin/env node

import { spawn } from "node:child_process";

const trackingNumber = process.argv[2]?.trim();
const timeoutMs = Number(process.env.USPS_BROWSER_TIMEOUT_MS ?? 30_000);

if (!trackingNumber) {
  console.error("Usage: node scripts/usps-browser-feasibility.mjs <tracking-number>");
  process.exitCode = 2;
  process.exit();
}

if (!/^[A-Za-z0-9\s-]{4,40}$/.test(trackingNumber)) {
  console.error("Tracking number contains unsupported characters.");
  process.exitCode = 2;
  process.exit();
}

const url = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
const args = [
  "--headless=new",
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--hide-scrollbars",
  "--virtual-time-budget=12000",
  "--dump-dom",
  url,
];

const child = spawn("/usr/bin/chromium", args, { stdio: ["ignore", "pipe", "pipe"] });
let stdout = "";
let stderr = "";
let settled = false;

const finish = (result) => {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  child.kill("SIGKILL");
  const safeResult = {
    ...result,
    trackingNumber,
    url,
    persisted: false,
    databaseChanged: false,
    bypassAttempted: false,
    stderr: stderr.slice(-500),
  };
  console.log(JSON.stringify(safeResult, null, 2));
  process.exitCode = result.category === "normal_result" ? 0 : 1;
};

const timer = setTimeout(() => {
  finish({ category: "timeout", confidence: "high", evidence: "Chromium did not return a DOM before the read-only timeout." });
}, timeoutMs);

child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
  if (stdout.length > 4_000_000) stdout = stdout.slice(-4_000_000);
});
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});
child.on("error", (error) => {
  finish({ category: "unavailable", confidence: "high", evidence: `Chromium could not start: ${error.message}` });
});
child.on("close", () => {
  const text = stdout.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const title = (stdout.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();

  if (/captcha|verify you are human|access denied|request blocked|unusual traffic|robot/i.test(lower)) {
    finish({ category: "challenge_or_block", confidence: "high", title, evidence: text.slice(0, 1_000) });
    return;
  }
  if (/tracking not available|label created, not yet in system|pre-shipment/i.test(lower)) {
    finish({ category: "normal_result", confidence: "medium", title, evidence: text.slice(0, 1_000) });
    return;
  }
  if (/usps tracking|track your package|tracking results/i.test(lower)) {
    finish({ category: "normal_result", confidence: "low", title, evidence: text.slice(0, 1_000) });
    return;
  }
  finish({ category: "unavailable", confidence: "medium", title, evidence: text.slice(0, 1_000) });
});
