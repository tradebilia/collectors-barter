import { Link, useRoute } from "wouter";
import { tradebiliaCategories } from "@/lib/tradebilia";

export function CategoryBar() {
  const [, params] = useRoute("/category/:slug");
  const currentSlug = params?.slug;

  // Determine if we're on the home page
  const isHomePage = useRoute("/")[0];

  return (
    <nav className="relative z-0 bg-black border-b border-white/10 px-4 py-2.5">
      <div className="flex w-full overflow-x-auto rounded-xl bg-[#1a1f2e] px-1.5 py-1.5 gap-0.5">
        <Link
          href="/"
          className={`flex-shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-150 ${
            isHomePage === true
              ? "bg-[#2d3348] text-white shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          Home
        </Link>
        {tradebiliaCategories.map(category => (
          <Link
            key={category.value}
            href={`/category/${category.value}`}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={`flex-shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-150 ${
              category.value === currentSlug
                ? "bg-[#2d3348] text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {category.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
