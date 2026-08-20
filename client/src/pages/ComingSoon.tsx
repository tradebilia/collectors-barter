import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BookOpen, CheckCircle2, CircleDollarSign, Film, Gamepad2, Mail, PenLine, Pin, Stamp, Trophy } from "lucide-react";
import { FormEvent, useId, useState } from "react";

const collectingCategories = [
  { label: "Comics", icon: BookOpen },
  { label: "Sports Cards", icon: Trophy },
  { label: "Vintage Toys", icon: Trophy },
  { label: "Video Games", icon: Gamepad2 },
  { label: "Stamps", icon: Stamp },
  { label: "Coins", icon: CircleDollarSign },
  { label: "Pokemon", icon: BookOpen },
  { label: "Movies", icon: Film },
  { label: "Autographs", icon: PenLine },
  { label: "Disney Pins", icon: Pin },
];

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
    <main className="relative min-h-screen overflow-hidden bg-[#241e1a] px-3 py-3 text-[#211b17] sm:px-7 sm:py-7">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-95"
        style={{ backgroundImage: "url('/manus-storage/tradebilia-coming-soon-restoration-workbench-bg_4d7c4648.png')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#241e1a]/20" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-7xl flex-col overflow-hidden border border-[#f4ead8]/55 bg-[#f9f2e5]/88 shadow-[0_18px_60px_rgba(0,0,0,0.38)] sm:min-h-[calc(100vh-3.5rem)]">
        <header className="flex items-center justify-between border-b border-[#2c241e]/15 bg-[#f7efdfee] px-4 py-3 sm:px-8 sm:py-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#2c241e]/70 sm:text-[10px]">Tradebilia · Collector&apos;s Workbench</p>
          <p className="font-serif text-xs italic text-[#2c241e]/65 sm:text-sm">The Collectors Trading Exchange.</p>
        </header>

        <section className="relative flex flex-1 items-center justify-center px-3 py-8 sm:px-8 sm:py-12 lg:py-16">
          <div className="w-full max-w-3xl border border-[#2c241e]/20 bg-[#fffaf0]/95 px-5 py-8 text-center shadow-[0_14px_40px_rgba(62,41,25,0.15)] sm:px-10 sm:py-11">
            <div className="mx-auto h-20 w-full max-w-[34rem] sm:h-28">
              <AnimatedLogoSmall70 fontSize={125} wordmarkColor="#211b17" neutralCategoryColor="#211b17" wheelScale={1.18} />
            </div>

            <div className="mx-auto mt-7 max-w-xl border-t border-[#2c241e]/20 pt-6 sm:mt-9 sm:pt-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1847b5]">A new marketplace for collectors</p>
              <h1 className="mt-3 font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-6xl">Every collection has a next chapter.</h1>
              <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-[#2c241e]/68 sm:text-base">
                Tradebilia brings all ten collector categories into one organized exchange—so discovering, valuing, and trading the objects you care about feels more deliberate.
              </p>
            </div>

            <div className="mx-auto mt-8 w-full max-w-2xl sm:mt-9">
              {submitted ? (
                <div className="border border-[#2c241e]/20 bg-[#f7efdfee] px-6 py-8">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-[#1847b5]" aria-hidden="true" />
                  <h2 className="mt-3 font-serif text-3xl">You&apos;re on the list.</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#2c241e]/65">Your launch-update signup is saved. We&apos;ll share news as Tradebilia opens its doors.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="flex flex-col border border-[#2c241e]/35 bg-white p-1.5 sm:flex-row">
                    <div className="relative flex-1">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2c241e]/45" aria-hidden="true" />
                      <Input
                        id={emailId}
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Email address"
                        autoComplete="email"
                        required
                        className="h-12 border-0 bg-transparent pl-10 text-[#211b17] placeholder:text-[#211b17]/42 focus-visible:ring-0"
                      />
                    </div>
                    <Button type="submit" disabled={!consent || subscribeMutation.isPending} className="h-12 bg-[#1847b5] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-[#11378d] disabled:bg-[#1847b5]/40">
                      {subscribeMutation.isPending ? "Saving…" : "Receive launch updates"}
                      {!subscribeMutation.isPending && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
                    </Button>
                  </div>
                  <label htmlFor={consentId} className="mt-3 flex cursor-pointer items-start justify-center gap-2 text-left text-xs leading-5 text-[#2c241e]/65 sm:text-center">
                    <Checkbox id={consentId} checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} className="mt-0.5 border-[#2c241e]/45 data-[state=checked]:border-[#1847b5] data-[state=checked]:bg-[#1847b5]" />
                    <span>Yes, I&apos;d like to receive updates about our launch and future collector features.</span>
                  </label>
                  {subscribeMutation.isError && <p role="alert" className="mt-3 text-sm font-medium text-[#b33951]">{subscribeMutation.error.message}</p>}
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="border-y border-[#2c241e]/15 bg-[#f7efdfee] px-2 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-5 sm:grid-cols-10">
            {collectingCategories.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-w-0 flex-col items-center gap-1.5 border-r border-[#2c241e]/12 px-1 text-center last:border-r-0 sm:gap-2 sm:px-2">
                <Icon className="h-4 w-4 stroke-[1.35] text-[#2c241e]/70 sm:h-5 sm:w-5" aria-hidden="true" />
                <span className="text-[7px] font-bold uppercase leading-3 tracking-[0.05em] text-[#2c241e]/65 sm:text-[9px] sm:tracking-[0.1em]">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="bg-[#f7efdfee] px-4 py-4 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-[#2c241e]/50 sm:text-[10px]">© {new Date().getFullYear()} Tradebilia · Built for collectors, by collectors</footer>
      </div>
    </main>
  );
}
