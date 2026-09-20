import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { renderSocialGraphicCanvas, SOCIAL_GRAPHIC_BRAND_LOGO_URL, SOCIAL_GRAPHIC_HERO_BACKGROUND_URL } from "@/lib/socialGraphicExport";
import type { TradeAlertThemeAssetKey } from "@shared/tradeAlertThemes";
import type { SocialDraft, SocialPlatform } from "@/lib/socialContentManager";

export const SOCIAL_GRAPHIC_SPECS: Record<SocialPlatform, { label: string; size: string; aspect: string; previewClass: string }> = {
  Facebook: { label: "Facebook Feed", size: "1200 × 630", aspect: "aspect-[1.91/1]", previewClass: "max-w-[680px]" },
  Instagram: { label: "Instagram Square", size: "1080 × 1080", aspect: "aspect-square", previewClass: "max-w-[560px]" },
  X: { label: "X Post", size: "1600 × 900", aspect: "aspect-video", previewClass: "max-w-[680px]" },
  Pinterest: { label: "Pinterest Pin", size: "1000 × 1500", aspect: "aspect-[2/3]", previewClass: "max-w-[420px]" },
  LinkedIn: { label: "LinkedIn Feed", size: "1200 × 627", aspect: "aspect-[1.91/1]", previewClass: "max-w-[680px]" },
  YouTube: { label: "YouTube Community", size: "1280 × 720", aspect: "aspect-video", previewClass: "max-w-[680px]" },
};

export function SocialPromotionGraphic({
  draft,
  platform,
  brandLogoUrl = SOCIAL_GRAPHIC_BRAND_LOGO_URL,
  itemImageUrl,
  tradeItemImageUrls = [],
  tradeThemeImageUrls,
  heroBackgroundUrl = SOCIAL_GRAPHIC_HERO_BACKGROUND_URL,
}: {
  draft: SocialDraft;
  platform: SocialPlatform;
  brandLogoUrl?: string;
  itemImageUrl?: string | null;
  tradeItemImageUrls?: Array<string | null>;
  tradeThemeImageUrls?: Partial<Record<TradeAlertThemeAssetKey, string | null>>;
  heroBackgroundUrl?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsRendering(true);
    setPreviewUrl(null);
    void renderSocialGraphicCanvas({
      draft,
      platform,
      itemImageUrl: itemImageUrl ?? draft.mediaUrl ?? null,
      tradeItemImageUrls,
      tradeThemeImageUrls,
      brandLogoUrl,
      heroBackgroundUrl,
    }).then((canvas) => {
      if (!cancelled) {
        setPreviewUrl(canvas.toDataURL("image/png"));
        setIsRendering(false);
      }
    }).catch(() => {
      if (!cancelled) setIsRendering(false);
    });
    return () => { cancelled = true; };
  }, [draft, platform, brandLogoUrl, itemImageUrl, tradeItemImageUrls, tradeThemeImageUrls, heroBackgroundUrl]);

  const spec = SOCIAL_GRAPHIC_SPECS[platform];
  return (
    <div
      className="relative overflow-hidden bg-[#070b18] shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
      aria-label={`${spec.label} promotional graphic preview`}
      data-social-promotion-graphic="true"
      data-platform={platform}
    >
      {previewUrl ? (
        <img src={previewUrl} alt={`${spec.label} finished promotional graphic`} className="block h-auto w-full" />
      ) : (
        <div className="flex aspect-[1.91/1] items-center justify-center text-white/70">
          {isRendering ? <Loader2 className="h-7 w-7 animate-spin" aria-label="Rendering promotional graphic" /> : <span className="text-xs">Preview unavailable</span>}
        </div>
      )}
    </div>
  );
}
