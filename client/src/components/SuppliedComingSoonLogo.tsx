import { useId } from "react";

const wheelPieces = [
  { transform: "translate(400 361.25) rotate(0) scale(.82 1)", color: "#A97AD7" },
  { transform: "translate(433.59 380.62) rotate(60) scale(.82 1)", color: "#FF3B30" },
  { transform: "translate(433.59 419.38) rotate(120) scale(.82 1)", color: "#FF9800" },
  { transform: "translate(400 438.75) rotate(180) scale(.82 1)", color: "#18B57A" },
  { transform: "translate(366.41 419.38) rotate(240) scale(.82 1)", color: "#F6A5B6" },
  { transform: "translate(366.41 380.62) rotate(300) scale(.82 1)", color: "#29A8FF" },
] as const;

const bladePoints = "-7 -2.5 -8.5 -2 -42 -35.5 -41.5 -36 -21.5 -36 -21 -36.5 -21 -71.5 -20.5 -72 -7.5 -72 -7 -71.5";
const counterBladePoints = "20.5 0 7.5 0 7 -.5 7 -69.5 7.5 -70 8.5 -70 42 -36.5 41.5 -36 21.5 -36 21 -35.5 21 -.5 20.5 0";

export default function SuppliedComingSoonLogo() {
  const filterId = useId().replace(/:/g, "");

  return (
    <div className="flex items-center justify-center drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)]" aria-label="Tradebilia">
      <span className="relative mr-[clamp(5px,0.6cqw,10px)] block h-[clamp(50px,5cqw,92px)] w-[clamp(54px,5.3cqw,96px)] shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="221 258 384 353" className="size-full overflow-visible" aria-hidden="true">
          <defs>
            <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g filter={`url(#${filterId})`}>
            <g className="coming-soon-pinwheel-spin" style={{ transformBox: "view-box", transformOrigin: "381px 437px" }}>
              <g transform="translate(228 275) scale(1.466236 1.462754) translate(-295.651171 -289.25)">
                {wheelPieces.map(({ transform, color }) => (
                  <g key={transform} transform={transform}>
                    <polygon points={bladePoints} fill={color} />
                    <polygon points={counterBladePoints} fill={color} />
                  </g>
                ))}
              </g>
            </g>
          </g>
          <line x1="590" y1="271" x2="590" y2="595" stroke="white" strokeWidth="8.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="whitespace-nowrap font-sans text-[clamp(28px,3.3cqw,56px)] font-bold tracking-[0.01em] text-white">TRADEBILIA</span>
      <style>{`@keyframes comingSoonPinwheelSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .coming-soon-pinwheel-spin { animation: comingSoonPinwheelSpin 12s linear infinite; } @media (prefers-reduced-motion: reduce) { .coming-soon-pinwheel-spin { animation-play-state: paused; } }`}</style>
    </div>
  );
}
