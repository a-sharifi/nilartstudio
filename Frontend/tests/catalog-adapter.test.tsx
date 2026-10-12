import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { homepageProducts, mapCollection, mapProduct, useLiveCatalog } from "../src/features/catalog/adapter"
import { catalogResults, parseQuery, productMatchesCategory } from "../src/design/catalog"

const collectionRows = [
  { id: "c1", slug: "art", title_fa: "هنر", title_en: "Art" },
  { id: "c2", slug: "nature", title_fa: "طبیعت", title_en: "Nature" },
]
const collections = collectionRows.map(mapCollection)
const categories = [
  { id: "cat1", slug: "paper", title_fa: "کاغذ", title_en: "Paper" },
  { id: "cat2", slug: "gifts", title_fa: "هدیه", title_en: "Gifts" },
]
// Matches ProductOutput: relationships are arrays of IDs, not slugs or singular IDs.
const productRow = { id: "p1", slug: "real-product", title_fa: "محصول", title_en: "Product",
  description_fa: "", description_en: "", collection_ids: ["c2", "c1", "c1", "unknown"], category_ids: ["cat1", "cat2", "cat2", "unknown"] }
const page = (items: unknown[]) => ({ items, total: items.length, page: 1, page_size: 100 })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe("live catalog adapter", () => {
  it("maps bilingual titles and all known many-to-many IDs without duplicates", () => {
    const product = mapProduct(productRow, collections, categories)
    expect(collections[0].name).toEqual(["هنر", "Art"])
    expect(product.name).toEqual(["محصول", "Product"])
    expect(product.collections).toEqual(["art", "nature"])
    expect(product.categories).toEqual(["paper", "gifts"])
    expect(productMatchesCategory(product, "gifts")).toBe(true)
    expect(productMatchesCategory(product, "unknown")).toBe(false)
  })
  it("shows a product in both collections and both categories without inventing availability", () => {
    const product = mapProduct(productRow, collections, categories)
    for (const slug of ["art", "nature"]) for (const category of ["paper", "gifts"]) {
      const results = catalogResults(slug, parseQuery(`?category=${category}`), false, [product], [])
      expect(results).toHaveLength(1)
      expect(results[0].price).toBeUndefined()
    }
    expect(catalogResults("art", parseQuery("?stock=1"), false, [product], [])).toEqual([])
    expect(homepageProducts({ collections, categories: [], products: [product] })[0].available).toBe(false)
  })
  it("honors empty relationships and never falls back to singular IDs or demo fixtures", () => {
    const product = mapProduct({ ...productRow, collection_ids: [], category_ids: [], collection_id: "c1", category_id: "cat1" }, collections, categories)
    expect(product.collections).toEqual([])
    expect(product.categories).toEqual([])
    expect(catalogResults("art", parseQuery(""), false, [product], [])).toEqual([])
    expect(catalogResults("gorbe", parseQuery(""))).toEqual([])
  })
  it("loads the actual endpoint contract and maps multiple category memberships", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () =>
      url.includes("/collections/art") ? { ...collectionRows[0], description_fa: "توضیح", description_en: "Description" }
      : url.includes("/collections?") ? page(collectionRows)
      : url.includes("/categories?") ? page(categories) : page([productRow]) })))
    const { result } = renderHook(() => useLiveCatalog("art"))
    await waitFor(() => expect(result.current.status).toBe("normal"))
    expect(result.current.data.products[0].collections).toEqual(["nature", "art"])
    expect(result.current.data.products[0].categories).toEqual(["paper", "gifts"])
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/products?collection=art&"), expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })
  it("preserves collections when products fail and retries without demo fallback", async () => {
    let failed = true
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: !url.includes("/products?") || !failed, status: 503,
      json: async () => url.includes("/collections?") ? page(collectionRows) : page([]) })))
    const { result } = renderHook(() => useLiveCatalog())
    await waitFor(() => expect(result.current.status).toBe("error"))
    expect(result.current.collectionsStatus).toBe("normal")
    expect(result.current.data.products).toEqual([])
    expect(result.current.data.collections).toHaveLength(2)
    failed = false
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe("normal"))
    expect(result.current.data.products).toEqual([])
  })
})
