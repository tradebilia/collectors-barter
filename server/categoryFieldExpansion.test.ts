import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const categoryPageSource = readFileSync(join(process.cwd(), "client/src/pages/CategoryPage.tsx"), "utf-8");
const routerSource = readFileSync(join(process.cwd(), "server/routers.ts"), "utf-8");
const databaseSource = readFileSync(join(process.cwd(), "server/db.ts"), "utf-8");

const approvedFields = [
  ["Publisher", "publisher"],
  ["Brand", "brand"],
  ["Scott Number", "scottNumber"],
  ["Mint / Used", "mintOrUsed"],
  ["Stamp Grade", "stampGrade"],
  ["Edition / Era", "editionEra"],
  ["Finish / Variant", "finishVariant"],
  ["Signer", "signer"],
] as const;

describe("approved Category Page field expansion", () => {
  it("renders every approved high-value field through the explicit submitted filter workflow", () => {
    for (const [label, key] of approvedFields) {
      expect(categoryPageSource).toContain(`filter.label === "${label}"`);
      expect(categoryPageSource).toContain(`add("${key}", submittedFilters.${key})`);
      expect(categoryPageSource).toContain(`${key}: ${key} || undefined`);
    }
    expect(categoryPageSource).toContain('onKeyDown={(e) => e.key === "Enter" && handleSubmitFilters()}');
  });

  it("accepts and applies every approved field on the typed server contract", () => {
    for (const [, key] of approvedFields) {
      expect(routerSource).toContain(`${key}: z.string()`);
      expect(databaseSource).toContain(`filters.${key}?.trim()`);
    }
  });

  it("keeps the mobile layout unchanged while making grades suitable for collectible formats", () => {
    expect(categoryPageSource).toContain('type="text"');
    expect(categoryPageSource).toContain('grid gap-3 grid-cols-6');
  });
});
