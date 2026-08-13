import { and, eq, sql } from "drizzle-orm";
import { directMessages, directMessageThreads } from "../drizzle/schema";
import { normalizeDirectMessageParticipants } from "./directMessageThreadLookup";

type DirectMessageDatabase = {
  select: (selection: unknown) => {
    from: (table: unknown) => {
      where: (condition: unknown) => {
        limit: (count: number) => Promise<Array<{ id: number }>>;
      };
    };
  };
  insert: (table: unknown) => {
    values: (values: Record<string, unknown>) => Promise<unknown>;
  };
  execute: (query: unknown) => Promise<unknown>;
};

export async function persistDirectMessage(
  db: DirectMessageDatabase,
  input: { senderId: number; recipientId: number; subject: string; body: string },
) {
  const { threadId, isNewThread } = await getOrCreateDirectMessageThread(db, {
    participantAId: input.senderId,
    participantBId: input.recipientId,
  });

  if (!isNewThread) {
    await db.execute(
      sql`UPDATE directMessageThreads SET lastMessageAt = NOW() WHERE id = ${threadId}`,
    );
  }

  await db.insert(directMessages).values({
    threadId,
    senderId: input.senderId,
    subject: input.subject,
    body: input.body,
    isReadByRecipient: 0,
  });

  return { threadId, isNewThread };
}

export async function getOrCreateDirectMessageThread(
  db: DirectMessageDatabase,
  input: { participantAId: number; participantBId: number },
) {
  const { participantAId, participantBId } = normalizeDirectMessageParticipants(
    input.participantAId,
    input.participantBId,
  );
  const existing = await db
    .select({ id: directMessageThreads.id })
    .from(directMessageThreads)
    .where(
      and(
        eq(directMessageThreads.participantAId, participantAId),
        eq(directMessageThreads.participantBId, participantBId),
      ),
    )
    .limit(1);

  let threadId: number;
  const isNewThread = existing.length === 0;

  if (existing.length > 0) {
    threadId = existing[0].id;
  } else {
    const createdAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    const result = await db.execute(sql`
      INSERT INTO directMessageThreads (participantAId, participantBId, lastMessageAt, createdAt)
      VALUES (${participantAId}, ${participantBId}, ${createdAt}, ${createdAt})
    `);
    const insertResult = Array.isArray(result) ? result[0] : result;
    threadId = (insertResult as any).insertId;
  }

  return { threadId, isNewThread };
}
