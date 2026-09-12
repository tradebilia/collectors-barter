import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

import SuppliedComingSoonLogo from "@/components/SuppliedComingSoonLogo";

const SUPPLIED_TIDBITS = [
  "Discover rare finds",
  "Trade with confidence",
  "No trading fees",
  "Trade across categories",
  "Build trust faster",
  "Interactive trading platform",
  "A.I. assisted trade evaluation",
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
    <main className="min-h-[100svh] overflow-x-hidden bg-[#0b0705]" aria-label="Tradebilia Coming Soon">
      <div className="relative mx-auto aspect-[1815/867] w-full max-w-[1815px] overflow-hidden [container-type:inline-size]">
        <img src="/manus-storage/coming-soon-exact-supplied-clean-row_d8aa56d4.png" alt="Tradebilia collector room" className="absolute inset-0 size-full object-contain" />

        <div className="absolute left-1/2 top-[32%] w-max -translate-x-1/2 -translate-y-1/2">
          <SuppliedComingSoonLogo />
        </div>

        <section className="absolute left-1/2 top-[68%] w-[min(74%,520px)] -translate-x-1/2" aria-label="Tradebilia launch email signup">
          {submitted ? (
            <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 text-center text-[clamp(8px,0.56cqw,11px)] font-medium uppercase tracking-[0.1em] text-[#e3ab5e]">
              <CheckCircle2 className="h-[1em] w-[1em] shrink-0" aria-hidden="true" />
              <span>{alreadySubscribed ? "You’re already on the launch list." : "You’re on the launch list."}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mx-auto flex max-w-[460px] flex-col gap-1">
              <div className="flex items-stretch border border-[#e3ab5e]/75 bg-[#0b0705]/35 p-0.5">
                <div className="relative min-w-0 flex-1">
                  <Mail className="pointer-events-none absolute left-2 top-1/2 h-[0.9em] w-[0.9em] -translate-y-1/2 text-[#e3ab5e]/80" aria-hidden="true" />
                  <Input id={emailId} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email for early access" autoComplete="email" required aria-label="Email for launch updates" className="h-[clamp(24px,2.6cqw,42px)] border-0 bg-transparent pl-7 text-[clamp(8px,0.62cqw,12px)] text-white placeholder:text-white/65 focus-visible:ring-0" />
                </div>
                <Button type="submit" disabled={subscribeMutation.isPending} className="h-[clamp(24px,2.6cqw,42px)] rounded-none bg-[#e3ab5e] px-[clamp(8px,1.2cqw,20px)] text-[clamp(7px,0.52cqw,10px)] font-bold uppercase tracking-[0.12em] text-[#0b0705] hover:bg-[#f0c77f] disabled:bg-[#e3ab5e]/55">
                  {subscribeMutation.isPending ? "Saving…" : "Notify me"}
                  {!subscribeMutation.isPending && <ArrowRight className="ml-1 h-[0.9em] w-[0.9em]" aria-hidden="true" />}
                </Button>
              </div>
              {signupErrorMessage && <p role="alert" aria-live="polite" className="text-center text-[clamp(7px,0.5cqw,10px)] font-medium text-[#ffd5d5]">{signupErrorMessage}</p>}
            </form>
          )}
        </section>

        <div className="absolute left-1/2 top-[96%] flex w-max -translate-x-1/2 -translate-y-1/2 items-center whitespace-nowrap text-[clamp(7.5px,0.56cqw,10.5px)] font-medium uppercase tracking-[0.13em] text-[#e3ab5e]/80" aria-label="Tradebilia platform highlights">
          {SUPPLIED_TIDBITS.map((tidbit, index) => (
            <span key={tidbit} className="inline-flex items-center">
              <span>{tidbit}</span>
              {index < SUPPLIED_TIDBITS.length - 1 && <span className="mx-[clamp(5px,0.55cqw,10px)] text-[0.8em] text-[#e3ab5e]/50">◆</span>}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
