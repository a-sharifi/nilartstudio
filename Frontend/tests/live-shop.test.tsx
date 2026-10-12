import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import LiveShopPage from "../src/features/catalog/LiveShopPage"
import { mapCollection, mapProduct } from "../src/features/catalog/adapter"

afterEach(cleanup)
const collections = [mapCollection({ id: "c1", slug: "art", title_fa: "هنر", title_en: "Art" })]
const data = { collections, categories: [], products: [mapProduct({ id: "p1", slug: "real", title_fa: "محصول", title_en: "Real product", collection_ids: ["c1"] }, collections)] }
const props = { data, status: "normal", search: "", language: 1 as const, retry: vi.fn(), navigate: vi.fn(), queryChange: vi.fn() }

test("live shop renders real products without invented prices, stock or favorites", () => {
  render(<LiveShopPage {...props} />)
  expect(screen.getByRole("heading", { name: "Real product" })).toBeTruthy()
  expect(screen.getByText("Price and availability unconfirmed")).toBeTruthy()
  expect(screen.queryByText(/Demo|Sample mockup/)).toBeNull()
  expect(screen.queryByRole("button", { name: /favorite/i })).toBeNull()
  fireEvent.change(screen.getByRole("combobox", { name: "Collection" }), { target: { value: "art" } })
  expect(props.queryChange).toHaveBeenCalledWith("collection=art")
})

test("live shop errors retry and unmatched filters show empty state", () => {
  const view = render(<LiveShopPage {...props} status="error" />)
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  expect(props.retry).toHaveBeenCalled()
  view.rerender(<LiveShopPage {...props} search="collection=missing" />)
  expect(screen.getByText("No products to show.")).toBeTruthy()
})
