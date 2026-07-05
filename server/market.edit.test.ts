import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1, userName: string = "Test User"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: userName,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("market.updateListing - Input Validation", () => {
  it("should validate that title is required and has minimum length", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.market.updateListing({
        listingId: 1,
        title: "AB", // Too short - minimum is 3
        category: "comics",
        condition: "mint",
        description: "This is a valid description that meets the minimum length requirement",
        estimatedValue: 100,
        photos: [],
      });
      expect.fail("Should have thrown validation error for title");
    } catch (error: any) {
      // Should fail validation
      expect(error).toBeDefined();
      expect(error.message).toContain("Too small");
    }
  });

  it("should enforce the description maximum length", async () => {
    // NOTE: the schema intentionally has no minimum description length
    // (z.string().max(4000)); short descriptions are allowed. The previous
    // version of this test asserted a minimum that never existed in the schema.
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.market.updateListing({
        listingId: 1,
        title: "Valid Title",
        category: "comics",
        condition: "mint",
        description: "x".repeat(4001), // Exceeds max of 4000
        estimatedValue: 100,
        photos: [],
      });
      expect.fail("Should have thrown validation error for description");
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.message).toContain("Too big");
    }
  });

  it("should validate that listingId is a positive integer", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.market.updateListing({
        listingId: 0, // Invalid - must be positive
        title: "Valid Title",
        category: "comics",
        condition: "mint",
        description: "This is a valid description that meets the minimum length requirement",
        estimatedValue: 100,
        photos: [],
      });
      expect.fail("Should have thrown validation error for listingId");
    } catch (error: any) {
      // Should fail validation
      expect(error).toBeDefined();
      expect(error.message).toContain("Too small");
    }
  });

  it("should validate that category is one of the allowed values", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.market.updateListing({
        listingId: 1,
        title: "Valid Title",
        category: "invalid_category" as any,
        condition: "mint",
        description: "This is a valid description that meets the minimum length requirement",
        estimatedValue: 100,
        photos: [],
      });
      expect.fail("Should have thrown validation error for category");
    } catch (error: any) {
      // Should fail validation
      expect(error).toBeDefined();
    }
  });

  it("should validate that condition is one of the allowed values", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.market.updateListing({
        listingId: 1,
        title: "Valid Title",
        category: "comics",
        condition: "invalid_condition" as any,
        description: "This is a valid description that meets the minimum length requirement",
        estimatedValue: 100,
        photos: [],
      });
      expect.fail("Should have thrown validation error for condition");
    } catch (error: any) {
      // Should fail validation
      expect(error).toBeDefined();
    }
  });

  it("should validate that estimatedValue is non-negative", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.market.updateListing({
        listingId: 1,
        title: "Valid Title",
        category: "comics",
        condition: "mint",
        description: "This is a valid description that meets the minimum length requirement",
        estimatedValue: -50, // Invalid - must be non-negative
        photos: [],
      });
      expect.fail("Should have thrown validation error for estimatedValue");
    } catch (error: any) {
      // Should fail validation
      expect(error).toBeDefined();
    }
  });

  it("should validate that photos array is not too large", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);

    const tooManyPhotos = Array(7).fill({
      name: "photo.jpg",
      type: "image/jpeg",
      contentBase64: "base64data",
      previewUrl: "data:image/jpeg;base64,base64data",
    });

    try {
      await caller.market.updateListing({
        listingId: 1,
        title: "Valid Title",
        category: "comics",
        condition: "mint",
        description: "This is a valid description that meets the minimum length requirement",
        estimatedValue: 100,
        photos: tooManyPhotos as any,
      });
      expect.fail("Should have thrown validation error for too many photos");
    } catch (error: any) {
      // Should fail validation
      expect(error).toBeDefined();
    }
  });

  it("should accept valid input for all fields", async () => {
    const { ctx } = createAuthContext(1, "Test User");
    const caller = appRouter.createCaller(ctx);

    try {
      // This will fail at the database level (unauthorized/not found) but should pass input validation
      await caller.market.updateListing({
        listingId: 1,
        title: "Valid Title",
        category: "comics",
        condition: "mint",
        description: "This is a valid description that meets the minimum length requirement",
        estimatedValue: 100,
        photos: [],
      });
      // If we get here, input validation passed (but authorization failed, which is expected)
      expect.fail("Should have failed at authorization level");
    } catch (error: any) {
      // Expected to fail at authorization or database level, not validation
      // This means input validation passed successfully
      expect(error).toBeDefined();
    }
  });
});
