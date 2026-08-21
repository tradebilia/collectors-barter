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

  it("returns the same privacy-safe success response for Resend's duplicate-contact validation response", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "The contact already exists." }), { status: 422 }));

    await expect(subscribeToLaunchUpdates("collector@example.com", fetcher)).resolves.toEqual({
      accepted: true,
      alreadySubscribed: true,
    });
  });

  it("retries one metadata-rejected contact creation without optional properties", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Custom properties are not accepted." }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "contact-id" }), { status: 201 }));

    await expect(subscribeToLaunchUpdates("collector@example.com", fetcher)).resolves.toEqual({
      accepted: true,
      alreadySubscribed: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      body: JSON.stringify({ email: "collector@example.com", unsubscribed: false }),
    }));
  });

  it("uses the authenticated account's existing audience only after metadata and minimal contact writes both fail", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Custom properties are not accepted." }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Audience required." }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "audience-id" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "contact-id" }), { status: 201 }));

    await expect(subscribeToLaunchUpdates("collector@example.com", fetcher)).resolves.toEqual({
      accepted: true,
      alreadySubscribed: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(fetcher.mock.calls[2]?.[0]).toBe("https://api.resend.com/audiences");
    expect(fetcher.mock.calls[3]?.[1]).toEqual(expect.objectContaining({
      body: JSON.stringify({ email: "collector@example.com", unsubscribed: false, audience_id: "audience-id" }),
    }));
  });

  it("does not mask unrelated contact validation failures as successful signup", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Email is invalid." }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Email is invalid." }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    await expect(subscribeToLaunchUpdates("collector@example.com", fetcher)).rejects.toThrow("We could not save your email right now.");
  });
});
