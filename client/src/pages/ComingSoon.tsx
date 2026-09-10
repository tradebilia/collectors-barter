import { Disc3 } from "lucide-react";

export default function ComingSoon() {
  return (
    <main
      className="grid min-h-[100svh] place-items-center overflow-hidden bg-[#120d0b]"
      aria-label="Tradebilia Coming Soon"
    >
      <div className="relative aspect-[605/289] w-[min(100vw,calc(100svh*605/289))] max-w-full">
        <img
          src="/manus-storage/coming-soon-exact-supplied_6f741f0e.png"
          alt="Tradebilia Coming Soon collector room showing comics, sports cards, games, coins, stamps, and collectible media"
          className="block size-full object-contain"
        />
        <div
          className="absolute left-[93%] top-[77%] flex -translate-x-1/2 flex-col items-center gap-[0.3%] text-[#d8ae58]"
          aria-label="Music"
        >
          <Disc3 className="h-auto w-[2.6vw] max-w-[44px] min-w-[10px] stroke-[1.45]" aria-hidden="true" />
          <span className="whitespace-nowrap text-[clamp(4px,0.52vw,9px)] font-semibold tracking-[0.13em]">MUSIC</span>
        </div>
      </div>
    </main>
  );
}
