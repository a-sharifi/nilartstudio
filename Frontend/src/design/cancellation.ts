export type CancelMode = "normal" | "commission" | "payment" | "active" | "empty" | "changed" | "network" | "server" | "unknown" | "loading" | "denied"
export type CancelItem = {
  id: string
  title: [string, string]
  options: [string, string]
  stage: [string, string]
  purchased: number
  allowed: number
  availability: "available" | "review" | "unavailable"
  note: [string, string]
  kind: "product" | "bundle" | "artwork" | "commission" | "digital"
  activeRequest?: string
  alternative?: "returns" | "support"
  components?: [string, string][]
}
// Explicit design fixtures only. Eligibility is not inferred from shipment or payment labels.
export const demoCancellationIds = ["NA-24018", "NA-23976"]
export const demoCancellationContract = {
  version: "demo-order-v3",
  policy: "demo-agreement-v1",
  maxDetails: 1000,
}
export const cancellationReasons = [
  {
    id: "changed-mind",
    label: ["تغییر تصمیم", "Changed my mind"],
    requiresDetails: false,
  },
  {
    id: "wrong-choice",
    label: ["انتخاب اشتباه", "Selected the wrong item"],
    requiresDetails: false,
  },
  {
    id: "change-order",
    label: ["نیاز به تغییر سفارش", "Need to change my order"],
    requiresDetails: false,
  },
  { id: "other", label: ["سایر", "Other"], requiresDetails: true },
]
export function cancellationFixture(mode: CancelMode): CancelItem[] {
  const items: CancelItem[] = [
    {
      id: "bundle",
      title: ["پکیج کالکشن گربه‌ها", "The cats collection bundle"],
      options: [
        "دفتر A5، جلد سخت، ۸۰ برگ • ۲ استیکر • نشان‌کتاب",
        "A5 hardcover notebook, 80 sheets • 2 stickers • Bookmark",
      ],
      stage: ["در حال آماده‌سازی • ارسال نشده", "Preparing • Not shipped"],
      purchased: 1,
      allowed: 1,
      availability: "available",
      kind: "bundle",
      note: [
        "فقط درخواست لغو کل پکیج مجاز است؛ اجزا جداگانه قابل انتخاب نیستند.",
        "Only whole-bundle requests are supported. Components cannot be selected separately.",
      ],
      components: [
        [
          "۱ دفتر • A5، کاغذ ۱۰۰ گرم، ۸۰ برگ",
          "1 notebook • A5, 100 gsm, 80 sheets",
        ],
        ["۲ استیکر • مات", "2 stickers • Matte"],
        ["۱ نشان‌کتاب", "1 bookmark"],
      ],
    },
    {
      id: "notebook",
      title: ["دفتر «لحظه‌های آرام»", "Quiet moments notebook"],
      options: [
        "A5 • جلد سخت • کاغذ ۱۰۰ گرم • ۸۰ برگ در هر دفتر",
        "A5 • Hardcover • 100 gsm • 80 sheets per notebook",
      ],
      stage: ["در حال آماده‌سازی • ارسال نشده", "Preparing • Not shipped"],
      purchased: 2,
      allowed: 2,
      availability: "available",
      kind: "product",
      note: [
        "انتخاب تعداد در محدوده مجاز امکان‌پذیر است.",
        "You may choose a quantity within the allowed range.",
      ],
    },
    {
      id: "artwork",
      title: ["چاپ هنری «باغ کوچک»", "Little garden art print"],
      options: [
        "چاپ روی کاغذ • ۳۰ × ۴۰ سانتی‌متر • بدون قاب",
        "Paper print • 30 × 40 cm • Unframed",
      ],
      stage: ["ارسال‌شده • مرسوله دوم", "Shipped • Second shipment"],
      purchased: 1,
      allowed: 0,
      availability: "unavailable",
      kind: "artwork",
      note: [
        "طبق پاسخ نمونه، این قلم در مسیر لغو در دسترس نیست. شرایط مرجوعی را بررسی کنید.",
        "The demo response does not allow cancellation for this line. Review return eligibility.",
      ],
      alternative: "returns",
    },
  ]
  if (mode === "commission")
    items.splice(
      0,
      items.length,
      {
        id: "commission",
        title: ["پرتره خانوادگی سفارشی", "Custom family portrait"],
        options: [
          "سایز A3 • پیشنهاد پذیرفته‌شده Q-1042-V2",
          "A3 • Accepted proposal Q-1042-V2",
        ],
        stage: [
          "اجرای سفارش آغاز شده • نسخه اولیه آماده نشده",
          "Work started • No first draft yet",
        ],
        purchased: 1,
        allowed: 1,
        availability: "review",
        kind: "commission",
        note: [
          "طبق توافق نمونه، درخواست باید توسط نقش مجاز بررسی شود. اصلاح طرح، لغو سفارش نیست.",
          "Under the demo agreement, an authorized reviewer must assess the request. Revisions are not cancellations.",
        ],
      },
      {
        id: "digital",
        title: ["فایل دیجیتال «باغ کوچک»", "Little garden digital file"],
        options: [
          "فایل نهایی مشتری • مجوز استفاده شخصی",
          "Final customer file • Personal-use license",
        ],
        stage: [
          "فایل آماده • وضعیت دریافت ثبت شده در نمونه",
          "File ready • Demo download state recorded",
        ],
        purchased: 1,
        allowed: 1,
        availability: "review",
        kind: "digital",
        note: [
          "پاسخ نمونه اجازه بررسی درخواست می‌دهد؛ دریافت فایل به‌تنهایی ممنوعیت قطعی نیست.",
          "The demo response permits review; downloading alone does not imply an absolute restriction.",
        ],
      },
    )
  if (mode === "active") {
    items[1].allowed = 0
    items[1].availability = "unavailable"
    items[1].activeRequest = "CR-2048"
    items[1].note = [
      "برای این اقلام، درخواست در حال بررسی دارید.",
      "You already have a request under review for these items.",
    ]
  }
  if (mode === "empty")
    for (const item of items) {
      item.allowed = 0
      item.availability = "unavailable"
      item.note = [
        "طبق پاسخ نمونه، ثبت درخواست جدید برای این قلم در دسترس نیست.",
        "The demo response does not allow a new request for this item.",
      ]
      item.alternative = "support"
    }
  return items
}
export type CancelSelection = Record<string, string>
export function validateCancellation(
  items: CancelItem[],
  selection: CancelSelection,
  reason: string,
  details: string,
) {
  const errors: Record<string, string> = {}
  if (!Object.keys(selection).length) errors.items = "select"
  for (const [id, raw] of Object.entries(selection)) {
    const item = items.find((line) => line.id === id)
    const quantity = Number(raw)
    if (
      !item ||
      item.activeRequest ||
      item.availability === "unavailable" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > item.allowed ||
      !raw.trim()
    )
      errors[`quantity-${id}`] = "quantity"
  }
  const selectedReason = cancellationReasons.find(
    (option) => option.id === reason,
  )
  if (!selectedReason) errors.reason = "reason"
  if (selectedReason?.requiresDetails && !details.trim())
    errors.details = "details"
  if (details.length > demoCancellationContract.maxDetails)
    errors.details = "length"
  return errors
}
