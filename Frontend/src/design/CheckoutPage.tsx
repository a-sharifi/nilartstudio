import CheckoutAmounts from "./CheckoutAmounts"
import { useEffect, useRef, useState, type ReactNode } from "react"
import CheckoutAuth from "./CheckoutAuth"
import CartRow from "./CartRow"
import {
  checkoutAmounts,
  checkoutRows,
  physicalCheckout,
  safeCheckoutReturn,
  type CheckoutSession,
} from "./checkout"
import { evaluateCart, type CartSnapshot, type EvaluatedLine } from "./cart"
import type { ProductDialog } from "./ProductGallery"

interface MergeNotice {
  candidate: CartSnapshot
  changes: number
  conflicts: number
}
interface Props {
  language: 0 | 1
  onLanguage: () => void
  snapshot: CartSnapshot
  selectedIds: string[] | null
  cartMode: string
  couponCode: string
  session: CheckoutSession
  mode: string
  onMode: (mode: string) => void
  onDemo: (mode: string) => void
  onSession: (session: CheckoutSession) => void
  mergeNotice: MergeNotice | null
  onKeepGuest: () => void
  onReviewMerged: () => void
  onAcceptPrice: (row: EvaluatedLine) => void
  onNavigate: (name: string, route: string) => void
  renderMedia: (color: string, kind: string, hero?: boolean) => ReactNode
  renderDialog: ProductDialog
  arrow: ReactNode
  acceptedTermsVersion?: string | null
  onTermsAccepted?: (version: string | null) => void
}
export default function CheckoutPage({
  language,
  onLanguage,
  snapshot,
  selectedIds,
  cartMode,
  couponCode,
  session,
  mode,
  onMode,
  onDemo,
  onSession,
  mergeNotice,
  onKeepGuest,
  onReviewMerged,
  onAcceptPrice,
  onNavigate,
  renderMedia,
  renderDialog,
  arrow,
  acceptedTermsVersion,
  onTermsAccepted,
}: Props) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const money = (amount: number) =>
    `${amount.toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("تومان", "toman")}`
  const [fallbackIds] = useState(() =>
    evaluateCart(snapshot, cartMode)
      .filter((row) => !row.issue)
      .map((row) => row.line.id),
  )
  const ids = selectedIds ?? fallbackIds
  const rows = checkoutRows(snapshot, ids, cartMode)
  const { coupon, totals } = checkoutAmounts(
    rows,
    couponCode,
    cartMode === "stacking",
  )
  const hasPhysical = rows.length === 0 || physicalCheckout(rows)
  const issues = rows.filter((row) => row.issue)
  const missing = ids.length - rows.length
  const outside = evaluateCart(snapshot, cartMode).filter(
    (row) => !ids.includes(row.line.id),
  ).length
  const expired = session.status === "expired"
  const privateReview =
    session.status !== "verified" &&
    rows.some(
      (row) => row.line.kind === "commission" || row.line.kind === "artwork",
    )
  const [checking, setChecking] = useState(false)
  const [keyboard, setKeyboard] = useState(false)
  const [terms, setTerms] = useState(acceptedTermsVersion === "DEMO-CHECKOUT-V1")
  const [states, setStates] = useState(false)
  const [continueError, setContinueError] = useState("")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)
  const title = useRef<HTMLHeadingElement>(null)
  const current = useRef({
    snapshot,
    ids,
    cartMode,
    couponCode,
    session,
    mergeNotice,
    terms,
    needTerms: mode === "terms-required",
  })
  current.current = {
    snapshot,
    ids,
    cartMode,
    couponCode,
    session,
    mergeNotice,
    terms,
    needTerms: mode === "terms-required",
  }
  const needTerms = mode === "terms-required"
  const offline = mode === "offline"
  const blocked =
    !rows.length ||
    issues.length > 0 ||
    missing > 0 ||
    !!coupon.error ||
    !!mergeNotice
  const canContinue =
    session.status === "verified" &&
    !blocked &&
    !offline &&
    !checking &&
    (!needTerms || terms)
  const reason = offline
    ? t(
        "اتصال برقرار نیست؛ اطلاعات باید دوباره بررسی شوند.",
        "You're offline. Information must be checked again.",
      )
    : session.status !== "verified"
      ? t(
          "حساب و شماره تلفن را برای ادامه تأیید کنید.",
          "Confirm your account and phone to continue.",
        )
      : mergeNotice
        ? t(
            "تغییرات ترکیب سبد را ابتدا بررسی کنید.",
            "Review cart merge changes first.",
          )
        : blocked
          ? t(
              "تمام اقلام انتخاب‌شده و کد باید معتبر باشند؛ تأیید تغییر یا اصلاح سبد لازم است.",
              "All selected items and the code must be valid. Accept changes or update the cart.",
            )
          : needTerms && !terms
            ? t(
                "پذیرش شرایط نمونه این checkout لازم است.",
                "Accept this checkout's demo terms.",
              )
            : t(
                "مرحله بعد پرداخت یا رزرو قطعی انجام نمی‌دهد.",
                "The next step doesn't pay or reserve stock.",
              )
  useEffect(() => {
    title.current?.focus({ preventScroll: true })
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    inFlight.current = false
    setChecking(false)
    setContinueError("")
  }, [mode, session.status])
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
  const continueCheckout = () => {
    if (!canContinue || inFlight.current) return
    inFlight.current = true
    setChecking(true)
    setContinueError("")
    const fingerprint = JSON.stringify(
      rows.map((row) => [
        row.line.id,
        row.currentPrice,
        row.quantity,
        row.issue,
      ]),
    )
    timer.current = setTimeout(() => {
      inFlight.current = false
      setChecking(false)
      const latest = current.current
      const freshRows = checkoutRows(
        latest.snapshot,
        latest.ids,
        latest.cartMode,
      )
      const freshMoney = checkoutAmounts(
        freshRows,
        latest.couponCode,
        latest.cartMode === "stacking",
      )
      if (
        latest.session.status !== "verified" ||
        latest.mergeNotice ||
        (latest.needTerms && !latest.terms) ||
        freshRows.length !== latest.ids.length ||
        freshRows.some((row) => row.issue) ||
        freshMoney.coupon.error ||
        JSON.stringify(
          freshRows.map((row) => [
            row.line.id,
            row.currentPrice,
            row.quantity,
            row.issue,
          ]),
        ) !== fingerprint
      ) {
        setContinueError(
          t(
            "اطلاعات این خرید تغییر کرده است؛ دوباره مرور کنید.",
            "This checkout has changed. Please review it again.",
          ),
        )
        return
      }
      onNavigate(
        physicalCheckout(freshRows)
          ? t(
              "مرحله آدرس — مقصد پروتوتایپ",
              "Address step — prototype destination",
            )
          : t(
              "مرحله پرداخت — مقصد پروتوتایپ",
              "Payment step — prototype destination",
            ),
        physicalCheckout(freshRows) ? "/checkout/address" : "/checkout/payment",
      )
    }, 600)
  }
  const steps = hasPhysical
    ? [
        t("هویت و مرور", "Account & review"),
        t("آدرس", "Address"),
        t("ارسال", "Delivery"),
        t("پرداخت", "Payment"),
      ]
    : [t("هویت و مرور", "Account & review"), t("پرداخت", "Payment")]
  const cta = checking
    ? t("در حال بررسی…", "Checking…")
    : hasPhysical
      ? t("ادامه به آدرس", "Continue to address")
      : t("ادامه به پرداخت", "Continue to payment")
  return (
    <div className="checkout-page">
      <header className="checkout-header" role="banner">
        <div className="container checkout-header-inner">
          <a
            className="wordmark"
            href="/"
            onClick={(event) => {
              event.preventDefault()
              onNavigate("NilArt Studio", "/")
            }}
            aria-label="NilArt Studio — Home"
          >
            <span>
              nilart<span className="wordmark-dot">.</span>
            </span>
            <small>ART & EVERYDAY</small>
          </a>
          <nav aria-label={t("ناوبری تسویه‌حساب", "Checkout navigation")}>
            {link(t("بازگشت به سبد", "Back to cart"), "/cart")}
            <span className="checkout-header-divider" />
            {link(t("پشتیبانی", "Support"), "/contact")}
            <button className="language-button" onClick={onLanguage}>
              {language === 0 ? "EN" : "فارسی"}
            </button>
          </nav>
        </div>
      </header>
      <div className="container checkout-content">
        <ol
          className={`checkout-progress ${hasPhysical ? "" : "digital"}`}
          aria-label={t("مراحل checkout", "Checkout progress")}
        >
          {steps.map((step, index) => (
            <li key={step} aria-current={index === 0 ? "step" : undefined}>
              <span className="checkout-step-number">
                {(index + 1).toLocaleString(language === 0 ? "fa-IR" : "en-US")}
              </span>
              <span>
                {step}
                {index === 0 && (
                  <small>{t("مرحله فعلی", "Current step")}</small>
                )}
              </span>
            </li>
          ))}
        </ol>
        <div className="checkout-page-heading">
          <span className="eyebrow">NILART STUDIO / CHECKOUT</span>
          <h1 id="checkout-title" ref={title} tabIndex={-1}>
            {t(
              "مرور سفارش و تأیید حساب",
              "Review your order and confirm your account",
            )}
          </h1>
          <p>
            {t(
              "وارد حساب شوید یا حساب بسازید، سپس اقلام آماده را بررسی کنید و ادامه دهید.",
              "Sign in or create an account, then review your ready items and continue.",
            )}
          </p>
        </div>
        <div className="checkout-stock-note">
          <ShieldIcon />
          <p>
            {t(
              "در فرایند واقعی، موجودی هنگام شروع پرداخت بررسی و رزرو می‌شود. ورود به این صفحه یا تأیید شماره، رزرو قطعی نیست.",
              "In the actual purchase flow, stock is checked and reserved when payment starts. Entering this page or verifying a phone doesn't reserve it.",
            )}
          </p>
        </div>
        <p className="checkout-demo-banner">
          {t(
            "پروتوتایپ نمایشی — بدون SMS واقعی، حساب واقعی، پرداخت یا رزرو موجودی.",
            "Demo prototype — no real SMS, account creation, payment or stock reservation.",
          )}
        </p>
        <div className="checkout-layout">
          <div className="checkout-main-column">
            <CheckoutAuth
              language={language}
              session={session}
              mode={mode}
              onSession={onSession}
              onNavigate={onNavigate}
              onKeyboard={setKeyboard}
            />
            {offline && (
              <p className="checkout-notice warning" role="alert">
                {t(
                  "اتصال برقرار نیست؛ فرم و سبد حفظ شده‌اند، اما ادامه با اطلاعات تأییدنشده ممکن نیست.",
                  "You're offline. Form and cart are preserved, but you can't continue with unconfirmed information.",
                )}
              </p>
            )}
            {mergeNotice && (
              <section className="checkout-merge-notice" role="alert">
                <h2>
                  {t(
                    "تغییرات سبد حساب را بررسی کنید",
                    "Review account-cart changes",
                  )}
                </h2>
                <p>
                  {t(
                    "پیشنهاد ترکیب سبد حساب با انتخاب‌های فعلی آماده است؛ تعداد یا مبلغ بی‌صدا تغییر نکرده است.",
                    "A proposal to combine your account cart with current selections is ready. Quantities and amounts haven't changed silently.",
                  )}
                </p>
                <p>
                  {mergeNotice.changes.toLocaleString(
                    language === 0 ? "fa-IR" : "en-US",
                  )}{" "}
                  {t("ردیف تغییر می‌کند", "lines would change")} ·{" "}
                  {mergeNotice.conflicts.toLocaleString(
                    language === 0 ? "fa-IR" : "en-US",
                  )}{" "}
                  {t("قلم نیازمند اصلاح", "items need attention")}
                </p>
                <div className="checkout-merge-comparison">
                  {evaluateCart(mergeNotice.candidate)
                    .filter((row) => row.issue && row.issue !== "pending")
                    .map((row) => (
                      <p key={row.line.id}>
                        {row.name[language]} —{" "}
                        {t("تعداد پیشنهادی: ", "Proposed quantity: ")}
                        {row.quantity.toLocaleString(
                          language === 0 ? "fa-IR" : "en-US",
                        )}{" "}
                        · {t("حداکثر قابل خرید: ", "Purchasable limit: ")}
                        {row.maxQuantity.toLocaleString(
                          language === 0 ? "fa-IR" : "en-US",
                        )}
                      </p>
                    ))}
                </div>
                <div>
                  <button className="button secondary" onClick={onReviewMerged}>
                    {t("بازبینی پیشنهاد در سبد", "Review proposal in cart")}
                  </button>
                  <button className="filter-clear" onClick={onKeepGuest}>
                    {t("حفظ انتخاب‌های فعلی", "Keep current selections")}
                  </button>
                </div>
              </section>
            )}
            <section
              className="checkout-review"
              aria-labelledby="checkout-items-title"
            >
              <div className="checkout-review-heading">
                <div>
                  <span className="checkout-section-index">02</span>
                  <h2 id="checkout-items-title">
                    {t("اقلام این خرید", "Items in this checkout")}
                  </h2>
                </div>
                {link(t("ویرایش سبد", "Edit cart"), "/cart")}
              </div>
              {!rows.length && !missing ? (
                <div className="checkout-empty">
                  <h3>
                    {t(
                      "این خرید هنوز قلم آماده‌ای ندارد.",
                      "There are no ready items in this checkout.",
                    )}
                  </h3>
                  <p>
                    {t(
                      "از سبد، اقلام آماده را انتخاب و دوباره ادامه دهید.",
                      "Select ready items from your cart and continue again.",
                    )}
                  </p>
                  {link(
                    t("بازگشت به سبد", "Back to cart"),
                    "/cart",
                    "button primary",
                  )}
                  {link(t("مشاهده فروشگاه", "Browse the shop"), "/shop")}
                </div>
              ) : (
                <>
                  {(issues.length > 0 || missing > 0) && (
                    <div className="checkout-notice warning" role="alert">
                      <h3>
                        {t(
                          "این خرید نیازمند تأیید یا اصلاح است.",
                          "This checkout needs confirmation or correction.",
                        )}
                      </h3>
                      <p>
                        {t(
                          "هیچ قلمی بی‌اطلاع از این خرید حذف نمی‌شود. برای تغییر مجموعه خرید به سبد برگردید.",
                          "No items are silently removed from this checkout. Return to the cart to change the selected set.",
                        )}
                      </p>
                      {link(t("اصلاح سبد", "Update cart"), "/cart")}
                    </div>
                  )}
                  {rows.map((row) => (
                    <CartRow
                      key={row.line.id}
                      row={row}
                      language={language}
                      coupon={coupon}
                      stacking={cartMode === "stacking"}
                      busy={checking}
                      expanded={false}
                      offline={offline || checking}
                      readOnly
                      hidePrivate={session.status !== "verified"}
                      onQuantity={() => {}}
                      onRemove={() => {}}
                      onEdit={() =>
                        onNavigate(t("سبد خرید", "Shopping cart"), "/cart")
                      }
                      onAcceptPrice={onAcceptPrice}
                      onNavigate={onNavigate}
                      renderMedia={renderMedia}
                      arrow={arrow}
                    />
                  ))}
                </>
              )}
              {outside > 0 && (
                <p className="checkout-remaining-note">
                  {t(
                    "اقلام خارج از این خرید، از جمله موارد نیازمند بررسی، در سبد شما باقی می‌مانند.",
                    "Items outside this checkout, including those awaiting review, remain in your cart.",
                  )}
                </p>
              )}
            </section>
          </div>
          <aside className="checkout-summary-column">
            <section className="checkout-summary">
              <span className="eyebrow">YOUR ORDER, AT A GLANCE</span>
              <h2>{t("خلاصه این خرید", "Your order summary")}</h2>
              <p className="checkout-summary-count">
                {rows.length.toLocaleString(language === 0 ? "fa-IR" : "en-US")}{" "}
                {t("قلم انتخاب‌شده", "selected items")}
              </p>
              {expired || privateReview ? (
                <p className="checkout-notice">
                  {t(
                    "برای نمایش اطلاعات کامل این خرید، دوباره وارد شوید.",
                    "Sign in again to display full checkout information.",
                  )}
                </p>
              ) : (
                <>
                  <CheckoutAmounts rows={rows} code={couponCode} stacking={cartMode === "stacking"} language={language} />
                </>
              )}
              {couponCode && (
                <div className="checkout-code-review">
                  <span dir="ltr">{couponCode}</span>
                  {link(t("تغییر در سبد", "Change in cart"), "/cart")}
                  {coupon.error && (
                    <p className="checkout-field-error" role="alert">
                      {t(
                        "اعتبار کد باید در سبد دوباره بررسی شود.",
                        "Recheck coupon eligibility in the cart.",
                      )}
                    </p>
                  )}
                </div>
              )}
              <p className="checkout-shipping-note">
                {hasPhysical
                  ? t(
                      "ارسال در مراحل آدرس و ارسال مشخص می‌شود؛ این مبلغ نهایی پرداخت نیست.",
                      "Shipping is determined in the address and delivery steps. This isn't the final payment amount.",
                    )
                  : t(
                      "ارسال ندارد؛ آدرس و ارسال برای این خرید دیجیتال لازم نیست.",
                      "No shipping required. This digital checkout doesn't need an address or delivery step.",
                    )}
              </p>
              <small>
                {t(
                  "مالیات فرضی اضافه نشده است؛ تنظیمات فعال باید از سرویس بیایند.",
                  "No assumed tax is added; active settings must come from the service.",
                )}
              </small>
              {blocked && rows.length > 0 && (
                <p className="checkout-notice warning">
                  {t(
                    "قلم نیازمند تأیید همچنان در انتخاب شماست؛ ادامه تا رفع مشکل مسدود است.",
                    "Items needing confirmation remain selected. Continuing is blocked until resolved.",
                  )}
                </p>
              )}
              {needTerms && (
                <label className="checkout-checkbox checkout-purchase-terms">
                  <input
                    type="checkbox"
                    checked={terms}
                    disabled={checking}
                    onChange={(event) => { setTerms(event.target.checked); onTermsAccepted?.(event.target.checked ? "DEMO-CHECKOUT-V1" : null) }}
                  />
                  <span>
                    {t(
                      "شرایط نمونه خرید را می‌پذیرم — نسخه DEMO-CHECKOUT-V1؛ متن مصوب برند هنوز ارائه نشده است.",
                      "I accept the demo purchase terms — DEMO-CHECKOUT-V1. Approved brand text has not been supplied.",
                    )}
                  </span>
                </label>
              )}
              <button
                className="button primary checkout-continue-button"
                disabled={!canContinue}
                onClick={continueCheckout}
                aria-busy={checking}
              >
                {cta}
                {arrow}
              </button>
              <p className="checkout-continue-reason">{reason}</p>
              {continueError && (
                <p className="checkout-field-error" role="alert">
                  {continueError}
                </p>
              )}
              {link(t("بازگشت به سبد", "Back to cart"), "/cart")}
              <div className="checkout-summary-policy-links">
                {link(t("شرایط خرید", "Purchase terms"), "/terms")}
                {link(t("حریم خصوصی", "Privacy policy"), "/privacy")}
              </div>
            </section>
          </aside>
        </div>
      </div>
      <footer className="checkout-footer">
        <div className="container">
          <span>© {new Date().getFullYear()} NilArt Studio</span>
          <nav>
            {link(t("قوانین", "Terms"), "/terms")}
            {link(t("حریم خصوصی", "Privacy"), "/privacy")}
            {link(t("پشتیبانی", "Support"), "/contact")}
          </nav>
          <button className="foundation-link" onClick={() => setStates(true)}>
            {t("حالت‌های نمایشی و تحویل", "Prototype states & handoff")}
          </button>
        </div>
      </footer>
      {!keyboard && rows.length > 0 && (
        <div className="mobile-buy-bar checkout-mobile-bar">
          <div>
            <small>{t("جمع اقلام آماده", "Ready items total")}</small>
            <strong>
              {expired || privateReview ? "—" : money(totals.total)}
            </strong>
          </div>
          <button
            className="button primary"
            disabled={!canContinue}
            onClick={continueCheckout}
          >
            {checking
              ? t("در حال بررسی…", "Checking…")
              : hasPhysical
                ? t("ادامه به آدرس", "Continue to address")
                : t("ادامه به پرداخت", "Continue to payment")}
          </button>
        </div>
      )}
      {renderDialog(
        states,
        () => setStates(false),
        t("حالت‌های checkout", "Checkout prototype states"),
        <div className="foundation">
          <p>
            {t(
              "داده و سرویس محلی نمونه؛ credential در توضیحات نمایش داده یا ذخیره نمی‌شود.",
              "Local sample data and service. Credentials aren't exposed in annotations or stored.",
            )}
          </p>
          <h3>{t("نمونه‌های کامل", "Complete examples")}</h3>
          <div className="foundation-buttons">
            {[
              [
                "verified",
                t("حساب تأییدشده + سه قلم", "Verified account + three items"),
              ],
              ["guest", t("مهمان + سفارش نمونه", "Guest + sample order")],
              ["unverified", t("شماره تأییدنشده", "Unverified phone")],
              ["merge-conflict", t("تعارض ترکیب سبد", "Cart merge conflict")],
              ["digital", t("خرید فقط دیجیتال", "Digital-only checkout")],
              ["empty", t("بدون قلم آماده", "No ready items")],
              ["quote-expired", t("quote منقضی", "Expired quote")],
            ].map(([value, label]) => (
              <button
                key={value}
                className="button secondary"
                onClick={() => {
                  onDemo(value)
                  setStates(false)
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <h3>{t("حالت سرویس و مرور", "Service & review state")}</h3>
          <select
            value={mode}
            onChange={(event) => onMode(event.target.value)}
            aria-label={t("حالت سرویس", "Service state")}
          >
            {[
              ["normal", t("عادی", "Normal")],
              [
                "invalid-credentials",
                t("اعتبارنامه نامعتبر", "Invalid credentials"),
              ],
              ["otp-invalid", t("کد اشتباه", "Invalid code")],
              ["otp-expired", t("کد منقضی", "Expired code")],
              ["sms-error", t("خطای ارسال کد", "Code sending error")],
              ["rate-limited", t("محدودیت تلاش", "Attempt limit")],
              ["restricted", t("حساب محدود", "Restricted account")],
              ["price-change", t("تغییر قیمت", "Price change")],
              ["stock-conflict", t("تعارض موجودی", "Stock conflict")],
              ["offline", t("قطع اتصال", "Offline")],
              ["session-expired", t("نشست منقضی", "Session expired")],
              [
                "terms-required",
                t("پذیرش شرایط خرید نمونه", "Demo checkout terms required"),
              ],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <h3>{t("یادداشت تحویل PUB-10", "PUB-10 handoff")}</h3>
          <p>
            {t(
              "ثبت‌نام: شماره ← OTP ثبت‌نام ← رمز. ورود: رمز یا OTP ورود. بازیابی هدف جدا دارد. سبد و انتخاب‌های checkout در auth حفظ می‌شوند؛ ورود هیچ عملیات مالی را خودکار اجرا نمی‌کند.",
              "Registration: phone → registration OTP → password. Sign-in: password or sign-in OTP. Recovery has a separate purpose. Auth preserves cart and checkout selection; sign-in never automatically submits a financial operation.",
            )}
          </p>
          <p>
            {t(
              "فقط شناسه‌های انتخاب‌شده مرور می‌شوند. تغییر مبلغ تأیید می‌خواهد. مشکل موجودی یا quote منقضی، انتخاب را تا اصلاح متوقف می‌کند؛ قلمی بی‌صدا حذف نمی‌شود. دیجیتال آدرس ندارد. مقصد بازگشت auth فقط داخلی و /checkout است.",
              "Only selected line IDs are reviewed. Price changes require consent. Stock issues or expired quotes block the selection until corrected; no item is silently removed. Digital orders skip addresses. Auth returns are restricted to internal /checkout.",
            )}
          </p>
          <code dir="ltr">
            {safeCheckoutReturn(
              `/checkout?items=${encodeURIComponent(ids.join(","))}`,
            )}
          </code>
          <p>
            {t(
              "OTP، cooldown، قواعد رمز و نسخه شرایط، تنظیمات نمونه‌اند؛ policy واقعی باید از سرویس مصوب بیاید. رزرو هماهنگ و احراز واقعی نیازمند backend پیش از پرداخت‌اند.",
              "OTP, cooldown, password rules and terms versions are demo settings; production policy must come from the approved service. Coordinated reservation and real authentication require backend integration before payment.",
            )}
          </p>
        </div>,
        "guide",
      )}
    </div>
  )
}
function ShieldIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  )
}
