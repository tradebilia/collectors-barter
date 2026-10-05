import { FormEvent, useId, useState } from "react";
import { Box, CircleDot, Coins, Gamepad2, Music2, PenLine, Stamp, Tag, Tv } from "lucide-react";
import { trpc } from "@/lib/trpc";

const SUPPLIED_COMING_SOON_SVG_URL = "/manus-storage/Tradebilia_Hero_Logo_Fully_Opaque_Large_fc0f5b5b.svg";
const SUPPLIED_BOTTOM_STRIP_URL = "/manus-storage/pasted_file_wvBASJ_image_bce6bd30.png";
const collectorPhrases = [
  "Discover rare finds",
  "Trade with confidence",
  "No trading fees",
  "Trade across categories",
  "Build trust faster",
  "Interactive trading platform",
  "A.I. assisted trade evaluation",
] as const;

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
      {/* The supplied SVG artwork is rendered unchanged as the desktop visual layer. */}
      <div className="relative mx-auto hidden aspect-[1810/869] w-full sm:block">
        <img src={SUPPLIED_COMING_SOON_SVG_URL} alt="" aria-hidden="true" className="absolute inset-0 size-full object-contain" />

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

      <div className="hidden w-full bg-[#0b0705] px-4 py-3 sm:block" aria-label="Tradebilia collector benefits">
        <img src={SUPPLIED_BOTTOM_STRIP_URL} alt="Discover rare finds. Trade with confidence. No trading fees. Trade across categories. Build trust faster. Interactive trading platform. A.I. assisted trade evaluation." className="mx-auto block h-auto w-full max-w-[1372px]" />
      </div>

      {/* Mobile uses one shallow crop of the supplied artwork, then a solid readable content panel. */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#0b0705] px-4 pb-8 pt-0 text-center text-[#f4efe4] sm:hidden" aria-label="Tradebilia mobile launch signup">
        <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden bg-[#0b0705]" aria-hidden="true">
          <img src={SUPPLIED_COMING_SOON_SVG_URL} alt="" className="absolute inset-x-0 top-0 h-auto w-full opacity-90" />
          <div className="absolute inset-x-0 top-0 h-[15.5rem] bg-[linear-gradient(180deg,rgba(11,7,5,0.04)_0%,rgba(11,7,5,0.16)_52%,rgba(11,7,5,0.96)_100%)]" />
        </div>

        <header className="h-[14.25rem] shrink-0" aria-label="Tradebilia mobile coming soon artwork">
          <h1 className="sr-only">Tradebilia — Why Buy or Sell When You Can Trade?</h1>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-[22rem] rounded-sm border border-[#e3ab5e]/30 bg-[#0b0705]/90 px-3 pb-4 pt-3 shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
          <p className="text-[0.59rem] leading-4 text-[#f4efe4]/80">Every collectible has a story. Join the exchange when Tradebilia launches.</p>
          <div className="mt-4">
          <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#e3ab5e]">Notify Me</p>
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

          <section className="mt-5 w-full" aria-label="Tradebilia collector categories">
            <div className="grid grid-cols-5 gap-x-1 gap-y-3 border-y border-[#e3ab5e]/35 py-4">
              {mobileCategories.map(({ label, Icon }) => (
                <div key={label} className="flex min-w-0 flex-col items-center gap-1 text-[#e3ab5e]">
                  <Icon className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                  <span className="text-[0.49rem] font-semibold leading-[1.1] uppercase tracking-[0.035em]">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <footer className="mt-5 w-full pt-1">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#e3ab5e]">Built for collectors&nbsp;&nbsp;•&nbsp;&nbsp;By collectors</p>
            <div className="mx-auto mt-3 flex max-w-[20rem] flex-wrap justify-center gap-x-2 gap-y-1 border-t border-[#e3ab5e]/20 pt-2 text-[0.48rem] font-medium uppercase leading-[1.25] tracking-[0.09em] text-[#e3ab5e]/90" aria-label="Tradebilia collector benefits">
              {collectorPhrases.map((phrase, index) => (
                <span key={phrase} className="whitespace-nowrap">{phrase}{index < collectorPhrases.length - 1 ? " ◆" : ""}</span>
              ))}
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
