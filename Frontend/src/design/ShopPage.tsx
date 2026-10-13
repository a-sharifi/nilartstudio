import SelectDropdown from "../components/ui/SelectDropdown";
import Dropdown from "../components/ui/Dropdown"
import { ReferenceProductImage, ReferenceBundleImage } from "./ReferenceMedia";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react"
import ProductCard from "./ProductCard"
import BundleResultCard from "./BundleResultCard"
import FilterPanel from "./FilterPanel"
import { collectionName, demoCollections, demoCategories, collections as referenceCollections } from "./data"
import { covers } from "./product"
import {
  emptyShopFilters,
  normalizeShopFilters as referenceNormalizeShopFilters,
  parseShopQuery as referenceParseShopQuery,
  priceError,
  serializeShopQuery,
  shopCategories as referenceCategories,
  shopFeatureChoices as referenceFeatureChoices,
  shopResults as referenceResults,
  type ShopCatalog,
  shopScope,
  type ShopFilters,
  type ShopMode,
  type ShopQuery,
} from "./shop"
import "./shop.css"

const previews: [ShopMode, string, string][] = [
  ["normal", "نتایج نمونه", "Sample results"],
  ["loading", "بارگذاری", "Loading"],
  ["empty", "بدون محصول منتشرشده", "No published products"],
  ["network", "خطای دریافت", "Load error"],
  ["image-error", "خطای تصویر", "Image error"],
  ["all-unavailable", "همه ناموجود", "All unavailable"],
  ["member", "علاقه‌مندی حساب نمونه", "Demo member favorites"],
  ["favorite-error", "خطای علاقه‌مندی", "Favorite failure"],
  ["price-unknown", "قیمت دریافت نشده", "Price unavailable"],
]
type Props = {
  liveCatalog?: ShopCatalog
  liveStatus?: string
  onRetry?: () => void
  page: string
  search: string
  language: 0 | 1
  onNavigate: (name: string, route: string) => void
  onQueryChange: (query: string, replace?: boolean) => void
  signedIn: boolean
  favorites: string[]
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
export default function ShopPage({
  liveCatalog,
  liveStatus,
  onRetry,
  page,
  search,
  language,
  onNavigate,
  onQueryChange,
  signedIn,
  favorites,
  onFavorite,
  renderMedia,
  renderSheet,
  arrow,
  heart,
}: Props) {
  const collections = liveCatalog ? [...liveCatalog.collections].sort((a,b)=>(demoCollections.findIndex(c=>c.slug===a.slug)+1 || 999)-(demoCollections.findIndex(c=>c.slug===b.slug)+1 || 999)) : referenceCollections
  const shopCategories = liveCatalog ? [...liveCatalog.categories].sort((a,b)=>(demoCategories.findIndex(c=>c.id===a.slug)+1 || 999)-(demoCategories.findIndex(c=>c.id===b.slug)+1 || 999)) : referenceCategories
  const normalizeShopFilters = (filters: ShopFilters, scope = "") => referenceNormalizeShopFilters(filters, scope, liveCatalog)
  const parseShopQuery = (search: string, scope = "") => referenceParseShopQuery(search, scope, liveCatalog)
  const shopFeatureChoices = (category: string) => referenceFeatureChoices(category, liveCatalog)
  const shopResults = (scope: string, query: ShopQuery, mode: ShopMode = "normal") => referenceResults(scope, query, mode, liveCatalog?.items, liveCatalog)
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const prefix = language === 0 ? "/fa" : "/en",
    shop = `${prefix}/shop`
  const scope = shopScope(page),
    category = shopCategories.find((c) => c.published && c.slug === scope)
  const valid = !scope || !!category
  const query = parseShopQuery(search, scope),
    serialized = serializeShopQuery(query, scope)
  const [previewMode, setMode] = useState<ShopMode>("normal")
  const mode: ShopMode = liveStatus === undefined ? previewMode : liveStatus === "loading" ? "loading" : liveStatus === "error" ? "network" : "normal"
  const [sheet, setSheet] = useState(false),
    [draft, setDraft] = useState<ShopFilters>(query.filters)
  const [guest, setGuest] = useState(false),
    [demoFavorites, setDemoFavorites] = useState<string[]>([])
  const [favoriteFailure, setFavoriteFailure] = useState<string | null>(null),
    [live, setLive] = useState("")
  const filterTrigger = useRef<HTMLButtonElement>(null),
    resultsHeading = useRef<HTMLHeadingElement>(null),
    previousQuery = useRef(search)
  const results = shopResults(scope, query, mode)
  const pages = Math.max(1, Math.ceil(results.length / 6)),
    current = Math.min(query.page, pages)
  const visible = results.slice((current - 1) * 6, current * 6)
  const loaded = valid && mode !== "loading" && mode !== "network"
  const title =
    category?.name[language] ||
    (scope
      ? t("این دسته پیدا نشد.", "Category not found.")
      : t("فروشگاه نیل‌آرت", "Nilart shop"))
  const intro =
    category?.description[language] ||
    t(
      "محصولات هنری را بر اساس نوع، کالکشن و گزینه‌های موجود پیدا کنید.",
      "Discover art-inspired products by type, collection and available options.",
    )
  const saved = signedIn ? favorites : demoFavorites
  const member = signedIn || mode === "member" || mode === "favorite-error"
  const choices = shopFeatureChoices(query.filters.category)
  const number = (value: number) =>
    value.toLocaleString(language === 0 ? "fa-IR" : "en-US")
  const update = (patch: Partial<ShopQuery>) =>
    onQueryChange(
      serializeShopQuery({ ...query, ...patch, page: patch.page ?? 1 }, scope),
    )
  const updateFilters = (filters: ShopFilters) =>
    update({ filters: normalizeShopFilters(filters, scope) })
  const clear = () =>
    update({
      type: scope ? "products" : "all",
      filters: normalizeShopFilters({ ...emptyShopFilters }, scope),
    })
  const go =
    (name: string, route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return
      event.preventDefault()
      onNavigate(name, route)
    }
  const filterChips = [
    {
      key: "category",
      label: scope
        ? ""
        : shopCategories.find((c) => c.slug === query.filters.category)?.name[
            language
          ],
    },
    {
      key: "collection",
      label: collections.find((c) => c.slug === query.filters.collection)?.name[
        language
      ],
    },
    { key: "size", label: query.filters.size },
    {
      key: "weight",
      label:
        query.filters.weight &&
        `${number(Number(query.filters.weight))} ${t("گرم", "gsm")}`,
    },
    {
      key: "sheets",
      label:
        query.filters.sheets &&
        `${number(Number(query.filters.sheets))} ${t("برگ", "sheets")}`,
    },
    {
      key: "cover",
      label: covers.find((c) => c.value === query.filters.cover)?.label[
        language
      ],
    },
    {
      key: "min",
      label:
        query.filters.min &&
        `${t("از", "Min")} ${number(Number(query.filters.min))} ${t("تومان", "toman")}`,
    },
    {
      key: "max",
      label:
        query.filters.max &&
        `${t("تا", "Max")} ${number(Number(query.filters.max))} ${t("تومان", "toman")}`,
    },
    {
      key: "stock",
      label: query.filters.stock ? t("فقط قابل خرید", "Purchasable only") : "",
    },
  ].filter((chip) => chip.label)
  const activeCount =
    filterChips.length + (!scope && query.type !== "all" ? 1 : 0)
  useEffect(() => {
    if (!valid) return
    const canonicalQuery = serializeShopQuery(
      { ...query, page: loaded ? current : query.page },
      scope,
    )
    if ((search.startsWith("?") ? search.slice(1) : search) !== canonicalQuery)
      onQueryChange(canonicalQuery, true)
  }, [search, scope, current, loaded, valid])
  useEffect(() => {
    if (previousQuery.current === search) return
    previousQuery.current = search
    if (loaded)
      setLive(
        t(
          `${number(results.length)} نتیجه برای انتخاب‌های شما.`,
          `${results.length} results for your selection.`,
        ),
      )
  }, [search, loaded, results.length, language])
  useEffect(() => {
    const previousTitle = document.title
    document.title = `${title} | ${language === 0 ? "نیل‌آرت" : "Nilart"}`
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    )
    const oldDescription = description?.content
    const meta = description || document.createElement("meta")
    meta.name = "description"
    meta.content = valid
      ? intro
      : t(
          "این دسته در دسترس نیست. محصولات منتشرشده را در فروشگاه ببینید.",
          "This category is unavailable. Browse published products in the shop.",
        )
    if (!description) document.head.append(meta)
    const canonical = document.createElement("link")
    canonical.rel = "canonical"
    const target = new URL(valid ? page : shop, window.location.origin)
    if (current > 1 && valid) target.searchParams.set("page", String(current))
    canonical.href = target.href
    // The whole project is a noindex Demo. Keep that policy; do not publish fixture offers.
    const robots = document.createElement("meta")
    robots.name = "robots"
    robots.content = "noindex, follow"
    const breadcrumb = document.createElement("script")
    breadcrumb.type = "application/ld+json"
    const links = [
      { name: t("خانه", "Home"), path: "/" },
      { name: t("فروشگاه", "Shop"), path: shop },
      ...(category ? [{ name: category.name[language], path: page }] : []),
    ]
    breadcrumb.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: links.map((link, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: link.name,
        item: new URL(link.path, window.location.origin).href,
      })),
    })
    document.head.append(canonical, robots, breadcrumb)
    return () => {
      document.title = previousTitle
      if (description) description.content = oldDescription || ""
      else meta.remove()
      canonical.remove()
      robots.remove()
      breadcrumb.remove()
    }
  }, [page, language, title, intro, current, valid])
  const closeSheet = () => {
    setSheet(false)
    requestAnimationFrame(() => filterTrigger.current?.focus())
  }
  const panel = (filters: ShopFilters, temporary = false) => {
    const featureChoices = shopFeatureChoices(filters.category)
    const change = (next: ShopFilters) =>
      temporary
        ? setDraft(normalizeShopFilters(next, scope))
        : updateFilters(next)
    return (
      <FilterPanel
        categories={shopCategories.map(category=>({...category,id:category.slug}))}
        filters={filters}
        onChange={(next) => change({ ...filters, ...next })}
        language={language}
        sizes={featureChoices.sizes}
        weights={featureChoices.weights}
        hideCategory={!!scope}
        purchasableOnly
        draftOnly={temporary}
        onClear={() =>
          temporary
            ? setDraft(normalizeShopFilters({ ...emptyShopFilters }, scope))
            : clear()
        }
        beforeCategory={
          <fieldset>
            <legend>{t("کالکشن", "Collection")}</legend>
            <Dropdown label={t("کالکشن", "Collection")} value={filters.collection}
              autocomplete emptyMessage={t("کالکشنی پیدا نشد", "No matching collections")}
              placeholder={t("جست‌وجو یا انتخاب کالکشن", "Search or choose a collection")}
              onChange={value=>change({...filters,collection:value})}
              options={[{value:"",label:t("همه کالکشن‌ها","All collections")},...collections.filter(c=>c.published).map(c=>({value:c.slug,label:collectionName(c,language)}))]} />
            {scope && (
              <small>
                {t(
                  "کالکشن فقط در همین دسته جست‌وجو می‌شود.",
                  "Collections are filtered within this category only.",
                )}
              </small>
            )}
          </fieldset>
        }
        afterAttributes={
          <>
            {featureChoices.sheets.length > 0 && (
              <fieldset>
                <legend>{t("تعداد برگ", "Sheet count")}</legend>
                <SelectDropdown
                  aria-label={t("تعداد برگ", "Sheet count")}
                  value={filters.sheets}
                  onChange={(event) =>
                    change({ ...filters, sheets: event.target.value })
                  }
                >
                  <option value="">
                    {t("همه تعدادها", "All sheet counts")}
                  </option>
                  {featureChoices.sheets.map((n) => (
                    <option key={n} value={n}>
                      {number(n)} {t("برگ", "sheets")}
                    </option>
                  ))}
                </SelectDropdown>
                <small>
                  {t(
                    "تعداد برگ داخل دفتر، نه تعداد واحد خرید.",
                    "Sheets inside a notebook, not purchase quantity.",
                  )}
                </small>
              </fieldset>
            )}
            {featureChoices.covers.length > 0 && (
              <fieldset>
                <legend>{t("نوع جلد", "Cover")}</legend>
                <SelectDropdown
                  aria-label={t("نوع جلد", "Cover")}
                  value={filters.cover}
                  onChange={(event) =>
                    change({ ...filters, cover: event.target.value })
                  }
                >
                  <option value="">{t("همه جلدها", "All covers")}</option>
                  {featureChoices.covers.map((value) => (
                    <option value={value} key={value}>
                      {covers.find((c) => c.value === value)?.label[language]}
                    </option>
                  ))}
                </SelectDropdown>
              </fieldset>
            )}
          </>
        }
      />
    )
  }
  const favorite = (id: string) => {
    if (!member) {
      setGuest(true)
      return
    }
    if (mode === "favorite-error") {
      setFavoriteFailure(id)
      return
    }
    setFavoriteFailure(null)
    if (signedIn) onFavorite(id)
    else {
      setDemoFavorites((previous) =>
        previous.includes(id)
          ? previous.filter((value) => value !== id)
          : [...previous, id],
      )
      setLive(
        t(
          "علاقه‌مندی حساب نمونه تغییر کرد · Demo؛ رزرو یا تضمین قیمت نیست.",
          "Demo account favorite updated; this does not reserve stock or guarantee price.",
        ),
      )
    }
  }
  const baseQuery: ShopQuery = {
    type: scope ? "products" : "all",
    sort: "newest",
    page: 1,
    filters: normalizeShopFilters({ ...emptyShopFilters }, scope),
  }
  const publishedCount = shopResults(
    scope,
    baseQuery,
    mode === "empty" ? "empty" : "normal",
  ).length
  return (
    <div className="container shop-page">
      <nav
        className="breadcrumb shop-breadcrumb"
        aria-label={t("مسیر صفحه", "Breadcrumb")}
      >
        <a href="/" onClick={go(t("خانه", "Home"), "/")}>
          {t("خانه", "Home")}
        </a>
        <span>/</span>
        {scope ? (
          <>
            <a href={shop} onClick={go(t("فروشگاه", "Shop"), shop)}>
              {t("فروشگاه", "Shop")}
            </a>
            <span>/</span>
            <span aria-current="page">
              {category?.name[language] || t("یافت‌نشد", "Not found")}
            </span>
          </>
        ) : (
          <span aria-current="page">{t("فروشگاه", "Shop")}</span>
        )}
      </nav>
      <header className="shop-heading">
        <div>
          <span className="eyebrow">NILART · OBJECTS FOR EVERYDAY</span>
          <h1>{title}</h1>
          {valid && <p>{intro}</p>}
        </div>
        <span className="shop-heading-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M12 52V26a20 20 0 0 1 40 0v26H12Z" stroke="currentColor" />
            <path
              d="M20 52V29a12 12 0 0 1 24 0v23M32 6V1M12 15 7 10M52 15l5-5"
              stroke="currentColor"
            />
          </svg>
        </span>
      </header>
      {!valid ? (
        <section className="collections-state">
          <p>
            {t(
              "این دسته عمومی در دسترس نیست؛ محتوای منتشرنشده نمایش داده نمی‌شود.",
              "This public category is unavailable; unpublished content is not shown.",
            )}
          </p>
          <a
            className="button primary"
            href={shop}
            onClick={go(t("فروشگاه", "Shop"), shop)}
          >
            {t("بازگشت به فروشگاه", "Back to shop")}
          </a>
        </section>
      ) : (
        <>
          {!liveCatalog && <div className="shop-demo">
            <bdi>Demo</bdi>
            <p>
              {t(
                "کاتالوگ، قیمت، موجودی و تعدادها نمونه‌اند؛ سرویس فروش واقعی متصل نیست. تصاویر، موکاپ‌اند و عکس واقعی محصول نیستند.",
                "Catalog, prices, stock and counts are fixtures; no real sales service is connected. Images are mockups, not actual product photographs.",
              )}
            </p>
          </div>}
          {!scope ? (
            <nav
              className="shop-category-nav"
              aria-label={t("دسته‌های محصولات", "Product categories")}
            >
              {shopCategories
                .filter((c) => c.published)
                .map((c) => (
                  <a
                    href={`${prefix}/categories/${c.slug}`}
                    key={c.slug}
                    onClick={go(
                      c.name[language],
                      `${prefix}/categories/${c.slug}`,
                    )}
                  >
                    <span className="shop-category-thumb" aria-hidden="true">
                      {renderMedia(c.color, c.kind)}
                    </span>
                    <span>
                      <strong>{c.name[language]}</strong>
                      <small>
                        {mode === "loading" || mode === "network"
                          ? t("دسته محصولات", "Product category")
                          : `${number(shopResults(c.slug, { ...baseQuery, type: "products", filters: normalizeShopFilters({ ...emptyShopFilters }, c.slug) }, mode === "empty" ? "empty" : "normal").length)} ${liveCatalog ? t("محصول", "products") : t("محصول · Demo", "products · Demo")}`}
                      </small>
                    </span>
                    {arrow}
                  </a>
                ))}
            </nav>
          ) : (
            <div className="shop-category-scope">
              <span>
                {t("نتایج فقط در دسته", "Results scoped to")}{" "}
                <strong>{category!.name[language]}</strong>
              </span>
              <a
                className="text-link"
                href={shop}
                onClick={go(t("همه دسته‌ها", "All categories"), shop)}
              >
                {t("مشاهده همه دسته‌ها", "Browse all categories")}
                {arrow}
              </a>
            </div>
          )}
          <div
            className="shop-live sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {live}
          </div>
          <div className="shop-workspace">
            <aside
              className="shop-sidebar"
              aria-label={t("فیلتر محصولات", "Product filters")}
            >
              <p className="shop-filter-behavior">
                {t(
                  "دسکتاپ: انتخاب‌ها مستقیم اعمال می‌شوند؛ قیمت با دکمه ثبت بازه.",
                  "Desktop selections apply immediately; confirm the price range separately.",
                )}
              </p>
              {panel(query.filters)}
            </aside>
            <section
              className="shop-results"
              aria-labelledby="shop-results-title"
            >
              <div className="shop-toolbar">
                <div>
                  <h2
                    ref={resultsHeading}
                    id="shop-results-title"
                    tabIndex={-1}
                  >
                    {loaded ? (
                      `${number(results.length)} ${t("نتیجه", "results")}`
                    ) : (
                      <span
                        className="skeleton shop-count-skeleton"
                        aria-label={t(
                          "دریافت تعداد نتایج",
                          "Loading result count",
                        )}
                      />
                    )}
                  </h2>
                  <small>
                    {t(
                      liveCatalog ? "انتخاب SKU در جزئیات" : "موجودی آماده · انتخاب SKU در جزئیات",
                      liveCatalog ? "Select a SKU in product details" : "Ready stock · Select a SKU in product details",
                    )}
                  </small>
                </div>
                <button
                  ref={filterTrigger}
                  className="button secondary shop-mobile-filter"
                  disabled={!loaded}
                  onClick={() => {
                    setDraft({ ...query.filters })
                    setSheet(true)
                  }}
                >
                  {t("فیلترها", "Filters")}
                  {activeCount > 0 && (
                    <span className="filter-counter">
                      {number(activeCount)}
                    </span>
                  )}
                </button>
                <label className="sort-label">
                  {t("مرتب‌سازی", "Sort by")}
                  <Dropdown label={t("مرتب‌سازی", "Sort by")} value={query.sort} disabled={!loaded}
                    autocomplete={false} onChange={value=>update({sort:value as ShopQuery["sort"]})}
                    options={[{value:"newest",label:t("جدیدترین","Newest")},{value:"low",label:t("قیمت: کم به زیاد","Price: low to high")},{value:"high",label:t("قیمت: زیاد به کم","Price: high to low")}]} />
                </label>
              </div>
              {!scope && (
                <div
                  className="shop-types"
                  aria-label={t("نوع نتیجه", "Result type")}
                >
                  {(["all", "products", "bundles"] as const).map((type) => (
                    <button
                      key={type}
                      aria-pressed={query.type === type}
                      disabled={!loaded}
                      onClick={() => update({ type })}
                    >
                      {type === "all"
                        ? t("همه", "All")
                        : type === "products"
                          ? t("محصولات", "Products")
                          : t("پکیج‌ها", "Bundles")}
                    </button>
                  ))}
                </div>
              )}
              {activeCount > 0 && (
                <div
                  className="active-filter-chips shop-chips"
                  aria-label={t("فیلترهای اعمال‌شده", "Applied filters")}
                >
                  {!scope && query.type !== "all" && (
                    <button
                      className="filter-chip"
                      onClick={() => update({ type: "all" })}
                    >
                      {query.type === "products"
                        ? t("محصولات", "Products")
                        : t("پکیج‌ها", "Bundles")}
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {filterChips.map((chip) => (
                    <button
                      key={chip.key}
                      className="filter-chip"
                      onClick={() =>
                        updateFilters({
                          ...query.filters,
                          [chip.key]: chip.key === "stock" ? false : "",
                        })
                      }
                      aria-label={`${t("حذف فیلتر", "Remove filter")}: ${chip.label}`}
                    >
                      <bdi>{chip.label}</bdi>
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
                      "ذخیره علاقه‌مندی ممکن نشد؛ وضعیت قبلی حفظ شد.",
                      "Unable to save favorite; previous state is preserved.",
                    )}
                  </span>
                  <button
                    className="text-link shop-text-button"
                    onClick={() => favorite(favoriteFailure)}
                  >
                    {t("تلاش دوباره", "Retry")}
                  </button>
                </div>
              )}
              {mode === "loading" ? (
                <div
                  className="catalog-grid"
                  aria-busy="true"
                  aria-label={t("دریافت محصولات", "Loading products")}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="shop-product-skeleton"
                      aria-hidden="true"
                    >
                      <div className="skeleton catalog-skeleton-image" />
                      <div className="skeleton skeleton-line" />
                      <div className="skeleton skeleton-line short" />
                    </div>
                  ))}
                </div>
              ) : mode === "network" ? (
                <div className="collections-state" role="alert">
                  <h3>
                    {t("دریافت محصولات ممکن نشد.", "Unable to load products.")}
                  </h3>
                  <button
                    className="button secondary"
                    onClick={() => onRetry ? onRetry() : setMode("normal")}
                  >
                    {liveCatalog ? t("تلاش دوباره", "Retry") : t("تلاش دوباره · Demo", "Retry · Demo")}
                  </button>
                </div>
              ) : !results.length ? (
                <div className="collections-state">
                  <h3>
                    {publishedCount === 0
                      ? scope
                        ? t(
                            "در این دسته هنوز محصولی برای نمایش نیست.",
                            "No products are available to display in this category yet.",
                          )
                        : t(
                            "هنوز محصولی برای نمایش منتشر نشده است.",
                            "No products have been published yet.",
                          )
                      : t(
                          "محصولی با این انتخاب‌ها پیدا نشد.",
                          "No products match your selection.",
                        )}
                  </h3>
                  {publishedCount > 0 && (
                    <button className="button secondary" onClick={clear}>
                      {t("پاک‌کردن فیلترها", "Clear filters")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="catalog-grid shop-grid">
                  {visible.map((result) => {
                    const item = result.item,
                      selectedCollection =
                        collections.find(
                          (c) => c.slug === query.filters.collection,
                        ) ||
                        collections.find(
                          (c) =>
                            item.collections.includes(c.slug) && c.published,
                        )
                    const options =
                      item.type === "product"
                        ? [
                            shopCategories.find((c) => c.slug === item.category)
                              ?.name[language],
                            ...[
                              ...new Set(
                                result.matchedSkus
                                  .map((s) => s.size)
                                  .filter(Boolean),
                              ),
                            ],
                            query.filters.weight &&
                              `${query.filters.weight} ${t("گرم", "gsm")}`,
                            query.filters.sheets &&
                              `${query.filters.sheets} ${t("برگ", "sheets")}`,
                            query.filters.cover &&
                              covers.find(
                                (c) => c.value === query.filters.cover,
                              )?.label[language],
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : ""
                    const common = {
                      name: item.name[language],
                      route: `${liveCatalog ? (language === 0 ? "/fa" : "/en") : ""}/${
                        item.type === "product" ? "products" : "bundles"
                      }/${item.slug}`,
                      collection: selectedCollection
                        ? collectionName(selectedCollection, language)
                        : "",
                      options,
                      optionsDirection: "auto" as const,
                      price: result.price,
                      startingPrice: liveCatalog && item.type==="product" ? item.startingPrice : undefined,
                      from: result.from,
                      language,
                      arrow,
                      heart,
                      detail: true,
                      onNavigate,
                      matching: activeCount > 0,
                      cta:
                        item.type === "bundle"
                          ? t("انتخاب اجزا", "Choose components")
                          : item.skus.length > 1
                            ? t("انتخاب گزینه‌ها", "Choose options")
                            : t("مشاهده محصول", "View product"),
                      availabilityLabel:
                        result.price === undefined
                          ? result.unavailableReason === "unknown"
                            ? undefined
                            : t("ناموجود", "Out of stock")
                          : undefined,
                      priceUnavailableLabel:
                        result.unavailableReason === "unknown"
                          ? t("قیمت دریافت نشده", "Price unavailable")
                          : undefined,
                      media:
                        liveCatalog ? (
                          item.type === "product" ? <ReferenceProductImage slug={item.slug} language={language} /> : <ReferenceBundleImage slug={item.slug} language={language} />
                        ) : mode === "image-error" ? (
                          <div className="shop-image-error">
                            <svg
                              width="32"
                              height="32"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <path d="m3 17 5-5 4 4 3-3 6 6" />
                            </svg>
                            <span>
                              {t("تصویر در دسترس نیست", "Image unavailable")}
                            </span>
                          </div>
                        ) : (
                          <div className="result-placeholder">
                            {renderMedia(
                              selectedCollection?.color || "sand",
                              item.type === "product" ? item.kind : "book",
                              item.type === "bundle",
                            )}
                            <span>{t("موکاپ نمونه", "Sample mockup")}</span>
                          </div>
                        ),
                    }
                    return (
                      <div
                        className="shop-result"
                        key={item.id}
                        data-product-id={item.id}
                      >
                        {item.type === "bundle" ? (
                          <BundleResultCard
                            {...common}
                            bundleSummary={item.summary[language]}
                            saving={item.discount}
                          />
                        ) : (
                          <ProductCard
                            {...common}
                            live={!!liveCatalog}
                            favorite={saved.includes(item.id)}
                            onFavorite={liveCatalog ? undefined : () => favorite(item.id)}
                            favoriteLabel={`${
                              saved.includes(item.id)
                                ? t("حذف از علاقه‌مندی", "Remove from favorites")
                                : t("افزودن به علاقه‌مندی", "Save to favorites")
                            }: ${item.name[language]}`}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {loaded && pages > 1 && (
                <nav
                  className="result-pagination"
                  aria-label={t("صفحه‌بندی محصولات", "Product pagination")}
                >
                  <a
                    className="button secondary"
                    href={`${page}?${serializeShopQuery({ ...query, page: Math.max(1, current - 1) }, scope)}`}
                    aria-disabled={current === 1}
                    onClick={(event) => {
                      event.preventDefault()
                      if (current > 1) update({ page: current - 1 })
                    }}
                  >
                    {t("قبلی", "Previous")}
                  </a>
                  {Array.from({ length: pages }, (_, i) => (
                    <a
                      key={i}
                      className={`page-number shop-page-number ${
                        current === i + 1 ? "active" : ""
                      }`}
                      aria-current={current === i + 1 ? "page" : undefined}
                      href={`${page}?${serializeShopQuery({ ...query, page: i + 1 }, scope)}`}
                      onClick={(event) => {
                        if (event.ctrlKey || event.metaKey) return
                        event.preventDefault()
                        update({ page: i + 1 })
                      }}
                    >
                      {number(i + 1)}
                    </a>
                  ))}
                  <a
                    className="button secondary"
                    href={`${page}?${serializeShopQuery({ ...query, page: Math.min(pages, current + 1) }, scope)}`}
                    aria-disabled={current === pages}
                    onClick={(event) => {
                      event.preventDefault()
                      if (current < pages) update({ page: current + 1 })
                    }}
                  >
                    {t("بعدی", "Next")}
                  </a>
                  <small>
                    {t("صفحه", "Page")} {number(current)} / {number(pages)} ·
                    {!liveCatalog && "Demo"}
                  </small>
                </nav>
              )}
              {scope === "sketchbooks" && (
                <a
                  className="text-link shop-guide"
                  href="/guides/buying#notebooks"
                  onClick={go(
                    t("راهنمای انتخاب کاغذ و سایز", "Paper and size guide"),
                    "/guides/buying#notebooks",
                  )}
                >
                  {t("راهنمای انتخاب کاغذ و سایز", "Paper and size guide")}
                  {arrow}
                </a>
              )}
            </section>
          </div>
          <section className="shop-other-paths">
            <p>
              {t(
                "به‌دنبال یک اثر برای دیوار یا نقاشی شخصی هستید؟",
                "Looking for art for your walls or a personal commission?",
              )}
            </p>
            <a
              className="text-link"
              href={`${prefix}/artworks`}
              onClick={go(
                t("گالری نقاشی", "Artwork gallery"),
                `${prefix}/artworks`,
              )}
            >
              {t("گالری نقاشی", "Artwork gallery")}
              {arrow}
            </a>
            <a
              className="text-link"
              href={`${prefix}/commissions`}
              onClick={go(
                t("سفارش نقاشی", "Commission artwork"),
                `${prefix}/commissions`,
              )}
            >
              {t("سفارش نقاشی", "Commission artwork")}
              {arrow}
            </a>
          </section>
        </>
      )}
      {!liveCatalog && <details className="shop-preview">
        <summary>
          {t("حالت‌های پروتوتایپ", "Prototype states")} · PUB-04 · Demo
        </summary>
        <div>
          {previews.map(([value, fa, en]) => (
            <button
              key={value}
              className="button secondary"
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value)
                setFavoriteFailure(null)
              }}
            >
              {t(fa, en)}
            </button>
          ))}
        </div>
        <p>
          {t(
            "دسته‌ها و کالکشن‌ها مستقل‌اند؛ موجودی تکرار نمی‌شود. هیچ پیشنهاد قیمت یا Product schema واقعی از داده Demo منتشر نمی‌شود.",
            "Categories and collections are independent; stock is never duplicated. Demo data publishes no real offer or Product schema.",
          )}
        </p>
      </details>}
      {renderSheet(
        sheet,
        closeSheet,
        t("فیلترها", "Filters"),
        <>
          <div className="filter-sheet-scroll">
            <p className="shop-filter-behavior">
              {t(
                "انتخاب‌ها موقت‌اند؛ فقط با «اعمال فیلترها» ثبت می‌شوند.",
                "Selections are temporary until you apply filters.",
              )}
            </p>
            {scope && (
              <p className="shop-sheet-scope">
                {t("دسته ثابت:", "Fixed category:")} {category?.name[language]}
              </p>
            )}
            {panel(draft, true)}
          </div>
          <div className="filter-sheet-footer">
            <button
              className="button secondary"
              onClick={() =>
                setDraft(normalizeShopFilters({ ...emptyShopFilters }, scope))
              }
            >
              {t("پاک‌کردن", "Clear")}
            </button>
            <button
              className="button primary"
              disabled={!!priceError(draft.min, draft.max)}
              onClick={() => {
                updateFilters(draft)
                closeSheet()
              }}
            >
              {t("اعمال فیلترها", "Apply filters")}
            </button>
          </div>
        </>,
      )}
      {renderSheet(
        guest,
        () => setGuest(false),
        t("ذخیره در حساب شما", "Save in your account"),
        <div className="shop-guest-message">
          <p>
            {t(
              "برای ذخیره علاقه‌مندی وارد شوید. ذخیره مهمان فعال نیست؛ علاقه‌مندی رزرو یا تضمین قیمت نیست.",
              "Sign in to save favorites. Guest saving is unavailable; a favorite does not reserve stock or guarantee price.",
            )}
          </p>
          <a
            className="button primary"
            href={`${prefix}/auth/login?returnTo=${encodeURIComponent(page + (serialized ? `?${serialized}` : ""))}`}
            onClick={(event) => {
              event.preventDefault()
              setGuest(false)
              onNavigate(
                t("ورود", "Sign in"),
                `${prefix}/auth/login?returnTo=${encodeURIComponent(page + (serialized ? `?${serialized}` : ""))}`,
              )
            }}
          >
            {t("ورود به حساب", "Sign in")}
          </a>
        </div>,
      )}
    </div>
  )
}
