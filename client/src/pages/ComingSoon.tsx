import {
  Archive,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDot,
  Coins,
  Disc3,
  Gamepad2,
  LibraryBig,
  Mail,
  MousePointer2,
  PanelsTopLeft,
  PenTool,
  Stamp,
} from "lucide-react";
import { FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const COMING_SOON_CATEGORIES = [
  { label: "Sports Cards", icon: PanelsTopLeft },
  { label: "Comics", icon: LibraryBig },
  { label: "Pokémon / Trading Card Games", icon: CircleDot },
  { label: "Vintage Toys", icon: Bot },
  { label: "Video Games", icon: Gamepad2 },
  { label: "Coins", icon: Coins },
  { label: "Stamps", icon: Stamp },
  { label: "Autographs & Signed Memorabilia", icon: PenTool },
  { label: "Disney Pins & Disney Collectibles", icon: MousePointer2 },
  { label: "VHS / DVD / Blu-ray / LaserDisc / Physical Media", icon: Archive },
  { label: "Music", icon: Disc3 },
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
    <main
      className="grid min-h-[100svh] place-items-center overflow-hidden bg-[#120d0b]"
      aria-label="Tradebilia Coming Soon"
    >
      <div className="relative aspect-[605/289] w-[min(100vw,calc(100svh*605/289))] max-w-full">
        <img
          src="/manus-storage/coming-soon-exact-supplied-clean-row_d8aa56d4.png"
          alt="Tradebilia Coming Soon collector room with a centered collection category row for comics, sports cards, games, coins, stamps, media, and music"
          className="block size-full object-contain"
        />
        <section className="absolute inset-x-[13%] top-[63.5%] z-10 flex min-h-[10%] items-center justify-center" aria-label="Tradebilia launch email signup">
          {submitted ? (
            <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-full border border-[#e3ab5e]/70 bg-[#120d0b]/75 px-4 py-2 text-center text-[clamp(9px,1vw,15px)] font-semibold text-[#fff7e8] shadow-[0_2px_8px_rgba(0,0,0,0.28)]">
              <CheckCircle2 className="h-[1.1em] w-[1.1em] shrink-0 text-[#e3ab5e]" aria-hidden="true" />
              <span>{alreadySubscribed ? "You’re already on the launch list." : "You’re on the launch list."}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-[min(88%,31rem)] flex-col items-center gap-1.5">
              <div className="flex w-full items-stretch gap-1.5 rounded-full border border-[#e3ab5e]/70 bg-[#120d0b]/70 p-1 shadow-[0_2px_8px_rgba(0,0,0,0.28)]">
                <div className="relative min-w-0 flex-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#fff7e8]/65" aria-hidden="true" />
                  <Input id={emailId} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email for launch updates" autoComplete="email" required aria-label="Email for launch updates" className="h-8 border-0 bg-transparent pl-8 text-[clamp(9px,0.85vw,13px)] text-[#fff7e8] placeholder:text-[#fff7e8]/65 focus-visible:ring-0" />
                </div>
                <Button type="submit" disabled={subscribeMutation.isPending} className="h-8 rounded-full bg-[#e3ab5e] px-3 text-[clamp(8px,0.7vw,11px)] font-bold uppercase tracking-[0.08em] text-[#24160f] hover:bg-[#f0c77f] disabled:bg-[#e3ab5e]/50">
                  {subscribeMutation.isPending ? "Saving…" : "Notify me"}
                  {!subscribeMutation.isPending && <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />}
                </Button>
              </div>
              {signupErrorMessage && <p role="alert" aria-live="polite" className="rounded bg-[#120d0b]/80 px-2 py-0.5 text-center text-[clamp(8px,0.7vw,11px)] font-medium text-[#ffd5d5]">{signupErrorMessage}</p>}
            </form>
          )}
        </section>

        <div className="absolute inset-x-[6%] top-[75%] h-[15%] px-[2%]" aria-label="Collections on the exchange">
          <div className="grid h-full grid-cols-11 items-center gap-[0.7%] text-[#e7bd66]">
            {COMING_SOON_CATEGORIES.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-w-0 flex-col items-center justify-center gap-[14%] text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                <Icon className="h-auto w-[2.7vw] max-w-[42px] min-w-[12px] stroke-[1.45]" aria-hidden="true" />
                <span className="line-clamp-2 min-h-[2.35em] text-[clamp(6px,0.62vw,11px)] font-semibold uppercase leading-[1.18] tracking-[0.08em]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
