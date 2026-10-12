export type ReviewMode = "ready" | "new" | "revision-pending" | "in-progress" | "approved" | "manual" | "exhausted" | "conflict" | "unknown" | "network" | "server" | "loading" | "empty" | "image-error" | "denied"
export const demoReviewOrders = ["NA-24106", "NA-24018", "NA-23976"]
export const demoReviewContract = {
  maxDetails: 1500,
  revisionAllowance: 2,
  agreement: "Q-1042-V2",
  scope: [
    "اصلاح جزئی رنگ، پس‌زمینه و جزئیات مطابق موضوع پذیرفته‌شده",
    "Minor color, background and detail adjustments within the accepted subject",
  ],
}
export type ArtworkVersion = {
  id: string
  number: number
  submittedAt: string
  note: [string, string]
  feedback: [string, string] | null
  feedbackAt: string | null
  authorized: boolean
}
export const demoArtworkVersions: ArtworkVersion[] = [
  {
    id: "ART-V2",
    number: 2,
    submittedAt: "2025-06-18T14:20:00+03:30",
    note: [
      "در این نسخه، پس‌زمینه ساده‌تر شده و تناسب رنگ لباس‌ها بازبینی شده است. لطفاً ترکیب‌بندی و جزئیات کلی را بررسی کنید.",
      "The background is simpler and clothing colors have been refined. Please review the composition and overall details.",
    ],
    feedback: null,
    feedbackAt: null,
    authorized: true,
  },
  {
    id: "ART-V1",
    number: 1,
    submittedAt: "2025-06-15T10:00:00+03:30",
    note: [
      "نسخه اولیه برای بررسی ترکیب‌بندی و پالت رنگ ارائه شده است.",
      "The first draft is presented for composition and palette review.",
    ],
    feedback: [
      "لطفاً پس‌زمینه ساده‌تر شود و رنگ لباس‌ها هماهنگ‌تر باشد.",
      "Please simplify the background and harmonize the clothing colors.",
    ],
    feedbackAt: "2025-06-16T09:10:00+03:30",
    authorized: true,
  },
]
export function reviewPermissions(mode: ReviewMode, imageVisible: boolean) {
  const blocked = [
    "revision-pending",
    "in-progress",
    "approved",
    "loading",
    "empty",
    "denied",
  ].includes(mode)
  return {
    approve: !blocked && imageVisible,
    revise: !blocked && imageVisible && mode !== "exhausted",
  }
}
export function validateArtworkDecision(input: {
  owned: boolean
  displayedVersion: string
  currentVersion: string
  imageVisible: boolean
  mode: ReviewMode
  action: "approve" | "revise"
  details: string
}) {
  const errors: Record<string, string> = {}
  if (!input.owned) errors.access = "permission"
  if (input.displayedVersion !== input.currentVersion)
    errors.version = "version"
  const permissions = reviewPermissions(input.mode, input.imageVisible)
  if (!permissions[input.action === "approve" ? "approve" : "revise"])
    errors.action = "action"
  if (input.action === "revise") {
    if (!input.details.trim()) errors.details = "details"
    else if (input.details.length > demoReviewContract.maxDetails)
      errors.details = "length"
  }
  return errors
}
