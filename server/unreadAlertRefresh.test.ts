import { describe, expect, it } from "vitest";
import { shouldRefreshUnreadAlertAfterOpeningDirectThread } from "../client/src/lib/unreadAlertRefresh";

describe("direct-message unread alert refresh", () => {
  it("refreshes the global unread count after an opened direct thread has loaded", () => {
    expect(shouldRefreshUnreadAlertAfterOpeningDirectThread(42, true)).toBe(true);
  });

  it("does not refresh before a direct thread is selected and loaded", () => {
    expect(shouldRefreshUnreadAlertAfterOpeningDirectThread(null, true)).toBe(false);
    expect(shouldRefreshUnreadAlertAfterOpeningDirectThread(42, false)).toBe(false);
  });
});
