export type InquiryDirection = "sent" | "received";

export function getInquiryDirection(senderId: number, currentUserId: number | null | undefined): InquiryDirection {
  return senderId === currentUserId ? "sent" : "received";
}

export function getInquiryDirectionPresentation(direction: InquiryDirection, counterpartName: string) {
  if (direction === "sent") {
    return {
      badge: "Sent",
      listLabel: `To: ${counterpartName}`,
      detailHeading: `Inquiry to ${counterpartName}`,
      detailPrefix: "You sent this item inquiry",
      statusLabel: "Sent",
    } as const;
  }

  return {
    badge: "Received",
    listLabel: `From: ${counterpartName}`,
    detailHeading: `Inquiry from ${counterpartName}`,
    detailPrefix: "Received",
    statusLabel: "Unread",
  } as const;
}
