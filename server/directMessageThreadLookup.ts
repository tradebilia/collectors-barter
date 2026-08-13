export function normalizeDirectMessageParticipants(senderId: number, recipientId: number) {
  return {
    participantAId: Math.min(senderId, recipientId),
    participantBId: Math.max(senderId, recipientId),
  };
}
