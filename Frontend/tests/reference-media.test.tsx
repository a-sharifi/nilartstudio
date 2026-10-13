import { fireEvent, render, screen } from "@testing-library/react";
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
  it("uses downloaded sample photos only for explicitly associated bundles", () => {
    const { container, rerender } = render(<ReferenceBundleImage slug="cats-bundle" language={1} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/sample-stationery/notebook-pencils.jpg");
    expect(screen.getByText("Sample photo")).toBeTruthy();
    rerender(<ReferenceBundleImage slug="unknown" language={1} />);
    expect(container.querySelector(".bundle-still-life")).toBeNull();
  });
});

it("recovers from a failed photograph when a different gallery photo is selected",()=>{
 const {container,rerender}=render(<ReferenceProductImage slug="cat-ruled" language={1}/>);
 fireEvent.error(container.querySelector("img")!);
 expect(container.querySelector("img")).toBeNull();
 rerender(<ReferenceProductImage slug="cat-ruled" language={1} view={1}/>);
 expect(container.querySelector("img")?.getAttribute("src")).toBe("/sample-stationery/stationery-desk.jpg");
});
