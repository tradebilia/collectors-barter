const SEGMENTS = [
  { color: "#A97AD7", rotation: 0 },
  { color: "#FF3B30", rotation: 60 },
  { color: "#FF9800", rotation: 120 },
  { color: "#18B57A", rotation: 180 },
  { color: "#F6A5B6", rotation: 240 },
  { color: "#29A8FF", rotation: 300 },
];

export function TradebiliaWheel({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-label="Tradebilia"
      className={className}
      viewBox="0 0 220 220"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g className="tradebilia-wheel-rotor" style={{ transformBox: "view-box", transformOrigin: "center" }}>
        {SEGMENTS.map(({ color, rotation }) => (
          <g key={rotation} transform={`rotate(${rotation} 110 110)`} fill={color}>
            <path d="M99 104 64 69h19V42h14v62H99Z" />
            <path d="m121 104 35-35h-19V42h-14v62h-2Z" />
          </g>
        ))}
      </g>
    </svg>
  );
}
