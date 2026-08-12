export type DirectMessageDirection = "sent" | "received";

export function getDirectMessageDirection(latestSenderId: number | null | undefined, currentUserId: number | null | undefined): DirectMessageDirection {
  return latestSenderId === currentUserId ? "sent" : "received";
}

export function getDirectMessageDirectionPresentation(direction: DirectMessageDirection, counterpartName: string) {
  const sent = direction === "sent";

  return {
    listLabel: `${sent ? "To" : "From"}: ${counterpartName}`,
    badge: sent ? "Sent" : "Received",
    detailHeading: `Conversation ${sent ? "to" : "from"} ${counterpartName}`,
    detailPrefix: sent ? "You sent the latest message" : `Latest message received from ${counterpartName}`,
  };
}
