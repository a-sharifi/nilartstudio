export type ReceiptScenario = "bundle" | "artwork" | "commission" | "digital" | "verification" | "refund" | "multipage"
export type ReceiptLine = {
  id: string
  title: [string, string]
  options: [string, string]
  quantity: number
  unitPrice: number
  bundleDiscount: number
  codeDiscount: number
  components?: {
    title: [string, string]
    quantity: number
    price: number
    discount: number
  }[]
}
// Immutable design fixtures, not a service response or proof of ownership.
export const demoReceiptOrderIds = ["NA-24018", "NA-23976"]
export function receiptFixture(scenario: ReceiptScenario) {
  const bundle: ReceiptLine = {
    id: "bundle",
    title: ["پکیج کالکشن گربه‌ها", "The cats collection bundle"],
    options: [
      "۱ دفتر A5، جلد سخت، کاغذ ۱۰۰ گرم، ۸۰ برگ • ۲ استیکر • ۱ نشان‌کتاب",
      "1 A5 notebook, hardcover, 100 gsm, 80 sheets • 2 stickers • 1 bookmark",
    ],
    quantity: 1,
    unitPrice: 800000,
    bundleDiscount: 80000,
    codeDiscount: 72000,
    components: [
      {
        title: [
          "دفتر گربه‌ها • A5، جلد سخت، ۸۰ برگ",
          "Cats notebook • A5, hardcover, 80 sheets",
        ],
        quantity: 1,
        price: 500000,
        discount: 95000,
      },
      {
        title: ["استیکر گربه‌ها • مات", "Cats stickers • Matte"],
        quantity: 2,
        price: 100000,
        discount: 38000,
      },
      {
        title: ["نشان‌کتاب گربه‌ها", "Cats bookmark"],
        quantity: 1,
        price: 100000,
        discount: 19000,
      },
    ],
  }
  const notebook: ReceiptLine = {
    id: "notebook",
    title: ["دفتر «لحظه‌های آرام»", "Quiet moments notebook"],
    options: [
      "A5 • جلد سخت • کاغذ ۱۰۰ گرم • ۸۰ برگ در هر دفتر",
      "A5 • Hardcover • 100 gsm • 80 sheets per notebook",
    ],
    quantity: 2,
    unitPrice: 385000,
    bundleDiscount: 0,
    codeDiscount: 77000,
  }
  const artwork: ReceiptLine = {
    id: "artwork",
    title: ["نقاشی «عصر آرام»", "A quiet afternoon"],
    options: [
      "اثر اصل • اکریلیک روی بوم • ۳۰ × ۴۰ سانتی‌متر • بدون قاب",
      "Original artwork • Acrylic on canvas • 30 × 40 cm • Unframed",
    ],
    quantity: 1,
    unitPrice: 4800000,
    bundleDiscount: 0,
    codeDiscount: 0,
  }
  const commission: ReceiptLine = {
    id: "commission",
    title: ["نقاشی سفارشی «پرتره خانوادگی»", "Family portrait commission"],
    options: [
      "نسخه پذیرفته‌شده پیشنهاد Q-1042-V2 • سایز A3",
      "Accepted proposal Q-1042-V2 • A3 size",
    ],
    quantity: 1,
    unitPrice: 4400000,
    bundleDiscount: 0,
    codeDiscount: 0,
  }
  const digital: ReceiptLine = {
    id: "digital",
    title: ["چاپ هنری دیجیتال «باغ کوچک»", "Little garden digital art print"],
    options: [
      "فایل نهایی مشتری • PDF و PNG • مجوز استفاده شخصی",
      "Final customer file • PDF & PNG • Personal-use license",
    ],
    quantity: 1,
    unitPrice: 350000,
    bundleDiscount: 0,
    codeDiscount: 0,
  }
  const lines =
    scenario === "artwork"
      ? [artwork]
      : scenario === "commission"
        ? [commission]
        : scenario === "digital"
          ? [digital]
          : scenario === "multipage"
            ? [
                bundle,
                notebook,
                artwork,
                ...Array.from({ length: 12 }, (_, i) => ({
                  ...notebook,
                  id: `print-${i}`,
                  codeDiscount: 0,
                })),
              ]
            : [bundle, notebook]
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  )
  const bundleDiscount = lines.reduce(
    (sum, line) => sum + line.bundleDiscount,
    0,
  )
  const codeDiscount = lines.reduce((sum, line) => sum + line.codeDiscount, 0)
  const packaging = scenario === "digital" ? 0 : 25000
  const shipping = scenario === "digital" ? 0 : 65000
  const net = subtotal - bundleDiscount - codeDiscount
  return Object.freeze({
    lines,
    subtotal,
    bundleDiscount,
    codeDiscount,
    net,
    packaging,
    shipping,
    total: net + packaging + shipping,
    digital: scenario === "digital",
    payment:
      scenario === "verification"
        ? "verification" as const
        : "confirmed" as const,
    refunded: scenario === "refund" ? 346500 : 0,
  })
}
