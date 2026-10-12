export type CommissionMode = "normal" | "loading" | "disabled" | "start-error" | "draft" | "draft-error" | "expired" | "digital-only" | "optional-error"
export const commissionModes: [CommissionMode, string, string][] = [
  ["normal", "عادی · بدون نمونه و پیش‌نویس", "Normal · no examples or draft"],
  ["draft", "پیش‌نویس نمونه", "Demo draft"],
  ["draft-error", "خطای دریافت پیش‌نویس", "Draft retrieval error"],
  ["expired", "نشست منقضی", "Expired session"],
  ["disabled", "مسیر غیرفعال", "Requests unavailable"],
  ["start-error", "خطای شروع", "Start error"],
  ["loading", "بارگذاری", "Loading"],
  ["digital-only", "فقط اجرای دیجیتال", "Digital only"],
  ["optional-error", "خطای محتوای اختیاری", "Optional content error"],
]
export const commissionConfig = {
  demo: true,
  newRequestsEnabled: true,
  requiresSignIn: true,
  guestStorageSupported: false,
  liveDraftsSupported: false,
  publishedExamples: [],
  executionTypes: ["digital", "hand-painted"],
} as const
export function isCommissionRoute(path: string) {
  return /^(\/fa|\/en)?\/commissions(\/new)?$/.test(path.split(/[?#]/)[0])
}
export function commissionDestination(
  language: 0 | 1,
  signedIn: boolean,
  resume = false,
) {
  const route = `/${language === 0 ? "fa" : "en"}/commissions/new/${
    resume ? "preferences?draft=demo-owned" : "references"
  }`
  return signedIn ? route : `/login?returnTo=${encodeURIComponent(route)}`
}
export function canShowDemoDraft(signedIn: boolean, mode: CommissionMode) {
  return signedIn && mode === "draft"
}
export const commissionSteps = [
  {
    title: ["تصویر و توضیحات", "Image and brief"],
    desc: [
      "تصویر مرجع یا توضیح ایده‌تان را مطابق گزینه‌های پشتیبانی‌شده معرفی کنید.",
      "Share a reference image or describe your idea using the supported options.",
    ],
    icon: "image",
  },
  {
    title: ["انتخاب ترجیحات", "Choose preferences"],
    desc: [
      "سبک، سایز و نوع اجرای فعال را برای درخواست خود انتخاب کنید.",
      "Choose an active style, size and execution type for your request.",
    ],
    icon: "sliders",
  },
  {
    title: ["ارزیابی و پیشنهاد", "Assessment and proposal"],
    desc: [
      "اطلاعات ارزیابی می‌شوند؛ هنرمند در موارد لازم پیشنهاد را بررسی می‌کند.",
      "Your information is assessed; an artist reviews the proposal where needed.",
    ],
    icon: "spark",
  },
  {
    title: ["بررسی و پرداخت", "Review and payment"],
    desc: [
      "پیشنهاد معتبر و جزئیات مبلغ را بررسی و سپس مسیر پرداخت را دنبال کنید.",
      "Review a valid proposal and its price details before proceeding to payment.",
    ],
    icon: "document",
  },
  {
    title: ["اجرا و بازبینی", "Creation and review"],
    desc: [
      "نسخه اولیه و اصلاحات را در محدوده توافق‌شده سفارش بررسی کنید.",
      "Review the initial version and revisions within the agreed order scope.",
    ],
    icon: "brush",
  },
  {
    title: ["تحویل", "Delivery"],
    desc: [
      "فایل دیجیتال یا اثر فیزیکی را مطابق مشخصات توافق‌شده دریافت کنید.",
      "Receive a digital file or physical artwork according to the agreed specifications.",
    ],
    icon: "box",
  },
]
export const commissionPreparation = [
  [
    "تصویر مرجع مناسب، اگر ایده‌تان به تصویر وابسته است",
    "A suitable reference image, if your idea depends on one",
  ],
  [
    "موضوع و توضیح نتیجه‌ای که انتظار دارید",
    "The subject and the result you have in mind",
  ],
  [
    "سبک یا نمونه مرجع، اگر ترجیحی دارید",
    "A style or reference example, if you have a preference",
  ],
  ["سایز یا کاربرد موردنظر اثر", "Your preferred size or intended use"],
  [
    "ترجیح اجرای دیجیتال یا دستی",
    "A preference for digital or hand-painted work",
  ],
  [
    "جزئیات مهم؛ چهره‌ها، پس‌زمینه یا بخش‌هایی که نباید تغییر کنند",
    "Important details: faces, background, or elements that should not change",
  ],
]
export const commissionFAQs = [
  {
    question: [
      "آیا می‌توانم فقط با توضیح ایده شروع کنم؟",
      "Can I start with an idea rather than a reference image?",
    ],
    answer: [
      "در مسیر نمونه، معرفی ایده در مرحله بعد پیش‌بینی شده است؛ نیاز به تصویر و امکان اجرای ایده باید بر اساس گزینه‌های فعال و بررسی درخواست مشخص شود. پذیرش همه ایده‌ها تضمین نمی‌شود.",
      "The demo flow includes describing an idea in the next step. Whether an image is required and the idea is feasible depends on active options and assessment. Not all ideas are guaranteed to be accepted.",
    ],
  },
  {
    question: [
      "آیا قیمت پیش از پرداخت مشخص می‌شود؟",
      "Will I see the price before payment?",
    ],
    answer: [
      "در فرایند معرفی‌شده، پیشنهاد معتبر و جزئیات مبلغ پیش از تأیید و پرداخت در اختیار شما قرار می‌گیرند. این صفحه قیمت نهایی تولید نمی‌کند.",
      "In the described process, you review a valid proposal and price details before approval and payment. This page does not generate a final price.",
    ],
  },
  {
    question: ["اصلاحات چگونه انجام می‌شوند؟", "How do revisions work?"],
    answer: [
      "تعداد، محدوده و شرایط اصلاحات در توافق همان سفارش مشخص می‌شوند. این نمونه اصلاحات نامحدود یا رایگان وعده نمی‌دهد.",
      "The number, scope and terms of revisions are defined in the order agreement. This demo does not promise unlimited or free revisions.",
    ],
  },
  {
    question: ["چه زمانی اثر آماده می‌شود؟", "When will the artwork be ready?"],
    answer: [
      "برآورد آماده‌سازی و، برای اثر فیزیکی، شرایط حمل باید در پیشنهاد واقعی مشخص شوند. زمان ثابت یا تضمین تحویل در این نمونه ارائه نمی‌شود.",
      "Preparation estimates and, for physical work, delivery conditions must be specified in the actual proposal. No fixed turnaround or delivery guarantee is provided here.",
    ],
  },
  {
    question: ["تصویر من عمومی می‌شود؟", "Will my image be made public?"],
    answer: [
      "سیاست تأییدشده انتشار و نگهداری تصاویر هنوز به این نمونه متصل نیست. ارسال تصویر را رضایت انتشار تلقی نکنید؛ پیش از آپلود، سیاست واقعی حریم خصوصی و مجوز انتشار را بررسی کنید. این صفحه تصویر خصوصی دریافت نمی‌کند.",
      "An approved image-publication and retention policy is not connected to this demo. Do not treat submission as consent to publication; review the actual privacy policy and publication permissions before uploading. This page does not collect private images.",
    ],
  },
  {
    question: [
      "تحویل دیجیتال و فیزیکی چه تفاوتی دارند؟",
      "What is the difference between digital and physical delivery?",
    ],
    answer: [
      "تحویل دیجیتال، فایل نهایی طبق توافق سفارش است. اجرای دستی، اثر فیزیکی با شرایط ارسال همان سفارش است. اجرای دیجیتال الزاماً تولید خودکار AI نیست و فرمت، قاب و اقلام همراه باید در پیشنهاد مشخص شوند.",
      "Digital delivery means a final file under the order agreement. Hand-painted delivery means a physical artwork with order-specific shipping conditions. Digital work is not necessarily automatic AI generation; formats, frames and included items must be specified in the proposal.",
    ],
  },
]
