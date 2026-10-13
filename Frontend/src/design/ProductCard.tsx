import type { ReactNode } from "react"

export type ProductCardProps = {
  live?: boolean
  name: string
  route: string
  collection: string
  options: string
  price?: number
  language: 0 | 1
  media: ReactNode
  arrow: ReactNode
  heart: ReactNode
  onNavigate: (name: string, route: string) => void
  onFavorite?: () => void
  favorite?: boolean
  detail?: boolean
  matching?: boolean
  bundleSummary?: string
  saving?: number
  cta?: string
  availabilityLabel?: string
  from?: boolean
  priceNote?: string
  priceUnavailableLabel?: string
  favoriteLabel?: string
  optionsDirection?: "ltr" | "auto"
}
export default function ProductCard(props: ProductCardProps) {
  const {
    live = false,
    name,
    route,
    collection,
    options,
    price,
    language,
    media,
    arrow,
    heart,
    onNavigate,
    onFavorite,
    favorite,
    detail,
    matching,
    bundleSummary,
    saving,
    cta,
    availabilityLabel,
    from = true,
    priceUnavailableLabel,
    priceNote,
    favoriteLabel,
    optionsDirection = "ltr",
  } = props
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const linkProps = {
    href: route,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      onNavigate(name, route)
    },
  }
  return (
    <article
      className={`product-card ${detail ? "catalog-result-card" : ""} ${
        bundleSummary ? "catalog-bundle-card" : ""
      }`}
    >
      <div className="product-image">
        <a {...linkProps} aria-label={name}>
          {media}
        </a>
        {onFavorite && (
          <button
            className={`icon-button favorite ${favorite ? "selected" : ""}`}
            aria-label={favoriteLabel || t("علاقه‌مندی: ", "Favorite: ") + name}
            aria-pressed={!!favorite}
            onClick={onFavorite}
          >
            {heart}
          </button>
        )}
        {(availabilityLabel || price === undefined) && (
          <span className="stock-badge">
            {availabilityLabel || t("ناموجود", "Out of stock")}
          </span>
        )}
        {detail && (
          <span className="result-type">
            {bundleSummary ? t("پکیج", "Bundle") : t("محصول", "Product")}
          </span>
        )}
      </div>
      <div className="product-info">
        <span className="product-collection">{collection}</span>
        <h3>
          <a {...linkProps}>{name}</a>
        </h3>
        <p
          className={bundleSummary ? "bundle-summary" : "product-options"}
          dir={bundleSummary ? undefined : optionsDirection}
        >
          {bundleSummary || options || "—"}
        </p>
        <div className="product-price">
          {price === undefined ? (
            <span className="unavailable">
              {priceUnavailableLabel || t("ناموجود", "Out of stock")}
            </span>
          ) : (
            <>
              {from ? t("از ", "From ") : ""}
              <strong>
                {price.toLocaleString(language === 0 ? "fa-IR" : "en-US")}
              </strong>{" "}
              {t("تومان", "toman")}
            </>
          )}
        </div>
        {matching && price !== undefined && (
          <small className="matching-price">
            {t("برای گزینه‌های انتخابی", "For matching options")}
          </small>
        )}
        {saving && price !== undefined ? (
          <small className="bundle-saving">
            {t("صرفه‌جویی نمونه: ", "Demo saving: ")}
            {saving.toLocaleString(language === 0 ? "fa-IR" : "en-US")}{" "}
            {t("تومان", "toman")}
          </small>
        ) : null}
        {(priceNote || !live) && <small className="demo-price">
          {priceNote || t("داده نمایشی؛ قیمت و موجودی نمونه", "Demo price & availability")}
        </small>}
        <a {...linkProps} className="product-cta">
          {cta ||
            (bundleSummary
              ? t("مشاهده پکیج", "View bundle")
              : t("مشاهده محصول", "View product"))}
          {arrow}
        </a>
      </div>
    </article>
  )
}
