import { formatSocialCategory, formatSocialItemType, formatSocialValue, getSocialFooterPhrase, getSocialPromotionItemTitle, type SocialDraft, type SocialPlatform } from "@/lib/socialContentManager";

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

export const SOCIAL_GRAPHIC_HERO_BACKGROUND_URL = "/manus-storage/generated-social-background-fuller_2df3107e.jpg";
export const SOCIAL_GRAPHIC_BRAND_LOGO_URL = "/manus-storage/tradebilia-logo-cropped_8932eaec.svg";

type SocialGraphicExportInput = {
  draft: SocialDraft;
  platform: SocialPlatform;
  itemImageUrl?: string | null;
  tradeItemImageUrls?: Array<string | null>;
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
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
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
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
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

function drawBrand(context: CanvasRenderingContext2D, logo: CanvasImage | null, x: number, y: number, width: number, height: number) {
  if (logo) {
    drawContainedImage(context, logo, x, y, width, height);
    return;
  }
  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.round(height * 0.54)}px Arial, sans-serif`;
  context.fillText("TRADEBILIA", x, y + height * 0.72);
}

function drawCenteredBrand(context: CanvasRenderingContext2D, logo: CanvasImage | null, width: number, y: number, scale: number) {
  const brandWidth = 360 * scale;
  const brandHeight = 64 * scale;
  // The supplied transparent mark carries a little more visual mass on its
  // right side, so this small optical correction keeps the artwork centered.
  drawBrand(context, logo, (width - brandWidth) / 2 - 6 * scale, y, brandWidth, brandHeight);
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

  drawCenteredBrand(context, logo, width, brandY, scale);
  context.fillStyle = "rgba(255,255,255,0.85)";
  context.font = `700 ${Math.round(12 * scale)}px Arial, sans-serif`;
  context.textAlign = "center";
  context.fillText(getSocialFooterPhrase(draft.id, platform).toUpperCase(), width / 2, height - phraseOffset * scale);
  context.textAlign = "left";
}

function drawCenteredPromotionHeader(context: CanvasRenderingContext2D, label: string, width: number, y: number, scale: number) {
  context.font = `800 ${Math.round(35 * scale)}px Arial, sans-serif`;
  const bannerWidth = Math.min(width - 2 * 44 * scale, context.measureText(label).width + 96 * scale);
  drawPromotionHeader(context, label, (width - bannerWidth) / 2, y, scale, bannerWidth);
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

function drawCompletedTradeLandscape(context: CanvasRenderingContext2D, draft: SocialDraft, platform: SocialPlatform, width: number, height: number, images: Array<CanvasImage | null>, brandLogo: CanvasImage | null) {
  const scale = width / 1200;
  const padding = 54 * scale;
  const items = draft.promotion?.tradeItems ?? [];
  drawCenteredPromotionHeader(context, "TRADE ALERT", width, 104 * scale, scale);
  const frameY = 146 * scale;
  const gap = 20 * scale;
  const frameWidth = (width - padding * 2 - gap) / 2;
  const frameHeight = height - frameY - 168 * scale;
  const sortByValue = (a: { item: { estimatedValue?: number | null } }, b: { item: { estimatedValue?: number | null } }) => Number(b.item.estimatedValue ?? 0) - Number(a.item.estimatedValue ?? 0);
  const offered = items.map((item, index) => ({ item, index })).filter(({ item }) => item.direction === "offered").sort(sortByValue);
  const requested = items.map((item, index) => ({ item, index })).filter(({ item }) => item.direction !== "offered").sort(sortByValue);
  const drawSide = (entries: Array<{ item: { title: string }; index: number }>, x: number) => {
    drawRoundedRect(context, x, frameY, frameWidth, frameHeight, Math.max(16, frameWidth * 0.035), "rgba(255,255,255,0.07)", "rgba(255,255,255,0.22)");
    const columns = entries.length > 2 ? 2 : 1;
    const cellWidth = (frameWidth - 28 * scale - (columns - 1) * 14 * scale) / columns;
    const cellHeight = frameHeight - 52 * scale;
    entries.forEach(({ item, index }, entryIndex) => {
      const isThreeItemLead = entries.length === 3 && entryIndex === 0;
      const imageWidth = cellWidth;
      const imageHeight = isThreeItemLead ? cellHeight - 48 * scale : entries.length === 3 ? cellHeight / 2 - 28 * scale : columns > 1 ? cellHeight / 2 - 28 * scale : cellHeight - 48 * scale;
      const cellX = x + 14 * scale + (entries.length === 3 && !isThreeItemLead ? cellWidth + 14 * scale : (entryIndex % columns) * (cellWidth + 14 * scale));
      const cellY = frameY + 42 * scale + (entries.length === 3 && !isThreeItemLead ? (entryIndex - 1) * (cellHeight / 2) : columns > 1 ? Math.floor(entryIndex / columns) * (cellHeight / 2) : 0);
      if (images[index]) {
        drawContainedImage(context, images[index], cellX, cellY, imageWidth, imageHeight);
      } else {
        context.fillStyle = "rgba(255,255,255,0.10)";
        context.fillRect(cellX, cellY, imageWidth, imageHeight);
      }
      context.fillStyle = "rgba(255,255,255,0.86)";
      context.font = `600 ${Math.round(10 * scale)}px Arial, sans-serif`;
      context.textAlign = "center";
      drawWrappedText(context, item.title, cellX + imageWidth / 2, cellY + imageHeight + 14 * scale, imageWidth - 10 * scale, 12 * scale, 2);
    });
    context.textAlign = "left";
  };
  drawSide(offered, padding);
  drawSide(requested, padding + frameWidth + gap);
  const rows = 1;
  context.fillStyle = "#ffe0a8";
  context.font = `800 ${Math.round(19 * scale)}px Arial, sans-serif`;
  context.textAlign = "center";
  context.fillText("SWAPPED", width / 2, frameY + frameHeight / 2 - 14 * scale);
  context.font = `700 ${Math.round(32 * scale)}px Arial, sans-serif`;
  context.fillText("↔", width / 2, frameY + frameHeight / 2 + 22 * scale);
  if (draft.promotion?.cashIncluded) {
    context.font = `700 ${Math.round(13 * scale)}px Arial, sans-serif`;
    context.fillText("CASH INCLUDED", width / 2, frameY + (frameHeight * rows) / 2 + 50 * scale);
  }
  context.textAlign = "left";
  drawBrandFooter(context, draft, platform, brandLogo, width, height, padding, scale, 78, 18);
}

/** Square Instagram trade posts keep the Facebook trade composition, with a taller item area. */
function drawCompletedTradeInstagram(context: CanvasRenderingContext2D, draft: SocialDraft, width: number, height: number, images: Array<CanvasImage | null>, brandLogo: CanvasImage | null) {
  const scale = width / 1200;
  const padding = 54 * scale;
  const items = draft.promotion?.tradeItems ?? [];
  drawCenteredPromotionHeader(context, "TRADE ALERT", width, 104 * scale, scale);
  const frameY = 146 * scale;
  const gap = 20 * scale;
  const frameWidth = (width - padding * 2 - gap) / 2;
  const frameHeight = height - frameY - 224 * scale;
  const sortByValue = (a: { item: { estimatedValue?: number | null } }, b: { item: { estimatedValue?: number | null } }) => Number(b.item.estimatedValue ?? 0) - Number(a.item.estimatedValue ?? 0);
  const offered = items.map((item, index) => ({ item, index })).filter(({ item }) => item.direction === "offered").sort(sortByValue);
  const requested = items.map((item, index) => ({ item, index })).filter(({ item }) => item.direction !== "offered").sort(sortByValue);
  const drawSide = (entries: Array<{ item: { title: string }; index: number }>, x: number) => {
    drawRoundedRect(context, x, frameY, frameWidth, frameHeight, Math.max(16, frameWidth * 0.035), "rgba(255,255,255,0.07)", "rgba(255,255,255,0.22)");
    const columns = entries.length > 2 ? 2 : 1;
    const cellWidth = (frameWidth - 28 * scale - (columns - 1) * 14 * scale) / columns;
    const cellHeight = frameHeight - 52 * scale;
    entries.forEach(({ item, index }, entryIndex) => {
      const isThreeItemLead = entries.length === 3 && entryIndex === 0;
      const imageWidth = cellWidth;
      const imageHeight = isThreeItemLead ? cellHeight - 48 * scale : entries.length === 3 ? cellHeight / 2 - 28 * scale : columns > 1 ? cellHeight / 2 - 28 * scale : cellHeight - 48 * scale;
      const cellX = x + 14 * scale + (entries.length === 3 && !isThreeItemLead ? cellWidth + 14 * scale : (entryIndex % columns) * (cellWidth + 14 * scale));
      const cellY = frameY + 42 * scale + (entries.length === 3 && !isThreeItemLead ? (entryIndex - 1) * (cellHeight / 2) : columns > 1 ? Math.floor(entryIndex / columns) * (cellHeight / 2) : 0);
      if (images[index]) drawContainedImage(context, images[index], cellX, cellY, imageWidth, imageHeight);
      else { context.fillStyle = "rgba(255,255,255,0.10)"; context.fillRect(cellX, cellY, imageWidth, imageHeight); }
      context.fillStyle = "rgba(255,255,255,0.86)";
      context.font = `600 ${Math.round(10 * scale)}px Arial, sans-serif`;
      context.textAlign = "center";
      drawWrappedText(context, item.title, cellX + imageWidth / 2, cellY + imageHeight + 14 * scale, imageWidth - 10 * scale, 12 * scale, 2);
    });
    context.textAlign = "left";
  };
  drawSide(offered, padding);
  drawSide(requested, padding + frameWidth + gap);
  context.fillStyle = "#ffe0a8";
  context.font = `800 ${Math.round(19 * scale)}px Arial, sans-serif`;
  context.textAlign = "center";
  context.fillText("SWAPPED", width / 2, frameY + frameHeight / 2 - 14 * scale);
  context.font = `700 ${Math.round(32 * scale)}px Arial, sans-serif`;
  context.fillText("↔", width / 2, frameY + frameHeight / 2 + 22 * scale);
  if (draft.promotion?.cashIncluded) {
    context.font = `700 ${Math.round(13 * scale)}px Arial, sans-serif`;
    context.fillText("CASH INCLUDED", width / 2, frameY + frameHeight / 2 + 50 * scale);
  }
  context.textAlign = "left";
  drawBrandFooter(context, draft, "Instagram", brandLogo, width, height, padding, scale, 116, 28);
}

function drawCompletedTradeTall(context: CanvasRenderingContext2D, draft: SocialDraft, platform: SocialPlatform, width: number, height: number, images: Array<CanvasImage | null>, brandLogo: CanvasImage | null) {
  const scale = width / 1080;
  const padding = 62 * scale;
  const items = draft.promotion?.tradeItems ?? [];
  drawCenteredPromotionHeader(context, "TRADE ALERT", width, 104 * scale, scale);
  const frameY = 146 * scale;
  const frameHeight = platform === "Pinterest" ? height * 0.34 : height * 0.30;
  const gap = 18 * scale;
  const frameWidth = (width - padding * 2 - gap) / 2;
  const itemCount = Math.max(2, Math.min(4, Math.max(items.length, images.length)));
  Array.from({ length: itemCount }, (_, index) => drawMediaFrame(context, images[index] ?? null, padding + (index % 2) * (frameWidth + gap), frameY + Math.floor(index / 2) * (frameHeight / 2 + gap), frameWidth, frameHeight / 2, `ITEM ${index + 1}`));
  const titleY = frameY + frameHeight + 42 * scale;
  context.fillStyle = "#ffffff";
  drawCompleteFittedTitle(context, items.map((item) => item.title).join("  ↔ ") || "Trade Alert", padding, titleY, width - padding * 2, 32 * scale, 20 * scale, platform === "Pinterest" ? 4 : 3);
  if (draft.promotion?.cashIncluded) {
    context.fillStyle = "#ffe0a8";
    context.font = `700 ${Math.round(15 * scale)}px Arial, sans-serif`;
    context.fillText("CASH INCLUDED AS PART OF THE DEAL", padding, height - 190 * scale);
  }
  drawBrandFooter(context, draft, platform, brandLogo, width, height, padding, scale, 82, 28);
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
export async function renderSocialGraphicCanvas({ draft, platform, itemImageUrl, tradeItemImageUrls, brandLogoUrl, heroBackgroundUrl }: SocialGraphicExportInput) {
  const { width, height } = SOCIAL_GRAPHIC_CANVAS_SIZES[platform];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("A canvas graphics context is not available in this browser.");

  const [itemImage, tradeItemImages, brandLogo, heroBackground] = await Promise.all([
    loadCanvasImage(itemImageUrl, Boolean(itemImageUrl)),
    Promise.all((tradeItemImageUrls ?? []).slice(0, 4).map((url) => loadCanvasImage(url, true))),
    loadCanvasImage(brandLogoUrl),
    loadCanvasImage(heroBackgroundUrl || SOCIAL_GRAPHIC_HERO_BACKGROUND_URL),
  ]);
  drawBackground(context, width, height, heroBackground);
  if (draft.source === "Completed Trade" && !isTallCanvas(platform)) {
    drawCompletedTradeLandscape(context, draft, platform, width, height, tradeItemImages, brandLogo);
  } else if (draft.source === "Completed Trade" && platform === "Instagram") {
    drawCompletedTradeInstagram(context, draft, width, height, tradeItemImages, brandLogo);
  } else if (draft.source === "Completed Trade") {
    drawCompletedTradeTall(context, draft, platform, width, height, tradeItemImages, brandLogo);
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
