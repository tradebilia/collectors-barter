export function shouldRefreshUnreadAlertAfterOpeningDirectThread(
  threadId: number | null,
  messagesLoaded: boolean,
) {
  return threadId !== null && messagesLoaded;
}
