import { catalogBundles, catalogProducts, type SKU } from "./catalog"
import { notebook, selectedSKU, type CartLine, type Selection } from "./product"
import type { Localized } from "./data"
import type { GalleryImage } from "./product"

export const bundleSlug = "cats-bundle"
export const catsBundle = catalogBundles.find(
  (bundle) => bundle.slug === bundleSlug,
)!
export const bundleCopy = {
  intro: [
    "چند محصول هماهنگ از کالکشن گربه، در یک مجموعه. گزینه دفترت را انتخاب کن و همه اجزا را با تخفیف پکیج بخر.",
    "Matching products from the Cats collection, together in one set. Choose your notebook options and buy the complete bundle at its bundle price.",
  ] as Localized,
  allowDiscountStacking: false,
}
export const bundleGallery: GalleryImage[] = [
  { label: ["همه اجزا", "Complete set"], view: "bundle" },
  { label: ["دفتر", "Notebook"], view: "notebook" },
  { label: ["دو استیکر", "Two stickers"], view: "stickers" },
  { label: ["نشانک", "Bookmark"], view: "bookmark" },
]
const notebookComponent = catsBundle.components.find(
  (component) => component.productId === notebook.id,
)!
export const allowedNotebookSKUs = notebook.skus.filter((sku) =>
  notebookComponent.allowedSkus?.includes(sku.id),
)
export interface BundlePart {
  name?:Localized
  productId: string
  skuId: string
  quantity: number
  unitPrice: number
  stock: number
}
export interface BundleDraft {
  selection: Selection
  quantity: string
}
export interface BundleCartLine {
  key: string
  bundleId: string
  quantity: number
  unitPrice: number
  selection: Selection
  parts: BundlePart[]
}
export function aggregateParts(parts: BundlePart[]) {
  const aggregated = new Map<string, BundlePart>()
  for (const part of parts) {
    const previous = aggregated.get(part.skuId)
    aggregated.set(part.skuId, {
      ...part,
      quantity: (previous?.quantity || 0) + part.quantity,
      stock: previous ? Math.min(previous.stock, part.stock) : part.stock,
    })
  }
  return [...aggregated.values()]
}
export function bundleCapacity(parts: BundlePart[]) {
  if (
    !parts.length ||
    parts.some((part) => !Number.isInteger(part.quantity) || part.quantity <= 0)
  )
    return 0
  return Math.max(
    0,
    Math.min(
      ...aggregateParts(parts).map((part) =>
        Math.floor(part.stock / part.quantity),
      ),
    ),
  )
}
interface DiscountPolicy {
  type: "fixed" | "percent"
  amount: number
}
export function discountAmount(total: number, discount: DiscountPolicy) {
  const value =
    discount.type === "fixed"
      ? discount.amount
      : Math.round((total * discount.amount) / 100)
  return Math.max(0, Math.min(total, value))
}
export function calculateBundle(
  parts: BundlePart[],
  discount = {
    type: "fixed" as "fixed" | "percent",
    amount: catsBundle.discount,
  },
) {
  const separate = parts.reduce(
    (sum, part) => sum + part.unitPrice * part.quantity,
    0,
  )
  const saving = discountAmount(separate, discount)
  return {
    separate,
    saving,
    price: separate - saving,
    capacity: bundleCapacity(parts),
  }
}
export function startingBundleQuote() {
  return allowedNotebookSKUs
    .map((sku) =>
      resolveBundle({
        size: sku.size!,
        sheets: String(sku.sheets),
        cover: sku.cover!,
      }),
    )
    .filter((parts): parts is BundlePart[] => !!parts)
    .map((parts) => calculateBundle(parts))
    .filter((quote) => quote.capacity > 0)
    .sort((a, b) => a.price - b.price)[0]
}
export function resolveBundle(
  selection: Selection,
  stocks: Record<string, number> = {},
  prices: Record<string, number> = {},
): BundlePart[] | undefined {
  const selected = selectedSKU(selection, allowedNotebookSKUs)
  if (!selected) return undefined
  const parts: BundlePart[] = []
  for (const component of catsBundle.components) {
    const product = catalogProducts.find(
      (product) => product.id === component.productId && product.published,
    )
    const sku: SKU | undefined =
      component.productId === notebook.id
        ? selected
        : product?.skus.find((sku) => component.allowedSkus?.includes(sku.id))
    if (!sku) return undefined
    parts.push({
      productId: component.productId,
      skuId: sku.id,
      quantity: component.quantity,
      unitPrice: prices[sku.id] ?? sku.price,
      stock: stocks[sku.id] ?? sku.stock,
    })
  }
  return parts
}
export const bundleKey = (parts: BundlePart[]) =>
  `${catsBundle.id}:${aggregateParts(parts)
    .map((part) => `${part.skuId}=${part.quantity}`)
    .sort()
    .join("|")}`
export function cartFitsStock(
  products: CartLine[],
  bundles: BundleCartLine[],
  overrides: Record<string, number> = {},
) {
  const required = new Map<string, number>()
  for (const line of products)
    required.set(line.skuId, (required.get(line.skuId) || 0) + line.quantity)
  for (const line of bundles)
    for (const part of aggregateParts(line.parts))
      required.set(
        part.skuId,
        (required.get(part.skuId) || 0) + part.quantity * line.quantity,
      )
  return [...required].every(([skuId, quantity]) => {
    const sku = catalogProducts
      .flatMap((product) => product.skus)
      .find((sku) => sku.id === skuId)
    return !!sku && quantity <= (overrides[skuId] ?? sku.stock)
  })
}
export function mergeBundleCart(
  lines: BundleCartLine[],
  line: BundleCartLine,
  products: CartLine[],
): BundleCartLine[] | null {
  if (
    !Number.isInteger(line.quantity) ||
    line.quantity < 1 ||
    line.quantity > bundleCapacity(line.parts)
  )
    return null
  const existing = lines.find((row) => row.key === line.key)
  const next = existing
    ? lines.map((row) =>
        row.key === line.key
          ? { ...line, quantity: row.quantity + line.quantity }
          : row,
      )
    : [...lines, line]
  const overrides = Object.fromEntries(
    aggregateParts(line.parts).map((part) => [part.skuId, part.stock]),
  )
  return cartFitsStock(products, next, overrides) ? next : null
}
