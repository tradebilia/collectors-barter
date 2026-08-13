export type ReportAttachment = {
  key: string;
  url: string;
  name: string;
  type: string;
  size: number;
};

export type ReportEvidencePayload = {
  version: 1;
  notes?: string;
  listingReference?: string;
  contactEmail?: string;
  attachments: ReportAttachment[];
};

export function serializeReportEvidence(payload: Omit<ReportEvidencePayload, "version">): string | undefined {
  const normalized: ReportEvidencePayload = {
    version: 1,
    notes: payload.notes?.trim() || undefined,
    listingReference: payload.listingReference?.trim() || undefined,
    contactEmail: payload.contactEmail?.trim() || undefined,
    attachments: payload.attachments,
  };
  return normalized.notes || normalized.listingReference || normalized.contactEmail || normalized.attachments.length
    ? JSON.stringify(normalized)
    : undefined;
}

export function parseReportEvidence(value?: string | null): ReportEvidencePayload {
  if (!value) return { version: 1, attachments: [] };
  try {
    const parsed = JSON.parse(value) as Partial<ReportEvidencePayload>;
    if (parsed.version === 1 && Array.isArray(parsed.attachments)) {
      return {
        version: 1,
        notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
        listingReference: typeof parsed.listingReference === "string" ? parsed.listingReference : undefined,
        contactEmail: typeof parsed.contactEmail === "string" ? parsed.contactEmail : undefined,
        attachments: parsed.attachments.filter((item): item is ReportAttachment => Boolean(item && typeof item.key === "string" && typeof item.url === "string" && typeof item.name === "string" && typeof item.type === "string" && typeof item.size === "number")),
      };
    }
  } catch {
    // Legacy evidence notes were stored as plain text and remain readable.
  }
  return { version: 1, notes: value, attachments: [] };
}

export function ownsReportAttachment(userId: number, attachment: Pick<ReportAttachment, "key" | "url">): boolean {
  const prefix = `reports/${userId}/`;
  return attachment.key.startsWith(prefix) && attachment.url.startsWith("/manus-storage/");
}
