import { useEffect, useState } from 'react';

const categories = [
  { name: 'BILIA', color: '#FFFFFF', duration: 10000 },
  { name: 'COMICS', color: '#A97AD7', duration: 3000 },
  { name: 'SPORTS CARDS', color: '#FF3B30', duration: 3000 },
  { name: 'POKEMON', color: '#FF9800', duration: 3000 },
  { name: 'COINS', color: '#FFD700', duration: 3000 },
  { name: 'STAMPS', color: '#18B57A', duration: 3000 },
  { name: 'VIDEO GAMES', color: '#F6A5B6', duration: 3000 },
  { name: 'AUTOGRAPHS', color: '#29A8FF', duration: 3000 },
  { name: 'TOYS', color: '#FF69B4', duration: 3000 }
];

const AnimatedLogoSmall70 = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIndex((prevIndex) => (prevIndex + 1) % categories.length);
    }, categories[index].duration);

    return () => clearTimeout(timer);
  }, [index]);

  const currentCategory = categories[index];

  return (
    <div className="flex items-center justify-center font-sans h-full py-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1300 216"
        className="w-full h-auto drop-shadow-lg"
        style={{ maxWidth: '100%', height: '100%' }}
        preserveAspectRatio="xMinYMid meet"
      >
        <defs>
          <filter id="wheelGlowSmall" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.45" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <style>
            {`
              @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
              .category-text-small {
                transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
              }
            `}
          </style>
        </defs>

        {/* Animated Wheel Emblem */}
        <g transform="translate(6, 82.5) scale(0.441)">
          <g filter="url(#wheelGlowSmall)">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 104 110"
              to="360 104 110"
              dur="12s"
              repeatCount="indefinite"
            />
            {/* Purple */}
            <g transform="translate(104, 71) scale(0.82, 1)">
              <polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" fill="#A97AD7" />
              <polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" fill="#A97AD7" />
            </g>
            {/* Red */}
            <g transform="translate(137, 90) rotate(60) scale(0.82, 1)">
              <polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" fill="#FF3B30" />
              <polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" fill="#FF3B30" />
            </g>
            {/* Orange */}
            <g transform="translate(137, 129) rotate(120) scale(0.82, 1)">
              <polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" fill="#FF9800" />
              <polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" fill="#FF9800" />
            </g>
            {/* Green */}
            <g transform="translate(104, 148) rotate(180) scale(0.82, 1)">
              <polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" fill="#18B57A" />
              <polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" fill="#18B57A" />
            </g>
            {/* Pink */}
            <g transform="translate(70, 129) rotate(240) scale(0.82, 1)">
              <polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" fill="#F6A5B6" />
              <polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" fill="#F6A5B6" />
            </g>
            {/* Blue */}
            <g transform="translate(70, 90) rotate(300) scale(0.82, 1)">
              <polygon points="-7,-2.5 -8.5,-2 -42,-35.5 -41.5,-36 -21.5,-36 -21,-36.5 -21,-71.5 -20.5,-72 -7.5,-72 -7,-71.5 -7,-2.5" fill="#29A8FF" />
              <polygon points="20.5,0 7.5,0 7,-0.5 7,-69.5 7.5,-70 8.5,-70 42,-36.5 41.5,-36 21.5,-36 21,-35.5 21,-0.5 20.5,0" fill="#29A8FF" />
            </g>
          </g>
        </g>

        {/* Divider Line */}
        <line x1="114" y1="81.3" x2="114" y2="178.5" stroke="white" strokeWidth="2.55" strokeLinecap="round" />

        {/* Static "TRADE" Text */}
        <text
          x="132"
          y="157.5"
          fontFamily="Montserrat, sans-serif"
          fontSize="60"
          fontWeight="600"
          fill="white"
        >
          TRADE
        </text>

        {/* Dynamic Category Text */}
        <text
          x="348"
          y="157.5"
          className="category-text-small"
          fontFamily="Montserrat, sans-serif"
          fontSize="60"
          fontWeight="600"
          fill={currentCategory.color}
        >
          {currentCategory.name}
        </text>
      </svg>
    </div>
  );
}

export default AnimatedLogoSmall70;
