import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { useCommissionSubmission } from "../src/features/catalog/CommissionFlow"
import { useState } from "react"
function SubmissionHarness() {
 const { submit, status, receipt } = useCommissionSubmission();
 const [fields, setFields] = useState({idea: "", changes: "", style: "", size: "", execution: "handmade"});
 return <><label>Idea<input value={fields.idea} onChange={e => setFields({...fields, idea:e.target.value})}/></label><label>Style<input value={fields.style} onChange={e => setFields({...fields, style:e.target.value})}/></label><label>Requested size<input value={fields.size} onChange={e => setFields({...fields, size:e.target.value})}/></label><button onClick={() => void submit(fields)}>{status === "unknown" ? "Retry same request" : "Submit for review"}</button>{receipt && <p>Request saved; awaiting review</p>}</>;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
test("commission request bootstraps CSRF then saves a real awaiting-review receipt", async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ csrf_token: "nonce" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ id: "request-1", status: "awaiting_review" }) })
  vi.stubGlobal("fetch", fetch)
  render(<SubmissionHarness />)
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
  render(<SubmissionHarness />)
  for (const [label, value] of [["Idea", "Portrait"], ["Style", "Oil"], ["Requested size", "40 x 60"]]) fireEvent.change(screen.getByRole("textbox", { name: label }), { target: { value } })
  fireEvent.click(screen.getByRole("button", { name: "Submit for review" }))
  fireEvent.click(await screen.findByRole("button", { name: "Retry same request" }))
  expect(await screen.findByText("Request saved; awaiting review")).toBeTruthy()
  expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[3][1].body)
})

test("malformed receipt keeps the request frozen for an identical retry", async () => {
  const csrf = { ok: true, json: async () => ({ csrf_token: "nonce" }) };
  const fetch = vi.fn().mockResolvedValueOnce(csrf).mockResolvedValueOnce({ ok: true, json: async () => ({ status: "awaiting_review" }) })
    .mockResolvedValueOnce(csrf).mockResolvedValueOnce({ ok: true, json: async () => ({ id: "request-1", status: "awaiting_review" }) });
  vi.stubGlobal("fetch", fetch);
  render(<SubmissionHarness />);
  fireEvent.change(screen.getByRole("textbox", { name: "Idea" }), { target: { value: "Original brief" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
  const retry = await screen.findByRole("button", { name: "Retry same request" });
  fireEvent.change(screen.getByRole("textbox", { name: "Idea" }), { target: { value: "Changed brief" } });
  fireEvent.click(retry);
  expect(await screen.findByText("Request saved; awaiting review")).toBeTruthy();
  expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[3][1].body);
});

test("session rotation before CSRF completes prevents the obsolete write", async () => {
  const { sessionLifecycle } = await import("../src/features/identity/session-lifecycle");
  const { act } = await import("@testing-library/react");
  let resolve!: (value: unknown) => void;
  const fetch = vi.fn(() => new Promise(value => { resolve = value; }));
  vi.stubGlobal("fetch", fetch);
  render(<SubmissionHarness />);
  fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
  await act(async () => {
    sessionLifecycle.authenticated("rotated-test-owner", sessionLifecycle.capture());
    resolve({ ok: true, json: async () => ({ csrf_token: "old-nonce" }) });
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Request saved; awaiting review")).toBeNull();
});
