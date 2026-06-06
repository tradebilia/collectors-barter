import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Inquiry Router - Input Validation', () => {
  // Test the input schemas used by the inquiry procedures

  describe('inquiry.send input validation', () => {
    const sendInquirySchema = z.object({
      recipientId: z.number().int().positive(),
      listingId: z.number().int().positive(),
      subject: z.string().min(1).max(255),
      message: z.string().min(1).max(5000),
    });

    it('should accept valid send inquiry input', () => {
      const input = {
        recipientId: 2,
        listingId: 1,
        subject: 'Question about Item',
        message: 'Is this item still available?',
      };

      const result = sendInquirySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty subject', () => {
      const input = {
        recipientId: 2,
        listingId: 1,
        subject: '',
        message: 'Is this item still available?',
      };

      const result = sendInquirySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty message', () => {
      const input = {
        recipientId: 2,
        listingId: 1,
        subject: 'Question about Item',
        message: '',
      };

      const result = sendInquirySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject subject exceeding max length', () => {
      const input = {
        recipientId: 2,
        listingId: 1,
        subject: 'a'.repeat(256),
        message: 'Is this item still available?',
      };

      const result = sendInquirySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject message exceeding max length', () => {
      const input = {
        recipientId: 2,
        listingId: 1,
        subject: 'Question about Item',
        message: 'a'.repeat(5001),
      };

      const result = sendInquirySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject non-positive recipientId', () => {
      const input = {
        recipientId: 0,
        listingId: 1,
        subject: 'Question about Item',
        message: 'Is this item still available?',
      };

      const result = sendInquirySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject non-positive listingId', () => {
      const input = {
        recipientId: 2,
        listingId: 0,
        subject: 'Question about Item',
        message: 'Is this item still available?',
      };

      const result = sendInquirySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('inquiry.getAll input validation', () => {
    const getAllSchema = z.object({
      limit: z.number().int().positive().default(50),
      offset: z.number().int().nonnegative().default(0),
    });

    it('should accept valid getAll input', () => {
      const input = {
        limit: 50,
        offset: 0,
      };

      const result = getAllSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should use default values when not provided', () => {
      const input = {};

      const result = getAllSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(50);
      expect(result.data?.offset).toBe(0);
    });

    it('should reject negative limit', () => {
      const input = {
        limit: -1,
        offset: 0,
      };

      const result = getAllSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const input = {
        limit: 50,
        offset: -1,
      };

      const result = getAllSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('inquiry.markAsRead input validation', () => {
    const markAsReadSchema = z.object({
      inquiryId: z.number().int().positive(),
    });

    it('should accept valid markAsRead input', () => {
      const input = {
        inquiryId: 1,
      };

      const result = markAsReadSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject non-positive inquiryId', () => {
      const input = {
        inquiryId: 0,
      };

      const result = markAsReadSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative inquiryId', () => {
      const input = {
        inquiryId: -1,
      };

      const result = markAsReadSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
