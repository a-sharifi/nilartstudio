import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import LiveCommissionsPage from "../src/features/catalog/LiveCommissionsPage"
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
test("commission request bootstraps CSRF then saves a real awaiting-review receipt", async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ csrf_token: "nonce" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ id: "request-1", status: "awaiting_review" }) })
  vi.stubGlobal("fetch", fetch)
  render(<LiveCommissionsPage language={1} />)
  for (const [label, value] of [["Idea", "Portrait"], ["Style", "Oil"], ["Requested size", "40 x 60"]]) fireEvent.change(screen.getByRole("textbox", { name: label }), { target: { value } })
  fireEvent.click(screen.getByRole("button", { name: "Submit for review" }))
  expect(await screen.findByText("Request saved; awaiting review")).toBeTruthy()
  expect(fetch.mock.calls[0][0]).toBe("/api/v1/auth/session/csrf")
  expect(JSON.parse(fetch.mock.calls[1][1].body).idea).toBe("Portrait")
})

test("uncertain submission retries the identical ID and brief", async () => {
  const csrf = { ok: true, json: async () => ({ csrf_token: "nonce" }) }
  const fetch = vi.fn().mockResolvedValueOnce(csrf).mockRejectedValueOnce(new Error("lost response"))
    .mockResolvedValueOnce(csrf).mockResolvedValueOnce({ ok: true, json: async () => ({ id: "request-1", status: "awaiting_review" }) })
  vi.stubGlobal("fetch", fetch)
  render(<LiveCommissionsPage language={1} />)
  for (const [label, value] of [["Idea", "Portrait"], ["Style", "Oil"], ["Requested size", "40 x 60"]]) fireEvent.change(screen.getByRole("textbox", { name: label }), { target: { value } })
  fireEvent.click(screen.getByRole("button", { name: "Submit for review" }))
  fireEvent.click(await screen.findByRole("button", { name: "Retry same request" }))
  expect(await screen.findByText("Request saved; awaiting review")).toBeTruthy()
  expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[3][1].body)
})
