import { Link, useRoute } from "wouter";
import { tradebiliaCategories } from "@/lib/tradebilia";

export function CategoryBar() {
  const [, params] = useRoute("/category/:slug");
  const currentSlug = params?.slug;
  
  // Determine if we're on the home page
  const isHomePage = useRoute("/")[0];

  return (
    <nav className="relative z-10 border-b border-white/10 bg-black">
      <div className="flex w-full overflow-x-auto">
        <Link
          href="/"
          className={`flex-1 border-r border-white/10 px-4 py-4 text-center text-sm font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10 lg:text-base whitespace-nowrap ${
            isHomePage === true ? "bg-white text-slate-950" : "text-white"
          }`}
        >
          Home
        </Link>
        {tradebiliaCategories.map(category => (
          <Link
            key={category.value}
            href={`/category/${category.value}`}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`flex-1 border-r border-white/10 px-4 py-4 text-center text-sm font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10 lg:text-base whitespace-nowrap ${
              category.value === currentSlug ? "bg-white text-slate-950" : "text-white"
            }`}
          >
            {category.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
