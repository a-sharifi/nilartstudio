import { useEffect, useRef, useState, type ReactNode } from "react"
import CartRow from "./CartRow"
import {
  cartTotals,
  evaluateCart,
  evaluateCoupon,
  type CartSnapshot,
  type EvaluatedLine,
  type ShoppingLine,
} from "./cart"

interface Props {
  snapshot: CartSnapshot
  mode: string
  language: 0 | 1
  couponCode: string
  onCoupon: (code: string) => void
  onQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  undoItem: ShoppingLine | null
  onUndo: () => void
  onAcceptPrice: (row: EvaluatedLine) => void
  onEdit: (id: string) => void
  onDemo: () => void
  onRetry: () => void
  onNavigate: (name: string, route: string) => void
  renderMedia: (color: string, kind: string, hero?: boolean) => ReactNode
  arrow: ReactNode
}
export default function CartPage({
  snapshot,
  mode,
  language,
  couponCode,
  onCoupon,
  onQuantity,
  onRemove,
  undoItem,
  onUndo,
  onAcceptPrice,
  onEdit,
  onDemo,
  onRetry,
  onNavigate,
  renderMedia,
  arrow,
}: Props) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const number = (value: number) =>
    value.toLocaleString(language === 0 ? "fa-IR" : "en-US")
  const money = (value: number) => `${number(value)} ${t("تومان", "toman")}`
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [couponInput, setCouponInput] = useState(couponCode)
  const [couponChecking, setCouponChecking] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [checking, setChecking] = useState(false)
  const [editingCode, setEditingCode] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState("")
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const couponTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkingRef = useRef(false)
  const couponBusyRef = useRef(false)
  const quantityFailed = useRef(false)
  const current = useRef({ snapshot, mode, couponCode })
  current.current = { snapshot, mode, couponCode }
  const titleRef = useRef<HTMLHeadingElement>(null)
  const undoRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (undoItem) undoRef.current?.focus({ preventScroll: true })
  }, [undoItem])
  const rows = evaluateCart(snapshot, mode)
  const stacking = mode === "stacking"
  const coupon = evaluateCoupon(rows, couponCode, stacking)
  const totals = cartTotals(rows, coupon)
  const ready = rows.filter((row) => !row.issue)
  const attention = rows.filter((row) => row.issue && row.issue !== "pending")
  const awaiting = rows.filter((row) => row.issue === "pending")
  const offline = mode === "offline"
  const updating = Object.values(pending).some(Boolean)
  const canCheckout =
    totals.readyCount > 0 &&
    !offline &&
    !updating &&
    !couponChecking &&
    !checking &&
    !coupon.error
  const couponMessages = {
    invalid: t("کد نامعتبر است.", "Invalid code."),
    expired: t("کد منقضی شده است.", "Code expired."),
    minimum: t(
      "حداقل خرید واجد شرایط تأمین نشده است. مبلغ واجد شرایط: ",
      "Minimum eligible spend was not met. Eligible amount: ",
    ),
    ineligible: t(
      "هیچ قلم آماده و واجد شرایطی برای این کد وجود ندارد.",
      "No ready eligible items for this code.",
    ),
    usage: t("سقف مصرف این کد تکمیل شده است.", "Usage limit reached."),
  }
  const couponMessage = (result: typeof coupon) =>
    result.error
      ? couponMessages[result.error] +
        (result.error === "minimum"
          ? `${money(result.eligibleSubtotal)} / ${t("حداقل", "minimum")} ${money(result.minimum)}`
          : "")
      : ""
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
  }, [])
  useEffect(() => {
    for (const timer of timers.current.values()) clearTimeout(timer)
    timers.current.clear()
    if (couponTimer.current) clearTimeout(couponTimer.current)
    if (checkoutTimer.current) clearTimeout(checkoutTimer.current)
    setPending({})
    setChecking(false)
    setCouponChecking(false)
    checkingRef.current = false
    couponBusyRef.current = false
    quantityFailed.current = false
    setErrors({})
    setCouponError("")
    setCheckoutMessage("")
    return () => {
      for (const timer of timers.current.values()) clearTimeout(timer)
      if (couponTimer.current) clearTimeout(couponTimer.current)
      if (checkoutTimer.current) clearTimeout(checkoutTimer.current)
    }
  }, [mode])
  const updateQuantity = (id: string, quantity: number) => {
    if (offline || timers.current.has(id)) return
    setPending((previous) => ({ ...previous, [id]: true }))
    setErrors((previous) => ({ ...previous, [id]: "" }))
    const timer = setTimeout(() => {
      timers.current.delete(id)
      if (mode === "quantity-error" && !quantityFailed.current) {
        quantityFailed.current = true
        setErrors((previous) => ({
          ...previous,
          [id]: t(
            "تغییر تعداد تأیید نشد؛ مقدار قبلی حفظ شد. دوباره تلاش کنید.",
            "Quantity wasn't confirmed. The previous value is restored. Try again.",
          ),
        }))
      } else onQuantity(id, quantity)
      setPending((previous) => ({ ...previous, [id]: false }))
    }, 500)
    timers.current.set(id, timer)
  }
  const applyCode = (event: React.FormEvent) => {
    event.preventDefault()
    if (couponBusyRef.current || offline || updating) return
    couponBusyRef.current = true
    setCouponChecking(true)
    setCouponError("")
    const code = couponInput.trim().toUpperCase()
    couponTimer.current = setTimeout(() => {
      const latest = evaluateCoupon(
        evaluateCart(current.current.snapshot, current.current.mode),
        code,
        current.current.mode === "stacking",
      )
      if (!code) setCouponError(t("کد را وارد کنید.", "Enter a code."))
      else if (latest.error) setCouponError(couponMessage(latest))
      else onCoupon(code)
      couponBusyRef.current = false
      setCouponChecking(false)
    }, 550)
  }
  const checkout = () => {
    if (
      !canCheckout ||
      checkingRef.current ||
      timers.current.size ||
      couponBusyRef.current
    )
      return
    const selectedIds = new Set(totals.readyIds)
    const previousVersion = JSON.stringify(
      ready.map((row) => [row.line.id, row.currentPrice, row.quantity]),
    )
    checkingRef.current = true
    setChecking(true)
    setCheckoutMessage("")
    checkoutTimer.current = setTimeout(() => {
      const latestRows = evaluateCart(
        current.current.snapshot,
        current.current.mode,
      ).filter((row) => selectedIds.has(row.line.id))
      const latestCoupon = evaluateCoupon(
        latestRows,
        current.current.couponCode,
        current.current.mode === "stacking",
      )
      const latestTotals = cartTotals(latestRows, latestCoupon)
      setChecking(false)
      checkingRef.current = false
      if (
        current.current.mode === "offline" ||
        timers.current.size ||
        couponBusyRef.current ||
        latestCoupon.error ||
        latestTotals.readyCount !== selectedIds.size ||
        current.current.couponCode !== couponCode ||
        JSON.stringify(
          latestRows.map((row) => [
            row.line.id,
            row.currentPrice,
            row.quantity,
          ]),
        ) !== previousVersion
      ) {
        setCheckoutMessage(
          t(
            "سبد تغییر کرده است؛ اقلام آماده و مبلغ را دوباره بررسی کنید.",
            "Your cart changed. Please review ready items and amounts again.",
          ),
        )
        return
      }
      onNavigate(
        t(
          "Checkout اقلام آماده — مقصد نمونه",
          "Ready-items checkout — prototype destination",
        ),
        `/checkout?items=${encodeURIComponent(latestTotals.readyIds.join(","))}`,
      )
    }, 650)
  }
  const link = (name: string, route: string, className = "text-link") => (
    <a
      href={route}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return
        event.preventDefault()
        onNavigate(name, route)
      }}
    >
      {name}
      {arrow}
    </a>
  )
  const acceptPrice = (row: EvaluatedLine) => {
    onAcceptPrice(row)
    requestAnimationFrame(() =>
      document
        .getElementById(`cart-row-${row.line.id}`)
        ?.focus({ preventScroll: true }),
    )
  }
  const renderRow = (row: EvaluatedLine) => (
    <CartRow
      key={row.line.id}
      row={row}
      language={language}
      coupon={coupon}
      stacking={stacking}
      busy={!!pending[row.line.id]}
      error={errors[row.line.id]}
      expanded={mode === "expanded" || mode === "bundle-unavailable"}
      offline={offline || checking}
      onQuantity={updateQuantity}
      onRemove={onRemove}
      onEdit={onEdit}
      onAcceptPrice={acceptPrice}
      onNavigate={onNavigate}
      renderMedia={renderMedia}
      arrow={arrow}
    />
  )
  const cta = checking
    ? t("در حال بررسی…", "Checking…")
    : totals.excludedCount > 0
      ? t("ادامه با اقلام آماده", "Continue with ready items")
      : t("ادامه خرید و پرداخت", "Continue to checkout")
  return (
    <div className="container shopping-cart-page">
      <nav className="breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        {link(t("خانه", "Home"), "/")}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t("سبد خرید", "Shopping cart")}</span>
      </nav>
      <div className="cart-page-heading">
        <div>
          <span className="eyebrow">YOUR LITTLE WORLD OF ART</span>
          <h1 ref={titleRef} tabIndex={-1}>
            {t("سبد خرید", "Shopping cart")}
          </h1>
          {rows.length > 0 && (
            <p>
              {number(rows.length)} {t("قلم در سبد", "cart lines")}{" "}
              <span>·</span> {number(totals.readyCount)}{" "}
              {t("آماده پرداخت", "ready to check out")}
            </p>
          )}
        </div>
        {link(t("ادامه خرید", "Continue shopping"), "/shop")}
      </div>
      <p className="cart-demo-disclaimer">
        {t(
          "سبد نمایشی نیل‌آرت — بدون اتصال به پرداخت، سرور یا رزرو واقعی.",
          "NilArt demo cart — no payment, backend or real stock reservation.",
        )}
      </p>
      {mode === "loading" ? (
        <div className="cart-layout" aria-busy="true">
          <div>
            {[0, 1, 2].map((index) => (
              <div key={index} className="skeleton cart-row-skeleton" />
            ))}
          </div>
          <div className="skeleton cart-summary-skeleton" />
        </div>
      ) : mode === "load-error" ? (
        <section className="collections-state">
          <h2 role="alert">
            {t("بارگذاری سبد انجام نشد.", "We couldn't load your cart.")}
          </h2>
          <p>
            {t(
              "این خطا به معنی خالی‌بودن سبد نیست.",
              "This error doesn't mean your cart is empty.",
            )}
          </p>
          <button className="button primary" onClick={onRetry}>
            {t("دوباره تلاش کنید", "Try again")}
          </button>
          {link(t("مشاهده فروشگاه", "Browse the shop"), "/shop")}
        </section>
      ) : rows.length === 0 ? (
        <section className="cart-empty">
          <div className="cart-empty-art" aria-hidden="true">
            <BagArt />
          </div>
          <h2>{t("سبد خریدت هنوز خالی است.", "Your cart is empty.")}</h2>
          <p>
            {t(
              "کالکشن محبوبت را پیدا کن یا محصولات فروشگاه را ببین.",
              "Find your favorite collection or browse the shop.",
            )}
          </p>
          <div>
            {link(
              t("کشف کالکشن‌ها", "Explore collections"),
              "/collections",
              "button primary",
            )}
            {link(
              t("مشاهده فروشگاه", "Browse the shop"),
              "/shop",
              "button secondary",
            )}
          </div>
          <button className="cart-load-demo" onClick={onDemo}>
            {t(
              "مشاهده نمونه سبد مختلط — داده نمایشی",
              "Preview a mixed cart — demo data",
            )}
          </button>
        </section>
      ) : (
        <>
          <div className="cart-reservation-message">
            <InfoIcon />
            <p>
              {t(
                "اقلام سبد هنوز رزرو نشده‌اند؛ قیمت و موجودی پیش از پرداخت دوباره بررسی می‌شوند.",
                "Items in your cart aren't reserved yet. Price and stock will be checked again before payment.",
              )}
            </p>
          </div>
          {offline && (
            <div className="cart-offline-message" role="alert">
              {t(
                "اتصال برقرار نیست؛ تغییرات هنوز تأیید نشده‌اند.",
                "You're offline; your changes haven't been confirmed.",
              )}
              <button className="filter-clear" onClick={onRetry}>
                {t("تلاش برای اتصال دوباره", "Try reconnecting")}
              </button>
            </div>
          )}
          <div className="cart-layout">
            <div className="cart-items-column">
              {ready.length > 0 && (
                <section className="cart-group">
                  <div className="cart-group-heading">
                    <h2>{t("اقلام آماده پرداخت", "Ready to check out")}</h2>
                    <span>
                      {number(ready.length)} {t("قلم", "items")}
                    </span>
                  </div>
                  {ready.map(renderRow)}
                </section>
              )}
              {attention.length > 0 && (
                <section className="cart-group">
                  <div className="cart-group-heading attention">
                    <h2>{t("نیازمند اصلاح", "Needs attention")}</h2>
                    <span>
                      {number(attention.length)}{" "}
                      {t(
                        "قلم · خارج از مبلغ آماده",
                        "items · excluded from ready total",
                      )}
                    </span>
                  </div>
                  {attention.map(renderRow)}
                </section>
              )}
              {awaiting.length > 0 && (
                <section className="cart-group">
                  <div className="cart-group-heading awaiting">
                    <h2>{t("در انتظار بررسی", "Awaiting review")}</h2>
                    <span>
                      {number(awaiting.length)} {t("درخواست", "requests")}
                    </span>
                  </div>
                  {awaiting.map(renderRow)}
                  {ready.length > 0 && (
                    <p className="cart-pending-guidance">
                      {t(
                        "می‌توانید خرید اقلام آماده را بدون انتظار برای این سفارش ادامه دهید. درخواست منتظر بررسی در سبد باقی می‌ماند.",
                        "You can check out ready items without waiting for this commission. The pending request will remain in your cart.",
                      )}
                    </p>
                  )}
                </section>
              )}
              <div className="cart-shopping-links">
                {link(t("ادامه خرید", "Continue shopping"), "/shop")}
                {link(t("کشف کالکشن‌ها", "Explore collections"), "/collections")}
              </div>
            </div>
            <aside className="cart-summary-column">
              <section className="cart-coupon">
                <h2>{t("کد تخفیف دارید؟", "Have a discount code?")}</h2>
                <form onSubmit={applyCode}>
                  <label htmlFor="cart-coupon-input">
                    {t("کد تخفیف", "Discount code")}
                  </label>
                  <div className="cart-coupon-input">
                    <input
                      id="cart-coupon-input"
                      dir="ltr"
                      autoComplete="off"
                      value={couponInput}
                      onChange={(event) => {
                        setCouponInput(event.target.value)
                        setCouponError("")
                      }}
                      onFocus={() => setEditingCode(true)}
                      onBlur={() => setEditingCode(false)}
                      placeholder="NILART10"
                      disabled={offline || couponChecking}
                      aria-invalid={!!couponError || !!coupon.error}
                      aria-describedby={
                        couponError || coupon.error
                          ? "cart-code-error"
                          : "cart-code-demo"
                      }
                    />
                    <button
                      className="button secondary"
                      type="submit"
                      disabled={offline || couponChecking || updating}
                      aria-busy={couponChecking}
                    >
                      {couponChecking
                        ? t("در حال بررسی…", "Checking…")
                        : t("اعمال کد", "Apply code")}
                    </button>
                  </div>
                </form>
                <p id="cart-code-demo" className="coupon-demo-note">
                  {t(
                    "کد نمونه NILART10 فقط برای تست رابط است.",
                    "NILART10 is a demo code for testing this interface.",
                  )}
                </p>
                <p className="coupon-demo-note">
                  {t(
                    "اعمال کد، مصرف نهایی آن نیست؛ اعتبار و محدودیت مصرف هنگام پرداخت دوباره بررسی می‌شوند.",
                    "Applying a code doesn't redeem it. Eligibility and usage limits are checked again before payment.",
                  )}
                </p>
                {couponError || coupon.error ? (
                  <p
                    id="cart-code-error"
                    className="cart-field-error"
                    role="alert"
                  >
                    {couponError || couponMessage(coupon)}
                  </p>
                ) : null}
                {couponCode && (
                  <div className="cart-applied-code">
                    <div>
                      <span dir="ltr">{couponCode}</span>
                      <button
                        className="filter-clear"
                        onClick={() => {
                          onCoupon("")
                          setCouponInput("")
                          setCouponError("")
                        }}
                      >
                        {t("حذف کد", "Remove code")}
                      </button>
                    </div>
                    {!coupon.error && (
                      <p role="status">
                        {stacking
                          ? t(
                              "جمع تخفیف در این variant نمایشی مجاز است؛ کد روی مبلغ پکیج پس از تخفیف اعمال شد.",
                              "Stacking is enabled in this demo variant; the code applies after the bundle discount.",
                            )
                          : t(
                              "این کد روی اقلام مجاز اعمال شد؛ پکیج شامل تخفیف جداگانه است.",
                              "The code was applied to eligible items; the bundle has its own discount.",
                            )}
                      </p>
                    )}
                  </div>
                )}
              </section>
              <section
                className="cart-order-summary"
                aria-busy={updating}
                aria-labelledby="ready-summary-title"
              >
                <div className="eyebrow">A FEW LOVELY THINGS, TOGETHER</div>
                <h2 id="ready-summary-title">
                  {t("خلاصه اقلام آماده", "Ready items summary")}
                </h2>
                <div className="cart-summary-rows">
                  <div>
                    <span>
                      {t(
                        "مجموع قبل از تخفیف",
                        "Items subtotal before discounts",
                      )}
                    </span>
                    <strong>{updating ? "…" : money(totals.base)}</strong>
                  </div>
                  <div>
                    <span>{t("تخفیف پکیج", "Bundle discount")}</span>
                    <strong className="cart-discount">
                      {updating ? "…" : `− ${money(totals.bundleDiscount)}`}
                    </strong>
                  </div>
                  <div>
                    <span>{t("تخفیف کد", "Code discount")}</span>
                    <strong className="cart-discount">
                      {updating ? "…" : `− ${money(totals.codeDiscount)}`}
                    </strong>
                  </div>
                </div>
                <div className="cart-summary-total" aria-live="polite">
                  <span>{t("جمع اقلام آماده", "Ready items total")}</span>
                  <strong>
                    {updating
                      ? t("در حال به‌روزرسانی…", "Updating…")
                      : money(totals.total)}
                  </strong>
                </div>
                <dl className="cart-checkout-costs">
                  <div>
                    <dt>{t("ارسال", "Shipping")}</dt>
                    <dd>
                      {t("در checkout محاسبه می‌شود", "Calculated at checkout")}
                    </dd>
                  </div>
                </dl>
                <p className="cart-not-final-note">
                  {t(
                    "این مبلغ بدون هزینه نامشخص ارسال است؛ مبلغ نهایی پرداخت نیست. در این نمونه تنظیم مالیات فعالی ارائه نشده است.",
                    "This excludes unknown shipping costs, so it isn't the final payment amount. No active tax configuration was supplied for this demo.",
                  )}
                </p>
                {totals.excludedCount > 0 && (
                  <p className="cart-excluded-count">
                    {number(totals.excludedCount)}{" "}
                    {t(
                      "قلم منتظر بررسی یا اصلاح، در این جمع نیستند.",
                      "items awaiting review or correction are excluded.",
                    )}
                  </p>
                )}
                <button
                  className="button primary cart-checkout-button"
                  disabled={!canCheckout}
                  onClick={checkout}
                  aria-busy={checking}
                >
                  {cta}
                  {arrow}
                </button>
                {checkoutMessage && (
                  <p className="cart-field-error" role="alert">
                    {checkoutMessage}
                  </p>
                )}
                <p className="cart-checkout-helper">
                  {!totals.readyCount
                    ? t(
                        "قلم آماده‌ای برای پرداخت نداریم؛ درخواست را پیگیری یا انتخاب‌ها را اصلاح کنید.",
                        "No ready items to pay for. View your request or correct your selections.",
                      )
                    : coupon.error
                      ? t(
                          "کد را اصلاح یا حذف کنید تا ادامه دهید.",
                          "Correct or remove the code to continue.",
                        )
                      : offline
                        ? t(
                            "ادامه نیازمند اتصال و بررسی دوباره است.",
                            "Reconnect and revalidate to continue.",
                          )
                        : t(
                            "مهمان می‌تواند ادامه دهد؛ احراز هویت و تأیید شماره پیش از پرداخت، در checkout انجام می‌شود.",
                            "Guests can continue. Authentication and phone verification happen in checkout before payment.",
                          )}
                </p>
                {!totals.readyCount &&
                  awaiting[0] &&
                  link(
                    t("پیگیری درخواست", "View request"),
                    `/commissions/${
                      awaiting[0].line.kind === "commission"
                        ? awaiting[0].line.data.id
                        : "demo-request"
                    }`,
                  )}
              </section>
            </aside>
          </div>
          {!editingCode && (
            <div className="mobile-buy-bar cart-mobile-buy">
              <div>
                <small>
                  {t(
                    "اقلام آماده · بدون ارسال",
                    "Ready items · excl. shipping",
                  )}
                </small>
                <strong>{updating ? "…" : money(totals.total)}</strong>
              </div>
              <button
                className="button primary"
                disabled={!canCheckout}
                onClick={checkout}
              >
                {checking
                  ? t("در حال بررسی…", "Checking…")
                  : t("ادامه", "Continue")}
              </button>
            </div>
          )}
        </>
      )}
      {undoItem && (
        <div className="cart-undo-toast" role="status">
          <div>
            <span>{t("از سبد حذف شد.", "Removed from cart.")}</span>
            {undoItem.kind === "commission" && (
              <small>
                {t(
                  "حذف از سبد، درخواست ثبت‌شده را لغو نمی‌کند.",
                  "Removing it from the cart doesn't cancel the registered request.",
                )}
              </small>
            )}
          </div>
          <button
            ref={undoRef}
            onClick={() => {
              const id = undoItem.id
              onUndo()
              requestAnimationFrame(() =>
                document
                  .getElementById(`cart-row-${id}`)
                  ?.focus({ preventScroll: true }),
              )
            }}
          >
            {t("بازگردانی", "Undo")}
          </button>
        </div>
      )}
    </div>
  )
}
function InfoIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v7M12 6v1" />
    </svg>
  )
}
function BagArt() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M23 30h50l5 48H18l5-48Z"
        fill="#e6eadc"
        stroke="#839379"
        strokeWidth="1.5"
      />
      <path
        d="M34 33V23a14 14 0 0 1 28 0v10"
        stroke="#839379"
        strokeWidth="1.5"
      />
      <path
        d="M37 61q11-26 25-15M47 52l-8-9"
        stroke="#a44a32"
        strokeWidth="1.5"
      />
      <circle cx="61" cy="45" r="7" fill="#c99778" />
    </svg>
  )
}
