import { describe, expect, it } from "vitest";
import { isMissingTradePaymentsTableError } from "./paymentAdminCompatibility";

describe("admin external cash compatibility", () => {
  it("recognizes the legacy database's missing tradePayments table", () => {
    expect(isMissingTradePaymentsTableError({ code: "ER_NO_SUCH_TABLE", errno: 1146, message: "Table 'tradePayments' doesn't exist" })).toBe(true);
    expect(isMissingTradePaymentsTableError(new Error("Table 'tradePayments' doesn't exist"))).toBe(true);
  });

  it("does not hide unrelated payment query failures", () => {
    expect(isMissingTradePaymentsTableError({ code: "ER_BAD_FIELD_ERROR", errno: 1054, message: "Unknown column 'tp.updatedAt'" })).toBe(false);
    expect(isMissingTradePaymentsTableError(new Error("Connection lost"))).toBe(false);
  });
});
