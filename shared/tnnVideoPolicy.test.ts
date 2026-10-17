import { describe, expect, it } from "vitest";
import {
  TNN_NETWORK_SPOKEN_NAME,
  TNN_REQUIRED_CLOSING,
  TNN_TRADEBILIA_PRONUNCIATION,
  TNN_VIDEO_DURATION_SECONDS,
  TNN_WEBSITE_TICKER,
  formatTnnGrade,
} from "./tnnVideoPolicy";

describe("TNN video render policy", () => {
  it("locks the approved length, network wording, phonetic guide, closing, and website ticker", () => {
    expect(TNN_VIDEO_DURATION_SECONDS).toBe(45);
    expect(TNN_WEBSITE_TICKER).toBe("WWW.Tradebilia.com");
    expect(TNN_NETWORK_SPOKEN_NAME).toBe("the TNN Network");
    expect(TNN_TRADEBILIA_PRONUNCIATION).toBe("trade-bil-lee-uh");
    expect(TNN_REQUIRED_CLOSING).toBe("Tradebilia.");
  });

  it("removes only redundant trailing zeros from numeric PSA grades", () => {
    expect(formatTnnGrade("PSA", null, "10.00")).toBe("PSA 10");
    expect(formatTnnGrade("PSA", null, "9.0")).toBe("PSA 9");
    expect(formatTnnGrade("PSA", null, "7.5")).toBe("PSA 7.5");
    expect(formatTnnGrade("WATA", null, "9.0 A")).toBe("WATA 9.0 A");
  });
});
