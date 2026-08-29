import { describe, expect, it } from "vitest";
import { formatItemValue, formatWholeDollar } from "./tradebilia";

describe("item value formatting", () => {
  it("rounds item values to whole dollars and clamps sub-dollar listings to $1", () => {
    expect(formatItemValue(0.25)).toBe("$1");
    expect(formatItemValue("0.99")).toBe("$1");
    expect(formatItemValue(1250.49)).toBe("$1,250");
    expect(formatItemValue(1250.5)).toBe("$1,251");
  });

  it("keeps aggregate zero values at $0 instead of applying the item floor", () => {
    expect(formatWholeDollar(0)).toBe("$0");
    expect(formatWholeDollar(0.25)).toBe("$0");
    expect(formatWholeDollar(1250.49)).toBe("$1,250");
  });

  it("preserves explicit fallbacks for missing values", () => {
    expect(formatItemValue(null)).toBe("N/A");
    expect(formatItemValue(undefined, "$0")).toBe("$0");
  });
});

it("declares the Trade Value field minimum as $1", async () => {
  const { COMMON_FIELDS } = await import("./formFieldDefinitions");
  expect(COMMON_FIELDS.TRADE_VALUE_FIELD.validation?.min).toBe(1);
});
