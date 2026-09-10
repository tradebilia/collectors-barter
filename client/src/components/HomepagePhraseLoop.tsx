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

const WORD_REVEAL_MS = 420;
const PHRASE_HOLD_MS = 5000;
const LOGO_HOLD_MS = 5000;
const TRANSITION_MS = 420;

type AnimationPhase = "phrase" | "logo";

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
  const [visibleWordCount, setVisibleWordCount] = useState(0);
  const [phase, setPhase] = useState<AnimationPhase>("phrase");
  const [isFading, setIsFading] = useState(false);

  const phraseWords = useMemo(() => HOMEPAGE_PHRASES[phraseIndex].split(" "), [phraseIndex]);
  const displayedWordCount = prefersReducedMotion ? phraseWords.length : visibleWordCount;
  const phraseComplete = displayedWordCount >= phraseWords.length;

  useEffect(() => {
    if (phase === "logo") {
      const timer = window.setTimeout(() => {
        setPhraseIndex(previousIndex => (previousIndex + 1) % HOMEPAGE_PHRASES.length);
        setVisibleWordCount(0);
        setIsFading(false);
        setPhase("phrase");
      }, LOGO_HOLD_MS);

      return () => window.clearTimeout(timer);
    }

    if (!prefersReducedMotion && !phraseComplete) {
      const timer = window.setTimeout(() => {
        setVisibleWordCount(previousCount => Math.min(previousCount + 1, phraseWords.length));
      }, WORD_REVEAL_MS);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setIsFading(true);
      window.setTimeout(() => {
        setPhase("logo");
        setIsFading(false);
      }, TRANSITION_MS);
    }, PHRASE_HOLD_MS);

    return () => window.clearTimeout(timer);
  }, [phase, prefersReducedMotion, phraseComplete, phraseWords.length]);

  return (
    <section
      className="relative z-10 w-full border-y border-white/10 bg-[#0a0e28] px-4 py-10 text-white sm:py-12"
      aria-label="Tradebilia collector phrases"
    >
      <div className="mx-auto flex min-h-[190px] w-full max-w-7xl items-center justify-center overflow-hidden text-center sm:min-h-[220px]">
        <div
          className={`flex w-full items-center justify-center transition-opacity duration-[420ms] ease-out ${isFading ? "opacity-0" : "opacity-100"}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {phase === "phrase" ? (
            <p className="m-0 block w-full max-w-6xl px-2 text-center font-serif text-[clamp(1.65rem,4.8vw,4.1rem)] font-medium leading-[1.12] tracking-[-0.025em] text-white sm:px-6">
              {phraseWords.map((word, index) => (
                <span
                  key={`${phraseIndex}-${index}`}
                  className={`inline-block transition-opacity duration-[420ms] ease-out ${index < displayedWordCount ? "opacity-100" : "opacity-0"}`}
                  aria-hidden={index >= displayedWordCount}
                >
                  {word}{index < phraseWords.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          ) : (
            <div className="h-24 w-full max-w-[560px] sm:h-28" aria-label="Tradebilia">
              <AnimatedLogoSmall70
                fontSize={104}
                wheelScale={1.55}
                dividerScale={1.25}
                dividerOffsetY={-4}
                wheelOffsetX={-10}
                wheelOffsetY={-8}
                wheelStrokeWidth={0}
                dividerStrokeWidth={3}
                centerLockup
                fixedCategoryMetrics
                lockupScale={1.1}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
