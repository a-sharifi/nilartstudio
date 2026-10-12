import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { mapBundle } from "../src/features/catalog/bundle-catalog";
import PublishedBundlesPage from "../src/design/PublishedBundlesPage";
const fixture = { id: "bundle-id", slug: "test-set", title_fa: "پکیج آزمایشی", title_en: "Test set", description_fa: "شرح", description_en: "Catalog description", components: [{ sku_id: "sku-1", code: "SKU-1", title_fa: "محصول", title_en: "Product", quantity: 2 }] };
afterEach(cleanup);
test("published bundle mapping retains only submitted commercial facts", () => {
  expect(mapBundle(fixture)).toEqual(fixture);
  expect(mapBundle(fixture)).not.toHaveProperty("price");
  expect(mapBundle(fixture)).not.toHaveProperty("stock");
});
test("bundle mapping rejects foreign shapes, repeated SKUs and invalid quantities", () => {
  for (const value of [null, { ...fixture, components: undefined }, { ...fixture, components: [fixture.components[0], fixture.components[0]] }, { ...fixture, components: [{ ...fixture.components[0], quantity: 0 }] }, { ...fixture, components: [{ ...fixture.components[0], quantity: 1.5 }] }]) expect(() => mapBundle(value)).toThrow();
});
test("reference bundle detail displays explicit contents and blocks purchases", () => {
  render(<PublishedBundlesPage catalog={{items:[fixture],status:"normal",retry:()=>{}}} slug="test-set" language={1} onNavigate={()=>{}} />);
  expect(screen.getByRole("heading", {name:"Test set"})).toBeTruthy();
  expect(screen.getByText("SKU-1")).toBeTruthy();
  expect(screen.getByText("2 per bundle")).toBeTruthy();
  expect((screen.getByRole("button", {name:"Purchase details unconfirmed"}) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByText("Cats collection")).toBeNull();
  expect(screen.queryByText("Choose notebook options")).toBeNull();
});
