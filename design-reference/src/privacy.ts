export type PrivacyText = readonly [string, string]
export interface PrivacyDetail {
  title: PrivacyText
  description: PrivacyText
}
export interface PrivacySection {
  id: string
  title: PrivacyText
  paragraphs: PrivacyText[]
  points?: PrivacyText[]
  details?: PrivacyDetail[]
  summary?: PrivacyText
  notice?: PrivacyText
}
export interface PrivacyAccess {
  id: string
  role: PrivacyText
  purpose: PrivacyText
  information: PrivacyText
  condition: PrivacyText
  active: boolean
  approved: boolean
}
export interface PrivacyAction {
  label: PrivacyText
  route: string
  active: boolean
  approved: boolean
}
export interface PrivacyDocument {
  demo: boolean
  approved: boolean
  published: boolean
  languages: readonly ("fa" | "en")[]
  version?: string
  publishedAt?: string
  updatedAt?: string
  sourceState: "current" | "cached" | "previous"
  currentVersionRoute?: string
  title: PrivacyText
  introduction: PrivacyText
  sections: PrivacySection[]
  access: PrivacyAccess[]
  actions: PrivacyAction[]
  changeSummary?: PrivacyText[]
}
const detail = (
  fa: string,
  en: string,
  bodyFa: string,
  bodyEn: string,
): PrivacyDetail => ({
  title: [fa, en],
  description: [bodyFa, bodyEn],
})
// Educational sample from the supplied brief, never an approved legal policy.
export const privacyDemoDocument: PrivacyDocument = {
  demo: true,
  approved: false,
  published: false,
  languages: ["fa", "en"],
  sourceState: "current",
  title: ["حریم خصوصی و اطلاعات شما", "Privacy and your information"],
  introduction: [
    "در این صفحه، نحوه دریافت و استفاده از اطلاعات در خدمات نیل‌آرت توضیح داده می‌شود.",
    "This page explains how information is collected and used across Nilart’s services.",
  ],
  sections: [
    {
      id: "scope",
      title: ["دامنه سیاست", "Policy scope"],
      paragraphs: [
        [
          "این صفحه جایگاه توضیح سیاست اطلاعات در خرید محصولات آماده، پکیج، نقاشی آماده، سفارش نقاشی سفارشی و دریافت فایل دیجیتال مرتبط است. محتوای فعلی نمونه طراحی است، نه سیاست منتشرشده.",
          "This page provides a place to explain information practices for ready-made products, bundles, original artworks, commissions and related digital delivery. Current content is a design sample, not a published policy.",
        ],
        [
          "اطلاعات عمومی فروشگاه با اطلاعات خصوصی حساب، سفارش و فایل‌های مشتری متفاوت است. دسته‌های اطلاعات، هدف استفاده و شرایط دسترسی باید بر اساس عملکرد واقعی و سیاست تأییدشده تکمیل شوند.",
          "Public shop information differs from private account details, orders and customer files. Information categories, purposes and access conditions must be completed from actual operations and approved policy.",
        ],
      ],
    },
    {
      id: "account",
      title: ["اطلاعات حساب و تماس", "Account & contact information"],
      paragraphs: [
        [
          "ثبت‌نام محصول با تلفن، تأیید کد یک‌بارمصرف و ساخت رمز انجام می‌شود؛ ورود با تلفن و رمز یا تلفن و کد یک‌بارمصرف امکان‌پذیر است. شیوه ذخیره اطلاعات احراز هویت فقط پس از تأیید فنی توضیح داده می‌شود.",
          "Product registration uses a phone number, one-time verification and a password; sign-in supports phone and password or a one-time code. Authentication storage practices are described only after technical confirmation.",
        ],
      ],
      summary: [
        "دسته‌های حساب، تماس و سفارش را با هدف استفاده هرکدام بررسی کنید.",
        "Review account, contact and order categories alongside each purpose.",
      ],
      details: [
        detail(
          "شماره تلفن",
          "Phone number",
          "هدف احراز هویت، تماس مرتبط یا ارجاع سفارش باید در سیاست واقعی مشخص شود.",
          "The actual policy must define authentication, related contact or order-reference purposes.",
        ),
        detail(
          "نام، پروفایل و ایمیل",
          "Name, profile & email",
          "اطلاعاتی که واقعاً دریافت می‌شوند و هدف پاسخ‌گویی یا استفاده از پروفایل باید مشخص باشند.",
          "Specify which details are actually collected and their reply or profile purposes.",
        ),
        detail(
          "زبان و ترجیحات اعلان",
          "Language & notification preferences",
          "توضیح ذخیره ترجیحات و اثر آن‌ها باید مطابق قابلیت فعال باشد.",
          "Explain preference storage and effects according to enabled functionality.",
        ),
        detail(
          "احراز هویت و نشست",
          "Authentication & session",
          "دسته داده و هدف دسترسی حساب باید بررسی فنی شوند؛ جزئیات داخلی امنیت منتشر نمی‌شوند.",
          "Account-access data categories and purposes require technical review; internal security details are not published.",
        ),
        detail(
          "تماس و پشتیبانی",
          "Contact & support messages",
          "هدف بررسی پیام، پاسخ و ارتباط با درخواست باید از فرایند مصوب دریافت شود.",
          "Message review, response and request-linking purposes must come from the approved process.",
        ),
      ],
      notice: [
        "رمز عبور و کد تأیید را در پیام عمومی یا برای پشتیبانی ارسال نکنید.",
        "Do not send passwords or verification codes in public messages or to support.",
      ],
    },
    {
      id: "orders",
      title: ["اطلاعات سفارش و پرداخت", "Order & payment information"],
      paragraphs: [
        [
          "این بخش فقط دسته‌های اطلاعات را توضیح می‌دهد؛ اقلام، مبالغ، آدرس یا وضعیت سفارش شخصی در این صفحه نمایش داده نمی‌شوند.",
          "This section explains information categories only; personal items, amounts, addresses and order status are not displayed on this page.",
        ],
        [
          "نقش درگاه، داده‌های قابل دریافت و هرگونه ذخیره‌سازی اطلاعات پرداخت باید مطابق اتصال واقعی بررسی شود. دریافت یا عدم ذخیره اطلاعات کامل کارت، بدون تأیید فنی ادعا نمی‌شود.",
          "The gateway's role, available data and any payment-data storage must be reviewed against the actual integration. Collection or non-storage of full card details is not claimed without technical confirmation.",
        ],
      ],
      details: [
        detail(
          "اقلام، گزینه‌ها، تعداد و مبالغ",
          "Items, options, quantities & amounts",
          "هدف ثبت خرید و مبالغ و تخفیف‌های تاریخی باید در سیاست منتشرشده توضیح داده شود.",
          "The published policy must explain purchase records and historical amounts and discounts.",
        ),
        detail(
          "آدرس، گیرنده و وضعیت ارسال",
          "Address, recipient & shipping status",
          "داده لازم برای تحویل و پیگیری باید با نقش دریافت‌کننده و شرایط آن مشخص شود.",
          "Identify data needed for delivery and tracking alongside the recipient role and conditions.",
        ),
        detail(
          "شناسه‌ها و وضعیت پرداخت",
          "Payment identifiers & status",
          "داده تراکنش موردنیاز برای بررسی پرداخت و مسیر بازپرداخت باید تأیید شود.",
          "Confirm transaction data needed for payment review and the refund process.",
        ),
        detail(
          "لغو، مرجوعی و مکاتبات",
          "Cancellation, returns & correspondence",
          "هدف رسیدگی به درخواست و مکاتبات مرتبط باید از فرایند واقعی دریافت شود.",
          "Request-handling and related correspondence purposes must reflect the actual process.",
        ),
      ],
    },
    {
      id: "files",
      title: ["تصاویر، توضیحات و فایل‌ها", "Images, descriptions & files"],
      paragraphs: [
        [
          "تصویر مرجع و فایل‌های سفارش با تصاویر عمومی فروشگاه یکسان نیستند.",
          "Reference images and order files are different from public shop images.",
        ],
        [
          "ارسال تصویر در رابط نباید به معنی رضایت برای انتشار عمومی، تبلیغات یا آموزش مدل تلقی شود. اگر نمایش نمونه‌کار قابلیت واقعی است، شرایط و رضایت آن باید جدا و مطابق سیاست مصوب باشد.",
          "Submitting an image must not be treated in the interface as consent to publication, advertising or model training. If portfolio display is an actual feature, its conditions and consent must be separate and approved.",
        ],
      ],
      summary: [
        "تصویر مرجع، فایل سفارش و تصویر عمومی، دسته‌های جداگانه‌اند.",
        "Reference images, order files and public images are separate categories.",
      ],
      details: [
        detail(
          "تصویر مرجع مشتری",
          "Customer reference image",
          "با تصویر عمومی فروشگاه یکی نیست؛ شرایط استفاده و دسترسی نیازمند تأیید است.",
          "Not a public shop image; use and access conditions require approval.",
        ),
        detail(
          "توضیح و Prompt",
          "Description & prompt",
          "داده مربوط به درخواست هنری است؛ هدف ارسال برای بررسی باید روشن شود.",
          "Relates to the artistic request; the purpose of review transmission must be explicit.",
        ),
        detail(
          "نسخه اولیه، اصلاحات و پیام‌ها",
          "First version, revisions & messages",
          "محتوای مرتبط با فرایند سفارش؛ مجوز دسترسی و انتشار آن باید جدا بررسی شود.",
          "Order-process content; access and publication permissions need separate review.",
        ),
        detail(
          "فایل نهایی",
          "Final file",
          "تحویل مرتبط با سفارش است؛ با تصویر عمومی نمونه‌کار اشتباه نشود.",
          "An order-related delivery; do not confuse it with a public portfolio image.",
        ),
        detail(
          "تصویر عمومی نمونه‌کار",
          "Public portfolio image",
          "نمایش عمومی تنها طبق قابلیت، شرایط و مجوزهای تأییدشده توضیح داده می‌شود.",
          "Describe public display only under confirmed functionality, conditions and permissions.",
        ),
        detail(
          "فایل تولید یا چاپ",
          "Production or print file",
          "فایل موردنیاز تولید با تصویر عمومی و تصویر مرجع مشتری متفاوت است.",
          "A production file differs from a public image and the customer's reference image.",
        ),
      ],
    },
    {
      id: "ai",
      title: ["تحلیل AI و بررسی هنرمند", "AI analysis & artist review"],
      paragraphs: [
        [
          "تحلیل AI و بررسی هنرمند بخشی از مسیر سفارش سفارشی هستند؛ AI جایگزین کامل بررسی انسانی معرفی نمی‌شود.",
          "AI analysis and artist review are parts of the commission journey; AI is not presented as a complete replacement for human review.",
        ],
        [
          "نام سرویس، محل پردازش، استفاده آموزشی و مدت نگهداری هنوز در این نمونه تأیید نشده‌اند. اطلاعات ناقص نباید به‌عنوان سیاست واقعی منتشر شود.",
          "Service names, processing location, training use and retention are not confirmed in this sample. Incomplete information must not be published as real policy.",
        ],
      ],
      notice: [
        "نیازمند بررسی فنی و تأیید سیاست",
        "Technical review and policy approval required",
      ],
      points: [
        [
          "چه داده‌ای برای تحلیل ارسال می‌شود و هدف آن چیست؟",
          "What data is sent for analysis, and why?",
        ],
        [
          "آیا سرویس خارجی درگیر است و چه نقش‌هایی دسترسی دارند؟",
          "Is an external service involved, and which roles have access?",
        ],
        [
          "شرایط نگهداری یا حذف نزد سرویس مرتبط چیست؟",
          "What are the related service's retention or deletion conditions?",
        ],
        [
          "آیا استفاده آموزشی مطرح است و سیاست واقعی آن چیست؟",
          "Is training use involved, and what is the actual policy?",
        ],
      ],
    },
    {
      id: "access",
      title: ["دسترسی و سرویس‌های مرتبط", "Access & related services"],
      paragraphs: [
        [
          "همه نقش‌ها به همه اطلاعات نیاز ندارند. موارد زیر دسته‌های بررسی نمونه‌اند، نه فهرست تأییدشده سرویس‌های فعال؛ هدف، اطلاعات لازم و شرایط هر نقش باید جدا مشخص شوند.",
          "Not all roles need all information. The entries below are sample review categories, not a confirmed list of active services; define each role's purpose, needed data and conditions separately.",
        ],
      ],
      summary: [
        "نقش‌ها و سرویس‌های واقعی را با هدف و دسته داده موردنیاز بررسی کنید.",
        "Review actual roles and services alongside their purpose and required data categories.",
      ],
    },
    {
      id: "communications",
      title: ["اعلان‌ها و ارتباطات", "Notifications & communications"],
      paragraphs: [
        [
          "اعلان‌های خدماتی مانند کد تأیید، پرداخت، سفارش، ارسال، درخواست اصلاح و پشتیبانی، از ارتباطات بازاریابی جدا هستند.",
          "Service messages such as verification codes, payments, orders, delivery, revision requests and support are separate from marketing communications.",
        ],
        [
          "خبرنامه و پیشنهادها فقط اگر قابلیت آن‌ها فعال است توضیح داده می‌شوند. عضویت بازاریابی نباید با سفارش، تماس یا شرایط خرید ادغام شود.",
          "Newsletters and offers are described only when enabled. Marketing subscription must not be combined with orders, contact or purchase terms.",
        ],
        [
          "اثر تغییر ترجیحات بر پیام‌های ضروری باید از رفتار واقعی محصول توضیح داده شود؛ در این نمونه کنترل مدیریت اعلان فعال فرض نشده است.",
          "Explain the effect of preference changes on essential messages from actual behavior; this sample does not assume active notification controls.",
        ],
      ],
    },
    {
      id: "technical",
      title: ["کوکی‌ها و داده‌های فنی", "Cookies & technical data"],
      paragraphs: [
        [
          "این بخش باید مطابق فناوری‌های واقعاً استفاده‌شده تکمیل شود. هدف، نوع داده و شرایط مدیریت هر ابزار نیازمند بررسی فنی است.",
          "Complete this section from technology actually in use. Each tool's purpose, data type and management conditions require technical review.",
        ],
        [
          "در این نمونه بنر رضایت، «رد همه» یا کنترل ترجیحات بی‌عملکرد ساخته نشده است. ابزار تحلیل و بازاریابی، تا زمان تأیید فعال‌بودن، قابلیت موجود معرفی نمی‌شود.",
          "No consent banner, 'reject all' button or non-functional preference controls are created in this sample. Analytics and marketing tools are not presented as enabled before confirmation.",
        ],
      ],
      points: [
        [
          "موارد نیازمند بررسی: نشست و ورود، سبد، زبان، داده خطا و امنیت.",
          "Review items: session and sign-in, cart, language, error and security data.",
        ],
        [
          "تحلیل استفاده و ابزار بازاریابی فقط در صورت فعال‌بودن و سیاست مصوب.",
          "Usage analytics and marketing tools only when enabled and covered by approved policy.",
        ],
      ],
    },
    {
      id: "retention",
      title: ["نگهداری و حذف اطلاعات", "Retention & deletion"],
      paragraphs: [
        [
          "شرایط نگهداری و رسیدگی به درخواست حذف برای دسته‌های مختلف اطلاعات ممکن است متفاوت باشد.",
          "Retention and deletion handling may differ across information categories.",
        ],
        [
          "غیرفعال‌کردن حساب، درخواست حذف، حذف برخی فایل‌ها و نگهداری احتمالی سوابق سفارش یا پیگیری باید جدا توضیح داده شوند. حذف حساب به معنی حذف فوری همه سوابق مالی و سفارش معرفی نمی‌شود.",
          "Explain account deactivation, deletion requests, removing some files and possible retention of order or tracking records separately. Account deletion is not presented as immediate deletion of every financial and order record.",
        ],
        [
          "مدت نگهداری و نتیجه درخواست باید از سیاست واقعی و فرایند تعریف‌شده دریافت شوند؛ در این نمونه زمان مشخص یا دکمه حذف فوری وجود ندارد.",
          "Retention periods and request outcomes must come from real policy and a defined process; this sample sets no period or immediate-deletion button.",
        ],
      ],
    },
    {
      id: "security",
      title: ["امنیت و دسترسی حساب", "Security & account access"],
      paragraphs: [
        [
          "رمز عبور و کد تأیید را با دیگران به اشتراک نگذارید.",
          "Do not share your password or verification codes.",
        ],
        [
          "برای بررسی سفارش از مسیرهای رسمی سایت استفاده کنید.",
          "Use the website’s official channels to check your order.",
        ],
        [
          "این توصیه‌ها تضمین امنیت یا مدرک استاندارد و گواهی نیستند. جزئیات داخلی امنیت، لاگ‌ها و نشست دیگران در محتوای عمومی نمایش داده نمی‌شوند.",
          "These recommendations are not security guarantees or certification evidence. Internal security details, logs and other people's sessions are not displayed as public content.",
        ],
      ],
    },
    {
      id: "requests",
      title: ["تنظیمات و درخواست‌ها", "Settings & requests"],
      paragraphs: [
        [
          "مشاهده یا ویرایش پروفایل، تنظیمات اعلان و امنیت فقط در صورت وجود مسیر فعال نمایش داده می‌شوند. در این نسخه مقصد تأییدشده‌ای برای این تنظیمات ارائه نشده است.",
          "Profile viewing or editing, notification and security settings are shown only when active routes exist. No verified destination for these settings has been supplied in this version.",
        ],
        [
          "مسیر تماس می‌تواند برای بررسی پرسش یا درخواست مرتبط استفاده شود؛ ثبت پیام به معنی اجرای فوری درخواست نیست. دسترسی، اصلاح، دریافت نسخه یا حذف داده فقط با فرایند تعریف و تأییدشده توضیح داده می‌شوند.",
          "Contact can be used to review a related question or request; submitting a message does not mean immediate execution. Access, correction, copies or deletion are described only through defined, approved processes.",
        ],
        [
          "پیش از ارائه اطلاعات خصوصی یا تغییر داده، ممکن است تأیید هویت لازم باشد. شماره سفارش یا پیام عمومی به‌تنهایی مجوز دسترسی نیست؛ مدارک حساس غیرضروری پیش‌فرض دریافت نمی‌شوند.",
          "Identity verification may be needed before providing private information or changing data. An order number or public message alone is not authorization; unnecessary sensitive documents are not requested by default.",
        ],
      ],
      summary: [
        "تنظیمات فعال و مسیر تماس را ببینید؛ درخواست به معنی اقدام فوری نیست.",
        "Use active settings and contact paths; a request does not mean immediate action.",
      ],
    },
    {
      id: "changes",
      title: ["تغییرات سیاست", "Policy changes"],
      paragraphs: [
        [
          "نسخه، تاریخ انتشار و آخرین به‌روزرسانی تنها از محتوای واقعی منتشرشده نمایش داده می‌شوند. تاریخ، نسخه پیشین یا خلاصه تغییرات فرضی ساخته نشده است.",
          "Version, publication date and last update are shown only from actual published content. No invented dates, previous versions or change summaries are created.",
        ],
        [
          "مطالعه این صفحه به معنی رضایت جدید یا پذیرش همه استفاده‌های اختیاری نیست. رضایت مربوط به کاربرد مشخص باید در همان جریان و جدا از خرید و بازاریابی دریافت شود، اگر فرایند واقعی آن را لازم می‌داند.",
          "Reading this page does not record new consent or accept every optional use. Consent for a specific use belongs in that flow, separately from purchasing and marketing, where the actual process requires it.",
        ],
      ],
    },
    {
      id: "contact",
      title: ["تماس درباره حریم خصوصی", "Privacy contact"],
      paragraphs: [
        [
          "برای پرسش درباره اطلاعات خود از مسیر تماس عمومی استفاده کنید. در پیام عمومی رمز، کد تأیید، اطلاعات بانکی یا فایل خصوصی ارسال نکنید.",
          "Use the public contact route for questions about your information. Do not send passwords, verification codes, banking details or private files in public messages.",
        ],
        [
          "بررسی درخواست و هر اقدام مرتبط مطابق فرایند واقعی انجام می‌شود؛ ارسال پیام، تأیید هویت یا تضمین نتیجه نیست.",
          "Request review and related actions follow the actual process; sending a message is not identity verification or a guaranteed outcome.",
        ],
      ],
    },
  ],
  access: [
    {
      id: "support",
      role: ["تیم پشتیبانی", "Support team"],
      purpose: ["بررسی پیام و مسئله سفارش", "Review messages and order issues"],
      information: [
        "دسته‌های مرتبط با همان درخواست",
        "Categories related to that request",
      ],
      condition: [
        "دامنه دسترسی و شرایط باید تأیید شوند.",
        "Access scope and conditions require approval.",
      ],
      active: false,
      approved: false,
    },
    {
      id: "artist",
      role: ["هنرمند تخصیص‌یافته", "Assigned artist"],
      purpose: [
        "بررسی و اجرای سفارش سفارشی",
        "Review and execute a commission",
      ],
      information: [
        "مرجع و توضیح مرتبط با سفارش",
        "Relevant order reference and description",
      ],
      condition: [
        "نقش و مجوز همان سفارش باید مشخص شوند.",
        "Define the role and permissions for that order.",
      ],
      active: false,
      approved: false,
    },
    {
      id: "carrier",
      role: ["شرکت حمل", "Carrier"],
      purpose: ["تحویل مرسوله", "Deliver a parcel"],
      information: ["اطلاعات لازم تحویل", "Required delivery information"],
      condition: [
        "اتصال و دسته داده باید تأیید شوند.",
        "Confirm the integration and data categories.",
      ],
      active: false,
      approved: false,
    },
    {
      id: "gateway",
      role: ["درگاه پرداخت", "Payment gateway"],
      purpose: ["پردازش و بررسی پرداخت", "Process and verify payment"],
      information: [
        "داده تراکنش مطابق اتصال واقعی",
        "Transaction data according to the actual integration",
      ],
      condition: [
        "دریافت و ذخیره داده کارت فرض نمی‌شود.",
        "Card-data receipt or storage is not assumed.",
      ],
      active: false,
      approved: false,
    },
    {
      id: "print",
      role: ["تأمین‌کننده چاپ", "Print provider"],
      purpose: [
        "تولید مرتبط، فقط در صورت استفاده",
        "Related production, only if used",
      ],
      information: [
        "فایل تولید مرتبط، نه الزاماً تصویر مرجع",
        "Relevant production file, not necessarily the reference image",
      ],
      condition: [
        "فعال‌بودن سرویس و فایل مجاز باید تأیید شوند.",
        "Confirm active service and authorized files.",
      ],
      active: false,
      approved: false,
    },
    {
      id: "analysis",
      role: ["سرویس تحلیل", "Analysis service"],
      purpose: [
        "تحلیل در مسیر سفارش سفارشی",
        "Analysis in the commission flow",
      ],
      information: ["داده ارسالی تأییدشده", "Confirmed transmitted data"],
      condition: [
        "پردازش، آموزش و نگهداری نیازمند بررسی فنی‌اند.",
        "Processing, training and retention require technical review.",
      ],
      active: false,
      approved: false,
    },
  ],
  actions: [],
}
export function isPrivacyRoute(route: string) {
  return ["/privacy", "/fa/privacy", "/en/privacy"].includes(
    route.split(/[?#]/)[0],
  )
}
export function validPrivacyMetadata(doc: PrivacyDocument) {
  return Boolean(
    doc.version?.trim() &&
      doc.publishedAt &&
      doc.updatedAt &&
      !Number.isNaN(Date.parse(doc.publishedAt)) &&
      !Number.isNaN(Date.parse(doc.updatedAt)),
  )
}
export function privacyLanguageAvailable(
  doc: PrivacyDocument,
  language: 0 | 1,
) {
  return (
    doc.languages.includes(language === 0 ? "fa" : "en") &&
    Boolean(doc.title[language] && doc.introduction[language]) &&
    doc.sections.every(
      (section) =>
        section.title[language] &&
        section.paragraphs.every((text) => text[language]) &&
        section.points?.every((text) => text[language]) !== false &&
        section.details?.every(
          (item) => item.title[language] && item.description[language],
        ) !== false &&
        (!section.summary || section.summary[language]) &&
        (!section.notice || section.notice[language]),
    ) &&
    privacyAccessRows(doc).every(
      (row) =>
        row.role[language] &&
        row.purpose[language] &&
        row.information[language] &&
        row.condition[language],
    ) &&
    privacyActions(doc).every((action) => action.label[language]) &&
    doc.changeSummary?.every((change) => change[language]) !== false
  )
}
export function privacyDocumentAvailable(doc: PrivacyDocument) {
  return (
    doc.sections.length > 0 &&
    new Set(doc.sections.map((section) => section.id)).size ===
      doc.sections.length &&
    doc.sections.every(
      (section) =>
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(section.id) &&
        section.paragraphs.length > 0,
    ) &&
    (doc.demo || (doc.published && doc.approved && validPrivacyMetadata(doc)))
  )
}
export function privacySummary(doc: PrivacyDocument) {
  return doc.sections
    .filter((section) => section.summary)
    .map((section) => ({
      id: section.id,
      title: section.title,
      summary: section.summary!,
    }))
}
export function privacyAccessRows(doc: PrivacyDocument) {
  return doc.access.filter((row) => doc.demo || (row.active && row.approved))
}
export function privacyActions(doc: PrivacyDocument) {
  return doc.actions.filter(
    (action) =>
      action.active && action.approved && /^\/(?!\/)/.test(action.route),
  )
}
