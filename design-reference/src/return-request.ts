import { cancellationFixture, type CancelItem } from "./cancellation"
export type ReturnMode = "normal" | "damage" | "artwork" | "commission" | "digital" | "active" | "empty" | "loading" | "upload-error" | "changed" | "network" | "server" | "unknown" | "denied"
export type EvidenceStatus = "selected" | "uploading" | "checking" | "accepted" | "failed"
export type ReturnIssue = {
  quantity: string
  reason: string
  details: string
}
export type ReturnIssues = Record<string, ReturnIssue>
export type ReturnEvidence = {
  id: string
  itemId: string
  status: EvidenceStatus
}
// Fixture-only service contract. These are not Nilart's published policy or real upload limits.
export const demoReturnContract = {
  version: "demo-return-order-v4",
  policy: "demo-order-agreement-v1",
  maxDetails: 1000,
  fileCount: 3,
  fileBytes: 5 * 1024 * 1024,
  fileTypes: ["image/jpeg", "image/png", "image/webp"],
}
export const returnReasons = [
  { id: "damaged", label: ["آسیب‌دیدگی", "Damaged item"], imagesRequired: true },
  { id: "wrong", label: ["کالای اشتباه", "Wrong item"], imagesRequired: false },
  {
    id: "mismatch",
    label: ["مغایرت با مشخصات سفارش", "Does not match the order"],
    imagesRequired: false,
  },
  {
    id: "quality",
    label: ["مشکل کیفیت", "Quality issue"],
    imagesRequired: false,
  },
  {
    id: "other",
    label: ["سایر موارد مجاز سیاست", "Other policy-permitted issue"],
    imagesRequired: false,
  },
]
export function returnFixture(mode: ReturnMode): CancelItem[] {
  const lines = cancellationFixture("normal")
  lines[0].stage = ["تحویل‌شده • مرسوله اول", "Delivered • First shipment"]
  lines[0].note = [
    "طبق توافق نمونه، فقط کل پکیج قابل درخواست است؛ اجزا انتخاب مستقل ندارند.",
    "The demo agreement allows whole-bundle requests only, not individual components.",
  ]
  lines[1].stage = ["تحویل‌شده • مرسوله اول", "Delivered • First shipment"]
  lines[1].note = [
    "پاسخ نمونه اجازه انتخاب ۱ یا ۲ دفتر را می‌دهد؛ پذیرش پس از بررسی است.",
    "The fixture allows 1 or 2 notebooks; approval follows review.",
  ]
  lines[2].stage = [
    "ارسال‌شده • مرسوله دوم هنوز تحویل نشده",
    "Shipped • Second shipment not yet delivered",
  ]
  lines[2].note = [
    "مسیر استاندارد مرجوعی این قلم طبق پاسخ نمونه فعال نیست؛ پشتیبانی می‌تواند مسئله را بررسی کند.",
    "This line's standard return flow is unavailable in the fixture. Support can review the issue.",
  ]
  lines[2].alternative = "support"
  if (mode === "artwork")
    return [
      {
        ...lines[2],
        id: "original",
        title: ["نقاشی «عصر آرام»", "A quiet afternoon"],
        options: [
          "اثر اصل • اکریلیک روی بوم • ۳۰ × ۴۰ سانتی‌متر • بدون قاب",
          "Original • Acrylic on canvas • 30 × 40 cm • Unframed",
        ],
        stage: ["تحویل‌شده • مرسوله اول", "Delivered • First shipment"],
        allowed: 1,
        availability: "review",
        note: [
          "مسئله اثر و بسته‌بندی مطابق توافق نمونه بررسی می‌شوند؛ تعویض اثر تک‌نسخه تضمین نمی‌شود.",
          "Artwork and packaging issues are reviewed under the demo agreement; replacement of a unique artwork is not guaranteed.",
        ],
      },
    ]
  if (mode === "commission") {
    const commission = cancellationFixture("commission")[0]
    return [
      {
        ...commission,
        stage: ["اثر نهایی تحویل‌شده", "Final artwork delivered"],
        note: [
          "بررسی مغایرت طبق توافق Q-1042-V2؛ اصلاحات طرح و درخواست بازگشت دو مسیر متفاوت‌اند.",
          "Mismatch review under Q-1042-V2; revisions and return requests are separate flows.",
        ],
        alternative: "support",
      },
    ]
  }
  if (mode === "digital") {
    const digital = cancellationFixture("commission")[1]
    return [
      {
        ...digital,
        stage: ["فایل نهایی قابل دسترسی", "Final file accessible"],
        note: [
          "مسیر رسیدگی دیجیتال برای مشکل فایل، دسترسی یا مغایرت؛ بدون بازگرداندن فیزیکی.",
          "Digital review for file, access or mismatch issues; no physical return.",
        ],
        alternative: "support",
      },
    ]
  }
  if (mode === "active") {
    lines[1] = {
      ...lines[1],
      allowed: 0,
      availability: "unavailable",
      activeRequest: "RR-2048",
      note: [
        "برای این اقلام درخواست فعال دارید.",
        "You already have an active request for these items.",
      ],
    }
  }
  if (mode === "empty")
    for (const line of lines) {
      line.allowed = 0
      line.availability = "unavailable"
      line.alternative = "support"
      line.note = [
        "این مسیر در پاسخ نمونه در دسترس نیست؛ سایر راه‌های رسیدگی را با پشتیبانی بررسی کنید.",
        "This flow is unavailable in the fixture; contact support to explore other review options.",
      ]
    }
  return lines
}
export function validateReturn(
  items: CancelItem[],
  issues: ReturnIssues,
  evidence: ReturnEvidence[],
) {
  const errors: Record<string, string> = {}
  if (!Object.keys(issues).length) errors.items = "select"
  for (const [id, issue] of Object.entries(issues)) {
    const item = items.find((line) => line.id === id)
    if (
      !item ||
      item.allowed < 1 ||
      item.activeRequest ||
      item.availability === "unavailable" ||
      !issue.quantity.trim() ||
      !Number.isInteger(Number(issue.quantity)) ||
      Number(issue.quantity) < 1 ||
      Number(issue.quantity) > item.allowed
    )
      errors[`quantity-${id}`] = "quantity"
    const reason = returnReasons.find((option) => option.id === issue.reason)
    if (
      !reason ||
      (item?.kind === "digital" &&
        !["mismatch", "quality", "other"].includes(issue.reason))
    )
      errors[`reason-${id}`] = "reason"
    if (!issue.details.trim()) errors[`details-${id}`] = "details"
    else if (issue.details.length > demoReturnContract.maxDetails)
      errors[`details-${id}`] = "length"
    if (
      reason?.imagesRequired &&
      !evidence.some((file) => file.itemId === id && file.status === "accepted")
    )
      errors[`evidence-${id}`] = "evidence"
    if (
      evidence.some((file) => file.itemId === id && file.status !== "accepted")
    )
      errors[`evidence-${id}`] = "pending"
  }
  return errors
}
