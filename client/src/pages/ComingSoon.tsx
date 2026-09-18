import { FormEvent, useId, useState } from "react";
import { Box, CircleDot, Coins, Disc3, Gamepad2, Music2, PenLine, Stamp, Tag, Tv } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TradebiliaWheel } from "@/components/TradebiliaWheel";

const SUPPLIED_COMING_SOON_HTML_URL = "/manus-storage/tradebilia_coming_soon_exact_ba8c631b.html";

const mobileCategories = [
  { label: "Sports Cards", Icon: CircleDot },
  { label: "Comics", Icon: Box },
  { label: "Pokémon", Icon: Tag },
  { label: "Vintage Toys", Icon: Box },
  { label: "Video Games", Icon: Gamepad2 },
  { label: "Coins", Icon: Coins },
  { label: "Stamps", Icon: Stamp },
  { label: "Autographs", Icon: PenLine },
  { label: "Movies", Icon: Tv },
  { label: "Music", Icon: Music2 },
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
    <main className="min-h-[100svh] overflow-hidden bg-[#0b0705]" aria-label="Tradebilia Coming Soon">
      {/* The supplied artwork remains the exact desktop experience. */}
      <div className="relative mx-auto hidden aspect-[1815/867] w-full sm:block">
        <iframe
          src={SUPPLIED_COMING_SOON_HTML_URL}
          title="Tradebilia Coming Soon"
          className="pointer-events-none absolute inset-0 size-full border-0"
          sandbox=""
          aria-hidden="true"
        />

        <section className="absolute left-1/2 top-[65.5%] h-[5.6%] w-[27%] -translate-x-1/2 -translate-y-1/2" aria-label="Tradebilia launch email signup">
          {submitted ? (
            <div role="status" aria-live="polite" className="absolute left-1/2 top-1/2 flex h-full w-full -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-[#e3ab5e]/80 bg-[#0b0705]/90 px-2 text-center text-[clamp(7px,0.56cqw,11px)] font-medium uppercase tracking-[0.1em] text-[#e3ab5e]">
              {alreadySubscribed ? "You’re already on the launch list." : "You’re on the launch list."}
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="size-full">
              <label htmlFor={`${emailId}-desktop`} className="sr-only">Email for launch updates</label>
              <input
                id={`${emailId}-desktop`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                placeholder="Enter your email for early access"
                className="absolute inset-y-0 left-0 w-[74%] border border-[#e3ab5e]/80 bg-[#0b0705]/78 px-[3%] text-[clamp(8px,0.62cqw,12px)] text-[#f4efe4] outline-none placeholder:text-[#f4efe4]/78 focus:border-[#f4efe4]"
              />
              <button type="submit" disabled={subscribeMutation.isPending} className="absolute inset-y-0 right-0 flex w-[26%] cursor-pointer items-center justify-center border border-l-0 border-[#e3ab5e]/80 bg-[#e3ab5e] text-[clamp(7px,0.52cqw,10px)] font-bold uppercase tracking-[0.12em] text-[#0b0705] transition-colors hover:bg-[#f0c77f] disabled:bg-[#e3ab5e]/55" aria-label={subscribeMutation.isPending ? "Saving email" : "Notify me for launch updates"}>
                {subscribeMutation.isPending ? "Saving…" : "Notify me"}
              </button>
              {signupErrorMessage && <p role="alert" aria-live="polite" className="absolute left-1/2 top-full mt-1 w-max max-w-[190%] -translate-x-1/2 bg-[#0b0705]/90 px-1 text-center text-[clamp(7px,0.5cqw,10px)] font-medium text-[#ffd5d5]">{signupErrorMessage}</p>}
            </form>
          )}
        </section>
      </div>

      {/* Mobile keeps the desktop visual identity, but reflows its dense landscape composition into a readable vertical layout. */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden px-4 pb-5 pt-6 text-center text-[#f4efe4] sm:hidden" aria-label="Tradebilia mobile launch signup">
        <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden bg-[#0b0705]" aria-hidden="true">
          <iframe
            src={SUPPLIED_COMING_SOON_HTML_URL}
            title=""
            className="absolute left-1/2 top-0 h-full w-auto max-w-none -translate-x-1/2 opacity-45"
            sandbox=""
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,7,5,0.88)_0%,rgba(11,7,5,0.64)_20%,rgba(11,7,5,0.68)_53%,rgba(11,7,5,0.94)_100%)]" />
        </div>

        <header className="mx-auto w-full max-w-[22rem]">
          <div className="flex items-center justify-center gap-2.5 drop-shadow-[0_3px_8px_rgba(0,0,0,0.75)]">
            <TradebiliaWheel className="h-12 w-12 shrink-0" />
            <span className="h-12 w-px bg-white/90" aria-hidden="true" />
            <h1 className="text-[1.75rem] font-semibold leading-none tracking-[0.03em] text-white">TRADEBILIA</h1>
          </div>
          <h2 className="mx-auto mt-5 max-w-[19rem] font-serif text-[2rem] leading-[1.05] text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.8)]">Why Buy or Sell<br />When You Can Trade?</h2>
          <p className="mx-auto mt-3 max-w-[19rem] text-[0.8rem] leading-5 text-[#f4efe4]/95 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">Every collectible has a story. Tradebilia connects collectors so your collection can grow.</p>
        </header>

        <div className="mx-auto mt-5 w-full max-w-[22rem]">
          {submitted ? (
            <div role="status" aria-live="polite" className="border border-[#e3ab5e]/90 bg-[#0b0705]/85 px-3 py-3 text-sm font-medium uppercase tracking-[0.1em] text-[#e3ab5e]">
              {alreadySubscribed ? "You’re already on the launch list." : "You’re on the launch list."}
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex h-12 w-full">
              <label htmlFor={`${emailId}-mobile`} className="sr-only">Email for launch updates</label>
              <input
                id={`${emailId}-mobile`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                placeholder="Your email address"
                className="min-w-0 flex-1 border border-[#e3ab5e]/85 bg-[#0b0705]/75 px-3 text-sm text-[#f4efe4] outline-none placeholder:text-[#f4efe4]/70 focus:border-[#f4efe4]"
              />
              <button type="submit" disabled={subscribeMutation.isPending} className="w-[31%] border border-l-0 border-[#e3ab5e]/85 bg-[#e3ab5e] px-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#0b0705] transition-colors hover:bg-[#f0c77f] active:scale-[0.98] disabled:bg-[#e3ab5e]/55" aria-label={subscribeMutation.isPending ? "Saving email" : "Notify me for launch updates"}>
                {subscribeMutation.isPending ? "Saving…" : "Notify me"}
              </button>
            </form>
          )}
          {signupErrorMessage && <p role="alert" aria-live="polite" className="mt-2 text-center text-sm font-medium text-[#ffd5d5]">{signupErrorMessage}</p>}
        </div>

        <section className="mx-auto mt-6 w-full max-w-[22rem]" aria-label="Tradebilia collector categories">
          <div className="grid grid-cols-5 gap-x-1 gap-y-3 border-y border-[#e3ab5e]/35 py-4">
            {mobileCategories.map(({ label, Icon }) => (
              <div key={label} className="flex min-w-0 flex-col items-center gap-1 text-[#e3ab5e]">
                <Icon className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                <span className="text-[0.49rem] font-semibold leading-[1.1] uppercase tracking-[0.035em]">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="mx-auto mt-5 w-full max-w-[22rem] pt-1">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-[#e3ab5e]">Built for collectors&nbsp;&nbsp;•&nbsp;&nbsp;By collectors</p>
          <p className="mt-3 text-[0.59rem] leading-4 text-[#e3ab5e]/85">Discover rare finds&nbsp;&nbsp;•&nbsp;&nbsp;Trade with confidence&nbsp;&nbsp;•&nbsp;&nbsp;No trading fees&nbsp;&nbsp;•&nbsp;&nbsp;Trade across categories</p>
        </footer>
      </section>
    </main>
  );
}
