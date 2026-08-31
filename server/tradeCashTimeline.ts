export type CashTimelineEvent = {
  eventType: "cash_added" | "cash_removed";
  details: string;
};

const formatCash = (amount: number) => `$${Math.round(Math.max(0, amount)).toLocaleString("en-US")}`;

export function describeTradeCashChange(
  memberName: string,
  previousAmount: number,
  nextAmount: number,
): CashTimelineEvent | null {
  if (previousAmount === nextAmount) return null;

  if (previousAmount === 0 && nextAmount > 0) {
    return { eventType: "cash_added", details: `Added ${formatCash(nextAmount)} cash to ${memberName}'s side.` };
  }

  if (previousAmount > 0 && nextAmount === 0) {
    return { eventType: "cash_removed", details: `Removed ${formatCash(previousAmount)} cash from ${memberName}'s side.` };
  }

  return {
    eventType: nextAmount > previousAmount ? "cash_added" : "cash_removed",
    details: `Adjusted ${memberName}'s cash from ${formatCash(previousAmount)} to ${formatCash(nextAmount)}.`,
  };
}
