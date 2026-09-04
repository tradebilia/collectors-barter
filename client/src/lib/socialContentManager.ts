export type SocialPlatform = "Facebook" | "Instagram" | "X" | "LinkedIn";
export type DraftStatus = "Draft" | "Needs Review" | "Approved" | "Scheduled" | "Published";

export type SocialDraft = {
  id: string;
  title: string;
  copy: string;
  platforms: SocialPlatform[];
  mediaUrl: string;
  plannedDate: string;
  status: DraftStatus;
  updatedAt: string;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["Facebook", "Instagram", "X", "LinkedIn"];
export const SOCIAL_DRAFT_STATUSES: DraftStatus[] = ["Draft", "Needs Review", "Approved", "Scheduled", "Published"];

export function createSocialDraft(id: string, now = new Date().toISOString()): SocialDraft {
  return { id, title: "Untitled social post", copy: "", platforms: ["Facebook"], mediaUrl: "", plannedDate: "", status: "Draft", updatedAt: now };
}

export function filterSocialDrafts(drafts: readonly SocialDraft[], status: "All" | DraftStatus) {
  return status === "All" ? [...drafts] : drafts.filter((draft) => draft.status === status);
}

export function toggleSocialPlatform(draft: SocialDraft, platform: SocialPlatform, now = new Date().toISOString()): SocialDraft {
  const platforms = draft.platforms.includes(platform)
    ? draft.platforms.filter((item) => item !== platform)
    : [...draft.platforms, platform];
  return { ...draft, platforms, updatedAt: now };
}

export function requestSocialReview(draft: SocialDraft, now = new Date().toISOString()): SocialDraft | null {
  return draft.copy.trim() ? { ...draft, status: "Needs Review", updatedAt: now } : null;
}

export function approveSocialDraft(draft: SocialDraft, now = new Date().toISOString()): SocialDraft {
  return { ...draft, status: "Approved", updatedAt: now };
}
