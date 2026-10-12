import { normalizeFAQ } from "./faq"

export type TermsText = readonly [string, string]
export interface TermsLink {
  label: TermsText
  route: string
}
export interface TermsSection {
  id: string
  title: TermsText
  paragraphs: TermsText[]
  points?: TermsText[]
  summary?: TermsText
  notice?: TermsText
  links?: TermsLink[]
}
export interface TermsDocument {
  demo: boolean
  approved: boolean
  published: boolean
  languages: readonly ("fa" | "en")[]
  version?: string
  publishedAt?: string
  updatedAt?: string
  sourceState: "current" | "previous" | "cached"
  currentVersionRoute?: string
  title: TermsText
  introduction: TermsText
  sections: TermsSection[]
}
// Educational content from the supplied brief, not a published legal agreement.
export const termsDemoDocument: TermsDocument = {
  demo: true,
  approved: false,
  published: false,
  languages: ["fa", "en"],
  sourceState: "current",
  title: ["قوانین و شرایط خرید", "Purchase terms and conditions"],
  introduction: [
    "شرایط انتخاب محصول، ثبت سفارش، پرداخت و تحویل را در این صفحه بررسی کنید.",
    "Review the conditions for product selection, ordering, payment and delivery.",
  ],
  sections: [
    {
      id: "scope",
      title: ["دامنه شرایط خرید", "Scope of the purchase terms"],
      paragraphs: [
        [
          "این صفحه جایگاه شرایط خرید محصولات آماده، پکیج، نقاشی آماده، سفارش نقاشی سفارشی و تحویل دیجیتال مرتبط است. متن نمونه این طراحی، قرارداد منتشرشده فروشگاه نیست.",
          "This page provides a place for conditions covering ready-made products, bundles, original artworks, commissions and relevant digital deliveries. The design sample is not the store's published agreement.",
        ],
        [
          "محصولات فروشگاهی از موجودی آماده فروخته می‌شوند؛ نقاشی سفارشی مسیر اجرای جداگانه دارد. شرایط هر نوع محصول و مرحله سفارش باید از سیاست مصوب دریافت شوند.",
          "Shop products are sold from ready stock; commissioned artwork has a separate production flow. Conditions for each product type and order stage must come from approved policy.",
        ],
      ],
      summary: [
        "کالای آماده و نقاشی سفارشی مسیرهای متفاوت دارند.",
        "Ready-made products and commissioned artworks follow different paths.",
      ],
    },
    {
      id: "account",
      title: ["حساب و اطلاعات مشتری", "Account & customer information"],
      paragraphs: [
        [
          "اطلاعات تماس و آدرس مرتبط با سفارش را بررسی کنید. ثبت‌نام شامل تأیید تلفن با کد یک‌بارمصرف و ساخت رمز است؛ ورود با تلفن و رمز یا تلفن و کد یک‌بارمصرف انجام می‌شود.",
          "Review the contact and address information associated with your order. Registration uses phone verification and a password; sign-in uses phone and password or a one-time code.",
        ],
        [
          "اطلاعات ورود را امن نگه دارید و تغییر اطلاعات را از مسیر مجاز انجام دهید. شرایط اعلان‌های سفارش و هر محدودیت حساب فقط از سیاست منتشرشده دریافت می‌شوند.",
          "Keep sign-in details secure and update information through authorized paths. Order-notification conditions and any account restrictions must come from published policy.",
        ],
      ],
      notice: [
        "رمز عبور و کد تأیید را در پیام عمومی یا برای پشتیبانی ارسال نکنید.",
        "Do not share passwords or verification codes in public messages or with support.",
      ],
      links: [{ label: ["حریم خصوصی", "Privacy policy"], route: "/privacy" }],
    },
    {
      id: "products",
      title: ["محصولات و گزینه‌ها", "Products & options"],
      paragraphs: [
        [
          "کالکشن موضوع هنری است؛ دسته، نوع محصول. نمایش یک محصول در چند کالکشن، موجودی جداگانه برای همان محصول ایجاد نمی‌کند.",
          "A collection is an artistic theme; a category is a product type. Showing one product in multiple collections does not create additional stock for it.",
        ],
        [
          "پیش از افزودن محصول به سبد، گزینه انتخاب‌شده و مشخصات همان ترکیب را بررسی کنید.",
          "Review the selected options and specifications before adding a product to your cart.",
        ],
      ],
      points: [
        [
          "سایز، تعداد برگ و نوع جلد می‌توانند ترکیب قابل فروش را تغییر دهند؛ هر ترکیب قیمت و موجودی مستقل دارد.",
          "Size, sheet count and cover type can change the sellable variant; each combination has its own price and stock.",
        ],
        [
          "ترکیب غیرفعال یا ناموجود قابل خرید نیست.",
          "Inactive or out-of-stock combinations cannot be purchased.",
        ],
        [
          "تعداد واحد خریداری‌شده با تعداد برگ دفتر متفاوت است؛ گرماژ ویژگی کاغذ است، نه تعداد برگ.",
          "Purchase quantity differs from notebook sheet count; paper weight is a paper property, not the sheet count.",
        ],
      ],
      summary: [
        "گزینه، قیمت و موجودی همان ترکیب را پیش از خرید بررسی کنید.",
        "Check the options, price and stock of your selected combination before buying.",
      ],
      links: [
        { label: ["راهنمای خرید", "Buying guide"], route: "/guides/buying" },
      ],
    },
    {
      id: "pricing",
      title: ["قیمت و تخفیف", "Prices & discounts"],
      paragraphs: [
        [
          "قیمت گزینه انتخاب‌شده، واحد پول، هزینه ارسال، تخفیف و مبلغ نهایی باید پیش از پرداخت روشن باشند. مالیات یا هزینه دیگر فقط در صورت اعمال واقعی و وجود اطلاعات مصوب نمایش داده می‌شوند. تغییر زبان، ارز را خودکار تغییر نمی‌دهد.",
          "The selected option's price, currency, delivery cost, discounts and final amount must be clear before payment. Tax or other charges are shown only when actually applied and supported by approved information. Changing language does not automatically change currency.",
        ],
        [
          "کد تخفیف به‌طور پیش‌فرض با تخفیف پکیج جمع نمی‌شود؛ استثنا فقط با تنظیم صریح فروشگاه ممکن است. در سبد مختلط، کد می‌تواند روی اقلام مستقل واجد شرایط اعمال شود.",
          "A discount code does not stack with a bundle discount by default; an exception requires an explicit store setting. In a mixed cart, the code can apply to eligible standalone items.",
        ],
        [
          "شرایط اعتبار کد، مبلغ و هر محدودیت آن از تنظیمات منتشرشده دریافت می‌شوند؛ در این نمونه درصد، حداقل خرید یا سقف مصرف تعیین نشده است.",
          "Code validity, amounts and any limits come from published settings; this sample does not set percentages, minimum spend or usage caps.",
        ],
      ],
    },
    {
      id: "cart-stock",
      title: ["سبد و موجودی", "Cart & stock"],
      paragraphs: [
        [
          "افزودن به سبد، به‌تنهایی رزرو قطعی موجودی نیست. شرایط و مهلت هر رزرو در checkout، اگر وجود دارد، باید از سیاست و سرویس واقعی دریافت شود.",
          "Adding an item to the cart does not by itself reserve stock. Conditions and time limits for any checkout reservation must come from the real policy and service.",
        ],
        [
          "اجزا و تعداد داخل پکیج از تعریف آن مشخص‌اند؛ مشتری فقط گزینه‌های مجاز را انتخاب می‌کند. امکان خرید پکیج به موجودی همه اجزای انتخاب‌شده بستگی دارد.",
          "Bundle components and their quantities are predefined; customers choose only permitted options. Bundle availability depends on stock for all selected components.",
        ],
        [
          "اگر یک گزینه محصول در چند بخش سفارش تکرار شود، تعداد مجموع در بررسی امکان خرید لحاظ می‌شود. تعداد قابل انتخاب باید با موجودی قابل خرید هماهنگ باشد.",
          "If the same product option appears in multiple parts of an order, its total quantity is considered when checking availability. Selectable quantity must match purchasable stock.",
        ],
      ],
    },
    {
      id: "payment",
      title: ["ثبت سفارش و پرداخت", "Ordering & payment"],
      paragraphs: [
        [
          "ثبت درخواست سفارش، شروع تلاش پرداخت، تأیید پرداخت، آماده‌سازی سفارش و ارسال یا تحویل، مراحل جدا هستند. ظاهر موفق درگاه به‌تنهایی تأیید نهایی پرداخت نیست.",
          "An order request, payment attempt, payment confirmation, order preparation and shipment or delivery are separate steps. A successful-looking gateway screen alone is not final payment confirmation.",
        ],
        [
          "پرداخت می‌تواند موفق، ناموفق، لغوشده یا در حال بررسی باشد؛ وضعیت تأییدشده سرویس ملاک نمایش نتیجه است.",
          "Payment can be successful, failed, cancelled or under review; its display must follow the service's confirmed status.",
        ],
        [
          "اگر پرداخت تأیید شده اما تأمین سفارش نیازمند بررسی است، شرایط مصوب و مسیر پشتیبانی باید ارائه شوند؛ این صفحه ارسال حتمی یا بازپرداخت فوری وعده نمی‌دهد.",
          "If payment is confirmed but fulfillment needs review, the approved conditions and support path must be provided; this page does not promise guaranteed shipment or an immediate refund.",
        ],
      ],
      summary: [
        "به نتیجه تأییدشده پرداخت توجه کنید؛ وضعیت نامشخص را پیگیری کنید.",
        "Rely on the confirmed payment result and follow up on unclear status.",
      ],
      notice: [
        "اگر نتیجه پرداخت مشخص نیست، تا بررسی وضعیت دوباره پرداخت نکنید.",
        "If the payment result is unclear, do not pay again until its status is checked.",
      ],
      links: [
        { label: ["پیگیری سفارش", "Track your order"], route: "/track-order" },
      ],
    },
    {
      id: "delivery",
      title: ["ارسال و تحویل", "Shipping & delivery"],
      paragraphs: [
        [
          "آدرس و اطلاعات گیرنده، روش‌های فعال ارسال و هزینه مربوط را در مسیر سفارش بررسی کنید. روش و هزینه از مقصد و اقلام واقعی سفارش تعیین می‌شوند.",
          "Review the recipient's address, available shipping methods and associated cost in the order flow. Methods and cost depend on the destination and actual order items.",
        ],
        [
          "زمان آماده‌سازی با زمان حمل متفاوت است. برآورد تحویل، رویداد قطعی نیست؛ فقط برآورد معتبر با برچسب تخمینی نمایش داده می‌شود.",
          "Preparation time differs from transit time. A delivery estimate is not a confirmed event; only valid estimates are shown, clearly labelled as estimates.",
        ],
        [
          "سفارش می‌تواند چند بخش یا مرسوله داشته باشد. آماده‌بودن محصول فروشگاهی به معنی آماده‌بودن نقاشی سفارشی نیست؛ وضعیت هر بخش جدا پیگیری می‌شود.",
          "An order can contain several parts or parcels. Ready-stock products do not mean a commission is ready; each part is tracked separately.",
        ],
        [
          "رهگیری شرکت حمل، مشکل نشانی یا تحویل و آسیب مرسوله از مسیر مرتبط با همان سفارش بررسی می‌شوند. شرایط دقیق باید از سیاست مصوب دریافت شوند.",
          "Carrier tracking, address or delivery problems and parcel damage are reviewed through the relevant order flow. Exact conditions must come from approved policy.",
        ],
      ],
      links: [
        { label: ["پیگیری سفارش", "Track your order"], route: "/track-order" },
      ],
    },
    {
      id: "original-artworks",
      title: ["نقاشی آماده", "Original artworks"],
      paragraphs: [
        [
          "مشخصات اثر، موجودی محدود و اطلاعات اصالت، در صورت وجود، از داده همان اثر دریافت می‌شوند. گزینه یا اثر ناموجود قابل خرید معرفی نمی‌شود.",
          "Artwork details, limited availability and any authenticity information come from that artwork's data. Unavailable options or artworks are not presented as purchasable.",
        ],
        [
          "شرایط مربوط به اثر و تحویل آن را در صفحه همان اثر و سیاست منتشرشده بررسی کنید؛ برای اثری با موجودی محدود، جایگزینی فوری فرض نمی‌شود.",
          "Review the artwork's conditions and delivery details on its own page and in the published policy; immediate replacement is not assumed for limited-stock artwork.",
        ],
      ],
      links: [
        { label: ["دیدن نقاشی‌ها", "Explore artworks"], route: "/artworks" },
      ],
    },
    {
      id: "commissions",
      title: ["نقاشی سفارشی", "Commissioned artwork"],
      paragraphs: [
        [
          "مسیر سفارشی شامل دریافت تصویر و توضیح، انتخاب سبک و سایز و نوع اجرا، ارزیابی و پیشنهاد قیمت، و بررسی هنرمند در موارد لازم است. در مسیر نیازمند بررسی، پیشنهاد باید پیش از پرداخت به تأیید مشتری برسد.",
          "The commission flow includes an image and description, style, size and execution choices, assessment and a quote, and artist review where needed. For requests requiring review, the customer must accept the proposal before payment.",
        ],
        [
          "اجرا، نسخه اولیه، اصلاحات و تحویل مراحل مستقل‌اند. تعداد اصلاحات، زمان آماده‌سازی و دامنه تغییرات از توافق ثبت‌شده همان سفارش دریافت می‌شوند.",
          "Production, a first version, revisions and delivery are separate stages. Revision counts, preparation timing and change scope come from that order's recorded agreement.",
        ],
        [
          "شرایط اختصاصی سفارش سفارشی در پیشنهاد و توافق همان سفارش مشخص می‌شود. AI به‌تنهایی تصمیم‌گیر قطعی و جایگزین بررسی انسانی معرفی نمی‌شود.",
          "Order-specific commission conditions are set out in that order's proposal and agreement. AI alone is not presented as the final decision-maker or a substitute for human review.",
        ],
      ],
      links: [
        {
          label: ["شروع سفارش سفارشی", "Start a commission"],
          route: "/commissions/new",
        },
      ],
    },
    {
      id: "digital",
      title: ["فایل دیجیتال", "Digital files"],
      paragraphs: [
        [
          "فرمت، نسخه، شرایط دسترسی و آماده‌بودن فایل از اطلاعات واقعی سفارش دریافت می‌شوند. فایل خصوصی فقط از مسیر مجاز حساب قابل دریافت است؛ این صفحه لینک دانلود عمومی ندارد.",
          "File format, version, access conditions and readiness come from the actual order data. Private files are accessed only through the authorized account flow; this page has no public download links.",
        ],
        [
          "حقوق استفاده از اثر یا فایل از توافق تأییدشده دریافت می‌شوند. مالکیت همه حقوق یا اجازه استفاده تجاری به‌صورت خودکار فرض نمی‌شود.",
          "Artwork or file usage rights come from the approved agreement. Ownership of all rights or permission for commercial use is not assumed automatically.",
        ],
      ],
      links: [
        {
          label: [
            "مشاهده توافق در سفارش‌های من",
            "View the agreement in my orders",
          ],
          route: "/account/orders",
        },
      ],
    },
    {
      id: "returns",
      title: ["لغو و مرجوعی", "Cancellation & returns"],
      paragraphs: [
        [
          "شرایط درخواست به نوع محصول، مرحله سفارش و توافق مربوط بستگی دارد. صفحه اختصاصی لغو و مرجوعی، مرجع جزئیات این موضوع است.",
          "Request conditions depend on the product type, order stage and applicable agreement. The dedicated cancellation and returns page is the reference for details.",
        ],
        [
          "ثبت درخواست با پذیرش آن متفاوت است؛ لغو سفارش به معنی تکمیل بازپرداخت نیست و دریافت کالای برگشتی به معنی تأیید نهایی نیست.",
          "Submission is different from approval; cancellation does not mean a refund is complete, and receipt of returned goods does not mean final approval.",
        ],
        [
          "برای پکیج، مبلغ بررسی‌شده بر پایه اقلام تأییدشده و تخفیف‌های تاریخی همان سفارش است، نه قیمت روز.",
          "For bundles, the amount reviewed uses approved items and historical discounts from that order, not current prices.",
        ],
      ],
      summary: [
        "شرایط ارسال و مرجوعی مرتبط با نوع محصول و مرحله سفارش را بررسی کنید.",
        "Review shipping and return conditions for your product type and order stage.",
      ],
      links: [
        {
          label: [
            "مشاهده شرایط لغو و مرجوعی",
            "Read cancellation and returns conditions",
          ],
          route: "/returns-policy",
        },
      ],
    },
    {
      id: "customer-content",
      title: ["محتوای مشتری و حقوق استفاده", "Customer content & usage rights"],
      paragraphs: [
        [
          "هدف استفاده از تصاویر و توضیحات مشتری و دسترسی به آن‌ها باید با سیاست واقعی و توافق سفارش هماهنگ باشد. ارسال تصویر به معنی رضایت برای تبلیغات یا نمایش عمومی نیست.",
          "The purpose and access for customer images and descriptions must align with the real policy and order agreement. Sending an image does not mean consent to advertising or public display.",
        ],
        [
          "استفاده آموزشی AI یا انتشار نمونه‌کار بدون سیاست و رضایت معتبر ادعا نمی‌شود. حقوق استفاده باید از محتوای تأییدشده دریافت شوند، نه فرض پیش‌فرض رابط.",
          "AI training use or portfolio publication is not claimed without valid policy and consent. Usage rights must come from approved content, not an interface default.",
        ],
      ],
      links: [
        { label: ["حریم خصوصی", "Privacy policy"], route: "/privacy" },
        {
          label: [
            "توافق سفارش در حساب کاربری",
            "Order agreement in your account",
          ],
          route: "/account/orders",
        },
      ],
    },
    {
      id: "versions",
      title: ["نسخه شرایط و سفارش‌های قبلی", "Terms versions & earlier orders"],
      paragraphs: [
        [
          "نسخه منتشرشده جاری مربوط به این صفحه است. نسخه شرایط و توافق مرتبط با سفارش قبلی باید جدا حفظ شوند؛ تغییر شرایط جاری، اطلاعات تاریخی سفارش را بازنویسی نمی‌کند.",
          "This page is for the current published version. Terms and agreements tied to earlier orders must be retained separately; updates to current terms do not rewrite historical order information.",
        ],
        [
          "مطالعه این صفحه به معنی پذیرش شرایط در checkout نیست. در صورت نیاز به پذیرش صریح، کنترل آن در checkout قرار می‌گیرد، از پیش انتخاب‌شده نیست و به نسخه منتشرشده مشخص ارجاع می‌دهد.",
          "Reading this page is not checkout acceptance. Where explicit acceptance is required, the control belongs in checkout, is not preselected and references a specific published version.",
        ],
        [
          "پذیرش بازاریابی با پذیرش خرید ترکیب نمی‌شود. بازگشت از مطالعه شرایط نباید اطلاعات checkout را از بین ببرد. در این نمونه selector نسخه‌های پیشین یا کنترل پذیرش وجود ندارد.",
          "Marketing consent is not combined with purchase acceptance. Returning from reading terms should preserve checkout data. This sample has no previous-version selector or acceptance control.",
        ],
      ],
    },
    {
      id: "support",
      title: ["پشتیبانی", "Support"],
      paragraphs: [
        [
          "برای پرسش درباره خرید از راهنماها یا مسیر تماس استفاده کنید؛ وضعیت سفارش از پیگیری مهمان یا حساب قابل بررسی است. اطلاعات خصوصی سفارش و مدارک فقط در مسیر مجاز دریافت می‌شوند.",
          "Use the guides or contact path for shopping questions; check order status through guest tracking or your account. Private order information and evidence are collected only through authorized paths.",
        ],
        [
          "برای شرایطی که هنوز منتشر نشده‌اند، از پشتیبانی راهنمایی بگیرید؛ نبود محتوا با شرط حقوقی تولیدشده یا محدودیت فرضی جایگزین نمی‌شود.",
          "Ask support about conditions that have not been published; missing content is not replaced with generated legal clauses or invented restrictions.",
        ],
      ],
      links: [
        { label: ["تماس با نیل‌آرت", "Contact NilArt"], route: "/contact" },
        { label: ["سؤالات متداول", "FAQ"], route: "/faq" },
      ],
    },
  ],
}
export function isTermsRoute(route: string) {
  return ["/terms", "/fa/terms", "/en/terms"].includes(route.split(/[?#]/)[0])
}
export function validTermsMetadata(document: TermsDocument) {
  return Boolean(
    document.version?.trim() &&
      document.publishedAt &&
      document.updatedAt &&
      Number.isFinite(Date.parse(document.publishedAt)) &&
      Number.isFinite(Date.parse(document.updatedAt)),
  )
}
export function publishedTermsAvailable(document: TermsDocument) {
  return (
    document.demo ||
    Boolean(
      document.approved &&
        document.published &&
        validTermsMetadata(document) &&
        document.sections.length,
    )
  )
}
export function termsSummary(document: TermsDocument) {
  return document.sections.flatMap((section) =>
    section.summary ? [section.summary] : [],
  )
}
export function searchTerms(
  document: TermsDocument,
  query: string,
  language: 0 | 1,
) {
  const words = normalizeFAQ(query).split(" ").filter(Boolean)
  return document.sections.filter((section) =>
    words.every((word) =>
      normalizeFAQ(
        [
          section.title[language],
          ...section.paragraphs.map((paragraph) => paragraph[language]),
          ...(section.points?.map((point) => point[language]) ?? []),
          section.notice?.[language] ?? "",
        ].join(" "),
      ).includes(word),
    ),
  )
}
