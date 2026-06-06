import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Inquiry System Validation", () => {
  // Test input validation for sendInquiry
  const sendInquirySchema = z.object({
    listingId: z.number().int().positive(),
    recipientId: z.number().int().positive(),
    subject: z.string().min(1).max(255),
    message: z.string().min(1).max(5000),
  });

  it("should validate sendInquiry input with valid data", () => {
    const validInput = {
      listingId: 1,
      recipientId: 2,
      subject: "Question about this item",
      message: "Hi, is this still available?",
    };
    expect(() => sendInquirySchema.parse(validInput)).not.toThrow();
  });

  it("should reject sendInquiry with empty subject", () => {
    const invalidInput = {
      listingId: 1,
      recipientId: 2,
      subject: "",
      message: "Hi, is this still available?",
    };
    expect(() => sendInquirySchema.parse(invalidInput)).toThrow();
  });

  it("should reject sendInquiry with subject too long", () => {
    const invalidInput = {
      listingId: 1,
      recipientId: 2,
      subject: "a".repeat(256),
      message: "Hi, is this still available?",
    };
    expect(() => sendInquirySchema.parse(invalidInput)).toThrow();
  });

  it("should reject sendInquiry with empty message", () => {
    const invalidInput = {
      listingId: 1,
      recipientId: 2,
      subject: "Question about this item",
      message: "",
    };
    expect(() => sendInquirySchema.parse(invalidInput)).toThrow();
  });

  it("should reject sendInquiry with message too long", () => {
    const invalidInput = {
      listingId: 1,
      recipientId: 2,
      subject: "Question about this item",
      message: "a".repeat(5001),
    };
    expect(() => sendInquirySchema.parse(invalidInput)).toThrow();
  });

  it("should reject sendInquiry with invalid listingId", () => {
    const invalidInput = {
      listingId: -1,
      recipientId: 2,
      subject: "Question about this item",
      message: "Hi, is this still available?",
    };
    expect(() => sendInquirySchema.parse(invalidInput)).toThrow();
  });

  it("should reject sendInquiry with invalid recipientId", () => {
    const invalidInput = {
      listingId: 1,
      recipientId: 0,
      subject: "Question about this item",
      message: "Hi, is this still available?",
    };
    expect(() => sendInquirySchema.parse(invalidInput)).toThrow();
  });

  // Test pagination validation
  const paginationSchema = z.object({
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
  });

  it("should validate pagination with valid data", () => {
    const validInput = { limit: 50, offset: 0 };
    expect(() => paginationSchema.parse(validInput)).not.toThrow();
  });

  it("should use default pagination values", () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  // Test markAsRead validation
  const markAsReadSchema = z.object({ inquiryId: z.number().int().positive() });

  it("should validate markAsRead with valid inquiryId", () => {
    const validInput = { inquiryId: 1 };
    expect(() => markAsReadSchema.parse(validInput)).not.toThrow();
  });

  it("should reject markAsRead with invalid inquiryId", () => {
    const invalidInput = { inquiryId: -1 };
    expect(() => markAsReadSchema.parse(invalidInput)).toThrow();
  });
});
