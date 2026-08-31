import mysql from "mysql2/promise";
import { appRouter } from "./routers";

const connectionUrl = process.env.CUSTOM_DATABASE_URL;
if (!connectionUrl) throw new Error("CUSTOM_DATABASE_URL is unavailable for the secured read-only diagnostic.");

const connection = await mysql.createConnection(connectionUrl);

try {
  const [proposalRows] = await connection.query(
    "SELECT `id`, `requesterId`, `recipientId` FROM `tradeProposals` WHERE `status` = 'shipping' ORDER BY `id` DESC LIMIT 1",
  );
  const proposal = (proposalRows as Array<{ id: number; requesterId: number; recipientId: number }>)[0];

  if (!proposal) {
    console.log(JSON.stringify({ shippingProposalFound: false }));
  } else {
    const outcomes = [] as Array<{ participant: "requester" | "recipient"; isRequester: boolean; requestedListingId: number | null; offeredItems: Array<{ id: number; ownerId: number }> }>;
    for (const [participant, id] of [["requester", proposal.requesterId], ["recipient", proposal.recipientId]] as const) {
      const caller = appRouter.createCaller({ user: { id }, req: {}, res: {} } as any);
      const details = await caller.tradeFlow.getTradeDetails({ proposalId: proposal.id });
      outcomes.push({
        participant,
        isRequester: details.isRequester,
        requestedListingId: details.requestedListing?.id ?? null,
        offeredItems: details.offeredListings.map((item: { id: number; ownerId: number }) => ({ id: item.id, ownerId: item.ownerId })),
      });
    }
    console.log(JSON.stringify({ shippingProposalFound: true, outcomes }));
  }
} finally {
  await connection.end();
}
