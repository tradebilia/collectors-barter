import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { directMessages, directMessageThreads } from "../drizzle/schema";
import { persistDirectMessage } from "./directMessagePersistence";

function createLegacyThreadDatabase() {
  const threads: Array<{ id: number; participantAId: number; participantBId: number }> = [];
  const messages: Array<Record<string, unknown>> = [];

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => threads.map(({ id }) => ({ id })),
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
    execute: async () => [],
  };

  return { db, threads, messages };
}

describe("legacy direct-message thread persistence", () => {
  it("creates one participant-only thread and one message for a first direct message", async () => {
    const { db, threads, messages } = createLegacyThreadDatabase();

    const result = await persistDirectMessage(db, {
      senderId: 30002,
      recipientId: 60003,
      subject: "Test subject",
      body: "Test body",
    });

    expect(result).toEqual({ threadId: 1, isNewThread: true });
    expect(threads).toEqual([{ id: 1, participantAId: 30002, participantBId: 60003 }]);
    expect(messages).toHaveLength(1);
    expect(threads[0]).not.toHaveProperty("itemId");
  });

  it("reuses the existing participant-only thread for a second direct message", async () => {
    const { db, threads, messages } = createLegacyThreadDatabase();

    await persistDirectMessage(db, {
      senderId: 30002,
      recipientId: 60003,
      subject: "First",
      body: "First body",
    });
    const result = await persistDirectMessage(db, {
      senderId: 60003,
      recipientId: 30002,
      subject: "Second",
      body: "Second body",
    });

    expect(result).toEqual({ threadId: 1, isNewThread: false });
    expect(threads).toHaveLength(1);
    expect(messages).toHaveLength(2);
  });

  it("routes direct-message sends through the legacy-compatible persistence helper", () => {
    const routerSource = readFileSync(join(process.cwd(), "server", "routers.ts"), "utf-8");
    expect(routerSource).toContain("persistDirectMessage(");
  });
});
