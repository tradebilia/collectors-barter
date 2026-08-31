import type { TradeStage } from "@/lib/tradeTypes";

export function getNegotiationTurnState({
  currentStage,
  lastProposedBy,
  myUserId,
  isRequester,
  hasLocalChanges,
}: {
  currentStage: TradeStage;
  lastProposedBy: number | null | undefined;
  myUserId: number | null;
  isRequester: boolean;
  hasLocalChanges: boolean;
}) {
  const otherPartyProposed = currentStage === "negotiating" && (
    lastProposedBy !== null && lastProposedBy !== undefined
      ? lastProposedBy !== myUserId
      : isRequester
  );

  const canSubmitProposal = currentStage === "proposed"
    ? !isRequester
    : currentStage === "negotiating"
      ? otherPartyProposed
      : false;

  return {
    otherPartyProposed,
    canSubmitProposal,
    canAcceptCurrentProposal: otherPartyProposed && !hasLocalChanges,
    status: otherPartyProposed ? "your-turn" : "awaiting-their-response",
  } as const;
}
