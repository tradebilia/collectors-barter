import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatTradeContactPhone } from "../client/src/lib/tradePrint";

const printViewSource = readFileSync(resolve(process.cwd(), "client/src/pages/TradePrintView.tsx"), "utf8");

describe("printable trade confirmation", () => {
  it("uses display names rather than public @usernames", () => {
    expect(printViewSource).toContain("Display Name: {displayName}");
    expect(printViewSource).not.toContain("@(contact as any).username");
    expect(printViewSource).not.toContain("tradebilia_final_transparent_8a1981e6.svg");
  });

  it("formats North American phones while preserving other formats", () => {
    expect(formatTradeContactPhone("6315550199")).toBe("(631) 555-0199");
    expect(formatTradeContactPhone("1-631-555-0199")).toBe("+1 (631) 555-0199");
    expect(formatTradeContactPhone("+44 20 7946 0958")).toBe("+44 20 7946 0958");
  });

  it("centers the exchange arrow across both trade sides", () => {
    expect(printViewSource).toContain("flex self-stretch items-center justify-center shrink-0 px-2");
    expect(printViewSource).not.toContain("justify-center pt-8 shrink-0 px-2");
  });

  it("shows the agreed payment method for cash while excluding private destinations", () => {
    expect(printViewSource).toContain("trpc.payment.getCashAdjustmentContext.useQuery");
    expect(printViewSource).toContain("Cash PAID via {formatSelectedPaymentMethod(myCashPaymentMethod)}");
    expect(printViewSource).toContain("Cash PAID via {formatSelectedPaymentMethod(theirCashPaymentMethod)}");
    expect(printViewSource).not.toContain("paymentIdentifier}");
    expect(printViewSource).not.toContain("Send to:");
  });
});
