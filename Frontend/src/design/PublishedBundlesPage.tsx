import PublishedBundleCard, { referenceBundleOrder } from "./PublishedBundleCard";
import type { ProductDialog } from "./ProductGallery";
import type { BundleCatalog } from "../features/catalog/bundle-catalog";
import { PublishedBundleDetail } from "./BundleDetailPage";

type Props = { catalog: BundleCatalog; slug?: string; language: 0 | 1; onNavigate: (name: string, route: string) => void; renderDialog?: ProductDialog };
export default function PublishedBundlesPage({ catalog, slug, language, onNavigate, renderDialog }: Props) {
  const t = (fa: string, en: string) => language === 0 ? fa : en;
  const root = `/${language === 0 ? "fa" : "en"}/bundles`;
  const link = (event: React.MouseEvent<HTMLAnchorElement>, name: string, route: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onNavigate(name, route);
  };
  if (slug && catalog.status === "normal" && catalog.items[0]) return <PublishedBundleDetail bundle={catalog.items[0]} language={language} onNavigate={onNavigate} renderDialog={renderDialog} />;
  if (slug && catalog.status === "loading") return <div className="container product-detail-page" aria-busy="true"><h1 className="sr-only">{t("بارگذاری پکیج", "Loading bundle")}</h1><div className="product-main-layout"><div className="skeleton product-gallery-skeleton" /><div className="product-loading-info">{Array.from({length:7},(_,i)=><div key={i} className="skeleton skeleton-line" />)}</div></div></div>;
  return <section className="bundle-section"><div className="container section">
    <nav className="breadcrumb detail-breadcrumb"><a href="/" onClick={e=>link(e,t("خانه","Home"),"/")}>{t("خانه","Home")}</a><span>/</span><span aria-current="page">{t("پکیج‌ها","Bundles")}</span></nav>
    <h1 className="sr-only">{t("پکیج‌ها", "Bundles")}</h1><div className="section-heading"><div><div className="eyebrow section-number">04 / NILART STUDIO</div><h2>{t("کنار هم، دوست‌داشتنی‌تر", "Better together")}</h2><p>{t("چند محصول هماهنگ، در یک پکیج.", "Matching products, together in one bundle.")}</p></div></div>
    {catalog.status === "error" ? <div className="collections-state" role="alert"><p>{t("دریافت پکیج‌ها ممکن نشد.","Unable to load bundles.")}</p><button className="button secondary" onClick={catalog.retry}>{t("دوباره تلاش کنید","Try again")}</button></div>
    : catalog.status === "not-found" ? <div className="collections-state"><h2>{t("این پکیج پیدا نشد.","Bundle not found.")}</h2><a className="button primary" href={root} onClick={e=>link(e,t("پکیج‌ها","Bundles"),root)}>{t("مشاهده پکیج‌ها","Browse bundles")}</a></div>
    : <div className="bundle-grid" aria-busy={catalog.status === "loading"}>
      {catalog.status === "loading" ? Array.from({length:2},(_,i)=><div key={i} className="skeleton skeleton-bundle" />) : catalog.items.length === 0 ? <div className="empty-state">{t("هنوز پکیج منتشرشده‌ای وجود ندارد.","No published bundles yet.")}</div> : [...catalog.items].sort(referenceBundleOrder).map(bundle=><PublishedBundleCard key={bundle.id} bundle={bundle} language={language} onNavigate={onNavigate}/>)}
    </div>}
  </div></section>;
}
