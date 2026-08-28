import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const publicProfileSource = readFileSync(join(process.cwd(), "client", "src", "pages", "PublicProfile.tsx"), "utf8");

describe("public LinkedIn profile image resilience", () => {
  it("uses a dedicated fallback instead of leaving a provider-hosted image broken", () => {
    expect(publicProfileSource).toContain("function LinkedInProfileImage");
    expect(publicProfileSource).toContain("onError={() => setFailedPictureUrl(pictureUrl!)}");
    expect(publicProfileSource).toContain("profile image unavailable");
    expect(publicProfileSource).toContain('referrerPolicy="no-referrer"');
  });

  it("renders the fallback-capable image component in the connected LinkedIn card", () => {
    expect(publicProfileSource).toContain('<LinkedInProfileImage pictureUrl={user.linkedinPicture} name={user.linkedinName} />');
    expect(publicProfileSource).not.toContain('<img src={user.linkedinPicture}');
  });
});
