import type { ReactNode } from "react"

export default function BundleStillLife({
  view = 0,
  renderMedia,
}: {
  view?: number
  renderMedia: (color: string, kind: string) => ReactNode
}) {
  if (view === 1)
    return (
      <div className="bundle-single-media">{renderMedia("sage", "book")}</div>
    )
  if (view === 2)
    return (
      <div className="bundle-sticker-pair">
        <Sticker />
        <Sticker />
      </div>
    )
  if (view === 3)
    return (
      <div className="bundle-single-media">
        {renderMedia("sage", "bookmark")}
      </div>
    )
  return (
    <div className="bundle-still-life">
      <div className="bundle-scene-book">{renderMedia("sage", "book")}</div>
      <div className="bundle-scene-bookmark">
        {renderMedia("sage", "bookmark")}
      </div>
      <div className="bundle-scene-stickers">
        <Sticker />
        <Sticker />
      </div>
      <span className="bundle-scene-caption">
        1 NOTEBOOK · 2 STICKERS · 1 BOOKMARK
      </span>
    </div>
  )
}
function Sticker() {
  return (
    <svg
      className="bundle-single-sticker"
      viewBox="0 0 110 110"
      aria-hidden="true"
    >
      <circle
        cx="55"
        cy="55"
        r="49"
        fill="var(--canvas)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      <circle cx="55" cy="43" r="24" fill="#b7c1a3" />
      <path
        d="M34 80q16-53 42-35M51 65l-15-15M62 55l16-2"
        stroke="#596e53"
        strokeWidth="2"
        fill="none"
      />
      <text
        x="55"
        y="94"
        textAnchor="middle"
        fontSize="12"
        fill="var(--muted)"
        fontFamily="Inter, sans-serif"
      >
        SAMPLE
      </text>
    </svg>
  )
}
