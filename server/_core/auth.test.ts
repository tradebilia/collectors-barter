import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, isValidUsername, isValidPassword, isValidEmail } from "./auth";

describe("Auth Module", () => {
  describe("Password Hashing", () => {
    it("should hash a password with bcrypt", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
      // Bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it("should produce different hashes for the same password", async () => {
      const password = "TestPassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // Bcrypt should produce different hashes due to random salt
      expect(hash1).not.toBe(hash2);
    });

    it("should verify correct password", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "TestPassword123";
      const wrongPassword = "WrongPassword456";
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it("should handle invalid hash gracefully", async () => {
      const password = "TestPassword123";
      const invalidHash = "not-a-valid-hash";
      
      const isValid = await verifyPassword(password, invalidHash);
      expect(isValid).toBe(false);
    });
  });

  describe("Username Validation", () => {
    it("should accept valid usernames", () => {
      expect(isValidUsername("user123")).toBe(true);
      expect(isValidUsername("admin_user")).toBe(true);
      expect(isValidUsername("test-user")).toBe(true);
      expect(isValidUsername("AdminTavani")).toBe(true);
    });

    it("should reject invalid usernames", () => {
      expect(isValidUsername("ab")).toBe(false); // Too short
      expect(isValidUsername("a".repeat(33))).toBe(false); // Too long
      expect(isValidUsername("user@name")).toBe(false); // Invalid character
      expect(isValidUsername("user name")).toBe(false); // Space
    });
  });

  describe("Password Validation", () => {
    it("should accept valid passwords", () => {
      expect(isValidPassword("TestPassword123")).toBe(true);
      expect(isValidPassword("Fizz7718!!!!")).toBe(true);
      expect(isValidPassword("MyPass123")).toBe(true);
    });

    it("should reject invalid passwords", () => {
      expect(isValidPassword("short")).toBe(false); // Too short
      expect(isValidPassword("nouppercase123")).toBe(false); // No uppercase
      expect(isValidPassword("NOLOWERCASE123")).toBe(false); // No lowercase
      expect(isValidPassword("NoNumbers")).toBe(false); // No numbers
    });
  });

  describe("Email Validation", () => {
    it("should accept valid emails", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("admin@tradebilia.local")).toBe(true);
      expect(isValidEmail("test.user@domain.co.uk")).toBe(true);
    });

    it("should reject invalid emails", () => {
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("user @example.com")).toBe(false);
    });
  });
});
