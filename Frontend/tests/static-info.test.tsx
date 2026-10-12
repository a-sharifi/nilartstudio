import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import ContactPage from "../src/design/ContactPage"
import { contactDemoConfig } from "../src/design/contact"
import { isStaticInfoPage } from "../src/features/design/information-routes"
afterEach(cleanup)
test("all reference information routes and language aliases are connected", () => {
  for (const route of ["guides/buying", "faq", "track-order", "returns", "about", "contact", "terms", "privacy"]) {
    for (const prefix of ["/", "/fa/", "/en/"]) expect(isStaticInfoPage(prefix + route)).toBe(true)
  }
  expect(isStaticInfoPage("/toString")).toBe(false)
})
test("contact uses the reference form without simulating a live submission", () => {
  const { container } = render(<ContactPage language={1} signedIn={false} mode="normal" onMode={() => {}} onNavigate={() => {}} arrow={null} config={{ ...contactDemoConfig, demo: false }} />)
  expect(container.querySelector(".contact-page")).toBeTruthy()
  expect(screen.getByRole("heading", { name: "Contact options are currently unavailable." })).toBeTruthy()
  expect(screen.queryByRole("textbox")).toBeNull()
  expect(container.querySelector(".static-info-page")).toBeNull()
})
