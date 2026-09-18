import { FormEvent, useId, useState } from "react";
import { trpc } from "@/lib/trpc";

const SUPPLIED_COMING_SOON_HTML_URL = "/manus-storage/tradebilia_coming_soon_exact_ba8c631b.html";

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

      {/* Mobile uses a purpose-built vertical composition instead of shrinking the wide desktop artwork. */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden px-5 pb-6 pt-8 text-center text-[#f4efe4] sm:hidden" aria-label="Tradebilia mobile launch signup">
        <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden bg-[#0b0705]" aria-hidden="true">
          <iframe
            src={SUPPLIED_COMING_SOON_HTML_URL}
            title=""
            className="absolute left-1/2 top-0 h-full w-auto max-w-none -translate-x-1/2 opacity-25"
            sandbox=""
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,7,5,0.36)_0%,rgba(11,7,5,0.72)_35%,#0b0705_92%)]" />
        </div>

        <header className="mx-auto max-w-[21rem]">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#e3ab5e]">Collectors trading exchange</p>
          <h1 className="mt-3 text-[2rem] font-black leading-none tracking-[0.045em] text-white">TRADEBILIA</h1>
          <h2 className="mx-auto mt-6 max-w-[19rem] font-serif text-[2rem] leading-[1.05] text-white">Why Buy or Sell<br />When You Can Trade?</h2>
          <p className="mx-auto mt-4 max-w-[18rem] text-sm leading-6 text-[#f4efe4]/85">Every collectible has a story. Tradebilia connects collectors so your collection can grow.</p>
        </header>

        <div className="my-auto py-8">
          <div className="mx-auto max-w-[22rem] rounded-2xl border border-[#e3ab5e]/60 bg-[#0b0705]/85 p-4 shadow-[0_12px_35px_rgba(0,0,0,0.3)] backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e3ab5e]">Launching soon</p>
            <p className="mt-2 text-sm leading-5 text-[#f4efe4]/80">Be first to know when collector-to-collector trading opens.</p>
            {submitted ? (
              <div role="status" aria-live="polite" className="mt-4 rounded-lg border border-[#e3ab5e]/80 bg-[#0b0705]/80 px-3 py-4 text-sm font-medium text-[#e3ab5e]">
                {alreadySubscribed ? "You’re already on the launch list." : "You’re on the launch list."}
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
                <label htmlFor={`${emailId}-mobile`} className="sr-only">Email for launch updates</label>
                <input
                  id={`${emailId}-mobile`}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  placeholder="Enter your email address"
                  className="h-12 w-full rounded-lg border border-[#e3ab5e]/70 bg-[#0b0705]/70 px-4 text-base text-[#f4efe4] outline-none placeholder:text-[#f4efe4]/60 focus:border-[#f4efe4]"
                />
                <button type="submit" disabled={subscribeMutation.isPending} className="h-12 w-full rounded-lg bg-[#e3ab5e] px-4 text-sm font-bold uppercase tracking-[0.16em] text-[#0b0705] transition-colors hover:bg-[#f0c77f] active:scale-[0.98] disabled:bg-[#e3ab5e]/55" aria-label={subscribeMutation.isPending ? "Saving email" : "Notify me for launch updates"}>
                  {subscribeMutation.isPending ? "Saving…" : "Notify me"}
                </button>
                {signupErrorMessage && <p role="alert" aria-live="polite" className="text-center text-sm font-medium text-[#ffd5d5]">{signupErrorMessage}</p>}
              </form>
            )}
          </div>
        </div>

        <footer className="mx-auto max-w-[22rem] border-t border-[#e3ab5e]/30 pt-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#e3ab5e]">Built for collectors · By collectors</p>
          <p className="mt-3 text-xs leading-5 text-[#f4efe4]/75">Discover rare finds · Trade with confidence · No trading fees · Trade across categories</p>
        </footer>
      </section>
    </main>
  );
}
