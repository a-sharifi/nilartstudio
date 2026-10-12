import { catalogBundles, catalogProducts } from "./catalog"
import {
  aggregateParts,
  bundleKey,
  calculateBundle,
  catsBundle,
  resolveBundle,
  type BundleCartLine,
} from "./bundle"
import type { CartLine } from "./product"
import type { Localized } from "./data"
import type { QuoteAcceptance } from "./quote"

export interface ArtCartLine {
  id: string
  kind: "artwork" | "commission"
  name: Localized
  style: Localized
  size: string
  execution: Localized
  status: "pending" | "confirmed" | "expired"
  price?: number
  quoteId?: string
  delivery?: "physical" | "digital"
  commissionAcceptance?: QuoteAcceptance
}
interface ProductShoppingLine {
  id: string
  kind: "product"
  data: CartLine
}
interface BundleShoppingLine {
  id: string
  kind: "bundle"
  data: BundleCartLine
}
interface ArtShoppingLine {
  id: string
  kind: "artwork" | "commission"
  data: ArtCartLine
}
export type ShoppingLine = ProductShoppingLine | BundleShoppingLine | ArtShoppingLine
export type CartIssue = "pending" | "expired" | "deleted" | "out-of-stock" | "quantity" | "shared-stock" | "price"
export interface EvaluatedLine {
  line: ShoppingLine
  name: Localized
  issue?: CartIssue
  currentPrice: number
  acceptedPrice: number
  basePrice: number
  bundleSaving: number
  quantity: number
  maxQuantity: number
  requirements: Map<string, number>
  newParts?: BundleCartLine["parts"]
  blockedParts: string[]
}
export interface CartSnapshot {
  products: CartLine[]
  bundles: BundleCartLine[]
  art: ArtCartLine[]
  livePrices?: Record<string, number>
  liveStocks?: Record<string, number>
}
export function shoppingLines(snapshot: CartSnapshot): ShoppingLine[] {
  return [
    ...snapshot.products.map((data) => ({
      id: `product:${data.skuId}`,
      kind: "product" as const,
      data,
    })),
    ...snapshot.bundles.map((data) => ({
      id: `bundle:${data.key}`,
      kind: "bundle" as const,
      data,
    })),
    ...snapshot.art.map((data) => ({
      id: `art:${data.id}`,
      kind: data.kind,
      data,
    })),
  ]
}
interface CartOverrides {
  stock: Record<string, number>
  prices: Record<string, number>
  deleted: Set<string>
}
export function cartOverrides(mode: string): CartOverrides {
  return {
    stock:
      mode === "stock-conflict"
        ? { "127-a5": 2 }
        : mode === "stock-reduced"
          ? { "127-a5": 1 }
          : mode === "bundle-unavailable"
            ? { sticker: 0 }
            : {},
    prices:
      mode === "price-change"
        ? { "127-a5": 205000 }
        : {} as Record<string, number>,
    deleted: mode === "deleted" ? new Set(["127-a5"]) : new Set<string>(),
  }
}
export function evaluateCart(
  snapshot: CartSnapshot,
  mode = "normal",
): EvaluatedLine[] {
  const overrides = cartOverrides(mode)
  overrides.prices = { ...overrides.prices, ...snapshot.livePrices }
  overrides.stock = { ...overrides.stock, ...snapshot.liveStocks }
  const allSKUs = catalogProducts.flatMap((product) => product.skus)
  const stockOf = (skuId: string) =>
    overrides.stock[skuId] ??
    allSKUs.find((sku) => sku.id === skuId)?.stock ??
    0
  const result = shoppingLines(snapshot).map((line): EvaluatedLine => {
    const basic = {
      line,
      requirements: new Map<string, number>(),
      quantity: 1,
      maxQuantity: 1,
      blockedParts: [] as string[],
      bundleSaving: 0,
    }
    if (line.kind === "product") {
      const sku = allSKUs.find((sku) => sku.id === line.data.skuId)
      const product = catalogProducts.find((product) =>
        product.skus.some((sku) => sku.id === line.data.skuId),
      )
      const stock = stockOf(line.data.skuId)
      const price =
        overrides.prices[line.data.skuId] ?? sku?.price ?? line.data.unitPrice
      const issue: CartIssue | undefined =
        !product?.published || overrides.deleted.has(line.data.skuId)
          ? "deleted"
          : !stock
            ? "out-of-stock"
            : !Number.isSafeInteger(line.data.quantity) ||
                line.data.quantity < 1 ||
                line.data.quantity > stock
              ? "quantity"
              : price !== line.data.unitPrice
                ? "price"
                : undefined
      return {
        ...basic,
        name: product?.name || ["محصول ذخیره‌شده", "Saved product"],
        currentPrice: price,
        acceptedPrice: line.data.unitPrice,
        basePrice: price,
        issue,
        quantity: line.data.quantity,
        maxQuantity: stock,
        requirements: new Map([[line.data.skuId, 1]]),
      }
    }
    if (line.kind === "bundle") {
      const bundle = catalogBundles.find(
        (bundle) => bundle.id === line.data.bundleId,
      )
      const currentParts = line.data.parts.map((part) => ({
        ...part,
        stock: stockOf(part.skuId),
        unitPrice:
          overrides.prices[part.skuId] ??
          allSKUs.find((sku) => sku.id === part.skuId)?.price ??
          part.unitPrice,
      }))
      const quote = calculateBundle(currentParts, {
        type: "fixed",
        amount: bundle?.discount || 0,
      })
      const blocked = currentParts
        .filter((part) => part.stock < part.quantity)
        .map((part) => part.skuId)
      const allowed =
        bundle &&
        bundle.components.length === currentParts.length &&
        bundle.components.every((component, index) => {
          const part = currentParts[index]
          return (
            component.productId === part.productId &&
            component.quantity === part.quantity &&
            (!component.allowedSkus ||
              component.allowedSkus.includes(part.skuId))
          )
        })
      const issue: CartIssue | undefined =
        !bundle?.published ||
        !allowed ||
        currentParts.some(
          (part) =>
            overrides.deleted.has(part.skuId) ||
            !allSKUs.some((sku) => sku.id === part.skuId),
        )
          ? "deleted"
          : quote.capacity === 0
            ? "out-of-stock"
            : !Number.isSafeInteger(line.data.quantity) ||
                line.data.quantity < 1 ||
                line.data.quantity > quote.capacity
              ? "quantity"
              : quote.price !== line.data.unitPrice
                ? "price"
                : undefined
      return {
        ...basic,
        name: bundle?.name || ["پکیج ذخیره‌شده", "Saved bundle"],
        issue,
        quantity: line.data.quantity,
        maxQuantity: quote.capacity,
        acceptedPrice: line.data.unitPrice,
        currentPrice: quote.price,
        basePrice: quote.separate,
        bundleSaving: quote.saving,
        requirements: new Map(
          aggregateParts(currentParts).map((part) => [
            part.skuId,
            part.quantity,
          ]),
        ),
        newParts: currentParts,
        blockedParts: blocked,
      }
    }
    const data = line.data
    const issue =
      data.status === "pending"
        ? "pending"
        : data.status === "expired"
          ? "expired"
          : data.price === undefined
            ? "pending"
            : undefined
    return {
      ...basic,
      name: data.name,
      issue,
      acceptedPrice: data.price || 0,
      currentPrice: data.price || 0,
      basePrice: data.price || 0,
    }
  })
  // Demand from otherwise payable rows is checked together, never row-by-row.
  const candidates = result.filter((row) => !row.issue)
  const demand = new Map<string, number>()
  for (const row of candidates)
    for (const [skuId, count] of row.requirements)
      demand.set(skuId, (demand.get(skuId) || 0) + count * row.quantity)
  for (const row of result) {
    for (const [skuId, count] of row.requirements) {
      const otherDemand =
        (demand.get(skuId) || 0) -
        (candidates.includes(row) ? count * row.quantity : 0)
      row.maxQuantity = Math.min(
        row.maxQuantity,
        Math.max(0, Math.floor((stockOf(skuId) - otherDemand) / count)),
      )
      if (!row.issue && (demand.get(skuId) || 0) > stockOf(skuId))
        row.issue = "shared-stock"
    }
  }
  return result
}
export interface CouponResult {
  code: string
  error?: "invalid" | "expired" | "minimum" | "ineligible" | "usage"
  eligibleSubtotal: number
  minimum: number
  discount: number
  byLine: Record<string, number>
}
export function evaluateCoupon(
  rows: EvaluatedLine[],
  code: string,
  stacking = false,
): CouponResult {
  const normalized = code.trim().toUpperCase()
  const eligible = rows.filter(
    (row) =>
      !row.issue &&
      (row.line.kind === "product" || (stacking && row.line.kind === "bundle")),
  )
  const subtotal = eligible.reduce(
    (sum, row) => sum + row.currentPrice * row.quantity,
    0,
  )
  const basic = {
    code: normalized,
    eligibleSubtotal: subtotal,
    minimum: normalized === "MINIMUM" ? 1000000 : 50000,
    discount: 0,
    byLine: {},
  }
  if (!normalized) return basic
  if (!["NILART10", "EXPIRED", "MINIMUM", "USED"].includes(normalized))
    return { ...basic, error: "invalid" }
  if (normalized === "EXPIRED") return { ...basic, error: "expired" }
  if (normalized === "USED") return { ...basic, error: "usage" }
  if (!eligible.length) return { ...basic, error: "ineligible" }
  if (subtotal < basic.minimum) return { ...basic, error: "minimum" }
  const byLine = Object.fromEntries(
    eligible.map((row) => [
      row.line.id,
      Math.min(
        row.currentPrice * row.quantity,
        Math.round(row.currentPrice * row.quantity * 0.1),
      ),
    ]),
  )
  return {
    ...basic,
    byLine,
    discount: Object.values(byLine).reduce((sum, amount) => sum + amount, 0),
  }
}
export function cartTotals(rows: EvaluatedLine[], coupon: CouponResult) {
  const ready = rows.filter((row) => !row.issue)
  const base = ready.reduce((sum, row) => sum + row.basePrice * row.quantity, 0)
  const bundleDiscount = ready.reduce(
    (sum, row) => sum + row.bundleSaving * row.quantity,
    0,
  )
  const codeDiscount = coupon.error ? 0 : coupon.discount
  return {
    base,
    bundleDiscount,
    codeDiscount,
    total: Math.max(0, base - bundleDiscount - codeDiscount),
    readyCount: ready.length,
    excludedCount: rows.length - ready.length,
    readyIds: ready.map((row) => row.line.id),
  }
}
export function canStoreCartItem(
  snapshot: CartSnapshot,
  id: string,
  mode = "normal",
) {
  const row = evaluateCart(snapshot, mode).find((row) => row.line.id === id)
  return (
    !!row &&
    (!row.issue || row.issue === "price") &&
    row.quantity >= 1 &&
    row.quantity <= row.maxQuantity
  )
}
const pendingRequest: ArtCartLine = {
  id: "demo-request",
  kind: "commission",
  name: ["درخواست نقاشی نمونه", "Sample commission request"],
  style: ["پرتره — نمونه", "Portrait — demo"],
  size: "A4",
  execution: ["اجرای دستی — نمونه", "Hand-painted — demo"],
  status: "pending",
}
export function demoCart(mode = "mixed"): CartSnapshot {
  const selection = { size: "A5", sheets: "50", cover: "2mm" }
  const parts = resolveBundle(selection)!
  const product: CartLine = {
    skuId: "127-a5",
    quantity: 2,
    unitPrice: 185000,
    selection,
  }
  const bundle: BundleCartLine = {
    key: bundleKey(parts),
    bundleId: catsBundle.id,
    quantity: 1,
    unitPrice: calculateBundle(parts).price,
    selection,
    parts,
  }
  if (mode === "empty") return { products: [], bundles: [], art: [] }
  if (mode === "only-pending")
    return { products: [], bundles: [], art: [{ ...pendingRequest }] }
  const art =
    mode === "approved-quote" || mode === "expired-quote"
      ? [
          {
            ...pendingRequest,
            id: "demo-final-quote",
            name: [
              "سفارش نقاشی با قیمت نهایی — نمونه",
              "Final-quote commission — demo",
            ] as Localized,
            status:
              mode === "expired-quote"
                ? "expired" as const
                : "confirmed" as const,
            quoteId: "DEMO-Q-01",
            price: 800000,
          },
        ]
      : mode === "original-artwork"
        ? [
            {
              ...pendingRequest,
              id: "demo-artwork",
              kind: "artwork" as const,
              name: ["اثر آماده نمونه", "Sample original artwork"] as Localized,
              status: "confirmed" as const,
              price: 650000,
            },
          ]
        : [{ ...pendingRequest }]
  // Explicit fixture action only; an actual empty cart is never auto-filled.
  const products =
    mode === "mixed"
      ? [
          product,
          {
            skuId: "bookmark-out",
            quantity: 1,
            unitPrice: 30000,
            selection: { size: "", sheets: "", cover: "" },
          },
        ]
      : [product]
  return { products, bundles: [bundle], art }
}
