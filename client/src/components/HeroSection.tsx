export function HeroSection() {
  return (
    <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'url(/manus-storage/hero-background-fullwidth_e851e7cd.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }} />
      <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
        <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
          <img
            src="/manus-storage/tradebilia_final_transparent_443f029c.svg"
            alt="Tradebilia"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
