import { useState, useEffect } from 'react';

const categories = [
  { name: 'BILIA', color: 'text-white', duration: 10000 }, // 10 seconds for BILIA
  { name: 'COMICS', color: 'text-rose-300 font-bold', duration: 3000 },
  { name: 'SPORTS CARDS', color: 'text-[#ffd700] font-bold', duration: 3000 },
  { name: 'POKEMON', color: 'text-[#ffff00] font-bold', duration: 3000 },
  { name: 'COINS', color: 'text-[#ffd700] font-bold', duration: 3000 },
  { name: 'STAMPS', color: 'text-[#e0b0ff] font-bold', duration: 3000 },
  { name: 'VIDEO GAMES', color: 'text-[#00ff00] font-bold', duration: 3000 },
  { name: 'AUTOGRAPHS', color: 'text-[#f5deb3] font-bold', duration: 3000 },
  { name: 'TOYS', color: 'text-[#ffe4b5] font-bold', duration: 3000 }
];

const subtitleWords = ['Collectors', 'Trading', 'Exchange'];

const WHEEL_ICON_URL = "/images/arrows_transparent_25a2bc2f.png";

export function AnimatedCategoryText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [subtitleWordIndex, setSubtitleWordIndex] = useState(0);
  const [showSubtitle, setShowSubtitle] = useState(false);

  const currentCategory = categories[currentIndex];
  const isBilia = currentCategory.name === 'BILIA';

  // Main category rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % categories.length);
      setSubtitleWordIndex(0);
      setShowSubtitle(false);
    }, currentCategory.duration);

    return () => clearInterval(interval);
  }, [currentCategory.duration]);

  // Fade out effect for non-BILIA categories
  useEffect(() => {
    if (!isBilia) {
      setIsVisible(true);
      const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
      }, 2700); // Start fading 300ms before next change

      return () => clearTimeout(fadeOutTimer);
    } else {
      setIsVisible(true);
      setShowSubtitle(true);
    }
  }, [currentIndex, isBilia]);

  // Subtitle word rotation for BILIA
  useEffect(() => {
    if (isBilia && showSubtitle) {
      if (subtitleWordIndex < subtitleWords.length) {
        const timer = setTimeout(() => {
          setSubtitleWordIndex((prev) => prev + 1);
        }, 1500); // Each word appears for 1.5 seconds

        return () => clearTimeout(timer);
      }
    }
  }, [subtitleWordIndex, isBilia, showSubtitle]);

  return (
    <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white">
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .wheel-animate {
          animation: spin 8s linear infinite;
        }
      `}</style>

      <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
        <div className="flex w-full max-w-6xl items-center justify-start -ml-32 gap-8">
          {/* Spinning Wheel Icon - FIXED */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <img
              src={WHEEL_ICON_URL}
              alt="Tradebilia Wheel"
              className="h-56 w-56 wheel-animate drop-shadow-2xl"
            />
          </div>

          {/* Vertical Divider - FIXED */}
          <div className="h-64 w-1 bg-white flex-shrink-0"></div>

          {/* Text Container - FIXED HEIGHT to prevent vertical shift */}
          <div className="flex flex-col items-end gap-0 flex-shrink-0 h-32">
            {/* Main Text (TRADE + Category) */}
            <div className="flex items-baseline gap-0">
              {/* Fixed TRADE text */}
              <span className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-white drop-shadow-lg whitespace-nowrap">
                TRADE
              </span>
              
              {/* Animated category name */}
              <span
                className={`text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter transition-all duration-500 whitespace-nowrap ml-3 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                } ${currentCategory.color}`}
              >
                {currentCategory.name}
              </span>
            </div>

            {/* Subtitle Container - Fixed height to prevent shifting */}
            <div className="h-8 mt-4">
              {isBilia && showSubtitle && (
                <div className="text-lg sm:text-xl lg:text-2xl font-light tracking-wide text-white">
                  <div className="flex gap-2">
                    {/* Collectors */}
                    <span
                      className={`transition-all duration-500 ${
                        subtitleWordIndex >= 1
                          ? 'opacity-100'
                          : 'opacity-0'
                      }`}
                    >
                      Collectors
                    </span>
                    
                    {/* Trading */}
                    <span
                      className={`transition-all duration-500 ${
                        subtitleWordIndex >= 2
                          ? 'opacity-100'
                          : 'opacity-0'
                      }`}
                    >
                      Trading
                    </span>
                    
                    {/* Exchange */}
                    <span
                      className={`transition-all duration-500 ${
                        subtitleWordIndex >= 3
                          ? 'opacity-100'
                          : 'opacity-0'
                      }`}
                    >
                      Exchange
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
