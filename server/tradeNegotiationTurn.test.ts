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
    expect(initial.canSubmitProposal).toBe(true);
    expect(initial.canAcceptCurrentProposal).toBe(true);
    expect(draftEdited.status).toBe("your-turn");
    expect(draftEdited.canSubmitProposal).toBe(true);
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
    expect(afterSubmission.canSubmitProposal).toBe(false);
    expect(afterSubmission.canAcceptCurrentProposal).toBe(false);
  });

  it("allows only the listing owner to submit the first proposal for a pending inquiry", () => {
    const requester = getNegotiationTurnState({
      currentStage: "proposed",
      lastProposedBy: null,
      myUserId: 30002,
      isRequester: true,
      hasLocalChanges: false,
    });
    const recipient = getNegotiationTurnState({
      currentStage: "proposed",
      lastProposedBy: null,
      myUserId: 60003,
      isRequester: false,
      hasLocalChanges: false,
    });

    expect(requester.canSubmitProposal).toBe(false);
    expect(recipient.canSubmitProposal).toBe(true);
  });
});
