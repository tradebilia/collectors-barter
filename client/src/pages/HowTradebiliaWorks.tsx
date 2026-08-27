import { Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Handshake,
  MessageCircle,
  PackagePlus,
  Search,
  ShieldCheck,
  Star,
  Truck,
  UserRoundPlus,
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { Button } from "@/components/ui/button";

const TRADEBILIA_LOGO_URL = "https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg";

const steps = [
  {
    number: "01",
    title: "Create your collector profile",
    description: "Set up a Tradebilia profile with a public display name and the collection details you want other members to see.",
    icon: UserRoundPlus,
  },
  {
    number: "02",
    title: "Add your collectibles",
    description: "Publish the items you are open to trading, including clear photos, condition, grade when applicable, and an estimated value.",
    icon: PackagePlus,
  },
  {
    number: "03",
    title: "Discover an item or collector",
    description: "Browse categories, explore individual listings, visit collector profiles, and use the Member Directory to find a potential trade fit.",
    icon: Search,
  },
  {
    number: "04",
    title: "Send a trade proposal",
    description: "Choose the item you are interested in and send a structured trade request. The other collector can review it, decline it, or select items for a response.",
    icon: Handshake,
  },
  {
    number: "05",
    title: "Discuss and agree in the Trade Room",
    description: "Use the Trade Room to review the proposed exchange, communicate, and work through changes before both collectors agree to the terms.",
    icon: MessageCircle,
  },
  {
    number: "06",
    title: "Confirm, ship, and share tracking",
    description: "After the trade is confirmed, follow the Trade Room instructions, exchange the needed shipping details, ship carefully, and add tracking when available.",
    icon: Truck,
  },
  {
    number: "07",
    title: "Complete the exchange",
    description: "Confirm receipt after the collectibles arrive. Completed trades become part of the platform’s real trade activity, not a promotional claim.",
    icon: CheckCircle2,
  },
  {
    number: "08",
    title: "Leave a review or report a concern",
    description: "Share a fair review after a completed trade. If a concern arises, use the reporting tools so Tradebilia can review the relevant context.",
    icon: Star,
  },
] as const;

export default function HowTradebiliaWorks() {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#2d241e]">
      <TopBar logoUrl={TRADEBILIA_LOGO_URL} searchPlaceholder="Search Tradebilia..." />

      <main>
        <section className="relative overflow-hidden border-b border-[#2a2543] bg-[#101b3c] px-4 py-16 text-white sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(90,67,214,0.52),transparent_39%),radial-gradient(circle_at_86%_100%,rgba(30,127,196,0.35),transparent_42%)]" />
          <div className="relative mx-auto max-w-5xl text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-violet-200">Collector-to-collector trading</p>
            <h1 className="font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl lg:text-6xl">How Tradebilia Works</h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/78 sm:text-lg">
              Tradebilia helps collectors discover items, make thoughtful offers, document the exchange, and complete trades with a clear shared process.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
              <ShieldCheck className="h-4 w-4" />
              Free Launch access is currently available to members.
            </div>
          </div>
        </section>

        <CategoryBar />

        <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-700">The trade journey</p>
            <h2 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em] text-[#2d241e] sm:text-5xl">From collection to confirmed exchange</h2>
            <p className="mt-5 text-base leading-8 text-[#655b53]">Every trade is different, but the member journey follows the same clear sequence.</p>
          </div>

          <div className="relative mx-auto mt-12 max-w-5xl space-y-4 sm:space-y-5">
            <div aria-hidden="true" className="absolute bottom-8 left-[2.55rem] top-8 hidden w-px bg-gradient-to-b from-violet-300 via-violet-200 to-transparent sm:block" />
            {steps.map(({ number, title, description, icon: Icon }) => (
              <article key={number} className="relative grid gap-4 rounded-[1.5rem] border border-[#ded7ce] bg-white/85 p-5 shadow-[0_16px_36px_-30px_rgba(45,36,30,0.7)] transition-colors hover:border-violet-300 sm:grid-cols-[auto_1fr] sm:gap-6 sm:p-7">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5036b9] to-[#294eaa] text-white shadow-[0_10px_20px_-12px_rgba(67,44,160,0.8)] sm:h-14 sm:w-14">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                  <span className="sr-only">Step {number}</span>
                </div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-xs font-bold tracking-[0.18em] text-violet-700">STEP {number}</span>
                    <h3 className="font-serif text-2xl font-medium tracking-[-0.02em] text-[#2d241e] sm:text-3xl">{title}</h3>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[#655b53] sm:text-base">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[#d7cfc4] bg-[#eee8df] px-4 py-12 sm:py-16">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-700">Trade thoughtfully</p>
              <h2 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em] text-[#2d241e]">Good trades depend on clear communication.</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#655b53]">Review listings closely, discuss expectations in the Trade Room, use tracked shipping when available, and confirm only when the terms work for both collectors.</p>
            </div>
            <div className="rounded-[1.75rem] border border-violet-200 bg-white p-6 shadow-[0_20px_40px_-28px_rgba(45,36,30,0.52)]">
              <ShieldCheck className="h-8 w-8 text-violet-700" aria-hidden="true" />
              <h3 className="mt-4 font-serif text-2xl font-medium text-[#2d241e]">Need to raise a concern?</h3>
              <p className="mt-3 text-sm leading-7 text-[#655b53]">Use the reporting tools for a member or a trade issue. Relevant context stays with the authorized review process.</p>
              <Link href="/report-user" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-violet-700 transition-colors hover:text-violet-900">
                Learn about reporting <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:py-18">
          <div className="mx-auto flex max-w-5xl flex-col items-center rounded-[2rem] bg-[linear-gradient(135deg,#171d43,#30265f)] px-6 py-12 text-center text-white shadow-[0_24px_54px_-30px_rgba(19,22,57,0.8)] sm:px-10 sm:py-14">
            <Handshake className="h-10 w-10 text-violet-200" aria-hidden="true" />
            <h2 className="mt-5 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">Ready to explore?</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/76">Browse collectibles now, or join Tradebilia to build your collection and begin a trade when you find the right match.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/search">
                <Button className="rounded-full bg-white px-6 text-[#211a42] hover:bg-violet-100">Explore collectibles</Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" className="rounded-full border-white/35 bg-white/5 px-6 text-white hover:bg-white/12 hover:text-white">Join Tradebilia</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/50 px-4 py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-2">
            <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="h-8 w-auto opacity-70" />
            <span className="text-sm font-medium text-white/40">© 2026 Tradebilia. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm text-white/55">
            <Link href="/how-it-works" className="font-semibold text-violet-200 hover:text-white">How Tradebilia Works</Link>
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
