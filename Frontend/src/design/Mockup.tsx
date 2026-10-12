export default function Mockup({
  color = "sage",
  kind = "book",
  hero = false,
}: {
  color?: string
  kind?: string
  hero?: boolean
}) {
  return (
    <div
      className={`mockup ${color} ${hero ? "hero-mockup" : ""}`}
      role="img"
      aria-label="ماکت نمونه محصول؛ تصویر واقعی برند ارائه نشده / Sample product mockup, not brand artwork"
    >
      <svg viewBox={hero ? "0 0 640 550" : "0 0 400 350"} aria-hidden="true">
        <defs>
          <filter
            id={`shadow-${color}-${kind}-${hero}`}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx="5"
              dy="14"
              stdDeviation="13"
              floodColor="#211E1A"
              floodOpacity=".15"
            />
          </filter>
          <pattern
            id={`paper-${color}-${kind}-${hero}`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".5" fill="#211E1A" opacity=".06" />
          </pattern>
        </defs>
        {hero && (
          <>
            <ellipse
              cx="320"
              cy="500"
              rx="240"
              ry="26"
              fill="#75634b"
              opacity=".08"
            />
            <g transform="translate(447 65) rotate(17)">
              <path d="M0 0h55v265H0z" fill="#f2e8d6" />
              <path d="M8 0h39v260H8z" fill="#b5beb0" />
              <circle cx="27" cy="34" r="7" fill="#f2e8d6" />
              <path
                d="M27 50v148M27 95q-28-20-15-35q24 8 15 35M27 140q30-22 17-42q-25 9-17 42"
                stroke="#5a715f"
                fill="none"
                strokeWidth="2"
              />
            </g>
          </>
        )}
        <g
          transform={
            hero
              ? "translate(80 70) rotate(-9 160 210)"
              : "translate(88 38) rotate(-8 110 140)"
          }
          filter={`url(#shadow-${color}-${kind}-${hero})`}
        >
          {kind === "book" || hero ? (
            <>
              <rect
                x="6"
                y="6"
                width={hero ? 295 : 223}
                height={hero ? 395 : 275}
                rx="4"
                fill="#e7ded0"
              />
              <rect
                width={hero ? 295 : 220}
                height={hero ? 390 : 270}
                rx="5"
                fill="var(--mock-cover)"
              />
              <rect
                width={hero ? 295 : 220}
                height={hero ? 390 : 270}
                rx="5"
                fill={`url(#paper-${color}-${kind}-${hero})`}
              />
              <path
                d={hero ? "M18 0v390" : "M14 0v270"}
                stroke="#fff"
                opacity=".35"
              />
              <circle
                cx={hero ? 150 : 112}
                cy={hero ? 155 : 100}
                r={hero ? 66 : 48}
                fill="var(--mock-ink)"
                opacity=".85"
              />
              <path
                d={
                  hero
                    ? "M65 285Q105 110 190 260Q215 320 260 200v150H55Z"
                    : "M42 197Q80 85 140 184q30 48 60-33v92H38Z"
                }
                fill="var(--mock-paper)"
              />
              <path
                d={
                  hero
                    ? "M115 290q30-130 85-85M150 260l-22-40M162 240l30-10"
                    : "M82 208q23-86 62-64M106 184l-16-29M116 168l22-8"
                }
                fill="none"
                stroke="var(--mock-ink)"
                strokeWidth="2"
              />
              <text
                x={hero ? 147 : 110}
                y={hero ? 350 : 246}
                textAnchor="middle"
                fontFamily="Georgia, serif"
                fontSize={hero ? 12 : 9}
                letterSpacing="4"
                fill="var(--mock-ink)"
              >
                A LITTLE WORLD
              </text>
            </>
          ) : kind === "bookmark" ? (
            <>
              <rect
                x="48"
                y="0"
                width="90"
                height="270"
                rx="3"
                fill="var(--mock-cover)"
              />
              <circle cx="93" cy="18" r="5" fill="#fff" />
              <path
                d="M93 20q-20-65 15-42"
                fill="none"
                stroke="var(--mock-ink)"
                strokeWidth="3"
              />
              <circle cx="93" cy="97" r="28" fill="var(--mock-ink)" />
              <path d="M60 222q35-150 65-32v60H60" fill="var(--mock-paper)" />
            </>
          ) : (
            <>
              <rect width="220" height="265" rx="5" fill="#fffdf8" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <g
                  key={i}
                  transform={`translate(${25 + (i % 2) * 105} ${25 + Math.floor(i / 2) * 83})`}
                >
                  <rect
                    width="66"
                    height="65"
                    rx={i % 2 ? 30 : 8}
                    fill="var(--mock-cover)"
                  />
                  <circle cx="32" cy="27" r="16" fill="var(--mock-ink)" />
                  <path d="M8 56q25-48 50 0" fill="var(--mock-paper)" />
                </g>
              ))}
            </>
          )}
        </g>
        {hero && (
          <>
            <g
              transform="translate(357 328) rotate(12)"
              filter={`url(#shadow-${color}-${kind}-${hero})`}
            >
              <rect width="182" height="156" rx="4" fill="#fffdf6" />
              <circle cx="51" cy="47" r="26" fill="#c78565" />
              <path d="M107 19h51v58h-51z" fill="#8b9d87" />
              <path d="M25 119q35-72 70 0Z" fill="#6f8479" />
              <path d="M115 95h42v38h-42z" fill="#d7b97e" />
            </g>
            <path
              d="m551 244-23 160"
              stroke="#ac7555"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path d="m527 410-5 15-1-17" fill="#383429" />
          </>
        )}
      </svg>
      <span className="sample-label">SAMPLE MOCKUP</span>
    </div>
  )
}

