export type FAQText = readonly [string, string]
export interface FAQItem {
  id: string
  topic: string
  published: boolean
  question: FAQText
  answer: FAQText
  link?: {
    label: FAQText
    route: string
    intendedRoute?: string
  }
}
export const faqTopics: {
  id: string
  label: FAQText
}[] = [
  { id: "all", label: ["همه موضوعات", "All topics"] },
  { id: "products", label: ["محصول و کالکشن", "Products & collections"] },
  { id: "notebooks", label: ["دفتر و گزینه‌ها", "Notebooks & options"] },
  { id: "bundles", label: ["پکیج و تخفیف", "Bundles & discounts"] },
  { id: "payments", label: ["حساب و پرداخت", "Account & payments"] },
  { id: "delivery", label: ["ارسال و پیگیری", "Delivery & tracking"] },
  { id: "commissions", label: ["نقاشی سفارشی", "Commissions"] },
  { id: "returns", label: ["لغو و مرجوعی", "Cancellations & returns"] },
  { id: "digital", label: ["فایل دیجیتال", "Digital files"] },
]
// User-supplied design copy. Replace with approved, published CMS content for production.
export const faqItems: FAQItem[] = [
  {
    id: "collections-and-categories",
    topic: "products",
    published: true,
    question: [
      "کالکشن با دسته محصول چه فرقی دارد؟",
      "What's the difference between a collection and a category?",
    ],
    answer: [
      "کالکشن طرح یا دنیای تصویری مشترک است، مثل گربه. دسته نوع محصول است، مثل دفتر طراحی یا استیکر. می‌توانی همه محصولات یک کالکشن را یکجا ببینی.",
      "A collection groups a shared visual theme, such as Cats. A category describes the product type, such as sketchbooks or stickers. You can explore a collection's products together.",
    ],
    link: {
      label: ["مشاهده کالکشن‌ها", "Explore collections"],
      route: "/collections",
    },
  },
  {
    id: "sheets-and-quantity",
    topic: "notebooks",
    published: true,
    question: [
      "تعداد برگ با تعداد دفتر چه فرقی دارد؟",
      "How does sheet count differ from notebook quantity?",
    ],
    answer: [
      "تعداد برگ، کاغذ داخل هر دفتر است. تعداد دفتر، تعداد محصولی است که می‌خری. سه دفتر ۵۰برگی یعنی سه دفتر که هرکدام ۵۰ برگ دارند.",
      "Sheet count describes the paper inside each notebook. Notebook quantity is how many notebooks you buy. Three 50-sheet notebooks means three notebooks, each with 50 sheets.",
    ],
    link: {
      label: ["راهنمای خرید", "Buying guide"],
      route: "/guides/buying#notebooks",
    },
  },
  {
    id: "sheets-and-pages",
    topic: "notebooks",
    published: true,
    question: ["۵۰ برگ یعنی چند صفحه؟", "How many pages are in 50 sheets?"],
    answer: [
      "۵۰ برگ فیزیکی، ۱۰۰ روی کاغذ یا صفحه دارد. تعداد روی چاپ‌شده به مشخصات محصول بستگی دارد.",
      "50 physical sheets have 100 sides or pages. The number of printed sides depends on the product specifications.",
    ],
  },
  {
    id: "paper-weight",
    topic: "notebooks",
    published: true,
    question: ["۱۲۷ گرم چه چیزی را مشخص می‌کند؟", "What does 127 gsm mean?"],
    answer: [
      "گرماژ، وزن کاغذ در هر مترمربع است. این عدد تعداد برگ یا تعداد دفتر نیست. برای کاربرد مناسب، مشخصات همان محصول را بررسی کن.",
      "Gsm is the paper's weight in grams per square metre. It isn't the sheet count or purchase quantity. Check the product specifications for its intended use.",
    ],
    link: {
      label: [
        "راهنمای انتخاب دفتر در راهنمای خرید",
        "Notebook advice in the buying guide",
      ],
      route: "/guides/buying#notebooks",
      intendedRoute: "/guides/notebooks",
    },
  },
  {
    id: "product-combinations",
    topic: "notebooks",
    published: true,
    question: [
      "چرا بعضی ترکیب‌های سایز و جلد قابل انتخاب نیستند؟",
      "Why can't I select some size and cover combinations?",
    ],
    answer: [
      "همه ترکیب‌ها در هر محصول ارائه نمی‌شوند. بعضی گزینه‌های ارائه‌شده هم ممکن است فعلاً ناموجود باشند. وضعیت هر ترکیب در صفحه محصول مشخص است.",
      "Not every combination is offered for every product. Some offered options may also be temporarily out of stock. The product page shows the status of each combination.",
    ],
  },
  {
    id: "bundle-components",
    topic: "bundles",
    published: true,
    question: [
      "می‌توانم یکی از اجزای پکیج را حذف کنم؟",
      "Can I remove a component from a bundle?",
    ],
    answer: [
      "اجزا و تعداد هر جزء مشخص‌اند. برای بعضی اجزا می‌توانی از گزینه‌های مجاز انتخاب کنی، اما حذف جزء یا تغییر تعداد داخلی پکیج ممکن نیست.",
      "Bundle components and their quantities are predefined. Some components offer permitted options, but components can't be removed or their internal quantities changed.",
    ],
  },
  {
    id: "bundle-discounts",
    topic: "bundles",
    published: true,
    question: [
      "کد تخفیف روی پکیج هم اعمال می‌شود؟",
      "Can I use a discount code on a bundle?",
    ],
    answer: [
      "تخفیف پکیج معمولاً با کد تخفیف جمع نمی‌شود، مگر برای همان پکیج اجازه داده شده باشد. در سبد مختلط، کد ممکن است روی محصولات مستقل واجد شرایط اعمال شود.",
      "Bundle discounts generally can't be combined with a discount code unless that bundle explicitly allows it. In a mixed cart, the code may still apply to eligible standalone products.",
    ],
  },
  {
    id: "sign-in",
    topic: "payments",
    published: true,
    question: ["چطور وارد حساب شوم؟", "How can I sign in?"],
    answer: [
      "با شماره تلفن و رمز عبور یا شماره تلفن و کد یک‌بارمصرف. ثبت‌نام شامل تأیید شماره با OTP و ساخت رمز است.",
      "Use your phone number and password or a one-time code. Registration includes phone verification and creating a password.",
    ],
  },
  {
    id: "cart-reservation",
    topic: "payments",
    published: true,
    question: [
      "افزودن به سبد، موجودی را رزرو می‌کند؟",
      "Does adding an item to the cart reserve it?",
    ],
    answer: [
      "خیر. قیمت و موجودی پیش از پرداخت دوباره بررسی می‌شوند. رزرو هماهنگ هنگام شروع پرداخت انجام می‌شود.",
      "No. Price and stock are checked again before payment. Items are reserved together when payment starts.",
    ],
  },
  {
    id: "unclear-payment",
    topic: "payments",
    published: true,
    question: [
      "وضعیت پرداخت هنوز مشخص نیست؛ دوباره پرداخت کنم؟",
      "My payment status is unclear. Should I pay again?",
    ],
    answer: [
      "تا مشخص‌شدن نتیجه، دوباره پرداخت نکن. وضعیت تراکنش را بررسی کن و در صورت ادامه ابهام، با مرجع پرداخت به پشتیبانی مراجعه کن.",
      "Don't pay again until the result is confirmed. Check the transaction status and contact support with the payment reference if it remains unclear.",
    ],
    link: { label: ["تماس با نیل‌آرت", "Contact NilArt"], route: "/contact" },
  },
  {
    id: "delivery-cost-and-time",
    topic: "delivery",
    published: true,
    question: [
      "هزینه و زمان ارسال چطور مشخص می‌شود؟",
      "How are delivery cost and timing determined?",
    ],
    answer: [
      "روش‌های قابل ارائه پس از انتخاب آدرس مشخص می‌شوند. هزینه به مقصد و اقلام سفارش بستگی دارد. زمان نمایش‌داده‌شده تقریبی است.",
      "Available methods are shown after you select an address. Cost depends on the destination and order items. Displayed delivery times are estimates.",
    ],
  },
  {
    id: "track-order",
    topic: "delivery",
    published: true,
    question: ["چطور سفارشم را پیگیری کنم؟", "How can I track my order?"],
    answer: [
      "از بخش سفارش‌های حساب یا صفحه پیگیری سفارش. برای دسترسی مهمان، تأیید شماره مرتبط با سفارش لازم است.",
      "Use your account's orders section or the order-tracking page. Guest access requires verification of the phone number linked to the order.",
    ],
    link: { label: ["پیگیری سفارش", "Track order"], route: "/track-order" },
  },
  {
    id: "commission-quote",
    topic: "commissions",
    published: true,
    question: [
      "قبل از پرداخت، قیمت نقاشی قطعی می‌شود؟",
      "Is a commission quote confirmed before payment?",
    ],
    answer: [
      "در موارد نیازمند بررسی، هنرمند ابتدا سفارش را بررسی می‌کند. قیمت نهایی باید به تأیید شما برسد؛ درخواست منتظر بررسی، پرداخت‌پذیر نیست.",
      "Orders requiring review are checked by the artist first. You must accept the final quote; a request awaiting review can't be paid.",
    ],
  },
  {
    id: "commission-revisions",
    topic: "commissions",
    published: true,
    question: [
      "چند بار می‌توانم اصلاح درخواست کنم؟",
      "How many revisions can I request?",
    ],
    answer: [
      "تعداد و شرایط اصلاحات در توافق همان سفارش مشخص می‌شوند. پیش از تأیید سفارش، آن‌ها را بررسی کن.",
      "Revision limits and conditions are defined in your order agreement. Review them before confirming the commission.",
    ],
  },
  {
    id: "return-conditions",
    topic: "returns",
    published: true,
    question: [
      "آیا همه محصولات شرایط مرجوعی یکسان دارند؟",
      "Do all products have the same return conditions?",
    ],
    answer: [
      "خیر. شرایط کالای آماده، اثر سفارشی و فایل دیجیتال ممکن است متفاوت باشد. قواعد همان محصول و صفحه لغو و مرجوعی را بررسی کن.",
      "No. Ready products, commissions and digital files may have different conditions. Check the product's rules and the cancellation and return policy.",
    ],
    link: {
      label: ["لغو و مرجوعی", "Cancellations and returns"],
      route: "/returns-policy",
    },
  },
  {
    id: "download-artwork",
    topic: "digital",
    published: true,
    question: [
      "فایل نقاشی را از کجا دانلود کنم؟",
      "Where can I download my artwork file?",
    ],
    answer: [
      "پس از آماده‌شدن، فایل مجاز در بخش دانلودهای حساب قرار می‌گیرد. پرداخت به معنی آماده‌بودن فوری همه فایل‌ها نیست.",
      "When ready, your authorized file appears in your account downloads. Payment doesn't mean every file is immediately available.",
    ],
    link: {
      label: ["دانلودهای من", "My downloads"],
      route: "/account/downloads",
    },
  },
]

export function normalizeFAQ(value: string) {
  return value
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
export function searchFAQ(
  items: FAQItem[],
  topic: string,
  query: string,
  language: 0 | 1,
) {
  const words = normalizeFAQ(query).split(" ").filter(Boolean)
  return items.filter(
    (item) =>
      item.published &&
      (topic === "all" || topic === item.topic) &&
      words.every((word) =>
        normalizeFAQ(
          `${item.question[language]} ${item.answer[language]}`,
        ).includes(word),
      ),
  )
}

/** Offsets refer to the original safe text, even when Arabic letters are normalized. */
export function faqHighlightRanges(text: string, query: string) {
  const words = normalizeFAQ(query).split(" ").filter(Boolean)
  if (!words.length) return []
  let normalized = ""
  const offsets: number[] = []
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    const normalizedChar = /\s|\u200c/.test(char) ? " " : normalizeFAQ(char)
    for (const part of normalizedChar) {
      normalized += part
      offsets.push(index)
    }
  }
  const matches: {
    start: number
    end: number
  }[] = []
  words.forEach((word) => {
    let position = normalized.indexOf(word)
    while (position !== -1) {
      matches.push({
        start: offsets[position],
        end: offsets[position + word.length - 1] + 1,
      })
      position = normalized.indexOf(word, position + word.length)
    }
  })
  return matches
    .sort((a, b) => a.start - b.start)
    .reduce<{
      start: number
      end: number
    }[]>((ranges, match) => {
      const previous = ranges[ranges.length - 1]
      if (previous && previous.end >= match.start)
        previous.end = Math.max(previous.end, match.end)
      else ranges.push(match)
      return ranges
    }, [])
}
