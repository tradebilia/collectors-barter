import { formatSocialCategory, formatSocialItemType, formatSocialValue, getSocialFooterPhrase, getSocialPromotionItemTitle, type SocialDraft, type SocialPlatform } from "@/lib/socialContentManager";
import { getDisplayedGradingCompany } from "@/lib/gradingDisplay";
import { formatPublicGradeValue } from "@shared/publicGradeValues";
import { resolveTradeAlertTheme, type TradeAlertTheme, type TradeAlertThemeAssetKey } from "@shared/tradeAlertThemes";

export type SocialGraphicCanvasSize = { width: number; height: number };

export const SOCIAL_GRAPHIC_CANVAS_SIZES: Record<SocialPlatform, SocialGraphicCanvasSize> = {
  Facebook: { width: 1200, height: 630 },
  Instagram: { width: 1080, height: 1080 },
  X: { width: 1600, height: 900 },
  Pinterest: { width: 1000, height: 1500 },
  LinkedIn: { width: 1200, height: 627 },
  YouTube: { width: 1280, height: 720 },
};

type CanvasImage = HTMLImageElement;

const CANVAS_SANS_FONT = 'Inter, Arial, sans-serif';
const CANVAS_TRADE_DISPLAY_FONT = 'Anton, "Arial Narrow", Arial, sans-serif';

/**
 * Canvas does not wait for CSS font downloads. Explicitly loading the two
 * production faces before drawing prevents a temporary system fallback from
 * being rasterized into the preview/download, which was the source of the
 * soft, mismatched completed-trade lettering.
 */
async function ensureSocialCanvasFonts() {
  if (!("fonts" in document)) return;
  await Promise.all([
    document.fonts.load('400 44px "Anton"'),
    document.fonts.load('700 18px "Inter"'),
    document.fonts.ready,
  ]);
}

/** Draw glyphs on whole-pixel baselines so smaller social exports stay crisp. */
function drawCrispText(context: CanvasRenderingContext2D, text: string, x: number, y: number) {
  context.fillText(text, Math.round(x), Math.round(y));
}

export const SOCIAL_GRAPHIC_HERO_BACKGROUND_URL = "/manus-storage/generated-social-background-fuller_2df3107e.jpg";
export const SOCIAL_GRAPHIC_BRAND_LOGO_URL = "/manus-storage/tradebilia-logo-cropped_8932eaec.svg";

/** Curated environments support the real listing photo; they never replace it. */
export const TRADE_ALERT_THEME_IMAGE_URLS: Partial<Record<TradeAlertThemeAssetKey, string>> = {
  sports_cards: "/manus-storage/sports-cards-environment_6e52200c.jpg",
  comics: "/manus-storage/comics-environment_1a659781.jpg",
  pokemon: "/manus-storage/pokemon-tcg-environment_f2d6c424.jpg",
  vintage_toys: "/manus-storage/vintage-toys-environment_58156f60.jpg",
  video_games: "/manus-storage/video-games-environment_01ecd5a6.jpg",
  coins: "/manus-storage/coins-environment_7ac34b5a.jpg",
  stamps: "/manus-storage/stamps-environment_489a6ec6.jpg",
  movies: "/manus-storage/movies-environment_86ce2916.jpg",
  music: "/manus-storage/music-environment_aa86ec01.jpg",
  autographs: "/manus-storage/autographs-environment_fbaeee1f.jpg",
  disney_pins: "/manus-storage/disney-pins-environment_c041b8f7.jpg",
};

type SocialGraphicExportInput = {
  draft: SocialDraft;
  platform: SocialPlatform;
  itemImageUrl?: string | null;
  tradeItemImageUrls?: Array<string | null>;
  tradeThemeImageUrls?: Partial<Record<TradeAlertThemeAssetKey, string | null>>;
  brandLogoUrl?: string | null;
  heroBackgroundUrl?: string | null;
};

function isTallCanvas(platform: SocialPlatform) {
  return platform === "Instagram" || platform === "Pinterest";
}

function isVideoMediaUrl(url: string | null | undefined) {
  return Boolean(url && /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(url));
}

function roundedRectPath(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const corner = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + corner, y);
  context.arcTo(x + width, y, x + width, y + height, corner);
  context.arcTo(x + width, y + height, x, y + height, corner);
  context.arcTo(x, y + height, x, y, corner);
  context.arcTo(x, y, x + width, y, corner);
  context.closePath();
}

function drawRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string) {
  roundedRectPath(context, x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.stroke();
  }
}

function drawContainedImage(context: CanvasRenderingContext2D, image: CanvasImage, x: number, y: number, width: number, height: number) {
  const naturalWidth = image.naturalWidth || 1;
  const naturalHeight = image.naturalHeight || 1;
  const scale = Math.min(width / naturalWidth, height / naturalHeight);
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function loadCanvasImage(source: string | null | undefined, required = false): Promise<CanvasImage | null> {
  if (!source) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => required ? reject(new Error("The prepared item image could not be rendered for export.")) : resolve(null);
    image.src = source;
  });
}

function splitLine(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    if (lines.length === maxLines - 1) {
      const ellipsisLine = `${line.replace(/[.…]+$/, "")}…`;
      return [...lines, ellipsisLine];
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const lines = splitLine(context, text, maxWidth, maxLines);
  lines.forEach((line, index) => drawCrispText(context, line, x, y + index * lineHeight));
  return lines.length * lineHeight;
}

function wrapCompleteText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function getCompleteFittedTitleLayout(context: CanvasRenderingContext2D, text: string, maxWidth: number, preferredSize: number, minimumSize: number, preferredMaxLines: number) {
  let fontSize = preferredSize;
  let lines: string[] = [];
  while (fontSize >= minimumSize) {
    context.font = `600 ${Math.round(fontSize)}px Georgia, serif`;
    lines = wrapCompleteText(context, text, maxWidth);
    if (lines.length <= preferredMaxLines) break;
    fontSize -= 2;
  }
  context.font = `600 ${Math.round(fontSize)}px Georgia, serif`;
  const lineHeight = Math.round(fontSize * 1.04);
  return { fontSize, lines, lineHeight, height: lines.length * lineHeight };
}

function drawCompleteFittedTitle(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, preferredSize: number, minimumSize: number, preferredMaxLines: number) {
  const { fontSize, lines, lineHeight, height } = getCompleteFittedTitleLayout(context, text, maxWidth, preferredSize, minimumSize, preferredMaxLines);
  context.font = `600 ${Math.round(fontSize)}px Georgia, serif`;
  lines.forEach((line, index) => drawCrispText(context, line, x, y + index * lineHeight));
  return height;
}

function drawBackground(context: CanvasRenderingContext2D, width: number, height: number, heroBackground: CanvasImage | null) {
  if (heroBackground) {
    context.drawImage(heroBackground, 0, 0, width, height);
    context.fillStyle = "rgba(3, 18, 55, 0.66)";
    context.fillRect(0, 0, width, height);
    return;
  }
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#090e20");
  background.addColorStop(0.54, "#172348");
  background.addColorStop(1, "#07101c");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const violet = context.createRadialGradient(width * 0.04, height * 0.02, 0, width * 0.04, height * 0.02, width * 0.48);
  violet.addColorStop(0, "rgba(87, 47, 218, 0.78)");
  violet.addColorStop(1, "rgba(87, 47, 218, 0)");
  context.fillStyle = violet;
  context.fillRect(0, 0, width, height);

  const cyan = context.createRadialGradient(width, height, 0, width, height, width * 0.42);
  cyan.addColorStop(0, "rgba(10, 178, 218, 0.72)");
  cyan.addColorStop(1, "rgba(10, 178, 218, 0)");
  context.fillStyle = cyan;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255,255,255,0.30)";
  for (let index = 0; index < 96; index += 1) {
    const x = ((index * 131) % width) + 0.5;
    const y = ((index * 71) % height) + 0.5;
    const radius = index % 7 === 0 ? 1.5 : 0.8;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawCoverImage(context: CanvasRenderingContext2D, image: CanvasImage, x: number, y: number, width: number, height: number, focalX = 0.5) {
  const naturalWidth = image.naturalWidth || 1;
  const naturalHeight = image.naturalHeight || 1;
  const scale = Math.max(width / naturalWidth, height / naturalHeight);
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;
  const overflowX = Math.max(0, drawWidth - width);
  const overflowY = Math.max(0, drawHeight - height);
  context.drawImage(image, x - overflowX * focalX, y - overflowY / 2, drawWidth, drawHeight);
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return `rgba(7, 17, 38, ${alpha})`;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/** A consistent Tradebilia exchange stage; collectible identity lives in the side environments. */
function drawTradeStage(context: CanvasRenderingContext2D, width: number, height: number, themes: TradeAlertTheme[]) {
  const uniqueThemeKeys = Array.from(new Set(themes.map((theme) => theme.key)));
  const stage = context.createLinearGradient(0, 0, width, height);
  stage.addColorStop(0, uniqueThemeKeys.length === 1 ? withAlpha(themes[0]?.primary ?? "#163d62", 0.88) : "#08142b");
  stage.addColorStop(0.52, "#07142a");
  stage.addColorStop(1, uniqueThemeKeys.length === 1 ? withAlpha(themes[0]?.secondary ?? "#1a2749", 0.9) : "#102344");
  context.fillStyle = stage;
  context.fillRect(0, 0, width, height);

  const centerLight = context.createRadialGradient(width / 2, height * 0.43, 0, width / 2, height * 0.43, width * 0.48);
  centerLight.addColorStop(0, "rgba(43, 104, 174, 0.28)");
  centerLight.addColorStop(0.58, "rgba(8, 23, 51, 0.18)");
  centerLight.addColorStop(1, "rgba(4, 11, 27, 0.86)");
  context.fillStyle = centerLight;
  context.fillRect(0, 0, width, height);

  context.save();
  context.strokeStyle = "rgba(104, 185, 239, 0.08)";
  context.lineWidth = 1;
  const grid = Math.max(34, width / 24);
  for (let x = -height; x < width + height; x += grid) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + height * 0.32, height);
    context.stroke();
  }
  context.restore();
}

function drawTradeItemEnvironment(context: CanvasRenderingContext2D, theme: TradeAlertTheme, image: CanvasImage | null, x: number, y: number, width: number, height: number, focalX: number) {
  context.save();
  roundedRectPath(context, x, y, width, height, Math.max(16, width * 0.035));
  context.clip();
  if (image) {
    context.globalAlpha = 0.62;
    drawCoverImage(context, image, x, y, width, height, focalX);
    context.globalAlpha = 1;
  }

  const wash = context.createLinearGradient(x, y, x + width, y + height);
  wash.addColorStop(0, withAlpha(theme.primary, 0.56));
  wash.addColorStop(0.52, "rgba(5, 16, 36, 0.42)");
  wash.addColorStop(1, withAlpha(theme.secondary, 0.60));
  context.fillStyle = wash;
  context.fillRect(x, y, width, height);

  context.strokeStyle = withAlpha(theme.glow, 0.22);
  context.fillStyle = withAlpha(theme.glow, 0.14);
  context.lineWidth = Math.max(1, width * 0.004);
  if (theme.motif === "field") {
    for (let row = 1; row < 5; row += 1) {
      const lineY = y + (height / 5) * row;
      context.beginPath();
      context.moveTo(x, lineY);
      context.lineTo(x + width, lineY);
      context.stroke();
    }
    const motifX = x + width * 0.14;
    const motifY = y + height * 0.20;
    const motifSize = Math.min(width, height) * 0.16;
    context.strokeStyle = withAlpha(theme.glow, 0.28);
    context.lineWidth = Math.max(1, motifSize * 0.08);
    if (theme.key === "sports-baseball") {
      context.beginPath();
      context.arc(motifX, motifY, motifSize, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([motifSize * 0.18, motifSize * 0.16]);
      context.beginPath();
      context.arc(motifX, motifY, motifSize * 0.68, -1.15, 1.15);
      context.stroke();
      context.setLineDash([]);
    } else if (theme.key === "sports-football") {
      context.save();
      context.translate(motifX, motifY);
      context.rotate(-0.45);
      context.beginPath();
      context.ellipse(0, 0, motifSize * 1.18, motifSize * 0.68, 0, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(-motifSize * 0.44, 0);
      context.lineTo(motifSize * 0.44, 0);
      context.stroke();
      context.restore();
    } else if (theme.key === "sports-basketball") {
      context.beginPath();
      context.arc(motifX, motifY, motifSize, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(motifX - motifSize, motifY);
      context.lineTo(motifX + motifSize, motifY);
      context.moveTo(motifX, motifY - motifSize);
      context.lineTo(motifX, motifY + motifSize);
      context.stroke();
    } else if (theme.key === "sports-hockey") {
      context.fillStyle = withAlpha(theme.glow, 0.22);
      context.beginPath();
      context.ellipse(motifX, motifY, motifSize * 1.2, motifSize * 0.36, 0, 0, Math.PI * 2);
      context.fill();
    }
  } else if (theme.motif === "halftone" || theme.motif === "facets") {
    const spacing = Math.max(16, width * 0.11);
    for (let dotX = x + spacing / 2; dotX < x + width; dotX += spacing) {
      for (let dotY = y + spacing / 2; dotY < y + height; dotY += spacing) {
        context.beginPath();
        context.arc(dotX, dotY, Math.max(1.4, spacing * 0.075), 0, Math.PI * 2);
        context.fill();
      }
    }
  } else if (theme.motif === "rings" || theme.motif === "grooves") {
    const centerX = x + width * 0.5;
    const centerY = y + height * 0.44;
    for (let radius = Math.min(width, height) * 0.16; radius < Math.max(width, height) * 0.72; radius += Math.max(12, width * 0.1)) {
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.stroke();
    }
  } else if (theme.motif === "scanlines" || theme.motif === "perforation") {
    const spacing = Math.max(10, height * 0.055);
    context.setLineDash(theme.motif === "perforation" ? [4, 6] : []);
    for (let lineY = y + spacing; lineY < y + height; lineY += spacing) {
      context.beginPath();
      context.moveTo(x, lineY);
      context.lineTo(x + width, lineY);
      context.stroke();
    }
    context.setLineDash([]);
  } else if (theme.motif === "shelves" || theme.motif === "marquee") {
    const spacing = Math.max(30, height * 0.23);
    for (let lineY = y + spacing; lineY < y + height; lineY += spacing) {
      context.beginPath();
      context.moveTo(x + width * 0.06, lineY);
      context.lineTo(x + width * 0.94, lineY);
      context.stroke();
    }
  } else if (theme.motif === "archive" || theme.motif === "lattice" || theme.motif === "grid") {
    const spacing = Math.max(26, width * 0.16);
    for (let line = -height; line < width + height; line += spacing) {
      context.beginPath();
      context.moveTo(x + line, y);
      context.lineTo(x + line - height * 0.38, y + height);
      context.stroke();
    }
  }

  const vignette = context.createRadialGradient(x + width / 2, y + height / 2, Math.min(width, height) * 0.15, x + width / 2, y + height / 2, Math.max(width, height) * 0.74);
  vignette.addColorStop(0, "rgba(4, 12, 28, 0)");
  vignette.addColorStop(1, "rgba(2, 8, 20, 0.76)");
  context.fillStyle = vignette;
  context.fillRect(x, y, width, height);
  context.restore();
}

function drawBrand(context: CanvasRenderingContext2D, logo: CanvasImage | null, x: number, y: number, width: number, height: number) {
  if (logo) {
    drawContainedImage(context, logo, x, y, width, height);
    return;
  }
  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.round(height * 0.54)}px ${CANVAS_SANS_FONT}`;
  drawCrispText(context, "TRADEBILIA", x, y + height * 0.72);
}

function drawCenteredBrand(context: CanvasRenderingContext2D, logo: CanvasImage | null, width: number, y: number, scale: number) {
  const brandWidth = 360 * scale;
  const brandHeight = 64 * scale;
  // The supplied transparent mark carries a little more visual mass on its
  // right side, so this small optical correction keeps the artwork centered.
  drawBrand(context, logo, (width - brandWidth) / 2 - 6 * scale, y, brandWidth, brandHeight);
}

/** Adds the faint electric-blue rules framing the completed-trade logo. */
function drawTradeBrandAccentLines(context: CanvasRenderingContext2D, width: number, brandY: number, scale: number) {
  const brandWidth = 360 * scale;
  const brandX = (width - brandWidth) / 2 - 6 * scale;
  const lineY = brandY + 32 * scale;
  const gap = 16 * scale;
  const outerInset = 30 * scale;

  context.save();
  context.lineWidth = Math.max(1, 1.25 * scale);
  context.shadowColor = "rgba(49, 185, 255, 0.54)";
  context.shadowBlur = 5 * scale;
  const drawLine = (startX: number, endX: number, reverse: boolean) => {
    const line = context.createLinearGradient(startX, lineY, endX, lineY);
    if (reverse) {
      line.addColorStop(0, "rgba(70, 197, 255, 0)");
      line.addColorStop(0.68, "rgba(70, 197, 255, 0.72)");
      line.addColorStop(1, "rgba(161, 229, 255, 0.94)");
    } else {
      line.addColorStop(0, "rgba(161, 229, 255, 0.94)");
      line.addColorStop(0.32, "rgba(70, 197, 255, 0.72)");
      line.addColorStop(1, "rgba(70, 197, 255, 0)");
    }
    context.strokeStyle = line;
    context.beginPath();
    context.moveTo(startX, lineY);
    context.lineTo(endX, lineY);
    context.stroke();
  };
  drawLine(outerInset, brandX - gap, true);
  drawLine(brandX + brandWidth + gap, width - outerInset, false);
  context.restore();
}

/**
 * Draws the brand and footer as two separate zones. The divider is always
 * below the full logo lockup, leaving the phrase in its own lower band.
 */
function drawBrandFooter(
  context: CanvasRenderingContext2D,
  draft: SocialDraft,
  platform: SocialPlatform,
  logo: CanvasImage | null,
  width: number,
  height: number,
  padding: number,
  scale: number,
  dividerOffset: number,
  phraseOffset: number,
) {
  const brandHeight = 64 * scale;
  const dividerY = height - dividerOffset * scale;
  const brandY = dividerY - brandHeight - 16 * scale;

  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.beginPath();
  context.moveTo(padding, dividerY);
  context.lineTo(width - padding, dividerY);
  context.stroke();

  if (draft.source === "Completed Trade") {
    drawTradeBrandAccentLines(context, width, brandY, scale);
  }
  drawCenteredBrand(context, logo, width, brandY, scale);
  context.fillStyle = "rgba(255,255,255,0.85)";
  context.font = `700 ${Math.round(12 * scale)}px ${CANVAS_SANS_FONT}`;
  context.textAlign = "center";
  drawCrispText(context, getSocialFooterPhrase(draft.id, platform).toUpperCase(), width / 2, height - phraseOffset * scale);
  context.textAlign = "left";
}

/** Completed trades use a clear action zone while preserving the logo above the divider. */
function drawTradeBrandFooter(
  context: CanvasRenderingContext2D,
  logo: CanvasImage | null,
  width: number,
  height: number,
  padding: number,
  scale: number,
  dividerOffset: number,
) {
  const brandHeight = 64 * scale;
  const dividerY = height - dividerOffset * scale;
  const brandY = dividerY - brandHeight - 16 * scale;

  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.beginPath();
  context.moveTo(padding, dividerY);
  context.lineTo(width - padding, dividerY);
  context.stroke();
  drawTradeBrandAccentLines(context, width, brandY, scale);
  drawCenteredBrand(context, logo, width, brandY, scale);

  const label = "VIEW THIS TRADE ON TRADEBILIA";
  context.font = `800 ${Math.max(10, Math.round(12 * scale))}px ${CANVAS_SANS_FONT}`;
  const buttonWidth = Math.min(width - padding * 2, context.measureText(label).width + 70 * scale);
  const buttonHeight = 30 * scale;
  const buttonX = (width - buttonWidth) / 2;
  const buttonY = dividerY + 11 * scale;
  drawRoundedRect(context, buttonX, buttonY, buttonWidth, buttonHeight, buttonHeight / 2, "#f4c94d");
  context.fillStyle = "#102343";
  context.textAlign = "center";
  context.textBaseline = "middle";
  drawCrispText(context, label, width / 2, buttonY + buttonHeight / 2 + 0.25 * scale);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

function drawCenteredPromotionHeader(context: CanvasRenderingContext2D, label: string, width: number, y: number, scale: number) {
  context.font = `800 ${Math.round(35 * scale)}px ${CANVAS_SANS_FONT}`;
  const bannerWidth = Math.min(width - 2 * 44 * scale, context.measureText(label).width + 96 * scale);
  drawPromotionHeader(context, label, (width - bannerWidth) / 2, y, scale, bannerWidth);
}

function getTrackedTextWidth(context: CanvasRenderingContext2D, text: string, tracking: number) {
  if (text.length <= 1) return context.measureText(text).width;
  return Array.from(text).reduce((total, character) => total + context.measureText(character).width, 0) + tracking * (text.length - 1);
}

function drawTrackedText(context: CanvasRenderingContext2D, text: string, centerX: number, y: number, tracking: number) {
  let cursorX = centerX - getTrackedTextWidth(context, text, tracking) / 2;
  Array.from(text).forEach((character) => {
    drawCrispText(context, character, cursorX, y);
    cursorX += context.measureText(character).width + tracking;
  });
}

function drawTradeAlertHeader(context: CanvasRenderingContext2D, width: number, y: number, scale: number) {
  const label = "TRADE ALERT";
  context.font = `400 ${Math.round(56 * scale)}px ${CANVAS_TRADE_DISPLAY_FONT}`;
  const tracking = 0.28 * scale;
  const bannerWidth = Math.min(width - 2 * 44 * scale, Math.max(width * 0.47, getTrackedTextWidth(context, label, tracking) + 112 * scale));
  const bannerX = (width - bannerWidth) / 2;
  const height = 88 * scale;
  const bannerY = y - height + 7 * scale;
  drawRoundedRect(context, bannerX, bannerY, bannerWidth, height, height / 2, "rgba(10, 26, 52, 0.42)", "rgba(246,202,122,0.92)");
  context.fillStyle = "#ffda64";
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  // The visual glyph bounds of Anton are not centered on a "middle" baseline.
  // Center by the measured ascent/descent so the gold pill is even around the
  // actual letters, not merely the font's line box.
  const metrics = context.measureText(label);
  const ascent = metrics.actualBoundingBoxAscent || 40 * scale;
  const descent = metrics.actualBoundingBoxDescent || 12 * scale;
  const textBaseline = bannerY + height / 2 + (ascent - descent) / 2;
  drawTrackedText(context, label, width / 2, textBaseline, tracking);
  context.fillStyle = "rgba(244, 232, 202, 0.88)";
  context.font = `700 ${Math.max(9, Math.round(11 * scale))}px ${CANVAS_SANS_FONT}`;
  drawTrackedText(context, "REAL COLLECTIBLES • REAL TRADES • REAL PEOPLE", width / 2, y + 26 * scale, 1.35 * scale);
  context.textBaseline = "alphabetic";
}

function getPromotionHeader(draft: SocialDraft, category: string | null) {
  if (draft.source === "High-Value Listing") return "NEW HIGH-VALUE LISTING";
  if (draft.source === "Completed Trade") return "TRADE ALERT";
  return category?.toUpperCase() || "COLLECTIBLE SHOWCASE";
}

function drawPromotionHeader(context: CanvasRenderingContext2D, label: string, x: number, y: number, scale: number, forcedWidth?: number) {
  context.font = `800 ${Math.round(28 * scale)}px Arial, sans-serif`;
  const width = forcedWidth ?? context.measureText(label).width + 48 * scale;
  const height = 58 * scale;
  drawRoundedRect(context, x, y - height + 7 * scale, width, height, height / 2, "rgba(246,202,122,0.18)", "rgba(246,202,122,0.86)");
  context.fillStyle = "#ffd45a";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, x + width / 2, y - height / 2 + 7 * scale);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

function drawMediaFrame(context: CanvasRenderingContext2D, image: CanvasImage | null, x: number, y: number, width: number, height: number, label: string) {
  drawRoundedRect(context, x, y, width, height, Math.max(16, width * 0.035), "rgba(255,255,255,0.07)", "rgba(255,255,255,0.22)");
  context.save();
  roundedRectPath(context, x + 10, y + 10, width - 20, height - 20, Math.max(10, width * 0.022));
  context.clip();
  if (image) {
    drawContainedImage(context, image, x + 18, y + 18, width - 36, height - 36);
  } else {
    context.fillStyle = "rgba(255,255,255,0.10)";
    context.fillRect(x + 10, y + 10, width - 20, height - 20);
    context.fillStyle = "rgba(255,255,255,0.78)";
    context.font = `600 ${Math.max(15, Math.round(width * 0.04))}px Arial, sans-serif`;
    context.textAlign = "center";
    context.fillText(label, x + width / 2, y + height / 2);
    context.textAlign = "left";
  }
  context.restore();
}

type TradeGraphicEntry = {
  item: {
    listingId?: number | null;
    title: string;
    estimatedValue?: number | null;
    category?: string | null;
    itemType?: string | null;
    visualHints?: string[] | null;
    facts?: Array<{ label: string; value: string }> | null;
    grade?: string | number | null;
    certificationCompany?: string | null;
    customGradingCompany?: string | null;
  };
  index: number;
};

type TradeThemeImages = Partial<Record<TradeAlertThemeAssetKey, CanvasImage | null>>;

function getTradeItemTheme(item: TradeGraphicEntry["item"]) {
  return resolveTradeAlertTheme({
    category: item.category,
    itemType: item.itemType,
    title: item.title,
    visualHints: item.visualHints,
  });
}

export function getTradeItemGradeLine(item: TradeGraphicEntry["item"]) {
  const grade = formatPublicGradeValue(item.grade);
  if (!grade) return null;
  return `${getDisplayedGradingCompany(item.certificationCompany, item.customGradingCompany)} ${grade}`;
}

export function getTradeItemFactLine(item: TradeGraphicEntry["item"]) {
  const gradeLabels = new Set(["grade", "grading company"]);
  const values = (item.facts ?? [])
    .filter((fact) => fact?.value && !gradeLabels.has(fact.label.trim().toLowerCase()))
    .slice(0, 2)
    .map((fact) => fact.value.trim())
    .filter(Boolean);
  return values.length ? values.join(" • ") : null;
}

/** Matches the category-tinted, outlined grade badges used by the homepage carousel. */
export function getTradeGradeBadgeStyle(category?: string | null) {
  const normalized = category?.trim().toLowerCase() || "";
  if (normalized.includes("sport")) return { fill: "#fee2e2", stroke: "#fecaca", text: "#991b1b" };
  if (normalized.includes("comic")) return { fill: "#ede9fe", stroke: "#ddd6fe", text: "#5b21b6" };
  if (normalized.includes("pokemon")) return { fill: "#fef9c3", stroke: "#fde68a", text: "#854d0e" };
  if (normalized.includes("coin") || normalized.includes("toy")) return { fill: "#fef3c7", stroke: "#fde68a", text: "#92400e" };
  if (normalized.includes("stamp")) return { fill: "#e0f2fe", stroke: "#bae6fd", text: "#075985" };
  if (normalized.includes("game")) return { fill: "#e0e7ff", stroke: "#c7d2fe", text: "#3730a3" };
  if (normalized.includes("movie")) return { fill: "#ffe4e6", stroke: "#fecdd3", text: "#9f1239" };
  if (normalized.includes("autograph")) return { fill: "#f3e8ff", stroke: "#e9d5ff", text: "#6b21a8" };
  if (normalized.includes("disney")) return { fill: "#fce7f3", stroke: "#fbcfe8", text: "#9d174d" };
  return { fill: "#dbeafe", stroke: "#bfdbfe", text: "#1e40af" };
}

function drawTradeItemCaption(context: CanvasRenderingContext2D, item: TradeGraphicEntry["item"], centerX: number, y: number, width: number, scale: number, maxLines: number, fontSize: number) {
  context.save();
  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.round(fontSize * scale)}px ${CANVAS_SANS_FONT}`;
  context.textAlign = "center";
  const lineHeight = fontSize * 1.16 * scale;
  const titleLines = splitLine(context, item.title, width, maxLines);
  titleLines.forEach((line, index) => drawCrispText(context, line, centerX, y + index * lineHeight));
  const factLine = getTradeItemFactLine(item);
  const factY = y + titleLines.length * lineHeight + 5 * scale;
  if (factLine) {
    context.fillStyle = "rgba(229, 237, 249, 0.86)";
    context.font = `600 ${Math.max(7, Math.round((fontSize - 2) * scale))}px ${CANVAS_SANS_FONT}`;
    const trimmedFactLine = splitLine(context, factLine, width, 1)[0] ?? "";
    drawCrispText(context, trimmedFactLine, centerX, factY);
  }
  const gradeLine = getTradeItemGradeLine(item);
  if (gradeLine) {
    const gradeFontSize = Math.max(8, Math.round((fontSize - 1) * scale));
    context.font = `800 ${gradeFontSize}px ${CANVAS_SANS_FONT}`;
    const badgePaddingX = 6 * scale;
    const badgeHeight = Math.max(14 * scale, gradeFontSize * 1.7);
    const badgeWidth = Math.min(width, context.measureText(gradeLine).width + badgePaddingX * 2);
    const badgeY = factY + (factLine ? Math.max(11, (fontSize - 1) * scale) : 3 * scale);
    const badge = getTradeGradeBadgeStyle(item.category);
    drawRoundedRect(context, centerX - badgeWidth / 2, badgeY, badgeWidth, badgeHeight, Math.max(3 * scale, badgeHeight * 0.22), badge.fill, badge.stroke);
    context.fillStyle = badge.text;
    context.textBaseline = "middle";
    drawCrispText(context, gradeLine, centerX, badgeY + badgeHeight / 2);
    context.textBaseline = "alphabetic";
  }
  context.restore();
}

function drawTradeMediaCell(
  context: CanvasRenderingContext2D,
  entry: TradeGraphicEntry,
  image: CanvasImage | null,
  themeImages: TradeThemeImages,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  maxCaptionLines: number,
  captionFontSize: number,
) {
  const captionLineHeight = captionFontSize * 1.16 * scale;
  const captionTopGap = 22 * scale;
  context.font = `700 ${Math.round(captionFontSize * scale)}px ${CANVAS_SANS_FONT}`;
  const actualCaptionLines = Math.max(1, splitLine(context, entry.item.title, width - 8 * scale, maxCaptionLines).length);
  const factReserve = getTradeItemFactLine(entry.item) ? Math.max(11 * scale, (captionFontSize - 1) * scale) + 5 * scale : 0;
  const gradeReserve = getTradeItemGradeLine(entry.item) ? Math.max(14 * scale, (captionFontSize - 1) * 1.7 * scale) + 8 * scale : 0;
  const captionReserve = captionTopGap + actualCaptionLines * captionLineHeight + factReserve + gradeReserve + 8 * scale;
  const imageHeight = Math.max(38 * scale, height - captionReserve);
  const theme = getTradeItemTheme(entry.item);
  drawTradeItemEnvironment(context, theme, themeImages[theme.assetKey] ?? null, x, y, width, imageHeight, entry.index % 2 ? 0.7 : 0.3);
  if (image) {
    drawContainedImage(context, image, x + 8 * scale, y + 8 * scale, width - 16 * scale, imageHeight - 16 * scale);
  } else {
    context.fillStyle = "rgba(255,255,255,0.12)";
    context.fillRect(x + 10 * scale, y + 10 * scale, width - 20 * scale, imageHeight - 20 * scale);
  }
  drawTradeItemCaption(context, entry.item, x + width / 2, y + imageHeight + captionTopGap, width - 8 * scale, scale, maxCaptionLines, captionFontSize);
}

function drawTradeSide(context: CanvasRenderingContext2D, entries: TradeGraphicEntry[], images: Array<CanvasImage | null>, themeImages: TradeThemeImages, x: number, y: number, width: number, height: number, scale: number) {
  drawRoundedRect(context, x, y, width, height, Math.max(16, width * 0.035), "rgba(255,255,255,0.07)", "rgba(255,255,255,0.22)");
  const innerX = x + 18 * scale;
  const innerY = y + 18 * scale;
  const innerWidth = width - 36 * scale;
  const innerHeight = height - 32 * scale;
  const itemEntries = entries.slice(0, 4);

  if (itemEntries.length === 1) {
    drawTradeMediaCell(context, itemEntries[0], images[itemEntries[0].index] ?? null, themeImages, innerX, innerY, innerWidth, innerHeight, scale, 3, 14);
    return;
  }

  if (itemEntries.length === 2) {
    const cellGap = 10 * scale;
    const cellHeight = (innerHeight - cellGap) / 2;
    itemEntries.forEach((entry, index) => {
      drawTradeMediaCell(context, entry, images[entry.index] ?? null, themeImages, innerX, innerY + index * (cellHeight + cellGap), innerWidth, cellHeight, scale, 2, 10.5);
    });
    return;
  }

  if (itemEntries.length === 3) {
    const cellGap = 12 * scale;
    const leadWidth = (innerWidth - cellGap) / 2;
    drawTradeMediaCell(context, itemEntries[0], images[itemEntries[0].index] ?? null, themeImages, innerX, innerY, leadWidth, innerHeight, scale, 3, 10.5);
    const stackedX = innerX + leadWidth + cellGap;
    const stackedHeight = (innerHeight - cellGap) / 2;
    itemEntries.slice(1).forEach((entry, index) => {
      drawTradeMediaCell(context, entry, images[entry.index] ?? null, themeImages, stackedX, innerY + index * (stackedHeight + cellGap), leadWidth, stackedHeight, scale, 2, 9);
    });
    return;
  }

  const cellGap = 10 * scale;
  const cellWidth = (innerWidth - cellGap) / 2;
  const cellHeight = (innerHeight - cellGap) / 2;
  itemEntries.forEach((entry, index) => {
    drawTradeMediaCell(context, entry, images[entry.index] ?? null, themeImages, innerX + (index % 2) * (cellWidth + cellGap), innerY + Math.floor(index / 2) * (cellHeight + cellGap), cellWidth, cellHeight, scale, 2, 8.5);
  });
}

function drawTradeDirection(context: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number, cashIncluded: boolean) {
  context.save();
  context.textAlign = "center";
  context.fillStyle = "#ffd45a";
  context.shadowColor = "rgba(255, 188, 54, 0.40)";
  context.shadowBlur = 0;
  context.font = `400 ${Math.round(50 * scale)}px ${CANVAS_TRADE_DISPLAY_FONT}`;
  drawTrackedText(context, "TRADED", centerX, centerY - 20 * scale, 0.24 * scale);
  context.shadowBlur = 0;

  const arrowWidth = 72 * scale;
  const arrowHeight = 14 * scale;
  const arrowHead = 22 * scale;
  const drawArrow = (y: number, pointsRight: boolean) => {
    const start = centerX - arrowWidth / 2;
    const end = centerX + arrowWidth / 2;
    const gradient = context.createLinearGradient(start, y, end, y);
    if (pointsRight) {
      // The trailing end fades into the background while the active arrowhead
      // remains bright, matching the supplied completed-trade reference.
      gradient.addColorStop(0, "rgba(255, 185, 46, 0)");
      gradient.addColorStop(0.48, "rgba(255, 191, 46, 0.48)");
      gradient.addColorStop(0.78, "#fff0a0");
      gradient.addColorStop(1, "#ffd45a");
    } else {
      gradient.addColorStop(0, "#ffd45a");
      gradient.addColorStop(0.22, "#fff0a0");
      gradient.addColorStop(0.52, "rgba(255, 191, 46, 0.48)");
      gradient.addColorStop(1, "rgba(255, 185, 46, 0)");
    }
    context.fillStyle = gradient;
    context.beginPath();
    if (pointsRight) {
      context.moveTo(start, y - arrowHeight / 2);
      context.lineTo(end - arrowHead, y - arrowHeight / 2);
      context.lineTo(end - arrowHead, y - arrowHeight);
      context.lineTo(end, y);
      context.lineTo(end - arrowHead, y + arrowHeight);
      context.lineTo(end - arrowHead, y + arrowHeight / 2);
      context.lineTo(start, y + arrowHeight / 2);
    } else {
      context.moveTo(end, y - arrowHeight / 2);
      context.lineTo(start + arrowHead, y - arrowHeight / 2);
      context.lineTo(start + arrowHead, y - arrowHeight);
      context.lineTo(start, y);
      context.lineTo(start + arrowHead, y + arrowHeight);
      context.lineTo(start + arrowHead, y + arrowHeight / 2);
      context.lineTo(end, y + arrowHeight / 2);
    }
    context.closePath();
    context.fill();
  };
  drawArrow(centerY + 5 * scale, true);
  drawArrow(centerY + 31 * scale, false);
  if (cashIncluded) {
    context.fillStyle = "#fff0b5";
    context.font = `700 ${Math.round(14 * scale)}px ${CANVAS_SANS_FONT}`;
    drawCrispText(context, "CASH INCLUDED", centerX, centerY + 59 * scale);
  }
  context.restore();
}

function getTradeSides(draft: SocialDraft) {
  const sortByValue = (a: TradeGraphicEntry, b: TradeGraphicEntry) => Number(b.item.estimatedValue ?? 0) - Number(a.item.estimatedValue ?? 0);
  const entries = (draft.promotion?.tradeItems ?? []).map((item, index) => ({ item, index }));
  return {
    offered: entries.filter(({ item }) => item.direction === "offered").sort(sortByValue),
    requested: entries.filter(({ item }) => item.direction !== "offered").sort(sortByValue),
  };
}

function drawCompletedTradeSideBySide(
  context: CanvasRenderingContext2D,
  draft: SocialDraft,
  platform: SocialPlatform,
  width: number,
  height: number,
  images: Array<CanvasImage | null>,
  themeImages: TradeThemeImages,
  brandLogo: CanvasImage | null,
  frameY: number,
  frameHeight: number,
  footerDividerOffset: number,
) {
  const scale = width / 1200;
  const padding = 54 * scale;
  const centerWidth = Math.max(150 * scale, width * 0.145);
  const sideGap = 18 * scale;
  const frameWidth = (width - padding * 2 - centerWidth - sideGap * 2) / 2;
  const { offered, requested } = getTradeSides(draft);
  drawTradeAlertHeader(context, width, 104 * scale, scale);
  drawTradeSide(context, offered, images, themeImages, padding, frameY, frameWidth, frameHeight, scale);
  drawTradeSide(context, requested, images, themeImages, width - padding - frameWidth, frameY, frameWidth, frameHeight, scale);
  drawTradeDirection(context, width / 2, frameY + frameHeight / 2, scale, Boolean(draft.promotion?.cashIncluded));
  drawTradeBrandFooter(context, brandLogo, width, height, padding, scale, footerDividerOffset);
}

function drawCompletedTradeLandscape(context: CanvasRenderingContext2D, draft: SocialDraft, platform: SocialPlatform, width: number, height: number, images: Array<CanvasImage | null>, themeImages: TradeThemeImages, brandLogo: CanvasImage | null) {
  const scale = width / 1200;
  const frameY = 150 * scale;
  const frameHeight = height - frameY - 180 * scale;
  drawCompletedTradeSideBySide(context, draft, platform, width, height, images, themeImages, brandLogo, frameY, frameHeight, 82);
}

/** Square Instagram trade posts keep the Facebook trade composition, with a taller item area. */
function drawCompletedTradeInstagram(context: CanvasRenderingContext2D, draft: SocialDraft, width: number, height: number, images: Array<CanvasImage | null>, themeImages: TradeThemeImages, brandLogo: CanvasImage | null) {
  const scale = width / 1200;
  const frameY = 150 * scale;
  const frameHeight = height - frameY - 246 * scale;
  drawCompletedTradeSideBySide(context, draft, "Instagram", width, height, images, themeImages, brandLogo, frameY, frameHeight, 128);
}

function drawCompletedTradeTall(context: CanvasRenderingContext2D, draft: SocialDraft, platform: SocialPlatform, width: number, height: number, images: Array<CanvasImage | null>, themeImages: TradeThemeImages, brandLogo: CanvasImage | null) {
  const scale = width / 1080;
  const padding = 62 * scale;
  const items = draft.promotion?.tradeItems ?? [];
  const frameY = 150 * scale;
  // Let Pinterest use its vertical canvas for legible images and complete
  // item names rather than leaving an oversized empty lower field.
  const frameHeight = platform === "Pinterest" ? height * 0.58 : height * 0.32;
  const gap = 18 * scale;
  const frameWidth = (width - padding * 2 - gap) / 2;
  const itemCount = Math.max(2, Math.min(4, Math.max(items.length, images.length)));
  const tileGap = 18 * scale;
  const rowCount = Math.ceil(itemCount / 2);
  const tileHeight = (frameHeight - tileGap * (rowCount - 1)) / rowCount;
  drawTradeAlertHeader(context, width, 104 * scale, scale);
  Array.from({ length: itemCount }, (_, index) => {
    const item = items[index] ?? { title: `ITEM ${index + 1}` };
    const tileX = padding + (index % 2) * (frameWidth + gap);
    const tileY = frameY + Math.floor(index / 2) * (tileHeight + tileGap);
    drawRoundedRect(context, tileX, tileY, frameWidth, tileHeight, Math.max(16, frameWidth * 0.035), "rgba(255,255,255,0.07)", "rgba(255,255,255,0.22)");
    const captionFontSize = platform === "Pinterest" ? 14 : 12;
    const captionTopGap = 22 * scale;
    const captionLineHeight = captionFontSize * 1.16 * scale;
    const factReserve = getTradeItemFactLine(item) ? Math.max(11 * scale, (captionFontSize - 1) * scale) + 5 * scale : 0;
    const gradeReserve = getTradeItemGradeLine(item) ? Math.max(14 * scale, (captionFontSize - 1) * 1.7 * scale) + 8 * scale : 0;
    const captionReserve = captionTopGap + 3 * captionLineHeight + factReserve + gradeReserve + 8 * scale;
    const imageInset = 18 * scale;
    const imageHeight = tileHeight - imageInset - captionReserve;
    const itemTheme = getTradeItemTheme(item);
    drawTradeItemEnvironment(context, itemTheme, themeImages[itemTheme.assetKey] ?? null, tileX + imageInset, tileY + imageInset, frameWidth - imageInset * 2, imageHeight, index % 2 ? 0.7 : 0.3);
    if (images[index]) drawContainedImage(context, images[index], tileX + imageInset * 1.5, tileY + imageInset * 1.5, frameWidth - imageInset * 3, imageHeight - imageInset);
    else {
      context.fillStyle = "rgba(255,255,255,0.10)";
      context.fillRect(tileX + imageInset, tileY + imageInset, frameWidth - imageInset * 2, imageHeight);
    }
    drawTradeItemCaption(context, item, tileX + frameWidth / 2, tileY + imageInset + imageHeight + captionTopGap, frameWidth - 28 * scale, scale, 3, captionFontSize);
  });
  drawTradeDirection(context, width / 2, frameY + frameHeight + 72 * scale, scale, Boolean(draft.promotion?.cashIncluded));
  drawTradeBrandFooter(context, brandLogo, width, height, padding, scale, 126);
}

function drawFacts(context: CanvasRenderingContext2D, facts: Array<{ label: string; value: string }>, x: number, y: number, width: number, scale: number) {
  if (facts.length === 0) return 0;
  const rows = Math.ceil(Math.min(facts.length, 4) / 2);
  // Keep the lower rule the same distance below the final value as the upper
  // rule is above the first fact label, avoiding excess space below row two.
  const height = rows * 54 * scale + 1 * scale;
  context.strokeStyle = "rgba(255,255,255,0.22)";
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + width, y);
  context.moveTo(x, y + height);
  context.lineTo(x + width, y + height);
  context.stroke();

  facts.slice(0, 4).forEach((fact, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const cellX = x + column * (width / 2);
    const cellY = y + 17 * scale + row * 54 * scale;
    context.fillStyle = "#b9caea";
    context.font = `700 ${Math.round(12 * scale)}px Arial, sans-serif`;
    context.fillText(fact.label.toUpperCase(), cellX, cellY);
    context.fillStyle = "#ffffff";
    context.font = `700 ${Math.round(16 * scale)}px Arial, sans-serif`;
    const trimmedValue = splitLine(context, fact.value, width / 2 - 16 * scale, 1)[0] ?? "";
    context.fillText(trimmedValue, cellX, cellY + 21 * scale);
  });
  return height;
}

function drawLandscapeGraphic(context: CanvasRenderingContext2D, draft: SocialDraft, platform: SocialPlatform, width: number, height: number, itemImage: CanvasImage | null, brandLogo: CanvasImage | null) {
  const scale = width / 1200;
  const padding = 54 * scale;
  const promotion = draft.promotion;
  const itemTitle = getSocialPromotionItemTitle(promotion?.itemTitle || draft.title);
  const category = formatSocialCategory(promotion?.category) || "Collectible showcase";
  const promotionHeader = getPromotionHeader(draft, category);
  const itemType = formatSocialItemType(promotion?.itemType);
  const value = formatSocialValue(promotion?.estimatedValue);

  drawCenteredPromotionHeader(context, promotionHeader, width, 72 * scale, scale);

  const imageX = padding;
  const imageY = 130 * scale;
  const imageWidth = width * 0.47;
  const imageHeight = height - imageY - 150 * scale;
  drawMediaFrame(context, itemImage, imageX, imageY, imageWidth, imageHeight, isVideoMediaUrl(draft.mediaUrl) ? "ORIGINAL VIDEO ATTACHED" : "ORIGINAL ITEM MEDIA");

  const detailX = imageX + imageWidth + 62 * scale;
  const detailWidth = width - detailX - padding;
  let detailY = imageY + 30 * scale;

  context.fillStyle = "#ffffff";
  detailY += drawCompleteFittedTitle(context, itemTitle, detailX, detailY, detailWidth, 43 * scale, 25 * scale, 3);
  if (itemType) {
    detailY += 14 * scale;
    context.fillStyle = "rgba(255,255,255,0.75)";
    context.font = `600 ${Math.round(17 * scale)}px Arial, sans-serif`;
    context.fillText(itemType, detailX, detailY);
  }
  detailY += 30 * scale;
  detailY += drawFacts(context, promotion?.facts ?? [], detailX, detailY, detailWidth, scale);
  if (value) {
    const valueY = Math.max(detailY + 28 * scale, height - 144 * scale);
    context.fillStyle = "#ffe0a8";
    context.font = `700 ${Math.round(21 * scale)}px Arial, sans-serif`;
    context.fillText(`Trade value  ${value}`, detailX, valueY);
  }

  drawBrandFooter(context, draft, platform, brandLogo, width, height, padding, scale, 42, 18);

  void platform;
}

function drawTallGraphic(context: CanvasRenderingContext2D, draft: SocialDraft, platform: SocialPlatform, width: number, height: number, itemImage: CanvasImage | null, brandLogo: CanvasImage | null) {
  const scale = width / 1080;
  const padding = 62 * scale;
  const promotion = draft.promotion;
  const itemTitle = getSocialPromotionItemTitle(promotion?.itemTitle || draft.title);
  const category = formatSocialCategory(promotion?.category) || "Collectible showcase";
  const promotionHeader = getPromotionHeader(draft, category);
  const itemType = formatSocialItemType(promotion?.itemType);
  const value = formatSocialValue(promotion?.estimatedValue);

  drawCenteredPromotionHeader(context, promotionHeader, width, 104 * scale, scale);

  const imageY = 146 * scale;
  const titleGap = platform === "Instagram" ? 58 * scale : 38 * scale;
  const titleLayout = getCompleteFittedTitleLayout(context, itemTitle, width - padding * 2, 43 * scale, 25 * scale, platform === "Pinterest" ? 4 : 3);
  const itemTypeHeight = itemType ? 50 * scale : 34 * scale;
  const factHeight = promotion?.facts?.length ? Math.ceil(Math.min(promotion.facts.length, 4) / 2) * 54 * scale + 1 * scale : 0;
  const valueHeight = value ? 38 * scale + 22 * scale : 0;
  // Instagram uses the available content area for a larger contained image,
  // while reserving clear title, detail, logo, divider, and phrase zones.
  const imageHeight = platform === "Instagram"
    ? Math.max(160 * scale, height - imageY - titleGap - titleLayout.height - itemTypeHeight - 34 * scale - factHeight - valueHeight - 126 * scale - 18 * scale)
    : height * 0.40;
  drawMediaFrame(context, itemImage, padding, imageY, width - padding * 2, imageHeight, isVideoMediaUrl(draft.mediaUrl) ? "ORIGINAL VIDEO ATTACHED" : "ORIGINAL ITEM MEDIA");

  let y = imageY + imageHeight + titleGap;
  context.fillStyle = "#ffffff";
  y += drawCompleteFittedTitle(context, itemTitle, padding, y, width - padding * 2, 43 * scale, 25 * scale, platform === "Pinterest" ? 4 : 3);
  if (itemType) {
    y += 16 * scale;
    context.fillStyle = "rgba(255,255,255,0.75)";
    context.font = `600 ${Math.round(17 * scale)}px Arial, sans-serif`;
    context.fillText(itemType, padding, y);
  }
  y += 34 * scale;
  y += drawFacts(context, promotion?.facts ?? [], padding, y, width - padding * 2, scale);
  if (value) {
    y += 38 * scale;
    context.fillStyle = "#ffe0a8";
    context.font = `700 ${Math.round(22 * scale)}px Arial, sans-serif`;
    context.fillText(`Trade value  ${value}`, padding, y);
  }

  drawBrandFooter(context, draft, platform, brandLogo, width, height, padding, scale, platform === "Instagram" ? 58 : 42, 18);
}

export function getSocialGraphicExportFileName(draft: SocialDraft, platform: SocialPlatform) {
  const safeTitle = (draft.promotion?.itemTitle || draft.title || "tradebilia-item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "tradebilia-item";
  return `tradebilia-${safeTitle}-${platform.toLowerCase()}.png`;
}

/** Renders the finished promotion to a native platform-size canvas without reading preview DOM or CSS. */
export async function renderSocialGraphicCanvas({ draft, platform, itemImageUrl, tradeItemImageUrls, tradeThemeImageUrls, brandLogoUrl, heroBackgroundUrl }: SocialGraphicExportInput) {
  const { width, height } = SOCIAL_GRAPHIC_CANVAS_SIZES[platform];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("A canvas graphics context is not available in this browser.");

  const usedTradeThemeKeys = Array.from(new Set(
    (draft.source === "Completed Trade" ? draft.promotion?.tradeItems ?? [] : [])
      .map((item) => getTradeItemTheme(item).assetKey),
  ));
  const themeSourceEntries = usedTradeThemeKeys
    .map((assetKey) => [assetKey, tradeThemeImageUrls?.[assetKey] || TRADE_ALERT_THEME_IMAGE_URLS[assetKey]] as const)
    .filter((entry): entry is readonly [TradeAlertThemeAssetKey, string] => Boolean(entry[1]));

  const [, itemImage, tradeItemImages, loadedThemeImages, brandLogo, heroBackground] = await Promise.all([
    ensureSocialCanvasFonts(),
    loadCanvasImage(itemImageUrl, Boolean(itemImageUrl)),
    Promise.all((tradeItemImageUrls ?? []).slice(0, 4).map((url) => loadCanvasImage(url, Boolean(url)))),
    Promise.all(themeSourceEntries.map(([, sourceUrl]) => loadCanvasImage(sourceUrl, true))),
    loadCanvasImage(brandLogoUrl),
    loadCanvasImage(draft.source === "Completed Trade" ? null : heroBackgroundUrl || SOCIAL_GRAPHIC_HERO_BACKGROUND_URL),
  ]);
  const tradeThemeImages: TradeThemeImages = Object.fromEntries(themeSourceEntries.map(([assetKey], index) => [assetKey, loadedThemeImages[index] ?? null]));
  const completedTradeThemes = (draft.promotion?.tradeItems ?? []).map((item) => getTradeItemTheme(item));
  if (draft.source === "Completed Trade") drawTradeStage(context, width, height, completedTradeThemes);
  else drawBackground(context, width, height, heroBackground);
  if (draft.source === "Completed Trade" && !isTallCanvas(platform)) {
    drawCompletedTradeLandscape(context, draft, platform, width, height, tradeItemImages, tradeThemeImages, brandLogo);
  } else if (draft.source === "Completed Trade" && platform === "Instagram") {
    drawCompletedTradeInstagram(context, draft, width, height, tradeItemImages, tradeThemeImages, brandLogo);
  } else if (draft.source === "Completed Trade") {
    drawCompletedTradeTall(context, draft, platform, width, height, tradeItemImages, tradeThemeImages, brandLogo);
  } else if (isTallCanvas(platform)) {
    drawTallGraphic(context, draft, platform, width, height, itemImage, brandLogo);
  } else {
    drawLandscapeGraphic(context, draft, platform, width, height, itemImage, brandLogo);
  }
  return canvas;
}

export function downloadSocialGraphicCanvas(canvas: HTMLCanvasElement, fileName: string) {
  const downloadLink = document.createElement("a");
  downloadLink.download = fileName;
  downloadLink.href = canvas.toDataURL("image/png");
  downloadLink.click();
}
