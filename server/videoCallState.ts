export type VideoRoomEntryMode = "start" | "join" | "resume";

export function getVideoRoomEntryMode(activeCallerId: number | string | null | undefined, userId: number): VideoRoomEntryMode {
  if (activeCallerId === null || activeCallerId === undefined || activeCallerId === "") {
    return "start";
  }

  return String(activeCallerId) === String(userId) ? "resume" : "join";
}
