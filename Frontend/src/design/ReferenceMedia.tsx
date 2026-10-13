import Mockup from "./Mockup";
import BundleStillLife from "./BundleStillLife";

// Explicit associations with the pinned design catalog; never guess visuals for other products.
const visuals: Record<string, { color: string; kind: string }> = {
  "cats-sketchbook-127gsm": { color: "sage", kind: "book" },
  "notebook-ghosts": { color: "lilac", kind: "book" },
  "sticker-cows": { color: "sand", kind: "stickers" },
  "bookmark-love": { color: "rose", kind: "bookmark" },
  "cat-ruled": { color: "sage", kind: "book" },
  "cat-ruled-hard": { color: "sage", kind: "book" },
  "cat-stickers": { color: "sage", kind: "stickers" },
  "cat-bookmark": { color: "sage", kind: "bookmark" },
};
export function ReferenceProductImage({ slug, language }: { slug: string; language: 0 | 1 }) {
  const visual = visuals[slug];
  return visual ? <Mockup {...visual} /> : <span>{language === 0 ? "تصویر در دسترس نیست" : "Image unavailable"}</span>;
}
export function ReferenceBundleImage({ slug, language, view = 0 }: { slug: string; language: 0 | 1; view?: number }) {
  return ["cats-bundle", "cat-everyday-set", "cat-keepsake-set"].includes(slug) ? <BundleStillLife view={view} renderMedia={(color, kind) => <Mockup color={color} kind={kind} />} /> : <span>{language === 0 ? "تصویر در دسترس نیست" : "Image unavailable"}</span>;
}
