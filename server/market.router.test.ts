import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  createListing: vi.fn(),
  createTradeProposal: vi.fn(),
  getDashboardData: vi.fn(),
  getListingDetail: vi.fn(),
  getMarketplaceFeed: vi.fn(),
  leaveTradeReview: vi.fn(),
  searchMembers: vi.fn(),
  respondToTradeProposal: vi.fn(),
  selectTradeProposalItems: vi.fn(),
  sendTradeMessage: vi.fn(),
  toggleWatchlist: vi.fn(),
  updateProfile: vi.fn(),
}));

const notificationMocks = vi.hoisted(() => ({
  notifyOwner: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./_core/notification", () => notificationMocks);

const { appRouter } = await import("./routers");

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(userOverrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 7,
    openId: "collector-7",
    email: "collector@example.com",
    name: "Alex Collector",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...userOverrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("market router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ranked member search results for the public member directory", async () => {
    dbMocks.searchMembers.mockResolvedValue({ members: [], rankings: { topRated: [], mostActive: [] }, regions: [] });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.members.search({ query: "alex", verification: "verified" });

    expect(dbMocks.searchMembers).toHaveBeenCalledWith({ query: "alex", verification: "verified" });
    expect(result.members).toEqual([]);
  });

  it("returns the marketplace feed with viewer context when authenticated", async () => {
    dbMocks.getMarketplaceFeed.mockResolvedValue({ listings: [], highlights: { totalListings: 0, activeCollectors: 0, completedTrades: 0 } });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.market.feed({ category: "comics", condition: "near_mint", keyword: "Spider-Man" });

    expect(result.highlights.totalListings).toBe(0);
    expect(dbMocks.getMarketplaceFeed).toHaveBeenCalledWith(
      { category: "comics", condition: "near_mint", keyword: "Spider-Man" },
      7,
    );
  });

  it("returns listing detail data with viewer context", async () => {
    dbMocks.getListingDetail.mockResolvedValue({ listing: { id: 42, title: "Jordan Rookie" }, similarListings: [] });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.market.listingDetail({ listingId: 42 });

    expect(dbMocks.getListingDetail).toHaveBeenCalledWith(42, 7);
    expect(result).toEqual({ listing: { id: 42, title: "Jordan Rookie" }, similarListings: [] });
  });

  it("uses the authenticated user when creating an expression-of-interest Trade Proposal", async () => {
    dbMocks.createTradeProposal.mockResolvedValue({ tradeProposals: [] });

    const caller = appRouter.createCaller(createContext());
    await caller.market.createTradeProposal({
      requestedListingId: 42,
      note: "I am interested in this item and would love for you to review my inventory.",
    });

    expect(dbMocks.createTradeProposal).toHaveBeenCalledWith(
      { id: 7, name: "Alex Collector" },
      {
        requestedListingId: 42,
        note: "I am interested in this item and would love for you to review my inventory.",
      },
    );
  });

  it("lets the item owner select multiple inventory items for a Trade Proposal", async () => {
    dbMocks.selectTradeProposalItems.mockResolvedValue(true);
    dbMocks.getDashboardData.mockResolvedValue({ tradeProposals: [] });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.market.selectTradeProposalItems({
      proposalId: 9,
      offeredListingIds: [10, 11],
      note: "These are the pieces I would trade for your request.",
    });

    expect(dbMocks.selectTradeProposalItems).toHaveBeenCalledWith(7, 9, [10, 11], "These are the pieces I would trade for your request.");
    expect(result).toEqual({ tradeProposals: [] });
  });

  it("refreshes dashboard data after responding to a Trade Proposal", async () => {
    dbMocks.respondToTradeProposal.mockResolvedValue(true);
    dbMocks.getDashboardData.mockResolvedValue({ tradeProposals: [] });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.market.respondToTradeProposal({ proposalId: 9, action: "refuse", note: "Nothing fits my current collection goals." });

    expect(dbMocks.respondToTradeProposal).toHaveBeenCalledWith(7, "refuse", 9, "Nothing fits my current collection goals.");
    expect(dbMocks.getDashboardData).toHaveBeenCalledWith({ id: 7, name: "Alex Collector" });
    expect(result).toEqual({ tradeProposals: [] });
  });

  it("forwards Watchlist toggles to the database layer", async () => {
    dbMocks.toggleWatchlist.mockResolvedValue({ saved: true });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.market.toggleWatchlist({ listingId: 88 });

    expect(dbMocks.toggleWatchlist).toHaveBeenCalledWith(7, 88);
    expect(result).toEqual({ saved: true });
  });

  it("submits Ratings and Reviews and returns refreshed dashboard data", async () => {
    dbMocks.leaveTradeReview.mockResolvedValue(true);
    dbMocks.getDashboardData.mockResolvedValue({ ratingsAndReviews: [] });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.market.leaveTradeReview({ proposalId: 5, rating: 5, review: "Excellent communication and careful packaging." });

    expect(dbMocks.leaveTradeReview).toHaveBeenCalledWith(7, {
      proposalId: 5,
      rating: 5,
      review: "Excellent communication and careful packaging.",
    });
    expect(result).toEqual({ ratingsAndReviews: [] });
  });

  it("sends a Tradebilia report to owner review", async () => {
    notificationMocks.notifyOwner.mockResolvedValue(true);

    const caller = appRouter.createCaller(createContext());
    const result = await caller.market.reportUser({
      reportedMember: "Collector 88",
      listingReference: "Listing #42",
      concernType: "Harassment or abusive conduct",
      contactEmail: "collector@example.com",
      details: "The member repeatedly sent abusive messages after a declined proposal.",
      supportingNotes: "Conversation thread captured in proposal comments.",
    });

    expect(notificationMocks.notifyOwner).toHaveBeenCalledWith({
      title: "Tradebilia report submitted: Harassment or abusive conduct",
      content: expect.stringContaining("Reported member: Collector 88"),
    });
    expect(result).toEqual({
      success: true,
      message: "Your report was sent to the Tradebilia moderation review queue.",
    });
  });

  it("sends a Tradebilia referral request for owner review", async () => {
    notificationMocks.notifyOwner.mockResolvedValue(true);

    const caller = appRouter.createCaller(createContext());
    const result = await caller.market.referralRequest({
      friendName: "Jordan Example",
      friendEmail: "jordan@example.com",
      collectorFocus: "graded sports cards and vintage sealed wax",
      message: "Jordan is a careful collector who would add value to the Tradebilia community.",
    });

    expect(notificationMocks.notifyOwner).toHaveBeenCalledWith({
      title: "Tradebilia referral request: Jordan Example",
      content: expect.stringContaining("Referral candidate email: jordan@example.com"),
    });
    expect(result).toEqual({
      success: true,
      message: "Your referral request was sent for Tradebilia review.",
    });
  });
});
