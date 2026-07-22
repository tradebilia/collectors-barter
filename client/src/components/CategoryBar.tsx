import { Link, useRoute } from "wouter";
import { tradebiliaCategories } from "@/lib/tradebilia";

export function CategoryBar() {
  const [, params] = useRoute("/category/:slug");
  const currentSlug = params?.slug;

  // Determine if we're on the home page
  const isHomePage = useRoute("/")[0];

  const baseClass = [
    "relative flex-1 px-4 py-4 text-center text-sm font-semibold uppercase",
    "tracking-[0.16em] lg:text-[1.1rem] whitespace-nowrap",
    "text-white/80 transition-colors duration-200 hover:text-white",
    // Hover underline slide-in (Option D)
    "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2",
    "after:h-[3px] after:w-0 after:rounded-full after:bg-white/60",
    "after:transition-all after:duration-300 hover:after:w-4/5",
    "border-r border-white/10",
  ].join(" ");

  const activeClass = [
    "relative flex-1 px-4 py-4 text-center text-sm font-semibold uppercase",
    "tracking-[0.16em] lg:text-[1.1rem] whitespace-nowrap",
    "text-white transition-colors duration-200",
    // Active bottom border indicator (Option B) — gold accent
    "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2",
    "after:h-[3px] after:w-4/5 after:rounded-full after:bg-amber-400",
    "border-r border-white/10",
  ].join(" ");

  return (
    <nav className="relative z-0 border-b border-white/10 bg-black">
      <div className="flex w-full overflow-x-auto">
        <Link
          href="/"
          className={isHomePage === true ? activeClass : baseClass}
        >
          Home
        </Link>
        {tradebiliaCategories.map(category => (
          <Link
            key={category.value}
            href={`/category/${category.value}`}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={category.value === currentSlug ? activeClass : baseClass}
          >
            {category.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
