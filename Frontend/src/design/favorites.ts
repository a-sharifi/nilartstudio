import {
  catalogProducts,
  catalogBundles,
  itemOptions,
  type CatalogItem,
} from "./catalog"
export type FavoriteKind = "all" | "product" | "bundle" | "artwork"
export type FavoriteMode = "normal" | "remove-error" | "empty" | "loading" | "filter-loading" | "network" | "server" | "image-error" | "denied"
export type FavoriteRecord = {
  id: string
  owner: string
  kind: Exclude<FavoriteKind, "all">
  targetId: string | null
  savedAt: string
}
export const demoFavoriteOwner = "demo-customer"
// Account-scoped fixture references only. Deleted records contain no unpublished title or image.
export function favoriteFixture(mode: FavoriteMode): FavoriteRecord[] {
  if (mode === "empty") return []
  const targets: [FavoriteRecord["kind"], string | null][] = [
    ["product", "cat-sketch-127"],
    ["bundle", "cats-bundle"],
    ["artwork", "quiet-morning"],
    ["product", "cat-ruled-hard"],
    ["artwork", "blue-distance"],
    ["bundle", "cat-keepsake-set"],
    ["product", "cat-bookmark"],
    ["artwork", "earth-memory"],
    ["product", "cat-stickers"],
    ["product", null],
  ]
  return targets.map(([kind, targetId], i) => ({
    id: `FV-${i + 1}`,
    owner: demoFavoriteOwner,
    kind,
    targetId,
    savedAt: `2025-06-${String(20 - i).padStart(2, "0")}T10:00:00+03:30`,
  }))
}
export function publicCatalogItem(
  record: FavoriteRecord,
): CatalogItem | undefined {
  if (record.kind === "artwork") return undefined
  return (record.kind === "bundle" ? catalogBundles : catalogProducts).find(
    (item) => item.id === record.targetId && item.published,
  )
}
export function currentCatalogOffer(item: CatalogItem) {
  const purchasable = itemOptions(item).filter((option) => option.available)
  return {
    available: purchasable.length > 0,
    price: purchasable.length
      ? Math.min(...purchasable.map((option) => option.price))
      : undefined,
  }
}
export type PublicArtwork = {
  id: string
  title: string[]
  status: string
  price: number | null
}
export function favoriteResults(
  records: FavoriteRecord[],
  owner: string,
  query: string,
  kind: FavoriteKind,
  availableOnly: boolean,
  artworks: PublicArtwork[],
) {
  const normalize = (value: string) =>
    value
      .normalize("NFKC")
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .toLocaleLowerCase()
      .trim()
  const text = normalize(query)
  return records
    .filter((record) => {
      if (record.owner !== owner || (kind !== "all" && record.kind !== kind))
        return false
      const item = publicCatalogItem(record)
      const art =
        record.kind === "artwork"
          ? artworks.find((work) => work.id === record.targetId)
          : undefined
      const publicTitle = item?.name ??
        art?.title ?? [
          "این مورد دیگر برای نمایش در دسترس نیست",
          "This item is no longer available to view",
        ]
      if (text && !normalize(publicTitle.join(" ")).includes(text)) return false
      if (
        availableOnly &&
        !(
          (item && currentCatalogOffer(item).available) ||
          (art && art.status === "available" && art.price !== null)
        )
      )
        return false
      return true
    })
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
}
export function favoritesPage<T>(
  items: T[],
  requestedPage: number,
  pageSize = 6,
) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.max(1, Math.min(pages, Math.floor(requestedPage) || 1))
  return {
    page,
    pages,
    items: items.slice((page - 1) * pageSize, page * pageSize),
  }
}
