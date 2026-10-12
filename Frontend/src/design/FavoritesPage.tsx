import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import ProductCard from "./ProductCard"
import BundleResultCard from "./BundleResultCard"
import BundleStillLife from "./BundleStillLife"
import { ArtGalleryCard, works } from "./ArtworksPage"
import {
  favoriteFixture,
  favoriteResults,
  favoritesPage,
  publicCatalogItem,
  currentCatalogOffer,
  demoFavoriteOwner,
  type FavoriteKind,
  type FavoriteMode,
  type FavoriteRecord,
} from "./favorites"
import "./favorites.css"
const previews: [FavoriteMode, string, string][] = [
  ["normal", "فهرست و حذف Demo", "List & Demo removal"],
  ["remove-error", "خطای حذف", "Removal error"],
  ["empty", "بدون علاقه‌مندی", "No favorites"],
  ["loading", "بارگذاری", "Loading"],
  ["filter-loading", "بارگذاری فیلتر", "Filter loading"],
  ["image-error", "خطای تصویر", "Image error"],
  ["network", "خطای شبکه", "Network error"],
  ["server", "خطای سرور", "Server error"],
  ["denied", "عدم دسترسی", "Access denied"],
]
export default function FavoritesPage({
  page,
  navigate,
  renderMedia,
}: {
  page: string
  navigate: (route: string) => void
  renderMedia: (color: string, kind: string) => ReactNode
}) {
  const en = page.startsWith("/en/"),
    index = en ? 1 : 0,
    t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa",
    account = `${prefix}/account`
  const [mode, setMode] = useState<FavoriteMode>("normal"),
    [records, setRecords] = useState(() => favoriteFixture("normal"))
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState<FavoriteKind>("all"),
    [availableOnly, setAvailableOnly] = useState(false),
    [pageNumber, setPageNumber] = useState(1)
  const [pending, setPending] = useState<Record<string, boolean>>({}),
    [errors, setErrors] = useState<Record<string, string>>({})
  const [live, setLive] = useState(""),
    [filterLoading, setFilterLoading] = useState(false),
    [retrying, setRetrying] = useState(false)
  const [destination, setDestination] = useState<{
    route: string
    name: string
  } | null>(null)
  const dialog = useRef<HTMLDialogElement>(null),
    origin = useRef<HTMLElement | null>(null),
    resultsRef = useRef<HTMLElement>(null),
    heading = useRef<HTMLHeadingElement>(null)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>()),
    locks = useRef(new Set<string>()),
    generation = useRef(0)
  const visible = !["loading", "network", "server", "denied"].includes(mode)
  const authorized = visible
    ? records.filter((record) => record.owner === demoFavoriteOwner)
    : []
  const result = favoriteResults(
    authorized,
    demoFavoriteOwner,
    query,
    kind,
    availableOnly,
    works,
  )
  const pagination = favoritesPage(result, pageNumber)
  const later = (fn: () => void, ms = 700) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      fn()
    }, ms)
    timers.current.add(timer)
  }
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      locks.current.clear()
    },
    [],
  )
  useEffect(() => {
    if (destination) dialog.current?.showModal()
    else if (dialog.current?.open) dialog.current.close()
  }, [destination])
  const close = () => {
    setDestination(null)
    requestAnimationFrame(() => origin.current?.focus())
  }
  const showDestination = (name: string, route: string) => {
    origin.current = (document.activeElement as HTMLElement)
    setDestination({ name, route })
  }
  const follow =
    (name: string, route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return
      event.preventDefault()
      if (route === account || route.includes("/auth/")) navigate(route)
      else showDestination(name, route)
    }
  const filterChange = (fn: () => void) => {
    fn()
    setPageNumber(1)
    if (mode === "filter-loading") {
      const stamp = ++generation.current
      setFilterLoading(true)
      later(() => {
        if (generation.current === stamp) setFilterLoading(false)
      })
    }
  }
  const remove = (record: FavoriteRecord) => {
    if (
      locks.current.has(record.id) ||
      record.owner !== demoFavoriteOwner ||
      !visible
    )
      return
    locks.current.add(record.id)
    setPending((previous) => ({ ...previous, [record.id]: true }))
    setErrors((previous) => {
      const next = { ...previous }
      delete next[record.id]
      return next
    })
    const order = result.map((item) => item.id),
      position = order.indexOf(record.id)
    const nextId = order[position + 1] || order[position - 1]
    const button = document.activeElement
    later(() => {
      locks.current.delete(record.id)
      setPending((previous) => ({ ...previous, [record.id]: false }))
      if (mode === "remove-error") {
        setErrors((previous) => ({
          ...previous,
          [record.id]: t(
            "حذف این مورد ممکن نشد. دوباره تلاش کنید.",
            "Unable to remove this item. Try again.",
          ),
        }))
        setLive(
          t(
            "Demo: حذف ناموفق بود؛ مورد در فهرست باقی ماند. سبد و سفارش تغییر نکردند.",
            "Demo: removal failed; the item remains listed. Cart and orders were not changed.",
          ),
        )
        if (document.activeElement === document.body && button instanceof HTMLElement)
          requestAnimationFrame(() => button.focus())
        return
      }
      setRecords((previous) => previous.filter((item) => item.id !== record.id))
      setLive(
        t(
          "Demo: از علاقه‌مندی‌ها حذف شد. این پاسخ نمونه است؛ حذف واقعی سرویس انجام نشده و سبد یا سفارش تغییر نکرده‌اند.",
          "Demo: removed from favorites. This is a fixture response; no real service removal occurred and cart and orders were not changed.",
        ),
      )
      if (
        document.activeElement === button ||
        document.activeElement === document.body
      )
        requestAnimationFrame(() => {
          const next = nextId
            ? resultsRef.current?.querySelector<HTMLElement>(
                `[data-remove="${nextId}"]`,
              )
            : null
          ;(
            next ||
            resultsRef.current?.querySelector<HTMLElement>("[data-remove]") ||
            heading.current
          )?.focus()
        })
    })
  }
  const reset = (value: FavoriteMode) => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
    locks.current.clear()
    generation.current++
    setMode(value)
    setRecords(favoriteFixture(value))
    setQuery("")
    setKind("all")
    setAvailableOnly(false)
    setPageNumber(1)
    setPending({})
    setErrors({})
    setLive("")
    setFilterLoading(false)
    setRetrying(false)
  }
  const retry = () => {
    if (retrying) return
    setRetrying(true)
    later(() => {
      setRetrying(false)
      setLive(
        t(
          "دریافت علاقه‌مندی‌ها ممکن نشد؛ سرویس متصل نیست.",
          "Unable to load your favorites; no service is connected.",
        ),
      )
    })
  }
  const media = (record: FavoriteRecord, itemKind: string) =>
    mode === "image-error" ? (
      <div className="favorites-image-fallback">
        <Glyph name="paint" size={28} />
        <span>{t("تصویر در دسترس نیست", "Image unavailable")}</span>
      </div>
    ) : record.kind === "bundle" ? (
      <BundleStillLife renderMedia={renderMedia} />
    ) : (
      renderMedia(
        record.targetId === "cat-sketch-127"
          ? "sage"
          : record.targetId === "cat-ruled-hard"
            ? "lilac"
            : "sand",
        itemKind,
      )
    )
  const tile = (record: FavoriteRecord) => {
    const item = publicCatalogItem(record),
      art =
        record.kind === "artwork"
          ? works.find((work) => work.id === record.targetId)
          : undefined
    const name =
      item?.name[index] ||
      art?.title[index] ||
      t("مورد غیرقابل نمایش", "Unavailable item")
    let card: ReactNode
    if (item) {
      const offer = currentCatalogOffer(item)
      const props = {
        name,
        route: `/${
          item.type === "bundle" ? "bundles" : "products"
        }/${item.slug}`,
        collection: t("کالکشن گربه • Demo", "Cats collection • Demo"),
        options:
          item.type === "product"
            ? t(
                "گزینه‌های خرید در جزئیات انتخاب می‌شوند",
                "Purchase options are chosen in details",
              )
            : "",
        price: offer.price,
        language: index as 0 | 1,
        media: media(record, item.type === "product" ? item.kind : "book"),
        arrow: <Glyph name="arrow" size={16} />,
        heart: <Glyph name="heart" size={18} />,
        availabilityLabel: offer.available
          ? t("قابل خرید • Demo", "Available to buy • Demo")
          : t("ناموجود • Demo", "Out of stock • Demo"),
        onNavigate: showDestination,
        detail: true,
        cta:
          item.type === "bundle"
            ? t(
                "مشاهده پکیج و انتخاب گزینه‌ها",
                "View bundle and choose options",
              )
            : t("مشاهده و انتخاب گزینه", "View and choose options"),
      }
      card =
        item.type === "bundle" ? (
          <BundleResultCard {...props} bundleSummary={item.summary[index]} />
        ) : (
          <ProductCard {...props} />
        )
    } else if (art)
      card = (
        <ArtGalleryCard
          work={art}
          language={index}
          saved
          onFavorite={() => {}}
          showFavorite={false}
          imageError={mode === "image-error"}
          onNavigate={showDestination}
        />
      )
    else
      card = (
        <article className="favorites-unpublished">
          <div className="favorites-hidden-art">
            <Glyph name="box" size={38} />
          </div>
          <div>
            <span>
              {t("دیگر منتشرشده نیست • Demo", "No longer published • Demo")}
            </span>
            <h3>
              {t(
                "این مورد دیگر برای نمایش در دسترس نیست.",
                "This item is no longer available to view.",
              )}
            </h3>
            <p>
              {t(
                "این وضعیت، سفارش قبلی یا فایل مشتری را تغییر نمی‌دهد.",
                "This does not change a previous order or a customer file.",
              )}
            </p>
          </div>
        </article>
      )
    return (
      <div className="favorites-tile" key={record.id}>
        {card}
        <div className="favorites-remove-area">
          <button
            className="favorites-remove"
            data-remove={record.id}
            aria-label={`${t("حذف از علاقه‌مندی", "Remove from favorites")} — ${name}`}
            aria-describedby={
              errors[record.id] ? `error-${record.id}` : undefined
            }
            disabled={pending[record.id]}
            onClick={() => remove(record)}
          >
            <Glyph name="heart" size={17} />
            {pending[record.id]
              ? t("در حال حذف…", "Removing…")
              : t("حذف از علاقه‌مندی", "Remove from favorites")}
          </button>
          {errors[record.id] && (
            <p
              id={`error-${record.id}`}
              className="favorites-remove-error"
              role="alert"
            >
              {errors[record.id]}
            </p>
          )}
        </div>
      </div>
    )
  }
  return (
    <DashboardPage
      page={page}
      navigate={navigate}
      renderMedia={renderMedia}
      activeSection="favorites"
      panelTitle={t("علاقه‌مندی‌های شما", "Your favorites")}
    >
      <div className="favorites-page">
        <nav
          className="favorites-breadcrumb"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          <a href={account} onClick={follow(t("حساب", "Account"), account)}>
            {t("حساب", "Account")}
          </a>
          <span>/</span>
          <span aria-current="page">{t("علاقه‌مندی‌ها", "Favorites")}</span>
        </nav>
        <div className="favorites-heading">
          <div>
            <span className="favorites-eyebrow">YOUR ACCOUNT · USER-10</span>
            <h1 ref={heading} tabIndex={-1}>
              {t("علاقه‌مندی‌های شما", "Your favorites")}
            </h1>
            <p>
              {t(
                "انتخاب‌های ذخیره‌شده را مرور کنید و برای خرید، مشخصات و موجودی روز را بررسی کنید.",
                "Browse your saved items and review current details and availability before buying.",
              )}
            </p>
          </div>
          {visible && (
            <span className="favorites-total">
              <Glyph name="heart" size={19} />
              <strong>
                {authorized.length.toLocaleString(en ? "en" : "fa")}
              </strong>
              <span>{t("مورد نمونه", "sample items")}</span>
            </span>
          )}
        </div>
        <div className="favorites-demo">
          <span>Demo</span>
          <p>
            {t(
              "موارد ذخیره‌شده، قیمت و موجودی جاری و پاسخ حذف، همه نمونه طراحی‌اند؛ سرویس واقعی علاقه‌مندی متصل نیست.",
              "Saved items, current prices and availability, and removal responses are design fixtures; no real favorites service is connected.",
            )}
          </p>
        </div>
        <div className="favorites-live" role="status" aria-live="polite">
          {live}
        </div>
        {mode === "denied" ? (
          <section className="favorites-state">
            <Glyph name="shield" size={36} />
            <h2>
              {t(
                "دسترسی به علاقه‌مندی‌های این حساب مجاز نیست.",
                "This account’s favorites are not accessible.",
              )}
            </h2>
            <p>
              {t(
                "اطلاعات فهرست خصوصی تا بررسی نشست و مجوز نمایش داده نمی‌شوند.",
                "Private list information remains hidden pending session and permission checks.",
              )}
            </p>
          </section>
        ) : mode === "network" || mode === "server" ? (
          <section className="favorites-state">
            <Glyph name="heart" size={36} />
            <h2>
              {mode === "server"
                ? t(
                    "علاقه‌مندی‌ها موقتاً در دسترس نیستند.",
                    "Favorites are temporarily unavailable.",
                  )
                : t(
                    "دریافت علاقه‌مندی‌ها ممکن نشد.",
                    "Unable to load your favorites.",
                  )}
            </h2>
            <p>
              {t(
                "این خطا به معنی خالی‌شدن فهرست یا حذف موارد شما نیست.",
                "This error does not mean your list is empty or items were removed.",
              )}
            </p>
            <button
              className="button primary"
              onClick={retry}
              disabled={retrying}
            >
              {retrying
                ? t("در حال تلاش…", "Trying…")
                : t("تلاش دوباره", "Try again")}
            </button>
          </section>
        ) : mode === "loading" ? (
          <div
            aria-busy="true"
            aria-label={t("در حال دریافت علاقه‌مندی‌ها", "Loading favorites")}
          >
            <div className="skeleton favorites-tools-skeleton" />
            <div className="favorites-grid">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div className="skeleton favorites-card-skeleton" key={i} />
              ))}
            </div>
          </div>
        ) : !authorized.length ? (
          <section className="favorites-state">
            <span className="favorites-empty-symbol">
              <Glyph name="heart" size={36} />
            </span>
            <h2>
              {t(
                "هنوز انتخابی ذخیره نکرده‌اید",
                "You haven’t saved any items yet",
              )}
            </h2>
            <p>
              {t(
                "در صفحه محصولات و آثار، از نشان علاقه‌مندی استفاده کنید تا بعداً آن‌ها را پیدا کنید.",
                "Use the favorite control on products and artworks to find them here later.",
              )}
            </p>
            <div className="favorites-empty-actions">
              <a
                className="button primary"
                href="/collections"
                onClick={follow(
                  t("کشف کالکشن‌ها", "Explore collections"),
                  "/collections",
                )}
              >
                {t("کشف کالکشن‌ها", "Explore collections")}
                <Glyph name="arrow" size={16} />
              </a>
              <a
                className="button secondary"
                href={`${prefix}/artworks`}
                onClick={follow(
                  t("دیدن نقاشی‌ها", "Explore artworks"),
                  `${prefix}/artworks`,
                )}
              >
                {t("دیدن نقاشی‌ها", "Explore artworks")}
              </a>
            </div>
          </section>
        ) : (
          <>
            <section
              className="favorites-tools"
              aria-label={t(
                "جست‌وجو و فیلتر علاقه‌مندی‌ها",
                "Search and filter favorites",
              )}
            >
              <label className="favorites-search">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m16 16 5 5" />
                </svg>
                <span className="sr-only">
                  {t("جست‌وجو در علاقه‌مندی‌ها", "Search your favorites")}
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) =>
                    filterChange(() => setQuery(event.target.value))
                  }
                  placeholder={t(
                    "جست‌وجو در علاقه‌مندی‌ها",
                    "Search your favorites",
                  )}
                />
                <button
                  className="icon-button"
                  disabled={!query}
                  aria-label={t("پاک‌کردن جست‌وجو", "Clear search")}
                  onClick={() => filterChange(() => setQuery(""))}
                >
                  <Glyph name="close" size={16} />
                </button>
              </label>
              <div className="favorites-toolbar">
                <div
                  className="favorites-types"
                  role="group"
                  aria-label={t("نوع مورد", "Item type")}
                >
                  {([
                    ["all", t("همه", "All")],
                    ["product", t("محصولات", "Products")],
                    ["bundle", t("پکیج‌ها", "Bundles")],
                    ["artwork", t("نقاشی‌ها", "Artworks")],
                  ] as [FavoriteKind, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={kind === value}
                      onClick={() => filterChange(() => setKind(value))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="favorites-available">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(event) =>
                      filterChange(() => setAvailableOnly(event.target.checked))
                    }
                  />
                  {t("فقط قابل خرید", "Available to buy only")}
                </label>
                <span className="favorites-sort">
                  <Glyph name="clock" size={15} />
                  {t("آخرین ذخیره‌شده", "Recently saved")}
                </span>
              </div>
              <div className="favorites-result-count">
                <span>
                  {filterLoading
                    ? t("در حال به‌روزرسانی نتایج…", "Updating results…")
                    : `${result.length.toLocaleString(en ? "en" : "fa")} ${t("نتیجه نمونه", "sample results")}`}
                </span>
                {(kind !== "all" || availableOnly) && (
                  <button
                    className="text-link"
                    onClick={() =>
                      filterChange(() => {
                        setKind("all")
                        setAvailableOnly(false)
                      })
                    }
                  >
                    {t("پاک‌کردن فیلترها", "Clear filters")}
                  </button>
                )}
              </div>
            </section>
            <div className="favorites-reservation-note">
              <Glyph name="shield" size={17} />
              <p>
                {t(
                  "ذخیره‌کردن، قیمت یا موجودی را رزرو نمی‌کند. انتخاب گزینه و اعتبارسنجی خرید در جزئیات و checkout انجام می‌شوند.",
                  "Saving an item does not reserve its price or stock. Options and purchase validation happen in details and checkout.",
                )}
              </p>
            </div>
            <section
              ref={resultsRef}
              className="favorites-results-region"
              aria-label={t("موارد ذخیره‌شده", "Saved items")}
              aria-busy={filterLoading}
            >
              {filterLoading ? (
                <div className="favorites-grid">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton favorites-card-skeleton" />
                  ))}
                </div>
              ) : !result.length ? (
                <div className="favorites-state favorites-no-results">
                  <Glyph name="search" size={30} />
                  <h2>
                    {t(
                      "موردی با این انتخاب‌ها پیدا نشد.",
                      "No saved items match your selection.",
                    )}
                  </h2>
                  <div className="favorites-empty-actions">
                    <button
                      className="button secondary"
                      disabled={!query}
                      onClick={() => filterChange(() => setQuery(""))}
                    >
                      {t("پاک‌کردن جست‌وجو", "Clear search")}
                    </button>
                    <button
                      className="button secondary"
                      disabled={kind === "all" && !availableOnly}
                      onClick={() =>
                        filterChange(() => {
                          setKind("all")
                          setAvailableOnly(false)
                        })
                      }
                    >
                      {t("پاک‌کردن فیلترها", "Clear filters")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="favorites-grid">
                    {pagination.items.map(tile)}
                  </div>
                  {pagination.pages > 1 && (
                    <nav
                      className="favorites-pagination"
                      aria-label={t(
                        "صفحه‌بندی علاقه‌مندی‌ها",
                        "Favorites pagination",
                      )}
                    >
                      <button
                        disabled={pagination.page <= 1}
                        onClick={() => setPageNumber(pagination.page - 1)}
                      >
                        {t("قبلی", "Previous")}
                      </button>
                      {Array.from({ length: pagination.pages }, (_, i) => (
                        <button
                          key={i}
                          aria-current={
                            pagination.page === i + 1 ? "page" : undefined
                          }
                          onClick={() => setPageNumber(i + 1)}
                        >
                          {(i + 1).toLocaleString(en ? "en" : "fa")}
                        </button>
                      ))}
                      <button
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => setPageNumber(pagination.page + 1)}
                      >
                        {t("بعدی", "Next")}
                      </button>
                      <span>
                        {t("صفحه", "Page")}{" "}
                        {pagination.page.toLocaleString(en ? "en" : "fa")}{" "}
                        {t("از", "of")}{" "}
                        {pagination.pages.toLocaleString(en ? "en" : "fa")}
                      </span>
                    </nav>
                  )}
                </>
              )}
            </section>
          </>
        )}
        <footer className="favorites-footer">
          <span>
            {t(
              "انتخاب‌هایی برای بازگشت، نه عجله برای خرید.",
              "Selections to return to, not a rush to buy.",
            )}
          </span>
          <span>Nilart · Demo</span>
        </footer>
        <details className="dash-preview">
          <summary>
            {t("حالت‌های پیش‌نمایش", "Preview states")} <bdi>USER-10 · Demo</bdi>
          </summary>
          <div>
            {previews.map(([value, fa, english]) => (
              <button
                key={value}
                aria-pressed={mode === value}
                onClick={() => reset(value)}
              >
                {en ? english : fa}
              </button>
            ))}
            <a
              href={`${prefix}/auth/session-expired?returnTo=${encodeURIComponent(page)}`}
              onClick={follow(
                t("نشست منقضی", "Expired session"),
                `${prefix}/auth/session-expired?returnTo=${encodeURIComponent(page)}`,
              )}
            >
              {t("نشست منقضی", "Expired session")}
            </a>
          </div>
        </details>
        <dialog
          className="favorites-destination modal"
          ref={dialog}
          aria-labelledby="favorites-destination-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <div className="modal-head">
            <h2 id="favorites-destination-title">
              {destination?.name ||
                t("مقصد مستقل پروتوتایپ", "Independent prototype destination")}
            </h2>
            <button
              className="icon-button"
              onClick={close}
              aria-label={t("بستن", "Close")}
            >
              <Glyph name="close" />
            </button>
          </div>
          <p>
            {t(
              "صفحه مقصد مستقل است و اینجا بازطراحی نشده است. با بستن این پنجره، جست‌وجو و موقعیت مرور حفظ می‌شوند.",
              "This destination is independent and is not redesigned here. Closing this dialog preserves your search and browsing position.",
            )}
          </p>
          <code dir="ltr">{destination?.route}</code>
          <button className="button secondary" onClick={close}>
            {t("بازگشت به علاقه‌مندی‌ها", "Back to favorites")}
          </button>
          <a
            className="text-link"
            href={destination?.route}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return
              event.preventDefault()
              if (destination) navigate(destination.route)
            }}
          >
            {t("بازکردن صفحه موجود", "Open the existing page")}
            <Glyph name="arrow" size={16} />
          </a>
        </dialog>
      </div>
    </DashboardPage>
  )
}
