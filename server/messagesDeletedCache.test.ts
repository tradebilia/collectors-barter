import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../client/src/pages/Messages.tsx", import.meta.url),
  "utf8",
);

describe("Messages deleted inquiry refresh", () => {
  it("always refreshes deleted inquiries from the server when mounted or focused", () => {
    expect(source).toContain('refetchOnMount: "always"');
    expect(source).toContain('refetchOnWindowFocus: "always"');
    expect(source).toContain("staleTime: 0");
  });

  it("invalidates the deleted-inquiry query when the Deleted folder is selected", () => {
    expect(source).toContain('if (nextFolder === "deleted")');
    expect(source).toContain("void utils.market.getDeleted.invalidate()");
    expect(source).toContain("onClick={() => handleFolderChange(item.value)}");
  });
});
