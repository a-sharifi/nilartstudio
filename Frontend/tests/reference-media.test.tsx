import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReferenceBundleImage, ReferenceProductImage } from "../src/design/ReferenceMedia";

describe("explicit design reference illustrations", () => {
  it("uses the exact reference mockup families", () => {
    const { container, rerender } = render(<ReferenceProductImage slug="sticker-cows" language={1} />);
    expect(container.querySelector(".mockup.sand svg")).not.toBeNull();
    rerender(<ReferenceProductImage slug="bookmark-love" language={0} />);
    expect(container.querySelector(".mockup.rose svg")).not.toBeNull();
    rerender(<ReferenceProductImage slug="unknown" language={1} />);
    expect(screen.getByText("Image unavailable")).toBeTruthy();
    expect(container.querySelector("svg")).toBeNull();
  });
  it("uses the complete reference composition only for the associated bundle", () => {
    const { container, rerender } = render(<ReferenceBundleImage slug="cats-bundle" language={1} />);
    expect(container.querySelector(".bundle-still-life")).not.toBeNull();
    expect(screen.getByText("1 NOTEBOOK · 2 STICKERS · 1 BOOKMARK")).toBeTruthy();
    rerender(<ReferenceBundleImage slug="unknown" language={1} />);
    expect(container.querySelector(".bundle-still-life")).toBeNull();
  });
});
