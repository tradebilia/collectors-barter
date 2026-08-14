import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { FormEvent, useId, useState } from "react";

export default function ComingSoon() {
  const emailId = useId();
  const consentId = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const subscribeMutation = trpc.launchUpdates.subscribe.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consent || subscribeMutation.isPending) return;
    subscribeMutation.mutate({ email });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060817] px-5 py-6 text-white sm:px-8 sm:py-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-64 bg-cover bg-center bg-no-repeat sm:h-72 lg:h-80"
        style={{ backgroundImage: "url(/manus-storage/Background_23084d14.jpg)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#03081b]/50 to-[#050818]/80" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-[#29A8FF]/20 blur-3xl" />
        <div className="absolute -right-20 bottom-8 h-80 w-80 rounded-full bg-[#A97AD7]/25 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
        <div className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center py-10 text-center sm:py-14">
          <div className="mb-7 flex h-36 w-full items-center justify-center overflow-visible sm:mb-10 sm:h-48 lg:h-60">
            <div className="h-full w-[128%] max-w-none translate-x-[20%] scale-[1.1] transform-gpu sm:w-[118%] sm:translate-x-[43%] sm:scale-[1.35] lg:scale-[1.5]">
              <AnimatedLogoSmall70 fontSize={125} />
            </div>
          </div>

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[#FFD700]" aria-hidden="true" />
            Coming soon
          </div>
          <h1 className="max-w-2xl font-serif text-4xl leading-[1.04] text-white sm:text-6xl">
            Your collection deserves a better way to trade.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
            Tradebilia is preparing a trusted home for collectors to discover, connect, and make fair trades across the hobbies they love.
          </p>

          <div className="mt-10 w-full max-w-xl rounded-[1.5rem] border border-white/15 bg-white/[0.08] p-5 text-left shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-[#18B57A]" aria-hidden="true" />
                <h2 className="text-xl font-semibold">You’re on the list.</h2>
                <p className="max-w-sm text-sm leading-6 text-white/70">
                  We’ll share launch updates with you. No email was sent as part of this signup.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor={emailId} className="text-sm font-semibold text-white">
                    Get launch updates
                  </label>
                  <p className="mt-1 text-sm text-white/65">
                    Add your email and we’ll let you know when Tradebilia opens.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
                    <Input
                      id={emailId}
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      className="h-12 border-white/15 bg-[#070a1c]/80 pl-10 text-white placeholder:text-white/35 focus-visible:ring-[#29A8FF]"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!consent || subscribeMutation.isPending}
                    className="h-12 bg-white px-5 font-semibold text-[#090b1e] hover:bg-white/90 disabled:bg-white/40"
                  >
                    {subscribeMutation.isPending ? "Saving…" : "Keep me posted"}
                    {!subscribeMutation.isPending && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
                  </Button>
                </div>
                <label htmlFor={consentId} className="flex cursor-pointer items-start gap-3 rounded-xl bg-black/15 p-3 text-sm leading-5 text-white/70">
                  <Checkbox
                    id={consentId}
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked === true)}
                    className="mt-0.5 border-white/45 data-[state=checked]:border-[#18B57A] data-[state=checked]:bg-[#18B57A]"
                  />
                  <span>
                    I agree to receive Tradebilia launch updates. I can unsubscribe from future update emails.
                  </span>
                </label>
                {subscribeMutation.isError && (
                  <p role="alert" className="text-sm font-medium text-[#F6A5B6]">
                    {subscribeMutation.error.message}
                  </p>
                )}
              </form>
            )}
          </div>

        </section>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-5 text-center text-xs text-white/45 sm:flex-row sm:text-left">
          <span>© {new Date().getFullYear()} Tradebilia</span>
          <span>Built for collectors, by collectors.</span>
        </footer>
      </div>
    </main>
  );
}
