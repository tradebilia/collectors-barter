import {
  Archive,
  BookOpen,
  Bot,
  CircleDot,
  Coins,
  Disc3,
  Gamepad2,
  LibraryBig,
  MousePointer2,
  PanelsTopLeft,
  PenTool,
  Stamp,
} from "lucide-react";

const COMING_SOON_CATEGORIES = [
  { label: "Sports Cards", icon: PanelsTopLeft },
  { label: "Comics", icon: LibraryBig },
  { label: "Pokémon / Trading Card Games", icon: CircleDot },
  { label: "Vintage Toys", icon: Bot },
  { label: "Video Games", icon: Gamepad2 },
  { label: "Coins", icon: Coins },
  { label: "Stamps", icon: Stamp },
  { label: "Autographs & Signed Memorabilia", icon: PenTool },
  { label: "Disney Pins & Disney Collectibles", icon: MousePointer2 },
  { label: "VHS / DVD / Blu-ray / LaserDisc / Physical Media", icon: Archive },
  { label: "Music", icon: Disc3 },
] as const;

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
        <div className="absolute inset-x-[7%] top-[76%] h-[12%] bg-[#160e0b] px-[6%]" aria-label="Collections on the exchange">
          <div className="grid h-full grid-cols-11 items-center gap-[0.35%] text-[#d8ae58]">
            {COMING_SOON_CATEGORIES.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-w-0 flex-col items-center justify-center gap-[5%] text-center">
                <Icon className="h-auto w-[2.1vw] max-w-[32px] min-w-[9px] stroke-[1.45]" aria-hidden="true" />
                <span className="line-clamp-2 min-h-[2.35em] text-[clamp(4px,0.47vw,8px)] font-semibold uppercase leading-[1.16] tracking-[0.09em]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
