import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { FormEvent, useId, useState } from "react";

const COMING_SOON_CATEGORY_COLORS = {
  COMICS: "#6f3b9e",
  "SPORTS CARDS": "#b0221a",
  POKEMON: "#a85d00",
  COINS: "#8b6200",
  STAMPS: "#087047",
  "VIDEO GAMES": "#a24760",
  AUTOGRAPHS: "#175d94",
  TOYS: "#9c2d69",
} as const;

const COMING_SOON_WHEEL_COLORS = [
  COMING_SOON_CATEGORY_COLORS.COMICS,
  COMING_SOON_CATEGORY_COLORS["SPORTS CARDS"],
  COMING_SOON_CATEGORY_COLORS.POKEMON,
  COMING_SOON_CATEGORY_COLORS.STAMPS,
  COMING_SOON_CATEGORY_COLORS.TOYS,
  COMING_SOON_CATEGORY_COLORS.AUTOGRAPHS,
] as const;

export default function ComingSoon() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const subscribeMutation = trpc.launchUpdates.subscribe.useMutation({ onSuccess: () => setSubmitted(true) });
  const signupErrorMessage = subscribeMutation.isError
    ? /invalid email|invalid_format/i.test(subscribeMutation.error.message)
      ? "Please enter a valid email address."
      : "We could not save your email right now. Please try again later."
    : null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (subscribeMutation.isPending) return;
    subscribeMutation.mutate({ email });
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#332218] text-[#2b2119]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/manus-storage/tradebilia-coming-soon-scattered-mixed-grade-workbench-extra-wide-parchment_9f77d258.png')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#24160f]/10" aria-hidden="true" />

      <section className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-10 sm:py-16">
        <div className="w-full max-w-xl -translate-y-8 text-center sm:max-w-2xl sm:-translate-y-8">
          <div className="mx-auto -mx-2 h-24 w-[calc(100%+1rem)] max-w-[calc(100%+1rem)] translate-y-12 overflow-visible px-2 sm:-mx-12 sm:h-32 sm:w-[calc(100%+12rem)] sm:max-w-[54rem] sm:translate-y-20 sm:px-4">
            <AnimatedLogoSmall70 fontSize={208} wheelScale={2.24} wheelOffsetX={-65} wheelOffsetY={-30} dividerScale={1.08} dividerOffsetY={-20} wordmarkColor="#2b2119" neutralCategoryColor="#2b2119" categoryColorOverrides={COMING_SOON_CATEGORY_COLORS} wheelColors={COMING_SOON_WHEEL_COLORS} wheelStrokeWidth={0} dividerStrokeWidth={3.6} fixedCategoryMetrics centerLockup centeredViewBoxWidth={4800} lockupScale={1.55} canvasWidthScale={1} contentOffsetX={150} />
          </div>

          <div className="translate-y-0 pt-8 sm:-translate-y-1 sm:pt-6">
            <div className="mx-auto mt-2 max-w-lg sm:mt-8">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b4f2f] sm:text-[10px]">The Collectors Trading Exchange</p>
              <h1 className="mt-2 font-serif text-4xl leading-[0.92] tracking-[-0.04em] text-[#2b2119] sm:mt-3 sm:text-6xl"><span>Why Buy or Sell</span><span className="mt-1 block sm:mt-2">When You Can Trade?</span></h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#4d3c2e]/80 sm:mt-5 sm:text-base">A home for remarkable collectibles—and the collectors who know their worth.</p>
              <div className="relative mx-auto mt-6 grid max-w-xl grid-cols-1 gap-2 text-left sm:mt-5 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-2" aria-label="Why collectors will use Tradebilia">
                <img src="/manus-storage/launching-soon-navy-clean_0cf4707a.png" alt="Launching Soon" className="pointer-events-none absolute -left-52 top-[38%] hidden w-44 -translate-y-1/2 rotate-[-4deg] object-contain drop-shadow-[0_3px_2px_rgba(43,33,25,0.12)] sm:block" />
                <p className="border-l-2 border-[#184b92]/55 pl-3 text-[11px] leading-4 text-[#4d3c2e]/85 sm:text-xs"><strong className="font-bold text-[#2b2119]">Trade without fees.</strong> No fees are charged to complete a trade.</p>
                <p className="border-l-2 border-[#184b92]/55 pl-3 text-[11px] leading-4 text-[#4d3c2e]/85 sm:text-xs"><strong className="font-bold text-[#2b2119]">Build trust faster.</strong> Connect more verified accounts to strengthen user authenticity.</p>
                <p className="border-l-2 border-[#184b92]/55 pl-3 text-[11px] leading-4 text-[#4d3c2e]/85 sm:text-xs"><strong className="font-bold text-[#2b2119]">Everything in one place.</strong> Keep your collection and trades organized.</p>
                <p className="border-l-2 border-[#184b92]/55 pl-3 text-[11px] leading-4 text-[#4d3c2e]/85 sm:text-xs"><strong className="font-bold text-[#2b2119]">Trade across categories.</strong> Swap sports cards for comics, toys, games, and more.</p>
              </div>
              <img src="/manus-storage/launching-soon-navy-clean_0cf4707a.png" alt="Launching Soon" className="mx-auto -mt-2 block w-36 rotate-[-2deg] object-contain drop-shadow-[0_2px_2px_rgba(43,33,25,0.12)] sm:hidden" />
              <div aria-label="Collections on the exchange" className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-x-5 gap-y-0 border-y border-[#6c503c]/20 py-0 text-[8px] font-bold uppercase tracking-[0.12em] text-[#4d3c2e]/72 sm:mt-1 sm:max-w-2xl sm:grid-cols-5 sm:gap-x-3 sm:gap-y-1 sm:py-1.5 sm:text-[9px]">
                <span>Comics</span>
                <span>Sports Cards</span>
                <span>Vintage Toys</span>
                <span>Video Games</span>
                <span>Stamps</span>
                <span>Coins</span>
                <span>Pokémon</span>
                <span>Movies</span>
                <span>Autographs</span>
                <span>Disney Pins</span>
              </div>
            </div>

            <div className="mx-auto mt-6 max-w-md sm:mt-4">
              <div className="relative">
                <div className={submitted ? "invisible" : undefined} aria-hidden={submitted || undefined}>
                  <div className="relative">
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
                  <div className="order-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <div className="relative flex-1 border border-[#6c503c]/35 bg-[#fffaf0]/80">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5a4536]/50" aria-hidden="true" />
                      <Input id={emailId} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email for early access" autoComplete="email" required className="h-10 border-0 bg-transparent pl-8 text-xs text-[#2b2119] placeholder:text-[#5a4536]/50 focus-visible:ring-0" />
                    </div>
                    <Button type="submit" disabled={subscribeMutation.isPending} className="h-10 rounded-sm bg-[#184b92] px-5 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#113a77] disabled:bg-[#184b92]/40">
                      {subscribeMutation.isPending ? "Saving…" : "Notify me"}
                      {!subscribeMutation.isPending && <ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden="true" />}
                    </Button>
                  </div>
                </form>
                {signupErrorMessage && <p role="alert" aria-live="polite" className="absolute inset-x-0 top-full mt-3 text-center text-sm font-medium text-[#aa3046]">{signupErrorMessage}</p>}
                  </div>
                </div>
                {submitted && (
                  <div role="status" aria-live="polite" className="absolute inset-x-0 top-0 border border-[#6c503c]/35 bg-[#fbf3e4]/92 px-5 py-3 shadow-sm sm:px-6">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-[#1f4d98]" aria-hidden="true" />
                      <h2 className="font-serif text-2xl text-[#2b2119]">You&apos;re on the list.</h2>
                    </div>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#4d3c2e]/80 sm:text-sm">Your launch-update signup is saved. We&apos;ll share news as Tradebilia opens its doors.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      <footer className="absolute bottom-0 left-0 right-0 bg-[#2b1b12]/40 px-4 py-3 text-center text-[8px] font-bold uppercase tracking-[0.16em] text-[#fff7e8]/70 sm:text-[9px]">© {new Date().getFullYear()} Tradebilia · Built for collectors, by collectors</footer>
    </main>
  );
}
