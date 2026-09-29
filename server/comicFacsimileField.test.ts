import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const definitions = readFileSync(new URL("../client/src/lib/fieldDefinitionsGenerated.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("../client/src/lib/layoutConfigs/layouts/comics_single_comic.ts", import.meta.url), "utf8");

describe("single-comic Facsimile field", () => {
  it("defines Facsimile as a recommended Yes/No dropdown defaulting to No", () => {
    const fieldStart = definitions.indexOf("name: 'facsimile'");
    expect(fieldStart).toBeGreaterThan(-1);
    const field = definitions.slice(fieldStart, definitions.indexOf("  },", fieldStart) + 4);
    expect(field).toContain("label: 'Facsimile'");
    expect(field).toContain("inputType: 'dropdown'");
    expect(field).toContain("requirement: 'recommended'");
    expect(field).toContain("defaultValue: 'No'");
    expect(field).toContain("dropdownOptions: ['Yes', 'No']");
  });

  it("places Facsimile in the single-comic Recommended Fields layout", () => {
    expect(layout).toContain("facsimile: { colSpan: 'half', position: 6 }");
  });

  it("defines Distribution Type as a required Direct/Newsstand dropdown", () => {
    const fieldStart = definitions.indexOf("name: 'distributionType'");
    expect(fieldStart).toBeGreaterThan(-1);
    const field = definitions.slice(fieldStart, definitions.indexOf("  },", fieldStart) + 4);
    expect(field).toContain("label: 'Distribution Type'");
    expect(field).toContain("inputType: 'dropdown'");
    expect(field).toContain("requirement: 'required'");
    expect(field).toContain("defaultValue: 'Direct'");
    expect(field).toContain("dropdownOptions: ['Direct', 'Newsstand']");
  });

  it("places Distribution Type in the single-comic Required Fields layout", () => {
    expect(layout).toContain("distributionType: { colSpan: 'half', position: 6 }");
  });
});
