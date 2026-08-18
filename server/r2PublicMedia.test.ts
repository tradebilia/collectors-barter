import { describe, expect, it } from "vitest";
import {
  buildMigratedPublicMediaKey,
  buildNewPublicMediaKey,
  buildR2PublicMediaUrl,
  getLegacyMediaUrl,
  getR2PublicMediaConfig,
  isLegacyManagedMediaUrl,
  isR2PublicMediaUrl,
  MAX_NEW_R2_PUBLIC_MEDIA_BYTES,
  validateR2PublicMediaUpload,
} from "./r2PublicMedia";

describe("R2 public-media helpers", () => {
  it("uses only an HTTPS Cloudflare R2 endpoint and requires all S3 credentials", () => {
    expect(getR2PublicMediaConfig({
      R2_ACCESS_KEY_ID: "access",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com/",
    })).toEqual({
      accessKeyId: "access",
      secretAccessKey: "secret",
      endpoint: "https://account.r2.cloudflarestorage.com",
    });
    expect(() => getR2PublicMediaConfig({
      R2_ACCESS_KEY_ID: "access",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_ENDPOINT: "http://example.com",
    })).toThrow("R2_ENDPOINT");
  });

  it("builds encoded durable media URLs and recognizes legacy managed-storage paths", () => {
    expect(buildR2PublicMediaUrl("new/listings/1/hello world.png")).toBe(
      "https://media.tradebilia.com/new/listings/1/hello%20world.png",
    );
    expect(isR2PublicMediaUrl("https://media.tradebilia.com/new/listings/1/x.jpg")).toBe(true);
    expect(isLegacyManagedMediaUrl("/manus-storage/listings/1/x.jpg")).toBe(true);
    expect(getLegacyMediaUrl("/manus-storage/listings/1/x.jpg")).toBe(
      "https://tradebilia.manus.space/manus-storage/listings/1/x.jpg",
    );
  });

  it("uses distinct new keys and deterministic migration keys while preserving the legacy filename", () => {
    const first = buildNewPublicMediaKey("listing", 7, "My Card #1.jpg");
    const second = buildNewPublicMediaKey("listing", 7, "My Card #1.jpg");
    expect(first).not.toBe(second);
    expect(first).toMatch(/^new\/listings\/7\//);
    expect(buildMigratedPublicMediaKey("avatar", 42, "avatars/42/my photo.png")).toBe(
      "legacy/avatars/42/my-photo.png",
    );
  });

  it("rejects empty, oversized, and MIME-spoofed new public-media uploads before any R2 request", () => {
    expect(() => validateR2PublicMediaUpload({ kind: "listing", contentType: "image/png", data: Buffer.alloc(0) }))
      .toThrow("cannot be empty");
    expect(() => validateR2PublicMediaUpload({ kind: "avatar", contentType: "image/jpeg", data: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }))
      .toThrow("do not match");
    expect(() => validateR2PublicMediaUpload({
      kind: "avatar",
      contentType: "image/jpeg",
      data: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(MAX_NEW_R2_PUBLIC_MEDIA_BYTES.avatar)]),
    })).toThrow("5MB limit");
  });

  it("accepts a correctly typed, bounded image signature", () => {
    const result = validateR2PublicMediaUpload({
      kind: "listing",
      contentType: "image/png; charset=binary",
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    });
    expect(result.contentType).toBe("image/png");
    expect(result.data).toHaveLength(8);
  });
});
