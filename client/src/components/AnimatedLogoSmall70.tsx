import { useEffect, useLayoutEffect, useRef, useState } from "react";

const categories = [
  { name: "BILIA", color: "#FFFFFF", duration: 10000 },
  { name: "COMICS", color: "#A97AD7", duration: 3000 },
  { name: "SPORTS CARDS", color: "#FF3B30", duration: 3000 },
  { name: "POKEMON", color: "#FF9800", duration: 3000 },
  { name: "COINS", color: "#FFD700", duration: 3000 },
  { name: "STAMPS", color: "#18B57A", duration: 3000 },
  { name: "VIDEO GAMES", color: "#F6A5B6", duration: 3000 },
  { name: "AUTOGRAPHS", color: "#29A8FF", duration: 3000 },
  { name: "TOYS", color: "#FF69B4", duration: 3000 },
];

const DEFAULT_WORDMARK_FONT_SIZE = 60;
const LARGE_WORDMARK_FONT_SIZE = 125;
const LARGE_CATEGORY_WORD_X = 580;
const GLOBAL_SEARCH_CATEGORY_WORD_X = 480;
const CENTERED_LOCKUP_VIEWBOX_WIDTH = 1800;

type AnimatedLogoSmall70Props = {
  fontSize?: number;
  wordmarkColor?: string;
  neutralCategoryColor?: string;
  wheelScale?: number;
  dividerScale?: number;
  dividerOffsetY?: number;
  wheelStrokeWidth?: number;
  dividerStrokeWidth?: number;
  wheelOffsetX?: number;
  wheelOffsetY?: number;
  fixedCategoryMetrics?: boolean;
  centerLockup?: boolean;
  centeredViewBoxWidth?: number;
};

const AnimatedLogoSmall70 = ({
  fontSize = DEFAULT_WORDMARK_FONT_SIZE,
  wordmarkColor = "#FFFFFF",
  neutralCategoryColor = wordmarkColor,
  wheelScale = 1,
  dividerScale = 1,
  dividerOffsetY = 0,
  wheelStrokeWidth = 0,
  dividerStrokeWidth = 2.55,
  wheelOffsetX = 0,
  wheelOffsetY = 0,
  fixedCategoryMetrics = false,
  centerLockup = false,
  centeredViewBoxWidth = CENTERED_LOCKUP_VIEWBOX_WIDTH,
}: AnimatedLogoSmall70Props) => {
  const [index, setIndex] = useState(0);
  const categoryTextRef = useRef<SVGTextElement>(null);
  const wordmarkTextRef = useRef<SVGTextElement>(null);
  const [lockupOffsetX, setLockupOffsetX] = useState(0);
  const [dynamicViewBoxWidth, setDynamicViewBoxWidth] = useState(1300);
  const [wordmarkTextWidth, setWordmarkTextWidth] = useState(fontSize * 3.8);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIndex(previousIndex => (previousIndex + 1) % categories.length);
    }, categories[index].duration);

    return () => window.clearTimeout(timer);
  }, [index]);

  const currentCategory = categories[index];
  const isLargeWordmark = fontSize >= LARGE_WORDMARK_FONT_SIZE;
  const categoryWordX = centerLockup
    ? Math.ceil(132 + wordmarkTextWidth + fontSize * 0.22)
    : fixedCategoryMetrics
      ? GLOBAL_SEARCH_CATEGORY_WORD_X
    : isLargeWordmark
      ? LARGE_CATEGORY_WORD_X
      : 348;
  const categoryColor = currentCategory.name === "BILIA" ? neutralCategoryColor : currentCategory.color;
  const wheelTransform = wheelScale === 1
    ? `translate(${6 + wheelOffsetX}, ${82.5 + wheelOffsetY}) scale(0.441)`
    : `translate(${6 + wheelOffsetX}, ${82.5 + wheelOffsetY}) scale(0.441) translate(104, 110) scale(${wheelScale}) translate(-104, -110)`;
  const dividerCenterY = 129.9 + dividerOffsetY;
  const dividerHalfHeight = 48.6 * dividerScale;

  useLayoutEffect(() => {
    const measuredWordmarkWidth = wordmarkTextRef.current?.getComputedTextLength();
    if (measuredWordmarkWidth && Math.abs(measuredWordmarkWidth - wordmarkTextWidth) > 0.5) {
      setWordmarkTextWidth(measuredWordmarkWidth);
    }

    if (!centerLockup) {
      setLockupOffsetX(0);
      setDynamicViewBoxWidth(1300);
      return;
    }

    const categoryWidth = categoryTextRef.current?.getComputedTextLength() ?? 0;
    const lockupLeft = 15;
    const lockupRight = categoryWordX + categoryWidth;
    const lockupWidth = Math.max(1, lockupRight - lockupLeft);
    const nextViewBoxWidth = centeredViewBoxWidth;
    const nextOffset = (nextViewBoxWidth - lockupWidth) / 2 - lockupLeft;

    setDynamicViewBoxWidth(nextViewBoxWidth);
    setLockupOffsetX(nextOffset);
  }, [categoryWordX, centerLockup, centeredViewBoxWidth, currentCategory.name, fontSize, wordmarkTextWidth]);

  return (
    <div className="flex h-full items-center justify-center font-sans py-0" aria-label={`Trade ${currentCategory.name}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${dynamicViewBoxWidth} 216`}
        className="h-auto w-full drop-shadow-lg"
        style={{ maxWidth: "100%", height: "100%" }}
        preserveAspectRatio="xMinYMid meet"
      >
        <defs>
          <filter id="wheelGlowSmall" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.45" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${lockupOffsetX}, 0)`}>
        <g transform={wheelTransform}>
          <g filter="url(#wheelGlowSmall)">
          <animateTransform attributeName="transform" type="rotate" from="0 104 110" to="360 104 110" dur="12s" repeatCount="indefinite" />
          <g transform="translate(104, 71) scale(0.82, 1)" fill="#A97AD7" stroke="#A97AD7" strokeWidth={wheelStrokeWidth} strokeLinejoin="round"><polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" /><polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" /></g>
          <g transform="translate(137, 90) rotate(60) scale(0.82, 1)" fill="#FF3B30" stroke="#FF3B30" strokeWidth={wheelStrokeWidth} strokeLinejoin="round"><polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" /><polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" /></g>
          <g transform="translate(137, 129) rotate(120) scale(0.82, 1)" fill="#FF9800" stroke="#FF9800" strokeWidth={wheelStrokeWidth} strokeLinejoin="round"><polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" /><polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" /></g>
          <g transform="translate(104, 148) rotate(180) scale(0.82, 1)" fill="#18B57A" stroke="#18B57A" strokeWidth={wheelStrokeWidth} strokeLinejoin="round"><polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" /><polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" /></g>
          <g transform="translate(70, 129) rotate(240) scale(0.82, 1)" fill="#F6A5B6" stroke="#F6A5B6" strokeWidth={wheelStrokeWidth} strokeLinejoin="round"><polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" /><polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" /></g>
          <g transform="translate(70, 90) rotate(300) scale(0.82, 1)" fill="#29A8FF" stroke="#29A8FF" strokeWidth={wheelStrokeWidth} strokeLinejoin="round"><polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" /><polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" /></g>
          </g>
        </g>

        <line x1="114" y1={dividerCenterY - dividerHalfHeight} x2="114" y2={dividerCenterY + dividerHalfHeight} stroke={wordmarkColor} strokeWidth={dividerStrokeWidth * dividerScale} strokeLinecap="round" />
        <text ref={wordmarkTextRef} x="132" y="157.5" fontFamily="Montserrat, sans-serif" fontSize={fontSize} fontWeight="600" fill={wordmarkColor}>TRADE</text>
        <text
          x={categoryWordX}
          y="157.5"
          fontFamily="Montserrat, sans-serif"
          fontSize={fontSize}
          fontWeight="600"
          fill={categoryColor}
          ref={categoryTextRef}
        >
          {currentCategory.name}
        </text>
        </g>
      </svg>
    </div>
  );
};

export default AnimatedLogoSmall70;
