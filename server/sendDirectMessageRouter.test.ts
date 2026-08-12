import { describe, expect, it, vi } from "vitest";
import { directMessages, directMessageThreads } from "../drizzle/schema";

const mocks = vi.hoisted(() => ({
  getCommunicationDisplayName: vi.fn(async () => "Administrator"),
  requireDb: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getCommunicationDisplayName: mocks.getCommunicationDisplayName,
    requireDb: mocks.requireDb,
  };
});

vi.mock("./_core/email", () => ({
  sendNewDirectMessageEmail: vi.fn(),
  sendDirectMessageReplyEmail: vi.fn(),
  sendReferralInviteEmail: vi.fn(),
}));

import { appRouter } from "./routers";

function createLegacyDirectMessageDatabase() {
  const threads: Array<{
    id: number;
    participantAId: number;
    participantBId: number;
    lastMessageAt: string;
    createdAt: string;
  }> = [];
  const messages: Array<Record<string, unknown>> = [];
  let selectCall = 0;

  return {
    threads,
    messages,
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              selectCall += 1;
              // The mutation performs one thread lookup followed by one recipient lookup.
              return selectCall % 2 === 1 ? threads.map(({ id }) => ({ id })) : [{ email: null, name: "Rtavani" }];
            },
          }),
        }),
      }),
      insert: (table: unknown) => ({
        values: async (values: Record<string, unknown>) => {
          if (table === directMessageThreads) {
            const id = threads.length + 1;
            threads.push({
              id,
              participantAId: values.participantAId as number,
              participantBId: values.participantBId as number,
              lastMessageAt: values.lastMessageAt as string,
              createdAt: values.createdAt as string,
            });
            return [{ insertId: id }];
          }
          if (table === directMessages) {
            messages.push(values);
            return [{ insertId: messages.length }];
          }
          throw new Error("Unexpected table insert");
        },
      }),
      execute: async () => {
        if (threads.length === 0) {
          const id = 1;
          const createdAt = new Date().toISOString().slice(0, 19).replace("T", " ");
          threads.push({
            id,
            participantAId: 30002,
            participantBId: 60003,
            lastMessageAt: createdAt,
            createdAt,
          });
          return [{ insertId: id }];
        }
        return [];
      },
    },
  };
}

describe("sendDirectMessage legacy schema path", () => {
  it("creates an itemless direct-message thread and its first message through the router mutation", async () => {
    const { db, threads, messages } = createLegacyDirectMessageDatabase();
    mocks.requireDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller({ user: { id: 30002, name: "Administrator" } } as any);

    const result = await caller.market.sendDirectMessage({
      recipientId: 60003,
      subject: "Test subject",
      body: "Test body",
    });

    expect(result).toEqual({ threadId: 1, recipientId: 60003 });
    expect(threads[0]).toMatchObject({ id: 1, participantAId: 30002, participantBId: 60003 });
    expect(threads[0].lastMessageAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(threads[0].createdAt).toBe(threads[0].lastMessageAt);
    expect(messages).toHaveLength(1);
    expect(threads[0]).not.toHaveProperty("itemId");
  });

  it("reuses the existing participant-only thread through a second router mutation", async () => {
    const { db, threads, messages } = createLegacyDirectMessageDatabase();
    mocks.requireDb.mockResolvedValue(db);
    const adminCaller = appRouter.createCaller({ user: { id: 30002, name: "Administrator" } } as any);
    const recipientCaller = appRouter.createCaller({ user: { id: 60003, name: "Rtavani" } } as any);

    await adminCaller.market.sendDirectMessage({ recipientId: 60003, subject: "First", body: "First body" });
    const result = await recipientCaller.market.sendDirectMessage({ recipientId: 30002, subject: "Second", body: "Second body" });

    expect(result.threadId).toBe(1);
    expect(threads).toHaveLength(1);
    expect(messages).toHaveLength(2);
  });
});
