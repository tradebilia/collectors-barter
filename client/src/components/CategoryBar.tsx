import { Link, useRoute } from "wouter";
import { tradebiliaCategories } from "@/lib/tradebilia";
import {
  Home,
  BookOpen,
  Trophy,
  Bot,
  Gamepad2,
  Stamp,
  CircleDollarSign,
  Zap,
  Film,
  PenLine,
  Castle,
} from "lucide-react";

// Map each category to a Lucide icon
const categoryIcons: Record<string, React.ReactNode> = {
  home: <Home className="w-6 h-6" />,
  comics: <BookOpen className="w-6 h-6" />,
  sports_cards: <Trophy className="w-6 h-6" />,
  vintage_toys: <Bot className="w-6 h-6" />,
  video_games: <Gamepad2 className="w-6 h-6" />,
  stamps: <Stamp className="w-6 h-6" />,
  coins: <CircleDollarSign className="w-6 h-6" />,
  pokemon: <Zap className="w-6 h-6" />,
  movies: <Film className="w-6 h-6" />,
  autographs: <PenLine className="w-6 h-6" />,
  disney_pins: <Castle className="w-6 h-6" />,
};

function CategoryTab({
  href,
  label,
  iconKey,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  iconKey: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "relative flex flex-1 flex-col items-center justify-center gap-1.5",
        "px-3 py-3 text-center whitespace-nowrap select-none",
        "border-r border-white/10 last:border-r-0",
        "transition-colors duration-150",
        isActive
          ? "bg-[#1a2a4a] text-white"
          : "bg-transparent text-white/70 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      {/* Blue left accent bar for active tab */}
      {isActive && (
        <span className="absolute left-0 top-0 h-full w-[4px] rounded-r-sm bg-blue-500" />
      )}
      {/* Icon */}
      <span className="flex items-center justify-center opacity-90">
        {categoryIcons[iconKey]}
      </span>
      {/* Label */}
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] leading-none">
        {label}
      </span>
    </Link>
  );
}

export function CategoryBar() {
  const [, params] = useRoute("/category/:slug");
  const currentSlug = params?.slug;
  const isHomePage = useRoute("/")[0];

  return (
    <nav className="relative z-0 bg-[#0f1929] border-b border-white/10">
      <div className="flex w-full overflow-x-auto">
        <CategoryTab
          href="/"
          label="Home"
          iconKey="home"
          isActive={isHomePage === true}
        />
        {tradebiliaCategories.map(category => (
          <CategoryTab
            key={category.value}
            href={`/category/${category.value}`}
            label={category.label}
            iconKey={category.value}
            isActive={category.value === currentSlug}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          />
        ))}
      </div>
    </nav>
  );
}
