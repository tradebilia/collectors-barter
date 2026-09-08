import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const read = (relativePath: string) => readFileSync(join(projectRoot, relativePath), "utf8");

describe("listing owner interaction safeguards", () => {
  it("marks traded Watchlist items and removes their detail and trade actions", () => {
    const source = read("client/src/pages/Watchlist.tsx");
    expect(source).toContain('listing.status === "traded"');
    expect(source).toContain(">TRADED</div>");
    expect(source).toContain('listing.status === "traded" ? <p');
    expect(source).toContain('listing.status !== "traded" && <Button asChild');
    expect(source).toContain('listing.status !== "traded" && <Dialog>');
    expect(source).toContain('onClick={() => watchlistMutation.mutate({ listingId: listing.id })}');
  });
  it("blocks self-trades and self-messages at the server boundary", () => {
    const flowSource = read("server/tradeFlowRouter.ts");
    const legacyProposalSource = read("server/db.ts");
    const routerSource = read("server/routers.ts");

    expect(flowSource).toContain("You cannot trade with yourself");
    expect(legacyProposalSource).toContain("You cannot create a Trade Proposal for your own listing.");
    expect(routerSource.match(/You cannot message yourself\./g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("disables own-listing category actions and requires a personalized note", () => {
    const categorySource = read("client/src/pages/CategoryPage.tsx");

    expect(categorySource).toContain("const { user, isAuthenticated } = useAuth();");
    expect(categorySource).toContain("disabled={!isAuthenticated || listing.ownerId === user?.id}");
    expect(categorySource).toContain("You cannot message or trade with your own item");
    expect(categorySource).toContain("Your personalized message");
    expect(categorySource).toContain("!proposalNote.trim()");
    expect(categorySource).toContain("message: proposalNote.trim()");
    expect(categorySource).toContain('MessageSquareText className={`${viewMode === "grid" ? "mr-1 h-3 w-3 md:h-2 md:w-2" : "mr-1 h-2 w-2"}`}');
    expect(categorySource).toContain('disabled={isAuthenticated && listing.ownerId === user?.id}');
    expect(categorySource).toContain("You cannot favorite your own item");
  });

  it("gives Explore All the same favorite action and owner restriction as category cards", () => {
    const exploreAllSource = read("client/src/pages/SearchResults.tsx");

    expect(exploreAllSource).toContain("MessageSquareText");
    expect(exploreAllSource).toContain("trpc.market.toggleWatchlist.useMutation");
    expect(exploreAllSource).toContain('window.location.href = getLoginUrl();');
    expect(exploreAllSource).toContain('disabled={isAuthenticated && listing.ownerId === user?.id}');
    expect(exploreAllSource).toContain("You cannot favorite your own item");
    expect(exploreAllSource).toContain('listing.savedToWatchlist ? "fill-red-500 text-red-500" : "text-red-500"');
    expect(exploreAllSource).toContain('className="h-7 min-w-0 flex-1 rounded-full border-[#0f5563]/30');
  });

  it("uses an ownership-aware personalized proposal dialog on item detail", () => {
    const detailSource = read("client/src/pages/ItemDetail.tsx");

    expect(detailSource).toContain("const isOwnListing = Boolean(listing && user && listing.ownerId === user.id);");
    expect(detailSource).toContain("setIsProposalDialogOpen(true);");
    expect(detailSource).toContain("Your personalized message");
    expect(detailSource).toContain("message: proposalMessage.trim()");
    expect(detailSource).toContain("disabled={createProposalMutation.isPending || isOwnListing}");
    expect(detailSource).toContain("disabled={isOwnListing}");
    expect(detailSource).not.toContain("I am interested in your ${listing.title}");
  });

  it("uses Trader Rating wording and visibly larger grade details on category cards", () => {
    const categorySource = read("client/src/pages/CategoryPage.tsx");

    expect(categorySource).toContain("Trader Rating:");
    expect(categorySource).toContain(">Trader Rating</p>");
    expect(categorySource).toContain('text-[0.75rem] font-bold leading-tight');
    expect(categorySource).toContain('text-[0.55rem] font-semibold uppercase tracking-[0.08em] opacity-80');
    expect(categorySource).toContain('text-[0.5rem] font-semibold uppercase tracking-[0.06em] opacity-80');
  });
});
