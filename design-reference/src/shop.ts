import { categories, collections, type Localized } from "./data"
import {
  catalogProducts,
  catalogBundles,
  itemOptions,
  type CatalogItem,
  type Filters,
  type SKU,
} from "./catalog"

export const shopCategories = categories.map((category) => ({
  ...category,
  slug: category.id,
  published: true,
  description: ({
    sketchbooks: [
      "دفترهای طراحی را با سایز، کاغذ و گزینه‌های موجود مقایسه کنید.",
      "Compare sketchbooks by size, paper and available options.",
    ],
    notebooks: [
      "دفترهای خط‌دار را بر اساس کالکشن و سایز موجود پیدا کنید.",
      "Find ruled notebooks by collection and available size.",
    ],
    stickers: [
      "استیکرهای کالکشن‌ها را برای جزئیات کوچک روزمره پیدا کنید.",
      "Discover collection stickers for the little details of everyday life.",
    ],
    bookmarks: [
      "نشانک‌های هنری را بر اساس کالکشن محبوبتان ببینید.",
      "Explore art-inspired bookmarks from your favorite collection.",
    ],
  } as Record<string, Localized>)[category.id],
}))
export type ShopFilters = Filters & {
  collection: string
  sheets: string
  cover: string
}
export type ShopQuery = {
  type: "all" | "products" | "bundles"
  sort: "newest" | "low" | "high"
  page: number
  filters: ShopFilters
}
export type ShopMode = "normal" | "loading" | "network" | "empty" | "image-error" | "all-unavailable" | "member" | "favorite-error" | "price-unknown"
export const emptyShopFilters: ShopFilters = {
  category: "",
  collection: "",
  size: "",
  weight: "",
  sheets: "",
  cover: "",
  min: "",
  max: "",
  stock: false,
}
export function shopScope(path: string) {
  return /^\/(fa|en)\/categories\/([^/]+)$/.exec(path)?.[2] || ""
}
export function isShopRoute(path: string) {
  return /^\/(fa|en)\/(shop|categories\/[^/]+)$/.test(path.split(/[?#]/)[0])
}
export function priceDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (char) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(char)))
    .replace(/[٠-٩]/g, (char) => String("٠١٢٣٤٥٦٧٨٩".indexOf(char)))
    .trim()
}
export function priceError(min: string, max: string) {
  const values = [min, max].map(priceDigits)
  if (
    values.some(
      (v) => v !== "" && (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v))),
    )
  )
    return "number"
  if (values[0] && values[1] && Number(values[0]) > Number(values[1]))
    return "order"
  return ""
}
export function shopFeatureChoices(category: string) {
  const paper = ["sketchbooks", "notebooks"].includes(category)
  const skus = paper
    ? catalogProducts
        .filter((p) => p.published && p.category === category)
        .flatMap((p) => p.skus)
    : []
  return {
    sizes: [
      ...new Set(skus.map((s) => s.size).filter((s): s is string => !!s)),
    ].sort(),
    weights: [
      ...new Set(
        skus.map((s) => s.weight).filter((s): s is number => s !== undefined),
      ),
    ].sort((a, b) => a - b),
    sheets: [
      ...new Set(
        skus.map((s) => s.sheets).filter((s): s is number => s !== undefined),
      ),
    ].sort((a, b) => a - b),
    covers: [
      ...new Set(
        skus.map((s) => s.cover).filter((s): s is "2mm" | "3mm" => !!s),
      ),
    ],
  }
}
export function normalizeShopFilters(
  filters: ShopFilters,
  scope = "",
): ShopFilters {
  const category =
    scope ||
    (shopCategories.some((c) => c.published && c.slug === filters.category)
      ? filters.category
      : "")
  const choices = shopFeatureChoices(category)
  return {
    ...filters,
    category,
    collection: collections.some(
      (c) => c.published && c.slug === filters.collection,
    )
      ? filters.collection
      : "",
    size: choices.sizes.includes(filters.size) ? filters.size : "",
    weight: choices.weights.map(String).includes(filters.weight)
      ? filters.weight
      : "",
    sheets: choices.sheets.map(String).includes(filters.sheets)
      ? filters.sheets
      : "",
    cover: choices.covers.some((c) => c === filters.cover) ? filters.cover : "",
    min: priceDigits(filters.min),
    max: priceDigits(filters.max),
  }
}
export function parseShopQuery(search: string, scope = ""): ShopQuery {
  const params = new URLSearchParams(search)
  const text = (key: string) => params.get(key) || ""
  const page = priceDigits(text("page"))
  const min = priceDigits(text("min")),
    max = priceDigits(text("max"))
  const validPrices = !priceError(min, max)
  return {
    type: scope
      ? "products"
      : text("type") === "products" || text("type") === "bundles"
        ? text("type") as ShopQuery["type"]
        : "all",
    sort:
      text("sort") === "low" || text("sort") === "high"
        ? text("sort") as ShopQuery["sort"]
        : "newest",
    page:
      /^\d+$/.test(page) &&
      Number.isSafeInteger(Number(page)) &&
      Number(page) > 0
        ? Number(page)
        : 1,
    filters: normalizeShopFilters(
      {
        category: text("category"),
        collection: text("collection"),
        size: text("size"),
        weight: priceDigits(text("weight")),
        sheets: priceDigits(text("sheets")),
        cover: text("cover"),
        min: validPrices ? min : "",
        max: validPrices ? max : "",
        stock: text("stock") === "1",
      },
      scope,
    ),
  }
}
export function serializeShopQuery(query: ShopQuery, scope = "") {
  const params = new URLSearchParams()
  if (query.type !== "all" && !scope) params.set("type", query.type)
  if (query.sort !== "newest") params.set("sort", query.sort)
  if (query.page > 1) params.set("page", String(query.page))
  for (const key of [
    "category",
    "collection",
    "size",
    "weight",
    "sheets",
    "cover",
    "min",
    "max",
  ] as const)
    if (query.filters[key] && !(scope && key === "category"))
      params.set(key, query.filters[key])
  if (query.filters.stock) params.set("stock", "1")
  return params.toString()
}
export function safeShopReturn(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//") || /[\\#]/.test(value))
    return null
  const [path, search = ""] = value.split("?")
  if (!isShopRoute(path)) return null
  const scope = shopScope(path)
  if (scope && !shopCategories.some((c) => c.published && c.slug === scope))
    return null
  const query = serializeShopQuery(parseShopQuery(search, scope), scope)
  return path + (query ? `?${query}` : "")
}
export function skuMatchesShop(sku: SKU, filters: ShopFilters) {
  return (
    (!filters.size || sku.size === filters.size) &&
    (!filters.weight || String(sku.weight) === filters.weight) &&
    (!filters.sheets || String(sku.sheets) === filters.sheets) &&
    (!filters.cover || sku.cover === filters.cover)
  )
}
export function shopResults(
  scope: string,
  query: ShopQuery,
  mode: ShopMode = "normal",
  source: CatalogItem[] = [...catalogProducts, ...catalogBundles],
) {
  if (scope && !shopCategories.some((c) => c.published && c.slug === scope))
    return []
  const filters = normalizeShopFilters(query.filters, scope)
  if (priceError(filters.min, filters.max) || mode === "empty") return []
  const unique = new Map(
    source.filter((item) => item.published).map((item) => [item.id, item]),
  )
  return [...unique.values()]
    .filter((item) => {
      if (filters.collection && !item.collections.includes(filters.collection))
        return false
      if (scope || filters.category)
        return (
          item.type === "product" &&
          item.category === (scope || filters.category) &&
          query.type !== "bundles"
        )
      return (
        query.type === "all" ||
        item.type === (query.type === "products" ? "product" : "bundle")
      )
    })
    .map((item) => {
      const options = itemOptions(item, mode === "all-unavailable").filter(
        (option) => {
          if (!option.parts.some((part) => skuMatchesShop(part.sku, filters)))
            return false
          const priced =
            Number.isFinite(option.price) &&
            option.price > 0 &&
            mode !== "price-unknown"
          if (filters.stock && (!option.available || !priced)) return false
          if (filters.min || filters.max) {
            if (!option.available || !priced) return false
            if (filters.min && option.price < Number(filters.min)) return false
            if (filters.max && option.price > Number(filters.max)) return false
          }
          return true
        },
      )
      const buyable = options
        .filter(
          (o) =>
            o.available &&
            Number.isFinite(o.price) &&
            o.price > 0 &&
            mode !== "price-unknown",
        )
        .sort((a, b) => a.price - b.price)
      return {
        item,
        options,
        buyable,
        price: buyable[0]?.price,
        unavailableReason: mode === "price-unknown" ? "unknown" : "stock",
        from: new Set(buyable.map((o) => o.price)).size > 1,
        matchedSkus:
          item.type === "product" ? options.map((o) => o.parts[0].sku) : [],
      }
    })
    .filter((result) => result.options.length > 0)
    .sort((a, b) => {
      if (query.sort !== "newest") {
        if (a.price === undefined && b.price !== undefined) return 1
        if (b.price === undefined && a.price !== undefined) return -1
        if (
          a.price !== undefined &&
          b.price !== undefined &&
          a.price !== b.price
        )
          return query.sort === "low" ? a.price - b.price : b.price - a.price
      }
      return (
        b.item.created - a.item.created || a.item.id.localeCompare(b.item.id)
      )
    })
}
