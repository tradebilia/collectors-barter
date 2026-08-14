import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BookOpen, CheckCircle2, CircleDollarSign, Gamepad2, Mail, Stamp, Trophy } from "lucide-react";
import { FormEvent, useId, useState } from "react";

const collectingCategories = [
  { label: "Comics", icon: BookOpen },
  { label: "Sports Cards", icon: Trophy },
  { label: "Coins", icon: CircleDollarSign },
  { label: "Stamps", icon: Stamp },
  { label: "Vintage Toys", icon: Trophy },
  { label: "Video Games", icon: Gamepad2 },
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
    <main className="min-h-screen overflow-hidden bg-[#f8f6f0] px-5 pb-5 pt-8 text-[#171717] sm:px-8 sm:pb-7 sm:pt-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
          <span className="h-px bg-[#1e1e1e]/20" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#171717]/80 sm:text-xs">Tradebilia is coming soon</p>
            <p className="mt-1 font-serif text-sm italic text-[#171717]/70">The modern collectors&apos; exchange.</p>
          </div>
          <span className="h-px bg-[#1e1e1e]/20" />
        </header>

        <section className="flex flex-1 flex-col items-center justify-center py-9 text-center sm:py-12">
          <div className="flex h-32 w-full max-w-[44rem] items-center justify-center overflow-visible sm:h-40 lg:h-44">
            <div className="h-full w-full">
              <AnimatedLogoSmall70 fontSize={125} wordmarkColor="#171717" neutralCategoryColor="#171717" />
            </div>
          </div>

          <h1 className="mt-8 max-w-2xl font-serif text-4xl leading-[1.03] tracking-[-0.04em] sm:mt-10 sm:text-6xl">
            A new marketplace for the objects that matter.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[#171717]/65 sm:text-base">
            Tradebilia is preparing a trusted place for collectors to discover remarkable pieces, connect with their community, and make fair trades.
          </p>

          <div className="mt-9 w-full max-w-3xl">
            {submitted ? (
              <div className="border border-[#171717]/25 bg-white px-6 py-8">
                <CheckCircle2 className="mx-auto h-10 w-10 text-[#1847b5]" aria-hidden="true" />
                <h2 className="mt-3 font-serif text-3xl">You&apos;re on the list.</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#171717]/65">
                  Your launch-update signup is saved. We&apos;ll share news as Tradebilia opens its doors.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="flex flex-col border border-[#171717]/30 bg-white p-1.5 sm:flex-row">
                  <div className="relative flex-1">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#171717]/45" aria-hidden="true" />
                    <Input
                      id={emailId}
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Email address"
                      autoComplete="email"
                      required
                      className="h-12 border-0 bg-transparent pl-10 text-[#171717] placeholder:text-[#171717]/42 focus-visible:ring-0"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!consent || subscribeMutation.isPending}
                    className="h-12 bg-[#1847b5] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-[#11378d] disabled:bg-[#1847b5]/40"
                  >
                    {subscribeMutation.isPending ? "Saving…" : "Receive launch updates"}
                    {!subscribeMutation.isPending && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
                  </Button>
                </div>
                <label htmlFor={consentId} className="mt-3 flex cursor-pointer items-start justify-center gap-2 text-left text-xs leading-5 text-[#171717]/65 sm:text-center">
                  <Checkbox
                    id={consentId}
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked === true)}
                    className="mt-0.5 border-[#171717]/45 data-[state=checked]:border-[#1847b5] data-[state=checked]:bg-[#1847b5]"
                  />
                  <span>Yes, I&apos;d like to receive updates about our launch and future collector features.</span>
                </label>
                {subscribeMutation.isError && (
                  <p role="alert" className="mt-3 text-sm font-medium text-[#b33951]">{subscribeMutation.error.message}</p>
                )}
              </form>
            )}
          </div>
        </section>

        <section className="border-y border-[#171717]/15 py-5 sm:py-6">
          <div className="grid grid-cols-3 gap-y-5 sm:grid-cols-6 sm:divide-x sm:divide-[#171717]/15">
            {collectingCategories.map(({ label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2 px-2 text-center">
                <Icon className="h-6 w-6 stroke-[1.25] text-[#171717]/70" aria-hidden="true" />
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#171717]/70 sm:text-[10px]">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-5 border-b-[5px] border-[#1847b5] pb-5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#171717]/45">
          © {new Date().getFullYear()} Tradebilia · Built for collectors, by collectors
        </footer>
      </div>
    </main>
  );
}
