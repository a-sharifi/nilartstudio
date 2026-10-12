export type ReturnsText = readonly [string, string]
export type ReturnsType = "ready" | "bundle" | "artwork" | "commission" | "digital"
export interface PolicyChecklistItem {
  title: ReturnsText
  detail: ReturnsText
}
export interface ProductPolicy {
  id: ReturnsType
  title: ReturnsText
  intro: ReturnsText
  items: PolicyChecklistItem[]
  note?: ReturnsText
}
export interface ReturnsPolicy {
  demo: boolean
  published: boolean
  version?: string
  updatedAt?: string
  publishedLanguages: readonly ("fa" | "en")[]
  products: ProductPolicy[]
  stageConditions?: PolicyChecklistItem[]
  relatedQuestions?: PolicyChecklistItem[]
  // No deadlines, amounts or eligibility defaults: unavailable conditions stay unavailable.
}
const item = (
  fa: string,
  en: string,
  detailFa: string,
  detailEn: string,
): PolicyChecklistItem => ({
  title: [fa, en],
  detail: [detailFa, detailEn],
})
export const returnsDemoPolicy: ReturnsPolicy = {
  demo: true,
  published: false,
  publishedLanguages: [],
  products: [
    {
      id: "ready",
      title: ["کالای آماده", "Ready-made product"],
      intro: [
        "برای دفتر، استیکر و سایر کالاهای آماده، علت درخواست و مرحله سفارش را جداگانه بررسی کنید.",
        "For notebooks, stickers and other ready-made products, review the request reason and order stage separately.",
      ],
      items: [
        item(
          "لغو پیش از ارسال",
          "Cancellation before dispatch",
          "امکان توقف سفارش در این مرحله باید در سیاست مصوب مشخص شود.",
          "The approved policy must define whether the order can be stopped at this stage.",
        ),
        item(
          "پس از تحویل به شرکت حمل",
          "After carrier handoff",
          "مسیر درخواست پس از ارسال باید از شرایط منتشرشده دریافت شود.",
          "The process after dispatch must come from published conditions.",
        ),
        item(
          "آسیب یا مغایرت",
          "Damage or mismatch",
          "کالای آسیب‌دیده و کالای اشتباه یا مغایر با سفارش، علت‌های جداگانه برای بررسی‌اند.",
          "Damaged goods and incorrect or mismatched items are separate reasons for review.",
        ),
        item(
          "تغییر نظر، بسته‌بندی و استفاده",
          "Change of mind, packaging & use",
          "شرایط تغییر نظر مشتری و اثر وضعیت بسته‌بندی یا استفاده باید در سیاست همان محصول تعیین شود.",
          "The product policy must define change-of-mind conditions and the effect of packaging or use.",
        ),
        item(
          "تعویض و موجودی جایگزین",
          "Exchange & replacement stock",
          "امکان تعویض وابسته به شرایط مصوب و موجودی جایگزین است.",
          "Exchange availability depends on approved conditions and replacement stock.",
        ),
        item(
          "هزینه بازگشت و مهلت درخواست",
          "Return cost & request window",
          "مسئول هزینه و مهلت، فقط اگر تعیین و تأیید شده باشند، منتشر می‌شوند. نبود این اطلاعات به معنی مهلت صفر یا رد درخواست نیست.",
          "Cost responsibility and any request window are published only when defined and approved. Missing information does not mean a zero deadline or automatic rejection.",
        ),
      ],
    },
    {
      id: "bundle",
      title: ["پکیج", "Bundle"],
      intro: [
        "در بررسی پکیج، اجزای خریداری‌شده، گزینه‌های هر جزء و تخفیف ثبت‌شده همان سفارش در نظر گرفته می‌شوند.",
        "Bundle review considers the purchased components, each component's selected options and the discount recorded in that order.",
      ],
      items: [
        item(
          "کل پکیج یا بخشی از آن",
          "Whole or partial bundle",
          "بازگشت جزئی فقط در صورت اجازه سیاست مصوب بررسی می‌شود؛ در این نمونه مجاز یا ممنوع اعلام نشده است.",
          "Partial returns are considered only if the approved policy permits them; this sample does not declare them allowed or prohibited.",
        ),
        item(
          "آسیب یا مغایرت یک جزء",
          "Damage or mismatch in one component",
          "جزء مرتبط، گزینه انتخاب‌شده و مسئله همان جزء باید در درخواست خصوصی مشخص شوند.",
          "Identify the relevant component, selected option and issue in the private request.",
        ),
        item(
          "جایگزینی جزء",
          "Replacing a component",
          "امکان جایگزینی باید با سیاست مربوط و موجودی همان جزء بررسی شود.",
          "Replacement must be checked against the applicable policy and that component's stock.",
        ),
        item(
          "تخفیف تاریخی سفارش",
          "Historical order discount",
          "تخفیف پکیج به نسبت قیمت اقلام در سفارش تخصیص داده می‌شود؛ مبنای بررسی، مبالغ و تخفیف‌های همان خرید است، نه قیمت روز.",
          "The bundle discount is allocated proportionally to item prices in the order; review uses that purchase's amounts and discounts, not current prices.",
        ),
      ],
      note: [
        "مبلغ قابل بازپرداخت بر اساس اقلام تأییدشده و تخفیف‌های ثبت‌شده در سفارش محاسبه می‌شود. این صفحه مبلغ سفارش خاصی را محاسبه نمی‌کند.",
        "The refundable amount is calculated using the approved items and discounts recorded in your order. This page does not calculate a specific order's amount.",
      ],
    },
    {
      id: "artwork",
      title: ["نقاشی آماده", "Original artwork"],
      intro: [
        "برای اثر آماده با موجودی محدود، وضعیت اثر و امکان جایگزینی باید جداگانه بررسی شوند.",
        "For an original artwork with limited stock, the artwork's condition and replacement availability need separate review.",
      ],
      items: [
        item(
          "پیش از ارسال",
          "Before dispatch",
          "شرایط درخواست با توجه به وضعیت سفارش و سیاست اثر بررسی می‌شود.",
          "Review the request in light of the order status and artwork policy.",
        ),
        item(
          "بسته‌بندی محافظ و آسیب حمل",
          "Protective packaging & transit damage",
          "مدارک موردنیاز درباره بسته‌بندی و آسیب حمل باید در مسیر خصوصی اعلام شوند.",
          "Required evidence about protective packaging and transit damage must be specified in the private process.",
        ),
        item(
          "مغایرت و مدارک اصالت",
          "Mismatch & authenticity documents",
          "مغایرت اثر با سفارش و مدارک اصالت، در صورت وجود، موضوع بررسی‌اند؛ مدارک خصوصی اینجا نمایش داده نمی‌شوند.",
          "Artwork mismatch and authenticity documents, where present, are reviewed; private documents are not shown here.",
        ),
        item(
          "اثر بازگشتی و تعویض",
          "Returned artwork & exchange",
          "شیوه بررسی وضعیت اثر و موجودی جایگزین باید از سیاست مصوب دریافت شود؛ تعویض فوری وعده داده نمی‌شود.",
          "The review method and replacement availability must come from the approved policy; immediate exchange is not promised.",
        ),
      ],
    },
    {
      id: "commission",
      title: ["نقاشی سفارشی", "Custom artwork"],
      intro: [
        "شرایط سفارش سفارشی به مرحله اجرا و توافق ثبت‌شده برای همان سفارش بستگی دارد.",
        "Custom order conditions depend on the production stage and the agreement recorded for that order.",
      ],
      items: [
        item(
          "در انتظار بررسی و تأیید پیشنهاد",
          "Awaiting review & proposal approval",
          "شرایط تغییر درخواست یا توقف بررسی باید در توافق و سیاست مرتبط مشخص شوند.",
          "The agreement and applicable policy must define changes to the request or stopping the review.",
        ),
        item(
          "تأیید قیمت و ثبت سفارش",
          "Quote acceptance & order placement",
          "نسخه توافق و شرایط ثبت‌شده همان سفارش مرجع بررسی‌اند.",
          "The agreement version and conditions recorded for that order are the review reference.",
        ),
        item(
          "پیش از شروع اجرا",
          "Before work starts",
          "شرایط لغو یا تغییر پیش از اجرا باید از توافق ثبت‌شده دریافت شوند.",
          "Cancellation or changes before work starts must follow the recorded agreement.",
        ),
        item(
          "در حال اجرا",
          "Work in progress",
          "دامنه تغییرات و شرایط درخواست در این مرحله نیازمند بررسی همان سفارش‌اند.",
          "The scope of changes and request conditions at this stage require review of that order.",
        ),
        item(
          "نسخه اولیه آماده",
          "First version ready",
          "مشاهده و بررسی نسخه اولیه در حساب کاربری انجام می‌شود؛ فایل خصوصی اینجا نمایش داده نمی‌شود.",
          "View and review the first version in your account; private files are not shown here.",
        ),
        item(
          "اصلاحات",
          "Revisions",
          "اصلاح هنری با مرجوعی کالا متفاوت است. تعداد، دامنه و هزینه احتمالی اصلاحات از توافق همان سفارش می‌آیند.",
          "Artistic revision is different from returning a product. Revision count, scope and any cost come from that order's agreement.",
        ),
        item(
          "تحویل نهایی",
          "Final delivery",
          "شرایط بررسی مشکل پس از تحویل باید بر اساس توافق و سیاست مرتبط بررسی شوند.",
          "Issues after final delivery must be reviewed under the applicable agreement and policy.",
        ),
      ],
      note: [
        "قیمت‌گذاری AI یا بررسی هنرمند به‌تنهایی تضمین پذیرش یا رد درخواست نیست.",
        "AI pricing or artist review alone does not guarantee approval or rejection of a request.",
      ],
    },
    {
      id: "digital",
      title: ["فایل دیجیتال", "Digital file"],
      intro: [
        "برای مشکل دسترسی یا فایل تحویلی، از بخش سفارش خود با پشتیبانی تماس بگیرید.",
        "For access or delivery-file issues, contact support from your order.",
      ],
      items: [
        item(
          "آماده‌شدن فایل",
          "File readiness",
          "آماده‌بودن فایل باید از وضعیت واقعی سفارش مشخص شود.",
          "File readiness must be determined from the actual order status.",
        ),
        item(
          "فعال‌شدن دسترسی و دانلود",
          "Access activation & download",
          "شرایط مربوط به دسترسی و دانلود باید از سیاست مصوب دریافت شوند؛ دانلود خودکار به معنی پذیرش نهایی یا سلب همه حقوق نیست.",
          "Access and download conditions must come from the approved policy; downloading does not automatically mean final acceptance or loss of all rights.",
        ),
        item(
          "مشکل دسترسی یا خرابی فایل",
          "Access issues or a faulty file",
          "شرح مشکل و مدارک لازم فقط در مسیر خصوصی سفارش دریافت می‌شوند.",
          "The issue description and any required evidence are collected only in the private order flow.",
        ),
        item(
          "مغایرت فایل و درخواست مرتبط",
          "File mismatch & related requests",
          "شرایط بررسی فایل مغایر یا درخواست مرتبط باید برای همان محصول دیجیتال مشخص شوند.",
          "Conditions for reviewing a mismatched file or related request must be defined for that digital product.",
        ),
      ],
    },
  ],
}
export const returnsConcepts = [
  {
    id: "cancel",
    title: ["لغو سفارش", "Order cancellation"] as ReturnsText,
    description: [
      "درخواست توقف سفارش؛ نتیجه به مرحله سفارش و شرایط آن بستگی دارد.",
      "A request to stop an order, subject to its stage and applicable conditions.",
    ] as ReturnsText,
  },
  {
    id: "return",
    title: ["مرجوعی", "Return"] as ReturnsText,
    description: [
      "درخواست بازگرداندن کالا برای بررسی طبق شرایط مربوط به همان محصول.",
      "A request to send an item back for review under its applicable conditions.",
    ] as ReturnsText,
  },
  {
    id: "exchange",
    title: ["تعویض", "Exchange"] as ReturnsText,
    description: [
      "درخواست جایگزینی کالا، در صورت امکان و طبق سیاست تأییدشده.",
      "A request for a replacement, where available under the approved policy.",
    ] as ReturnsText,
  },
  {
    id: "refund",
    title: ["بازپرداخت", "Refund"] as ReturnsText,
    description: [
      "بازگشت مبلغ تأییدشده پس از طی مراحل مربوط؛ ثبت درخواست به معنی انجام بازپرداخت نیست.",
      "The return of an approved amount after the required steps. Submitting a request does not mean a refund is complete.",
    ] as ReturnsText,
  },
]
export const returnsSections = [
  ["concepts", "چهار مفهوم متفاوت", "Four different concepts"],
  ["product", "نوع سفارش و شرایط آن", "Product type & conditions"],
  ["stage", "مرحله سفارش", "Order stage"],
  ["request", "مسیر درخواست", "Request process"],
  ["documents", "اطلاعات موردنیاز", "What you'll need"],
  ["packing", "بازگرداندن کالا", "Sending an item back"],
  ["refunds", "هزینه و بازپرداخت", "Costs & refunds"],
  ["questions", "سؤالات مرتبط", "Related questions"],
  ["help", "اقدام و پشتیبانی", "Next steps & support"],
] as const
export const returnsStages: PolicyChecklistItem[] = [
  item(
    "پیش از تأیید پرداخت",
    "Before payment confirmation",
    "ابتدا نتیجه پرداخت بررسی شود. تا مشخص‌شدن نتیجه، دوباره پرداخت نکنید.",
    "Check the payment result first. Do not pay again until it is confirmed.",
  ),
  item(
    "پرداخت تأییدشده",
    "Payment confirmed",
    "تأیید پرداخت با ارسال سفارش، پذیرش درخواست یا بازپرداخت متفاوت است. شرایط مرحله فعلی را بررسی کنید.",
    "Payment confirmation is separate from shipping, request approval or refund. Review the conditions for the current stage.",
  ),
  item(
    "آماده‌سازی یا اجرا",
    "Preparation or production",
    "کالای آماده و اجرای نقاشی سفارشی مسیرهای متفاوتی دارند؛ شرایط همان قلم و توافق سفارش را بررسی کنید.",
    "Ready products and commissioned artwork follow different paths; review the item's conditions and order agreement.",
  ),
  item(
    "تحویل به شرکت حمل",
    "Handed to the carrier",
    "وضعیت ارسال و شرایط درخواست پس از ارسال را جداگانه بررسی کنید. برای بازگشت، منتظر دستور معتبر باشید.",
    "Check shipping status and post-dispatch request conditions separately. Wait for valid return instructions.",
  ),
  item(
    "تحویل به مشتری",
    "Delivered to the customer",
    "علت درخواست، وضعیت قلم و شرایط منتشرشده مربوط به همان محصول باید بررسی شوند.",
    "Review the request reason, item's condition and published conditions for that product.",
  ),
  item(
    "درخواست در حال بررسی",
    "Request under review",
    "ثبت درخواست، دریافت کالا، تأیید سلامت و بازپرداخت مراحل مستقل‌اند. نتیجه را از جزئیات درخواست پیگیری کنید.",
    "Request submission, receipt, condition approval and refund are separate steps. Track the outcome in your request details.",
  ),
]
export const returnsRequestSteps: ReturnsText[] = [
  ["ورود به حساب و انتخاب سفارش", "Sign in and select your order"],
  ["انتخاب قلم یا اقلام مرتبط", "Select the relevant items"],
  [
    "انتخاب نوع درخواست و ثبت توضیح",
    "Choose a request type and describe the issue",
  ],
  ["افزودن مدارک موردنیاز، در صورت درخواست", "Add evidence, if requested"],
  ["بررسی درخواست توسط تیم", "The team reviews your request"],
  [
    "دریافت دستور بازگشت، در صورت تأیید و نیاز",
    "Receive return instructions, if approved and needed",
  ],
  ["دریافت و بررسی کالا", "The item is received and inspected"],
  [
    "اعلام نتیجه و اقدام مالی یا جایگزینی",
    "Receive the outcome and financial or replacement action",
  ],
]
export const returnsDocuments: ReturnsText[] = [
  ["شماره سفارش", "Order number"],
  ["قلم یا اقلام مرتبط", "Relevant items"],
  [
    "گزینه محصول، مانند سایز و نوع جلد",
    "Product options, such as size and cover",
  ],
  ["تعداد مورد درخواست", "Requested quantity"],
  ["شرح مسئله", "Issue description"],
  ["تصاویر مرتبط، در صورت نیاز", "Relevant images, if needed"],
  [
    "اطلاعات بسته‌بندی یا مرسوله، در صورت نیاز",
    "Packaging or shipment information, if needed",
  ],
]
export const returnsQuestions: PolicyChecklistItem[] = [
  item(
    "آیا می‌توانم فقط یک قلم سفارش را مرجوع کنم؟",
    "Can I return just one item from my order?",
    "پاسخ به نوع محصول و سیاست مربوط بستگی دارد؛ برای پکیج، اجازه بازگشت جزئی نیز باید بررسی شود. شرایط قطعی این موضوع هنوز در این نمونه منتشر نشده است.",
    "This depends on the product type and applicable policy; bundles also require checking partial-return permission. Definitive conditions are not published in this sample.",
  ),
  item(
    "تخفیف پکیج چه اثری بر مبلغ بازپرداخت دارد؟",
    "How does a bundle discount affect the refund amount?",
    "مبلغ قابل بازپرداخت بر اساس اقلام تأییدشده و تخفیف‌های ثبت‌شده در سفارش محاسبه می‌شود، نه قیمت روز. این توضیح، مبلغ قطعی یا تأیید بازپرداخت نیست.",
    "The refundable amount uses approved items and discounts recorded in the order, not current prices. This explanation is not an exact amount or refund approval.",
  ),
  item(
    "برای کالای آسیب‌دیده چه اطلاعاتی لازم است؟",
    "What information is needed for a damaged item?",
    "شماره سفارش، قلم مرتبط و شرح مسئله را آماده کنید. تصاویر و اطلاعات بسته‌بندی فقط در صورت نیاز و در مسیر خصوصی دریافت می‌شوند؛ مدارک نهایی از شرایط مصوب می‌آیند.",
    "Prepare the order number, relevant item and issue description. Images and packaging details are collected only if needed in the private flow; final evidence requirements come from approved conditions.",
  ),
  item(
    "آیا اصلاح نقاشی سفارشی همان مرجوعی است؟",
    "Is a custom artwork revision the same as a return?",
    "خیر؛ اصلاح هنری با مرجوعی کالا متفاوت است. تعداد اصلاحات، دامنه تغییر و هزینه احتمالی باید از توافق ثبت‌شده همان سفارش دریافت شوند.",
    "No; artistic revision is different from returning a product. Revision count, scope of changes and any cost must come from that order's recorded agreement.",
  ),
  item(
    "از کجا وضعیت درخواست را ببینم؟",
    "Where can I check my request status?",
    "جزئیات درخواست را در مسیر خصوصی سفارش پیگیری کنید. اگر به حساب دسترسی ندارید، با پشتیبانی تماس بگیرید. تأیید تلفن در پیگیری مهمان، مجوز تغییر درخواست مرجوعی نیست.",
    "Track request details through the private order flow. Contact support if you cannot access your account. Phone verification in guest tracking does not authorize changes to a return request.",
  ),
]
export function isReturnsRoute(route: string) {
  return ["/returns", "/returns-policy", "/fa/returns", "/en/returns"].includes(
    route.split(/[?#]/)[0],
  )
}
export function returnsOrdersRoute(signedIn: boolean) {
  return signedIn ? "/account/orders" : "/login?returnTo=%2Faccount%2Forders"
}
