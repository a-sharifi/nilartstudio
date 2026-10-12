import { ReferenceBundleImage } from "./ReferenceMedia";
import { useEffect, useRef, useState, type ReactNode } from "react"
import { catalogProducts } from "./catalog"
import {
  allowedNotebookSKUs,
  bundleCopy,
  bundleGallery,
  bundleKey,
  bundleSlug,
  calculateBundle,
  catsBundle,
  resolveBundle,
  type BundleCartLine,
  type BundleDraft,
  type BundlePart,
} from "./bundle"
import {
  changeSelection,
  covers,
  emptySelection,
  notebook,
  selectedSKU,
  sizes,
  validQuantity,
  type Selection,
} from "./product"
import ProductOptions from "./ProductOptions"
import ProductGallery, { type ProductDialog } from "./ProductGallery"
import ProductCard from "./ProductCard"
import BundleStillLife from "./BundleStillLife"

type Props = {
  slug: string
  language: 0 | 1
  mode: string
  preset: string
  editing?: boolean
  livePrices?: Record<string, number>
  liveStocks?: Record<string, number>
  initialDraft?: BundleDraft
  onDraftChange: (slug: string, draft: BundleDraft) => void
  onAdd: (line: BundleCartLine) => boolean
  onNavigate: (name: string, route: string) => void
  onBack: () => void
  canBack: boolean
  renderMedia: (color: string, kind: string, hero?: boolean) => ReactNode
  renderDialog: ProductDialog
  arrow: ReactNode
  heart: ReactNode
}
interface NewQuote {
  previous: number
  next: number
  parts: BundlePart[]
}
export default function BundleDetailPage({
  slug,
  language,
  mode,
  preset,
  editing = false,
  livePrices = {},
  liveStocks = {},
  initialDraft,
  onDraftChange,
  onAdd,
  onNavigate,
  onBack,
  canBack,
  renderMedia,
  renderDialog,
  arrow,
  heart,
}: Props) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const number = (value: number) =>
    value.toLocaleString(language === 0 ? "fa-IR" : "en-US")
  const money = (value: number) => `${number(value)} ${t("تومان", "toman")}`
  const [selection, setSelection] = useState<Selection>(
    initialDraft?.selection || { ...emptySelection },
  )
  const [quantity, setQuantity] = useState(initialDraft?.quantity || "1")
  const [resolved, setResolved] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [adding, setAdding] = useState(false)
  const [stocks, setStocks] = useState<Record<string, number>>({})
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [newQuote, setNewQuote] = useState<NewQuote | null>(null)
  const [confirmation, setConfirmation] = useState<BundleCartLine | null>(null)
  const [guide, setGuide] = useState(false)
  const [shareMessage, setShareMessage] = useState("")
  const [editingQuantity, setEditingQuantity] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submitting = useRef(false)
  const failedOnce = useRef(false)
  const previousMode = useRef(mode)
  const previousPreset = useRef(initialDraft ? preset : "")
  const allUnavailable = mode === "all-unavailable"
  const effectiveStocks: Record<string, number> = allUnavailable
    ? { ...liveStocks, ...stocks, sticker: 0 }
    : { ...liveStocks, ...stocks }
  const effectivePrices = { ...livePrices, ...prices }
  const sku = selectedSKU(selection, allowedNotebookSKUs)
  const parts = resolveBundle(selection, effectiveStocks, effectivePrices)
  const quote = parts ? calculateBundle(parts) : undefined
  const identity = sku?.id || ""
  const ready = !!parts && resolved === identity && mode !== "recalculating"
  const capacity = quote?.capacity || 0
  const qty = /^\d+$/.test(quantity) ? Number(quantity) : 0
  const quantityValid = !!quote && validQuantity(quantity, capacity)
  const incomplete = !selection.size || !selection.sheets || !selection.cover
  const canAdd = ready && capacity > 0 && quantityValid && !adding && !newQuote
  const startingQuotes = allowedNotebookSKUs
    .map((sku) =>
      resolveBundle(
        { size: sku.size!, sheets: String(sku.sheets), cover: sku.cover! },
        effectiveStocks,
        effectivePrices,
      ),
    )
    .filter((parts): parts is BundlePart[] => !!parts)
    .map((parts) => calculateBundle(parts))
    .filter((quote) => quote.capacity > 0)
  const startPrice = startingQuotes.length
    ? Math.min(...startingQuotes.map((quote) => quote.price))
    : undefined
  const summary = (value: Selection) =>
    `${value.size} · ${number(Number(value.sheets))} ${t("برگ", "sheets")} · ${covers.find((cover) => cover.value === value.cover)?.label[language] || ""}`
  const finalCounts = (bundleQuantity: number) =>
    `${number(bundleQuantity)} ${t("دفتر", "notebooks")} · ${number(bundleQuantity * 2)} ${t("استیکر", "stickers")} · ${number(bundleQuantity)} ${t("نشانک", "bookmarks")}`
  useEffect(() => {
    title.current?.focus({ preventScroll: true })
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])
  useEffect(() => {
    onDraftChange(bundleSlug, { selection, quantity })
  }, [selection, quantity, onDraftChange])
  useEffect(() => {
    setResolved(null)
    if (!identity || mode === "recalculating") return
    const delay = setTimeout(() => setResolved(identity), 280)
    return () => clearTimeout(delay)
  }, [identity, mode])
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    submitting.current = false
    failedOnce.current = false
    setAdding(false)
    setError("")
    setNewQuote(null)
    setStocks({})
    setPrices({})
    if (mode === "component-unavailable" && previousMode.current !== mode)
      setSelection({ size: "A5", sheets: "100", cover: "3mm" })
    previousMode.current = mode
  }, [mode, preset])
  useEffect(() => {
    if (!preset || previousPreset.current === preset) return
    previousPreset.current = preset
    const type = preset.split(":")[0]
    setSelection(
      type === "incomplete"
        ? { ...emptySelection }
        : type === "unavailable"
          ? { size: "A5", sheets: "100", cover: "3mm" }
          : type === "incompatible"
            ? { size: "A4", sheets: "50", cover: "" }
            : { size: "A5", sheets: "50", cover: "2mm" },
    )
    setQuantity(type === "two" ? "2" : "1")
    setNotice("")
  }, [preset])
  const choose = (key: keyof Selection, value: string) => {
    const next = changeSelection(selection, key, value, allowedNotebookSKUs)
    setSelection(next.selection)
    setNotice(
      next.cleared.length
        ? t(
            "گزینه ناسازگار پاک شد؛ لطفاً دوباره انتخاب کنید.",
            "An incompatible option was cleared. Please choose it again.",
          )
        : "",
    )
    setError("")
    setNewQuote(null)
  }
  const add = (acceptedParts?: BundlePart[]) => {
    if (
      !parts ||
      !ready ||
      !quantityValid ||
      capacity < 1 ||
      submitting.current ||
      (newQuote && !acceptedParts)
    )
      return
    const chosenParts = acceptedParts || parts
    const chosenQuote = calculateBundle(chosenParts)
    if (qty > chosenQuote.capacity) return
    const snapshot: BundleCartLine = {
      key: bundleKey(chosenParts),
      bundleId: catsBundle.id,
      quantity: qty,
      unitPrice: chosenQuote.price,
      selection: { ...selection },
      parts: chosenParts.map((part) => ({ ...part })),
    }
    submitting.current = true
    setAdding(true)
    setError("")
    timer.current = setTimeout(() => {
      submitting.current = false
      setAdding(false)
      if (mode === "stock-change" && stocks.sticker === undefined) {
        setStocks((previous) => ({ ...previous, sticker: 3 }))
        setError(
          t(
            "موجودی جزء استیکر تغییر کرده است؛ تعداد پکیج را بررسی کنید.",
            "Sticker availability has changed. Please review the bundle quantity.",
          ),
        )
        return
      }
      if (
        mode === "price-change" &&
        !acceptedParts &&
        prices[sku!.id] === undefined
      ) {
        const changed = parts.map((part) =>
          part.productId === notebook.id
            ? { ...part, unitPrice: part.unitPrice + 20000 }
            : { ...part },
        )
        setNewQuote({
          previous: chosenQuote.price,
          next: calculateBundle(changed).price,
          parts: changed,
        })
        return
      }
      if (mode === "add-error" && !failedOnce.current) {
        failedOnce.current = true
        setError(
          t(
            "پکیج به سبد اضافه نشد. دوباره تلاش کنید.",
            "We couldn't add this bundle to your cart. Try again.",
          ),
        )
        return
      }
      if (!onAdd(snapshot)) {
        setError(
          t(
            "اقلام این پکیج با اقلام موجود در سبد از سقف موجودی عبور می‌کنند؛ تعداد را کاهش دهید.",
            "These components and the items already in your cart exceed available stock. Reduce the bundle quantity.",
          ),
        )
        return
      }
      if (!editing) setConfirmation(snapshot)
    }, 600)
  }
  const share = async () => {
    const url = new URL(`/bundles/${bundleSlug}`, window.location.origin).href
    try {
      await navigator.clipboard.writeText(url)
      setShareMessage(t("لینک پکیج کپی شد.", "Bundle link copied."))
    } catch {
      setShareMessage(t("لینک پکیج: ", "Bundle link: ") + url)
    }
  }
  const go =
    (name: string, route: string) =>
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      onNavigate(name, route)
    }
  const fullCollection = (
    <a
      className="text-link"
      href="/collections/gorbe"
      onClick={go(
        t("همه محصولات کالکشن", "Explore the full collection"),
        "/collections/gorbe",
      )}
    >
      {t("همه محصولات کالکشن", "Explore the full collection")}
      {arrow}
    </a>
  )
  const buttonLabel = adding
    ? t("در حال افزودن…", "Adding…")
    : incomplete
      ? t("گزینه‌های پکیج را کامل کنید", "Complete your bundle selection")
      : !ready
        ? t("در حال محاسبه…", "Recalculating…")
        : capacity === 0
          ? t("این ترکیب ناموجود است", "This combination is out of stock")
          : editing
            ? t("ذخیره تغییرات پکیج", "Save bundle changes")
            : t("افزودن پکیج به سبد", "Add bundle to cart")
  const composition = (view = 0) => (
    <BundleStillLife view={view} renderMedia={renderMedia} />
  )
  if (
    !catsBundle.published ||
    ![bundleSlug, "cats"].includes(slug) ||
    mode === "not-found"
  )
    return (
      <div className="container product-detail-page">
        <section className="collections-state">
          <h1 ref={title} tabIndex={-1}>
            {t("این پکیج پیدا نشد.", "Bundle not found.")}
          </h1>
          <a
            className="button primary"
            href="/bundles"
            onClick={go(t("همه پکیج‌ها", "All bundles"), "/bundles")}
          >
            {t("مشاهده پکیج‌ها", "Browse bundles")}
            {arrow}
          </a>
        </section>
      </div>
    )
  if (mode === "loading")
    return (
      <div className="container product-detail-page" aria-busy="true">
        <h1 className="sr-only">{catsBundle.name[language]}</h1>
        <div className="product-main-layout">
          <div className="skeleton product-gallery-skeleton" />
          <div className="product-loading-info">
            {Array.from({ length: 7 }, (_, index) => (
              <div className="skeleton skeleton-line" key={index} />
            ))}
          </div>
        </div>
      </div>
    )
  return (
    <div className="container product-detail-page bundle-detail-page">
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
        <a
          href="/collections/gorbe"
          onClick={go(t("گربه", "Cats"), "/collections/gorbe")}
        >
          {t("گربه", "Cats")}
        </a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{catsBundle.name[language]}</span>
      </nav>
      {canBack && (
        <button className="bundle-back-link text-link" onClick={onBack}>
          {t("بازگشت به صفحه قبلی", "Back to the previous page")}
          {arrow}
        </button>
      )}
      <section className="product-main-layout">
        <div className="bundle-gallery-column">
          <ProductGallery
            language={language}
            media={composition()}
            images={bundleGallery}
            productName={catsBundle.name[language]}
            renderView={composition}
            renderDialog={renderDialog}
            imageIndex={sku?.imageIndex}
          />
          <div className="bundle-gallery-inventory">
            <span className="eyebrow">THE COMPLETE SET</span>
            <h2>
              {t(
                "یک مجموعه، چهار همراه کوچک",
                "One set. Four little companions.",
              )}
            </h2>
            <p>
              {t(
                "۱ دفتر طراحی، ۲ استیکر از یک طرح و ۱ نشانک. هیچ وسیله دیگری جزء پکیج نیست.",
                "1 sketchbook, 2 stickers of the same design and 1 bookmark. No other objects are included.",
              )}
            </p>
          </div>
        </div>
        <div className="product-purchase-panel bundle-purchase-panel">
          {editing && (
            <p className="product-feedback">
              {t(
                "ویرایش پکیج سبد؛ همه اجزا و تخفیف در همان ردیف حفظ می‌شوند.",
                "Editing a cart bundle. All components and the discount stay in one grouped line.",
              )}
            </p>
          )}
          <div className="product-intro-top">
            <a
              className="eyebrow"
              href="/collections/gorbe"
              onClick={go(
                t("کالکشن گربه", "Cats collection"),
                "/collections/gorbe",
              )}
            >
              {t("کالکشن گربه", "CATS COLLECTION")}
            </a>
            <button
              className="icon-button"
              aria-label={t("اشتراک‌گذاری لینک پکیج", "Share bundle link")}
              onClick={share}
            >
              <ShareIcon />
            </button>
          </div>
          <span className="bundle-page-label">{t("پکیج", "Bundle")}</span>
          <h1 ref={title} tabIndex={-1}>
            {catsBundle.name[language]}
          </h1>
          <p className="product-intro">{bundleCopy.intro[language]}</p>
          <p className="bundle-demo-note">
            {t(
              "اجزا، گزینه‌ها، قیمت و موجودی داده نمایشی‌اند.",
              "Components, options, prices and stock are demo data.",
            )}
          </p>
          {shareMessage && (
            <p className="product-feedback" role="status">
              {shareMessage}
            </p>
          )}
          <section
            className="bundle-components"
            aria-labelledby="bundle-components-title"
          >
            <div className="bundle-components-heading">
              <h2 id="bundle-components-title">
                {t("این پکیج شامل چیست؟", "What's included?")}
              </h2>
              <span>{t("اجزای ثابت", "Fixed contents")}</span>
            </div>
            {catsBundle.components.map((component, index) => {
              const product = catalogProducts.find(
                (product) => product.id === component.productId,
              )!
              const fixedSKU =
                product.id === notebook.id
                  ? sku
                  : product.skus.find((sku) =>
                      component.allowedSkus?.includes(sku.id),
                    )
              const partStock = fixedSKU
                ? (effectiveStocks[fixedSKU.id] ?? fixedSKU.stock)
                : undefined
              const needed = component.quantity * Math.max(1, qty)
              const sufficient = partStock !== undefined && partStock >= needed
              return (
                <article
                  className={`bundle-component-card ${
                    partStock !== undefined && !sufficient
                      ? "component-blocked"
                      : ""
                  }`}
                  key={product.id}
                >
                  <div className="bundle-component-head">
                    <div className="bundle-component-thumb" aria-hidden="true">
                      {index === 0 ? (
                        renderMedia("sage", "book")
                      ) : index === 1 ? (
                        <BundleStillLife view={2} renderMedia={renderMedia} />
                      ) : (
                        renderMedia("sage", "bookmark")
                      )}
                    </div>
                    <div>
                      <span className="component-fixed-count">
                        {number(component.quantity)}{" "}
                        {t("عدد در هر پکیج", "per bundle")}
                      </span>
                      <h3>{product.name[language]}</h3>
                      {product.id !== notebook.id && (
                        <p>
                          {index === 1
                            ? t(
                                "دو عدد از همین طرح؛ بدون انتخاب یا تغییر تعداد",
                                "Two of this design; fixed quantity and specification",
                              )
                            : t(
                                "طرح و مشخصات ثابت",
                                "Fixed design and specification",
                              )}
                        </p>
                      )}
                    </div>
                  </div>
                  {product.id === notebook.id && (
                    <>
                      <ProductOptions
                        selection={selection}
                        onChange={choose}
                        language={language}
                        disabled={adding}
                        unavailable={allUnavailable}
                        variants={allowedNotebookSKUs}
                        bundle
                        guide={() => setGuide(true)}
                      />
                      <p className="bundle-allowed-note">
                        {t(
                          "فقط گزینه‌های مجاز این پکیج. همه گزینه‌های دفتر مستقل در این مجموعه عرضه نمی‌شوند.",
                          "Only this bundle's allowed options. Not every standalone notebook option is included.",
                        )}
                      </p>
                    </>
                  )}
                  <div className="bundle-component-footer">
                    <span
                      className={`component-availability ${
                        sufficient ? "available" : ""
                      }`}
                    >
                      {partStock === undefined ? (
                        t("منتظر انتخاب دفتر", "Choose notebook options")
                      ) : !ready && product.id === notebook.id ? (
                        t("در حال بررسی…", "Checking…")
                      ) : sufficient ? (
                        <>
                          <span aria-hidden="true">✓</span>
                          {t("موجود", "In stock")}
                        </>
                      ) : partStock === 0 ? (
                        t(
                          "این جزء ناموجود است",
                          "This component is out of stock",
                        )
                      ) : (
                        t(
                          "برای تعداد انتخاب‌شده کافی نیست",
                          "Insufficient for the selected quantity",
                        )
                      )}
                    </span>
                    <a
                      href={`/products/${product.slug}`}
                      className="text-link"
                      onClick={go(
                        product.name[language],
                        `/products/${product.slug}`,
                      )}
                    >
                      {t("محصول مستقل", "Standalone product")}
                      {arrow}
                    </a>
                  </div>
                </article>
              )
            })}
          </section>
          {notice && (
            <p className="product-feedback" role="status">
              {notice}
            </p>
          )}
          <div className="bundle-purchase-summary">
            <h2>{t("خلاصه پکیج شما", "Your bundle, together")}</h2>
            <div className="selection-summary" aria-live="polite">
              {incomplete ? (
                t(
                  "گزینه‌های دفتر را انتخاب کنید.",
                  "Choose your notebook options.",
                )
              ) : (
                <>
                  <strong>{summary(selection)}</strong>
                  <span>
                    {t(
                      "یک دفتر + دو استیکر + یک نشانک",
                      "1 notebook + 2 stickers + 1 bookmark",
                    )}
                  </span>
                </>
              )}
            </div>
            <div className="quantity-section">
              <label htmlFor="bundle-quantity">
                {t("تعداد پکیج", "Bundle quantity")}
              </label>
              <div className="quantity-stepper">
                <button
                  aria-label={t(
                    "کم‌کردن تعداد پکیج",
                    "Decrease bundle quantity",
                  )}
                  disabled={!ready || capacity === 0 || adding || qty <= 1}
                  onClick={() => setQuantity(String(qty - 1))}
                >
                  −
                </button>
                <input
                  id="bundle-quantity"
                  inputMode="numeric"
                  value={
                    /^\d+$/.test(quantity)
                      ? Number(quantity).toLocaleString(
                          language === 0 ? "fa-IR" : "en-US",
                          { useGrouping: false },
                        )
                      : quantity
                  }
                  disabled={!ready || capacity === 0 || adding}
                  onFocus={() => setEditingQuantity(true)}
                  onBlur={() => setEditingQuantity(false)}
                  onChange={(e) =>
                    setQuantity(
                      e.target.value
                        .replace(/[۰-۹]/g, (digit) =>
                          String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
                        )
                        .replace(/[٠-٩]/g, (digit) =>
                          String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
                        ),
                    )
                  }
                  aria-invalid={ready && capacity > 0 && !quantityValid}
                  aria-describedby={`bundle-quantity-help${
                    ready && capacity > 0 && !quantityValid
                      ? " bundle-quantity-error"
                      : ""
                  }`}
                />
                <button
                  aria-label={t(
                    "افزایش تعداد پکیج",
                    "Increase bundle quantity",
                  )}
                  disabled={
                    !ready ||
                    capacity === 0 ||
                    !quantityValid ||
                    adding ||
                    qty >= capacity
                  }
                  onClick={() => setQuantity(String(qty + 1))}
                >
                  +
                </button>
              </div>
              <p id="bundle-quantity-help">
                {qty > 0
                  ? `${t("شما ", "You're buying ")}${number(qty)} ${t("پکیج می‌خرید: ", "bundles: ")}${finalCounts(qty)}`
                  : t("تعداد پکیج را وارد کنید.", "Enter a bundle quantity.")}
              </p>
            </div>
            {ready && capacity > 0 && !quantityValid && (
              <div
                className="product-inline-error"
                id="bundle-quantity-error"
                role="alert"
              >
                <p>
                  {t(
                    "برای این ترکیب، تعداد انتخاب‌شده قابل خرید نیست. سقف نمونه: ",
                    "The selected quantity isn't available for this combination. Demo limit: ",
                  )}
                  {number(capacity)}
                </p>
                <button
                  className="filter-clear"
                  onClick={() => setQuantity(String(capacity))}
                >
                  {t("اصلاح تعداد به ", "Set quantity to ")}
                  {number(capacity)}
                </button>
              </div>
            )}
            <div
              className="bundle-price-breakdown"
              aria-live="polite"
              aria-busy={!!sku && !ready}
            >
              {!parts ? (
                startPrice === undefined ? (
                  <p className="product-stock-state">
                    {t(
                      "همه ترکیب‌ها ناموجودند",
                      "All combinations are out of stock",
                    )}
                  </p>
                ) : (
                  <div className="starting-price">
                    <span>{t("از", "From")}</span>
                    <strong>{money(startPrice)}</strong>
                  </div>
                )
              ) : !ready ? (
                <div
                  className="skeleton skeleton-price"
                  aria-label={t(
                    "در حال محاسبه قیمت و موجودی",
                    "Recalculating price and availability",
                  )}
                />
              ) : (
                <>
                  <div
                    className={`product-stock-state ${
                      capacity > 0 ? "in-stock" : ""
                    }`}
                  >
                    <span aria-hidden="true">{capacity > 0 ? "✓" : "—"}</span>
                    {capacity > 0
                      ? t(
                          "ترکیب پکیج موجود است",
                          "This bundle combination is in stock",
                        )
                      : t(
                          "یکی از اجزای انتخاب‌شده موجود نیست.",
                          "One selected component is out of stock.",
                        )}
                  </div>
                  <div className="bundle-price-row">
                    <span>
                      {t("خرید جداگانه اجزا", "Items purchased separately")}
                    </span>
                    <s>{money(quote!.separate)}</s>
                  </div>
                  <div className="bundle-price-row bundle-discount-row">
                    <span>{t("تخفیف ثابت پکیج", "Fixed bundle discount")}</span>
                    <strong>− {money(quote!.saving)}</strong>
                  </div>
                  <div className="bundle-price-row bundle-unit-price">
                    <span>{t("قیمت هر پکیج", "Price per bundle")}</span>
                    <strong>{money(quote!.price)}</strong>
                  </div>
                  <div className="selection-total">
                    <span>{t("مبلغ کل این انتخاب", "Selection total")}</span>
                    <strong>{qty > 0 ? money(quote!.price * qty) : "—"}</strong>
                  </div>
                </>
              )}
              <p className="price-shipping-note">
                {t(
                  "هزینه ارسال در مرحله پرداخت محاسبه می‌شود.",
                  "Shipping is calculated at checkout.",
                )}
              </p>
              <small className="demo-price">
                {t(
                  "قیمت و تخفیف فقط داده نمایشی‌اند.",
                  "Price and saving are demo data only.",
                )}
              </small>
            </div>
            <p className="bundle-stacking-note">
              {bundleCopy.allowDiscountStacking
                ? t(
                    "امکان اعمال کد به شرایط همان کد بستگی دارد.",
                    "Discount-code eligibility depends on that code's terms.",
                  )
                : t(
                    "تخفیف این پکیج با کد تخفیف دیگر جمع نمی‌شود. این محدودیت فقط مربوط به پکیج است، نه محصولات مستقل سبد.",
                    "This bundle discount can't be combined with another discount code. This restriction applies to the bundle, not standalone products in your cart.",
                  )}
            </p>
            {newQuote && (
              <div className="price-change-warning" role="alert">
                <h2>
                  {t(
                    "قیمت این پکیج تغییر کرده است.",
                    "This bundle's price has changed.",
                  )}
                </h2>
                <p>
                  <s>{money(newQuote.previous)}</s> →{" "}
                  <strong>{money(newQuote.next)}</strong>{" "}
                  {t("برای هر پکیج", "per bundle")}
                </p>
                <p>
                  {t("مبلغ جدید این انتخاب: ", "New selection total: ")}
                  {money(newQuote.next * qty)}
                </p>
                <div>
                  <button
                    className="button primary"
                    onClick={() => {
                      const accepted = newQuote.parts
                      setPrices((old) => ({
                        ...old,
                        [sku!.id]: accepted.find(
                          (part) => part.productId === notebook.id,
                        )!.unitPrice,
                      }))
                      setNewQuote(null)
                      add(accepted)
                    }}
                  >
                    {t("تأیید مبلغ جدید و افزودن", "Accept new price & add")}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => setNewQuote(null)}
                  >
                    {t("انصراف", "Cancel")}
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="product-inline-error" role="alert">
                <p>{error}</p>
                {mode === "add-error" && (
                  <button
                    className="filter-clear"
                    disabled={!canAdd}
                    onClick={() => add()}
                  >
                    {t("دوباره تلاش کنید", "Try again")}
                  </button>
                )}
              </div>
            )}
            <button
              className="button primary product-add-button"
              disabled={!canAdd}
              onClick={() => add()}
              aria-busy={adding}
            >
              {buttonLabel}
              <BagIcon />
            </button>
            <p className="product-reservation-note">
              {t(
                "سبد نمایشی؛ موجودی هیچ جزء به‌طور قطعی رزرو نمی‌شود.",
                "Demo cart; no component stock is reserved.",
              )}
            </p>
          </div>
        </div>
      </section>
      <section className="bundle-detail-info">
        <div>
          <span className="eyebrow">ONE SET, NOT A CUSTOM KIT</span>
          <h2>
            {t("انتخاب‌ها برای شما؛ اجزا ثابت‌اند", "Your choices. A fixed set.")}
          </h2>
          <p>
            {t(
              "سایز، تعداد برگ و جلد فقط از دامنه مجاز پکیج انتخاب می‌شوند. تعداد هر جزء ثابت است و تعداد پکیج در همه اجزا ضرب می‌شود.",
              "Choose notebook size, sheets and cover only from this bundle's allowed options. Component quantities are fixed and multiplied by your bundle quantity.",
            )}
          </p>
        </div>
        <div>
          <h2>{t("ارسال و شرایط پکیج", "Bundle delivery and conditions")}</h2>
          <p>
            {t(
              "روش و هزینه ارسال پس از انتخاب آدرس مشخص می‌شوند. شرایط لغو و مرجوعی، از سیاست تأییدشده محصول ارائه خواهند شد.",
              "Shipping options and cost are shown after you choose an address. Cancellation and returns require approved product policy.",
            )}
          </p>
          <a
            className="text-link"
            href="/returns-policy"
            onClick={go(
              t("شرایط لغو و مرجوعی", "Cancellation and return policy"),
              "/returns-policy",
            )}
          >
            {t("شرایط لغو و مرجوعی", "Cancellation and return policy")}
            {arrow}
          </a>
        </div>
      </section>
      <section className="product-related">
        <div className="product-related-heading">
          <h2>
            {t("محصولات بیشتر از کالکشن گربه", "More from the Cats collection")}
          </h2>
          {fullCollection}
        </div>
        <div className="product-grid">
          {catalogProducts
            .filter(
              (product) =>
                product.published &&
                product.collections.includes("gorbe") &&
                (catsBundle.components.some(
                  (component) => component.productId === product.id,
                ) ||
                  product.id === "cat-ruled"),
            )
            .slice(0, 4)
            .map((product) => {
              const available = product.skus.filter((sku) => sku.stock > 0)
              const component = catsBundle.components.some(
                (part) => part.productId === product.id,
              )
              return (
                <ProductCard
                  key={product.id}
                  name={product.name[language]}
                  route={`/products/${product.slug}`}
                  collection={
                    component
                      ? t("جزء همین پکیج", "Included in this bundle")
                      : t("کالکشن گربه", "Cats collection")
                  }
                  options={[
                    ...new Set(
                      product.skus.map((sku) => sku.size).filter(Boolean),
                    ),
                  ].join(" · ")}
                  price={
                    available.length
                      ? Math.min(...available.map((sku) => sku.price))
                      : undefined
                  }
                  language={language}
                  media={renderMedia("sage", product.kind)}
                  arrow={arrow}
                  heart={heart}
                  onNavigate={onNavigate}
                  cta={
                    component
                      ? t("مشاهده محصول مستقل", "View standalone product")
                      : undefined
                  }
                />
              )
            })}
        </div>
        <a
          className="text-link"
          href="/bundles"
          onClick={go(t("همه پکیج‌ها", "All bundles"), "/bundles")}
        >
          {t("همه پکیج‌ها", "All bundles")}
          {arrow}
        </a>
      </section>
      {renderDialog(
        guide,
        () => setGuide(false),
        t("راهنمای گزینه‌های پکیج", "Bundle option guide"),
        <div className="notebook-guide">
          <div className="size-comparison">
            {sizes.map((size) => (
              <div key={size.value}>
                <div className={`guide-size guide-${size.value}`} />
                <strong dir="ltr">{size.value}</strong>
                <small>
                  {number(size.width)} × {number(size.height)}{" "}
                  {t("میلی‌متر", "mm")}
                </small>
              </div>
            ))}
          </div>
          <p>
            {t(
              "ابعاد بالا اسمی‌اند؛ اندازه نهایی باید از داده برند بیاید. فقط گزینه‌های فعال این پکیج قابل انتخاب‌اند.",
              "Dimensions above are nominal; final measurements require brand data. Only options enabled for this bundle can be selected.",
            )}
          </p>
          <h3>
            {t(
              "برگ و تعداد پکیج مستقل‌اند",
              "Sheets and bundle quantity are independent",
            )}
          </h3>
          <p>
            {t(
              "۵۰ برگ یعنی ۱۰۰ صفحه، نه الزاماً ۱۰۰ روی چاپ‌شده. دو پکیج شامل دو دفتر است که هرکدام تعداد برگ انتخاب‌شده را دارند.",
              "50 sheets mean 100 pages, not necessarily 100 printed sides. Two bundles contain two notebooks, each with the selected sheet count.",
            )}
          </p>
        </div>,
        "guide",
      )}
      {renderDialog(
        !!confirmation,
        () => setConfirmation(null),
        t("پکیج به سبد اضافه شد.", "Bundle added to your cart."),
        confirmation && (
          <div className="cart-confirmation">
            <span className="cart-demo-label">
              {t(
                "تأیید سبد نمایشی — بدون خرید واقعی",
                "Demo cart confirmation — no real purchase",
              )}
            </span>
            <div className="cart-confirmation-item">
              <div>{composition()}</div>
              <div>
                <h3>{catsBundle.name[language]}</h3>
                <p>
                  {t("تعداد پکیج: ", "Bundle quantity: ")}
                  {number(confirmation.quantity)}
                </p>
                <p>{summary(confirmation.selection)}</p>
                <strong>
                  {money(confirmation.unitPrice * confirmation.quantity)}
                </strong>
              </div>
            </div>
            <details className="bundle-confirmation-parts" open>
              <summary>
                {t("اجزای این ردیف پکیج", "Components of this bundle line")}
              </summary>
              <p>{finalCounts(confirmation.quantity)}</p>
            </details>
            <a
              className="button primary"
              href="/cart"
              onClick={(e) => {
                e.preventDefault()
                setConfirmation(null)
                onNavigate(t("سبد خرید", "Cart"), "/cart")
              }}
            >
              {t("مشاهده سبد", "View cart")}
              {arrow}
            </a>
            <button
              className="button secondary"
              onClick={() => setConfirmation(null)}
            >
              {t("ادامه خرید", "Continue shopping")}
            </button>
            <p>
              {t(
                "موجودی اجزا پیش از پرداخت دوباره بررسی می‌شود. پکیج در سبد یک ردیف با اجزای ثابت و تخفیف خودش باقی می‌ماند.",
                "Component availability will be checked again before payment. The bundle stays one cart line, with its fixed components and discount.",
              )}
            </p>
          </div>
        ),
        "cart",
      )}
      {!editingQuantity && (
        <div className="mobile-buy-bar bundle-mobile-buy">
          <div>
            <small>
              {adding
                ? t("در حال افزودن…", "Adding…")
                : incomplete
                  ? t("گزینه‌ها را کامل کنید", "Complete the options")
                  : !ready
                    ? t("در حال محاسبه…", "Recalculating…")
                    : capacity === 0
                      ? t("ترکیب ناموجود", "Out of stock")
                      : t("مبلغ کل", "Selection total")}
            </small>
            <strong>
              {ready && capacity > 0 && qty > 0
                ? money(quote!.price * qty)
                : "—"}
            </strong>
          </div>
          <button
            className="button primary"
            disabled={!canAdd}
            onClick={() => add()}
          >
            {editing
              ? t("ذخیره تغییرات", "Save changes")
              : t("افزودن پکیج", "Add bundle")}
          </button>
        </div>
      )}
    </div>
  )
}
function ShareIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8" />
    </svg>
  )
}
function BagIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M5 7h14l1 14H4L5 7ZM8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
  )
}

// The published contract supplies descriptions and fixed SKU quantities only.
// Keep the reference detail structure without invoking prototype purchases/options.
export function PublishedBundleDetail({ bundle, language, onNavigate }: {
  bundle: import("../features/catalog/bundle-catalog").PublishedBundle;
  language: 0 | 1; onNavigate: (name: string, route: string) => void;
}) {
  const t = (fa: string, en: string) => language === 0 ? fa : en;
  const root = `/${language === 0 ? "fa" : "en"}/bundles`;
  const name = t(bundle.title_fa, bundle.title_en);
  const go = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onNavigate(t("پکیج‌ها", "Bundles"), root);
  };
  return <div className="container product-detail-page bundle-detail-page">
    <nav className="breadcrumb detail-breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}><a href={root} onClick={go}>{t("پکیج‌ها", "Bundles")}</a><span>/</span><span aria-current="page">{name}</span></nav>
    <section className="product-main-layout">
      <div className="bundle-gallery-column"><div className="product-gallery"><div className="gallery-main"><div className="gallery-surface"><div className="gallery-object"><ReferenceBundleImage slug={bundle.slug} language={language} /></div></div><span className="gallery-editorial">NILART STUDIO / EVERYDAY OBJECTS</span></div></div><div className="bundle-gallery-inventory"><span className="eyebrow">THE COMPLETE SET</span><h2>{t("اجزای منتشرشده پکیج", "Published bundle contents")}</h2><p>{t("فقط اجزای فهرست‌شده در این پکیج قرار دارند.", "Only the listed components belong to this bundle.")}</p></div></div>
      <div className="product-purchase-panel bundle-purchase-panel"><div className="product-intro-top"><span className="eyebrow">NILART STUDIO</span></div><span className="bundle-page-label">{t("پکیج", "Bundle")}</span><h1>{name}</h1><p className="product-intro">{t(bundle.description_fa,bundle.description_en)}</p>
        <section className="bundle-components" aria-labelledby="published-bundle-components"><div className="bundle-components-heading"><h2 id="published-bundle-components">{t("این پکیج شامل چیست؟", "What's included?")}</h2><span>{t("اجزای ثابت", "Fixed contents")}</span></div>
          {bundle.components.map(part=><article className="bundle-component-card" key={part.sku_id}><div className="bundle-component-head"><div className="bundle-component-thumb" aria-hidden="true"><span>—</span></div><div><span className="component-fixed-count">{part.quantity.toLocaleString(language === 0 ? "fa-IR" : "en-US")} {t("عدد در هر پکیج", "per bundle")}</span><h3>{t(part.title_fa,part.title_en)}</h3><p><bdi>{part.code}</bdi></p></div></div><div className="bundle-component-footer"><span className="component-availability">{t("موجودی تأیید نشده", "Stock unconfirmed")}</span></div></article>)}
          {!bundle.components.length && <p className="product-stock-state">{t("جزئیات اجزا در دسترس نیست", "Component details unavailable")}</p>}
        </section>
        <div className="bundle-price-breakdown"><p className="product-stock-state">{t("قیمت و تخفیف تأیید نشده", "Price and discount unconfirmed")}</p></div><button className="button primary product-add-button" disabled>{t("اطلاعات خرید تأیید نشده", "Purchase details unconfirmed")}</button><p className="product-reservation-note">{t("موجودی یا امکان خرید از این فهرست استنتاج نمی‌شود.", "This listing does not confirm inventory or purchase eligibility.")}</p>
      </div>
    </section>
  </div>;
}
