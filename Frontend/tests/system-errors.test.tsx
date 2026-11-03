import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SystemErrorPage from "../src/features/system/SystemErrorPage";
import { isApplicationRoute } from "../src/features/system/routes";
afterEach(cleanup);
it.each(["/fa/commissions/notebook", "/en/commissions/notebook/11111111-1111-4111-8111-111111111111", "/", "/en", "/fa/admin/inventory/suppliers/new/abc", "/fa/account/orders/abc", "/en/products/gorbe-bookmark", "/fa/collections/love", "/fa/auth/login", "/en/500"])("preserves existing route %s", path => expect(isApplicationRoute(path)).toBe(true));
it.each(["/fa/commissions/notebook/not-an-id", "/fa/commissions/notebook/11111111-1111-4111-8111-111111111111/extra", "/missing", "/fa/missing", "/34025288.txt", "/products/a/extra", "/collections/a/extra"])("rejects unknown route %s", path => expect(isApplicationRoute(path)).toBe(false));
it("provides localized recovery destinations and search without echoing private paths", () => {
  render(<SystemErrorPage kind="404" english />);
  expect(screen.getByRole("heading", {name:"Page not found"})).toBeTruthy();
  expect(screen.getByRole("link", {name:"Back to home"}).getAttribute("href")).toBe("/en");
  expect(screen.getByRole("searchbox").getAttribute("name")).toBe("q");
});
it("only retries when explicitly requested and hides unsafe references", () => {
  const retry=vi.fn(); render(<SystemErrorPage kind="500" onRetry={retry} reference="private error / secret" english />);
  expect(retry).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name:"Try again"})); expect(retry).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/private error/)).toBeNull();
});
it("retains the authorized sign-in return URL for access denials", () => {
  render(<SystemErrorPage kind="403" english signInHref="/en/auth/login?returnTo=%2Fen%2Fadmin" />);
  expect(screen.getByRole("link", {name:"Sign in"}).getAttribute("href")).toContain("returnTo=");
});

import { parseShopQuery, serializeShopQuery, shopResults } from "../src/design/shop";
it("keeps an error-page search through canonicalization and filters actual catalogue results", () => {
  const query = parseShopQuery("?q=missing-unique-search-term");
  expect(serializeShopQuery(query)).toContain("q=missing-unique-search-term");
  expect(shopResults("", query)).toEqual([]);
});
