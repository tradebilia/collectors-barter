import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeToLaunchUpdates } from "./launchUpdates";

describe("Coming Soon launch updates", () => {
  const originalKey = process.env.RESEND_CONTACTS_API_KEY;

  afterEach(() => {
    process.env.RESEND_CONTACTS_API_KEY = originalKey;
  });

  it("creates an opted-in contact with a normalized email and no outbound email request", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "contact-id" }), { status: 201 }));

    const result = await subscribeToLaunchUpdates("  Collector@Example.com ", fetcher);

    expect(result).toEqual({ accepted: true, alreadySubscribed: false });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.resend.com/contacts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "collector@example.com",
          unsubscribed: false,
          properties: {
            signup_source: "coming_soon",
            signup_interest: "launch_updates",
          },
        }),
      }),
    );
    expect(fetcher.mock.calls[0]?.[0]).not.toContain("/emails");
  });

  it("returns a privacy-safe success response for an existing contact", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 409 }));

    await expect(subscribeToLaunchUpdates("collector@example.com", fetcher)).resolves.toEqual({
      accepted: true,
      alreadySubscribed: true,
    });
  });
});
