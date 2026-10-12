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
