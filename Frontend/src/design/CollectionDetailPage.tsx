import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  categories as defaultCategories,
  collectionName,
  collections as defaultCollections,
  defaultCollectionDescription,
  type Collection,
  demoMode,
} from "./data"
import {
  catalogBundles as defaultBundles,
  catalogProducts as defaultProducts,
  catalogResults,
  emptyFilters,
  invalidPrice,
  itemOptions,
  normalizeFilters,
  parseQuery,
  productMatchesCategory,
  serializeQuery,
  type CatalogItem,
  type CatalogProduct,
  type CatalogBundle,
  type Filters,
  type QueryState,
} from "./catalog"
import ProductCard from "./ProductCard"
import BundleResultCard from "./BundleResultCard"
import FilterPanel from "./FilterPanel"

type Props = {
  collections?: Collection[]
  categories?: typeof defaultCategories
  products?: CatalogProduct[]
  bundles?: CatalogBundle[]
  demo?: boolean
  slug: string
  search: string
  language: 0 | 1
  mode: string
  onNavigate: (name: string, route: string) => void
  onQueryChange: (query: string) => void
  onRetry: () => void
  favorites: string[]
  signedIn: boolean
  onFavorite: (id: string) => void
  renderMedia: (color: string, kind: string, hero?: boolean) => ReactNode
  renderSheet: (
    open: boolean,
    onClose: () => void,
    title: string,
    children: ReactNode,
  ) => ReactNode
  arrow: ReactNode
  heart: ReactNode
}
interface FilterChip {
  key: keyof Filters
  label?: string
}
export default function CollectionDetailPage({
  slug,
  search,
  language,
  mode,
  onNavigate,
  onQueryChange,
  onRetry,
  favorites,
  signedIn,
  onFavorite,
  renderMedia,
  renderSheet,
  arrow,
  heart,
  collections = defaultCollections,
  categories = defaultCategories,
  products: catalogProducts = demoMode ? defaultProducts : [],
  bundles: catalogBundles = demoMode ? defaultBundles : [],
  demo = demoMode,
}: Props) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const collection =
    mode === "not-found"
      ? undefined
      : collections.find((c) => c.slug === slug && c.published)
  const state = parseQuery(search)
  const [sheet, setSheet] = useState(false)
  const [draft, setDraft] = useState<Filters>({ ...state.filters })
  const [pending, setPending] = useState(false)
  const [favoriteFailure, setFavoriteFailure] = useState<string | null>(null)
  const previousSearch = useRef(search)
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
  }, [slug])
  useEffect(() => {
    if (previousSearch.current === search) return
    previousSearch.current = search
    setPending(true)
    const timer = setTimeout(() => setPending(false), 300)
    return () => clearTimeout(timer)
  }, [search])
  const update = (patch: Partial<QueryState>) =>
    onQueryChange(serializeQuery({ ...state, ...patch, page: patch.page ?? 1 }))
  const updateFilters = (filters: Filters) =>
    update({ filters: normalizeFilters(filters) })
  const clear = () => updateFilters({ ...emptyFilters })
  const scopedItems: CatalogItem[] = [
    ...catalogProducts,
    ...catalogBundles,
  ].filter((item) => item.published && item.collections.includes(slug))
  const hasPrices = scopedItems.some((item) =>
    itemOptions(item, mode === "all-unavailable", catalogProducts).some(
      (option) => option.available,
    ),
  )
  const sources = catalogProducts.filter(
    (p) =>
      p.published &&
      (p.collections.includes(slug) ||
        scopedItems.some(
          (item) =>
            item.type === "bundle" &&
            item.components.some((part) => part.productId === p.id),
        )),
  )
  const choicesFor = (filters: Filters) => {
    const applicable = sources.filter(
      (p) => productMatchesCategory(p, filters.category),
    )
    return {
      sizes: [
        ...new Set(
          applicable.flatMap((p) =>
            p.skus.map((s) => s.size).filter((s): s is string => !!s),
          ),
        ),
      ].sort(),
      weights: [
        ...new Set(
          applicable.flatMap((p) =>
            p.skus.map((s) => s.weight).filter((s): s is number => !!s),
          ),
        ),
      ].sort((a, b) => a - b),
    }
  }
  const results =
    mode === "unpublished"
      ? []
      : catalogResults(slug, state, mode === "all-unavailable", catalogProducts, catalogBundles)
  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize))
  const page = Math.min(state.page, totalPages)
  const visible = results.slice((page - 1) * pageSize, page * pageSize)
  const loading = pending || mode === "loading" || mode === "results-loading"
  const filtersCount = Object.values(state.filters).filter(
    (value) => value !== "" && value !== false,
  ).length
  const go =
    (name: string, route: string) =>
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      onNavigate(name, route)
    }
  const otherCollections = (
    <a
      className="text-link"
      href="/collections"
      onClick={go(t("کالکشن‌ها", "Collections"), "/collections")}
    >
      {t("کالکشن‌های دیگر را ببین", "Explore other collections")}
      {arrow}
    </a>
  )
  const title = collection
    ? language === 0
      ? `کالکشن ${collectionName(collection, language)}`
      : `${collectionName(collection, language)} Collection`
    : t("این کالکشن پیدا نشد.", "Collection not found.")
  const filterChips = [
    {
      key: "category",
      label: categories.find((c) => c.id === state.filters.category)?.name[
        language
      ],
    },
    { key: "size", label: state.filters.size },
    {
      key: "weight",
      label: state.filters.weight
        ? `${state.filters.weight} ${t("گرم", "gsm")}`
        : "",
    },
    {
      key: "min",
      label: state.filters.min
        ? `${t("از", "Min")} ${Number(state.filters.min).toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("تومان", "toman")}`
        : "",
    },
    {
      key: "max",
      label: state.filters.max
        ? `${t("تا", "Max")} ${Number(state.filters.max).toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("تومان", "toman")}`
        : "",
    },
    {
      key: "stock",
      label: state.filters.stock ? t("فقط موجودها", "In stock only") : "",
    },
  ] as FilterChip[]
  const favorite = (id: string) => {
    if (!demo) return
    if (mode === "favorite-error" && signedIn) setFavoriteFailure(id)
    else {
      setFavoriteFailure(null)
      onFavorite(id)
    }
  }
  return (
    <div className="container collection-detail-page">
      <nav
        className="breadcrumb detail-breadcrumb"
        aria-label={t("مسیر صفحه", "Breadcrumb")}
      >
        <a href="/" onClick={go(t("خانه", "Home"), "/")}>
          {t("خانه", "Home")}
        </a>
        <span aria-hidden="true">/</span>
        <a
          href="/collections"
          onClick={go(t("کالکشن‌ها", "Collections"), "/collections")}
        >
          {t("کالکشن‌ها", "Collections")}
        </a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">
          <bdi>
            {collection
              ? collectionName(collection, language)
              : t("یافت‌نشد", "Not found")}
          </bdi>
        </span>
      </nav>
      {!collection && (mode === "loading" || mode === "error") ? (
        <section className="collections-state" aria-busy={mode === "loading"}>
          <h1 ref={titleRef} tabIndex={-1} role={mode === "error" ? "alert" : "status"}>
            {mode === "loading" ? t("در حال بارگذاری…", "Loading…") : t("بارگذاری کالکشن انجام نشد.", "We couldn't load the collection.")}
          </h1>
          {mode === "error" && <button className="button primary" onClick={onRetry}>{t("دوباره تلاش کنید", "Try again")}</button>}
          {otherCollections}
        </section>
      ) : !collection ? (
        <section className="collections-state">
          <h1 ref={titleRef} tabIndex={-1}>
            {title}
          </h1>
          {otherCollections}
        </section>
      ) : (
        <>
          {mode === "loading" ? (
            <div className="detail-hero detail-hero-skeleton" aria-busy="true">
              <div>
                <h1 className="sr-only">{title}</h1>
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line" />
              </div>
              <div className="skeleton detail-hero-image" />
            </div>
          ) : (
            <CollectionHero
              collection={collection}
              title={title}
              language={language}
              titleRef={titleRef}
              media={renderMedia(collection.color, "book", true)}
            />
          )}
          <div
            className="detail-tabs"
            role="tablist"
            aria-label={t("نوع نتیجه", "Result type")}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                return
              e.preventDefault()
              const tabs = ["all", "products", "bundles"]
              const current = tabs.indexOf(state.tab)
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? 2
                    : (current +
                        ((e.key === "ArrowRight") === (language === 1)
                          ? 1
                          : -1) +
                        3) %
                      3
              update({ tab: tabs[next] })
              document.getElementById(`result-tab-${tabs[next]}`)?.focus()
            }}
          >
            {[
              ["all", t("همه", "All")],
              ["products", t("محصولات", "Products")],
              ["bundles", t("پکیج‌ها", "Bundles")],
            ].map(([tab, label]) => (
              <button
                key={tab}
                id={`result-tab-${tab}`}
                role="tab"
                aria-selected={state.tab === tab}
                aria-controls="collection-results"
                tabIndex={state.tab === tab ? 0 : -1}
                className={state.tab === tab ? "active" : ""}
                onClick={() => update({ tab })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="detail-results-toolbar">
            <div>
              <p className="results-count" role="status" aria-live="polite">
                {loading
                  ? t("در حال بارگذاری…", "Loading…")
                  : `${results.length.toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("نتیجه", "results")}`}
              </p>
              <small>
                {t(
                  demo ? "کاتالوگ و تعداد نتایج نمایشی" : "کاتالوگ و تعداد نتایج",
                  demo ? "Demo catalog & result count" : "Catalog & result count",
                )}
              </small>
            </div>
            <button
              className="button secondary mobile-filters"
              onClick={() => {
                setDraft({ ...state.filters })
                setSheet(true)
              }}
            >
              <FilterIcon />
              {t("فیلترها", "Filters")}
              {filtersCount > 0 && (
                <span className="filter-counter">
                  {filtersCount.toLocaleString(
                    language === 0 ? "fa-IR" : "en-US",
                  )}
                </span>
              )}
            </button>
            <label className="sort-label">
              {t("مرتب‌سازی", "Sort by")}
              <SelectDropdown
                value={state.sort}
                onChange={(e) => update({ sort: e.target.value })}
              >
                <option value="newest">{t("جدیدترین", "Newest")}</option>
                <option value="low">
                  {t("قیمت کمتر", "Price: low to high")}
                </option>
                <option value="high">
                  {t("قیمت بیشتر", "Price: high to low")}
                </option>
                <option disabled value="popular">
                  {t("محبوب‌ترین — داده موجود نیست", "Most popular — no data")}
                </option>
              </SelectDropdown>
            </label>
          </div>
          <div className="detail-workspace">
            <aside className="detail-sidebar">
              <FilterPanel
                key={serializeQuery({ ...state, page: 1 })}
                filters={state.filters}
                onChange={updateFilters}
                language={language}
                {...choicesFor(state.filters)}
                onClear={clear}
                hasPrices={hasPrices}
                categories={categories}
              />
            </aside>
            <div className="detail-results-area">
              {filtersCount > 0 && (
                <div className="active-filter-chips">
                  {filterChips
                    .filter((chip) => chip.label)
                    .map((chip) => (
                      <button
                        className="filter-chip"
                        key={chip.key}
                        onClick={() =>
                          updateFilters({
                            ...state.filters,
                            [chip.key]: chip.key === "stock" ? false : "",
                          })
                        }
                        aria-label={
                          t("حذف فیلتر: ", "Remove filter: ") + chip.label
                        }
                      >
                        <span>{chip.label}</span>
                        <span aria-hidden="true">×</span>
                      </button>
                    ))}
                  <button className="filter-clear" onClick={clear}>
                    {t("پاک‌کردن فیلترها", "Clear filters")}
                  </button>
                </div>
              )}
              {favoriteFailure && (
                <div className="favorite-error" role="alert">
                  <span>
                    {t(
                      "ذخیره علاقه‌مندی انجام نشد؛ وضعیت قبلی حفظ شد.",
                      "Favorite could not be saved; your previous choice is unchanged.",
                    )}
                  </span>
                  <button
                    className="filter-clear"
                    onClick={() => {
                      onFavorite(favoriteFailure)
                      setFavoriteFailure(null)
                    }}
                  >
                    {t("دوباره تلاش کنید", "Try again")}
                  </button>
                </div>
              )}
              <section
                id="collection-results"
                role="tabpanel"
                aria-labelledby={`result-tab-${state.tab}`}
                aria-busy={loading}
              >
                {loading ? (
                  <div className="catalog-grid">
                    {Array.from({ length: pageSize }, (_, index) => (
                      <div key={index} className="skeleton-card">
                        <div className="skeleton catalog-skeleton-image" />
                        <div className="skeleton skeleton-line" />
                        <div className="skeleton skeleton-line short" />
                        <div className="skeleton skeleton-line" />
                      </div>
                    ))}
                  </div>
                ) : mode === "error" ? (
                  <div className="collections-state">
                    <h2 role="alert">
                      {t(
                        "بارگذاری محصولات انجام نشد.",
                        "We couldn't load the products.",
                      )}
                    </h2>
                    <button className="button primary" onClick={onRetry}>
                      {t("دوباره تلاش کنید", "Try again")}
                    </button>
                  </div>
                ) : mode === "unpublished" || scopedItems.length === 0 ? (
                  <div className="collections-state">
                    <h2>
                      {t(
                        "هنوز محصولی از این کالکشن منتشر نشده است.",
                        "No products have been published in this collection yet.",
                      )}
                    </h2>
                    {otherCollections}
                  </div>
                ) : results.length === 0 ? (
                  <div className="collections-state">
                    <h2>
                      {t(
                        "محصولی با این انتخاب‌ها پیدا نشد.",
                        "No items match these filters.",
                      )}
                    </h2>
                    <button className="button secondary" onClick={clear}>
                      {t("پاک‌کردن فیلترها", "Clear filters")}
                    </button>
                  </div>
                ) : (
                  <div className="catalog-grid">
                    {visible.map(({ item, price }) => {
                      const common = {
                        name: item.name[language],
                        route: `/${
                          item.type === "bundle" ? "bundles" : "products"
                        }/${item.slug}`,
                        collection: title,
                        options:
                          item.type === "product"
                            ? [
                                ...new Set(
                                  item.skus.map((s) => s.size).filter(Boolean),
                                ),
                              ].join(" · ")
                            : "",
                        price,
                        language,
                        arrow,
                        heart,
                        onNavigate,
                        detail: true,
                        matching: !!(
                          state.filters.size ||
                          state.filters.weight ||
                          state.filters.min ||
                          state.filters.max
                        ),
                        media: (
                          <div className="result-placeholder">
                            {renderMedia(
                              item.type === "bundle"
                                ? "sand"
                                : collection.color,
                              item.type === "product" ? item.kind : "book",
                              item.type === "bundle",
                            )}
                            <span>{t("تصویر نمونه", "Sample image")}</span>
                          </div>
                        ),
                      }
                      return item.type === "bundle" ? (
                        <BundleResultCard
                          key={item.id}
                          {...common}
                          bundleSummary={item.summary[language]}
                          saving={item.discount}
                        />
                      ) : (
                        <ProductCard
                          key={item.id}
                          {...common}
                          startingPrice={!demo?item.startingPrice:undefined}
                          favorite={demo && favorites.includes(item.id)}
                          onFavorite={() => favorite(item.id)}
                        />
                      )
                    })}
                  </div>
                )}
              </section>
              {totalPages > 1 && !loading && mode !== "error" && (
                <nav
                  className="result-pagination"
                  aria-label={t("صفحه‌بندی نتایج", "Result pagination")}
                >
                  <button
                    className="button secondary"
                    disabled={page === 1}
                    onClick={() => update({ page: page - 1 })}
                  >
                    {t("قبلی", "Previous")}
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index}
                      className={`page-number ${
                        page === index + 1 ? "active" : ""
                      }`}
                      aria-current={page === index + 1 ? "page" : undefined}
                      onClick={() => update({ page: index + 1 })}
                    >
                      {(index + 1).toLocaleString(
                        language === 0 ? "fa-IR" : "en-US",
                      )}
                    </button>
                  ))}
                  <button
                    className="button secondary"
                    disabled={page === totalPages}
                    onClick={() => update({ page: page + 1 })}
                  >
                    {t("بعدی", "Next")}
                  </button>
                  <small>{t("صفحه‌بندی داده نمایشی", "Demo pagination")}</small>
                </nav>
              )}
              <p className="detail-catalog-note">
                {t(
                  "فقط نمونه طراحی؛ قیمت، موجودی و تخفیف تأیید کاتالوگ واقعی نیستند. انتخاب نهایی سایز، برگ و جلد در جزئیات محصول انجام می‌شود.",
                  "Design samples only; prices, stock and savings are not a real catalog. Final size, sheet count and cover are chosen on detail pages.",
                )}
              </p>
            </div>
          </div>
          {renderSheet(
            sheet,
            () => setSheet(false),
            t("فیلترهای کالکشن", "Collection filters"),
            <>
              <div className="filter-sheet-scroll">
                <FilterPanel
                  key={String(sheet)}
                  filters={draft}
                  onChange={setDraft}
                  language={language}
                  {...choicesFor(draft)}
                  draftOnly
                  hasPrices={hasPrices}
                  categories={categories}
                />
              </div>
              <div className="filter-sheet-footer">
                <button
                  className="button secondary"
                  onClick={() => setDraft({ ...emptyFilters })}
                >
                  {t("پاک‌کردن", "Clear")}
                </button>
                <button
                  className="button primary"
                  disabled={
                    invalidPrice(draft) ||
                    [draft.min, draft.max].some(
                      (value) => value !== "" && !/^\d+$/.test(value),
                    )
                  }
                  onClick={() => {
                    updateFilters(draft)
                    setSheet(false)
                  }}
                >
                  {t("اعمال فیلتر", "Apply filters")}
                </button>
              </div>
            </>,
          )}
        </>
      )}
      <div className="detail-other-collections">{otherCollections}</div>
    </div>
  )
}

function FilterIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="8" cy="6" r="2" fill="var(--canvas)" />
      <circle cx="16" cy="12" r="2" fill="var(--canvas)" />
      <circle cx="9" cy="18" r="2" fill="var(--canvas)" />
    </svg>
  )
}
function CollectionHero({
  collection,
  title,
  language,
  titleRef,
  media,
}: {
  collection: Collection
  title: string
  language: 0 | 1
  titleRef: React.RefObject<HTMLHeadingElement | null>
  media: ReactNode
}) {
  return (
    <section className="detail-hero">
      <div className="detail-hero-copy">
        <div className="eyebrow">
          <span className="tiny-line" />
          {language === 0
            ? "یک دنیای تصویری، چند انتخاب"
            : "ONE WORLD, MANY POSSIBILITIES"}
        </div>
        <h1 ref={titleRef} tabIndex={-1}>
          {title}
        </h1>
        <p>
          {(collection.description || defaultCollectionDescription)[language]}
          <small>
            {language === 0
              ? "متن و تصاویر نمونه طراحی"
              : "Sample copy & imagery"}
          </small>
        </p>
      </div>
      <div className={`detail-hero-image ${collection.color}`}>
        <div aria-hidden="true">{media}</div>
        <span className="detail-hero-caption">
          {language === 0
            ? "جای‌نگهدار تصویر کالکشن"
            : "Collection image placeholder"}
        </span>
      </div>
    </section>
  )
}
