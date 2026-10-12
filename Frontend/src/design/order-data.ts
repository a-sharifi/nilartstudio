export type OrderText = readonly [string, string]
export type OrderRole = "owner" | "finance" | "warehouse"
export type OrderState = "normal" | "loading" | "empty" | "error" | "partial" | "denied" | "conflict"
export interface OrderItem {
  title: OrderText
  sku: string
  quantity: number
  options: OrderText
  components?: readonly OrderText[]
}
export interface AdminOrder {
  id: string
  createdAt: string
  customer: OrderText
  type: string
  delivery: string
  payment: string
  operation: string
  shipment: string
  request: string
  method: string
  attention: string[]
  items: OrderItem[]
  amount?: number
  currency: "toman"
  revision: number
}
export interface OrderFilters {
  query: string
  start: string
  end: string
  payment: string
  operation: string
  type: string
  delivery: string
  request: string
  method: string
  attention: string
  sort: string
  page: number
}
export const initialOrderFilters: OrderFilters = {
  query: "",
  start: "",
  end: "",
  payment: "",
  operation: "",
  type: "",
  delivery: "",
  request: "",
  method: "",
  attention: "",
  sort: "newest",
  page: 1,
}
export const orderOptions: Record<string, Record<string, OrderText>> = {
  payment: {
    confirmed: ["تأییدشده", "Confirmed"],
    verification: ["در حال بررسی", "Under verification"],
    failed: ["ناموفق", "Failed"],
    cancelled: ["لغوشده", "Cancelled"],
  },
  operation: {
    allocation: ["مشکل تخصیص", "Allocation issue"],
    preparation: ["آماده آماده‌سازی", "Ready for preparation"],
    shipping: ["آماده ارسال", "Ready to ship"],
    working: ["اجرای نقاشی", "Artwork in progress"],
    assignment: ["منتظر تخصیص هنرمند", "Awaiting artist assignment"],
    complete: ["تکمیل‌شده", "Completed"],
    hold: ["متوقف برای بررسی", "On hold for review"],
  },
  shipment: {
    pending: ["هنوز تحویل نشده", "Not delivered yet"],
    partial: ["بخشی ارسال شده", "Partially shipped"],
    digital: ["تحویل دیجیتال آماده", "Digital delivery ready"],
    shipped: ["ارسال‌شده", "Shipped"],
    delivered: ["تحویل‌شده", "Delivered"],
  },
  type: {
    goods: ["کالای آماده", "Ready goods"],
    package: ["پکیج", "Package"],
    artwork: ["نقاشی آماده", "Ready artwork"],
    commission: ["نقاشی سفارشی", "Commission"],
    mixed: ["مختلط", "Mixed"],
  },
  delivery: {
    physical: ["فیزیکی", "Physical"],
    digital: ["دیجیتال", "Digital"],
    mixed: ["مختلط", "Mixed"],
  },
  request: {
    none: ["بدون درخواست", "No request"],
    return: ["مرجوعی منتظر بررسی", "Return awaiting review"],
    support: ["تیکت باز", "Open support ticket"],
  },
  method: {
    post: ["پست", "Post"],
    courier: ["پیک", "Courier"],
    digital: ["دیجیتال", "Digital"],
  },
  attention: {
    payment: ["پرداخت نیازمند بررسی", "Payment review required"],
    allocation: ["پرداخت موفق، مشکل تخصیص", "Paid, allocation issue"],
    preparation: ["آماده آماده‌سازی", "Ready for preparation"],
    shipping: ["آماده ارسال", "Ready to ship"],
    return: ["مرجوعی نیازمند بررسی", "Returns awaiting review"],
    commission: [
      "نقاشی نیازمند بررسی یا تخصیص",
      "Commissions awaiting review or assignment",
    ],
  },
}
const notebook: OrderItem = {
  title: ["دفتر باغ خیال", "Garden notebook"],
  sku: "NB-GARDEN-A5",
  quantity: 2,
  options: [
    "A5 · ۸۰ برگ برای هر دفتر · سبز",
    "A5 · 80 sheets per notebook · green",
  ],
}
const pack: OrderItem = {
  title: ["پکیج روزهای آرام", "Quiet days package"],
  sku: "PK-QUIET-01",
  quantity: 1,
  options: ["گزینه‌های ثبت‌شده هنگام خرید", "Options recorded at purchase"],
  components: [
    ["۱ دفتر A5 · ۸۰ برگ", "1 A5 notebook · 80 sheets"],
    ["۲ نشان‌کتاب", "2 bookmarks"],
    ["۱ کارت هنری", "1 art card"],
  ],
}
const art: OrderItem = {
  title: ["نقاشی آبی آرام", "Quiet blue artwork"],
  sku: "PAINT-BLUE-02",
  quantity: 1,
  options: [
    "آبرنگ · ۳۰ × ۴۰ · قاب طبیعی",
    "Watercolor · 30 × 40 · natural frame",
  ],
}
const custom: OrderItem = {
  title: ["پرتره سفارشی", "Custom portrait"],
  sku: "COMM-PORTRAIT",
  quantity: 1,
  options: ["دیجیتال · ۳۰۰۰ × ۴۰۰۰ پیکسل", "Digital · 3000 × 4000 pixels"],
}
// Fictional historical snapshots. No phone numbers, private references or gateway secrets.
const fixtures: AdminOrder[] = [
  {
    id: "NA-1058",
    createdAt: "2026-06-14T10:32:00Z",
    customer: ["مریم ر.", "Maryam R."],
    type: "goods",
    delivery: "physical",
    payment: "verification",
    operation: "hold",
    shipment: "pending",
    request: "none",
    method: "post",
    attention: ["payment"],
    items: [notebook],
    amount: 370000,
    currency: "toman",
    revision: 1,
  },
  {
    id: "NA-1057",
    createdAt: "2026-06-14T09:45:00Z",
    customer: ["علی م.", "Ali M."],
    type: "package",
    delivery: "physical",
    payment: "confirmed",
    operation: "allocation",
    shipment: "pending",
    request: "none",
    method: "courier",
    attention: ["allocation"],
    items: [pack],
    amount: 485000,
    currency: "toman",
    revision: 2,
  },
  {
    id: "NA-1056",
    createdAt: "2026-06-14T08:15:00Z",
    customer: ["نگار ک.", "Negar K."],
    type: "mixed",
    delivery: "mixed",
    payment: "confirmed",
    operation: "working",
    shipment: "partial",
    request: "support",
    method: "post",
    attention: [],
    items: [pack, custom],
    amount: 3285000,
    currency: "toman",
    revision: 3,
  },
  {
    id: "NA-1055",
    createdAt: "2026-06-13T14:20:00Z",
    customer: ["سارا ح.", "Sara H."],
    type: "artwork",
    delivery: "physical",
    payment: "confirmed",
    operation: "shipping",
    shipment: "pending",
    request: "none",
    method: "post",
    attention: ["shipping"],
    items: [art],
    amount: 2450000,
    currency: "toman",
    revision: 1,
  },
  {
    id: "NA-1054",
    createdAt: "2026-06-13T12:05:00Z",
    customer: ["آرمان ن.", "Arman N."],
    type: "goods",
    delivery: "physical",
    payment: "confirmed",
    operation: "preparation",
    shipment: "pending",
    request: "none",
    method: "courier",
    attention: ["preparation"],
    items: [notebook],
    amount: 370000,
    currency: "toman",
    revision: 1,
  },
  {
    id: "NA-1053",
    createdAt: "2026-06-13T09:10:00Z",
    customer: ["یاسمن ص.", "Yasaman S."],
    type: "commission",
    delivery: "digital",
    payment: "confirmed",
    operation: "assignment",
    shipment: "pending",
    request: "none",
    method: "digital",
    attention: ["commission"],
    items: [custom],
    amount: 2800000,
    currency: "toman",
    revision: 1,
  },
  {
    id: "NA-1052",
    createdAt: "2026-06-12T16:10:00Z",
    customer: ["رضا ب.", "Reza B."],
    type: "package",
    delivery: "physical",
    payment: "confirmed",
    operation: "complete",
    shipment: "delivered",
    request: "return",
    method: "post",
    attention: ["return"],
    items: [pack],
    amount: 485000,
    currency: "toman",
    revision: 2,
  },
  {
    id: "NA-1051",
    createdAt: "2026-06-12T13:00:00Z",
    customer: ["پریسا د.", "Parisa D."],
    type: "commission",
    delivery: "digital",
    payment: "confirmed",
    operation: "complete",
    shipment: "digital",
    request: "none",
    method: "digital",
    attention: [],
    items: [custom],
    amount: 2800000,
    currency: "toman",
    revision: 1,
  },
  {
    id: "NA-1050",
    createdAt: "2026-06-11T08:40:00Z",
    customer: ["کیان الف.", "Kian A."],
    type: "goods",
    delivery: "physical",
    payment: "failed",
    operation: "hold",
    shipment: "pending",
    request: "none",
    method: "post",
    attention: [],
    items: [notebook],
    amount: 370000,
    currency: "toman",
    revision: 1,
  },
  {
    id: "NA-1049",
    createdAt: "2026-06-10T11:05:00Z",
    customer: ["مهسا ف.", "Mahsa F."],
    type: "artwork",
    delivery: "physical",
    payment: "cancelled",
    operation: "hold",
    shipment: "pending",
    request: "none",
    method: "courier",
    attention: [],
    items: [art],
    amount: 2450000,
    currency: "toman",
    revision: 1,
  },
]
export function normalizeOrderSearch(value: string) {
  return value
    .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim()
    .toLowerCase()
}
function scopeOrder(order: AdminOrder, role: OrderRole): AdminOrder {
  const { amount, ...safe } = order
  return structuredClone(role === "warehouse" ? safe : order)
}
export interface OrderResponse {
  orders: AdminOrder[]
  total: number
  pageSize: number
  queues: Record<string, number> | null
  loadedAt: string
  options: typeof orderOptions
}
export interface OrderService {
  list(
    filters: OrderFilters,
    role: OrderRole,
    mode: OrderState,
    signal: AbortSignal,
  ): Promise<OrderResponse>
  preview(id: string, role: OrderRole, signal: AbortSignal): Promise<AdminOrder>
}
async function wait(signal: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 320)
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
}
export const demoOrderService: OrderService = {
  async list(filters, role, mode, signal) {
    await wait(signal)
    if (mode === "error") throw new Error("NETWORK")
    if (mode === "denied") throw new Error("FORBIDDEN")
    const all =
      mode === "empty"
        ? []
        : fixtures.filter(
            (order) => role !== "warehouse" || order.delivery !== "digital",
          )
    const query = normalizeOrderSearch(filters.query)
    const matched = all
      .filter((order) => {
        const haystack =
          role === "warehouse"
            ? order.id
            : order.id + " " + order.customer.join(" ")
        if (query && !normalizeOrderSearch(haystack).includes(query))
          return false
        if (filters.start && order.createdAt.slice(0, 10) < filters.start)
          return false
        if (filters.end && order.createdAt.slice(0, 10) > filters.end)
          return false
        return (
          ([
            "payment",
            "operation",
            "type",
            "delivery",
            "request",
            "method",
          ] as const).every(
            (key) => !filters[key] || order[key] === filters[key],
          ) &&
          (!filters.attention || order.attention.includes(filters.attention))
        )
      })
      .sort((a, b) =>
        filters.sort === "oldest"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
      )
    const options = structuredClone(orderOptions)
    if (role === "warehouse") {
      delete options.attention.payment
      delete options.attention.allocation
      delete options.attention.commission
    }
    const queues =
      mode === "partial"
        ? null
        : Object.fromEntries(
            Object.keys(options.attention).map((key) => [
              key,
              all.filter((o) => o.attention.includes(key)).length,
            ]),
          )
    return {
      orders: matched
        .slice((filters.page - 1) * 6, filters.page * 6)
        .map((o) => scopeOrder(o, role)),
      total: matched.length,
      pageSize: 6,
      queues,
      loadedAt: new Date().toISOString(),
      options,
    }
  },
  async preview(id, role, signal) {
    await wait(signal)
    const order = fixtures.find((o) => o.id === id)
    if (!order || (role === "warehouse" && order.delivery === "digital"))
      throw new Error("NOT_FOUND")
    return scopeOrder(order, role)
  },
}
