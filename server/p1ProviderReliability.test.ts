import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const apiHealth = vi.hoisted(() => ({
  recordApiFailure: vi.fn(async () => undefined),
  classifyApiFailure: vi.fn(() => "timeout"),
}));

vi.mock("./apiHealth", () => apiHealth);
vi.mock("./_core/stagingSafety", () => ({
  isStagingSafetyEnabled: () => false,
  stagingSafetyReason: (feature: string) => `${feature} is disabled for staging safety.`,
}));

import { sendAccountEmailVerificationCode } from "./_core/email";
import { sendVerificationCode } from "./twilio";
import { lookupPcgsCertification } from "./pcgsMarketData";

const originalFetch = global.fetch;
const projectRoot = path.resolve(import.meta.dirname, "..");
const startupSource = readFileSync(path.join(projectRoot, "server/_core/startupChecks.ts"), "utf8");
const serverSource = readFileSync(path.join(projectRoot, "server/_core/index.ts"), "utf8");

afterEach(() => {
  global.fetch = originalFetch;
  apiHealth.recordApiFailure.mockClear();
  apiHealth.classifyApiFailure.mockClear();
  apiHealth.classifyApiFailure.mockReturnValue("timeout");
});

describe("second deep-audit P1 provider reliability", () => {
  it("bounds Resend transport failures and records a sanitized temporary-failure event", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("request timed out"));
    global.fetch = fetchMock as typeof fetch;

    const sent = await sendAccountEmailVerificationCode({ recipientEmail: "member@example.test", code: "123456" });

    expect(sent).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(apiHealth.recordApiFailure).toHaveBeenCalledWith(expect.objectContaining({
      provider: "Resend",
      operation: "transactional_email",
      failureClass: "timeout",
      safeMessage: "Transactional email provider is temporarily unavailable.",
    }));
  });

  it("bounds Twilio verification transport failures without exposing a phone number", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("request timed out"));
    global.fetch = fetchMock as typeof fetch;

    const result = await sendVerificationCode("+15551234567");

    expect(result).toEqual({ ok: false, error: "SMS verification is temporarily unavailable. Please try again shortly." });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/Verifications"),
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(apiHealth.recordApiFailure).toHaveBeenCalledWith(expect.objectContaining({
      provider: "Twilio Verify",
      operation: "send_verification",
      failureClass: "timeout",
      safeMessage: "SMS verification provider is temporarily unavailable.",
    }));
  });

  it("bounds PCGS lookup transport and classifies a provider HTTP rejection", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => null });
    global.fetch = fetchMock as typeof fetch;
    apiHealth.classifyApiFailure.mockReturnValueOnce("upstream");

    const result = await lookupPcgsCertification("25651776", { PCGS_API_TOKEN: "configured-token" });

    expect(result).toMatchObject({ status: "error", message: "PCGS credentials are not authorized or the PCGS service is temporarily unavailable." });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("GetCoinFactsByCertNo/25651776"),
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(apiHealth.recordApiFailure).toHaveBeenCalledWith(expect.objectContaining({
      provider: "PCGS",
      operation: "certification_lookup",
      failureClass: "upstream",
      statusCode: 503,
    }));
  });

  it("returns a safe temporary-unavailable result when PCGS transport times out", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("request timed out"));
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupPcgsCertification("25651776", { PCGS_API_TOKEN: "configured-token" });

    expect(result).toMatchObject({ status: "error", message: "PCGS lookup could not be reached. Try again shortly." });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("GetCoinFactsByCertNo/25651776"),
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(apiHealth.recordApiFailure).toHaveBeenCalledWith(expect.objectContaining({
      provider: "PCGS",
      operation: "certification_lookup",
      failureClass: "timeout",
      safeMessage: "PCGS certification lookup is temporarily unavailable.",
    }));
  });

  it("validates the explicit database target before opening the network listener while installing shutdown safety early", () => {
    expect(startupSource).toContain("resolveTradebiliaDatabaseTarget(env)");
    expect(startupSource).toContain("The selected Tradebilia database target is not valid");
    expect(startupSource).not.toContain('"RESEND_API_KEY"');
    expect(startupSource).not.toContain('"TWILIO_ACCOUNT_SID"');
    const environmentCheck = serverSource.indexOf("validateEnvironment();");
    const databaseCheck = serverSource.indexOf("await validateDatabaseConnection();");
    const expressConstruction = serverSource.indexOf("const app = express();");
    const shutdownHandlers = serverSource.indexOf("installGracefulShutdownHandlers(server);");
    const listenerOpen = serverSource.lastIndexOf("server.listen(port");
    expect(environmentCheck).toBeGreaterThan(-1);
    expect(databaseCheck).toBeGreaterThan(environmentCheck);
    expect(expressConstruction).toBeGreaterThan(-1);
    expect(shutdownHandlers).toBeGreaterThan(expressConstruction);
    expect(listenerOpen).toBeGreaterThan(databaseCheck);
  });
});
