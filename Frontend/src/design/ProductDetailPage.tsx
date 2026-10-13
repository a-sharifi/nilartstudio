import Mockup from "./Mockup";
import { ReferenceProductImage } from "./ReferenceMedia";
import { useEffect, useRef, useState, type ReactNode } from "react"
import { catalogBundles, catalogProducts, itemOptions } from "./catalog"
import ProductCard from "./ProductCard"
import BundleResultCard from "./BundleResultCard"
import BundleStillLife from "./BundleStillLife"
import ProductGallery, { type ProductDialog } from "./ProductGallery"
import ProductOptions from "./ProductOptions"
import {
  changeSelection,
  covers,
  emptySelection,
  gallery,
  notebook,
  notebookCopy,
  productSlug,
  selectedSKU,
  sizes,
  validQuantity,
  type CartLine,
  type Selection,
} from "./product"

type Props = {
  slug: string
  language: 0 | 1
  mode: string
  preset: string
  initialDraft?: ProductInitialDraft
  editing?: boolean
  livePrices?: Record<string, number>
  liveStocks?: Record<string, number>
  onNavigate: (name: string, route: string) => void
  onAdd: (line: CartLine, stock: number) => boolean
  favorites: string[]
  onFavorite: (id: string) => void
  signedIn: boolean
  renderMedia: (color: string, kind: string, hero?: boolean) => ReactNode
  renderDialog: ProductDialog
  arrow: ReactNode
  heart: ReactNode
}
interface PriceChange {
  previous: number
  next: number
}
interface ProductInitialDraft {
  selection: Selection
  quantity: string
}
export default function ProductDetailPage({
  slug,
  language,
  mode,
  preset,
  initialDraft,
  editing = false,
  livePrices = {},
  liveStocks = {},
  onNavigate,
  onAdd,
  favorites,
  onFavorite,
  signedIn,
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
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [adding, setAdding] = useState(false)
  const [guide, setGuide] = useState(false)
  const [confirmation, setConfirmation] = useState<CartLine | null>(null)
  const [priceChange, setPriceChange] = useState<PriceChange | null>(null)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [stocks, setStocks] = useState<Record<string, number>>({})
  const [favoriteError, setFavoriteError] = useState(false)
  const [quantityEditing, setQuantityEditing] = useState(false)
  const [shareMessage, setShareMessage] = useState("")
  const titleRef = useRef<HTMLHeadingElement>(null)
  const request = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submitting = useRef(false)
  const failedOnce = useRef(false)
  const sku = selectedSKU(selection)
  const unavailable = mode === "all-unavailable"
  const stock = sku
    ? unavailable
      ? 0
      : (stocks[sku.id] ?? liveStocks[sku.id] ?? sku.stock)
    : 0
  const price = sku
    ? (prices[sku.id] ?? livePrices[sku.id] ?? sku.price)
    : undefined
  const ready = !!sku && resolvedId === sku.id && mode !== "sku-loading"
  const incomplete = !selection.size || !selection.sheets || !selection.cover
  const qtyValid = !!sku && validQuantity(quantity, stock)
  const qtyNumber = /^\d+$/.test(quantity) ? Number(quantity) : 0
  const qtyError = !!sku && ready && stock > 0 && !qtyValid
  const canAdd = ready && stock > 0 && qtyValid && !adding && !priceChange
  const startPrice = Math.min(
    ...notebook.skus
      .filter((sku) => (liveStocks[sku.id] ?? sku.stock) > 0)
      .map((sku) => livePrices[sku.id] ?? sku.price),
  )
  const summary = (value: Selection) =>
    `${value.size} · ${number(Number(value.sheets))} ${t("برگ", "sheets")} · ${covers.find((cover) => cover.value === value.cover)?.label[language] || ""}`
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
    return () => {
      if (request.current) clearTimeout(request.current)
    }
  }, [])
  useEffect(() => {
    setResolvedId(null)
    if (!sku || mode === "sku-loading") return
    const timer = setTimeout(() => setResolvedId(sku.id), 260)
    return () => clearTimeout(timer)
  }, [sku?.id, mode])
  useEffect(() => {
    if (request.current) clearTimeout(request.current)
    submitting.current = false
    failedOnce.current = false
    setAdding(false)
    setError("")
    setPriceChange(null)
    setPrices({})
    setStocks({})
  }, [mode, preset])
  useEffect(() => {
    if (!preset) return
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
    setQuantity(type === "three" ? "3" : "1")
    setError("")
    setNotice("")
    setPriceChange(null)
  }, [preset])
  const choose = (key: keyof Selection, value: string) => {
    const result = changeSelection(selection, key, value)
    setSelection(result.selection)
    setError("")
    setPriceChange(null)
    setNotice(
      result.cleared.length
        ? t(
            "گزینه قبلی با این انتخاب سازگار نیست؛ گزینه پاک‌شده را دوباره انتخاب کنید.",
            "A previous option isn't compatible. Please choose the cleared option again.",
          )
        : "",
    )
  }
  const beginAdd = (acceptedPrice?: number) => {
    if (
      !sku ||
      !ready ||
      stock <= 0 ||
      !qtyValid ||
      submitting.current ||
      (priceChange && acceptedPrice === undefined)
    )
      return
    const snapshot = {
      skuId: sku.id,
      quantity: qtyNumber,
      unitPrice: acceptedPrice ?? price!,
      selection: { ...selection },
    }
    submitting.current = true
    setAdding(true)
    setError("")
    request.current = setTimeout(() => {
      submitting.current = false
      setAdding(false)
      if (mode === "stock-change" && stocks[sku.id] === undefined) {
        setStocks((previous) => ({ ...previous, [sku.id]: 2 }))
        setError(
          t(
            "موجودی این گزینه تغییر کرده است؛ تعداد را بررسی کنید. سقف جدید نمونه: ۲ دفتر.",
            "Stock has changed; please review the quantity. New demo limit: 2 notebooks.",
          ),
        )
        return
      }
      if (
        mode === "price-change" &&
        acceptedPrice === undefined &&
        prices[sku.id] === undefined
      ) {
        setPriceChange({ previous: price!, next: price! + 20000 })
        return
      }
      if (mode === "add-error" && !failedOnce.current) {
        failedOnce.current = true
        setError(
          t(
            "محصول به سبد اضافه نشد. دوباره تلاش کنید.",
            "We couldn't add this item to your cart. Try again.",
          ),
        )
        return
      }
      if (!onAdd(snapshot, stock)) {
        setError(
          t(
            "مجموع این SKU در سبد از موجودی بیشتر می‌شود؛ تعداد را کاهش دهید.",
            "The combined quantity of this SKU would exceed stock. Please reduce the quantity.",
          ),
        )
        return
      }
      if (!editing) setConfirmation(snapshot)
    }, 600)
  }
  const favorite = () => {
    if (mode === "favorite-error" && signedIn) setFavoriteError(true)
    else onFavorite(notebook.id)
  }
  const share = async () => {
    const url = new URL(`/products/${productSlug}`, window.location.origin).href
    try {
      await navigator.clipboard.writeText(url)
      setShareMessage(t("لینک محصول کپی شد.", "Product link copied."))
    } catch {
      setShareMessage(
        t(
          "کپی خودکار ممکن نشد؛ لینک محصول: ",
          "Copy wasn't available. Product link: ",
        ) + url,
      )
    }
  }
  const go =
    (name: string, route: string) =>
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      onNavigate(name, route)
    }
  const cartLabel = adding
    ? t("در حال افزودن…", "Adding…")
    : !incomplete && sku && ready && stock === 0
      ? t("ناموجود", "Out of stock")
      : incomplete
        ? t("انتخاب گزینه‌ها را کامل کنید", "Complete your selection")
        : !ready
          ? t("در حال بررسی گزینه…", "Checking option…")
          : editing
            ? t("ذخیره تغییرات", "Save changes")
            : t("افزودن به سبد", "Add to cart")
  const found =
    [productSlug, "cat-sketch-127", "sketchbook-cats"].includes(slug) &&
    mode !== "not-found"
  const related = catalogProducts
    .filter(
      (product) =>
        product.published &&
        product.collections.includes("gorbe") &&
        product.id !== notebook.id,
    )
    .filter((product) => product.id !== "cat-sketch-200")
    .slice(0, 4)
  const bundles = catalogBundles.filter(
    (bundle) =>
      bundle.published &&
      bundle.components.some((part) => part.productId === notebook.id),
  )
  if (!found)
    return (
      <div className="container product-detail-page">
        <section className="collections-state">
          <h1 ref={titleRef} tabIndex={-1}>
            {t("این محصول پیدا نشد.", "Product not found.")}
          </h1>
          <a
            className="button primary"
            href="/shop"
            onClick={go(t("فروشگاه", "Shop"), "/shop")}
          >
            {t("بازگشت به فروشگاه", "Back to shop")}
            {arrow}
          </a>
        </section>
      </div>
    )
  if (mode === "loading")
    return (
      <div className="container product-detail-page" aria-busy="true">
        <h1 className="sr-only">{notebookCopy.name[language]}</h1>
        <div className="product-main-layout">
          <div className="skeleton product-gallery-skeleton" />
          <div className="product-loading-info">
            {Array.from({ length: 8 }, (_, index) => (
              <div className="skeleton skeleton-line" key={index} />
            ))}
          </div>
        </div>
      </div>
    )
  return (
    <div className="container product-detail-page">
      <nav
        className="breadcrumb detail-breadcrumb"
        aria-label={t("مسیر صفحه", "Breadcrumb")}
      >
        <a href="/" onClick={go(t("خانه", "Home"), "/")}>
          {t("خانه", "Home")}
        </a>
        <span>/</span>
        <a
          href="/collections"
          onClick={go(t("کالکشن‌ها", "Collections"), "/collections")}
        >
          {t("کالکشن‌ها", "Collections")}
        </a>
        <span>/</span>
        <a
          href="/collections/gorbe"
          onClick={go(t("گربه", "Cats"), "/collections/gorbe")}
        >
          {t("گربه", "Cats")}
        </a>
        <span>/</span>
        <span aria-current="page">{notebookCopy.name[language]}</span>
      </nav>
      <section className="product-main-layout">
        <ProductGallery
          language={language}
          media={renderMedia("sage", "book")}
          renderDialog={renderDialog}
          imageIndex={sku?.imageIndex}
        />
        <div className="product-purchase-panel">
          {editing && (
            <p className="product-feedback">
              {t(
                "ویرایش قلم سبد؛ ذخیره، همان ردیف را به‌روزرسانی می‌کند. SKU تکراری با بررسی تعداد تجمیع می‌شود.",
                "Editing a cart line. Saving updates that line; duplicate SKUs are merged after quantity validation.",
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
            <div>
              <button
                className={`icon-button ${
                  favorites.includes(notebook.id) ? "favorite-active" : ""
                }`}
                aria-label={t("ذخیره در علاقه‌مندی‌ها", "Save to favorites")}
                aria-pressed={favorites.includes(notebook.id)}
                onClick={favorite}
              >
                {heart}
              </button>
              <button
                className="icon-button"
                onClick={share}
                aria-label={t("اشتراک‌گذاری لینک", "Share product link")}
              >
                <ShareIcon />
              </button>
            </div>
          </div>
          <h1 ref={titleRef} tabIndex={-1}>
            {notebookCopy.name[language]}
          </h1>
          <p className="product-intro">{notebookCopy.intro[language]}</p>
          <div className="product-fixed-fact">
            <span dir="ltr">127 GSM</span>
            <span>
              {t(
                "گرماژ ثابت کاغذ · با تعداد برگ متفاوت است",
                "Fixed paper weight · not the sheet count",
              )}
            </span>
          </div>
          {shareMessage && (
            <p className="product-feedback" role="status">
              {shareMessage}
            </p>
          )}
          {favoriteError && (
            <p className="product-inline-error" role="alert">
              {t(
                "ذخیره علاقه‌مندی انجام نشد؛ وضعیت قبلی حفظ شد.",
                "Favorite wasn't saved; your previous choice is unchanged.",
              )}
              <button
                className="filter-clear"
                onClick={() => {
                  onFavorite(notebook.id)
                  setFavoriteError(false)
                }}
              >
                {t("دوباره تلاش کنید", "Try again")}
              </button>
            </p>
          )}
          <ProductOptions
            selection={selection}
            onChange={choose}
            language={language}
            disabled={adding}
            unavailable={unavailable}
            guide={() => setGuide(true)}
          />
          {notice && (
            <p className="product-feedback" role="status">
              {notice}
            </p>
          )}
          <div className="selection-summary" aria-live="polite">
            {incomplete
              ? t(
                  "سایز، تعداد برگ و جلد را انتخاب کنید.",
                  "Choose a size, sheet count and cover.",
                )
              : summary(selection)}
          </div>
          <div className="quantity-section">
            <label htmlFor="notebook-quantity">
              {t("تعداد دفتر", "Number of notebooks")}
            </label>
            <div className="quantity-stepper">
              <button
                type="button"
                disabled={!ready || stock === 0 || adding || qtyNumber <= 1}
                onClick={() => setQuantity(String(qtyNumber - 1))}
                aria-label={t(
                  "کم‌کردن تعداد دفتر",
                  "Decrease notebook quantity",
                )}
              >
                −
              </button>
              <input
                id="notebook-quantity"
                inputMode="numeric"
                value={
                  /^\d+$/.test(quantity)
                    ? Number(quantity).toLocaleString(
                        language === 0 ? "fa-IR" : "en-US",
                        { useGrouping: false },
                      )
                    : quantity
                }
                disabled={!ready || stock === 0 || adding}
                onFocus={() => setQuantityEditing(true)}
                onBlur={() => setQuantityEditing(false)}
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
                aria-invalid={qtyError}
                aria-describedby={`quantity-helper${
                  qtyError ? " quantity-error" : ""
                }`}
              />
              <button
                type="button"
                disabled={
                  !ready ||
                  stock === 0 ||
                  adding ||
                  !qtyValid ||
                  qtyNumber >= stock
                }
                onClick={() => setQuantity(String(qtyNumber + 1))}
                aria-label={t(
                  "افزایش تعداد دفتر",
                  "Increase notebook quantity",
                )}
              >
                +
              </button>
            </div>
            <p id="quantity-helper">
              {t(
                "تعداد دفترهایی که می‌خرید؛ تعداد برگ هر دفتر تغییر نمی‌کند.",
                "The number of notebooks you buy; sheets per notebook stay unchanged.",
              )}
            </p>
            {qtyError && (
              <div
                className="product-inline-error"
                id="quantity-error"
                role="alert"
              >
                {t(
                  "تعداد باید عدد صحیح بین ۱ و ",
                  "Quantity must be a whole number between 1 and ",
                )}
                {number(stock)}.
                <button
                  className="filter-clear"
                  onClick={() => setQuantity(String(stock))}
                >
                  {t("اصلاح تعداد به ", "Set quantity to ")}
                  {number(stock)}
                </button>
              </div>
            )}
          </div>
          <div
            className="product-price-summary"
            aria-live="polite"
            aria-busy={!!sku && !ready}
          >
            {!sku ? (
              unavailable || !Number.isFinite(startPrice) ? (
                <p className="product-stock-state">
                  {t("همه گزینه‌ها ناموجودند", "All options are out of stock")}
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
                  "در حال بررسی قیمت و موجودی",
                  "Checking price and stock",
                )}
              />
            ) : (
              <>
                <div
                  className={`product-stock-state ${
                    stock > 0 ? "in-stock" : ""
                  }`}
                >
                  <span aria-hidden="true">{stock > 0 ? "✓" : "—"}</span>
                  {stock > 0
                    ? t("موجود", "In stock")
                    : t("ناموجود", "Out of stock")}
                </div>
                <div className="unit-price">
                  <span>{t("قیمت هر دفتر", "Price per notebook")}</span>
                  <strong>{money(price!)}</strong>
                </div>
                <div className="selection-total">
                  <span>{t("مبلغ این انتخاب", "Selection total")}</span>
                  <strong>
                    {qtyNumber > 0 ? money(price! * qtyNumber) : "—"}
                  </strong>
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
                "قیمت و موجودی صرفاً داده نمایشی‌اند.",
                "Prices and stock are demo data only.",
              )}
            </small>
          </div>
          {priceChange && (
            <div className="price-change-warning" role="alert">
              <h2>
                {t(
                  "قیمت این گزینه تغییر کرده است.",
                  "The price of this option has changed.",
                )}
              </h2>
              <p>
                <s>{money(priceChange.previous)}</s> →{" "}
                <strong>{money(priceChange.next)}</strong>{" "}
                {t("برای هر دفتر", "per notebook")}
              </p>
              <p>
                {t("مبلغ جدید این انتخاب: ", "New selection total: ")}
                {money(priceChange.next * qtyNumber)}
              </p>
              <div>
                <button
                  className="button primary"
                  onClick={() => {
                    const next = priceChange.next
                    setPrices((old) => ({ ...old, [sku!.id]: next }))
                    setPriceChange(null)
                    beginAdd(next)
                  }}
                >
                  {t("تأیید مبلغ جدید و افزودن", "Accept new price & add")}
                </button>
                <button
                  className="button secondary"
                  onClick={() => setPriceChange(null)}
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
                  onClick={() => beginAdd()}
                >
                  {t("دوباره تلاش کنید", "Try again")}
                </button>
              )}
            </div>
          )}
          <button
            className="button primary product-add-button"
            disabled={!canAdd}
            onClick={() => beginAdd()}
            aria-busy={adding}
          >
            {cartLabel}
            <BagIcon />
          </button>
          <p className="product-reservation-note">
            {t(
              "سبد نمایشی؛ افزودن، رزرو قطعی موجودی نیست.",
              "Demo cart; adding does not reserve stock.",
            )}
          </p>
        </div>
      </section>
      <section className="product-information" aria-labelledby="about-notebook">
        <div>
          <span className="eyebrow">A LITTLE SPACE FOR YOUR IDEAS</span>
          <h2 id="about-notebook">
            {t("درباره این دفتر", "About this notebook")}
          </h2>
          <p>{notebookCopy.about[language]}</p>
          <button
            className="text-link guide-open-button"
            onClick={() => setGuide(true)}
          >
            {t("راهنمای انتخاب سایز و برگ", "Size & sheet-count guide")}
            {arrow}
          </button>
        </div>
        <div className="product-specifications">
          <h2>{t("مشخصات دفتر", "Notebook specifications")}</h2>
          <dl>
            {[
              [t("کالکشن", "Collection"), t("گربه", "Cats")],
              [t("نوع محصول", "Product type"), t("دفتر طراحی", "Sketchbook")],
              [
                t("گرماژ کاغذ", "Paper weight"),
                t("۱۲۷ گرم — ثابت", "127 gsm — fixed"),
              ],
              [
                t("سایز انتخاب‌شده", "Selected size"),
                selection.size || t("انتخاب نشده", "Not selected"),
              ],
              [
                t("ابعاد نهایی", "Final dimensions"),
                t(
                  "در انتظار داده تأییدشده برند",
                  "Awaiting approved brand data",
                ),
              ],
              [
                t("تعداد برگ هر دفتر", "Sheets per notebook"),
                selection.sheets
                  ? `${number(Number(selection.sheets))} ${t("برگ", "sheets")}`
                  : "—",
              ],
              [
                t("نوع جلد", "Cover type"),
                covers.find((cover) => cover.value === selection.cover)?.label[
                  language
                ] || "—",
              ],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd dir="auto">{value}</dd>
              </div>
            ))}
          </dl>
          <small>
            {t(
              "گزینه‌ها نمونه‌اند. روش صحافی و چاپ داخل بدون داده تأییدشده اعلام نمی‌شوند.",
              "Options are examples. Binding and printed-side details require approved data.",
            )}
          </small>
        </div>
      </section>
      <section className="product-guide-strip">
        <div>
          <h2>
            {t(
              "برگ، صفحه و تعداد دفتر؛ سه مفهوم متفاوت",
              "Sheets, pages and notebooks: three different things",
            )}
          </h2>
          <p>
            {t(
              "۵۰ برگ یعنی ۱۰۰ صفحه؛ تعداد روی چاپ‌شده به مشخصات محصول بستگی دارد. سه دفترِ ۵۰ برگی، یعنی هر دفتر ۵۰ برگ دارد.",
              "50 sheets mean 100 pages; printed sides depend on product specifications. Three 50-sheet notebooks each contain 50 sheets.",
            )}
          </p>
        </div>
        <button className="button secondary" onClick={() => setGuide(true)}>
          {t("راهنمای انتخاب", "Selection guide")}
          {arrow}
        </button>
      </section>
      <section className="product-delivery">
        <h2>{t("ارسال و شرایط خرید", "Delivery and purchase conditions")}</h2>
        <p>
          {t(
            "هزینه و روش ارسال پس از انتخاب آدرس مشخص می‌شوند. شرایط مرجوعی این محصول پس از دریافت سیاست تأییدشده برند ارائه خواهد شد.",
            "Shipping options and cost are shown after you choose an address. Product-specific returns will be provided once the approved brand policy is available.",
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
      </section>
      {bundles.length > 0 && (
        <section className="product-related">
          <h2>
            {t(
              "این دفتر را در یک پکیج ببین",
              "Explore this notebook in a bundle",
            )}
          </h2>
          <div className="product-grid">
            {bundles.map((bundle) => {
              const option = itemOptions(bundle)
                .filter((o) => o.available)
                .sort((a, b) => a.price - b.price)[0]
              return (
                <BundleResultCard
                  key={bundle.id}
                  name={bundle.name[language]}
                  route={`/bundles/${bundle.slug}`}
                  collection={t("کالکشن گربه", "Cats collection")}
                  options=""
                  price={option?.price}
                  language={language}
                  media={
                    bundle.id === "cats-bundle" ? (
                      <BundleStillLife renderMedia={renderMedia} />
                    ) : (
                      renderMedia("sand", "book", true)
                    )
                  }
                  arrow={arrow}
                  heart={heart}
                  onNavigate={onNavigate}
                  bundleSummary={bundle.summary[language]}
                  saving={bundle.discount}
                />
              )
            })}
          </div>
        </section>
      )}
      <section className="product-related">
        <div className="product-related-heading">
          <h2>{t("از همین کالکشن", "More from this collection")}</h2>
          <a
            className="text-link"
            href="/collections/gorbe"
            onClick={go(
              t("همه محصولات گربه", "All Cats products"),
              "/collections/gorbe",
            )}
          >
            {t("همه محصولات گربه", "All Cats products")}
            {arrow}
          </a>
        </div>
        <div className="product-grid">
          {related.map((product) => (
            <ProductCard
              key={product.id}
              name={product.name[language]}
              route={`/products/${product.slug}`}
              collection={t("کالکشن گربه", "Cats collection")}
              options={[
                ...new Set(product.skus.map((s) => s.size).filter(Boolean)),
              ].join(" · ")}
              price={
                itemOptions(product)
                  .filter((o) => o.available)
                  .sort((a, b) => a.price - b.price)[0]?.price
              }
              language={language}
              media={renderMedia("sage", product.kind)}
              arrow={arrow}
              heart={heart}
              onNavigate={onNavigate}
              favorite={favorites.includes(product.id)}
              onFavorite={() => onFavorite(product.id)}
            />
          ))}
        </div>
      </section>
      {renderDialog(
        guide,
        () => setGuide(false),
        t("راهنمای انتخاب دفتر", "Notebook selection guide"),
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
              "این‌ها ابعاد اسمی استانداردند؛ اندازه نهایی برش محصول باید از اطلاعات تأییدشده برند بیاید.",
              "These are nominal standard dimensions. Final trimmed dimensions must come from approved product data.",
            )}
          </p>
          <h3>{t("برگ با صفحه فرق دارد", "Sheets and pages are different")}</h3>
          <p>
            {t(
              "۵۰ برگ یعنی ۱۰۰ صفحه؛ تعداد روی چاپ‌شده به مشخصات محصول بستگی دارد.",
              "50 sheets mean 100 pages; printed sides depend on product specifications.",
            )}
          </p>
          <h3>
            {t("تعداد دفتر مستقل است", "Notebook quantity is independent")}
          </h3>
          <p>
            {t(
              "A5، ۵۰ برگ و تعداد ۳ یعنی سه دفتر A5؛ هرکدام با ۵۰ برگ.",
              "A5, 50 sheets and quantity 3 means three A5 notebooks, each with 50 sheets.",
            )}
          </p>
          <a
            className="text-link"
            href="/guides/notebooks"
            onClick={(e) => {
              e.preventDefault()
              setGuide(false)
              onNavigate(
                t("راهنمای کامل", "Full notebook guide"),
                "/guides/notebooks",
              )
            }}
          >
            {t("راهنمای کامل انتخاب دفتر", "Full notebook buying guide")}
            {arrow}
          </a>
        </div>,
        "guide",
      )}
      {renderDialog(
        !!confirmation,
        () => setConfirmation(null),
        t("به سبد اضافه شد", "Added to your cart"),
        confirmation && (
          <div className="cart-confirmation">
            <span className="cart-demo-label">
              {t(
                "تأیید سبد نمایشی — بدون خرید واقعی",
                "Demo cart confirmation — no real purchase",
              )}
            </span>
            <div className="cart-confirmation-item">
              <div>{renderMedia("sage", "book")}</div>
              <div>
                <h3>{notebookCopy.name[language]}</h3>
                <p>{summary(confirmation.selection)}</p>
                <p>
                  {t("تعداد دفتر: ", "Number of notebooks: ")}
                  {number(confirmation.quantity)}
                </p>
                <strong>
                  {money(confirmation.quantity * confirmation.unitPrice)}
                </strong>
              </div>
            </div>
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
                "قیمت و موجودی پیش از پرداخت دوباره بررسی می‌شوند. این سبد نمایشی، موجودی را رزرو نمی‌کند.",
                "Price and stock will be checked again before payment. This demo cart does not reserve inventory.",
              )}
            </p>
          </div>
        ),
        "cart",
      )}
      {!quantityEditing && (
        <div className="mobile-buy-bar">
          <div>
            <small>
              {incomplete
                ? t("گزینه‌ها را انتخاب کنید", "Choose your options")
                : stock === 0
                  ? t("ناموجود", "Out of stock")
                  : t("مبلغ این انتخاب", "Selection total")}
            </small>
            <strong>
              {ready && qtyNumber > 0 && stock > 0
                ? money(price! * qtyNumber)
                : "—"}
            </strong>
          </div>
          <button
            className="button primary"
            disabled={!canAdd}
            onClick={() => beginAdd()}
          >
            {adding
              ? t("در حال افزودن…", "Adding…")
              : editing
                ? t("ذخیره تغییرات", "Save changes")
                : t("افزودن به سبد", "Add to cart")}
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

// Product detail uses the original gallery and layout with published database content.
export function PublishedProductDetail({ catalog, language, collections, onNavigate, renderDialog = () => null, relatedProducts = [] }: {
  catalog: import("../features/catalog/product-detail").ProductDetail;
  language: 0 | 1; collections: import("./data").Collection[];
  onNavigate: (name: string, route: string) => void;
  renderDialog?: ProductDialog;
  relatedProducts?: import("./catalog").CatalogProduct[];
}) {
  const t = (fa: string, en: string) => language === 0 ? fa : en;
  const local = (copy: {fa:string;en:string}) => language === 0 ? copy.fa : copy.en;
  const [selected,setSelected] = useState("");
  const [shareMessage,setShareMessage] = useState("");
  const product = catalog.product;
  const sku = catalog.skus.find(row=>row.id === selected);
  const root = `/${language === 0 ? "fa" : "en"}`;
  const go = (event: React.MouseEvent<HTMLAnchorElement>, name: string, route: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onNavigate(name,route);
  };
  if (catalog.status === "loading") return <div className="container product-detail-page" aria-busy="true"><h1 className="sr-only">{t("بارگذاری محصول", "Loading product")}</h1><div className="product-main-layout"><div className="skeleton product-gallery-skeleton"/><div className="product-loading-info">{Array.from({length:8},(_,i)=><div key={i} className="skeleton skeleton-line"/>)}</div></div></div>;
  if (catalog.status !== "normal" || !product) return <div className="container product-detail-page"><section className="collections-state" role={catalog.status === "error" ? "alert" : undefined}><h1>{catalog.status === "not-found" ? t("این محصول پیدا نشد.","Product not found.") : t("دریافت محصول ممکن نشد.","Unable to load product.")}</h1>{catalog.status === "error" && <button className="button secondary" onClick={catalog.retry}>{t("دوباره تلاش کنید","Try again")}</button>}<a href={`${root}/shop`} className="button primary" onClick={e=>go(e,t("فروشگاه","Shop"),`${root}/shop`)}>{t("مشاهده فروشگاه","Browse shop")}</a></section></div>;
  const name = t(product.title_fa,product.title_en);
  const content = product.presentation;
  const memberships = collections.filter(row=>product.collection_ids.includes(row.id));
  const related = relatedProducts.filter(row=>row.slug !== product.slug && memberships.some(collection=>row.collections.includes(collection.slug))).slice(0,4);
  const amount = sku?.price?.amount;
  const exactPrice = amount ? (language === 0 ? amount.replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)]) : amount) : "";
  const price = sku?.price ? `${exactPrice} ${sku.price.currency === "IRT" ? t("تومان","toman") : t("ریال","rial")}` : t("قیمت در دسترس نیست","Price unavailable");
  const media = content ? <Mockup color={content.color} kind={content.kind} /> : <ReferenceProductImage slug={product.slug} language={language} />;
  const optionLabel = (code:string) => content?.option_labels?.[code] ? local(content.option_labels[code]) : code;
  const images = content?.gallery.map(image=>({label:[image.label.fa,image.label.en] as [string,string],view:image.view})) || [{label:["نمای روبرو","Front view"] as [string,string],view:"front"}];
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setShareMessage(t("لینک محصول کپی شد.","Product link copied.")); }
    catch { setShareMessage(t("کپی لینک ممکن نشد؛ لینک را از نوار آدرس کپی کنید.","Unable to copy; copy the link from the address bar.")); }
  };
  return <div className="container product-detail-page">
    <nav className="breadcrumb detail-breadcrumb" aria-label={t("مسیر صفحه","Breadcrumb")}>
      <a href={root} onClick={e=>go(e,t("خانه","Home"),root)}>{t("خانه","Home")}</a><span>/</span>
      <a href={`${root}/collections`} onClick={e=>go(e,t("کالکشن‌ها","Collections"),`${root}/collections`)}>{t("کالکشن‌ها","Collections")}</a><span>/</span>
      {memberships[0] && <><a href={`${root}/collections/${memberships[0].slug}`} onClick={e=>go(e,memberships[0].name[language],`${root}/collections/${memberships[0].slug}`)}>{memberships[0].name[language]}</a><span>/</span></>}
      <span aria-current="page">{name}</span>
    </nav>
    <section className="product-main-layout">
      <ProductGallery key={product.id} language={language} media={media} images={images} productName={name} renderDialog={renderDialog} renderView={content?.kind !== "book" ? ()=>media : undefined} />
      <div className="product-purchase-panel">
        <div className="product-intro-top">{memberships.length ? memberships.map(row=><a key={row.id} className="eyebrow" href={`${root}/collections/${encodeURIComponent(row.slug)}`} onClick={e=>go(e,row.name[language],`${root}/collections/${encodeURIComponent(row.slug)}`)}>{row.name[language]}</a>) : <span className="eyebrow">NILART STUDIO</span>}<div>
          <button className="icon-button" disabled aria-label={t("ذخیره در علاقه‌مندی‌ها","Save to favorites")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></button>
          <button className="icon-button" onClick={share} aria-label={t("اشتراک‌گذاری لینک","Share product link")}><ShareIcon/></button>
        </div></div>
        <h1>{name}</h1><p className="product-intro">{content ? local(content.intro) : t(product.description_fa,product.description_en)}</p>
        {shareMessage && <p className="product-feedback" role="status">{shareMessage}</p>}
        <section className="product-option-groups" aria-labelledby="published-product-options"><h2 id="published-product-options" className="sr-only">{t("گزینه‌های منتشرشده","Published options")}</h2>{catalog.skus.length ? <fieldset className="product-option-group"><legend>{t("گزینه محصول","Product option")}</legend><div className="product-radio-grid">{catalog.skus.map(row=><label className={`product-radio ${selected === row.id ? "selected" : ""}`} key={row.id}><input type="radio" name="published-sku" value={row.id} checked={selected===row.id} onChange={()=>setSelected(row.id)}/><span className="radio-title"><bdi>{optionLabel(row.code)}</bdi></span></label>)}</div></fieldset> : <p className="product-stock-state">{t("هنوز گزینه‌ای منتشر نشده است.","No published options yet.")}</p>}</section>
        <div className="selection-summary" aria-live="polite">{sku ? optionLabel(sku.code) : t("گزینه محصول را انتخاب کنید.","Choose a product option.")}</div>
        <div className="quantity-section"><label htmlFor="published-product-quantity">{t("تعداد محصول","Quantity")}</label><div className="quantity-stepper"><button disabled aria-label={t("کم‌کردن تعداد","Decrease quantity")}>−</button><input id="published-product-quantity" value={language === 0 ? "۱" : "1"} disabled readOnly/><button disabled aria-label={t("افزایش تعداد","Increase quantity")}>+</button></div><p>{t("موجودی تأیید نشده","Stock unconfirmed")}</p></div>
        <div className="product-price-summary" role="status"><div className="unit-price"><span>{t("قیمت هر محصول","Unit price")}</span><strong>{price}</strong></div></div>
        <button className="button primary product-add-button" disabled><BagIcon/>{t("اطلاعات خرید تأیید نشده","Purchase details unconfirmed")}</button><p className="product-reservation-note">{t("نمایش گزینه و قیمت، موجودی یا امکان خرید را تأیید نمی‌کند.","An option and price do not confirm stock or purchase eligibility.")}</p>
      </div>
    </section>
    <section className="product-information" aria-labelledby="published-product-about"><div><span className="eyebrow">A LITTLE SPACE FOR YOUR IDEAS</span><h2 id="published-product-about">{t("درباره محصول","About this product")}</h2><p>{content ? local(content.about) : t(product.description_fa,product.description_en)}</p></div><div className="product-specifications"><h2>{t("مشخصات محصول","Product specifications")}</h2><dl>{(content?.specifications || []).map((fact,index)=><div key={index}><dt>{local(fact.label)}</dt><dd dir="auto">{local(fact.value)}</dd></div>)}<div><dt>{t("گزینه انتخاب‌شده","Selected option")}</dt><dd dir="auto">{sku ? optionLabel(sku.code) : t("انتخاب نشده","Not selected")}</dd></div></dl><small>{t("مشخصات نهایی پس از تأیید برند ارائه می‌شود.","Final specifications await brand approval.")}</small></div></section>
    <section className="product-delivery"><h2>{t("ارسال و شرایط خرید","Delivery and purchase conditions")}</h2><p>{content ? local(content.delivery) : t("هزینه و روش ارسال و شرایط مرجوعی در انتظار تأیید است.","Shipping and return conditions await confirmation.")}</p><a className="text-link" href={`${root}/returns`} onClick={e=>go(e,t("شرایط لغو و مرجوعی","Cancellation and return policy"),`${root}/returns`)}>{t("شرایط لغو و مرجوعی","Cancellation and return policy")} ↗</a></section>
    {related.length > 0 && <section className="product-related"><div className="product-related-heading"><h2>{t("از همین کالکشن","More from this collection")}</h2><a className="text-link" href={`${root}/collections/${memberships[0].slug}`} onClick={e=>go(e,memberships[0].name[language],`${root}/collections/${memberships[0].slug}`)}>{t("مشاهده کالکشن","Explore collection")} ↗</a></div><div className="product-grid">{related.map(row=><ProductCard live key={row.id} name={row.name[language]} route={`${root}/products/${row.slug}`} collection={memberships.find(collection=>row.collections.includes(collection.slug))?.name[language] || ""} options="" language={language} media={<ReferenceProductImage slug={row.slug} language={language}/>} arrow={<span aria-hidden="true">↗</span>} heart={null} onNavigate={onNavigate} priceUnavailableLabel={t("قیمت در دسترس نیست","Price unavailable")} availabilityLabel={t("اطلاعات خرید تأیید نشده","Purchase details unconfirmed")}/>)}</div></section>}
  </div>;
}
