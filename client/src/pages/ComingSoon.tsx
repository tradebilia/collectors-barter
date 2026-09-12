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
      <div className="relative mx-auto aspect-[1815/867] w-full">
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
              <label htmlFor={emailId} className="sr-only">Email for launch updates</label>
              <input
                id={emailId}
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
    </main>
  );
}
