import { getTableConfig } from "drizzle-orm/mysql-core";
import { describe, expect, it } from "vitest";
import {
  forumPostAttachments,
  forumReplyAttachments,
  tradePayments,
  verificationOrders,
} from "../drizzle/schema";

function findForeignKey(table: Parameters<typeof getTableConfig>[0], referencedTable: string, column: string) {
  const config = getTableConfig(table);
  return config.foreignKeys.find((foreignKey) => {
    const reference = foreignKey.reference();
    return (
      reference.foreignTable[Symbol.for("drizzle:Name")] === referencedTable
      && reference.columns.some((candidate) => candidate.name === column)
    );
  });
}

describe("live TiDB foreign-key alignment", () => {
  it.each([
    [forumPostAttachments, "users", "userId"],
    [forumReplyAttachments, "users", "userId"],
    [tradePayments, "tradeProposals", "proposalId"],
    [verificationOrders, "tradeProposals", "proposalId"],
  ] as const)("declares %s.%s -> %s with the live cascade rule", (table, referencedTable, column) => {
    const foreignKey = findForeignKey(table, referencedTable, column);
    expect(foreignKey).toBeDefined();
    expect(foreignKey?.onDelete).toBe("cascade");
    expect(foreignKey?.onUpdate ?? "no action").toBe("no action");
  });
});
