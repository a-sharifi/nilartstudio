import { useEffect, useRef, type ReactNode } from "react"
import CollectionCard, { CollectionSkeleton } from "./CollectionCard"
import { collections, type Collection } from "./data"

export default function CollectionsPage({
  language,
  mode,
  onNavigate,
  onRetry,
  renderMedia,
  arrow,
}: {
  language: 0 | 1
  mode: string
  onNavigate: (name: string, route: string) => void
  onRetry: () => void
  renderMedia: (collection: Collection) => ReactNode
  arrow: ReactNode
}) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])
  const published =
    mode === "empty"
      ? []
      : collections.filter((collection) => collection.published)
  const loading = mode === "loading"
  const shopLink = (
    <a
      className="button secondary"
      href="/shop"
      onClick={(e) => {
        e.preventDefault()
        onNavigate(t("فروشگاه", "Shop"), "/shop")
      }}
    >
      {t("مشاهده فروشگاه", "Browse the shop")}
      {arrow}
    </a>
  )
  return (
    <div className="container collections-page">
      <nav className="breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            onNavigate(t("خانه", "Home"), "/")
          }}
        >
          {t("خانه", "Home")}
        </a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t("کالکشن‌ها", "Collections")}</span>
      </nav>
      <section
        className="collections-intro"
        aria-labelledby="collections-title"
      >
        <div className="eyebrow">
          <span className="tiny-line" />
          {t("یک طرح، چند انتخاب", "ONE WORLD, MANY POSSIBILITIES")}
        </div>
        <h1 id="collections-title" ref={heading} tabIndex={-1}>
          {t("کالکشن محبوبت را پیدا کن", "Find your favorite collection")}
        </h1>
        <p>
          {t(
            "از گربه‌ها تا روح‌ها؛ دنیای تصویری مورد علاقه‌ات را انتخاب کن و همه محصولات آن را یکجا ببین.",
            "From cats to ghosts, choose a world you love and explore all its products together.",
          )}
        </p>
        <div className="collections-intro-note">
          <span>
            {t(
              "دفتر، استیکر، نشانک و پکیج؛ با یک هویت تصویری مشترک",
              "Notebooks, stickers, bookmarks & bundles. One shared visual identity.",
            )}
          </span>
          <span dir="ltr">NILART / COLLECTIONS</span>
        </div>
      </section>
      <section
        className="collections-list"
        aria-label={t("فهرست کالکشن‌ها", "Collection list")}
        aria-busy={loading}
      >
        {loading && (
          <span className="sr-only" role="status">
            {t("در حال بارگذاری کالکشن‌ها", "Loading collections")}
          </span>
        )}
        {mode === "error" ? (
          <div className="collections-state">
            <span className="state-symbol" aria-hidden="true">
              !
            </span>
            <h2 role="alert">
              {t(
                "بارگذاری کالکشن‌ها انجام نشد.",
                "We couldn't load the collections.",
              )}
            </h2>
            <p>
              {t(
                "می‌توانی دوباره تلاش کنی؛ مسیر فروشگاه هم در دسترس است.",
                "Try again, or browse the shop in the meantime.",
              )}
            </p>
            <button className="button primary" onClick={onRetry}>
              {t("دوباره تلاش کنید", "Try again")}
            </button>
          </div>
        ) : !loading && published.length === 0 ? (
          <div className="collections-state">
            <span className="state-symbol" aria-hidden="true">
              {arrow}
            </span>
            <h2>
              {t(
                "کالکشن‌ها به‌زودی اینجا نمایش داده می‌شوند.",
                "Collections will appear here soon.",
              )}
            </h2>
            <p>
              {t(
                "فعلاً می‌توانی محصولات فروشگاه را ببینی.",
                "You can browse the shop in the meantime.",
              )}
            </p>
            {shopLink}
          </div>
        ) : (
          <div className="collections-page-grid">
            {loading
              ? Array.from({ length: 5 }, (_, index) => (
                  <CollectionSkeleton key={index} />
                ))
              : published.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    language={language}
                    onNavigate={onNavigate}
                    media={renderMedia(collection)}
                    arrow={arrow}
                    forceFallback={mode === "image-fallback"}
                  />
                ))}
          </div>
        )}
      </section>
      <p className="collections-asset-note">
        {t(
          "تصاویر، جای‌نگهدار طراحی‌اند؛ آثار اصلی کالکشن‌ها پس از دریافت جایگزین می‌شوند.",
          "Images are design placeholders; original collection artwork will be added when supplied.",
        )}
      </p>
      <aside className="collections-shop-path">
        <div>
          <h2>
            {t(
              "ترجیح می‌دهی بر اساس نوع محصول انتخاب کنی؟",
              "Prefer to shop by product type?",
            )}
          </h2>
          <p>
            {t(
              "دفتر، استیکر و دیگر محصولات را در فروشگاه ببین.",
              "Browse notebooks, stickers, and more in the shop.",
            )}
          </p>
        </div>
        {shopLink}
      </aside>
    </div>
  )
}
