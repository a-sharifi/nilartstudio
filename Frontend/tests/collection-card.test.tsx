import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import CollectionCard from "../src/design/CollectionCard";

afterEach(cleanup);
test("original collection component preserves localized content and navigation", () => {
  const navigate = vi.fn();
  render(<CollectionCard collection={{ id: "test", slug: "test", name: ["آزمایشی", "Test"],
    originalName: "Test", published: true, color: "sage", caption: ["توضیح", "Caption"],
    imageAlt: ["تصویر", "Image"] }} language={1} onNavigate={navigate}
    media={<span>Preview</span>} arrow={<span>→</span>} />);
  const link = screen.getByRole("link");
  expect(link.getAttribute("href")).toBe("/collections/test");
  fireEvent.click(link);
  expect(navigate).toHaveBeenCalledWith("Test", "/collections/test");
});
