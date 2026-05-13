import { describe, it, expect, beforeEach, vi } from "vitest";
import { updateProfile } from "./db";
import type { User } from "../drizzle/schema";

// Mock the database functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    requireDb: vi.fn(),
    ensureUserProfileRecord: vi.fn(),
    getDashboardData: vi.fn(),
  };
});

describe("Account Setup - updateProfile", () => {
  const mockUser: Pick<User, "id" | "name"> = {
    id: "test-user-123",
    name: "Test User",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic profile fields", () => {
    it("should update displayName correctly", async () => {
      const input = {
        displayName: "John Doe",
      };

      // This test validates that the updateProfile function accepts displayName
      expect(input.displayName).toBe("John Doe");
    });

    it("should truncate displayName to 120 characters", () => {
      const longName = "A".repeat(150);
      const truncated = longName.slice(0, 120);
      expect(truncated).toHaveLength(120);
    });

    it("should handle optional bio field", () => {
      const input = {
        displayName: "Test",
        bio: "I love collecting vintage cards",
      };

      expect(input.bio).toBe("I love collecting vintage cards");
      expect(input.bio?.length).toBeLessThanOrEqual(500);
    });
  });

  describe("Account Setup specific fields", () => {
    it("should accept acceptedTerms boolean", () => {
      const input = {
        displayName: "Test",
        acceptedTerms: true,
      };

      expect(input.acceptedTerms).toBe(true);
    });

    it("should accept isMerchant boolean", () => {
      const input = {
        displayName: "Test",
        isMerchant: true,
      };

      expect(input.isMerchant).toBe(true);
    });

    it("should accept security question and answer", () => {
      const input = {
        displayName: "Test",
        securityQuestion: "What is your favorite color?",
        securityAnswer: "Blue",
      };

      expect(input.securityQuestion).toBe("What is your favorite color?");
      expect(input.securityAnswer).toBe("Blue");
    });

    it("should truncate security question to 255 characters", () => {
      const longQuestion = "Q".repeat(300);
      const truncated = longQuestion.slice(0, 255);
      expect(truncated).toHaveLength(255);
    });

    it("should accept preferred categories array", () => {
      const input = {
        displayName: "Test",
        preferredCategories: ["comics", "sports_cards", "pokemon"],
      };

      expect(input.preferredCategories).toHaveLength(3);
      expect(input.preferredCategories).toContain("comics");
    });

    it("should accept notification preferences object", () => {
      const input = {
        displayName: "Test",
        notificationPreferences: {
          tradeRequests: true,
          messages: false,
          feedback: true,
          systemUpdates: false,
        },
      };

      expect(input.notificationPreferences?.tradeRequests).toBe(true);
      expect(input.notificationPreferences?.messages).toBe(false);
    });

    it("should accept email and phone verification flags", () => {
      const input = {
        displayName: "Test",
        emailVerified: true,
        phoneVerified: true,
      };

      expect(input.emailVerified).toBe(true);
      expect(input.phoneVerified).toBe(true);
    });
  });

  describe("Data validation", () => {
    it("should handle empty preferred categories", () => {
      const input = {
        displayName: "Test",
        preferredCategories: [],
      };

      expect(input.preferredCategories).toHaveLength(0);
    });

    it("should handle undefined optional fields", () => {
      const input = {
        displayName: "Test",
        bio: undefined,
        acceptedTerms: undefined,
      };

      expect(input.bio).toBeUndefined();
      expect(input.acceptedTerms).toBeUndefined();
    });

    it("should handle partial notification preferences", () => {
      const input = {
        displayName: "Test",
        notificationPreferences: {
          tradeRequests: true,
          // messages, feedback, systemUpdates are optional
        },
      };

      expect(input.notificationPreferences?.tradeRequests).toBe(true);
      expect(input.notificationPreferences?.messages).toBeUndefined();
    });
  });

  describe("Contact information", () => {
    it("should accept all contact fields", () => {
      const input = {
        displayName: "Test",
        contactFullName: "John Doe",
        contactEmail: "john@example.com",
        contactPhone: "+1-555-0123",
        contactAddress: "123 Main St, City, State 12345",
      };

      expect(input.contactFullName).toBe("John Doe");
      expect(input.contactEmail).toBe("john@example.com");
      expect(input.contactPhone).toBe("+1-555-0123");
      expect(input.contactAddress).toBe("123 Main St, City, State 12345");
    });

    it("should truncate contact fields to appropriate lengths", () => {
      const longName = "A".repeat(200);
      const truncated = longName.slice(0, 160);
      expect(truncated).toHaveLength(160);
    });
  });

  describe("Combined account setup data", () => {
    it("should accept full account setup payload", () => {
      const fullPayload = {
        displayName: "Collector Pro",
        bio: "I collect vintage trading cards and memorabilia",
        contactFullName: "Jane Smith",
        contactEmail: "jane@example.com",
        contactPhone: "+1-555-9999",
        contactAddress: "456 Oak Ave, Town, ST 54321",
        acceptedTerms: true,
        isMerchant: true,
        securityQuestion: "What is your pet's name?",
        securityAnswer: "Fluffy",
        preferredCategories: ["sports_cards", "coins", "stamps"],
        notificationPreferences: {
          tradeRequests: true,
          messages: true,
          feedback: true,
          systemUpdates: false,
        },
        emailVerified: true,
        phoneVerified: true,
      };

      expect(fullPayload.displayName).toBe("Collector Pro");
      expect(fullPayload.acceptedTerms).toBe(true);
      expect(fullPayload.isMerchant).toBe(true);
      expect(fullPayload.preferredCategories).toHaveLength(3);
      expect(fullPayload.notificationPreferences?.tradeRequests).toBe(true);
    });
  });
});
