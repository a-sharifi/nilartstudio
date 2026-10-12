"use client";

import ProductCard from "../../design/ProductCard";
import type { CatalogData } from "./adapter";

export default function LiveShopPage({ data, status, search, language, retry, navigate, queryChange }: {
  data: CatalogData; status: string; search: string; language: 0 | 1;
  retry: () => void; navigate: (name: string, route: string) => void;
  queryChange: (query: string, replace?: boolean) => void;
}) {
  const t = (fa: string, en: string) => language === 0 ? fa : en;
  const params = new URLSearchParams(search);
  const category = params.get("category") || "";
  const collection = params.get("collection") || "";
  const products = data.products.filter(product => product.published
    && (!category || product.categories?.includes(category))
    && (!collection || product.collections.includes(collection)));
  const rawPage = Number(params.get("page") || 1);
  const pages = Math.max(1, Math.ceil(products.length / 6));
  const page = Math.min(pages, Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(search);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    queryChange(next.toString());
  };
  return <div className="container shop-page" dir={language === 0 ? "rtl" : "ltr"}>
    <nav className="breadcrumb shop-breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
      <a href={language === 0 ? "/fa" : "/en"} onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); navigate(t("خانه", "Home"), language === 0 ? "/fa" : "/en");
      }}>{t("خانه", "Home")}</a><span>/</span><span aria-current="page">{t("فروشگاه", "Shop")}</span>
    </nav>
    <header className="shop-heading"><div><span className="eyebrow">NILART · OBJECTS FOR EVERYDAY</span>
      <h1>{t("فروشگاه نیل‌آرت", "Nilart shop")}</h1>
      <p>{t("محصولات منتشرشده را بر اساس دسته و کالکشن پیدا کنید.", "Find published products by category and collection.")}</p>
    </div><span className="shop-heading-mark" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none">
      <path d="M12 52V26a20 20 0 0 1 40 0v26H12Z" stroke="currentColor" />
      <path d="M20 52V29a12 12 0 0 1 24 0v23M32 6V1M12 15 7 10M52 15l5-5" stroke="currentColor" />
    </svg></span></header>
    <div className="shop-toolbar">
      <label>{t("دسته", "Category")} <select value={category} onChange={event => update("category", event.target.value)}>
        <option value="">{t("همه دسته‌ها", "All categories")}</option>
        {data.categories.map(item => <option key={item.id} value={item.id}>{item.name[language]}</option>)}
      </select></label>
      <label>{t("کالکشن", "Collection")} <select value={collection} onChange={event => update("collection", event.target.value)}>
        <option value="">{t("همه کالکشن‌ها", "All collections")}</option>
        {data.collections.map(item => <option key={item.id} value={item.slug}>{item.name[language]}</option>)}
      </select></label>
    </div>
    {status === "loading" ? <div className="catalog-grid" aria-busy="true" aria-label={t("دریافت محصولات", "Loading products")}>
      {[1, 2, 3, 4, 5, 6].map(id => <div className="shop-product-skeleton" key={id}><div className="skeleton catalog-skeleton-image" /><div className="skeleton skeleton-line" /></div>)}
    </div> : status === "error" ? <div className="collections-state" role="alert"><h3>{t("دریافت محصولات ممکن نشد.", "Unable to load products.")}</h3>
      <button className="button secondary" onClick={retry}>{t("دوباره تلاش کنید", "Try again")}</button></div>
      : products.length === 0 ? <div className="collections-state"><p>{t("محصولی برای نمایش وجود ندارد.", "No products to show.")}</p></div>
      : <><div className="catalog-grid">{products.slice((page - 1) * 6, page * 6).map(product => <div className="shop-result" key={product.id}>
        <ProductCard live availabilityLabel={t("اطلاعات خرید تأیید نشده", "Purchase details unconfirmed")} name={product.name[language]} route={`/products/${encodeURIComponent(product.slug)}${language === 1 ? "?language=en" : ""}`}
          collection={data.collections.filter(item => product.collections.includes(item.slug)).map(item => item.name[language]).join(" · ")}
          options="" language={language} detail onNavigate={navigate} arrow={<span aria-hidden="true">→</span>} heart={null}
          priceUnavailableLabel={t("قیمت و موجودی تأیید نشده", "Price and availability unconfirmed")}
          cta={t("مشاهده محصول", "View product")}
          media={<div className="result-image-error"><span>{t("تصویر در دسترس نیست", "Image unavailable")}</span></div>} />
      </div>)}</div><nav className="result-pagination" aria-label={t("صفحه‌های محصولات", "Product pages")}>
        <button className="button secondary" disabled={page <= 1} onClick={() => update("page", String(page - 1))}>{t("قبلی", "Previous")}</button>
        <span>{page} / {pages}</span><button className="button secondary" disabled={page >= pages} onClick={() => update("page", String(page + 1))}>{t("بعدی", "Next")}</button>
      </nav></>}
  </div>;
}
