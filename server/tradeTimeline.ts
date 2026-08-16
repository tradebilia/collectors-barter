export type TimelineEvent = {
  id: string | number;
  actorId: number | null;
  actorName: string;
  eventType: string;
  details: string;
  createdAt: string | Date;
};

type TimelineProposal = {
  id: number;
  requesterId: number;
  requesterName: string;
  recipientName: string;
  status: string;
  createdAt: string | Date;
  negotiatingAt?: string | Date | null;
  acceptedAt?: string | Date | null;
  shippingAt?: string | Date | null;
  shippedAt?: string | Date | null;
  completedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  initiatorMessage?: string | null;
  note?: string | null;
};

type TimelineMessage = {
  id: number;
  senderId: number;
  actorName?: string | null;
  message: string;
  messageType?: string | null;
  createdAt: string | Date;
};

function hasTimestamp(value: string | Date | null | undefined): value is string | Date {
  return value !== null && value !== undefined && value !== "";
}

export function isMissingTradeActivityLogError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("tradeActivityLog") && /doesn't exist|ER_NO_SUCH_TABLE|no such table/i.test(message);
}

export function buildLegacyTradeTimeline(proposal: TimelineProposal, messages: TimelineMessage[]): TimelineEvent[] {
  const events: TimelineEvent[] = [{
    id: `proposal-${proposal.id}-created`, actorId: proposal.requesterId, actorName: proposal.requesterName,
    eventType: "trade_created", details: proposal.initiatorMessage || proposal.note || "Trade proposal created", createdAt: proposal.createdAt,
  }];
  const milestones: Array<{ timestamp: string | Date | null | undefined; eventType: string; details: string }> = [
    { timestamp: proposal.negotiatingAt, eventType: "proposal_sent", details: "Trade entered negotiation" },
    { timestamp: proposal.acceptedAt, eventType: "proposal_accepted", details: "Trade accepted" },
    { timestamp: proposal.shippingAt, eventType: "tracking_submitted", details: "Trade moved to shipping" },
    { timestamp: proposal.shippedAt, eventType: "tracking_submitted", details: "Items marked as shipped" },
    { timestamp: proposal.completedAt, eventType: "trade_completed", details: "Trade completed" },
  ];
  for (const milestone of milestones) {
    if (!hasTimestamp(milestone.timestamp)) continue;
    events.push({ id: `proposal-${proposal.id}-${milestone.eventType}-${String(milestone.timestamp)}`, actorId: null, actorName: "Tradebilia", eventType: milestone.eventType, details: milestone.details, createdAt: milestone.timestamp });
  }
  if (["declined", "cancelled"].includes(proposal.status) && hasTimestamp(proposal.updatedAt)) {
    events.push({ id: `proposal-${proposal.id}-${proposal.status}`, actorId: null, actorName: "Tradebilia", eventType: proposal.status === "declined" ? "proposal_declined" : "trade_cancelled", details: proposal.status === "declined" ? "Trade declined" : "Trade cancelled", createdAt: proposal.updatedAt });
  }
  for (const message of messages) {
    events.push({ id: `message-${message.id}`, actorId: message.senderId, actorName: message.actorName || proposal.recipientName, eventType: message.messageType === "system" ? "system_message" : "message_sent", details: message.message, createdAt: message.createdAt });
  }
  return events.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}
