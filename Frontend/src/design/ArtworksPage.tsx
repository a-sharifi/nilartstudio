import { useEffect, useRef, useState } from "react"
import "./artworks.css"
import type { ArtworkCatalog, ArtworkRecord } from "../features/catalog/artwork-catalog"

type Filters = {
  available: boolean
  min: string
  max: string
  medium: string
  style: string
  orientation: string
}
const blank: Filters = {
  available: false,
  min: "",
  max: "",
  medium: "",
  style: "",
  orientation: "",
}
export const works = [
  {
    id: "quiet-morning",
    title: ["صبح آرام", "Quiet morning"],
    medium: "oil",
    style: "landscape",
    width: 40,
    height: 60,
    price: 4800000,
    status: "available",
    unique: true,
    palette: 0,
  },
  {
    id: "earth-memory",
    title: ["خاطره‌ی زمین", "Memory of earth"],
    medium: "acrylic",
    style: "abstract",
    width: 50,
    height: 50,
    price: 3600000,
    status: "available",
    unique: true,
    palette: 1,
  },
  {
    id: "blue-distance",
    title: ["دوردست آبی", "Blue distance"],
    medium: "oil",
    style: "landscape",
    width: 70,
    height: 50,
    price: 6200000,
    status: "sold",
    unique: true,
    palette: 2,
  },
  {
    id: "olive-light",
    title: ["نور زیتونی", "Olive light"],
    medium: "acrylic",
    style: "abstract",
    width: 40,
    height: 60,
    price: 2900000,
    status: "available",
    unique: false,
    palette: 3,
  },
  {
    id: "afternoon",
    title: ["عصرِ خاموش", "Still afternoon"],
    medium: "oil",
    style: "landscape",
    width: 60,
    height: 40,
    price: null,
    status: "unavailable",
    unique: false,
    palette: 4,
  },
  {
    id: "sun-warmth",
    title: ["گرمای آفتاب", "Warmth of the sun"],
    medium: "acrylic",
    style: "abstract",
    width: 50,
    height: 50,
    price: 4100000,
    status: "available",
    unique: true,
    palette: 5,
  },
  {
    id: "green-horizon",
    title: ["افق سبز", "Green horizon"],
    medium: "oil",
    style: "landscape",
    width: 70,
    height: 50,
    price: 5200000,
    status: "available",
    unique: true,
    palette: 0,
  },
  {
    id: "terracotta",
    title: ["سکوت سفالی", "Terracotta silence"],
    medium: "acrylic",
    style: "abstract",
    width: 40,
    height: 60,
    price: 3300000,
    status: "sold",
    unique: true,
    palette: 1,
  },
  {
    id: "last-light",
    title: ["آخرین روشنایی", "Last light"],
    medium: "oil",
    style: "landscape",
    width: 50,
    height: 50,
    price: 4500000,
    status: "available",
    unique: false,
    palette: 2,
  },
]
const normalize = (s: string) =>
  s.replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
const digits = (s: string) =>
  s.replace(/[۰-۹٠-٩]/g, (c) =>
    String(
      "۰۱۲۳۴۵۶۷۸۹".includes(c)
        ? "۰۱۲۳۴۵۶۷۸۹".indexOf(c)
        : "٠١٢٣٤٥٦٧٨٩".indexOf(c),
    ),
  )
const validPrice = (f: Filters) =>
  [f.min, f.max].every((v) => !v || /^\d+$/.test(v)) &&
  (!f.min || !f.max || Number(f.min) <= Number(f.max))
function readState() {
  const p = new URLSearchParams(window.location.search)
  const filters = {
    ...blank,
    available: p.get("available") === "1",
    min: digits(p.get("min") || ""),
    max: digits(p.get("max") || ""),
    medium: ["oil", "acrylic"].includes(p.get("medium") || "")
      ? p.get("medium")!
      : "",
    style: ["abstract", "landscape"].includes(p.get("style") || "")
      ? p.get("style")!
      : "",
    orientation: ["portrait", "landscape", "square"].includes(
      p.get("orientation") || "",
    )
      ? p.get("orientation")!
      : "",
  }
  if (!validPrice(filters)) {
    filters.min = ""
    filters.max = ""
  }
  return {
    filters,
    query: normalize(p.get("q") || ""),
    sort: ["newest", "low", "high"].includes(p.get("sort") || "")
      ? p.get("sort")!
      : "newest",
    page: Math.max(1, Number(p.get("page")) || 1),
  }
}
export type GalleryWork = Omit<(typeof works)[number], "width" | "height"> & { width: number | null; height: number | null; catalogRecord?: ArtworkRecord }

export function Symbol({
  name,
}: {
  name: "search" | "heart" | "arrow" | "filter" | "close" | "image"
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "search" ? (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </>
      ) : name === "heart" ? (
        <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" />
      ) : name === "arrow" ? (
        <path d="M19 12H5m6-6-6 6 6 6" />
      ) : name === "image" ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8" cy="8" r="2" />
          <path d="m3 18 6-6 4 4 4-6 4 5" />
        </>
      ) : name === "close" ? (
        <path d="m6 6 12 12M6 18 18 6" />
      ) : (
        <>
          <path d="M4 7h16M4 17h16" />
          <circle cx="9" cy="7" r="3" />
          <circle cx="15" cy="17" r="3" />
        </>
      )}
    </svg>
  )
}

// Original illustrative SVGs for the explicitly labelled demo, not catalog assets.
export function DemoPainting({ work }: { work: GalleryWork }) {
  const colors = [
    ["#d9d6b8", "#89947e", "#3e5b4f", "#ded7b3"],
    ["#e4c9b1", "#af654c", "#703e33", "#e9b97b"],
    ["#d1d8d5", "#78949b", "#405e6a", "#e0d7bd"],
    ["#ddd8bc", "#a4a67c", "#606b49", "#eedfc2"],
    ["#e5d4bd", "#9b9380", "#566653", "#b9a689"],
    ["#ead8b6", "#c28b52", "#8e523b", "#f2cf82"],
  ][work.palette]
  const w = (work.width ?? 1) * 6,
    h = (work.height ?? 1) * 6
  return (
    <svg
      className="demo-painting"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`${work.title.join(" / ")} — Demo illustration`}
    >
      <defs>
        <filter id={`grain-${work.id}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".48"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".2" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
        <linearGradient id={`sky-${work.id}`} x2="0" y2="1">
          <stop stopColor={colors[0]} />
          <stop offset="1" stopColor={colors[3]} />
        </linearGradient>
      </defs>
      <g filter={`url(#grain-${work.id})`}>
        <path fill={`url(#sky-${work.id})`} d={`M0 0h${w}v${h}H0z`} />
        {work.style === "landscape" ? (
          <>
            <path
              d={`M0 ${h * 0.5}Q${w * 0.23} ${h * 0.38} ${w * 0.49} ${h * 0.52}T${w} ${h * 0.46}V${h}H0Z`}
              fill={colors[1]}
            />
            <path
              d={`M0 ${h * 0.68}Q${w * 0.42} ${h * 0.48} ${w} ${h * 0.66}V${h}H0Z`}
              fill={colors[2]}
            />
            <path
              d={`M${w * 0.46} ${h * 0.57}Q${w * 0.75} ${h * 0.7} ${w * 0.24} ${h}H${w * 0.54}Q${w * 0.9} ${h * 0.7} ${w * 0.5} ${h * 0.57}`}
              fill={colors[3]}
              opacity=".8"
            />
            {Array.from({ length: 27 }, (_, i) => (
              <path
                key={i}
                d={`M${(i * 37) % w} ${h * 0.72 + ((i * 19) % (h * 0.27))}l${12 + (i % 8)} -${3 + (i % 6)}`}
                stroke={colors[i % 4]}
                strokeWidth="3"
                opacity=".55"
              />
            ))}
            <path
              d={`M${w * 0.19} ${h * 0.68}v-${h * 0.3}m0 ${h * 0.12}q-${w * 0.17} -${h * 0.2} -${w * 0.07} -${h * 0.25}q${w * 0.17} -${h * 0.07} ${w * 0.16} ${h * 0.13}q${w * 0.02} ${h * 0.12} -${w * 0.09} ${h * 0.12}`}
              fill={colors[2]}
              stroke={colors[2]}
              strokeWidth="3"
            />
          </>
        ) : (
          <>
            <path
              d={`M0 ${h * 0.32}Q${w * 0.65} -${h * 0.2} ${w * 0.72} ${h * 0.45}T${w * 0.35} ${h}H0Z`}
              fill={colors[1]}
            />
            <circle cx={w * 0.7} cy={h * 0.26} r={w * 0.22} fill={colors[3]} />
            <path
              d={`M${w * 0.44} ${h}V${h * 0.58}a${w * 0.22} ${w * 0.22} 0 0 1 ${w * 0.44} 0V${h}Z`}
              fill={colors[2]}
            />
            <path
              d={`M${w * 0.22} ${h * 0.15}Q${w * 0.64} ${h * 0.6} ${w * 0.12} ${h * 0.86}`}
              stroke={colors[0]}
              strokeWidth="3"
              fill="none"
            />
            {Array.from({ length: 14 }, (_, i) => (
              <path
                key={i}
                d={`M0 ${h * 0.62 + i * 5}l${w * 0.42} -${i * 2}`}
                stroke={colors[3]}
                opacity=".3"
              />
            ))}
          </>
        )}
      </g>
    </svg>
  )
}

export default function ArtworksPage({
  language,
  signedIn,
  onNavigate,
  savedFavorites,
  onFavorite,
  catalog,
}: {
  catalog?: ArtworkCatalog
  language: 0 | 1
  signedIn: boolean
  onNavigate: (name: string, route: string) => void
  savedFavorites?: string[]
  onFavorite?: (id: string) => void
}) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const num = (n: number) =>
    n.toLocaleString(language === 0 ? "fa-IR" : "en-US")
  const prefix = language === 0 ? "/fa" : "/en"
  const [state, setState] = useState(readState)
  const [input, setInput] = useState(state.query)
  const [draft, setDraft] = useState(state.filters)
  const [sheet, setSheet] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const [previewMode, setMode] = useState("normal")
  const mode = catalog ? catalog.status === "normal" && catalog.items.length === 0 ? "empty" : catalog.status : previewMode
  const source: GalleryWork[] = catalog?.items ?? works
  const [localFavorites, setFavorites] = useState<string[]>([])
  const favorites = savedFavorites ?? localFavorites
  const [message, setMessage] = useState("")
  const update = (patch: Partial<typeof state>) =>
    setState((s) => ({ ...s, ...patch, page: patch.page ?? 1 }))
  useEffect(() => {
    const restore = () => {
      const s = readState()
      setState(s)
      setInput(s.query)
      setDraft(s.filters)
    }
    window.addEventListener("popstate", restore)
    return () => window.removeEventListener("popstate", restore)
  }, [])
  useEffect(() => {
    const p = new URLSearchParams()
    if (state.query) p.set("q", state.query)
    Object.entries(state.filters).forEach(([k, v]) => {
      if (v) p.set(k, v === true ? "1" : String(v))
    })
    if (state.sort !== "newest") p.set("sort", state.sort)
    if (state.page > 1) p.set("page", String(state.page))
    window.history.replaceState(
      { ...window.history.state, search: p.toString() ? `?${p}` : "" },
      "",
      `${prefix}/artworks${p.size ? `?${p}` : ""}`,
    )
  }, [state, prefix])
  useEffect(() => {
    if (sheet) dialog.current?.showModal()
    else dialog.current?.close()
  }, [sheet])
  const mediumName = (v: string) =>
    v === "oil" ? t("رنگ روغن", "Oil painting") : t("اکریلیک", "Acrylic")
  const styleName = (v: string) =>
    v === "abstract" ? t("انتزاعی", "Abstract") : t("منظره", "Landscape")
  const orientationName = (v: string) =>
    v === "portrait"
      ? t("عمودی", "Portrait")
      : v === "landscape"
        ? t("افقی", "Landscape")
        : t("مربع", "Square")
  const orientation = (w: GalleryWork) =>
    w.width === null || w.height === null ? "" : w.width === w.height
      ? "square"
      : w.width < w.height
        ? "portrait"
        : "landscape"
  const f = state.filters
  const results = source.filter(
    (w) =>
      (!state.query ||
        normalize(
          `${w.title[language]} ${w.catalogRecord ? w.catalogRecord.description_fa + " " + w.catalogRecord.description_en : t("هنرمند نمونه", "Demo artist")}`,
        ).includes(normalize(state.query))) &&
      (!f.available || w.status === "available") &&
      (!f.medium || w.medium === f.medium) &&
      (!f.style || w.style === f.style) &&
      (!f.orientation || orientation(w) === f.orientation) &&
      (!f.min || (w.price !== null && w.price >= Number(f.min))) &&
      (!f.max || (w.price !== null && w.price <= Number(f.max))),
  )
  if (state.sort !== "newest")
    results.sort((a, b) =>
      a.price === null && b.price === null ? 0 : a.price === null
        ? 1
        : b.price === null
          ? -1
          : state.sort === "low"
            ? a.price - b.price
            : b.price - a.price,
    )
  const pages = Math.max(1, Math.ceil(results.length / 6))
  const page = Math.min(state.page, pages)
  useEffect(() => {
    if (state.page !== page) setState((s) => ({ ...s, page }))
  }, [page, state.page])
  const active = Object.entries(f).filter(([, v]) => Boolean(v))
  const priceError = !validPrice(draft)
  const filterPanel = (values: Filters, change: (next: Filters) => void) => (
    <div className="art-filter-panel">
      <div className="art-filter-heading">
        <h2>{t("فیلترها", "Filters")}</h2>
        <button className="filter-clear" onClick={() => change({ ...blank })}>
          {t("پاک‌کردن فیلترها", "Clear filters")}
        </button>
      </div>
      <label className="art-available">
        <input
          type="checkbox"
          checked={values.available}
          onChange={(e) => change({ ...values, available: e.target.checked })}
        />
        {t("فقط آثار موجود", "Available works only")}
        <span className="art-switch" aria-hidden="true" />
      </label>
      <fieldset>
        <legend>
          {t("بازه قیمت", "Price range")}{" "}
          <small>{t("(تومان)", "(Toman)")}</small>
        </legend>
        <div className="art-price-inputs">
          {(["min", "max"] as const).map((key) => (
            <label key={key}>
              {key === "min" ? t("از", "From") : t("تا", "To")}
              <input
                inputMode="numeric"
                value={values[key]}
                placeholder={key === "min" ? "0" : "—"}
                onChange={(e) =>
                  change({ ...values, [key]: digits(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
        {!validPrice(values) && (
          <p className="art-validation" role="alert">
            {t(
              "بازه قیمت معتبر و غیرمنفی وارد کنید.",
              "Enter a valid, nonnegative price range.",
            )}
          </p>
        )}
      </fieldset>
      {(["medium", "style", "orientation"] as const).map((key) => (
        <fieldset key={key}>
          <legend>
            {key === "medium"
              ? t("تکنیک", "Medium")
              : key === "style"
                ? t("سبک", "Style")
                : t("جهت اثر", "Orientation")}
          </legend>
          {(key === "medium"
            ? ["oil", "acrylic"]
            : key === "style"
              ? ["landscape", "abstract"]
              : ["portrait", "landscape", "square"]
          ).map((v) => (
            <label className="art-check" key={v}>
              <input
                type="checkbox"
                checked={values[key] === v}
                onChange={() =>
                  change({ ...values, [key]: values[key] === v ? "" : v })
                }
              />
              {key === "medium"
                ? mediumName(v)
                : key === "style"
                  ? styleName(v)
                  : orientationName(v)}
            </label>
          ))}
        </fieldset>
      ))}
      <p className="art-filter-note">
        {t(
          "ابعاد هر اثر به ترتیب عرض × ارتفاع، بر حسب سانتی‌متر درج شده است.",
          "Dimensions are listed as width × height in centimeters.",
        )}
      </p>
    </div>
  )
  const routeLink = (label: string, route: string, className = "text-link") => (
    <a
      className={className}
      href={route}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) return
        e.preventDefault()
        onNavigate(label, route)
      }}
    >
      {label}
      <span className="direction-arrow">
        <Symbol name="arrow" />
      </span>
    </a>
  )
  return (
    <div className="container artworks-page">
      <nav className="art-breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            onNavigate(t("خانه", "Home"), "/")
          }}
        >
          {t("خانه", "Home")}
        </a>
        <span>/</span>
        <span>{t("نقاشی‌ها", "Artworks")}</span>
      </nav>
      <section className="art-intro">
        <div>
          <div className="eyebrow">
            <span className="tiny-line" />
            NILART GALLERY
          </div>
          <h1>{t("گالری نقاشی‌ها", "Art gallery")}</h1>
          <p>
            {t(
              "آثار آماده را ببینید و نقاشی مناسب فضای خود را پیدا کنید.",
              "Explore available artworks and find a piece for your space.",
            )}
          </p>
        </div>
        <div className="art-intro-aside">
          <span>
            {t(
              "هنر، برای گوشه‌ای از زندگی شما",
              "Art, for a corner of your life",
            )}
          </span>
          {routeLink(
            t(
              "اثر شخصی می‌خواهید؟ سفارش نقاشی سفارشی",
              "Looking for a personal piece? Commission an artwork",
            ),
            `${prefix}/commissions/new`,
          )}
        </div>
      </section>
      {!catalog && <div className="art-demo-note">
        <span>DEMO</span>
        {t(
          "آثار تصویرسازی‌شده و اطلاعات این گالری نمونه‌اند؛ قیمت و موجودی واقعی نیستند.",
          "Illustrated artworks and catalog data are samples; prices and availability are not live.",
        )}
      </div>}
      <form
        className="art-search"
        onSubmit={(e) => {
          e.preventDefault()
          update({ query: normalize(input) })
        }}
      >
        <label htmlFor="art-search">
          {t("جست‌وجو در نقاشی‌ها", "Search artworks")}
        </label>
        <div>
          <Symbol name="search" />
          <input
            id="art-search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("نام اثر یا هنرمند", "Artwork title or artist")}
          />
          {input && (
            <button
              type="button"
              className="icon-button"
              aria-label={t("پاک‌کردن جست‌وجو", "Clear search")}
              onClick={() => {
                setInput("")
                update({ query: "" })
              }}
            >
              <Symbol name="close" />
            </button>
          )}
          <button className="button secondary" type="submit">
            {t("جست‌وجو", "Search")}
          </button>
        </div>
      </form>
      <div className="art-layout">
        <aside className="art-desktop-filters">
          {filterPanel(draft, (next) => {
            setDraft(next)
            if (validPrice(next)) update({ filters: next })
          })}
        </aside>
        <section
          className="art-results"
          aria-label={t("آثار", "Artworks")}
          aria-busy={mode === "loading"}
        >
          <div className="art-toolbar">
            <span aria-live="polite">
              {num(mode === "empty" ? 0 : results.length)}{" "}
              {t("اثر", "artworks")}
              {!catalog && <small> / DEMO</small>}
            </span>
            <div>
              <button
                className="button secondary art-mobile-filter"
                onClick={() => {
                  setDraft(f)
                  setSheet(true)
                }}
              >
                <Symbol name="filter" />
                {t("فیلترها", "Filters")}
                {active.length > 0 && ` (${num(active.length)})`}
              </button>
              <label className="art-sort">
                {t("مرتب‌سازی:", "Sort by:")}
                <select
                  value={state.sort}
                  onChange={(e) => update({ sort: e.target.value })}
                >
                  <option value="newest">{catalog ? t("ترتیب کاتالوگ", "Catalog order") : t("جدیدترین", "Newest")}</option>
                  <option value="low">
                    {t("قیمت: کم به زیاد", "Price: low to high")}
                  </option>
                  <option value="high">
                    {t("قیمت: زیاد به کم", "Price: high to low")}
                  </option>
                </select>
              </label>
            </div>
          </div>
          {(active.length > 0 || state.query) && (
            <div className="art-chips">
              {state.query && (
                <button
                  onClick={() => {
                    setInput("")
                    update({ query: "" })
                  }}
                >
                  {state.query}
                  <Symbol name="close" />
                </button>
              )}
              {active.map(([key, v]) => (
                <button
                  key={key}
                  onClick={() => {
                    const next = {
                      ...f,
                      [key]: key === "available" ? false : "",
                    }
                    setDraft(next)
                    update({ filters: next })
                  }}
                >
                  {key === "available"
                    ? t("فقط موجود", "Available only")
                    : key === "medium"
                      ? mediumName(String(v))
                      : key === "style"
                        ? styleName(String(v))
                        : key === "orientation"
                          ? orientationName(String(v))
                          : `${
                              key === "min" ? t("از", "From") : t("تا", "To")
                            } ${num(Number(v))} ${t("تومان", "Toman")}`}
                  <Symbol name="close" />
                </button>
              ))}
            </div>
          )}
          {mode === "loading" ? (
            <div
              className="art-grid"
              role="status"
              aria-label={t("در حال دریافت آثار", "Loading artworks")}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div className="art-skeleton" key={i}>
                  <div className="skeleton" />
                  <p className="skeleton" />
                  <p className="skeleton" />
                </div>
              ))}
            </div>
          ) : mode === "error" ? (
            <div className="art-state">
              <Symbol name="filter" />
              <h2>{t("دریافت آثار ممکن نشد.", "Unable to load artworks.")}</h2>
              <button
                className="button secondary"
                onClick={() => catalog ? catalog.retry() : setMode("normal")}
              >
                {t("تلاش دوباره", "Try again")}
              </button>
            </div>
          ) : mode === "empty" || !results.length ? (
            <div className="art-state">
              <h2>
                {mode === "empty"
                  ? t(
                      "هنوز اثری برای نمایش منتشر نشده است.",
                      "No artworks have been published yet.",
                    )
                  : t(
                      "اثری با این انتخاب‌ها پیدا نشد.",
                      "No artworks match your selection.",
                    )}
              </h2>
              {mode !== "empty" && (
                <>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setDraft({ ...blank })
                      update({ filters: { ...blank } })
                    }}
                  >
                    {t("پاک‌کردن فیلترها", "Clear filters")}
                  </button>
                  <button
                    className="text-link"
                    onClick={() => {
                      setInput("")
                      update({ query: "" })
                    }}
                  >
                    {t("پاک‌کردن جست‌وجو", "Clear search")}
                  </button>
                </>
              )}
              {routeLink(
                t("شروع سفارش نقاشی", "Start a commission"),
                `${prefix}/commissions/new`,
              )}
            </div>
          ) : (
            <div className="art-grid">
              {results.slice((page - 1) * 6, page * 6).map((work) => (
                <ArtGalleryCard
                  key={work.id}
                  work={work}
                  showFavorite={!catalog}
                  imageError={!!catalog}
                  language={language}
                  saved={favorites.includes(work.id)}
                  onNavigate={onNavigate}
                  onFavorite={() => {
                    if (!signedIn) {
                      onNavigate(
                        t("ورود برای ذخیره اثر", "Sign in to save artwork"),
                        `/login?returnTo=${encodeURIComponent(`${prefix}/artworks${window.location.search}`)}`,
                      )
                      return
                    }
                    if (mode === "favorite-error") {
                      setMessage(
                        t(
                          "ذخیره اثر ممکن نشد. دوباره تلاش کنید.",
                          "Unable to save this artwork. Try again.",
                        ),
                      )
                      return
                    }
                    if (onFavorite) onFavorite(work.id)
                    else
                      setFavorites((old) =>
                        old.includes(work.id)
                          ? old.filter((id) => id !== work.id)
                          : [...old, work.id],
                      )
                    setMessage(
                      t(
                        "علاقه‌مندی نمایشی به‌روز شد؛ ذخیره در سرویس یا رزرو انجام نشده است.",
                        "Demo favorites updated locally; no service save or reservation was made.",
                      ),
                    )
                  }}
                />
              ))}
            </div>
          )}
          {mode !== "loading" &&
            mode !== "empty" &&
            mode !== "error" &&
            results.length > 0 && (
              <nav
                className="art-pagination"
                aria-label={t("صفحه‌بندی آثار", "Artwork pagination")}
              >
                <button
                  disabled={page === 1}
                  onClick={() => update({ page: page - 1 })}
                >
                  {t("قبلی", "Previous")}
                </button>
                {Array.from({ length: pages }, (_, i) => (
                  <button
                    key={i}
                    aria-current={page === i + 1 ? "page" : undefined}
                    aria-label={`${t("صفحه", "Page")} ${num(i + 1)}`}
                    onClick={() => update({ page: i + 1 })}
                  >
                    {num(i + 1)}
                  </button>
                ))}
                <button
                  disabled={page === pages}
                  onClick={() => update({ page: page + 1 })}
                >
                  {t("بعدی", "Next")}
                </button>
              </nav>
            )}
        </section>
      </div>
      <section className="art-commission">
        <div>
          <div className="eyebrow">A PIECE OF YOU</div>
          <h2>
            {t(
              "ایده‌ای برای یک نقاشی شخصی دارید؟",
              "Have an idea for a personal artwork?",
            )}
          </h2>
          <p>
            {t(
              "تصویر، توضیح و ترجیحات خود را در مسیر سفارش سفارشی ثبت کنید تا بررسی شوند.",
              "Submit your image, brief and preferences through the commission flow for review.",
            )}
          </p>
        </div>
        {routeLink(
          t("شروع سفارش نقاشی", "Start a commission"),
          `${prefix}/commissions/new`,
          "button secondary",
        )}
      </section>
      {!catalog && <details className="art-demo-controls">
        <summary>{t("حالت‌های پروتوتایپ", "Prototype states")} · Demo</summary>
        <label>
          {t("وضعیت گالری", "Gallery state")}
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="normal">Normal</option>
            <option value="loading">Loading</option>
            <option value="empty">Empty catalog</option>
            <option value="error">Network error</option>
            <option value="favorite-error">Favorite error</option>
          </select>
        </label>
        <p>
          {t(
            "ورود نمونه از پنل «حالت‌های نمونه» سایت فعال می‌شود. هیچ سرویس واقعی متصل نیست.",
            "Demo sign-in is available in the site's demo panel. No live service is connected.",
          )}
        </p>
      </details>}
      {message && (
        <div className="art-message" role="status">
          {message}
          <button
            className="icon-button"
            onClick={() => setMessage("")}
            aria-label={t("بستن", "Close")}
          >
            <Symbol name="close" />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="art-filter-sheet"
        onCancel={() => setSheet(false)}
        aria-labelledby="art-sheet-title"
      >
        <div className="art-sheet-head">
          <h2 id="art-sheet-title">{t("فیلتر نقاشی‌ها", "Filter artworks")}</h2>
          <button
            className="icon-button"
            onClick={() => setSheet(false)}
            aria-label={t("بستن", "Close")}
          >
            <Symbol name="close" />
          </button>
        </div>
        {filterPanel(draft, setDraft)}
        <button
          className="button primary"
          disabled={priceError}
          onClick={() => {
            update({ filters: draft })
            setSheet(false)
          }}
        >
          {t("اعمال فیلترها", "Apply filters")}
        </button>
      </dialog>
    </div>
  )
}

export function ArtGalleryCard({
  work,
  language,
  saved,
  onFavorite,
  onNavigate,
  showFavorite = true,
  imageError = false,
}: {
  work: GalleryWork
  language: 0 | 1
  saved: boolean
  onFavorite: (work: GalleryWork) => void
  onNavigate: (name: string, route: string) => void
  showFavorite?: boolean
  imageError?: boolean
}) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const num = (n: number | null) =>
    n === null ? "—" : n.toLocaleString(language === 0 ? "fa-IR" : "en-US")
  const prefix = language === 0 ? "/fa" : "/en"
  const mediumName = (v: string) =>
    !v ? t("تکنیک اعلام نشده", "Medium not provided") : v === "oil" ? t("رنگ روغن", "Oil painting") : t("اکریلیک", "Acrylic")
  const routeLink = (label: string, route: string) => (
    <a
      className="text-link"
      href={route}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onNavigate(label, route)
      }}
    >
      {label}
      <span className="direction-arrow">
        <Symbol name="arrow" />
      </span>
    </a>
  )
  return (
    <article className="art-card" key={work.id}>
      <div className="art-image">
        <a
          href={`${prefix}/artworks/${work.id}`}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            e.preventDefault()
            onNavigate(work.title[language], `${prefix}/artworks/${work.id}`)
          }}
        >
          {imageError ? <div className="art-image-fallback"><Symbol name="image" />{t("تصویر در دسترس نیست", "Image unavailable")}</div> : <DemoPainting work={work} />}
        </a>
        <span className="art-original">{work.catalogRecord ? t("نقاشی", "Artwork") : <>{t("اثر اصل", "Original")} · Demo</>}</span>
        {showFavorite && <button
          className={`art-favorite icon-button ${saved ? "saved" : ""}`}
          aria-pressed={saved}
          aria-label={`${
            saved
              ? t("حذف از علاقه‌مندی", "Remove from favorites")
              : t("افزودن به علاقه‌مندی", "Save to favorites")
          } — ${work.title[language]}`}
          onClick={() => onFavorite(work)}
        >
          <Symbol name="heart" />
        </button>}
      </div>
      <div className="art-card-info">
        <div className="art-card-status">
          <span className={work.status}>
            {work.status === "available"
              ? t("موجود", "Available")
              : work.status === "sold"
                ? t("فروخته‌شده", "Sold")
                : t("در حال حاضر قابل خرید نیست", "Currently unavailable")}
          </span>
          {work.unique && <small>{t("تک‌نسخه", "One-of-a-kind")}</small>}
        </div>
        <h2>{work.title[language]}</h2>
        <p className="art-artist">{work.catalogRecord ? t("هنرمند اعلام نشده", "Artist not provided") : t("هنرمند نمونه", "Demo artist")}</p>
        <p className="art-specs">
          {mediumName(work.medium)} ·{" "}
          <span dir="ltr">
            {work.width === null || work.height === null ? t("ابعاد اعلام نشده", "Dimensions not provided") : <>{num(work.width)} × {num(work.height)}</>}
          </span>{" "}
          {work.width !== null && work.height !== null && t("سانتی‌متر", "cm")}
        </p>
        <div className="art-card-footer">
          <strong>
            {work.price === null ? (
              t("قیمت اعلام نشده", "Price not listed")
            ) : (
              <>
                {num(work.price)} <small>{t("تومان", "Toman")}</small>
              </>
            )}
          </strong>
          {routeLink(
            t("مشاهده اثر", "View artwork"),
            `${prefix}/artworks/${work.id}`,
          )}
        </div>
      </div>
    </article>
  )
}
