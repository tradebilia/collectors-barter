import { describe, expect, it } from "vitest";
import { getNegotiationTurnState } from "../client/src/lib/tradeNegotiationTurn";

describe("trade negotiation responder turn", () => {
  it("keeps the persisted responder turn while the recipient edits an unsent counteroffer draft", () => {
    const initial = getNegotiationTurnState({
      currentStage: "negotiating",
      lastProposedBy: 60003,
      myUserId: 30002,
      isRequester: false,
      hasLocalChanges: false,
    });
    const draftEdited = getNegotiationTurnState({
      currentStage: "negotiating",
      lastProposedBy: 60003,
      myUserId: 30002,
      isRequester: false,
      hasLocalChanges: true,
    });

    expect(initial.status).toBe("your-turn");
    expect(initial.canAcceptCurrentProposal).toBe(true);
    expect(draftEdited.status).toBe("your-turn");
    expect(draftEdited.canAcceptCurrentProposal).toBe(false);
  });

  it("changes the responder turn only after the submitted proposal is persisted as the current user's proposal", () => {
    const afterSubmission = getNegotiationTurnState({
      currentStage: "negotiating",
      lastProposedBy: 30002,
      myUserId: 30002,
      isRequester: false,
      hasLocalChanges: false,
    });

    expect(afterSubmission.status).toBe("awaiting-their-response");
    expect(afterSubmission.canAcceptCurrentProposal).toBe(false);
  });
});
