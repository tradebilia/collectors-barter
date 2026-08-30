import { TradebiliaWheel } from "@/components/TradebiliaWheel";

type AnimatedHeroTitleArtworkProps = {
  src: string;
  alt: string;
  className?: string;
};

export function AnimatedHeroTitleArtwork({ src, alt, className = "" }: AnimatedHeroTitleArtworkProps) {
  return (
    <div className={`relative aspect-[2048/707] w-full ${className}`}>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain"
        style={{
          WebkitMaskImage: "linear-gradient(to right, transparent 0 36%, #000 37% 100%)",
          maskImage: "linear-gradient(to right, transparent 0 36%, #000 37% 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-[22%] top-1/2 flex h-[40%] -translate-y-1/2 items-center justify-center"
      >
        <TradebiliaWheel className="h-full w-auto drop-shadow-2xl" />
      </div>
    </div>
  );
}

export default AnimatedHeroTitleArtwork;

