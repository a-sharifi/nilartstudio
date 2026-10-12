export type FinanceText = readonly [string, string]
export type Money = string
export type FinanceRole = "owner" | "finance" | "warehouse"
export type FinanceMode = "normal" | "loading" | "empty" | "incomplete" | "partial" | "error" | "stale" | "denied"
export interface FinancePermissions {
  view: boolean
  record: boolean
  approve: boolean
  refund: boolean
  export: boolean
}
export const financePermissions = (role: FinanceRole): FinancePermissions => ({
  view: role !== "warehouse",
  record: role !== "warehouse",
  approve: role === "owner",
  refund: role === "owner",
  export: role !== "warehouse",
})
export interface FinanceRequest {
  start: string
  end: string
  role: FinanceRole
  mode: FinanceMode
}
export interface FinanceMetric {
  key: string
  title: FinanceText
  amount: Money | null
  definition: FinanceText
  route: string
}
export interface FinanceAccount {
  id: string
  name: FinanceText
  type: FinanceText
  balance: Money
  basis: string
  reconciled: boolean
}
export interface CashRow {
  label: FinanceText
  receipts: Money
  payments: Money
}
export interface FinanceDocument {
  id: string
  at: string
  type: FinanceText
  party: FinanceText
  amount: Money
  direction: "in" | "out" | "internal"
  account: FinanceText
  status: "posted" | "draft" | "correction"
  reference: string
}
export interface FinanceSections {
  attention: {
    rows: {
      id: string
      title: FinanceText
      count: number
      description: FinanceText
      cta: FinanceText
      route: string
    }[]
  }
  performance: {
    metrics: FinanceMetric[]
    profits: FinanceMetric[]
    inventory: FinanceMetric[]
    incomplete: boolean
    cogs: Money
    fees: Money
    directCosts: Money
    operatingCosts: Money
  }
  balances: {
    accounts: FinanceAccount[]
    total: Money
    receivables: Money
    payables: Money
    basis: string
  }
  flow: {
    rows: CashRow[]
    receipts: Money
    payments: Money
    net: Money
  }
  gateway: {
    confirmed: Money
    receivables: Money
    settlements: Money
    fees: Money
    discrepancies: number
    registered: Money
    matched: Money
    refundRows: {
      status: FinanceText
      count: number
      amount: Money | null
    }[]
  }
  documents: { rows: FinanceDocument[] }
}
export interface FinanceEnvelope<T> {
  data: T
  receivedAt: string
  demo: true
  stale: boolean
}
export interface FinanceService {
  load<K extends keyof FinanceSections>(
    section: K,
    request: FinanceRequest,
    signal: AbortSignal,
  ): Promise<FinanceEnvelope<FinanceSections[K]>>
}
export function exactMoney(value: Money): bigint {
  if (!/^-?\d+$/.test(value)) throw new Error("INVALID_EXACT_MONEY")
  return BigInt(value)
}
export const addMoney = (...values: Money[]): Money =>
  values.reduce((total, value) => total + exactMoney(value), 0n).toString()
export const subtractMoney = (a: Money, b: Money): Money =>
  (exactMoney(a) - exactMoney(b)).toString()
export function formatMoney(value: Money, en: boolean, signed = false): string {
  const n = exactMoney(value),
    absolute = n < 0n ? -n : n
  return (
    (n < 0n ? "−" : signed && n > 0n ? "+" : "") +
    new Intl.NumberFormat(en ? "en" : "fa").format(absolute)
  )
}
export const DEMO_FINANCE_BASIS = "2026-06-14T20:29:59Z"
export function financeRange(period: string, start = "", end = "") {
  const final = new Date("2026-06-14T00:00:00Z")
  if (period === "custom") return { start, end }
  const first = new Date(final)
  first.setUTCDate(
    first.getUTCDate() - (period === "1" ? 0 : period === "7" ? 6 : 29),
  )
  return {
    start: first.toISOString().slice(0, 10),
    end: final.toISOString().slice(0, 10),
  }
}
const accountBank: FinanceText = ["حساب عملیاتی بانک", "Operating bank account"]
const accountCash: FinanceText = ["صندوق فروشگاه", "Store cash fund"]
const documents: FinanceDocument[] = [
  {
    id: "RC-0142",
    at: "2026-06-14T09:20:00Z",
    type: ["دریافت مشتری", "Customer receipt"],
    party: ["مشتری مجاز · م. ر.", "Permitted customer · M. R."],
    amount: "7400000",
    direction: "in",
    account: accountBank,
    status: "posted",
    reference: "NA-1058",
  },
  {
    id: "GS-0086",
    at: "2026-06-14T07:40:00Z",
    type: ["تسویه طلب درگاه", "Gateway receivable settled"],
    party: ["درگاه پرداخت", "Payment gateway"],
    amount: "21000000",
    direction: "in",
    account: accountBank,
    status: "posted",
    reference: "GW-BATCH-086",
  },
  {
    id: "PY-0094",
    at: "2026-06-13T12:10:00Z",
    type: ["پرداخت تأمین‌کننده", "Supplier payment"],
    party: ["تأمین‌کننده کاغذ", "Paper supplier"],
    amount: "16400000",
    direction: "out",
    account: accountBank,
    status: "posted",
    reference: "PO-0241",
  },
  {
    id: "EX-0062",
    at: "2026-06-12T11:05:00Z",
    type: ["هزینه جاری", "Operating expense"],
    party: ["خدمات کارگاه", "Studio services"],
    amount: "2500000",
    direction: "out",
    account: accountCash,
    status: "draft",
    reference: "EXP-062",
  },
  {
    id: "CR-0008",
    at: "2026-06-11T08:30:00Z",
    type: ["سند اصلاحی مرتبط", "Linked correction"],
    party: ["درگاه پرداخت", "Payment gateway"],
    amount: "150000",
    direction: "out",
    account: accountBank,
    status: "correction",
    reference: "GS-0084",
  },
  {
    id: "TR-0019",
    at: "2026-06-10T13:45:00Z",
    type: ["انتقال داخلی", "Internal transfer"],
    party: ["بین حساب‌های نیل‌آرت", "Between NilArt accounts"],
    amount: "5000000",
    direction: "internal",
    account: accountCash,
    status: "posted",
    reference: "TR-0019",
  },
]
const salesFacts = [
  {
    date: "2026-05-24",
    sales: "28450000",
    cogs: "14500000",
    fees: "540000",
    direct: "900000",
    operating: "2600000",
  },
  {
    date: "2026-06-02",
    sales: "35000000",
    cogs: "18000000",
    fees: "650000",
    direct: "1100000",
    operating: "2400000",
  },
  {
    date: "2026-06-10",
    sales: "31000000",
    cogs: "16200000",
    fees: "600000",
    direct: "950000",
    operating: "2000000",
  },
  {
    date: "2026-06-14",
    sales: "34000000",
    cogs: "17600000",
    fees: "620000",
    direct: "1050000",
    operating: "2100000",
  },
]
// Confirmed gateway captures are a separate source from net sales.
const gatewayPaymentFacts = [
  { date: "2026-05-24", amount: "31000000" },
  { date: "2026-06-02", amount: "37000000" },
  { date: "2026-06-10", amount: "34000000" },
  { date: "2026-06-14", amount: "37200000" },
]
const metric = (
  key: string,
  title: FinanceText,
  amount: Money | null,
  definition: FinanceText,
  route: string,
): FinanceMetric => ({ key, title, amount, definition, route })
function createSection<K extends keyof FinanceSections>(
  key: K,
  request: FinanceRequest,
): FinanceSections[K] {
  const facts =
    request.mode === "empty"
      ? []
      : salesFacts.filter(
          (f) => f.date >= request.start && f.date <= request.end,
        )
  const sum = (field: "sales" | "cogs" | "fees" | "direct" | "operating") =>
    addMoney(...facts.map((f) => f[field]))
  const sales = sum("sales"),
    cogs = sum("cogs"),
    fees = sum("fees"),
    direct = sum("direct"),
    operating = sum("operating")
  const gross = subtractMoney(sales, cogs),
    afterDirect = subtractMoney(subtractMoney(gross, fees), direct),
    profit = subtractMoney(afterDirect, operating)
  const included =
    request.mode === "empty"
      ? []
      : documents.filter(
          (d) =>
            d.at.slice(0, 10) >= request.start &&
            d.at.slice(0, 10) <= request.end,
        )
  const posted = included.filter((d) => d.status !== "draft")
  const receipt = addMoney(
    ...posted.filter((d) => d.direction === "in").map((d) => d.amount),
  )
  const payment = addMoney(
    ...posted.filter((d) => d.direction === "out").map((d) => d.amount),
  )
  const incomplete = request.mode === "incomplete"
  const accounts: FinanceAccount[] = [
    {
      id: "BANK-01",
      name: accountBank,
      type: ["بانک", "Bank"],
      balance: "92400000",
      basis: DEMO_FINANCE_BASIS,
      reconciled: true,
    },
    {
      id: "CASH-01",
      name: accountCash,
      type: ["صندوق", "Cash"],
      balance: "8600000",
      basis: DEMO_FINANCE_BASIS,
      reconciled: false,
    },
  ]
  const result: FinanceSections = {
    attention: {
      rows: [
        {
          id: "unknown",
          title: ["پرداخت نامشخص", "Unknown payments"],
          count: 2,
          description: [
            "نیازمند تطبیق معتبر؛ نه تأیید دستی بی‌قید",
            "Requires reconciliation, not unconditional approval",
          ],
          cta: ["بررسی پرداخت‌ها", "Review payments"],
          route: "/finance/transactions?status=verification",
        },
        {
          id: "mismatch",
          title: ["مغایرت تسویه درگاه", "Settlement discrepancies"],
          count: 3,
          description: [
            "اختلاف مبلغ یا تراکنش تطبیق‌نیافته",
            "Amount differences or unmatched transactions",
          ],
          cta: ["بررسی مغایرت‌ها", "Review discrepancies"],
          route: "/finance/settlements?status=discrepancy",
        },
        {
          id: "refund",
          title: ["بازپرداخت نیازمند بررسی", "Refunds needing review"],
          count: 1,
          description: [
            "انتقال وجه ناموفق؛ درخواست هنوز باز است",
            "Failed transfer; the request remains open",
          ],
          cta: ["مشاهده بازپرداخت‌ها", "View refunds"],
          route: "/finance/refunds?status=needs-review",
        },
        {
          id: "allocation",
          title: ["پرداخت موفق، مشکل تخصیص", "Paid, allocation issue"],
          count: 1,
          description: [
            "رزرو منقضی؛ نیازمند رسیدگی مالی و عملیاتی",
            "Expired reservation; financial & operational review",
          ],
          cta: ["مشاهده سفارش‌ها", "View orders"],
          route: "/orders?attention=allocation",
        },
        {
          id: "approval",
          title: ["اسناد نیازمند تأیید", "Documents awaiting approval"],
          count: 4,
          description: [
            "پیش‌نویس‌ها هنوز سند قطعی نیستند",
            "Drafts are not yet posted documents",
          ],
          cta: ["بررسی اسناد", "Review documents"],
          route: "/finance/receipts-payments?status=draft",
        },
        {
          id: "cost",
          title: ["اطلاعات هزینه ناقص", "Incomplete cost records"],
          count: 2,
          description: [
            "سود این موارد قطعی محاسبه نمی‌شود",
            "These records cannot have definitive profit",
          ],
          cta: ["تکمیل هزینه‌ها", "Complete cost records"],
          route: "/finance/profit?status=incomplete",
        },
      ],
    },
    performance: {
      metrics: [
        metric(
          "sales",
          ["فروش خالص دوره", "Period net sales"],
          sales,
          [
            "پس از تخفیف و مرجوعی؛ بدون مالیات و ارسال",
            "After discounts & returns; excludes tax and shipping",
          ],
          "/finance/profit?report=net-sales",
        ),
        metric(
          "receipts",
          ["دریافت نقدی دوره", "Period cash receipts"],
          receipt,
          [
            "ورود به بانک و صندوق: دریافت مستقیم + تسویه طلب درگاه؛ پرداخت درگاه دوباره شمرده نمی‌شود",
            "Bank/cash inflows: direct receipts + gateway receivable settlement; gateway captures not counted twice",
          ],
          "/finance/cash-flow?direction=in",
        ),
        metric(
          "payments",
          ["پرداخت نقدی دوره", "Period cash payments"],
          payment,
          [
            "خروج ثبت‌شده بانک و صندوق؛ پیش‌نویس و انتقال داخلی خارج‌اند",
            "Posted bank/cash outflows; drafts and internal transfers excluded",
          ],
          "/finance/cash-flow?direction=out",
        ),
      ],
      profits: [
        metric(
          "gross",
          ["سود ناخالص", "Gross profit"],
          incomplete ? null : gross,
          [
            "فروش خالص بدون مالیات منهای COGS ثبت‌شده",
            "Net sales excluding tax minus posted COGS",
          ],
          "/finance/profit?type=gross",
        ),
        metric(
          "direct",
          ["پس از هزینه مستقیم فروش", "After direct selling costs"],
          incomplete ? null : afterDirect,
          [
            "سود ناخالص منهای کارمزد و هزینه مستقیم سفارش",
            "Gross profit less fees and direct order costs",
          ],
          "/finance/profit?type=direct",
        ),
        metric(
          "operating",
          ["سود عملیاتی دوره", "Period operating profit"],
          incomplete ? null : profit,
          [
            "پس از هزینه جاری؛ هزینه تولید تخصیص‌یافته دوباره کسر نمی‌شود",
            "After operating expenses; allocated production costs not deducted again",
          ],
          "/finance/profit?type=operating",
        ),
        metric(
          "estimated",
          ["سود برآوردی سفارش‌های جاری", "Estimated active-order profit"],
          "8400000",
          [
            "پیش از خروج کالا؛ برآورد مستقل از سود تحقق‌یافته",
            "Before dispatch; separate from realized profit",
          ],
          "/finance/profit?type=estimated",
        ),
        metric(
          "realized",
          ["سود تحقق‌یافته", "Realized profit"],
          incomplete ? null : profit,
          [
            "برای اقلام خارج‌شده با هزینه ثبت‌شده؛ زیرمجموعه تعریف‌شده همین گزارش، نه مبلغ قابل جمع با سود عملیاتی",
            "Dispatched items with posted costs; defined scope of this report, not additive to operating profit",
          ],
          "/finance/profit?type=realized",
        ),
        metric(
          "replacement",
          ["سود جایگزینی", "Replacement-cost profit estimate"],
          null,
          [
            "نرخ جاری مواد کامل نیست؛ جایگزین سود تاریخی نیست",
            "Current material rates are incomplete; not a replacement for historical profit",
          ],
          "/finance/profit?type=replacement",
        ),
      ],
      inventory: [
        metric(
          "materials",
          ["مواد اولیه", "Raw materials"],
          "28600000",
          [
            "میانگین موزون تاریخی؛ نه نرخ جایگزینی",
            "Historical weighted average, not replacement rates",
          ],
          "/finance/inventory-value?type=materials",
        ),
        metric(
          "wip",
          ["تولید ناتمام", "Work in progress"],
          "12400000",
          [
            "هزینه منتقل‌شده به تولید؛ هنوز محصول قابل فروش نیست",
            "Costs transferred to production; not yet sellable goods",
          ],
          "/finance/inventory-value?type=wip",
        ),
        metric(
          "finished",
          ["محصول نهایی", "Finished goods"],
          "45300000",
          [
            "هزینه تخصیص‌یافته خروجی سالم تا تاریخ مبنا",
            "Allocated costs of approved output at the snapshot date",
          ],
          "/finance/inventory-value?type=finished",
        ),
      ],
      incomplete,
      cogs,
      fees,
      directCosts: direct,
      operatingCosts: operating,
    },
    balances: {
      accounts,
      total: addMoney(...accounts.map((a) => a.balance)),
      receivables: "18600000",
      payables: "32750000",
      basis: DEMO_FINANCE_BASIS,
    },
    flow: {
      rows: [
        {
          label: ["دریافت مستقیم مشتری", "Direct customer receipts"],
          receipts: addMoney(
            ...posted.filter((d) => d.id.startsWith("RC")).map((d) => d.amount),
          ),
          payments: "0",
        },
        {
          label: ["تسویه طلب درگاه", "Gateway receivable settlement"],
          receipts: addMoney(
            ...posted.filter((d) => d.id.startsWith("GS")).map((d) => d.amount),
          ),
          payments: "0",
        },
        {
          label: ["پرداخت تأمین‌کننده", "Supplier payments"],
          receipts: "0",
          payments: addMoney(
            ...posted.filter((d) => d.id.startsWith("PY")).map((d) => d.amount),
          ),
        },
        {
          label: ["هزینه و اصلاح ثبت‌شده", "Posted expenses & corrections"],
          receipts: "0",
          payments: addMoney(
            ...posted
              .filter((d) => d.direction === "out" && !d.id.startsWith("PY"))
              .map((d) => d.amount),
          ),
        },
      ],
      receipts: receipt,
      payments: payment,
      net: subtractMoney(receipt, payment),
    },
    gateway: {
      confirmed: addMoney(
        ...(request.mode === "empty"
          ? []
          : gatewayPaymentFacts.filter(
              (fact) => fact.date >= request.start && fact.date <= request.end,
            )
        ).map((fact) => fact.amount),
      ),
      receivables: "18600000",
      settlements: addMoney(
        ...posted.filter((d) => d.id.startsWith("GS")).map((d) => d.amount),
      ),
      fees,
      discrepancies: 3,
      registered: "21150000",
      matched: "21000000",
      refundRows: [
        { status: ["درخواست‌شده", "Requested"], count: 2, amount: "740000" },
        {
          status: [
            "تأییدشده؛ هنوز واریز نشده",
            "Approved; not yet transferred",
          ],
          count: 1,
          amount: "370000",
        },
        { status: ["در حال انجام", "Processing"], count: 1, amount: "485000" },
        { status: ["تکمیل‌شده", "Completed"], count: 2, amount: "4250000" },
        {
          status: ["ناموفق / نیازمند رسیدگی", "Failed / needs review"],
          count: 1,
          amount: "370000",
        },
      ],
    },
    documents: { rows: included },
  }
  // Estimated active work and snapshot inventory are independent of empty periods.
  return result[key]
}
export const demoFinanceService: FinanceService = {
  async load(section, request, signal) {
    if (!financePermissions(request.role).view || request.mode === "denied")
      throw new Error("FORBIDDEN")
    if (!request.start || !request.end || request.start > request.end)
      throw new Error("INVALID_RANGE")
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 280)
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer)
          reject(new DOMException("Aborted", "AbortError"))
        },
        { once: true },
      )
    })
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    if (
      request.mode === "error" ||
      (request.mode === "partial" && section === "performance")
    )
      throw new Error("NETWORK")
    return {
      data: createSection(section, request),
      receivedAt: new Date().toISOString(),
      demo: true,
      stale: request.mode === "stale",
    }
  },
}
