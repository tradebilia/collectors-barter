import { describe, expect, it } from "vitest";
import { MAX_PUBLIC_MEDIA_BASE64_CHARS, uploadedImageSchema } from "./routers";

describe("public R2 upload request limits", () => {
  it("rejects an oversized base64 image payload before upload code can decode or store it", () => {
    const result = uploadedImageSchema.safeParse({
      name: "oversized.jpg",
      type: "image/jpeg",
      contentBase64: "a".repeat(MAX_PUBLIC_MEDIA_BASE64_CHARS + 1),
    });

    expect(result.success).toBe(false);
  });
});
