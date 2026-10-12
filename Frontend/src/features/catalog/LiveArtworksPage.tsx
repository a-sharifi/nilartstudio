"use client";
import { useEffect, useState } from "react";
import "../../design/artworks.css";

type Artwork = { id: string; slug: string; title_fa: string; title_en: string; description_fa: string; description_en: string };
export default function LiveArtworksPage({ language, slug, navigate }: { language: 0 | 1; slug?: string; navigate: (name: string, route: string) => void }) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key?: string; status: string; items: Artwork[] }>({ status: "loading", items: [] });
  const t = (fa: string, en: string) => language === 0 ? fa : en;
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); setState({ key: slug, status: "error", items: [] }); }, 15000);
    void (async () => {
      const items: Artwork[] = [];
      for (let page = 1; page <= 100; page++) {
        const response = await fetch(`/api/v1/catalog/artworks${slug ? `/${encodeURIComponent(slug)}` : `?page=${page}&page_size=100`}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) { if (response.status === 404 && slug) { setState({ key: slug, status: "not-found", items: [] }); return; } throw new Error("Unavailable"); }
        const result = await response.json();
        const rows = slug ? [result] : result.items;
        if (!Array.isArray(rows) || rows.some(item => !item || ["id", "slug", "title_fa", "title_en", "description_fa", "description_en"].some(key => typeof item[key] !== "string"))) throw new Error("Invalid artwork");
        items.push(...rows);
        if (slug || items.length >= result.total || rows.length < 100) { if (!controller.signal.aborted) setState({ key: slug, status: "normal", items }); return; }
      }
      throw new Error("Pagination limit");
    })().catch(() => { if (!controller.signal.aborted) setState({ key: slug, status: "error", items: [] }); }).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [slug, revision]);
  const current = state.key === slug ? state : { status: "loading", items: [] };
  const title = current.items[0] && slug ? t(current.items[0].title_fa, current.items[0].title_en) : t("نقاشی‌ها", "Artworks");
  return <main className="container artworks-page" dir={language === 0 ? "rtl" : "ltr"}>
    <nav className="art-breadcrumb"><a href={`/${language === 0 ? "fa" : "en"}/artworks`}>{t("گالری نقاشی‌ها", "Art gallery")}</a></nav>
    <section className="art-intro"><div><div className="eyebrow">NILART · ARTWORKS</div><h1>{title}</h1></div></section>
    {current.status === "loading" ? <p role="status">{t("در حال دریافت نقاشی‌ها", "Loading artworks")}</p>
      : current.status === "error" ? <div className="collections-state" role="alert"><p>{t("دریافت نقاشی‌ها ممکن نشد.", "Unable to load artworks.")}</p><button className="button secondary" onClick={() => { setState({ key: slug, status: "loading", items: [] }); setRevision(value => value + 1); }}>{t("دوباره تلاش کنید", "Try again")}</button></div>
      : current.status === "not-found" ? <p>{t("این نقاشی پیدا نشد.", "Artwork not found.")}</p>
      : current.items.length === 0 ? <div className="collections-state"><p>{t("هنوز نقاشی منتشرشده‌ای وجود ندارد.", "No published artworks yet.")}</p></div>
      : <div className="art-grid">{current.items.map(item => <article className="art-card" key={item.id}>
        <div className="result-image-error">{t("تصویر در دسترس نیست", "Image unavailable")}</div>
        {!slug && <h2><a href={`/${language === 0 ? "fa" : "en"}/artworks/${encodeURIComponent(item.slug)}`} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(t(item.title_fa, item.title_en), `/${language === 0 ? "fa" : "en"}/artworks/${encodeURIComponent(item.slug)}`); }}>{t(item.title_fa, item.title_en)}</a></h2>}
        <p>{t(item.description_fa, item.description_en)}</p><p>{t("اطلاعات خرید تأیید نشده", "Purchase details unconfirmed")}</p>
      </article>)}</div>}
  </main>;
}
