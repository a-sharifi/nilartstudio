"use client";
import { useEffect, useState } from "react";
import "../../design/artworks.css";

type Artwork = { components?: { sku_id: string; quantity: number; code: string; title_fa: string; title_en: string }[]; id: string; slug: string; title_fa: string; title_en: string; description_fa: string; description_en: string };
export default function LiveArtworksPage({ language, slug, navigate, resource = "artworks" }: { language: 0 | 1; slug?: string; resource?: "artworks" | "bundles"; navigate: (name: string, route: string) => void }) {
  const cacheKey = `${resource}:${slug || ""}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key?: string; status: string; items: Artwork[] }>({ status: "loading", items: [] });
  const t = (fa: string, en: string) => language === 0 ? fa : en;
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); setState({ key: cacheKey, status: "error", items: [] }); }, 15000);
    void (async () => {
      const items: Artwork[] = [];
      for (let page = 1; page <= 100; page++) {
        const response = await fetch(`/api/v1/catalog/${resource}${slug ? `/${encodeURIComponent(slug)}` : `?page=${page}&page_size=100`}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) { if (response.status === 404 && slug) { setState({ key: cacheKey, status: "not-found", items: [] }); return; } throw new Error("Unavailable"); }
        const result = await response.json();
        const rows = slug ? [result] : result.items;
        if (!Array.isArray(rows) || rows.some(item => !item || ["id", "slug", "title_fa", "title_en", "description_fa", "description_en"].some(key => typeof item[key] !== "string"))) throw new Error("Invalid artwork");
        if (resource === "bundles" && rows.some(item => !Array.isArray(item.components) || item.components.some((part: { quantity: number; sku_id: string; code: string; title_fa: string; title_en: string }) => !part || !Number.isSafeInteger(part.quantity) || part.quantity <= 0 || [part.sku_id, part.code, part.title_fa, part.title_en].some(value => typeof value !== "string")))) throw new Error("Invalid bundle components");
        items.push(...rows);
        if (slug || items.length >= result.total || rows.length < 100) { if (!controller.signal.aborted) setState({ key: cacheKey, status: "normal", items }); return; }
      }
      throw new Error("Pagination limit");
    })().catch(() => { if (!controller.signal.aborted) setState({ key: cacheKey, status: "error", items: [] }); }).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [slug, revision, resource, cacheKey]);
  const current = state.key === cacheKey ? state : { status: "loading", items: [] };
  const title = current.items[0] && slug ? t(current.items[0].title_fa, current.items[0].title_en) : resource === "bundles" ? t("پکیج‌ها", "Bundles") : t("نقاشی‌ها", "Artworks");
  return <main className="container artworks-page" dir={language === 0 ? "rtl" : "ltr"}>
    <nav className="art-breadcrumb"><a href={`/${language === 0 ? "fa" : "en"}/${resource}`}>{resource === "bundles" ? t("پکیج‌ها", "Bundles") : t("گالری نقاشی‌ها", "Art gallery")}</a></nav>
    <section className="art-intro"><div><div className="eyebrow">NILART · {resource.toUpperCase()}</div><h1>{title}</h1></div></section>
    {current.status === "loading" ? <p role="status">{resource === "bundles" ? t("در حال دریافت پکیج‌ها", "Loading bundles") : t("در حال دریافت نقاشی‌ها", "Loading artworks")}</p>
      : current.status === "error" ? <div className="collections-state" role="alert"><p>{resource === "bundles" ? t("دریافت پکیج‌ها ممکن نشد.", "Unable to load bundles.") : t("دریافت نقاشی‌ها ممکن نشد.", "Unable to load artworks.")}</p><button className="button secondary" onClick={() => { setState({ key: cacheKey, status: "loading", items: [] }); setRevision(value => value + 1); }}>{t("دوباره تلاش کنید", "Try again")}</button></div>
      : current.status === "not-found" ? <p>{resource === "bundles" ? t("این پکیج پیدا نشد.", "Bundle not found.") : t("این نقاشی پیدا نشد.", "Artwork not found.")}</p>
      : current.items.length === 0 ? <div className="collections-state"><p>{resource === "bundles" ? t("هنوز پکیج منتشرشده‌ای وجود ندارد.", "No published bundles yet.") : t("هنوز نقاشی منتشرشده‌ای وجود ندارد.", "No published artworks yet.")}</p></div>
      : <div className="art-grid">{current.items.map(item => <article className="art-card" key={item.id}>
        <div className="result-image-error">{t("تصویر در دسترس نیست", "Image unavailable")}</div>
        {!slug && <h2><a href={`/${language === 0 ? "fa" : "en"}/${resource}/${encodeURIComponent(item.slug)}`} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(t(item.title_fa, item.title_en), `/${language === 0 ? "fa" : "en"}/${resource}/${encodeURIComponent(item.slug)}`); }}>{t(item.title_fa, item.title_en)}</a></h2>}
        <p>{t(item.description_fa, item.description_en)}</p>
        {resource === "bundles" && <ul>{item.components?.map(part => <li key={part.sku_id}>{part.quantity} × {t(part.title_fa, part.title_en)} · {part.code}</li>)}</ul>}<p>{t("اطلاعات خرید تأیید نشده", "Purchase details unconfirmed")}</p>
      </article>)}</div>}
  </main>;
}
