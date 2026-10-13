import {minimumVariantPrices} from "./catalog-price"
import { useEffect, useState } from "react"
import { demoMode, type Collection, type Localized, type demoCategories, type demoProducts } from "../../design/data"
import type { CatalogProduct } from "../../design/catalog"

type Row = Record<string, unknown>
export type CatalogData = {
  collections: Collection[]
  categories: typeof demoCategories
  products: CatalogProduct[]
}
const empty: CatalogData = { collections: [], categories: [], products: [] }
const row = (value: unknown): Row => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid catalog response")
  return value as Row
}
const str = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback
const number = (value: unknown) => {
  const n = typeof value === "number" || typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(n) && n >= 0 ? n : 0
}
const localized = (r: Row, prefix = "title"): Localized => {
  const fa = str(r[`${prefix}_fa`])
  const en = str(r[`${prefix}_en`])
  return [fa || en, en || fa]
}
export function mapCollection(value: unknown): Collection {
  const r = row(value)
  if (!str(r.id) || !str(r.slug)) throw new Error("Invalid collection")
  const name = localized(r)
  return {
    id: str(r.id), slug: str(r.slug), published: r.published !== false,
    name, originalName: name[0], color: str(r.color, ({gorbe:"sage",roh:"lilac",gav:"sand",qolche:"blue",love:"rose"} as Record<string,string>)[str(r.slug)] || "sage"),
    caption: localized(r, "caption"), description: localized(r, "description"),
    image: str(r.image_url) || undefined, imageAlt: localized(r, "image_alt"),
  }
}
export function mapCategory(value: unknown): CatalogData["categories"][number] {
  const r = row(value)
  if (!str(r.id) || !str(r.slug)) throw new Error("Invalid category")
  return { id: str(r.slug) || str(r.id), name: localized(r), kind: str(r.kind, ({stickers:"stickers",bookmarks:"bookmark"} as Record<string,string>)[str(r.slug)] || "book"), color: str(r.color, ({sketchbooks:"sand",notebooks:"sage",stickers:"lilac",bookmarks:"rose"} as Record<string,string>)[str(r.slug)] || "sand") }
}
export function mapProduct(value: unknown, collections: Collection[] = [], categories: unknown[] = []): CatalogProduct {
  const r = row(value)
  if (!str(r.id) || !str(r.slug)) throw new Error("Invalid product")
  const collectionIds = Array.isArray(r.collection_ids) ? new Set(r.collection_ids) : new Set()
  const categoryIds = Array.isArray(r.category_ids) ? new Set(r.category_ids) : new Set()
  const categorySlugs = [...new Set(categories.map(row).filter(c => categoryIds.has(c.id)).map(c => str(c.slug)).filter(Boolean))]
  return {
    id: str(r.id), slug: str(r.slug), type: "product", name: localized(r),
    category: categorySlugs[0] || "",
    categories: categorySlugs,
    collections: [...new Set(collections.filter(c => collectionIds.has(c.id)).map(c => c.slug))],
    published: r.published !== false, created: Date.parse(str(r.created_at)) || 0,
    kind: str(r.kind, "book"),
    skus: Array.isArray(r.skus) ? r.skus.map(value => {
      const s = row(value)
      return { id: str(s.id), price: number(s.price), stock: number(s.stock),
        size: str(s.size) || undefined, weight: s.weight == null ? undefined : number(s.weight),
        sheets: s.sheets == null ? undefined : number(s.sheets) }
    }) : [],
  }
}
async function request(path: string, signal: AbortSignal) {
  const response = await fetch(`/api/v1/catalog${path}`, { signal, headers: { Accept: "application/json" }, cache: "no-store" })
  if (!response.ok) throw new Error(response.status === 404 ? "not-found" : "catalog-unavailable")
  return response.json() as Promise<unknown>
}
async function list(path: string, signal: AbortSignal): Promise<unknown[]> {
  const items: unknown[] = []
  for (let page = 1; page <= 100; page++) {
    const result = row(await request(`${path}${path.includes("?") ? "&" : "?"}page=${page}&page_size=100`, signal))
    if (!Array.isArray(result.items)) throw new Error("Invalid catalog page")
    items.push(...result.items)
    if (items.length >= number(result.total) || result.items.length < 100) return items
  }
  throw new Error("Catalog pagination limit exceeded")
}
export function useLiveCatalog(slug?: string) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ key?: string; status: string; collectionsStatus: string; data: CatalogData }>({ status: "loading", collectionsStatus: "loading", data: empty })
  useEffect(() => {
    if (demoMode) return
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      setState(current => ({ ...current, key: slug, status: "error", collectionsStatus: current.collectionsStatus === "loading" ? "error" : current.collectionsStatus }))
      controller.abort()
    }, 15000)
    setState({ key: slug, status: "loading", collectionsStatus: "loading", data: empty })
    void (async () => {
      // Collections are independent: the homepage still works if another endpoint fails.
      const collections = (await list("/collections", controller.signal)).map(mapCollection)
      if (controller.signal.aborted) return
      setState({ key: slug, status: "loading", collectionsStatus: "normal", data: { ...empty, collections } })
      const [categoryResult, productResult, detailResult, priceResult] = await Promise.allSettled([
        list("/categories", controller.signal),
        list(slug ? `/products?collection=${encodeURIComponent(slug)}` : "/products", controller.signal),
        slug ? request(`/collections/${encodeURIComponent(slug)}`, controller.signal) : Promise.resolve(null),
        list("/skus",controller.signal).then(minimumVariantPrices),
      ])
      if (controller.signal.aborted) return
      const data: CatalogData = { collections,
        categories: categoryResult.status === "fulfilled" ? categoryResult.value.map(mapCategory) : [],
        products: [] }
      if (slug && detailResult.status === "fulfilled") {
        const detail = mapCollection(detailResult.value)
        data.collections = [...collections.filter(c => c.slug !== slug), detail]
      }
      data.products = productResult.status === "fulfilled"
        ? productResult.value.map(value => mapProduct(value, data.collections, categoryResult.status === "fulfilled" ? categoryResult.value : [])) : []
      if(priceResult.status==="fulfilled")data.products=data.products.map(product=>({...product,startingPrice:priceResult.value.get(product.id)}))
      const status = slug && detailResult.status === "rejected"
        ? (detailResult.reason instanceof Error && detailResult.reason.message === "not-found" ? "not-found" : "error")
        : productResult.status === "rejected" || categoryResult.status === "rejected" ? "error" : "normal"
      setState({ key: slug, status, collectionsStatus: "normal", data })
      clearTimeout(timeout)
    })().catch(() => {
      clearTimeout(timeout)
      if (!controller.signal.aborted) setState(current => ({ ...current, key: slug, status: "error", collectionsStatus: current.collectionsStatus === "loading" ? "error" : current.collectionsStatus }))
    })
    // A timeout is an error, whereas route changes silently cancel obsolete responses.
    return () => { clearTimeout(timeout); controller.abort() }
  }, [slug, revision])
  return { ...(state.key === slug ? state : { status: "loading", collectionsStatus: "loading", data: empty }), retry: () => setRevision(v => v + 1) }
}
export function homepageProducts(data: CatalogData): (typeof demoProducts[number] & {startingPrice?: import("./catalog-price").CatalogPrice})[] {
  const picks=["cats-sketchbook-127gsm","notebook-ghosts","sticker-cows","bookmark-love"]
  const rank=(slug:string)=>picks.includes(slug)?picks.indexOf(slug):picks.length
  return data.products.filter(p => p.published).sort((a,b)=>rank(a.slug)-rank(b.slug)).map(p => {
    const available = p.skus.filter(s => s.stock > 0).sort((a, b) => a.price - b.price)
    return { id: p.slug, name: p.name, collection: data.collections.findIndex(c => p.collections.includes(c.slug)),
      startingPrice:p.startingPrice, kind: p.kind, options: [...new Set(p.skus.map(s => s.size).filter(Boolean))].join(" · "),
      price: available[0]?.price ?? 0, available: available.length > 0 }
  })
}
