import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import App from "../src/design/App"

const next = vi.hoisted(() => ({ pathname: "/en", query: "", push: vi.fn(), replace: vi.fn(), back: vi.fn() }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: next.push, replace: next.replace, back: next.back }),
  usePathname: () => next.pathname,
  useSearchParams: () => new URLSearchParams(next.query),
}))
vi.mock("../src/features/catalog/adapter", async importOriginal => {
  const actual = await importOriginal<typeof import("../src/features/catalog/adapter")>()
  return { ...actual, useLiveCatalog: () => ({ status: "normal", collectionsStatus: "normal", retry: vi.fn(), data: {
    collections: [actual.mapCollection({ id: "c1", slug: "art", title_fa: "هنر", title_en: "Art" })], categories: [], products: [],
  } }) }
})
beforeEach(() => { next.pathname = "/en"; next.query = ""; vi.clearAllMocks() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

test("live English homepage navigates through Next and follows pathname updates", () => {
  const history = vi.spyOn(window.history, "pushState")
  const { rerender } = render(<App />)
  fireEvent.click(screen.getByRole("link", { name: "All collections" }))
  expect(next.push).toHaveBeenCalledWith("/collections?language=en")
  expect(history).not.toHaveBeenCalled()
  next.pathname = "/collections"
  next.query = "language=en"
  rerender(<App />)
  expect(screen.getByRole("heading", { name: "Find your favorite collection" })).toBeTruthy()
  fireEvent.click(screen.getByRole("link", { name: /Art.*Explore collection/ }))
  expect(next.push).toHaveBeenCalledWith("/collections/art?language=en")
})

test("live collection tabs use Next query navigation without scroll resets", () => {
  next.pathname = "/collections/art"
  next.query = "language=en"
  const { rerender } = render(<App />)
  fireEvent.click(screen.getByRole("tab", { name: "Products" }))
  expect(next.push).toHaveBeenCalledWith("/collections/art?tab=products&language=en", { scroll: false })
  next.query = "tab=products&language=en"
  rerender(<App />)
  expect(screen.getByRole("tab", { name: "Products" }).getAttribute("aria-selected")).toBe("true")
})
