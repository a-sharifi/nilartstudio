import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import StaticInfoPage, { isStaticInfoPage } from "../src/features/design/StaticInfoPage"
afterEach(cleanup)
test("footer pages are static and do not simulate messages or refunds", () => {
  expect(isStaticInfoPage("/fa/returns")).toBe(true)
  expect(isStaticInfoPage("/toString")).toBe(false)
  render(<StaticInfoPage path="/en/returns" language={1} />)
  expect(screen.getByRole("heading", { name: "Returns" })).toBeTruthy()
  expect(screen.getByText(/final cancellation and returns policy/)).toBeTruthy()
  expect(screen.queryByRole("textbox")).toBeNull()
})

test("FAQ has expandable answers and Persian navigation for all eight pages", () => {
  render(<StaticInfoPage path="/fa/faq" language={0} />)
  expect(screen.getByRole("heading", { name: "سؤالات متداول" })).toBeTruthy()
  const navigation = screen.getByRole("navigation", { name: "صفحات راهنما" })
  expect(navigation.querySelectorAll("a")).toHaveLength(8)
  expect(screen.getByText("آیا برای مرور فروشگاه باید وارد شوم؟").closest("details")).toBeTruthy()
  expect(screen.getByRole("link", { name: "حریم خصوصی" }).getAttribute("href")).toBe("/fa/privacy")
})
