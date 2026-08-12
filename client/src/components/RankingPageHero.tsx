import React from 'react';

interface RankingPageHeroProps {
  title: string;
  subtitle?: string;
}

export function RankingPageHero({ title, subtitle = "Collectors Trading Exchange" }: RankingPageHeroProps) {
  return (
    <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{
      backgroundImage: 'url(/manus-storage/Background_48b923f1.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
        <svg
          viewBox="0 0 2800 864"
          className="h-auto w-full max-w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="wheelGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Spinning wheel */}
          <svg
            x="228.00"
            y="275.00"
            width="306.00"
            height="324.00"
            viewBox="295.651171 289.250000 208.697658 221.500000"
            overflow="visible"
          >
            <g filter="url(#wheelGlow)">
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 400 400"
                  to="360 400 400"
                  dur="12s"
                  repeatCount="indefinite"
                />

                {/* Purple segment */}
                <g transform="translate(400.00,361.25) rotate(0) scale(0.82,1)">
                  <polygon
                    points="-7.00,-2.50 -8.50,-2.00 -42.00,-35.50 -41.50,-36.00 -21.50,-36.00 -21.00,-36.50 -21.00,-71.50 -20.50,-72.00 -7.50,-72.00 -7.00,-71.50 -7.00,-2.50"
                    fill="#A97AD7"
                  />
                  <polygon
                    points="20.50,0.00 7.50,0.00 7.00,-0.50 7.00,-69.50 7.50,-70.00 8.50,-70.00 42.00,-36.50 41.50,-36.00 21.50,-36.00 21.00,-35.50 21.00,-0.50 20.50,0.00"
                    fill="#A97AD7"
                  />
                </g>

                {/* Red segment */}
                <g transform="translate(433.59,380.62) rotate(60) scale(0.82,1)">
                  <polygon
                    points="-7.00,-2.50 -8.50,-2.00 -42.00,-35.50 -41.50,-36.00 -21.50,-36.00 -21.00,-36.50 -21.00,-71.50 -20.50,-72.00 -7.50,-72.00 -7.00,-71.50 -7.00,-2.50"
                    fill="#FF3B30"
                  />
                  <polygon
                    points="20.50,0.00 7.50,0.00 7.00,-0.50 7.00,-69.50 7.50,-70.00 8.50,-70.00 42.00,-36.50 41.50,-36.00 21.50,-36.00 21.00,-35.50 21.00,-0.50 20.50,0.00"
                    fill="#FF3B30"
                  />
                </g>

                {/* Orange segment */}
                <g transform="translate(433.59,419.38) rotate(120) scale(0.82,1)">
                  <polygon
                    points="-7.00,-2.50 -8.50,-2.00 -42.00,-35.50 -41.50,-36.00 -21.50,-36.00 -21.00,-36.50 -21.00,-71.50 -20.50,-72.00 -7.50,-72.00 -7.00,-71.50 -7.00,-2.50"
                    fill="#FF9800"
                  />
                  <polygon
                    points="20.50,0.00 7.50,0.00 7.00,-0.50 7.00,-69.50 7.50,-70.00 8.50,-70.00 42.00,-36.50 41.50,-36.00 21.50,-36.00 21.00,-35.50 21.00,-0.50 20.50,0.00"
                    fill="#FF9800"
                  />
                </g>

                {/* Green segment */}
                <g transform="translate(400.00,438.75) rotate(180) scale(0.82,1)">
                  <polygon
                    points="-7.00,-2.50 -8.50,-2.00 -42.00,-35.50 -41.50,-36.00 -21.50,-36.00 -21.00,-36.50 -21.00,-71.50 -20.50,-72.00 -7.50,-72.00 -7.00,-71.50 -7.00,-2.50"
                    fill="#18B57A"
                  />
                  <polygon
                    points="20.50,0.00 7.50,0.00 7.00,-0.50 7.00,-69.50 7.50,-70.00 8.50,-70.00 42.00,-36.50 41.50,-36.00 21.50,-36.00 21.00,-35.50 21.00,-0.50 20.50,0.00"
                    fill="#18B57A"
                  />
                </g>

                {/* Pink segment */}
                <g transform="translate(366.41,419.38) rotate(240) scale(0.82,1)">
                  <polygon
                    points="-7.00,-2.50 -8.50,-2.00 -42.00,-35.50 -41.50,-36.00 -21.50,-36.00 -21.00,-36.50 -21.00,-71.50 -20.50,-72.00 -7.50,-72.00 -7.00,-71.50 -7.00,-2.50"
                    fill="#F6A5B6"
                  />
                  <polygon
                    points="20.50,0.00 7.50,0.00 7.00,-0.50 7.00,-69.50 7.50,-70.00 8.50,-70.00 42.00,-36.50 41.50,-36.00 21.50,-36.00 21.00,-35.50 21.00,-0.50 20.50,0.00"
                    fill="#F6A5B6"
                  />
                </g>

                {/* Blue segment */}
                <g transform="translate(366.41,380.62) rotate(300) scale(0.82,1)">
                  <polygon
                    points="-7.00,-2.50 -8.50,-2.00 -42.00,-35.50 -41.50,-36.00 -21.50,-36.00 -21.00,-36.50 -21.00,-71.50 -20.50,-72.00 -7.50,-72.00 -7.00,-71.50 -7.00,-2.50"
                    fill="#29A8FF"
                  />
                  <polygon
                    points="20.50,0.00 7.50,0.00 7.00,-0.50 7.00,-69.50 7.50,-70.00 8.50,-70.00 42.00,-36.50 41.50,-36.00 21.50,-36.00 21.00,-35.50 21.00,-0.50 20.50,0.00"
                    fill="#29A8FF"
                  />
                </g>
              </g>
            </g>
          </svg>

          {/* Divider line */}
          <line x1="590" y1="271" x2="590" y2="595" stroke="white" strokeWidth="8.5" strokeLinecap="round" />

          <text
            x="650"
            y="500"
            fill="white"
            fontFamily="Georgia, serif"
            fontSize="150"
            fontWeight="800"
            letterSpacing="-4"
          >
            {title}
          </text>
        </svg>
      </div>
    </section>
  );
}
