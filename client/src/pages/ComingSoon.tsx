import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { FormEvent, useId, useState } from "react";

const COMING_SOON_CATEGORIES = [
  "Sports Cards",
  "Comics",
  "Pokémon / Trading Card Games",
  "Vintage Toys",
  "Video Games",
  "Coins",
  "Stamps",
  "Music",
  "Autographs & Signed Memorabilia",
  "Disney Pins & Disney Collectibles",
  "VHS / DVD / Blu-ray / LaserDisc / Physical Media",
] as const;

export default function ComingSoon() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const subscribeMutation = trpc.launchUpdates.subscribe.useMutation({
    onSuccess: (result) => {
      setAlreadySubscribed(result.alreadySubscribed);
      setSubmitted(true);
    },
  });
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
    <main className="relative min-h-screen overflow-hidden bg-[#120d0b] text-white">
      <picture>
        <source media="(max-width: 639px)" srcSet="/manus-storage/coming-soon-stamps-no-logo-mobile_37b07e9e.png" />
        <img
          src="/manus-storage/coming-soon-stamps-no-logo-desktop_21bf9403.png"
          alt="Tradebilia collectors trading exchange coming soon scene with comics, cards, games, toys, coins, stamps, Music, and other collectibles"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </picture>
      <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-[4%] z-10 mx-auto h-32 w-[min(34rem,94vw)] sm:top-[9%] sm:h-40 sm:w-[min(58rem,88vw)]" aria-label="Animated Tradebilia logo">
        <AnimatedLogoSmall70 centerLockup fontSize={86} lockupScale={0.9} categoryColorOverrides={{ BILIA: "#FFFFFF" }} />
      </div>
      <section className="relative min-h-screen" aria-label="Tradebilia Coming Soon">
        <div className="sr-only">
          <h1>Why Buy or Sell When You Can Trade?</h1>
          <p>Tradebilia connects collectors so your collection can grow.</p>
          <ul aria-label="Collections on the exchange">
            {COMING_SOON_CATEGORIES.map((category) => <li key={category}>{category}</li>)}
          </ul>
        </div>

        <div className="absolute left-1/2 top-[30%] z-10 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 sm:top-[60%]">
          <div className="min-h-[6.5rem] rounded-xl border border-white/25 bg-[#130d0b]/98 p-3 pb-5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-[2px]">
            <div className={submitted ? "invisible" : undefined} aria-hidden={submitted || undefined}>
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-1.5 sm:flex-row">
                <div className="relative min-w-0 flex-1 rounded-md border border-white/35 bg-black/30">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/75" aria-hidden="true" />
                  <Input id={emailId} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email for early access" autoComplete="email" required className="h-11 border-0 bg-transparent pl-9 text-sm text-white placeholder:text-white/70 focus-visible:ring-0" />
                </div>
                <Button type="submit" disabled={subscribeMutation.isPending} className="h-11 rounded-md bg-[#e7b65f] px-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#24130c] hover:bg-[#f1c978] disabled:bg-[#e7b65f]/50">
                  {subscribeMutation.isPending ? "Saving…" : "Notify me"}
                  {!subscribeMutation.isPending && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
                </Button>
              </form>
              <p className="mt-1 text-center text-[10px] text-white/80 sm:text-[11px]">We&apos;ll only use your email for Tradebilia launch updates.</p>
              {signupErrorMessage && <p role="alert" aria-live="polite" className="mt-2 text-center text-sm font-medium text-[#ffd1d1]">{signupErrorMessage}</p>}
            </div>
            {submitted && (
              <div role="status" aria-live="polite" className="px-3 py-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#e7b65f]" aria-hidden="true" />
                  <h2 className="font-serif text-xl text-white">You&apos;re on the list.</h2>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/85">{alreadySubscribed ? "You&apos;re already on the early-access list. We&apos;ll share news as Tradebilia opens its doors." : "Your launch-update signup is saved. We&apos;ll share news as Tradebilia opens its doors."}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
