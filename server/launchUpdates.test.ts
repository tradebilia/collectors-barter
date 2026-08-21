import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeToLaunchUpdates } from "./launchUpdates";

describe("Coming Soon launch updates", () => {
  const originalKey = process.env.RESEND_CONTACTS_API_KEY;

  afterEach(() => {
    process.env.RESEND_CONTACTS_API_KEY = originalKey;
  });

  it("creates an opted-in contact with a normalized email and no outbound email request", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "contact-id" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "segment-id", name: "Tradebilia Pre-Launch Updates" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "segment-id" }), { status: 200 }));

    const result = await subscribeToLaunchUpdates("  Collector@Example.com ", fetcher);

    expect(result).toEqual({ accepted: true, alreadySubscribed: false });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.resend.com/contacts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "collector@example.com",
          unsubscribed: false,
        }),
      }),
    );
    expect(fetcher.mock.calls[2]?.[0]).toBe("https://api.resend.com/contacts/collector%40example.com/segments/segment-id");
    expect(fetcher.mock.calls[0]?.[0]).not.toContain("/emails");
  });

  it("returns a privacy-safe success response for an existing contact", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "segment-id", name: "Tradebilia Pre-Launch Updates" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "segment-id" }), { status: 200 }));

    await expect(subscribeToLaunchUpdates("collector@example.com", fetcher)).resolves.toEqual({
      accepted: true,
      alreadySubscribed: true,
    });
  });

  it("returns the same privacy-safe success response for Resend's duplicate-contact validation response", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "The contact already exists." }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "segment-id", name: "Tradebilia Pre-Launch Updates" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "segment-id" }), { status: 200 }));

    await expect(subscribeToLaunchUpdates("collector@example.com", fetcher)).resolves.toEqual({
      accepted: true,
      alreadySubscribed: true,
    });
  });

  it("retries a contact write against the account audience when the direct contact request is rejected", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Audience required." }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Audience required." }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "audience-id" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "contact-id" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "segment-id", name: "Tradebilia Pre-Launch Updates" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "segment-id" }), { status: 200 }));

    await expect(subscribeToLaunchUpdates("collector@example.com", fetcher)).resolves.toEqual({
      accepted: true,
      alreadySubscribed: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(fetcher.mock.calls[2]?.[0]).toBe("https://api.resend.com/audiences");
    expect(fetcher.mock.calls[3]?.[1]).toEqual(expect.objectContaining({ body: JSON.stringify({ email: "collector@example.com", unsubscribed: false, audience_id: "audience-id" }) }));
  });

  it("uses the authenticated account's existing audience only after metadata and minimal contact writes both fail", async () => {
    process.env.RESEND_CONTACTS_API_KEY = "test-key";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Audience required." }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Audience required." }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "audience-id" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "contact-id" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "segment-id", name: "Tradebilia Pre-Launch Updates" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "segment-id" }), { status: 200 }));

    await expect(subscribeToLaunchUpdates("collector@example.com", fetcher)).resolves.toEqual({
      accepted: true,
      alreadySubscribed: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(6);
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
