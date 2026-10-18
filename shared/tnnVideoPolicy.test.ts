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

  it("removes redundant trailing zeros from purely numeric grades across grading companies", () => {
    expect(formatTnnGrade("PSA", null, "10.00")).toBe("PSA 10");
    expect(formatTnnGrade("PSA", null, "9.0")).toBe("PSA 9");
    expect(formatTnnGrade("PSA", null, "7.5")).toBe("PSA 7.5");
    expect(formatTnnGrade("AFA", null, "80.00")).toBe("AFA 80");
    expect(formatTnnGrade("WATA", null, "9.6")).toBe("WATA 9.6");
    expect(formatTnnGrade(null, "Custom Grader", "8.50")).toBe("Custom Grader 8.5");
    expect(formatTnnGrade("WATA", null, "9.0 A")).toBe("WATA 9.0 A");
  });
});
