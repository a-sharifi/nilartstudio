import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { ArtGalleryCard, SampleArtworkImage, DemoPainting, Symbol, works, type GalleryWork } from "./ArtworksPage"
import type { ArtCartLine } from "./cart"
import "./artwork-detail.css"

import type { ArtworkCatalog } from "../features/catalog/artwork-catalog"

type Work = GalleryWork
type View = "full" | "detail" | "frame"
type Mode = "normal" | "loading" | "error" | "not-found" | "image-error" | "sold" | "unavailable" | "checking" | "cart-error" | "stock-error" | "price-change" | "favorite-error"
const modes: [Mode, string, string][] = [
  ["normal", "عادی", "Normal"],
  ["loading", "بارگذاری", "Loading"],
  ["error", "خطای شبکه", "Network error"],
  ["not-found", "اثر پیدا نشد", "Not found"],
  ["image-error", "خطای تصویر", "Image error"],
  ["sold", "فروخته‌شده", "Sold"],
  ["unavailable", "غیرقابل خرید", "Unavailable"],
  ["checking", "بررسی اطلاعات", "Checking"],
  ["cart-error", "خطای سبد", "Cart error"],
  ["stock-error", "از دست رفتن موجودی", "Stock lost"],
  ["price-change", "تغییر قیمت", "Price changed"],
  ["favorite-error", "خطای علاقه‌مندی", "Favorite error"],
]
export function makeArtworkCartLine(
  work: Work,
  frame: boolean,
  price: number,
): ArtCartLine {
  return {
    id: work.id,
    kind: "artwork",
    name: [work.title[0] + " — Demo", work.title[1] + " — Demo"],
    style:
      work.style === "landscape"
        ? ["منظره — نمونه", "Landscape — demo"]
        : ["انتزاعی — نمونه", "Abstract — demo"],
    size: `${work.width} × ${work.height} cm`,
    execution: frame
      ? ["با قاب — نمونه", "Framed — demo"]
      : ["بدون قاب — نمونه", "Unframed — demo"],
    status: "confirmed",
    price,
    delivery: "physical",
  }
}
export default function ArtworkDetailPage({
  slug,
  language,
  signedIn,
  cartIds,
  favorites,
  onFavorite,
  onAdd,
  onNavigate,
  onBack,
  catalog,
}: {
  catalog?: ArtworkCatalog
  slug: string
  language: 0 | 1
  signedIn: boolean
  cartIds: string[]
  favorites: string[]
  onFavorite: (id: string) => void
  onAdd: (line: ArtCartLine) => void
  onNavigate: (name: string, route: string) => void
  onBack: () => void
}) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const num = (n: number | null) =>
    n === null ? "—" : n.toLocaleString(language === 0 ? "fa-IR" : "en-US")
  const prefix = language === 0 ? "/fa" : "/en"
  const source: GalleryWork[] = catalog?.items ?? works
  const work = source.find((w) => w.id === slug)
  const [previewMode, setMode] = useState<Mode>("normal")
  const mode: Mode = catalog ? catalog.status === "normal" ? work?.catalogRecord?.details ? "normal" : "image-error" : catalog.status : previewMode
  const live = !!catalog
  const unknown = t("اعلام نشده", "Not provided")
  const [view, setView] = useState<View>("full")
  const [frame, setFrame] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const [stockLost, setStockLost] = useState(false)
  const [newPrice, setNewPrice] = useState<number | null>(null)
  const [reviewedPrice, setReviewedPrice] = useState(false)
  const [message, setMessage] = useState("")
  const [added, setAdded] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const zoomTrigger = useRef<HTMLButtonElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  )
  const hasFrameOptions = !live && work?.id === "quiet-morning"
  const views: View[] = live ? ["full"] : hasFrameOptions
    ? ["full", "detail", "frame"]
    : ["full", "detail"]
  const resetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  useEffect(() => {
    setMode("normal")
    setView("full")
    setFrame(false)
    setStockLost(false)
    setNewPrice(null)
    setReviewedPrice(false)
    setMessage("")
    setAdded(false)
    setBusy(false)
    if (timer.current) clearTimeout(timer.current)
  }, [slug])
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  useEffect(() => {
    if (lightbox) {
      dialog.current?.showModal()
      resetZoom()
    } else if (dialog.current?.open) {
      dialog.current.close()
      zoomTrigger.current?.focus()
    }
  }, [lightbox])
  useEffect(() => {
    resetZoom()
  }, [view])
  const medium =
    work?.medium === "colored-pencil" ? t("مدادرنگی","Colored pencil") : live && !work?.medium ? unknown : work?.medium === "oil"
      ? t("رنگ روغن", "Oil painting")
      : t("اکریلیک", "Acrylic")
  const price =
    work?.price === null || !work
      ? null
      : (newPrice ?? work.price) + (frame ? 650000 : 0)
  const status = stockLost
    ? "unavailable"
    : mode === "sold"
      ? "sold"
      : mode === "unavailable"
        ? "unavailable"
        : work?.status
  const purchasable =
    !live && status === "available" &&
    price !== null &&
    mode !== "checking" &&
    mode !== "image-error"
  const inCart = !live && work ? cartIds.includes(work.id) : false
  const viewName = (v: View) =>
    v === "full"
      ? t("نمای کامل", "Full artwork")
      : v === "detail"
        ? t("جزئیات تصویر نمونه", "Demo image detail")
        : t("قاب شبیه‌سازی‌شده", "Simulated frame")
  const changeMode = (next: Mode) => {
    if (timer.current) clearTimeout(timer.current)
    setBusy(false)
    setMode(next)
    setStockLost(false)
    setNewPrice(null)
    setReviewedPrice(false)
    setMessage("")
    setAdded(false)
  }
  const link = (label: string, route: string, cls = "text-link") => (
    <a
      className={cls}
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
  const favorite = (w: Work) => {
    if (live) return
    if (!signedIn) {
      onNavigate(
        t("ورود برای ذخیره اثر", "Sign in to save artwork"),
        `/login?returnTo=${encodeURIComponent(`${prefix}/artworks/${w.id}`)}`,
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
    onFavorite(w.id)
    setMessage(
      t(
        "علاقه‌مندی نمونه به‌روز شد؛ ذخیره محلی است و رزرو نیست.",
        "Demo favorite updated locally; this is not a reservation.",
      ),
    )
  }
  const add = () => {
    if (!work || !purchasable || inCart || busy || price === null) return
    setBusy(true)
    setMessage("")
    timer.current = setTimeout(() => {
      setBusy(false)
      if (mode === "cart-error") {
        setMessage(
          t(
            "افزودن اثر به سبد ممکن نشد. دوباره تلاش کنید.",
            "Unable to add artwork to cart. Try again.",
          ),
        )
        return
      }
      if (mode === "stock-error") {
        setStockLost(true)
        setMessage(
          t(
            "این اثر دیگر قابل خرید نیست. — Demo",
            "This artwork is no longer available. — Demo",
          ),
        )
        return
      }
      if (mode === "price-change" && !reviewedPrice) {
        setNewPrice(work.price! + 400000)
        setMessage(
          t(
            "قیمت نمونه تغییر کرد. قیمت جدید را بررسی و تأیید کنید.",
            "The demo price changed. Review and accept the new price.",
          ),
        )
        return
      }
      onAdd(makeArtworkCartLine(work, frame, price))
      setAdded(true)
      setMessage(
        t(
          "اثر به سبد نمونه اضافه شد؛ سرویس واقعی متصل نیست.",
          "Artwork added to the demo cart; no live service is connected.",
        ),
      )
    }, 650)
  }
  const artwork = (w: Work, selected: View, extra = "") => (
    <div
      className={`ad-art-surface ${selected === "frame" ? "ad-framed" : ""} ${
        selected === "detail" ? "ad-crop" : ""
      } ${extra}`}
      style={w.width !== null && w.height !== null ? { "--art-ratio": `${w.width} / ${w.height}` } as CSSProperties : undefined}
    >
      {w.catalogRecord?.details ? <SampleArtworkImage work={w}/> : w.catalogRecord ? <Symbol name="image" /> : <DemoPainting work={w} />}
    </div>
  )
  const prototype = live ? null : (
    <details className="art-demo-controls">
      <summary>
        {t("حالت‌های پروتوتایپ", "Prototype states")} · PAINT-02 / Demo
      </summary>
      <label>
        {t("وضعیت", "State")}
        <SelectDropdown
          value={mode}
          onChange={(e) => changeMode(e.target.value as Mode)}
        >
          {modes.map(([v, fa, en]) => (
            <option key={v} value={v}>
              {t(fa, en)}
            </option>
          ))}
        </SelectDropdown>
      </label>
      <p>
        {t(
          "تمام خریدها، قیمت‌ها، گزینه قاب و علاقه‌مندی‌ها نمونه‌اند. ورود نمونه از پنل سایت فعال می‌شود.",
          "Purchases, prices, frame options and favorites are demos. Enable demo sign-in in the site panel.",
        )}
      </p>
    </details>
  )
  if (mode === "loading")
    return (
      <div className="container ad-page">
        <div
          className="ad-layout"
          role="status"
          aria-label={t("در حال دریافت اثر", "Loading artwork")}
        >
          <div className="ad-image-skeleton skeleton" />
          <div className="ad-info-skeleton">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div className="skeleton" key={i} />
            ))}
          </div>
        </div>
        {prototype}
      </div>
    )
  if (!work || mode === "not-found" || mode === "error")
    return (
      <div className="container ad-page">
        <div className="art-state">
          <span className="eyebrow">NILART GALLERY</span>
          <h1>
            {mode === "error"
              ? t("دریافت اطلاعات اثر ممکن نشد.", "Unable to load the artwork.")
              : t("اثر پیدا نشد", "Artwork not found")}
          </h1>
          <p>
            {t(
              "فقط آثار منتشرشده در گالری قابل مشاهده‌اند.",
              "Only published artworks are visible in the gallery.",
            )}
          </p>
          {mode === "error" && (
            <button
              className="button secondary"
              onClick={() => catalog ? catalog.retry() : changeMode("normal")}
            >
              {t("تلاش دوباره", "Try again")}
            </button>
          )}
          {link(
            t("بازگشت به گالری", "Back to the gallery"),
            `${prefix}/artworks`,
          )}
        </div>
        {prototype}
      </div>
    )
  const related = (live ? [] : works)
    .filter((w) => w.id !== work.id && w.style === work.style)
    .slice(0, 3)
  const saved = favorites.includes(work.id)
  return (
    <div className="container ad-page">
      <nav className="art-breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        <a
          href={language === 0 ? "/fa" : "/en"}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            e.preventDefault()
            onNavigate(t("خانه", "Home"), language === 0 ? "/fa" : "/en")
          }}
        >
          {t("خانه", "Home")}
        </a>
        <span>/</span>
        <a
          href={`${prefix}/artworks`}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            e.preventDefault()
            onBack()
          }}
        >
          {t("نقاشی‌ها", "Artworks")}
        </a>
        <span>/</span>
        <span aria-current="page">{work.title[language]}</span>
      </nav>
      <div className="ad-layout">
        <section
          className="ad-gallery"
          aria-label={t("تصاویر اثر", "Artwork images")}
        >
          <div className="ad-main-image">
            <span className="ad-image-label">
              NILART GALLERY <span>{!live && "DEMO / "}{work.id.toUpperCase()}</span>
            </span>
            {mode === "image-error" ? (
              <div className="ad-image-error">
                <Symbol name="close" />
                <p>
                  {t(
                    "تصویر اثر قابل نمایش نیست.",
                    "Artwork image is unavailable.",
                  )}
                </p>
                <small>
                  {t(
                    "پیش از خرید، تصویر کامل اثر را بررسی کنید.",
                    "Review the full artwork image before purchasing.",
                  )}
                </small>
                <button
                  className="button secondary"
                  onClick={() => catalog ? catalog.retry() : changeMode("normal")}
                >
                  {t("تلاش دوباره", "Try again")}
                </button>
              </div>
            ) : (
              artwork(work, view)
            )}
            <div className="ad-image-bottom">
              <span>
                {viewName(view)}
                {!live && view !== "detail" && (
                  <>
                    {" "}
                    ·{" "}
                    <bdi>
                      {work.width === null || work.height === null ? unknown : <>{num(work.width)} × {num(work.height)}</>}
                    </bdi>{" "}
                    {work.width !== null && work.height !== null && t("سانتی‌متر", "cm")}
                  </>
                )}
              </span>
              <button
                ref={zoomTrigger}
                className="ad-expand"
                onClick={() => setLightbox(true)}
                disabled={mode === "image-error"}
              >
                <Symbol name="search" />
                {t("نمایش بزرگ‌تر", "View larger")}
              </button>
            </div>
          </div>
          <div className="ad-thumbnails">
            {views.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                aria-label={viewName(v)}
              >
                {artwork(work, v)}
                <span>{viewName(v)}</span>
              </button>
            ))}
          </div>
          <p className="ad-gallery-note">
            {work.catalogRecord?.details ? `${t("تصویر نمونه؛ ","Sample image; ")}${work.catalogRecord.details.image_credit}` : live ? t("تصویر تأییدشده اثر ارائه نشده است.", "No approved artwork image has been provided.") : view === "frame"
              ? t(
                  "نمای قاب شبیه‌سازی‌شده است؛ مقیاس و رنگ تقریبی‌اند.",
                  "Simulated frame view; scale and color are approximate.",
                )
              : t(
                  "تصویرسازی نمونه، نه عکس اثر واقعی نیل‌آرت. تصویر کامل بدون برش نمایش داده می‌شود.",
                  "Demo illustration, not a real NilArt artwork photograph. Full view is shown without cropping.",
                )}
          </p>
        </section>
        <section className="ad-purchase" aria-labelledby="ad-title">
          <div className="ad-topline">
            <span className="eyebrow">
              {live ? t("نقاشی", "Artwork") : <>{t("نقاشی اصل", "Original painting")} · DEMO</>}
            </span>
            {work.unique && (
              <span className="ad-edition">
                {t("تک‌نسخه — نمونه", "One-of-a-kind — demo")}
              </span>
            )}
          </div>
          <h1 id="ad-title">{work.title[language]}</h1>
          <p className="ad-byline">{work.catalogRecord?.details ? t(work.catalogRecord.details.artist_fa,work.catalogRecord.details.artist_en) : live ? t("هنرمند اعلام نشده", "Artist not provided") : t("اثر هنرمند نمونه", "By Demo artist")}</p>
          <p className="ad-summary">
            {work.catalogRecord ? work.catalogRecord[language === 0 ? "description_fa" : "description_en"] : work.style === "landscape"
              ? t(
                  "نمونه‌ای از یک منظره‌ی آرام، با لایه‌های رنگ و نور ملایم؛ برای تصور جایگاه یک اثر در فضای شما.",
                  "A demo of a quiet landscape, with layered color and soft light; an invitation to imagine a piece in your space.",
                )
              : t(
                  "نمونه‌ای انتزاعی با فرم‌های ساده و رنگ‌های گرم؛ گفت‌وگویی میان رنگ، بافت و فضای خالی.",
                  "An abstract demo with simple forms and warm tones; a dialogue between color, texture and negative space.",
                )}
          </p>
          <dl className="ad-key-specs">
            <div>
              <dt>{t("تکنیک", "Medium")}</dt>
              <dd>{medium}</dd>
            </div>
            <div>
              <dt>{t("سطح اجرا", "Surface")}</dt>
              <dd>{live ? unknown : t("بوم — نمونه", "Canvas — demo")}</dd>
            </div>
            <div>
              <dt>{t("ابعاد اثر", "Artwork dimensions")}</dt>
              <dd>
                <bdi>
                  {work.width === null || work.height === null ? unknown : <>{num(work.width)} × {num(work.height)}</>}
                </bdi>{" "}
                {work.width !== null && work.height !== null && t("سانتی‌متر", "cm")}
                <small>
                  {t("عرض × ارتفاع؛ بدون قاب", "Width × height; unframed")}
                </small>
              </dd>
            </div>
            <div>
              <dt>{t("قاب", "Frame")}</dt>
              <dd>
                {live ? unknown : frame
                  ? t("با قاب چوبی — نمونه", "Wood frame — demo")
                  : t("بدون قاب — نمونه", "Unframed — demo")}
              </dd>
            </div>
          </dl>
          <div className="ad-price-block" aria-live="polite">
            <div>
              <span>
                {t("قیمت", "Price")} {!live && <small>Demo</small>}
              </span>
              <strong>
                {price === null ? (
                  t("قیمت اعلام نشده", "Price not listed")
                ) : (
                  <>
                    {num(price)} <small>{t("تومان", "Toman")}</small>
                  </>
                )}
              </strong>
            </div>
            <span
              className={`ad-stock ${
                status === "available" ? "available" : ""
              }`}
            >
              {live && !work.catalogRecord?.details ? t("موجودی تأیید نشده", "Availability unconfirmed") : mode === "checking"
                ? t(
                    "اطلاعات خرید در حال بررسی است.",
                    "Purchase information is being checked.",
                  )
                : status === "sold"
                  ? t("این اثر فروخته شده است.", "This artwork has been sold.")
                  : status === "unavailable"
                    ? t(
                        "این اثر در حال حاضر قابل خرید نیست.",
                        "This artwork is currently unavailable.",
                      )
                    : t("موجود — نمونه", "Available — demo")}
            </span>
          </div>
          {hasFrameOptions && (
            <fieldset className="ad-frame-options" disabled={busy || inCart}>
              <legend>
                {t(
                  "انتخاب قاب — گزینه‌های Demo",
                  "Choose a frame — Demo options",
                )}
              </legend>
              {[false, true].map((v) => (
                <label
                  key={String(v)}
                  className={frame === v ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="art-frame"
                    checked={frame === v}
                    onChange={() => {
                      setFrame(v)
                      setView(v ? "frame" : "full")
                    }}
                  />
                  <span>
                    {v
                      ? t("قاب چوبی", "Wood frame")
                      : t("بدون قاب", "Unframed")}
                    <small>
                      {v
                        ? `+ ${num(650000)} ${t("تومان", "Toman")}`
                        : t("قیمت پایه", "Base price")}
                    </small>
                  </span>
                </label>
              ))}
              <p>
                {t(
                  "هر دو گزینه به یک اثر نمونه وابسته‌اند؛ انتخاب قاب نسخه جدیدی ایجاد نمی‌کند.",
                  "Both options refer to the same demo artwork, not separate copies.",
                )}
              </p>
            </fieldset>
          )}
          <div className="ad-quantity">
            {t("تعداد: ۱", "Quantity: 1")}
            <span>
              {live ? unknown : t(
                "هر اثر نمونه یک ردیف در سبد دارد",
                "One cart line per demo artwork",
              )}
            </span>
          </div>
          {newPrice !== null && !reviewedPrice && (
            <div className="ad-warning" role="alert">
              <p>
                {t(
                  "قیمت تغییر کرده است. قیمت جدید:",
                  "Price changed. New price:",
                )}{" "}
                {num(price!)} {t("تومان", "Toman")} · Demo
              </p>
              <button
                className="text-link"
                onClick={() => {
                  setReviewedPrice(true)
                  setMessage(
                    t(
                      "قیمت جدید تأیید شد؛ اکنون دوباره افزودن به سبد را انتخاب کنید.",
                      "New price accepted; select Add to cart again.",
                    ),
                  )
                }}
              >
                {t("تأیید قیمت جدید", "Accept new price")}
              </button>
            </div>
          )}
          <div className="ad-buy-actions">
            {inCart ? (
              link(
                t(
                  "این اثر در سبد شماست · مشاهده سبد",
                  "Already in your cart · View cart",
                ),
                "/cart",
                "button primary",
              )
            ) : (
              <button
                className="button primary"
                disabled={
                  !purchasable || busy || (newPrice !== null && !reviewedPrice)
                }
                onClick={add}
              >
                {busy
                  ? t(
                      "بررسی قیمت و موجودی نمونه…",
                      "Checking demo price and stock…",
                    )
                  : t("افزودن به سبد", "Add to cart")}
                {!live && <span>Demo</span>}
              </button>
            )}
            <button
              className={`button secondary ad-save ${saved ? "saved" : ""}`}
              disabled={live}
              aria-pressed={saved}
              aria-label={`${
                saved
                  ? t("حذف از علاقه‌مندی", "Remove from favorites")
                  : t("افزودن به علاقه‌مندی", "Save to favorites")
              } — ${work.title[language]}`}
              onClick={() => favorite(work)}
            >
              <Symbol name="heart" />
            </button>
          </div>
          <p className="ad-reservation">
            {t(
              "افزودن به سبد یا علاقه‌مندی، رزرو قطعی یا مالکیت اثر نیست.",
              "Adding to cart or favorites is not a reservation or ownership.",
            )}
          </p>
          {message && (
            <div
              className={`ad-feedback ${added ? "success" : ""}`}
              role="status"
            >
              <p>{message}</p>
              {added && (
                <div>
                  {link(t("مشاهده سبد", "View cart"), "/cart")}
                  {link(
                    t("ادامه مشاهده آثار", "Continue browsing"),
                    `${prefix}/artworks`,
                  )}
                </div>
              )}
            </div>
          )}
          <div className="ad-shipping-summary">
            <Symbol name="arrow" />
            <div>
              <strong>
                {t("ارسال و شرایط خرید", "Shipping & purchase conditions")}
              </strong>
              <p>
                {live ? t("اطلاعات ارسال و خرید تأیید نشده است.", "Shipping and purchase details are unconfirmed.") : t(
                  "هزینه ارسال در مرحله انتخاب آدرس و روش ارسال مشخص می‌شود.",
                  "Shipping cost is calculated when you choose your address and delivery method.",
                )}
              </p>
              <a href="#ad-shipping">
                {t(
                  "بررسی شرایط پیش از خرید",
                  "Review conditions before purchase",
                )}
              </a>
            </div>
          </div>
        </section>
      </div>
      {!live && <div className="ad-demo-disclaimer">
        <span>DEMO</span>
        <p>
          {t(
            "این صفحه نمونه طراحی است؛ اثر، هنرمند، مشخصات، قاب، قیمت و موجودی واقعی نیستند. ادعای امضا، گواهی اصالت یا زمان تحویل ارائه نمی‌شود.",
            "This is a design prototype. Artwork, artist, specifications, frame, price and availability are demo data. No signature, authenticity certificate or delivery promise is claimed.",
          )}
        </p>
      </div>}
      <nav
        className="ad-section-nav"
        aria-label={t("بخش‌های اطلاعات", "Artwork information sections")}
      >
        <a href="#ad-about">{t("درباره اثر", "About the artwork")}</a>
        <a href="#ad-specifications">{t("مشخصات", "Specifications")}</a>
        <a href="#ad-shipping">{t("ارسال و مرجوعی", "Shipping & returns")}</a>
      </nav>
      <div className="ad-information">
        <section id="ad-about">
          <div className="eyebrow">01 / THE ARTWORK</div>
          <h2>{t("درباره اثر", "About the artwork")}</h2>
          <p>
            {work.catalogRecord ? work.catalogRecord[language === 0 ? "description_fa" : "description_en"] : t(
              "این تصویرسازی برای نمایش تجربه بررسی یک نقاشی آماده ساخته شده است. فرم‌ها و لایه‌های رنگ صرفاً نمونه‌اند؛ توضیح تأییدشده‌ی اثر واقعی در زمان اتصال کاتالوگ جایگزین خواهد شد.",
              "This illustration was created to demonstrate the experience of exploring a ready-made painting. Shapes and color layers are illustrative only; an approved artwork description will replace this text when a catalog is connected.",
            )}
          </p>
          <div className="ad-artist-note">
            <span className="ad-monogram">N.</span>
            <div>
              <strong>{work.catalogRecord?.details ? t(work.catalogRecord.details.artist_fa,work.catalogRecord.details.artist_en) : live ? unknown : t("هنرمند نمونه", "Demo artist")}</strong>
              <p>
                {t(
                  "پروفایل واقعی و زندگی‌نامه تأییدشده ارائه نشده است.",
                  "No real artist profile or approved biography has been supplied.",
                )}
              </p>
            </div>
          </div>
        </section>
        <section id="ad-specifications">
          <div className="eyebrow">02 / THE DETAILS</div>
          <h2>{t("مشخصات", "Specifications")}</h2>
          <dl className="ad-spec-table">
            <div>
              <dt>{t("نوع اثر", "Artwork type")}</dt>
              <dd>
                {live ? unknown : t(
                  "نقاشی اصل — نمونه، نه چاپ",
                  "Original painting — demo, not a print",
                )}
              </dd>
            </div>
            <div>
              <dt>{t("تکنیک و سطح", "Medium & surface")}</dt>
              <dd>
                {medium} · {live ? unknown : t("بوم — نمونه", "Canvas — demo")}
              </dd>
            </div>
            <div>
              <dt>{t("عرض × ارتفاع اثر", "Artwork width × height")}</dt>
              <dd>
                <bdi>
                  {work.width === null || work.height === null ? unknown : <>{num(work.width)} × {num(work.height)}</>}
                </bdi>{" "}
                {work.width !== null && work.height !== null && t("سانتی‌متر", "cm")}
              </dd>
            </div>
            <div>
              <dt>{t("اقلام همراه", "Included items")}</dt>
              <dd>
                {live ? unknown : frame
                  ? t("اثر و قاب چوبی — نمونه", "Artwork and wood frame — demo")
                  : t("اثر بدون قاب — نمونه", "Unframed artwork — demo")}
              </dd>
            </div>
          </dl>
          <p className="ad-small-note">
            {t(
              "ابعاد قاب و بسته‌بندی منتشر نشده‌اند. شرایط حقوق تکثیر و استفاده تجاری باید از توافق تأییدشده بررسی شوند.",
              "Frame and package dimensions are not published. Reproduction and commercial-use rights must be checked against an approved agreement.",
            )}
          </p>
        </section>
      </div>
      <section className="ad-shipping-detail" id="ad-shipping">
        <div>
          <div className="eyebrow">03 / BEFORE YOU BUY</div>
          <h2>{t("ارسال و مرجوعی", "Shipping & returns")}</h2>
        </div>
        <div>
          <p>
            {t(
              "شرایط ارسال و درخواست مرجوعی را پیش از خرید بررسی کنید.",
              "Review shipping and return conditions before purchase.",
            )}
          </p>
          <p>
            {live ? t("اطلاعات ارسال و خرید تأیید نشده است.", "Shipping and purchase details are unconfirmed.") : t(
              "روش ارسال، بسته‌بندی، زمان آماده‌سازی و زمان حمل تأییدشده برای این نمونه ارائه نشده‌اند. هزینه ارسال پس از انتخاب آدرس و روش ارسال مشخص می‌شود.",
              "Approved delivery methods, packaging, preparation time and transit time have not been provided for this demo. Shipping cost is calculated after choosing an address and delivery method.",
            )}
          </p>
          {link(
            t("شرایط لغو و مرجوعی", "Cancellation & return conditions"),
            `${prefix}/returns`,
          )}
        </div>
      </section>
      {related.length > 0 && (
        <section className="ad-related">
          <div className="section-heading">
            <div>
              <div className="eyebrow">MORE TO DISCOVER</div>
              <h2>{t("آثاری در همین حال‌وهوا", "More in this style")}</h2>
              <p>
                {t(
                  "آثار نمونه با سبک مشترک",
                  "Demo artworks with a shared style",
                )}
              </p>
            </div>
            {link(t("همه نقاشی‌ها", "All artworks"), `${prefix}/artworks`)}
          </div>
          <div className="art-grid">
            {related.map((w) => (
              <ArtGalleryCard
                key={w.id}
                work={w}
                language={language}
                saved={favorites.includes(w.id)}
                onFavorite={favorite}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      )}
      <section className="ad-commission">
        <div>
          <h2>
            {t("به دنبال اثری شخصی هستید؟", "Looking for a personal artwork?")}
          </h2>
          <p>
            {t(
              "ایده و ترجیحات خود را در مسیر سفارش سفارشی برای بررسی ثبت کنید.",
              "Submit your idea and preferences through the commission flow for review.",
            )}
          </p>
        </div>
        {link(
          t("شروع سفارش سفارشی", "Start a commission"),
          `${prefix}/commissions/new`,
        )}
      </section>
      {prototype}
      <dialog
        ref={dialog}
        className="ad-lightbox"
        aria-labelledby="ad-lightbox-title"
        onCancel={() => setLightbox(false)}
      >
        <div className="ad-lightbox-head">
          <div>
            <h2 id="ad-lightbox-title">{work.title[language]}</h2>
            <small>{viewName(view)} · Demo</small>
          </div>
          <button
            className="icon-button"
            onClick={() => setLightbox(false)}
            aria-label={t("بستن", "Close")}
          >
            <Symbol name="close" />
          </button>
        </div>
        <div
          className="ad-zoom-stage"
          onPointerDown={(e) => {
            if (zoom === 1) return
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              panX: pan.x,
              panY: pan.y,
            }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (d)
              setPan({
                x: Math.max(-180, Math.min(180, d.panX + e.clientX - d.x)),
                y: Math.max(-180, Math.min(180, d.panY + e.clientY - d.y)),
              })
          }}
          onPointerUp={() => {
            drag.current = null
          }}
          onPointerCancel={() => {
            drag.current = null
          }}
        >
          <div
            className="ad-zoom-art"
            style={
              {
                "--zoom": zoom,
                "--pan-x": `${pan.x}px`,
                "--pan-y": `${pan.y}px`,
              } as CSSProperties
            }
          >
            {artwork(work, view)}
          </div>
        </div>
        <div className="ad-lightbox-controls">
          <button
            className="button secondary"
            onClick={() =>
              setView(
                views[(views.indexOf(view) + views.length - 1) % views.length],
              )
            }
          >
            {t("قبلی", "Previous")}
          </button>
          <button
            className="icon-button"
            onClick={() => {
              setZoom((z) => Math.max(1, z - 0.5))
              setPan({ x: 0, y: 0 })
            }}
            aria-label={t("کوچک‌نمایی", "Zoom out")}
          >
            −
          </button>
          <span>{num(Math.round(zoom * 100))}%</span>
          <button
            className="icon-button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
            aria-label={t("بزرگ‌نمایی", "Zoom in")}
          >
            +
          </button>
          <button className="button secondary" onClick={resetZoom}>
            {t("بازنشانی", "Reset")}
          </button>
          <button
            className="button secondary"
            onClick={() =>
              setView(views[(views.indexOf(view) + 1) % views.length])
            }
          >
            {t("بعدی", "Next")}
          </button>
        </div>
        {zoom > 1 && (
          <div
            className="ad-pan-controls"
            aria-label={t("جابه‌جایی تصویر", "Pan image")}
          >
            {[
              ["↑", 0, -60],
              ["↓", 0, 60],
              ["←", -60, 0],
              ["→", 60, 0],
            ].map(([label, x, y]) => (
              <button
                key={label}
                className="icon-button"
                aria-label={
                  label === "↑"
                    ? t("بالا", "Up")
                    : label === "↓"
                      ? t("پایین", "Down")
                      : label === "←"
                        ? t("چپ", "Left")
                        : t("راست", "Right")
                }
                onClick={() =>
                  setPan((p) => ({
                    x: Math.max(-180, Math.min(180, p.x + Number(x))),
                    y: Math.max(-180, Math.min(180, p.y + Number(y))),
                  }))
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </dialog>
    </div>
  )
}
