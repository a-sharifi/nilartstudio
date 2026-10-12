import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SessionExpiredPage from "../src/design/SessionExpiredPage";
import type { LiveSessionEvent } from "../src/design/auth";

afterEach(cleanup);

it("only confirmed absence claims expiry and keeps the profile return route", async () => {
  const navigate = vi.fn();
  render(<SessionExpiredPage en navigate={navigate} target="/en/account/profile"
    liveApi={{ checkSession: async () => "signedOut" }} />);
  await screen.findByRole("heading", { name: "Sign in again to continue" });
  expect(screen.getAllByRole("link", { name: "Sign in again" })[0].getAttribute("href"))
    .toBe("/en/auth/login?returnTo=%2Fen%2Faccount%2Fprofile");
  expect(document.querySelector(".auth-preview")).toBeNull();
  expect(document.querySelector(".session-demo")).toBeNull();
  expect(navigate).not.toHaveBeenCalled();
});

it("unknown session status supports explicit retry without claiming expiry", async () => {
  const checkSession = vi.fn().mockResolvedValueOnce("unknown").mockResolvedValueOnce("confirm");
  render(<SessionExpiredPage en navigate={vi.fn()} target={null} liveApi={{ checkSession }} />);
  await screen.findByRole("heading", { name: "Unable to connect" });
  fireEvent.click(screen.getAllByRole("button", { name: "Try checking again" })[0]);
  await screen.findByRole("heading", { name: "Your session is active" });
  expect(screen.getAllByRole("link", { name: "Continue" })[0].getAttribute("href"))
    .toBe("/en/account/profile");
});

it("a late positive check cannot overwrite a verified logout", async () => {
  let finish!: (value: "confirm") => void;
  let listener!: (event: LiveSessionEvent) => void;
  const unsubscribe = vi.fn();
  const view = render(<SessionExpiredPage en navigate={vi.fn()} target={null} liveApi={{
    checkSession: () => new Promise(resolve => { finish = resolve; }),
    subscribe: callback => { listener = callback; return unsubscribe; },
  }} />);
  listener({ type: "changed", signedOut: true, source: "observation" });
  await screen.findByRole("heading", { name: "Sign in again to continue" });
  finish("confirm");
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Your session is active" })).toBeNull());
  view.unmount(); expect(unsubscribe).toHaveBeenCalledOnce();
});
