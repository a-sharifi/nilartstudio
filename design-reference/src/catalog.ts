import type { Localized } from "./data"

export type SKU = {
  id: string
  size?: string
  weight?: number
  price: number
  stock: number
  sheets?: number
  cover?: "2mm" | "3mm"
  weightGrams?: number
  imageIndex?: number
}
export type CatalogProduct = {
  id: string
  slug: string
  type: "product"
  name: Localized
  category: string
  collections: string[]
  published: boolean
  created: number
  kind: string
  skus: SKU[]
}
interface BundleComponent {
  productId: string
  quantity: number
  allowedSkus?: string[]
}
export type CatalogBundle = {
  id: string
  slug: string
  type: "bundle"
  name: Localized
  collections: string[]
  published: boolean
  created: number
  summary: Localized
  discount: number
  components: BundleComponent[]
}
export type CatalogItem = CatalogProduct | CatalogBundle
const sku = (
  id: string,
  price: number,
  stock: number,
  size?: string,
  weight?: number,
): SKU => ({ id, price, stock, size, weight })
// Demo catalog only. Stock lives on shared product SKUs, never on a collection or bundle.
export const catalogProducts: CatalogProduct[] = [
  {
    id: "cat-sketch-127",
    slug: "cats-sketchbook-127gsm",
    type: "product",
    name: ["دفتر طراحی ۱۲۷ گرم — گربه", "127 gsm sketchbook — Cats"],
    category: "sketchbooks",
    collections: ["gorbe", "roh"],
    published: true,
    created: 8,
    kind: "book",
    skus: [
      {
        ...sku("127-a4", 245000, 4, "A4", 127),
        sheets: 50,
        cover: "3mm",
        weightGrams: 550,
      },
      {
        ...sku("127-a4-100", 345000, 2, "A4", 127),
        sheets: 100,
        cover: "2mm",
        weightGrams: 900,
      },
      {
        ...sku("127-a5", 185000, 6, "A5", 127),
        sheets: 50,
        cover: "2mm",
        weightGrams: 300,
      },
      {
        ...sku("127-a5-50-3", 205000, 2, "A5", 127),
        sheets: 50,
        cover: "3mm",
        weightGrams: 340,
      },
      {
        ...sku("127-a5-100-2", 255000, 3, "A5", 127),
        sheets: 100,
        cover: "2mm",
        weightGrams: 480,
      },
      {
        ...sku("127-a5-100-3", 275000, 0, "A5", 127),
        sheets: 100,
        cover: "3mm",
        weightGrams: 520,
      },
      {
        ...sku("127-a6", 125000, 3, "A6", 127),
        sheets: 50,
        cover: "2mm",
        weightGrams: 180,
      },
    ],
  },
  {
    id: "cat-sketch-200",
    slug: "cat-sketch-200",
    type: "product",
    name: ["دفتر طراحی ۲۰۰ گرم — گربه", "200 gsm sketchbook — Cats"],
    category: "sketchbooks",
    collections: ["gorbe"],
    published: true,
    created: 7,
    kind: "book",
    skus: [
      sku("200-a4", 320000, 2, "A4", 200),
      sku("200-a5", 235000, 0, "A5", 200),
    ],
  },
  {
    id: "cat-ruled",
    slug: "cat-ruled",
    type: "product",
    name: ["دفتر خط‌دار — گربه", "Ruled notebook — Cats"],
    category: "notebooks",
    collections: ["gorbe"],
    published: true,
    created: 6,
    kind: "book",
    skus: [
      sku("ruled-a5", 145000, 5, "A5", 80),
      sku("ruled-a6", 105000, 4, "A6", 80),
    ],
  },
  {
    id: "cat-ruled-hard",
    slug: "cat-ruled-hard",
    type: "product",
    name: ["دفتر خط‌دار جلد سخت — گربه", "Hardcover notebook — Cats"],
    category: "notebooks",
    collections: ["gorbe"],
    published: true,
    created: 3,
    kind: "book",
    skus: [sku("hard-a5", 195000, 0, "A5", 100)],
  },
  {
    id: "cat-stickers",
    slug: "cat-stickers",
    type: "product",
    name: ["استیکر — گربه", "Sticker — Cats"],
    category: "stickers",
    collections: ["gorbe"],
    published: true,
    created: 5,
    kind: "stickers",
    skus: [sku("sticker", 35000, 12)],
  },
  {
    id: "cat-bookmark",
    slug: "cat-bookmark",
    type: "product",
    name: ["نشانک — گربه", "Bookmark — Cats"],
    category: "bookmarks",
    collections: ["gorbe"],
    published: true,
    created: 2,
    kind: "bookmark",
    skus: [sku("bookmark", 30000, 8), sku("bookmark-out", 30000, 0)],
  },
]
export const catalogBundles: CatalogBundle[] = [
  {
    id: "cats-bundle",
    slug: "cats-bundle",
    type: "bundle",
    name: ["پکیج گربه", "Cats bundle"],
    collections: ["gorbe"],
    published: true,
    created: 9,
    summary: [
      "یک دفتر طراحی + دو استیکر + یک نشانک",
      "1 sketchbook + 2 stickers + 1 bookmark",
    ],
    discount: 30000,
    components: [
      {
        productId: "cat-sketch-127",
        quantity: 1,
        allowedSkus: [
          "127-a4",
          "127-a5",
          "127-a5-50-3",
          "127-a5-100-3",
          "127-a6",
        ],
      },
      { productId: "cat-stickers", quantity: 2, allowedSkus: ["sticker"] },
      { productId: "cat-bookmark", quantity: 1, allowedSkus: ["bookmark"] },
    ],
  },
  {
    id: "cat-everyday-set",
    slug: "cat-everyday-set",
    type: "bundle",
    name: ["پکیج روزمره گربه", "Cats everyday bundle"],
    collections: ["gorbe"],
    published: true,
    created: 4,
    summary: [
      "یک دفتر + دو استیکر + یک نشانک",
      "1 notebook + 2 stickers + 1 bookmark",
    ],
    discount: 25000,
    components: [
      { productId: "cat-ruled", quantity: 1 },
      { productId: "cat-stickers", quantity: 2 },
      { productId: "cat-bookmark", quantity: 1 },
    ],
  },
  {
    id: "cat-keepsake-set",
    slug: "cat-keepsake-set",
    type: "bundle",
    name: ["پکیج یادگاری گربه", "Cats keepsake bundle"],
    collections: ["gorbe"],
    published: true,
    created: 1,
    summary: [
      "یک دفتر جلد سخت + دو استیکر + یک نشانک",
      "1 hardcover notebook + 2 stickers + 1 bookmark",
    ],
    discount: 30000,
    components: [
      { productId: "cat-ruled-hard", quantity: 1 },
      { productId: "cat-stickers", quantity: 2 },
      { productId: "cat-bookmark", quantity: 1 },
    ],
  },
]
export type Filters = {
  category: string
  size: string
  weight: string
  min: string
  max: string
  stock: boolean
}
export type QueryState = {
  tab: string
  sort: string
  page: number
  filters: Filters
}
export const emptyFilters: Filters = {
  category: "",
  size: "",
  weight: "",
  min: "",
  max: "",
  stock: false,
}
export function normalizeFilters(filters: Filters): Filters {
  const paper = ["sketchbooks", "notebooks"].includes(filters.category)
  return {
    ...filters,
    size: paper ? filters.size : "",
    weight: paper ? filters.weight : "",
  }
}
export function parseQuery(search: string): QueryState {
  const params = new URLSearchParams(search)
  const price = (key: string) => {
    const value = params.get(key) || ""
    return /^\d+$/.test(value) ? value : ""
  }
  return {
    tab: ["products", "bundles"].includes(params.get("tab") || "")
      ? params.get("tab")!
      : "all",
    sort: ["low", "high"].includes(params.get("sort") || "")
      ? params.get("sort")!
      : "newest",
    page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
    filters: normalizeFilters({
      category: ["sketchbooks", "notebooks", "stickers", "bookmarks"].includes(
        params.get("category") || "",
      )
        ? params.get("category")!
        : "",
      size: ["A4", "A5", "A6"].includes(params.get("size") || "")
        ? params.get("size")!
        : "",
      weight: price("weight"),
      min: price("min"),
      max: price("max"),
      stock: params.get("stock") === "1",
    }),
  }
}
// Local prototype URL keys, not an API contract.
export function serializeQuery(state: QueryState) {
  const p = new URLSearchParams()
  if (state.tab !== "all") p.set("tab", state.tab)
  if (state.sort !== "newest") p.set("sort", state.sort)
  if (state.page > 1) p.set("page", String(state.page))
  for (const key of ["category", "size", "weight", "min", "max"] as const)
    if (state.filters[key]) p.set(key, state.filters[key])
  if (state.filters.stock) p.set("stock", "1")
  return p.toString()
}
export function invalidPrice(filters: Filters) {
  return (
    !!filters.min && !!filters.max && Number(filters.min) > Number(filters.max)
  )
}
interface OptionPart {
  product: CatalogProduct
  sku: SKU
  quantity: number
}
type Option = {
  parts: OptionPart[]
  available: boolean
  price: number
  total: number
}
export function itemOptions(
  item: CatalogItem,
  forceUnavailable = false,
): Option[] {
  if (item.type === "product")
    return item.skus.map((sku) => ({
      parts: [{ product: item, sku, quantity: 1 }],
      available: !forceUnavailable && sku.stock > 0,
      price: sku.price,
      total: sku.price,
    }))
  let combinations: Option[] = [
    { parts: [], available: true, price: 0, total: 0 },
  ]
  for (const component of item.components) {
    const product = catalogProducts.find(
      (p) => p.id === component.productId && p.published,
    )
    if (!product) return []
    combinations = combinations.flatMap((option) =>
      product.skus
        .filter(
          (s) => !component.allowedSkus || component.allowedSkus.includes(s.id),
        )
        .map((sku) => {
          const total = option.total + sku.price * component.quantity
          return {
            parts: [
              ...option.parts,
              { product, sku, quantity: component.quantity },
            ],
            total,
            price: Math.max(0, total - item.discount),
            available:
              option.available &&
              !forceUnavailable &&
              sku.stock >= component.quantity,
          }
        }),
    )
  }
  return combinations.map((option) => {
    const required = new Map<string, number>()
    for (const part of option.parts)
      required.set(
        part.sku.id,
        (required.get(part.sku.id) || 0) + part.quantity,
      )
    return {
      ...option,
      available:
        option.available &&
        option.parts.every(
          (part) => part.sku.stock >= required.get(part.sku.id)!,
        ),
    }
  })
}
export function matchingOptions(
  item: CatalogItem,
  filters: Filters,
  forceUnavailable = false,
) {
  return itemOptions(item, forceUnavailable).filter((option) => {
    const relevant = option.parts.filter(
      (part) => !filters.category || part.product.category === filters.category,
    )
    if (
      !relevant.some(
        (part) =>
          (!filters.size || part.sku.size === filters.size) &&
          (!filters.weight || String(part.sku.weight) === filters.weight),
      )
    )
      return false
    if (filters.stock && !option.available) return false
    if (filters.min || filters.max) {
      if (!option.available) return false
      if (filters.min && option.price < Number(filters.min)) return false
      if (filters.max && option.price > Number(filters.max)) return false
    }
    return true
  })
}
export function catalogResults(
  slug: string,
  state: QueryState,
  forceUnavailable = false,
) {
  if (invalidPrice(state.filters)) return []
  const unique = new Map(
    [...catalogProducts, ...catalogBundles]
      .filter((item) => item.published && item.collections.includes(slug))
      .map((item) => [item.id, item]),
  )
  return [...unique.values()]
    .filter(
      (item) =>
        state.tab === "all" ||
        item.type === (state.tab === "products" ? "product" : "bundle"),
    )
    .map((item) => {
      const options = matchingOptions(item, state.filters, forceUnavailable)
      const purchasable = options
        .filter((o) => o.available)
        .sort((a, b) => a.price - b.price)
      return {
        item,
        options,
        price: purchasable[0]?.price,
        total: purchasable[0]?.total,
      }
    })
    .filter((result) => result.options.length > 0)
    .sort((a, b) => {
      if (state.sort === "newest") return b.item.created - a.item.created
      if (a.price === undefined) return b.price === undefined ? 0 : 1
      if (b.price === undefined) return -1
      return state.sort === "low" ? a.price - b.price : b.price - a.price
    })
}
