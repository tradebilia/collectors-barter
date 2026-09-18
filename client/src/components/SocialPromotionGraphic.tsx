import React from "react";
import { ExternalLink, Image as ImageIcon, PlayCircle } from "lucide-react";
import { SOCIAL_GRAPHIC_BRAND_LOGO_URL, SOCIAL_GRAPHIC_HERO_BACKGROUND_URL } from "@/lib/socialGraphicExport";
import { formatSocialItemType, formatSocialValue, getSocialPromotionItemTitle, type SocialDraft, type SocialPlatform } from "@/lib/socialContentManager";

export const SOCIAL_GRAPHIC_SPECS: Record<SocialPlatform, { label: string; size: string; aspect: string; previewClass: string }> = {
  Facebook: { label: "Facebook Feed", size: "1200 × 630", aspect: "aspect-[1.91/1]", previewClass: "max-w-[680px]" },
  Instagram: { label: "Instagram Square", size: "1080 × 1080", aspect: "aspect-square", previewClass: "max-w-[560px]" },
  X: { label: "X Post", size: "1600 × 900", aspect: "aspect-video", previewClass: "max-w-[680px]" },
  Pinterest: { label: "Pinterest Pin", size: "1000 × 1500", aspect: "aspect-[2/3]", previewClass: "max-w-[420px]" },
  LinkedIn: { label: "LinkedIn Feed", size: "1200 × 627", aspect: "aspect-[1.91/1]", previewClass: "max-w-[680px]" },
  YouTube: { label: "YouTube Community", size: "1280 × 720", aspect: "aspect-video", previewClass: "max-w-[680px]" },
};

function isVideoMediaUrl(url: string) {
  return /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(url);
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SocialPromotionGraphic({ draft, platform, brandLogoUrl = SOCIAL_GRAPHIC_BRAND_LOGO_URL }: { draft: SocialDraft; platform: SocialPlatform; brandLogoUrl?: string }) {
  const spec = SOCIAL_GRAPHIC_SPECS[platform];
  const promotion = draft.promotion;
  const itemTitle = getSocialPromotionItemTitle(promotion?.itemTitle || draft.title);
  const promotionHeader = draft.source === "High-Value Listing"
    ? "New High-Value Listing"
    : draft.source === "Completed Trade"
      ? "Completed Trade"
      : "Collectible Showcase";
  const itemType = formatSocialItemType(promotion?.itemType);
  const value = formatSocialValue(promotion?.estimatedValue);
  const facts = promotion?.facts.slice(0, 4) ?? [];
  const isTallCanvas = platform === "Instagram" || platform === "Pinterest";
  const hasMedia = Boolean(draft.mediaUrl);

  return (
    <article
      className={classNames("relative isolate overflow-hidden bg-[#070b18] text-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] [container-type:inline-size]", spec.aspect)}
      aria-label={`${spec.label} promotional graphic preview`}
      data-social-promotion-graphic="true"
      data-platform={platform}
    >
      <div className="absolute inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(3,18,55,0.66),rgba(3,18,55,0.66)), url(${SOCIAL_GRAPHIC_HERO_BACKGROUND_URL})` }} />

      <div className={classNames("relative flex h-full min-h-0", isTallCanvas ? "flex-col p-[6%]" : "p-[4.5%]")}>
        <header className={classNames("flex shrink-0 items-center justify-between gap-3", isTallCanvas ? "mb-[4%]" : "absolute left-[4.5%] right-[4.5%] top-[5%] z-10")}>
          <img src={brandLogoUrl} alt="Tradebilia" className="h-28 w-auto max-w-[55%] shrink-0 object-contain sm:h-32" />
          {promotion?.isNew ? <span className="shrink-0 rounded-full border border-[#f6ca7a]/80 bg-[#f3be63]/20 px-3 py-1.5 text-[clamp(0.5rem,0.9cqw,0.7rem)] font-extrabold uppercase tracking-[0.12em] text-[#ffe0a8]">New High-Value Listing</span> : null}
        </header>

        <div className={classNames("flex min-h-0 flex-1", isTallCanvas ? "flex-col gap-[4%]" : "items-stretch gap-[5%] pt-[11%]")}>
          <div className={classNames("relative flex min-h-0 items-center justify-center overflow-hidden rounded-[1rem] border border-white/15 bg-white/[0.07]", isTallCanvas ? "min-h-0 flex-[1.45] p-[5%]" : "w-[53%] p-[4%]")}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.17),transparent_68%)]" />
            {hasMedia && !isVideoMediaUrl(draft.mediaUrl) ? (
              <img
                src={draft.mediaUrl}
                alt={itemTitle}
                className="relative z-10 block h-full max-h-full w-full max-w-full object-contain"
              />
            ) : hasMedia ? (
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-3 text-center text-white/80">
                <PlayCircle className="h-12 w-12 text-[#f6ca7a]" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">Original video attached</span>
              </div>
            ) : (
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-3 text-center text-white/75">
                <ImageIcon className="h-12 w-12 text-[#f6ca7a]" aria-hidden="true" />
                <span className="max-w-[12rem] text-xs font-semibold uppercase tracking-[0.12em]">Original item media will appear here</span>
              </div>
            )}
          </div>

          <div className={classNames("flex min-w-0 flex-col justify-center", isTallCanvas ? "flex-[0.85]" : "min-w-0 flex-1 pb-[1%]")}>
            <p className="text-[clamp(0.54rem,0.98cqw,0.78rem)] font-extrabold uppercase tracking-[0.16em] text-[#ffe0a8]">{promotionHeader}</p>
            <h2 className="mt-[4%] line-clamp-3 font-serif text-[clamp(1.15rem,2.45cqw,2.25rem)] font-semibold leading-[0.99] tracking-[-0.025em] text-white">{itemTitle}</h2>
            {itemType ? <p className="mt-[4%] text-[clamp(0.58rem,1.1cqw,0.85rem)] font-medium text-white/75">{itemType}</p> : null}
            {facts.length > 0 ? <dl className="mt-[6%] grid grid-cols-2 gap-x-3 gap-y-2 border-y border-white/15 py-[5%]">{facts.map((fact) => <div key={`${fact.label}-${fact.value}`} className="min-w-0"><dt className="text-[clamp(0.43rem,0.7cqw,0.55rem)] font-semibold uppercase tracking-[0.1em] text-[#b9caea]">{fact.label}</dt><dd className="mt-0.5 truncate text-[clamp(0.58rem,1cqw,0.78rem)] font-semibold text-white">{fact.value}</dd></div>)}</dl> : null}
            {value ? <p className="mt-[6%] text-[clamp(0.72rem,1.35cqw,1rem)] font-bold text-[#ffe0a8]">Trade value <span className="text-white">{value}</span></p> : null}
            <div className="mt-[auto] pt-[7%]">
              <p className="flex items-center gap-1.5 text-[clamp(0.52rem,0.84cqw,0.66rem)] font-bold uppercase tracking-[0.12em] text-white"><ExternalLink className="h-3 w-3 shrink-0 text-[#f6ca7a]" aria-hidden="true" />View item profile</p>
              <p className="mt-1 break-all text-[clamp(0.46rem,0.73cqw,0.58rem)] text-white/70">{draft.destinationUrl}</p>
            </div>
          </div>
        </div>

        {!isTallCanvas ? <footer className="absolute bottom-[4.5%] left-[4.5%] right-[4.5%] flex items-center justify-center border-t border-white/15 pt-[2%] text-[clamp(0.42rem,0.67cqw,0.54rem)] font-semibold uppercase tracking-[0.13em] text-white/85"><span>Discover · Trade · Collect</span></footer> : null}
      </div>
    </article>
  );
}
