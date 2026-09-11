import { useEffect, useMemo, useState } from "react";
import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70";

export const HOMEPAGE_PHRASES = [
  "Why buy or sell when you can trade?",
  "Trade what you have. Get what you want.",
  "Have it. Want it. Trade it.",
  "Your collection. Your trade. Your next find.",
  "Don’t buy it. Don’t sell it. Trade for it.",
  "Turn what you have into what you want.",
  "Collect. Connect. Trade.",
  "Where collectors trade what they love.",
  "One collection. Endless possibilities.",
  "The smarter way to collect.",
  "What’s yours could be someone else’s treasure.",
  "Trade your way to the collection you want",
] as const;

export const FRAGMENT_REVEAL_MS = 2000;
export const PHRASE_HOLD_MS = 5000;
export const LOGO_HOLD_MS = 5000;
export const TRANSITION_MS = 420;

type AnimationPhase = "reveal" | "hold" | "logo";

export function splitPhraseIntoFragments(phrase: string) {
  return phrase.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(fragment => fragment.trim()) ?? [];
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

export default function HomepagePhraseLoop() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visibleFragmentCount, setVisibleFragmentCount] = useState(1);
  const [phase, setPhase] = useState<AnimationPhase>("reveal");
  const [isFading, setIsFading] = useState(false);

  const phraseFragments = useMemo(() => splitPhraseIntoFragments(HOMEPAGE_PHRASES[phraseIndex]), [phraseIndex]);
  const displayedFragmentCount = prefersReducedMotion ? phraseFragments.length : visibleFragmentCount;
  const phraseFontSize = `clamp(0.8rem, calc((100vw - 1rem) / ${Math.max(HOMEPAGE_PHRASES[phraseIndex].length * 0.64, 1)}), 5.25rem)`;

  useEffect(() => {
    if (phase === "reveal") {
      if (prefersReducedMotion) {
        setVisibleFragmentCount(phraseFragments.length);
        setPhase("hold");
        return;
      }

      if (visibleFragmentCount < phraseFragments.length) {
        const timer = window.setTimeout(() => {
          setVisibleFragmentCount(previousCount => Math.min(previousCount + 1, phraseFragments.length));
        }, FRAGMENT_REVEAL_MS);
        return () => window.clearTimeout(timer);
      }

      setPhase("hold");
      return;
    }

    if (phase === "hold") {
      let transitionTimer: number | undefined;
      const holdTimer = window.setTimeout(() => {
        setIsFading(true);
        transitionTimer = window.setTimeout(() => {
          setIsFading(false);
          setPhase("logo");
        }, TRANSITION_MS);
      }, PHRASE_HOLD_MS);

      return () => {
        window.clearTimeout(holdTimer);
        if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
      };
    }

    let transitionTimer: number | undefined;
    const logoTimer = window.setTimeout(() => {
      setIsFading(true);
      transitionTimer = window.setTimeout(() => {
        setPhraseIndex(previousIndex => (previousIndex + 1) % HOMEPAGE_PHRASES.length);
        setVisibleFragmentCount(1);
        setIsFading(false);
        setPhase("reveal");
      }, TRANSITION_MS);
    }, LOGO_HOLD_MS);

    return () => {
      window.clearTimeout(logoTimer);
      if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
    };
  }, [phase, prefersReducedMotion, phraseFragments.length, visibleFragmentCount]);

  return (
    <section
      className="relative z-10 h-[136px] w-full overflow-hidden border-y border-white/10 bg-[#0a0e28] px-4 text-white"
      aria-label="Tradebilia collector phrases"
    >
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-center overflow-hidden text-center">
        <div
          className={`flex w-full items-center justify-center transition-opacity duration-[420ms] ease-out ${isFading ? "opacity-0" : "opacity-100"}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {phase === "logo" ? (
            <div className="h-24 w-full max-w-[820px]" aria-label="Tradebilia">
              <AnimatedLogoSmall70
                fontSize={138}
                wheelScale={1.45}
                dividerScale={1.25}
                dividerOffsetY={0}
                wheelOffsetX={18}
                wheelOffsetY={0}
                wheelStrokeWidth={0}
                dividerStrokeWidth={2.8}
                centerLockup
                fixedCategoryMetrics
                contentOffsetX={68}
                lockupScale={1.08}
              />
            </div>
          ) : (
            <p className="m-0 block w-full max-w-none whitespace-nowrap px-0 text-center font-serif font-medium leading-none tracking-[-0.04em] text-white" style={{ fontSize: phraseFontSize }}>
              {phraseFragments.map((fragment, index) => (
                <span
                  key={`${phraseIndex}-${index}`}
                  className={`inline-block transition-opacity duration-[420ms] ease-out ${index < displayedFragmentCount ? "opacity-100" : "opacity-0"}`}
                  aria-hidden={index >= displayedFragmentCount}
                >
                  {fragment}{index < phraseFragments.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
