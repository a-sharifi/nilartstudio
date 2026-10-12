// Original vector fixture, not a customer image, real commission or print-ready delivery.
export default function ArtworkReviewImage({
  version = 2,
  label,
}: {
  version?: number
  label: string
}) {
  return (
    <svg
      className="review-artwork-image"
      viewBox="0 0 640 800"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient
          id={`review-paper-${version}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop stopColor="#eee4d4" />
          <stop offset="1" stopColor="#e0d4c2" />
        </linearGradient>
        <linearGradient
          id={`review-cloth-${version}`}
          x1="0"
          y1="0"
          x2=".6"
          y2="1"
        >
          <stop stopColor="#536a5e" />
          <stop offset="1" stopColor="#344d43" />
        </linearGradient>
      </defs>
      <rect width="640" height="800" fill={`url(#review-paper-${version})`} />
      <path
        d="M105 520V235a215 215 0 0 1 430 0v285Z"
        fill={version === 1 ? "#cfad97" : "#ddc5ae"}
      />
      {version === 1 && (
        <>
          <path
            d="M85 200h80M470 350h100M75 580h80"
            stroke="#b49a82"
            strokeWidth="3"
          />
          <circle cx="505" cy="150" r="33" fill="#d0b187" />
        </>
      )}
      <ellipse
        cx="320"
        cy="717"
        rx="233"
        ry="25"
        fill="#b1a08c"
        opacity=".24"
      />
      <path
        d="M323 688c-16-142-4-200 36-235 37-33 121-29 161 13 36 39 45 116 52 222Z"
        fill={version === 1 ? "#a4755a" : "#9b6b52"}
      />
      <path
        d="M339 482c-27 41-37 99-34 187M464 486c39 44 37 97 45 171"
        stroke="#79523f"
        strokeWidth="3"
        fill="none"
      />
      <path d="m402 380-8 87q13 24 41 23l29-45-18-85" fill="#ba866a" />
      <path d="M382 300c-21 5-37 33-30 57 4 14 15 20 26 18Z" fill="#bd8c70" />
      <path
        d="M373 229c24-52 107-39 129 12 13 29 8 82-12 121-12 26-40 60-65 58-34-3-59-48-61-94Z"
        fill="#c89678"
      />
      <path
        d="M367 291c-20-29-10-76 10-95 27-25 61-32 93-23 35 10 56 35 55 73l-12 71-19-35-8-43c-35 15-61 6-82-8l-19 60Z"
        fill="#423b32"
      />
      <path
        d="m398 304 17-3m42 4 18 3M444 304l-3 39 10 3M419 370q20 10 37-1"
        stroke="#77503d"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M106 695c-6-107-7-175 44-218 39-33 103-39 140-6 36 32 47 124 39 224Z"
        fill={`url(#review-cloth-${version})`}
      />
      <path d="M180 390v62q33 36 72 0l-8-79" fill="#d2a17e" />
      <path
        d="M143 302c-2-64 30-112 83-111 73 0 93 81 79 171-4 50-11 83-3 114l-66-48-99 26c17-65 4-103 6-152Z"
        fill="#514637"
      />
      <path
        d="M169 284c2-34 37-58 78-43 41 15 52 66 35 111-17 44-49 67-79 52-30-16-38-72-34-120Z"
        fill="#d8ab88"
      />
      <path
        d="M146 315c11-48 28-75 60-84 16 29 42 51 83 61 1-61-26-84-59-88-52-7-86 25-84 111Z"
        fill="#514637"
      />
      <path
        d="m185 304 18-3m37 6 17 4M226 314l-4 26 8 5M201 369q18 9 34-1"
        stroke="#90684f"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="m163 480 44 58 48-76M210 535v137M135 538l25 151M291 551l-17 132"
        stroke="#849488"
        strokeWidth="2"
        fill="none"
        opacity=".7"
      />
      <path
        d="M253 582c33-19 52-16 77 6l33 33c6 11-3 20-13 14l-48-26-37 25"
        fill="#cc9e7c"
      />
      <path
        d="M414 595c-32-23-57-22-89-9l-46 21c-13 7-8 19 7 18l43-10 33 18"
        fill="#bd8c70"
      />
      <path
        d="M71 663q20-136 47-210m-30 139q-44-53-20-71 34 27 20 71m18-78q41-54 49-26-9 41-49 26"
        stroke="#7c8871"
        strokeWidth="3"
        fill="none"
      />
      <path d="M488 727H130" stroke="#ab957d" strokeWidth="1" opacity=".6" />
    </svg>
  )
}
