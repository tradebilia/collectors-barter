import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const messagesSource = readFileSync(resolve(process.cwd(), "client/src/pages/Messages.tsx"), "utf8");
const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const timestampSource = readFileSync(resolve(process.cwd(), "client/src/lib/messageTimestamps.ts"), "utf8");

describe("Messages page refinements", () => {
  it("uses a centered, expanded hero and prominent unlabeled subjects", () => {
    expect(messagesSource).toContain("h-[400px] items-center justify-center");
    expect(messagesSource).toContain("w-full max-w-6xl object-contain");
    expect(messagesSource).toContain('transform: "translateX(-2.34375%)"');
    expect(messagesSource).not.toContain("Direct Lines, Trusted Conversations</p>");
    expect(messagesSource).toContain("text-xl font-semibold leading-8");
    expect(messagesSource).not.toContain('>Subject</p>');
    expect(messagesSource).not.toContain("Direct messages update live across open browser sessions");
  });

  it("selects the inquiry counterpart avatar according to message direction", () => {
    expect(messagesSource).toContain("activeInquiryDirection === \"sent\"");
    expect(messagesSource).toContain("(activeInquiry as any)?.recipientAvatarUrl");
    expect(messagesSource).toContain("activeInquiry?.senderAvatarUrl");
    expect(dbSource).toContain("senderAvatarUrl: userProfiles.avatarUrl");
  });

  it("preserves the original subject when a direct-message reply is inserted or listed", () => {
    expect(routerSource).toContain("const originalMessage = await db");
    expect(routerSource).toContain(".orderBy(asc(directMessages.createdAt))");
    expect(routerSource).toContain("subject: replySubject");
    expect(routerSource).toContain("NULLIF(TRIM(dm2.subject), '') IS NOT NULL ORDER BY dm2.createdAt ASC");
  });

  it("distinguishes message types and emphasizes direct-message sending", () => {
    expect(messagesSource).toContain("border-amber-800 bg-amber-900");
    expect(messagesSource).toContain("border-indigo-800 bg-indigo-950");
    expect(messagesSource).toContain("bg-violet-600 text-white");
    expect(messagesSource).not.toContain("Collector direct line");
  });

  it("uses the approved subject-first inbox hierarchy with inquiry-only Item # links and compact context", () => {
    expect(messagesSource).toContain(">Inbox Folders</h2>");
    expect(messagesSource).toContain("`Messages with ${activeThread.counterpartName}`");
    expect(messagesSource).not.toContain("{activeDirectPresentation.badge}");
    expect(messagesSource).toContain("const messageAvatarUrl = message.senderAvatarUrl");
    expect(messagesSource).toContain('Avatar className="h-6 w-6 border border-white/25"');
    expect(messagesSource).toContain('className="space-y-2"');
    expect(messagesSource).toContain('rounded-[1.25rem] border px-3 py-2.5');
    expect(messagesSource).toContain("font-serif text-2xl font-bold leading-tight");
    expect(messagesSource).toContain("Item #{inquiry.listingId}");
    expect(messagesSource).toContain("flex shrink-0 flex-col items-end gap-1");
    expect(messagesSource).toContain("text-[10px] font-bold uppercase tracking-[0.12em]");
    expect(messagesSource).toContain("truncate text-sm font-normal");
    expect(messagesSource).toContain('const inquiryDirectionLabel = inquiryDirection === "sent" ? "To:" : "From:"');
    expect(messagesSource).toContain('const directDirectionLabel = directDirection === "sent" ? "To:" : "From:"');
    expect(messagesSource).toContain('ml-1 text-base font-semibold');
    expect(messagesSource).toContain('Avatar className="h-7 w-7 border border-slate-200"');
    expect(messagesSource).toContain("border-t pt-2 text-xs");
    expect(messagesSource).toContain('rounded-md px-2 py-1 ${activeThreadKey === `inquiry-${inquiry.id}` ? "bg-white/10 text-white/90" : "bg-slate-100 text-slate-700"}');
    expect(messagesSource).toContain('rounded-md px-2 py-1 ${thread.key === activeThreadKey ? "bg-white/10 text-white/90" : "bg-slate-100 text-slate-700"}');
    expect(messagesSource).not.toContain("Ref <Link href={`/listings/${inquiry.listingId}`}");
  });

  it("keeps the desktop Message List shorter and independently scrollable than the communication panel", () => {
    expect(messagesSource).toContain("backdrop-blur-sm lg:self-start");
    expect(messagesSource).toContain("h-[52vh] min-h-[22rem] max-h-[32rem]");
    expect(messagesSource).toContain("sm:h-[56vh] lg:h-[48vh] lg:max-h-[34rem]");
    expect(messagesSource).not.toContain('ScrollArea className="h-[70vh]');
  });

  it("opens inquiry Item # details in an accessible inbox-preserving popup", () => {
    expect(messagesSource).toContain('const [previewListingId, setPreviewListingId] = useState<number | null>(null)');
    expect(messagesSource).toContain('trpc.market.listingDetail.useQuery');
    expect(messagesSource).toContain('event.stopPropagation();');
    expect(messagesSource).toContain('setPreviewListingId(inquiry.listingId)');
    expect(messagesSource).toContain('<Dialog open={previewListingId !== null}');
    expect(messagesSource).toContain('max-h-[90dvh] max-w-2xl overflow-y-auto');
    expect(messagesSource).toContain('Review this item without leaving your Messages inbox.');
    expect(messagesSource).toContain('Open full item page');
  });

  it("formats list and detail timestamps with the viewer's local timezone", () => {
    expect(messagesSource).toContain("formatMessageTimestamp(message.createdAt, viewerTimeZone)");
    expect(timestampSource).toContain("normalized.replace(\" \", \"T\")}Z");
    expect(timestampSource).toContain("...(timeZone ? { timeZone } : {})");
    expect(timestampSource).toContain("dateStyle: \"medium\"");
    expect(timestampSource).toContain("timeStyle: \"short\"");
    expect(messagesSource).not.toContain("new Date(message.createdAt).toLocaleString()");
  });
});
