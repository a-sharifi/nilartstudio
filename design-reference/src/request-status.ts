type Localized = [string, string]
export type RequestMode = "review" | "information" | "partial" | "instructions" | "received" | "inspection" | "refund-approved" | "processing" | "completed" | "failed" | "cancellation" | "digital" | "declined" | "payment" | "empty" | "loading" | "network" | "server" | "denied"
export const demoRequestIds = ["RR-2056", "RR-2048", "CR-2056", "CR-2048"]
export type RequestLine = {
  id: string
  title: Localized
  options: Localized
  requested: number
  approved: number | null
  declined: number | null
  paidUnitShare: number
  decision: Localized
  note: Localized
  kind: "bundle" | "product" | "digital"
}
export type RequestEvent = {
  title: Localized
  note: Localized
  timestamp: string | null
  current?: boolean
  future?: boolean
}
// Fixture records, not an authorization decision or a real financial transaction.
export function requestStatusFixture(mode: RequestMode) {
  const cancellation = mode === "cancellation"
  const digital = mode === "digital"
  const decided = [
    "partial",
    "instructions",
    "received",
    "inspection",
    "refund-approved",
    "processing",
    "completed",
    "failed",
    "cancellation",
    "declined",
  ].includes(mode)
  const rejected = mode === "declined"
  const instructions = [
    "instructions",
    "received",
    "inspection",
    "refund-approved",
    "processing",
    "completed",
    "failed",
  ].includes(mode)
  const received = [
    "received",
    "inspection",
    "refund-approved",
    "processing",
    "completed",
    "failed",
  ].includes(mode)
  const inspected = [
    "refund-approved",
    "processing",
    "completed",
    "failed",
  ].includes(mode)
  const financialDecision = inspected || cancellation
  const lines: RequestLine[] = [
    {
      id: "bundle",
      title: ["پکیج کالکشن گربه‌ها", "The cats collection bundle"],
      options: [
        "۱ دفتر A5، جلد سخت، ۸۰ برگ • ۲ استیکر • ۱ نشان‌کتاب",
        "1 A5 hardcover notebook, 80 sheets • 2 stickers • 1 bookmark",
      ],
      requested: 1,
      approved: decided ? (rejected ? 0 : 1) : null,
      declined: decided ? (rejected ? 1 : 0) : null,
      paidUnitShare: 648000,
      kind: "bundle",
      decision: decided
        ? rejected
          ? ["رد درخواست این قلم", "Item request declined"]
          : ["اجازه بازگشت کل پکیج", "Whole-bundle return authorized"]
        : ["در انتظار تصمیم", "Awaiting a decision"],
      note: decided
        ? rejected
          ? [
              "این مسئله در مسیر استاندارد نمونه پذیرفته نشده؛ مسیر پشتیبانی فعال است.",
              "This issue was not accepted in the standard fixture flow; support remains available.",
            ]
          : [
              "فقط کل پکیج؛ اجزا دوباره در مبلغ محاسبه نمی‌شوند.",
              "Whole bundle only; components are not counted again in the amount.",
            ]
        : [
            "پاسخ بررسی هنوز ثبت نشده است.",
            "No review outcome is recorded yet.",
          ],
    },
    {
      id: "notebook",
      title: ["دفتر «لحظه‌های آرام»", "Quiet moments notebook"],
      options: [
        "A5 • جلد سخت • کاغذ ۱۰۰ گرم • ۸۰ برگ در هر دفتر",
        "A5 • Hardcover • 100 gsm • 80 sheets per notebook",
      ],
      requested: 2,
      approved: decided ? (rejected ? 0 : 1) : null,
      declined: decided ? (rejected ? 2 : 1) : null,
      paidUnitShare: 346500,
      kind: "product",
      decision: decided
        ? rejected
          ? ["رد درخواست این قلم", "Item request declined"]
          : ["۱ دفتر تأیید، ۱ دفتر رد شد", "1 notebook approved, 1 declined"]
        : ["در انتظار تصمیم", "Awaiting a decision"],
      note: decided
        ? rejected
          ? [
              "دلیل عمومی نمونه: موضوع از مسیر رسیدگی دیگری بررسی می‌شود.",
              "Demo public reason: this issue is handled through another review path.",
            ]
          : [
              "برای واحد دوم، مغایرت گزارش‌شده در بررسی نمونه تأیید نشد؛ پشتیبانی فعال است.",
              "The reported mismatch for the second unit was not confirmed in the fixture review; support is available.",
            ]
        : [
            "تعداد دفتر از تعداد برگ هر دفتر جداست.",
            "Notebook quantity is separate from sheets per notebook.",
          ],
    },
  ]
  if (cancellation)
    lines.splice(0, lines.length, {
      ...lines[1],
      requested: 1,
      approved: 1,
      declined: 0,
      decision: ["لغو ۱ دفتر تأیید شد", "Cancellation of 1 notebook approved"],
      note: [
        "لغو تأیید شده؛ انتقال وجه نتیجه مستقل دارد.",
        "Cancellation approved; the funds transfer is a separate outcome.",
      ],
    })
  if (digital)
    lines.splice(0, lines.length, {
      ...lines[1],
      id: "digital",
      title: ["فایل دیجیتال «باغ کوچک»", "Little garden digital file"],
      options: [
        "فایل نهایی مشتری • مجوز استفاده شخصی",
        "Final customer file • Personal-use license",
      ],
      requested: 1,
      approved: null,
      declined: null,
      paidUnitShare: 350000,
      kind: "digital",
      decision: ["در حال بررسی دسترسی فایل", "File access is under review"],
      note: [
        "مسیر رسیدگی دیجیتال؛ بازگشت فیزیکی لازم نیست.",
        "Digital issue review; no physical return is needed.",
      ],
    })
  const decisionAmount = lines.reduce(
    (sum, line) => sum + (line.approved || 0) * line.paidUnitShare,
    0,
  )
  const refundStatus =
    mode === "completed"
      ? "completed"
      : mode === "processing"
        ? "processing"
        : mode === "failed"
          ? "failed"
          : financialDecision
            ? "approved"
            : "undetermined"
  const events: RequestEvent[] = [
    {
      title: ["درخواست ثبت شد", "Request submitted"],
      note: [
        "اقلام و توضیحات مشتری در درخواست نمونه ثبت شدند.",
        "Items and customer details were recorded in the fixture.",
      ],
      timestamp: "2025-06-09T10:30:00+03:30",
    },
    {
      title: ["بررسی درخواست آغاز شد", "Request review started"],
      note: [
        "شرایط تاریخی سفارش و اقلام مرتبط بررسی می‌شوند.",
        "Historical order conditions and related items are being reviewed.",
      ],
      timestamp: "2025-06-09T14:00:00+03:30",
      current: !decided && mode !== "information",
    },
  ]
  if (mode === "information")
    events.push({
      title: ["اطلاعات تکمیلی درخواست شد", "More information requested"],
      note: [
        "برای دفتر، تصویر جلد آسیب‌دیده و توضیح کوتاه لازم است.",
        "A photo of the damaged notebook cover and a brief description are needed.",
      ],
      timestamp: "2025-06-10T09:15:00+03:30",
      current: true,
    })
  if (decided)
    events.push({
      title: rejected
        ? ["درخواست رد شد", "Request declined"]
        : cancellation
          ? ["لغو قلم تأیید شد", "Item cancellation approved"]
          : [
              "بازگشت بخشی از اقلام مجاز شد",
              "Return of selected items authorized",
            ],
      note: rejected
        ? [
            "دلیل عمومی و مسیر کمک در تصمیم هر قلم مشخص‌اند.",
            "Public reasons and help options are shown per item.",
          ]
        : [
            "این تصمیم، تکمیل انتقال وجه نیست.",
            "This decision does not mean a completed funds transfer.",
          ],
      timestamp: "2025-06-10T11:20:00+03:30",
      current: mode === "partial" || rejected,
    })
  if (instructions)
    events.push({
      title: ["دستور بازگشت صادر شد", "Return instructions issued"],
      note: [
        "فقط اقلام و تعداد تأییدشده در دستور نمونه مجازند.",
        "Only the items and quantities in the fixture instructions are authorized.",
      ],
      timestamp: "2025-06-10T12:00:00+03:30",
      current: mode === "instructions",
    })
  if (received)
    events.push({
      title: ["کالا دریافت شد", "Returned items received"],
      note: [
        "دریافت به‌تنهایی تأیید کیفیت یا بازپرداخت نیست.",
        "Receipt alone does not confirm quality or a refund.",
      ],
      timestamp: "2025-06-14T10:00:00+03:30",
      current: mode === "received",
    })
  if (mode === "inspection")
    events.push({
      title: ["بررسی کالا در حال انجام است", "Item inspection in progress"],
      note: [
        "نتیجه عمومی پس از بررسی اعلام می‌شود.",
        "A public outcome will be provided after inspection.",
      ],
      timestamp: "2025-06-14T13:30:00+03:30",
      current: true,
    })
  if (inspected)
    events.push({
      title: ["بررسی تکمیل شد", "Inspection completed"],
      note: [
        "۱ پکیج و ۱ دفتر در نتیجه عمومی نمونه پذیرفته شدند.",
        "1 bundle and 1 notebook were accepted in the public fixture outcome.",
      ],
      timestamp: "2025-06-15T09:45:00+03:30",
    })
  if (financialDecision)
    events.push({
      title: ["مبلغ بازپرداخت تأیید شد", "Refund amount approved"],
      note: [
        "این تأیید به معنی واریز وجه نیست.",
        "Approval does not mean funds have been transferred.",
      ],
      timestamp: "2025-06-15T11:00:00+03:30",
      current: refundStatus === "approved",
    })
  if (["processing", "completed", "failed"].includes(refundStatus))
    events.push({
      title:
        refundStatus === "completed"
          ? ["انتقال وجه تکمیل شد", "Funds transfer completed"]
          : refundStatus === "failed"
            ? ["انتقال وجه ناموفق بود", "Funds transfer failed"]
            : ["انتقال وجه در حال انجام است", "Funds transfer processing"],
      note: [
        "وضعیت مستقل عملیات مالی · Demo",
        "Independent financial operation status · Demo",
      ],
      timestamp: "2025-06-16T10:20:00+03:30",
      current: true,
    })
  if (mode === "review")
    events.push({
      title: ["تصمیم بررسی", "Review decision"],
      note: [
        "مرحله احتمالی بعدی؛ هنوز نتیجه‌ای ثبت نشده است.",
        "Possible next stage; no outcome has been recorded.",
      ],
      timestamp: null,
      future: true,
    })
  return {
    type: cancellation
      ? "cancellation" as const
      : digital
        ? "digital" as const
        : "return" as const,
    status:
      mode === "information"
        ? ["نیازمند اطلاعات شما", "More information needed"] as Localized
        : rejected
          ? ["رد شد", "Declined"] as Localized
          : decided
            ? cancellation
              ? ["لغو تأیید شد", "Cancellation approved"] as Localized
              : ["بخشی تأیید شد", "Partially approved"] as Localized
            : ["در حال بررسی", "Under review"] as Localized,
    lines,
    events: mode === "empty" ? [] : events,
    instructions,
    received,
    inspected,
    refundStatus,
    requested:
      mode === "empty"
        ? null
        : lines.reduce(
            (sum, line) => sum + line.requested * line.paidUnitShare,
            0,
          ),
    approved: financialDecision ? decisionAmount : null,
    processing: refundStatus === "processing" ? decisionAmount : null,
    returned: refundStatus === "completed" ? decisionAmount : null,
    updatedAt: "2025-06-16T10:20:00+03:30",
  }
}
export function validateShipment(carrier: string, tracking: string) {
  const errors: Record<string, string> = {}
  if (!["post", "courier"].includes(carrier)) errors.carrier = "carrier"
  if (!/^[A-Za-z0-9-]{6,40}$/.test(tracking.trim()))
    errors.tracking = "tracking"
  return errors
}
