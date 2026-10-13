import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import ShopPage from "../src/design/ShopPage"
import { mapCollection, mapProduct } from "../src/features/catalog/adapter"

afterEach(cleanup)
const collections = [mapCollection({ id: "c1", slug: "art", title_fa: "هنر", title_en: "Art" })]
const items = [mapProduct({ id: "p1", slug: "real", title_fa: "محصول", title_en: "Real product", collection_ids: ["c1"] }, collections)]
const props = { liveCatalog: { collections, categories: [], items }, liveStatus: "normal", page: "/en/shop", search: "", language: 1 as const, onRetry: vi.fn(), onNavigate: vi.fn(), onQueryChange: vi.fn(), signedIn: false, favorites: [], onFavorite: vi.fn(), renderMedia: () => null, renderSheet: () => null, arrow: null, heart: null }

test("reference shop renders published products without SKU, price or stock guesses", () => {
  const { container } = render(<ShopPage {...props} />)
  expect(container.querySelector(".shop-grid")).toBeTruthy()
  expect(screen.getByRole("heading", { name: "Real product" })).toBeTruthy()
  expect(screen.getByText("Purchase details unconfirmed")).toBeTruthy()
  expect(screen.queryByText(/Sample mockup/)).toBeNull()
  expect(screen.queryByRole("button", { name: /favorite/i })).toBeNull()
  fireEvent.click(screen.getByRole("combobox", { name: "Collection" }))
  fireEvent.click(screen.getByRole("option", { name: "Art" }))
  expect(props.onQueryChange).toHaveBeenCalledWith("collection=art")
})

test("native network state retries the API, and stock filters exclude unconfirmed items", () => {
  const view = render(<ShopPage {...props} liveStatus="error" />)
  fireEvent.click(screen.getByRole("button", { name: "Retry" }))
  expect(props.onRetry).toHaveBeenCalled()
  view.rerender(<ShopPage {...props} search="stock=1" />)
  expect(screen.queryByRole("heading", { name: "Real product" })).toBeNull()
})
