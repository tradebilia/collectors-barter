import { describe, expect, it } from "vitest";
import { formatPublicBooleanValue } from "../shared/publicBooleanValues";

describe("public boolean value formatting", () => {
  it("renders boolean text in consistent title case without changing ordinary values", () => {
    expect(formatPublicBooleanValue("yes")).toBe("Yes");
    expect(formatPublicBooleanValue("YES")).toBe("Yes");
    expect(formatPublicBooleanValue("true")).toBe("Yes");
    expect(formatPublicBooleanValue("no")).toBe("No");
    expect(formatPublicBooleanValue("FALSE")).toBe("No");
    expect(formatPublicBooleanValue("O-Pee-Chee")).toBe("O-Pee-Chee");
    expect(formatPublicBooleanValue("Todd McFarlane")).toBe("Todd McFarlane");
  });
});
