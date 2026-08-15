import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("production static-server runtime compatibility", () => {
  it("uses the portable fileURLToPath module-directory resolver", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "server/_core/vite.ts"),
      "utf8"
    );

    expect(source).toContain('fileURLToPath(import.meta.url)');
    expect(source).not.toContain("import.meta.dirname");
  });
});
