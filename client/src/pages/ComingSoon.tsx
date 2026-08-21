import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const consentId = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const subscribeMutation = trpc.launchUpdates.subscribe.useMutation({ onSuccess: () => setSubmitted(true) });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consent || subscribeMutation.isPending) return;
    subscribeMutation.mutate({ email });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#332218] text-[#2b2119]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/manus-storage/tradebilia-coming-soon-scattered-mixed-grade-workbench-extra-wide-parchment_9f77d258.png')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#24160f]/10" aria-hidden="true" />

      <section className="relative flex min-h-screen items-center justify-center px-5 py-12 sm:px-10 sm:py-16">
        <div className="w-full max-w-xl text-center sm:max-w-2xl">
          <div className="mx-auto h-24 w-full max-w-[27rem] translate-y-6 sm:h-28 sm:max-w-[42rem]">
            <AnimatedLogoSmall70 fontSize={196} wheelScale={2.24} wheelOffsetX={-65} wheelOffsetY={-30} dividerScale={1.55} dividerOffsetY={-20} wordmarkColor="#2b2119" neutralCategoryColor="#2b2119" categoryColorOverrides={COMING_SOON_CATEGORY_COLORS} wheelColors={COMING_SOON_WHEEL_COLORS} wheelStrokeWidth={6} dividerStrokeWidth={3.6} fixedCategoryMetrics centerLockup centeredViewBoxWidth={3000} />
          </div>

          <div className="-translate-y-1 sm:-translate-y-8">
            <div className="mx-auto mt-2 max-w-lg sm:mt-10">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b4f2f] sm:text-[10px]">The Collectors Trading Exchange</p>
              <h1 className="mt-2 font-serif text-4xl leading-[0.92] tracking-[-0.04em] text-[#2b2119] sm:mt-3 sm:text-6xl">Every collection<br />has a next chapter.</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#4d3c2e]/80 sm:mt-5 sm:text-base">A home for remarkable collectibles—and the collectors who know their worth.</p>
              <div aria-label="Collections on the exchange" className="mx-auto mt-2 grid max-w-md grid-cols-2 gap-x-5 gap-y-1 border-y border-[#6c503c]/20 py-2 text-[8px] font-bold uppercase tracking-[0.12em] text-[#4d3c2e]/72 sm:mt-6 sm:max-w-2xl sm:grid-cols-5 sm:gap-x-3 sm:gap-y-1.5 sm:py-3 sm:text-[9px]">
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

            <div className="mx-auto mt-0 max-w-md sm:mt-0">
            {submitted ? (
              <div className="border border-[#6c503c]/35 bg-[#fbf3e4]/70 px-6 py-6 shadow-sm">
                <CheckCircle2 className="mx-auto h-9 w-9 text-[#1f4d98]" aria-hidden="true" />
                <h2 className="mt-3 font-serif text-3xl text-[#2b2119]">You&apos;re on the list.</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#4d3c2e]/80">Your launch-update signup is saved. We&apos;ll share news as Tradebilia opens its doors.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <div className="relative flex-1 border border-[#6c503c]/35 bg-[#fffaf0]/80">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5a4536]/50" aria-hidden="true" />
                    <Input id={emailId} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email for early access" autoComplete="email" required className="h-10 border-0 bg-transparent pl-8 text-xs text-[#2b2119] placeholder:text-[#5a4536]/50 focus-visible:ring-0" />
                  </div>
                  <Button type="submit" disabled={!consent || subscribeMutation.isPending} className="h-10 rounded-sm bg-[#184b92] px-5 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#113a77] disabled:bg-[#184b92]/40">
                    {subscribeMutation.isPending ? "Saving…" : "Notify me"}
                    {!subscribeMutation.isPending && <ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden="true" />}
                  </Button>
                </div>
                <label htmlFor={consentId} className="mt-3 flex cursor-pointer items-start justify-center gap-2 text-left text-[11px] leading-4 text-[#4d3c2e]/75 sm:text-center">
                  <Checkbox id={consentId} checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} className="mt-px border-[#6c503c]/45 data-[state=checked]:border-[#184b92] data-[state=checked]:bg-[#184b92]" />
                  <span>Yes, I&apos;d like to receive launch updates and future collector features.</span>
                </label>
                {subscribeMutation.isError && <p role="alert" className="mt-3 text-sm font-medium text-[#aa3046]">{subscribeMutation.error.message}</p>}
              </form>
            )}
            </div>
          </div>

        </div>
      </section>

      <footer className="absolute bottom-0 left-0 right-0 bg-[#2b1b12]/40 px-4 py-3 text-center text-[8px] font-bold uppercase tracking-[0.16em] text-[#fff7e8]/70 sm:text-[9px]">© {new Date().getFullYear()} Tradebilia · Built for collectors, by collectors</footer>
    </main>
  );
}
