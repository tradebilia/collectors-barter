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
          src="/manus-storage/coming-soon-exact-supplied-clean-row_d8aa56d4.png"
          alt="Tradebilia Coming Soon collector room with a centered collection category row for comics, sports cards, games, coins, stamps, media, and music"
          className="block size-full object-contain"
        />
        <div className="absolute inset-x-[6%] top-[75%] h-[15%] px-[2%]" aria-label="Collections on the exchange">
          <div className="grid h-full grid-cols-11 items-center gap-[0.7%] text-[#e7bd66]">
            {COMING_SOON_CATEGORIES.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-w-0 flex-col items-center justify-center gap-[14%] text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                <Icon className="h-auto w-[2.7vw] max-w-[42px] min-w-[12px] stroke-[1.45]" aria-hidden="true" />
                <span className="line-clamp-2 min-h-[2.35em] text-[clamp(6px,0.62vw,11px)] font-semibold uppercase leading-[1.18] tracking-[0.08em]">
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
