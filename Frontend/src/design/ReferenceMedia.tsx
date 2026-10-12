import Mockup from "./Mockup";
import BundleStillLife from "./BundleStillLife";

// Explicit associations with the pinned design catalog; never guess visuals for other products.
const visuals: Record<string, { color: string; kind: string }> = {
  "cats-sketchbook-127gsm": { color: "sage", kind: "book" },
  "notebook-ghosts": { color: "lilac", kind: "book" },
  "sticker-cows": { color: "sand", kind: "stickers" },
  "bookmark-love": { color: "rose", kind: "bookmark" },
  "cat-stickers": { color: "sage", kind: "stickers" },
  "cat-bookmark": { color: "sage", kind: "bookmark" },
};
export function ReferenceProductImage({ slug, language }: { slug: string; language: 0 | 1 }) {
  const visual = visuals[slug];
  return visual ? <Mockup {...visual} /> : <span>{language === 0 ? "تصویر در دسترس نیست" : "Image unavailable"}</span>;
}
export function ReferenceBundleImage({ slug, language }: { slug: string; language: 0 | 1 }) {
  return slug === "cats-bundle" ? <BundleStillLife renderMedia={(color, kind) => <Mockup color={color} kind={kind} />} /> : <span>{language === 0 ? "تصویر در دسترس نیست" : "Image unavailable"}</span>;
}
