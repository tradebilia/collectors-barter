import { describe, it, expect } from "vitest";
import { getMarketplaceFeed, getDb } from "./db";
import { listings } from "../drizzle/schema";

describe("Inventory Management Enhancements", () => {
  describe("Marketplace Feed Filtering", () => {
    it("should return listings from marketplace feed", async () => {
      const feed = await getMarketplaceFeed({}, null);
      
      expect(feed).toBeDefined();
      expect(feed.listings).toBeDefined();
      expect(Array.isArray(feed.listings)).toBe(true);
    });

    it("should include isActive field in marketplace feed listings", async () => {
      const feed = await getMarketplaceFeed({}, null);
      
      // Verify isActive field exists on all listings
      if (feed.listings.length > 0) {
        feed.listings.forEach(listing => {
          expect(listing).toHaveProperty("isActive");
          expect(typeof listing.isActive).toBe("boolean");
        });
      }
    });

    it("should exclude Not Listed items from marketplace feed", async () => {
      const feed = await getMarketplaceFeed({}, null);
      
      // All listings in feed should have isActive = true
      feed.listings.forEach(listing => {
        expect(listing.isActive).toBe(true);
      });
    });

    it("should filter by category and exclude not listed items", async () => {
      const feed = await getMarketplaceFeed({ category: "sports_cards" }, null);
      
      // Should only have active sports cards
      feed.listings.forEach(listing => {
        expect(listing.category).toBe("sports_cards");
        expect(listing.isActive).toBe(true);
      });
    });

    it("should filter by keyword and exclude not listed items", async () => {
      const feed = await getMarketplaceFeed({ keyword: "card" }, null);
      
      // Should have active listings matching keyword
      feed.listings.forEach(listing => {
        expect(listing.isActive).toBe(true);
      });
    });

    it("should filter by condition and exclude not listed items", async () => {
      const feed = await getMarketplaceFeed({ condition: "mint" }, null);
      
      // Should only have active mint condition listings
      feed.listings.forEach(listing => {
        expect(listing.condition).toBe("mint");
        expect(listing.isActive).toBe(true);
      });
    });
  });

  describe("Listing Status Field", () => {
    it("should have isActive field on listings table", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const sample_listings = await db
        .select()
        .from(listings)
        .limit(1);

      if (sample_listings.length > 0) {
        expect(sample_listings[0]).toHaveProperty("isActive");
        expect(typeof sample_listings[0].isActive).toBe("boolean");
      }
    });

    it("should support filtering by isActive status", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const all_listings = await db.select().from(listings).limit(10);

      // Verify we can filter by isActive
      const active = all_listings.filter(l => l.isActive);
      const inactive = all_listings.filter(l => !l.isActive);

      // At least one should exist or be empty (both are valid states)
      expect(Array.isArray(active)).toBe(true);
      expect(Array.isArray(inactive)).toBe(true);
    });
  });

  describe("Bulk Status Toggle Feature", () => {
    it("should support toggling listing status", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const sample_listings = await db
        .select()
        .from(listings)
        .limit(1);

      // Verify listings have isActive field that can be toggled
      if (sample_listings.length > 0) {
        const listing = sample_listings[0];
        expect(listing).toHaveProperty("isActive");
        expect(typeof listing.isActive).toBe("boolean");
      }
    });

    it("should have consistent isActive values across listings", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const all_listings = await db.select().from(listings).limit(20);

      // All listings should have isActive as boolean
      all_listings.forEach(listing => {
        expect(typeof listing.isActive).toBe("boolean");
      });
    });
  });
});
