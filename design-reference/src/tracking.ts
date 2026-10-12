export type TrackingText = readonly [string, string]
export type TrackingStage = "details" | "otp" | "loading" | "result"
export type TrackingScenario = "single" | "mixed" | "payment" | "preparing" | "delivered" | "cancelled" | "refund" | "supply" | "no-update"
export interface TrackingEvent {
  title: TrackingText
  description: TrackingText
  state: "done" | "current" | "future"
  at?: string
}
export interface TrackingItem {
  id: string
  name: TrackingText
  options: TrackingText
  quantity: number
  status: TrackingText
  kind: "notebook" | "bundle" | "commission"
}
export interface TrackingParcel {
  id: string
  name: TrackingText
  state: TrackingText
  itemIds: string[]
  carrier?: TrackingText
  code?: string
  carrierUrl?: string
  events: TrackingEvent[]
}
export interface TrackingResult {
  orderNumber: string
  createdAt: string
  updatedAt: string
  status: TrackingText
  description: TrackingText
  tone: "success" | "warning" | "neutral"
  payment: TrackingText
  items: TrackingItem[]
  parcels: TrackingParcel[]
  commissionEvents?: TrackingEvent[]
  refund?: TrackingText
  returnStatus?: TrackingText
  returnReceipt?: TrackingText
  needsPrivateAction?: boolean
  warning?: TrackingText
}

// Prototype-only service settings. None of these values are production policies.
export const trackingDemoConfig = {
  otpDigits: 6,
  otpCode: "123456",
  resendSeconds: 30,
  challengeSeconds: 180,
  accessSeconds: 300,
  lockSeconds: 30,
  maxAttempts: 3,
  requestDelayMs: 550,
}
export const trackingCountries = [
  { id: "IR", code: "+98", name: ["ایران", "Iran"] as TrackingText },
  {
    id: "GB",
    code: "+44",
    name: ["بریتانیا", "United Kingdom"] as TrackingText,
  },
]
export function normalizeTrackingDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (character) => String(character.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (character) => String(character.charCodeAt(0) - 1632))
    .trim()
}
export function normalizeTrackingPhone(value: string, country: string) {
  let phone = normalizeTrackingDigits(value).replace(/[\s()-]/g, "")
  const code = trackingCountries.find((item) => item.id === country)?.code
  if (!code) return null
  if (phone.startsWith(code)) phone = phone.slice(code.length)
  if (phone.startsWith("0")) phone = phone.slice(1)
  const rule = country === "IR" ? /^9\d{9}$/ : /^7\d{9}$/
  return rule.test(phone) ? `${code}${phone}` : null
}
export function validateTrackingDetails(
  order: string,
  phone: string,
  country: string,
) {
  // Only required-field validation is known; the real order format must come from the service.
  return {
    order: normalizeTrackingDigits(order) ? "" : "required",
    phone: normalizeTrackingPhone(phone, country) ? "" : "invalid",
  }
}
export function maskTrackingPhone(phone: string) {
  return phone.length > 5
    ? `${phone.slice(0, 3)} ••• ••• ${phone.slice(-2)}`
    : "•••"
}
export function approvedCarrierUrl(
  url?: string,
  approvedOrigins: readonly string[] = [],
) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      approvedOrigins.includes(parsed.origin)
      ? parsed.href
      : null
  } catch {
    return null
  }
}
const readyEvents = (delivered = false, preparing = false): TrackingEvent[] => [
  {
    title: ["ثبت سفارش", "Order placed"],
    description: ["سفارش ثبت شده است.", "The order has been recorded."],
    state: "done",
    at: "2026-06-10T09:20:00Z",
  },
  {
    title: ["تأیید پرداخت", "Payment confirmed"],
    description: [
      "پرداخت این بخش تأیید شده است.",
      "Payment for this part is confirmed.",
    ],
    state: "done",
    at: "2026-06-10T09:22:00Z",
  },
  {
    title: ["آماده‌سازی", "Preparation"],
    description: [
      "اقلام آماده برای بسته‌بندی بررسی می‌شوند.",
      "Ready-stock items are checked for packing.",
    ],
    state: preparing ? "current" : "done",
    at: "2026-06-11T08:00:00Z",
  },
  {
    title: ["تحویل به شرکت حمل", "Handed to the carrier"],
    description: [
      "رهگیری مربوط به همین مرسوله است.",
      "Tracking applies to this parcel only.",
    ],
    state: preparing ? "future" : delivered ? "done" : "current",
    ...(!preparing && { at: "2026-06-11T11:30:00Z" }),
  },
  {
    title: ["تحویل به مشتری", "Delivered to customer"],
    description: [
      "تحویل پس از ثبت شرکت حمل تأیید می‌شود.",
      "Delivery is confirmed when reported by the carrier.",
    ],
    state: delivered ? "current" : "future",
    ...(delivered && { at: "2026-06-13T12:00:00Z" }),
  },
]
export function demoTrackingResult(
  orderNumber: string,
  scenario: TrackingScenario,
): TrackingResult {
  const preparing = scenario === "preparing"
  const delivered = scenario === "delivered" || scenario === "mixed"
  const result: TrackingResult = {
    orderNumber: normalizeTrackingDigits(orderNumber) || "DEMO-ORDER",
    createdAt: "2026-06-10T09:20:00Z",
    updatedAt: "2026-06-13T12:00:00Z",
    status: preparing
      ? ["در حال آماده‌سازی", "Preparing your order"]
      : delivered
        ? ["تحویل شد", "Delivered"]
        : ["ارسال شد", "Shipped"],
    description: preparing
      ? [
          "سفارش در حال آماده‌سازی است. اطلاعات ارسال پس از تحویل به شرکت حمل نمایش داده می‌شود.",
          "Your order is being prepared. Tracking details will appear after handoff to the carrier.",
        ]
      : [
          "وضعیت ارسال این مرسوله را در ادامه ببینید. تأیید پرداخت با تحویل سفارش متفاوت است.",
          "See this parcel's shipping status below. Payment confirmation is separate from delivery.",
        ],
    tone: preparing ? "neutral" : "success",
    payment: ["پرداخت تأیید شد", "Payment confirmed"],
    items: [
      {
        id: "notebook",
        name: ["دفتر طراحی — نمونه", "Sketchbook — sample"],
        options: [
          "سایز A5 · جلد نرم · ۵۰ برگ در هر دفتر",
          "A5 · Soft cover · 50 sheets per notebook",
        ],
        quantity: 3,
        status: preparing
          ? ["در حال آماده‌سازی", "Preparing"]
          : delivered
            ? ["تحویل شد", "Delivered"]
            : ["ارسال شد", "Shipped"],
        kind: "notebook",
      },
      {
        id: "bundle",
        name: ["پکیج هماهنگ — نمونه", "Matching bundle — sample"],
        options: [
          "هر پکیج: یک دفتر A5، دو استیکر و یک نشانک · اجزا با هم ارسال می‌شوند",
          "Each bundle: one A5 notebook, two stickers and one bookmark · Components ship together",
        ],
        quantity: 1,
        status: preparing
          ? ["در حال آماده‌سازی", "Preparing"]
          : delivered
            ? ["تحویل شد", "Delivered"]
            : ["ارسال شد", "Shipped"],
        kind: "bundle",
      },
    ],
    parcels: [
      {
        id: "parcel-1",
        name: ["مرسوله اول", "Parcel one"],
        state: preparing
          ? ["در انتظار تحویل به شرکت حمل", "Awaiting carrier handoff"]
          : delivered
            ? ["تحویل شد", "Delivered"]
            : ["در مسیر", "In transit"],
        itemIds: ["notebook", "bundle"],
        ...(!preparing && {
          carrier: ["شرکت حمل — Demo", "Carrier — Demo"],
          code: "DEMO-TRACK-001",
        }),
        events: readyEvents(delivered, preparing),
      },
    ],
  }
  if (scenario === "mixed") {
    result.status = ["بخشی از سفارش تحویل شد", "Partially delivered"]
    result.description = [
      "دفترها تحویل شده‌اند؛ پکیج در حال آماده‌سازی است و نقاشی سفارشی مسیر اجرای جداگانه دارد.",
      "The notebooks have been delivered; the bundle is being prepared and the commission has its own execution flow.",
    ]
    result.tone = "neutral"
    result.parcels[0].itemIds = ["notebook"]
    result.items[1].status = ["در حال آماده‌سازی", "Preparing"]
    result.parcels.push({
      id: "parcel-2",
      name: ["مرسوله دوم", "Parcel two"],
      state: ["در حال آماده‌سازی", "Preparing"],
      itemIds: ["bundle"],
      events: readyEvents(false, true),
    })
    result.items.push({
      id: "commission",
      name: ["نقاشی اختصاصی — نمونه", "Commissioned artwork — sample"],
      options: [
        "مشخصات و فایل‌های خصوصی فقط در حساب کاربری",
        "Private specifications and files are available only in your account",
      ],
      quantity: 1,
      status: ["نسخه اولیه آماده", "First version ready"],
      kind: "commission",
    })
    result.needsPrivateAction = true
    result.commissionEvents = [
      {
        title: ["تأیید سفارش", "Commission confirmed"],
        description: [
          "درخواست و توافق تأیید شده‌اند.",
          "The request and agreement have been confirmed.",
        ],
        state: "done",
        at: "2026-06-10T10:00:00Z",
      },
      {
        title: ["شروع اجرا", "Work started"],
        description: [
          "اجرای اثر آغاز شده است.",
          "Work on the artwork has started.",
        ],
        state: "done",
        at: "2026-06-11T09:00:00Z",
      },
      {
        title: ["نسخه اولیه آماده", "First version ready"],
        description: [
          "برای مشاهده و تأیید نسخه، وارد حساب شوید.",
          "Sign in to view and approve the private version.",
        ],
        state: "current",
        at: "2026-06-13T12:00:00Z",
      },
      {
        title: ["تحویل نهایی", "Final delivery"],
        description: [
          "پس از تکمیل مراحل توافق‌شده ثبت می‌شود؛ اصلاحات فقط در صورت نیاز و طبق توافق.",
          "Recorded after agreed steps are complete; revisions only if needed and as agreed.",
        ],
        state: "future",
      },
    ]
  }
  if (scenario === "payment") {
    result.status = ["در انتظار تأیید پرداخت", "Awaiting payment confirmation"]
    result.payment = ["در حال بررسی", "Under review"]
    result.description = [
      "نتیجه پرداخت در حال بررسی است. تا مشخص‌شدن نتیجه، دوباره پرداخت نکنید.",
      "Your payment result is being checked. Do not pay again until it is confirmed.",
    ]
    result.tone = "warning"
    result.items = result.items.map((item) => ({
      ...item,
      status: ["در انتظار تأیید پرداخت", "Awaiting payment confirmation"],
    }))
    result.parcels = []
  }
  if (scenario === "supply") {
    result.status = ["نیازمند بررسی سفارش", "Order needs review"]
    result.warning = [
      "پرداخت تأیید شده، اما تأمین سفارش نیازمند بررسی است. برای اطلاع از اقدام بعدی با پشتیبانی تماس بگیرید.",
      "Payment is confirmed, but fulfillment needs review. Contact support for the next step.",
    ]
    result.tone = "warning"
    result.parcels = []
    result.items = result.items.map((item) => ({
      ...item,
      status: ["نیازمند بررسی", "Needs review"],
    }))
  }
  if (scenario === "cancelled" || scenario === "refund") {
    result.status =
      scenario === "cancelled"
        ? ["لغو شد", "Cancelled"]
        : ["در حال بررسی درخواست بازپرداخت", "Refund request under review"]
    result.description = [
      "لغو سفارش یا ثبت درخواست به معنی بازگشت وجه نیست. وضعیت بازپرداخت جداگانه نمایش داده می‌شود.",
      "Cancellation or a submitted request does not mean funds have been refunded. Refund status is shown separately.",
    ]
    result.refund = [
      "در حال بررسی؛ بازپرداخت تأیید نشده است",
      "Under review; refund not confirmed",
    ]
    result.tone = "warning"
    result.parcels = []
    result.items = result.items.map((item) => ({
      ...item,
      status:
        scenario === "cancelled"
          ? ["لغو شد", "Cancelled"]
          : ["درخواست در حال بررسی", "Request under review"],
    }))
    if (scenario === "refund") {
      result.returnStatus = [
        "درخواست ثبت شده؛ در حال بررسی",
        "Request received; under review",
      ]
      result.returnReceipt = [
        "دریافت کالای مرجوعی تأیید نشده",
        "Returned goods receipt not confirmed",
      ]
    }
  }
  return result
}

interface TrackingPreviewMode {
  value: string
  label: TrackingText
}
export const trackingPreviewModes: TrackingPreviewMode[] = [
  { value: "initial", label: ["فرم اولیه", "Initial form"] },
  { value: "otp", label: ["انتظار کد", "Awaiting code"] },
  { value: "result-single", label: ["نتیجه تک‌مرسوله", "Single parcel result"] },
  { value: "result-mixed", label: ["سفارش ترکیبی", "Mixed order"] },
  { value: "result-payment", label: ["پرداخت نامشخص", "Unclear payment"] },
  { value: "result-preparing", label: ["بدون کد رهگیری", "No tracking code"] },
  { value: "result-delivered", label: ["تحویل‌شده", "Delivered"] },
  {
    value: "result-cancelled",
    label: ["لغو و بازپرداخت جدا", "Cancellation / refund"],
  },
  { value: "result-refund", label: ["درخواست مرجوعی", "Return request"] },
  { value: "result-supply", label: ["مشکل تأمین", "Fulfillment issue"] },
  { value: "result-no-update", label: ["بدون رویداد جدید", "No new update"] },
  { value: "loading", label: ["Skeleton نتیجه", "Result skeleton"] },
  { value: "network", label: ["خطای شبکه", "Network error"] },
  { value: "service", label: ["خطای سرویس", "Service error"] },
  {
    value: "invalid",
    label: ["کد اشتباه / عدم تطبیق", "Invalid code / mismatch"],
  },
  { value: "code-expired", label: ["کد منقضی", "Expired code"] },
  { value: "sms-error", label: ["خطای پیامک", "SMS error"] },
  { value: "limited", label: ["محدودیت تلاش", "Attempt limit"] },
  {
    value: "challenge-expired",
    label: ["انقضای تأیید", "Verification expired"],
  },
  { value: "access-expired", label: ["انقضای دسترسی", "Access expired"] },
  {
    value: "stale",
    label: ["خطای تازه‌سازی نتیجه", "Stale result after refresh error"],
  },
]
export function isTrackingRoute(route: string) {
  return ["/track-order", "/fa/track-order", "/en/track-order"].includes(
    route.split(/[?#]/)[0],
  )
}
