export type OpsText = readonly [string, string]
export type OpsRole = "owner" | "warehouse" | "finance" | "production"
export type StockType = "finished" | "materials" | "wip" | "bundles"
export type OpsMode = "normal" | "loading" | "empty" | "error" | "partial" | "conversion" | "conflict" | "denied"
export interface OpsPermissions {
  view: boolean
  receive: boolean
  consume: boolean
  adjust: boolean
  qc: boolean
  value: boolean
}
export function opsPermissions(role: OpsRole): OpsPermissions {
  return {
    view: true,
    receive: role === "owner" || role === "warehouse",
    consume: role === "owner" || role === "production",
    adjust: role === "owner",
    qc: role === "owner" || role === "production",
    value: role === "owner" || role === "finance",
  }
}
export interface StockItem {
  code: string
  name: OpsText
  specs: OpsText
  type: StockType
  unit: OpsText
  family: string
  collection: string
  collections?: string[]
  physical: string | null
  reserved: string | null
  allocated: string | null
  allocationInReserved: boolean
  available: string | null
  quarantine: string | null
  threshold: string | null
  status: "healthy" | "low" | "review" | "qc" | "incomplete"
  batch?: string
  bom?: string
  target?: string
  approved?: string
  limiting?: OpsText
  requirements?: BundleRequirement[]
  historicalValue?: string
}
export interface OpsFilters {
  type: StockType
  query: string
  family: string
  collection: string
  status: string
  unit: string
  batch: string
  page: number
}
export const initialOpsFilters: OpsFilters = {
  type: "finished",
  query: "",
  family: "",
  collection: "",
  status: "",
  unit: "",
  batch: "",
  page: 1,
}
export interface PurchaseSummary {
  id: string
  supplier: OpsText
  at: string
  items: OpsText
  receipt: "pending" | "partial" | "draft"
  payment?: OpsText
  conversionReady: boolean
}
export interface ProductionBatch {
  id: string
  sku: string
  bom: string
  title: OpsText
  target: string
  approved: string
  waste: string
  unit: OpsText
  consumption: OpsText
  stage: "working" | "qc" | "correction"
  due: string | null
}
export interface Reservation {
  id: string
  order: string
  sku: string
  quantity: string
  unit: OpsText
  status: OpsText
  expiresAt: string | null
}
export interface OpsSummary {
  alerts: {
    key: string
    title: OpsText
    count: number
    description: OpsText
    route: string
    filter?: Partial<OpsFilters>
  }[]
  metrics: OpsMetric[]
  purchases: PurchaseSummary[]
  batches: ProductionBatch[]
  reservations: Reservation[]
  receivedAt: string
}
export interface OpsInventoryResponse {
  items: StockItem[]
  total: number
  pageSize: number
  receivedAt: string
  formula: OpsText
}
export interface StockMovement {
  id: string
  at: string
  type: OpsText
  quantity: string
  unit: OpsText
  reference: string
  actor: OpsText
}
export interface StockDetail {
  item: StockItem
  movements: StockMovement[]
  revision: number
}
export interface OpsService {
  inventory(
    filters: OpsFilters,
    role: OpsRole,
    mode: OpsMode,
    signal: AbortSignal,
  ): Promise<OpsInventoryResponse>
  summary(
    role: OpsRole,
    mode: OpsMode,
    signal: AbortSignal,
  ): Promise<OpsSummary>
  detail(code: string, role: OpsRole, signal: AbortSignal): Promise<StockDetail>
}
export function exactQuantity(value: string) {
  if (!/^-?\d+$/.test(value)) throw new Error("INVALID_QUANTITY")
  return BigInt(value)
}
export function deriveSellable(
  physical: string,
  reserved: string,
  allocated: string,
  quarantine: string,
  allocationInReserved: boolean,
): string {
  const result =
    exactQuantity(physical) -
    exactQuantity(reserved) -
    exactQuantity(quarantine) -
    (allocationInReserved ? 0n : exactQuantity(allocated))
  if (result < 0n) throw new Error("NEGATIVE_STOCK")
  return result.toString()
}
export function deriveBundle(
  requirements: BundleRequirement[],
  available: Record<string, string>,
) {
  const totals = new Map<string, bigint>()
  for (const row of requirements) {
    const required = exactQuantity(row.quantity)
    if (required <= 0n) throw new Error("INVALID_REQUIREMENT")
    totals.set(row.code, (totals.get(row.code) ?? 0n) + required)
  }
  if (!totals.size) throw new Error("EMPTY_BUNDLE")
  let capacity: bigint | null = null,
    limiting = ""
  for (const [code, quantity] of totals) {
    if (available[code] === undefined) throw new Error("UNKNOWN_COMPONENT")
    const stock = exactQuantity(available[code])
    if (stock < 0n) throw new Error("NEGATIVE_STOCK")
    const units = stock / quantity
    if (capacity === null || units < capacity) {
      capacity = units
      limiting = code
    }
  }
  return {
    capacity: capacity!.toString(),
    limiting,
    requirements: Array.from(totals, ([code, quantity]) => ({
      code,
      quantity: quantity.toString(),
    })),
  }
}
export function normalizeOpsQuery(value: string) {
  return value
    .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim()
    .toLowerCase()
}
// Configured fictional thresholds, not UI-invented warning levels.
const demoThresholds: Record<string, string> = {
  "NB-GARDEN-A5": "10",
  "NB-BLUE-A5": "12",
  "BM-GARDEN": "8",
  "CARD-QUIET": "10",
  "ART-BLUE-01": "1",
  "NB-SAND-A6": "10",
  "ST-BOTANIC": "5",
  "MAT-PAPER-200": "30",
  "MAT-PAPER-300": "20",
  "MAT-RIBBON": "10",
  "MAT-PIGMENT": "500",
  "MAT-BOARD": "15",
}
const unitPiece: OpsText = ["عدد", "pcs"],
  unitSheet: OpsText = ["ورق", "sheets"]
const productFacts = [
  {
    code: "NB-GARDEN-A5",
    name: ["دفتر باغ خیال", "Garden notebook"] as OpsText,
    specs: [
      "A5 · ۱۰۰ گرم · ۸۰ برگ · جلد سبز",
      "A5 · 100 gsm · 80 sheets · green cover",
    ] as OpsText,
    physical: "32",
    reserved: "9",
    allocated: "6",
    quarantine: "2",
    family: "notebook",
    collection: "garden",
  },
  {
    code: "NB-BLUE-A5",
    name: ["دفتر آبی آرام", "Quiet blue notebook"] as OpsText,
    specs: [
      "A5 · ۱۰۰ گرم · ۸۰ برگ · جلد آبی",
      "A5 · 100 gsm · 80 sheets · blue cover",
    ] as OpsText,
    physical: "14",
    reserved: "8",
    allocated: "5",
    quarantine: "1",
    family: "notebook",
    collection: "quiet",
  },
  {
    code: "BM-GARDEN",
    name: ["نشان‌کتاب باغ", "Garden bookmark"] as OpsText,
    specs: ["مقوای ۳۰۰ گرم · تک‌طرح", "300 gsm card · single design"] as OpsText,
    physical: "12",
    reserved: "8",
    allocated: "4",
    quarantine: "0",
    family: "paper",
    collection: "garden",
  },
  {
    code: "CARD-QUIET",
    name: ["کارت روزهای آرام", "Quiet days card"] as OpsText,
    specs: [
      "۱۰ × ۱۵ سانتی‌متر · تک‌طرح",
      "10 × 15 cm · single design",
    ] as OpsText,
    physical: "46",
    reserved: "5",
    allocated: "2",
    quarantine: "0",
    family: "paper",
    collection: "quiet",
  },
  {
    code: "ART-BLUE-01",
    name: ["نقاشی آبی آرام", "Quiet blue artwork"] as OpsText,
    specs: [
      "آبرنگ · ۳۰ × ۴۰ · نسخه یکتا",
      "Watercolor · 30 × 40 · unique piece",
    ] as OpsText,
    physical: "1",
    reserved: "1",
    allocated: "1",
    quarantine: "0",
    family: "artwork",
    collection: "quiet",
  },
  {
    code: "NB-SAND-A6",
    name: ["دفتر شنی", "Sand notebook"] as OpsText,
    specs: [
      "A6 · ۸۰ گرم · ۶۰ برگ · جلد کرم",
      "A6 · 80 gsm · 60 sheets · cream cover",
    ] as OpsText,
    physical: "28",
    reserved: "4",
    allocated: "2",
    quarantine: "0",
    family: "notebook",
    collection: "garden",
  },
  {
    code: "ST-BOTANIC",
    name: ["برچسب گیاهان", "Botanical stickers"] as OpsText,
    specs: ["یک ورق برچسب · ۶ طرح", "One sticker sheet · 6 designs"] as OpsText,
    physical: "18",
    reserved: "3",
    allocated: "1",
    quarantine: "0",
    family: "paper",
    collection: "garden",
  },
]
const finished: StockItem[] = productFacts.map((product) => {
  const available = deriveSellable(
    product.physical,
    product.reserved,
    product.allocated,
    product.quarantine,
    true,
  )
  return {
    ...product,
    collections:
      product.code === "NB-GARDEN-A5"
        ? ["garden", "quiet"]
        : [product.collection],
    type: "finished",
    unit: unitPiece,
    allocationInReserved: true,
    available,
    threshold: demoThresholds[product.code],
    status:
      exactQuantity(available) < exactQuantity(demoThresholds[product.code])
        ? "low"
        : "healthy",
  }
})
const materialFacts = [
  {
    code: "MAT-PAPER-200",
    name: ["کاغذ بافت‌دار ۲۰۰ گرم", "Textured paper 200 gsm"] as OpsText,
    specs: [
      "ورق مادر ۵۰ × ۷۰ · ۲۰۰ گرم",
      "50 × 70 parent sheet · 200 gsm",
    ] as OpsText,
    unit: unitSheet,
    physical: "22",
    available: "12",
    quarantine: "10",
    status: "low" as const,
    value: "1850000",
  },
  {
    code: "MAT-PAPER-300",
    name: ["مقوای ۳۰۰ گرم", "Cardstock 300 gsm"] as OpsText,
    specs: [
      "ورق مادر ۵۰ × ۷۰؛ تبدیل بسته ناقص",
      "50 × 70 parent sheet; pack conversion incomplete",
    ] as OpsText,
    unit: unitSheet,
    physical: "35",
    available: "35",
    quarantine: "0",
    status: "incomplete" as const,
    value: "2450000",
  },
  {
    code: "MAT-RIBBON",
    name: ["روبان کتان", "Cotton ribbon"] as OpsText,
    specs: [
      "عرض ۱۰ میلی‌متر؛ مصرف به متر",
      "10 mm width; consumed in meters",
    ] as OpsText,
    unit: ["متر", "m"] as OpsText,
    physical: "8",
    available: "6",
    quarantine: "2",
    status: "low" as const,
    value: "420000",
  },
  {
    code: "MAT-PIGMENT",
    name: ["رنگ آبی", "Blue pigment"] as OpsText,
    specs: ["واحد پایه مصرف: گرم", "Base consumption unit: grams"] as OpsText,
    unit: ["گرم", "g"] as OpsText,
    physical: "4200",
    available: "4000",
    quarantine: "200",
    status: "healthy" as const,
    value: "3200000",
  },
  {
    code: "MAT-BOARD",
    name: ["مقوای جلد", "Cover board"] as OpsText,
    specs: ["۲ میلی‌متر · ورق مادر", "2 mm · parent sheets"] as OpsText,
    unit: unitSheet,
    physical: "54",
    available: "54",
    quarantine: "0",
    status: "healthy" as const,
    value: "1980000",
  },
]
const materials: StockItem[] = materialFacts.map(({ value, ...item }) => ({
  ...item,
  type: "materials",
  family: "material",
  collection: "",
  reserved: null,
  allocated: null,
  allocationInReserved: false,
  threshold: demoThresholds[item.code],
  historicalValue: value,
}))
const batches: ProductionBatch[] = [
  {
    id: "BCH-024",
    sku: "NB-GARDEN-A5",
    bom: "BOM-NB-A5 · v3",
    title: ["دفتر باغ خیال", "Garden notebook"],
    target: "60",
    approved: "42",
    waste: "2",
    unit: unitPiece,
    consumption: [
      "۱۲۰ ورق مادر ثبت‌شده؛ برآورد ۱۲۵ ورق",
      "120 parent sheets posted; estimate 125 sheets",
    ],
    stage: "qc",
    due: "2026-06-18T12:00:00Z",
  },
  {
    id: "BCH-025",
    sku: "BM-GARDEN",
    bom: "BOM-BM · v2",
    title: ["نشان‌کتاب باغ", "Garden bookmark"],
    target: "100",
    approved: "0",
    waste: "0",
    unit: unitPiece,
    consumption: [
      "۲۰ ورق مادر ثبت‌شده؛ برآورد ۲۴ ورق",
      "20 parent sheets posted; estimate 24 sheets",
    ],
    stage: "working",
    due: null,
  },
  {
    id: "BCH-026",
    sku: "NB-BLUE-A5",
    bom: "BOM-NB-A5 · v3",
    title: ["دفتر آبی آرام", "Quiet blue notebook"],
    target: "40",
    approved: "16",
    waste: "1",
    unit: unitPiece,
    consumption: [
      "۸۰ ورق مادر ثبت‌شده؛ برآورد ۸۵ ورق",
      "80 parent sheets posted; estimate 85 sheets",
    ],
    stage: "correction",
    due: "2026-06-19T12:00:00Z",
  },
]
const wip: StockItem[] = batches.map((batch) => ({
  code: batch.id,
  name: batch.title,
  specs: [
    "خروجی بررسی‌نشده قابل فروش نیست",
    "Uninspected output is not sellable",
  ],
  type: "wip",
  unit: batch.unit,
  family: "production",
  collection: "",
  physical: null,
  reserved: null,
  allocated: null,
  allocationInReserved: false,
  available: null,
  quarantine: null,
  threshold: null,
  status:
    batch.stage === "qc"
      ? "qc"
      : batch.stage === "correction"
        ? "review"
        : "healthy",
  batch: batch.id,
  bom: batch.bom,
  target: batch.target,
  approved: batch.approved,
}))
const bundleDefinitions = [
  {
    code: "PK-QUIET-01",
    name: ["پکیج روزهای آرام", "Quiet days package"] as OpsText,
    specs: [
      "۲ دفتر باغ + ۲ نشان‌کتاب + ۱ کارت",
      "2 garden notebooks + 2 bookmarks + 1 card",
    ] as OpsText,
    requirements: [
      { code: "NB-GARDEN-A5", quantity: "1" },
      { code: "NB-GARDEN-A5", quantity: "1" },
      { code: "BM-GARDEN", quantity: "2" },
      { code: "CARD-QUIET", quantity: "1" },
    ],
  },
  {
    code: "PK-GARDEN-02",
    name: ["پکیج باغ کوچک", "Little garden package"] as OpsText,
    specs: [
      "۱ دفتر A6 + ۱ ورق برچسب",
      "1 A6 notebook + 1 sticker sheet",
    ] as OpsText,
    requirements: [
      { code: "NB-SAND-A6", quantity: "1" },
      { code: "ST-BOTANIC", quantity: "1" },
    ],
  },
]
const availableBySku = Object.fromEntries(
  finished.map((item) => [item.code, item.available!]),
)
const bundles: StockItem[] = bundleDefinitions.map((bundle) => {
  const derived = deriveBundle(bundle.requirements, availableBySku)
  return {
    ...bundle,
    type: "bundles",
    unit: ["پکیج", "bundles"],
    family: "bundle",
    collection: "",
    physical: null,
    reserved: null,
    allocated: null,
    allocationInReserved: false,
    available: derived.capacity,
    quarantine: null,
    threshold: null,
    status: "healthy",
    limiting: finished.find((item) => item.code === derived.limiting)!.name,
    requirements: derived.requirements,
  }
})
const allStock = [...finished, ...materials, ...wip, ...bundles]
const productionCodes = new Set([
  "BCH-024",
  "NB-GARDEN-A5",
  "MAT-PAPER-200",
  "MAT-BOARD",
])
const authorizedStock = (role: OpsRole) =>
  role === "production"
    ? allStock.filter((item) => productionCodes.has(item.code))
    : allStock
const purchases: PurchaseSummary[] = [
  {
    id: "PO-0241",
    supplier: ["تأمین‌کننده کاغذ", "Paper supplier"],
    at: "2026-06-12T09:30:00Z",
    items: [
      "کاغذ ۲۰۰ گرم · ۱۰۰ ورق سفارش، ۴۰ ورق دریافت",
      "200 gsm paper · 100 sheets ordered, 40 received",
    ],
    receipt: "partial",
    payment: ["پرداخت جزئی", "Partially paid"],
    conversionReady: true,
  },
  {
    id: "PO-0243",
    supplier: ["تأمین‌کننده ملزومات", "Supplies vendor"],
    at: "2026-06-13T07:45:00Z",
    items: [
      "روبان کتان · ۵۰ متر سفارش، دریافت نشده",
      "Cotton ribbon · 50 m ordered, not received",
    ],
    receipt: "pending",
    payment: ["پرداخت‌شده؛ دریافت نشده", "Paid; not received"],
    conversionReady: true,
  },
  {
    id: "PO-0244",
    supplier: ["تأمین‌کننده مقوا", "Cardstock supplier"],
    at: "2026-06-14T10:00:00Z",
    items: [
      "مقوای ۳۰۰ گرم · واحد خرید بسته؛ تبدیل ناقص",
      "300 gsm cardstock · purchased in packs; conversion incomplete",
    ],
    receipt: "draft",
    payment: ["پیش‌نویس؛ قطعی نیست", "Draft; not posted"],
    conversionReady: false,
  },
]
const reservations: Reservation[] = [
  {
    id: "RSV-108",
    order: "NA-1058",
    sku: "NB-GARDEN-A5",
    quantity: "2",
    unit: unitPiece,
    status: [
      "پرداخت نامشخص؛ تطبیق پیش از آزادسازی",
      "Unknown payment; reconcile before release",
    ],
    expiresAt: "2026-06-14T12:30:00Z",
  },
  {
    id: "RSV-109",
    order: "NA-1057",
    sku: "BM-GARDEN",
    quantity: "2",
    unit: unitPiece,
    status: [
      "موفقیت دیرهنگام؛ بررسی تخصیص دوباره",
      "Late payment success; review reallocation",
    ],
    expiresAt: "2026-06-14T11:45:00Z",
  },
]
function scopeItem(item: StockItem, role: OpsRole): StockItem {
  const { historicalValue, ...safe } = item
  return structuredClone(opsPermissions(role).value ? item : safe)
}
async function delay(role: OpsRole, mode: OpsMode, signal: AbortSignal) {
  if (!opsPermissions(role).view || mode === "denied")
    throw new Error("FORBIDDEN")
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 300)
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
  if (mode === "error") throw new Error("NETWORK")
}
export const demoOpsService: OpsService = {
  async inventory(filters, role, mode, signal) {
    await delay(role, mode, signal)
    const query = normalizeOpsQuery(filters.query)
    const found = (mode === "empty" ? [] : authorizedStock(role)).filter(
      (item) =>
        item.type === filters.type &&
        (!query ||
          normalizeOpsQuery(item.code + " " + item.name.join(" ")).includes(
            query,
          )) &&
        (!filters.family || item.family === filters.family) &&
        (!filters.collection ||
          (item.collections ?? [item.collection]).includes(
            filters.collection,
          )) &&
        (!filters.status || item.status === filters.status) &&
        (!filters.unit || item.unit[1] === filters.unit) &&
        (!filters.batch || item.batch === filters.batch),
    )
    return {
      items: found
        .slice((filters.page - 1) * 5, filters.page * 5)
        .map((item) => scopeItem(item, role)),
      total: found.length,
      pageSize: 5,
      receivedAt: new Date().toISOString(),
      formula: [
        "قابل فروش = فیزیکی − رزرو − قرنطینه؛ تخصیص پرداخت‌شده زیرمجموعه رزرو است، دوباره کسر نمی‌شود.",
        "Sellable = physical − reserved − quarantine; paid allocations are included in reservations, not subtracted twice.",
      ],
    }
  },
  async summary(role, mode, signal) {
    await delay(role, mode, signal)
    if (mode === "partial") throw new Error("SUMMARY_NETWORK")
    const isEmpty = mode === "empty"
    const visible = isEmpty ? [] : authorizedStock(role)
    const visibleFinished = visible.filter((item) => item.type === "finished")
    const visibleMaterials = visible.filter((item) => item.type === "materials")
    const visibleBundles = visible.filter((item) => item.type === "bundles")
    const visibleBatches = isEmpty
      ? []
      : batches.filter(
          (batch) => role !== "production" || batch.id === "BCH-024",
        )
    const safePurchases =
      isEmpty || role === "production"
        ? []
        : purchases.map((purchase) => {
            const { payment, ...safe } = purchase
            return opsPermissions(role).value ? purchase : safe
          })
    return {
      alerts: [
        {
          key: "products",
          title: ["محصول کم‌موجود", "Low-stock products"],
          count: visibleFinished.filter((item) => item.status === "low").length,
          description: [
            "زیر آستانه ثبت‌شده SKU در تنظیمات نمونه",
            "Below SKU thresholds in sample settings",
          ],
          route: "/inventory?type=finished&status=low",
          filter: { type: "finished", status: "low" },
        },
        {
          key: "materials",
          title: ["مواد کم‌موجود", "Low-stock materials"],
          count: visibleMaterials.filter((item) => item.status === "low")
            .length,
          description: [
            "واحد و حد هشدار هر ماده مستقل است",
            "Each material has its own unit & threshold",
          ],
          route: "/inventory?type=materials&status=low",
          filter: { type: "materials", status: "low" },
        },
        {
          key: "purchases",
          title: ["خرید منتظر دریافت", "Purchases awaiting receipt"],
          count: safePurchases.filter(
            (purchase) => purchase.receipt !== "draft",
          ).length,
          description: [
            "پرداخت خرید به معنی دریافت واقعی نیست",
            "Payment does not mean goods were received",
          ],
          route: "/inventory/purchases?receipt=open",
        },
        {
          key: "qc",
          title: ["تولید منتظر کنترل کیفیت", "Production awaiting QC"],
          count: visibleBatches.filter((batch) => batch.stage === "qc").length,
          description: [
            "خروجی بررسی‌نشده قابل فروش نیست",
            "Uninspected output is not sellable",
          ],
          route: "/inventory/quality?status=pending",
          filter: { type: "wip", status: "qc" },
        },
        {
          key: "discrepancy",
          title: ["مغایرت موجودی", "Inventory discrepancies"],
          count: isEmpty || role === "production" ? 0 : 1,
          description: [
            "نیازمند سند و بررسی؛ بدون اصلاح بی‌ردپا",
            "Review with a document; no silent adjustment",
          ],
          route: "/inventory/adjustments?status=discrepancy",
        },
        {
          key: "reservations",
          title: ["رزرو نیازمند بررسی", "Reservations requiring review"],
          count: isEmpty || role === "production" ? 0 : reservations.length,
          description: [
            "تطبیق پرداخت قبل از تصمیم آزادسازی",
            "Reconcile payment before release decisions",
          ],
          route: "/inventory/movements?status=reservation-review",
        },
      ],
      metrics: [
        {
          label: ["SKU محصول نهایی", "Finished-product SKUs"],
          count: visibleFinished.length,
          definition: [
            "تعداد SKU یکتا؛ نه مجموع تعداد کالا یا کالکشن‌ها",
            "Unique SKUs, not combined stock or collection counts",
          ],
        },
        {
          label: ["ماده با واحد پایه", "Materials with base units"],
          count: visibleMaterials.length,
          definition: [
            "تعداد نوع ماده؛ ورق، متر و گرم جمع نشده‌اند",
            "Material types; sheets, meters & grams are not added",
          ],
        },
        {
          label: ["بچ جاری", "Active batches"],
          count: visibleBatches.length,
          definition: [
            "تولید ناتمام؛ هنوز موجودی قابل فروش نیست",
            "Work in progress, not yet sellable stock",
          ],
        },
        {
          label: ["پکیج با ظرفیت مشتق‌شده", "Bundles with derived capacity"],
          count: visibleBundles.length,
          definition: [
            "تعداد تعریف پکیج؛ بدون انبار مستقل",
            "Bundle definitions, no independent inventory",
          ],
        },
      ],
      purchases: safePurchases,
      batches: structuredClone(visibleBatches),
      reservations:
        isEmpty || role === "production" ? [] : structuredClone(reservations),
      receivedAt: new Date().toISOString(),
    }
  },
  async detail(code, role, signal) {
    await delay(role, "normal", signal)
    const item = authorizedStock(role).find((item) => item.code === code)
    if (!item) throw new Error("NOT_FOUND")
    const movements: StockMovement[] =
      item.code === "NB-GARDEN-A5"
        ? [
            {
              id: "ST-0041",
              at: "2026-06-12T08:10:00Z",
              type: [
                "دریافت خروجی سالم تأییدشده",
                "Approved production output received",
              ],
              quantity: "20",
              unit: item.unit,
              reference: "BCH-023",
              actor: ["مسئول تولید نمونه", "Sample production operator"],
            },
            {
              id: "ST-0048",
              at: "2026-06-13T11:00:00Z",
              type: ["خروج برای سفارش", "Dispatch for order"],
              quantity: "-2",
              unit: item.unit,
              reference: "NA-1046",
              actor: ["مسئول انبار نمونه", "Sample warehouse operator"],
            },
          ]
        : item.code === "MAT-PAPER-200"
          ? [
              {
                id: "RCV-019",
                at: "2026-06-12T09:30:00Z",
                type: ["دریافت مرتبط با خرید", "Purchase receipt"],
                quantity: "40",
                unit: item.unit,
                reference: "PO-0241",
                actor: ["مسئول انبار نمونه", "Sample warehouse operator"],
              },
            ]
          : []
    return { item: scopeItem(item, role), movements, revision: 3 }
  },
}

export interface BundleRequirement {
  code: string
  quantity: string
}
export interface OpsMetric {
  label: OpsText
  count: number
  definition: OpsText
}
