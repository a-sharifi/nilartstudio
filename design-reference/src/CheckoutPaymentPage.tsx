import { useEffect, useRef, useState, type ReactNode } from "react"
import CartRow from "./CartRow"
import CheckoutAmounts from "./CheckoutAmounts"
import { AddressDetails } from "./CheckoutAddressPage"
import {
  CheckoutHeader,
  CheckoutStepper,
  CheckoutFooter,
  CheckoutLink,
} from "./CheckoutChrome"
import { evaluateCart } from "./cart"
import {
  activeAttempt,
  canStartPayment,
  claimDemoPaymentLock,
  createDemoAttempt,
  demoCallback,
  paymentConfig,
  paymentFingerprint,
  paymentInvoice,
  readDemoPaymentLock,
  releaseDemoPaymentLock,
  reviewPayment,
  type AttemptStatus,
  type PaymentInput,
  type PaymentState,
} from "./payment"
import "./payment.css"
interface Props extends Omit<PaymentInput, "ids"> {
  language: 0 | 1
  selectedIds: string[] | null
  route: string
  state: PaymentState
  onState: (s: PaymentState) => void
  onLanguage: () => void
  onNavigate: (name: string, route: string) => void
  onDemo: (s: string) => void
  onSession: (s: PaymentInput["session"]) => void
  renderMedia: (color: string, kind: string, hero?: boolean) => ReactNode
  arrow: ReactNode
}
type Mode = "normal" | "loading" | "disabled" | "stock" | "create-error" | "offline" | "other-tab"
export default function CheckoutPaymentPage(props: Props) {
  const {
    language,
    onLanguage,
    onNavigate,
    state,
    onState,
    route,
    renderMedia,
    arrow,
  } = props
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const money = (n: number) =>
    `${n.toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("تومان", "toman")}`
  const [fallbackIds] = useState(() =>
    evaluateCart(props.snapshot, props.cartMode)
      .filter((r) => !r.issue)
      .map((r) => r.line.id),
  )
  const input: PaymentInput = {
    ...props,
    ids: props.selectedIds ?? fallbackIds,
  }
  const review = reviewPayment(input)
  const invoice = paymentInvoice(input, state)
  const sourceKey = paymentFingerprint(input)
  const verified = props.session.status === "verified"
  const [mode, setMode] = useState<Mode>("normal")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [lock, setLock] = useState<string | null>(() => readDemoPaymentLock())
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [longCheck, setLongCheck] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const alive = useRef(true)
  const running = useRef(false)
  const request = useRef(0)
  const key = useRef(crypto.randomUUID())
  const latest = useRef({ props, input })
  latest.current = { props, input }
  const modeRef = useRef(mode)
  modeRef.current = mode
  const attempt = state.attempt
  const lockOwned = lock === key.current || lock === attempt?.id
  const otherActive = !!lock && !lockOwned
  const adjustment = invoice.adjustment
  const frozen = verified && activeAttempt(attempt)
  const currentOption = props.delivery.quote?.options.find(
    (o) => o.id === props.delivery.selectedDeliveryOption,
  )
  const option = frozen ? attempt?.deliverySnapshot?.option : currentOption
  const destination = frozen
    ? attempt?.deliverySnapshot?.address
    : review.destination
  const physicalDisplay = frozen ? !!attempt?.deliverySnapshot : review.physical
  const reference = route.split("/")[3]
  const statusPage = route !== "/checkout/payment"
  const authorizedAttempt =
    verified &&
    !!attempt &&
    (reference === attempt.id || reference === attempt.orderId)
  const usable =
    mode === "normal" &&
    !otherActive &&
    !busy &&
    !error &&
    canStartPayment(input, state)
  const payAllowed = usable && (!state.adjustment || !!adjustment)
  useEffect(() => {
    alive.current = true
    const changed = () => setLock(readDemoPaymentLock())
    const offline = () => setMode("offline")
    window.addEventListener("offline", offline)
    window.addEventListener("storage", changed)
    return () => {
      alive.current = false
      request.current++
      window.removeEventListener("storage", changed)
      window.removeEventListener("offline", offline)
    }
  }, [])
  useEffect(() => {
    title.current?.focus({ preventScroll: true })
    setReceiptOpen(false)
  }, [route])
  useEffect(() => {
    if (!statusPage || !authorizedAttempt || !attempt) return
    if (
      attempt.status === "succeeded" &&
      !route.startsWith("/checkout/success/")
    )
      onNavigate(
        t("پرداخت تأیید شد · نمونه", "Payment confirmed · demo"),
        `/checkout/success/${attempt.orderId}`,
      )
    else if (
      ["failed", "cancelled"].includes(attempt.status) &&
      !route.startsWith("/checkout/failed/")
    )
      onNavigate(
        t("بازیابی پرداخت", "Payment recovery"),
        `/checkout/failed/${attempt.id}`,
      )
    else if (
      !["succeeded", "failed", "cancelled"].includes(attempt.status) &&
      !route.startsWith("/checkout/verifying/")
    )
      onNavigate(
        t("بررسی پرداخت", "Checking payment"),
        `/checkout/verifying/${attempt.id}`,
      )
  }, [route, authorizedAttempt, attempt?.status])
  const link = (fa: string, en: string, to: string) => (
    <CheckoutLink
      language={language}
      onNavigate={onNavigate}
      fa={fa}
      en={en}
      route={to}
    />
  )
  const navigateAttempt = (next: PaymentState) => {
    onState(next)
    const a = next.attempt
    if (!a) return
    if (["succeeded", "failed", "cancelled"].includes(a.status)) {
      releaseDemoPaymentLock(a.id)
      releaseDemoPaymentLock(key.current)
      setLock(readDemoPaymentLock())
    }
    onNavigate(
      t("وضعیت پرداخت · نمونه", "Payment status · demo"),
      a.status === "succeeded"
        ? `/checkout/success/${a.orderId}`
        : ["failed", "cancelled"].includes(a.status)
          ? `/checkout/failed/${a.id}`
          : `/checkout/verifying/${a.id}`,
    )
  }
  const result = (status: AttemptStatus) =>
    navigateAttempt(demoCallback(latest.current.props.state, status))
  const start = async () => {
    if (!payAllowed || running.current) return
    running.current = true
    setBusy(true)
    setError("")
    const ticket = ++request.current
    const fingerprint = sourceKey
    const claimed = await claimDemoPaymentLock(key.current)
    if (!claimed) {
      running.current = false
      setBusy(false)
      setLock(readDemoPaymentLock())
      setError(
        t(
          "تلاش دیگری فعال یا نامشخص است؛ ابتدا وضعیت همان تلاش را بررسی کنید.",
          "Another attempt is active or unresolved. Check that attempt first.",
        ),
      )
      return
    }
    setLock(key.current)
    await new Promise((resolve) => setTimeout(resolve, 650))
    if (!alive.current || request.current !== ticket) {
      releaseDemoPaymentLock(key.current)
      return
    }
    const latestInput = latest.current.input
    const p = latest.current.props
    if (
      fingerprint !== paymentFingerprint(latestInput) ||
      !canStartPayment(latestInput, p.state) ||
      modeRef.current !== "normal"
    ) {
      releaseDemoPaymentLock(key.current)
      setLock(readDemoPaymentLock())
      running.current = false
      setBusy(false)
      setError(
        t(
          "اطلاعات سفارش تغییر کرده است؛ دوباره مرور کنید. پرداخت ایجاد نشد.",
          "Order details changed. Review them again. No payment was created.",
        ),
      )
      return
    }
    try {
      const created = createDemoAttempt(latestInput, p.state, key.current)
      // Transfer the opaque lock to the existing attempt; no second attempt is created.
      try {
        window.localStorage.setItem(
          "nilart-demo-payment-lock-v1",
          created.attempt.id,
        )
        setLock(created.attempt.id)
      } catch {
        // Keep the original lock and the created attempt; never infer safe retry.
        setLock(key.current)
      }
      onState({ ...p.state, ...created })
    } catch {
      releaseDemoPaymentLock(key.current)
      setLock(readDemoPaymentLock())
      setError(
        t(
          "تلاش پرداخت ایجاد نشد؛ انتخاب‌ها حفظ شده‌اند و تلاش مالی فعالی ایجاد نشده است.",
          "The payment attempt wasn't created. Your choices are kept and no active financial attempt was created.",
        ),
      )
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  const retry = () => {
    if (
      !attempt?.retrySafe ||
      !["failed", "cancelled"].includes(attempt.status)
    )
      return
    releaseDemoPaymentLock(attempt.id)
    key.current = crypto.randomUUID()
    setLock(readDemoPaymentLock())
    onState({ ...state, attempt: null, reservation: null })
    setError("")
    setMode("normal")
    onNavigate(
      t("مرور دوباره پیش از تلاش تازه", "Review again before a new attempt"),
      "/checkout/payment",
    )
  }
  const reason = !verified
    ? t(
        "حساب و شماره را دوباره تأیید کنید.",
        "Confirm your account and phone again.",
      )
    : otherActive || mode === "other-tab"
      ? t(
          "تلاش دیگری در حال بررسی است؛ پرداخت موازی مجاز نیست.",
          "Another attempt is being checked. Parallel payment is not allowed.",
        )
      : activeAttempt(attempt)
        ? t(
            "ابتدا وضعیت تلاش فعلی را بررسی کنید؛ پرداخت تازه ایجاد نمی‌شود.",
            "Check the current attempt first. No new payment will be created.",
          )
        : mode === "offline"
          ? t(
              "اتصال قطع است؛ وضعیت مالی حدس زده نمی‌شود.",
              "You're offline. Financial status is not inferred.",
            )
          : review.issue === "delivery"
            ? t(
                "پیشنهاد ارسال معتبر نیست؛ روش ارسال را دوباره بررسی کنید.",
                "The delivery quote is invalid. Review delivery again.",
              )
            : review.issue === "address"
              ? t(
                  "آدرس تحویل معتبر لازم است.",
                  "A valid delivery address is required.",
                )
              : review.issue
                ? t(
                    "این خرید نیازمند اصلاح است؛ اقلام یا کد را دوباره بررسی کنید.",
                    "This checkout needs correction. Review the items or code.",
                  )
                : mode === "disabled"
                  ? t(
                      "روش پرداخت فعلاً در دسترس نیست.",
                      "The payment method is temporarily unavailable.",
                    )
                  : mode === "stock"
                    ? t(
                        "موجودی تغییر کرده است؛ ابتدا سبد را اصلاح کنید.",
                        "Stock has changed. Update the cart first.",
                      )
                    : adjustment && !adjustment.accepted
                      ? t(
                          "مبلغ تازه را پیش از پرداخت تأیید کنید.",
                          "Accept the updated amount before paying.",
                        )
                      : !state.selectedMethod
                        ? t(
                            "یک روش پرداخت معتبر انتخاب کنید.",
                            "Choose a valid payment method.",
                          )
                        : state.acceptedTermsVersion !==
                            paymentConfig.termsVersion
                          ? t(
                              "شرایط این سفارش را برای ادامه بپذیرید.",
                              "Accept this order's terms to continue.",
                            )
                          : error ||
                            t(
                              "با انتخاب پرداخت، به درگاه منتقل می‌شوید؛ این نمونه هیچ پرداخت واقعی انجام نمی‌دهد.",
                              "Selecting Pay takes you to the gateway. This demo makes no real payment.",
                            )
  const total = frozen ? attempt!.amount : invoice.total
  const cta = (
    <button
      className="button primary payment-pay-button"
      disabled={!payAllowed}
      onClick={start}
      aria-busy={busy}
    >
      {busy
        ? t("در حال بررسی و انتقال…", "Checking and redirecting…")
        : total !== null
          ? t(`پرداخت ${money(total)}`, `Pay ${money(total)}`)
          : t("پرداخت — نیازمند بررسی", "Pay — review required")}
      {arrow}
    </button>
  )
  const ready = invoice.rows.filter((r) => !r.issue)
  const conflicts = review.rows.filter((r) => r.issue)
  const terms = (
    <section className="payment-terms">
      <div className="address-section-heading">
        <div>
          <span className="eyebrow">
            04 / {t("شرایط خرید", "PURCHASE TERMS")}
          </span>
          <h2>{t("با آگاهی ادامه بده", "Continue with clarity")}</h2>
        </div>
      </div>
      <p>
        {t(
          "متن مصوب برند ارائه نشده است؛ پذیرش زیر فقط نسخه نمایشی همین پروتوتایپ است.",
          "Approved brand terms have not been supplied. Acceptance below applies only to this prototype's demo version.",
        )}
      </p>
      <label className="payment-terms-checkbox">
        <input
          type="checkbox"
          checked={state.acceptedTermsVersion === paymentConfig.termsVersion}
          disabled={busy || activeAttempt(attempt)}
          onChange={(e) =>
            onState({
              ...state,
              acceptedTermsVersion: e.target.checked
                ? paymentConfig.termsVersion
                : null,
            })
          }
        />
        <span>
          {t(
            "شرایط خرید این سفارش را خوانده‌ام و می‌پذیرم.",
            "I have read and accept the purchase terms for this order.",
          )}
          <small dir="ltr">{paymentConfig.termsVersion} · DEMO</small>
        </span>
      </label>
      {state.acceptedTermsVersion &&
        state.acceptedTermsVersion !== paymentConfig.termsVersion && (
          <p className="checkout-notice warning">
            {t(
              "نسخه شرایط تغییر کرده است؛ پذیرش تازه لازم است.",
              "The terms version has changed. Fresh acceptance is required.",
            )}
          </p>
        )}
      <nav>
        {link("شرایط خرید", "Purchase terms", "/terms")}
        {link("حریم خصوصی", "Privacy policy", "/privacy")}
        {link("لغو و مرجوعی", "Cancellations and returns", "/returns")}
      </nav>
      {ready.some((r) => r.line.kind === "commission") && (
        <details className="payment-agreement">
          <summary>
            {t(
              "شرایط اصلاحات و تحویل نقاشی",
              "Artwork revisions and delivery terms",
            )}
          </summary>
          <p>
            {t(
              "تعداد اصلاحات و موعد مصوب در داده نمونه ارائه نشده است؛ پیش از پرداخت واقعی، توافق تأییدشده باید از سرویس سفارش نمایش داده شود. وعده‌ای ساخته نشده است.",
              "Approved revision counts and deadlines are not supplied in the sample data. A real payment must display the confirmed agreement from the order service. No promises have been invented.",
            )}
          </p>
        </details>
      )}
    </section>
  )
  const statusTitle = !authorizedAttempt
    ? t("وضعیت قابل تأیید نیست", "Status cannot be verified")
    : attempt?.status === "succeeded"
      ? t("پرداخت تأیید شد.", "Payment confirmed.")
      : attempt?.status === "late-paid"
        ? t(
            "پرداخت تأیید شد؛ سفارش در حال رسیدگی است",
            "Payment confirmed; order under review",
          )
        : attempt?.status === "failed" || attempt?.status === "cancelled"
          ? t("پرداخت کامل نشد.", "Payment wasn't completed.")
          : t("در حال بررسی پرداخت", "Checking your payment")
  return (
    <div
      className={`checkout-page payment-page ${
        statusPage ? "payment-status-page" : ""
      }`}
    >
      <CheckoutHeader
        language={language}
        onLanguage={onLanguage}
        onNavigate={onNavigate}
      />
      <div className="container checkout-content">
        {!statusPage && (
          <CheckoutStepper
            language={language}
            onNavigate={onNavigate}
            current={3}
            digital={review.rows.length > 0 && !physicalDisplay}
          />
        )}
        {!statusPage ? (
          <>
            <div className="checkout-page-heading">
              <span className="eyebrow">NILART STUDIO / FINAL REVIEW</span>
              <h1 id="checkout-title" ref={title} tabIndex={-1}>
                {t("مرور نهایی و پرداخت", "Final review and payment")}
              </h1>
              <p>
                {t(
                  "اطلاعات و مبلغ سفارش را بررسی کنید، سپس برای پرداخت به درگاه منتقل شوید.",
                  "Review your order details and total, then continue to the payment gateway.",
                )}
              </p>
            </div>
            <div className="payment-card-note">
              <StatusIcon type="shield" />
              <span>
                {t(
                  "اطلاعات کارت بانکی را در درگاه وارد می‌کنید؛ نیل‌آرت اطلاعات کارت دریافت نمی‌کند.",
                  "You'll enter your card details on the payment gateway. NilArt does not collect card information.",
                )}
              </span>
            </div>
            <p className="checkout-demo-banner">
              {t(
                "داده و عملیات نمایشی — بدون درگاه واقعی، رزرو واقعی، برداشت وجه یا ثبت سفارش واقعی.",
                "Demo data and operations — no real gateway, stock reservation, charge or real order placement.",
              )}
            </p>
            {attempt?.status === "gateway" && verified && (
              <section className="payment-gateway-panel" role="status">
                <StatusIcon type="arrow" />
                <div>
                  <h2>
                    {t(
                      "تلاش نمونه آماده انتقال است",
                      "Demo attempt ready for redirect",
                    )}
                  </h2>
                  <p>
                    {t(
                      "مقصد بعدی درگاه خارجی است؛ صفحه بانکی در این پروتوتایپ طراحی نشده. ادامه زیر، بازگشت نمونه را شبیه‌سازی می‌کند و موفقیت اعلام نمی‌کند.",
                      "The next destination is an external gateway; no bank page is designed here. The action below simulates a return and does not claim success.",
                    )}
                  </p>
                  <strong>{money(attempt.amount)}</strong>
                  <small dir="ltr">{attempt.id}</small>
                  <button
                    className="button primary"
                    onClick={() => result("verifying")}
                  >
                    {t(
                      "بازگشت نمونه از درگاه → بررسی",
                      "Demo return from gateway → verification",
                    )}
                  </button>
                </div>
              </section>
            )}
            {(otherActive ||
              mode === "other-tab" ||
              (activeAttempt(attempt) && attempt?.status !== "gateway")) && (
              <section className="checkout-notice warning" role="alert">
                <h3>
                  {t(
                    "یک تلاش پرداخت نیازمند بررسی است",
                    "A payment attempt needs checking",
                  )}
                </h3>
                <p>
                  {t(
                    "تا مشخص‌شدن نتیجه، پرداخت دیگری آغاز نکنید. بازگشت یا قطع اتصال، شکست قطعی نیست.",
                    "Do not start another payment until its outcome is known. Returning or losing connection is not a confirmed failure.",
                  )}
                </p>
                {attempt && verified
                  ? link(
                      "بررسی همان تلاش",
                      "Check existing attempt",
                      `/checkout/verifying/${attempt.id}`,
                    )
                  : link(
                      "پشتیبانی برای بررسی وضعیت",
                      "Contact support to check status",
                      "/contact",
                    )}
              </section>
            )}
            {frozen && attempt?.context !== sourceKey && (
              <p className="checkout-notice warning" role="alert">
                {t(
                  "اطلاعات خرید ویرایش شده‌اند، اما تلاش فعلی به نسخه قبلی متصل است. مبلغ و مقصد آن ثابت می‌مانند؛ ابتدا نتیجه همان تلاش را بررسی کنید.",
                  "Checkout details were edited, but the active attempt belongs to the earlier version. Its amount and destination remain unchanged. Check that attempt first.",
                )}
              </p>
            )}
            <div className="checkout-layout">
              <div className="checkout-main-column">
                {!verified ? (
                  <section className="payment-section">
                    <h2>{t("ورود مجدد لازم است", "Please sign in again")}</h2>
                    <p>
                      {t(
                        "اطلاعات خصوصی تا تأیید مجدد پنهان است. پرداخت پس از ورود خودکار آغاز نمی‌شود.",
                        "Private information is hidden until verification. Payment will not start automatically after sign-in.",
                      )}
                    </p>
                    {link(
                      "بازگشت به هویت و مرور",
                      "Back to account & review",
                      "/checkout",
                    )}
                  </section>
                ) : mode === "loading" ? (
                  <div aria-busy="true" className="payment-skeletons">
                    <div className="skeleton payment-item-skeleton" />
                    <div className="skeleton payment-item-skeleton" />
                  </div>
                ) : (
                  <>
                    {(conflicts.length > 0 || mode === "stock") && (
                      <section className="payment-stock-notice" role="alert">
                        <h3>
                          {t(
                            "موجودی یا اعتبار یکی از اقلام تغییر کرده است.",
                            "Stock or eligibility has changed for an item.",
                          )}
                        </h3>
                        {(conflicts.length
                          ? conflicts
                          : review.rows.slice(0, 1)
                        ).map((r) => (
                          <div key={r.line.id}>
                            <strong>{r.name[language]}</strong>
                            <p>
                              {r.line.kind === "product" ||
                              r.line.kind === "bundle"
                                ? `${r.line.data.selection.size} · ${r.line.data.selection.sheets} ${t("برگ در هر دفتر", "sheets per notebook")}`
                                : r.line.data.size}
                            </p>
                            <p>
                              {t("تعداد درخواست‌شده", "Requested quantity")}:{" "}
                              {r.quantity} · {t("قابل خرید", "Available")}:{" "}
                              {mode === "stock" ? 0 : r.maxQuantity}
                            </p>
                            {r.blockedParts.length > 0 && (
                              <p>
                                {t(
                                  "جزء مشکل‌دار پکیج",
                                  "Affected bundle component",
                                )}
                                : <bdi>{r.blockedParts.join("، ")}</bdi>
                              </p>
                            )}
                            <p>
                              {r.issue === "pending"
                                ? t(
                                    "نقاشی منتظر بررسی پرداخت‌پذیر نیست.",
                                    "An artwork awaiting review cannot be paid for.",
                                  )
                                : r.issue === "expired"
                                  ? t(
                                      "پیشنهاد نقاشی منقضی شده؛ تأیید تازه لازم است.",
                                      "The artwork quote expired; fresh approval is required.",
                                    )
                                  : t(
                                      "هیچ قلمی بی‌اطلاع حذف یا تعداد آن کاهش داده نمی‌شود.",
                                      "No item is silently removed or reduced.",
                                    )}
                            </p>
                          </div>
                        ))}
                        {link("اصلاح سبد", "Update cart", "/cart")}
                      </section>
                    )}
                    {review.issue && !conflicts.length && (
                      <section className="checkout-notice warning" role="alert">
                        <p>{reason}</p>
                        {link(
                          "مرور دوباره سفارش",
                          "Review order again",
                          "/checkout",
                        )}
                        {review.physical &&
                          link(
                            "بررسی روش ارسال",
                            "Review delivery",
                            "/checkout/delivery",
                          )}
                      </section>
                    )}
                    {adjustment && (
                      <section className="payment-updated-total" role="alert">
                        <h3>
                          {t(
                            "مبلغ سفارش تغییر کرده است؛ لطفاً دوباره بررسی کنید.",
                            "Your order total has changed; please review it again.",
                          )}
                        </h3>
                        <p>
                          {adjustment.reason === "coupon"
                            ? t(
                                `اثر کد ${props.couponCode || "DEMO"} حذف شده: محدودیت مصرف نمونه دیگر اجازه استفاده نمی‌دهد. کد بی‌توضیح پاک نشده است.`,
                                `Code ${props.couponCode || "DEMO"} no longer applies: the demo usage limit was reached. The code has not been silently removed.`,
                              )
                            : t(
                                "قیمت واحد اولین قلم در پاسخ نمونه سرویس تغییر کرده است؛ مشخصات و تعداد ثابت مانده‌اند.",
                                "The first item's unit price changed in the demo service response. Options and quantities are unchanged.",
                              )}
                        </p>
                        <div>
                          <span>
                            {t("مبلغ قبلی", "Previous total")}
                            <strong>{money(adjustment.previous)}</strong>
                          </span>
                          <span>
                            {t("مبلغ تازه", "Updated total")}
                            <strong>{money(adjustment.next)}</strong>
                          </span>
                          <span>
                            {t("اختلاف", "Difference")}
                            <strong>
                              {money(adjustment.next - adjustment.previous)}
                            </strong>
                          </span>
                        </div>
                        {!adjustment.accepted ? (
                          <button
                            className="button primary"
                            onClick={() =>
                              onState({
                                ...state,
                                adjustment: { ...adjustment, accepted: true },
                              })
                            }
                          >
                            {t("تأیید مبلغ جدید", "Accept updated total")}
                          </button>
                        ) : (
                          <p className="payment-accepted">
                            {t(
                              "مبلغ تازه تأیید شد؛ پرداخت هنوز انجام نشده است.",
                              "Updated total accepted. Payment has not been made.",
                            )}
                          </p>
                        )}
                      </section>
                    )}
                    <section
                      className="payment-review"
                      aria-labelledby="payment-items-title"
                    >
                      <div className="address-section-heading">
                        <div>
                          <span className="eyebrow">
                            01 / {t("مرور نهایی", "FINAL REVIEW")}
                          </span>
                          <h2 id="payment-items-title">
                            {t("اقلام سفارش", "Order items")}
                          </h2>
                        </div>
                        {link("ویرایش سبد", "Edit cart", "/cart")}
                      </div>
                      <details className="payment-item-details" open>
                        <summary>
                          {ready.length.toLocaleString(
                            language === 0 ? "fa-IR" : "en-US",
                          )}{" "}
                          {t("قلم آماده پرداخت", "items ready for payment")}
                        </summary>
                        {frozen && attempt?.context !== sourceKey
                          ? attempt!.items.map((item, index) => (
                              <p className="checkout-notice" key={index}>
                                {item.name[language]} · {item.quantity} ·{" "}
                                {money(item.total)}
                              </p>
                            ))
                          : ready.map((row) => (
                              <CartRow
                                key={row.line.id}
                                row={row}
                                language={language}
                                coupon={invoice.amounts.coupon}
                                stacking={props.cartMode === "stacking"}
                                busy={false}
                                expanded={false}
                                offline={busy}
                                readOnly
                                onQuantity={() => {}}
                                onRemove={() => {}}
                                onEdit={() => {}}
                                onAcceptPrice={() => {}}
                                onNavigate={onNavigate}
                                renderMedia={renderMedia}
                                arrow={arrow}
                              />
                            ))}
                        {!ready.length && (
                          <p className="checkout-notice">
                            {t(
                              "این خرید قلم آماده‌ای ندارد.",
                              "This checkout has no ready items.",
                            )}
                          </p>
                        )}
                      </details>
                    </section>
                    {physicalDisplay && (
                      <section className="payment-section payment-delivery">
                        <div className="address-section-heading">
                          <div>
                            <span className="eyebrow">
                              02 / {t("گیرنده و تحویل", "RECIPIENT & DELIVERY")}
                            </span>
                            <h2>
                              {t("مقصد همین سفارش", "This order's destination")}
                            </h2>
                          </div>
                          {link(
                            "ویرایش آدرس",
                            "Edit address",
                            "/checkout/address",
                          )}
                        </div>
                        {destination ? (
                          <AddressDetails
                            address={destination}
                            language={language}
                          />
                        ) : (
                          <p>
                            {t(
                              "یک آدرس معتبر انتخاب کنید.",
                              "Choose a valid address.",
                            )}
                          </p>
                        )}
                        <div className="payment-delivery-method">
                          <div>
                            <strong>
                              {option?.name[language] ||
                                t(
                                  "ارسال نیازمند بررسی",
                                  "Delivery needs review",
                                )}
                            </strong>
                            <p>
                              {review.issue === "delivery"
                                ? t(
                                    "این پیشنهاد معتبر نیست و برای پرداخت استفاده نمی‌شود.",
                                    "This quote is invalid and cannot be used for payment.",
                                  )
                                : option?.transit[language]}
                            </p>
                            <small>
                              {t(
                                "آماده‌سازی اثر و حمل دو زمان مستقل‌اند.",
                                "Artwork preparation and transit are independent.",
                              )}
                            </small>
                          </div>
                          {link(
                            "ویرایش ارسال",
                            "Edit delivery",
                            "/checkout/delivery",
                          )}
                        </div>
                        {option && (
                          <details>
                            <summary>
                              {t("جزئیات مرسوله‌ها", "Shipment details")}
                            </summary>
                            {option.groups.map((g) => (
                              <div className="payment-shipment" key={g.id}>
                                <strong>{g.title[language]}</strong>
                                <p>{g.preparation[language]}</p>
                                <p>
                                  {g.transit[language]} · {money(g.cost)}
                                </p>
                              </div>
                            ))}
                          </details>
                        )}
                      </section>
                    )}
                    {ready.some(
                      (r) =>
                        r.line.kind !== "product" &&
                        r.line.kind !== "bundle" &&
                        r.line.data.delivery === "digital",
                    ) && (
                      <section className="payment-section payment-digital">
                        <StatusIcon type="file" />
                        <div>
                          <h2>
                            {t(
                              "تحویل دیجیتال در حساب شما",
                              "Digital delivery through your account",
                            )}
                          </h2>
                          <p>
                            {t(
                              "فایل پس از آماده‌شدن در بخش دانلودهای حساب قرار می‌گیرد. پرداخت، آماده‌بودن فوری فایل را تضمین نمی‌کند.",
                              "The file will appear in your account downloads when ready. Payment does not guarantee immediate readiness.",
                            )}
                          </p>
                        </div>
                      </section>
                    )}
                    <section className="payment-section">
                      <div className="address-section-heading">
                        <div>
                          <span className="eyebrow">
                            03 / {t("روش پرداخت", "PAYMENT METHOD")}
                          </span>
                          <h2>
                            {t("پرداخت امن در درگاه", "Pay on the gateway")}
                          </h2>
                        </div>
                        <span className="delivery-demo-tag">
                          {t("روش نمایشی", "Demo method")}
                        </span>
                      </div>
                      <fieldset
                        className="payment-methods"
                        disabled={busy || activeAttempt(attempt)}
                      >
                        <legend className="sr-only">
                          {t("انتخاب روش پرداخت", "Choose payment method")}
                        </legend>
                        {paymentConfig.methods.map((method) => (
                          <label
                            className={`payment-method-card ${
                              state.selectedMethod === method.id
                                ? "selected"
                                : ""
                            }`}
                            key={method.id}
                          >
                            <input
                              type="radio"
                              name="payment-method"
                              checked={state.selectedMethod === method.id}
                              disabled={mode === "disabled"}
                              onChange={() =>
                                onState({ ...state, selectedMethod: method.id })
                              }
                            />
                            <span>
                              <strong>{method.name[language]}</strong>
                              <small>
                                {mode === "disabled"
                                  ? t(
                                      "موقتاً غیرفعال · سرویس نمونه در دسترس نیست",
                                      "Temporarily unavailable · demo service unavailable",
                                    )
                                  : t(
                                      "انتقال به درگاه خارجی؛ اطلاعات کارت در سایت دریافت نمی‌شود.",
                                      "Redirect to an external gateway; no card information collected here.",
                                    )}
                              </small>
                            </span>
                            <StatusIcon type="arrow" />
                          </label>
                        ))}
                      </fieldset>
                    </section>
                    {terms}
                    {error && (
                      <div className="checkout-notice warning" role="alert">
                        <p>{error}</p>
                        {!activeAttempt(attempt) && !otherActive && (
                          <button
                            className="button secondary"
                            onClick={() => {
                              setError("")
                              setMode("normal")
                            }}
                          >
                            {t("بازبینی و تلاش دوباره", "Review and try again")}
                          </button>
                        )}
                      </div>
                    )}
                    {mode === "create-error" && (
                      <div className="checkout-notice warning" role="alert">
                        <p>
                          {t(
                            "در پاسخ نمونه، ایجاد تلاش شکست خورد و سرویس تأیید کرده تلاش مالی فعالی ایجاد نشده است. فرم و انتخاب‌ها حفظ شده‌اند.",
                            "The demo creation response failed and confirmed no financial attempt was created. Your form and choices are kept.",
                          )}
                        </p>
                        <button
                          className="button secondary"
                          onClick={() => setMode("normal")}
                        >
                          {t("دوباره تلاش کنید", "Try again")}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              <aside className="checkout-summary-column">
                <section className="checkout-summary payment-summary">
                  <span className="eyebrow">EVERY DETAIL, BEFORE YOU PAY</span>
                  <h2>{t("خلاصه پرداخت", "Payment summary")}</h2>
                  <p className="checkout-summary-count">
                    {t(
                      "مبالغ نمونه · واحد تومان",
                      "Demo amounts · currency: toman",
                    )}
                  </p>
                  {verified && mode !== "loading" ? (
                    <>
                      <CheckoutAmounts
                        rows={invoice.rows}
                        code={invoice.code}
                        stacking={props.cartMode === "stacking"}
                        language={language}
                        frozen={
                          frozen
                            ? {
                                ...attempt!.breakdown,
                                total: attempt!.breakdown.itemsTotal,
                              }
                            : undefined
                        }
                      />
                      <div className="payment-summary-extras">
                        <div>
                          <span>{t("هزینه ارسال", "Shipping")}</span>
                          <strong>
                            {frozen
                              ? money(attempt!.breakdown.shipping)
                              : !review.physical
                                ? t("بدون ارسال فیزیکی", "No physical shipping")
                                : review.issue
                                  ? t("نیازمند بررسی", "Needs review")
                                  : money(invoice.shipping!)}
                          </strong>
                        </div>
                        <div>
                          <span>{t("مالیات", "Tax")}</span>
                          <strong>
                            {frozen
                              ? money(attempt!.breakdown.tax)
                              : invoice.tax !== undefined &&
                                  invoice.total !== null
                                ? money(invoice.tax)
                                : "—"}
                          </strong>
                        </div>
                        <small>
                          {t(
                            "مالیات صفر، تنظیم نمونه است. بسته‌بندی دوباره اضافه نشده؛ کد شامل ارسال و مالیات نیست.",
                            "Zero tax is a demo setting. Packaging is not added twice; codes exclude shipping and tax.",
                          )}
                        </small>
                      </div>
                      <div className="payment-total" aria-live="polite">
                        <span>
                          {adjustment && !adjustment.accepted
                            ? t(
                                "مبلغ تازه · نیازمند تأیید",
                                "Updated amount · needs approval",
                              )
                            : t("مبلغ قابل پرداخت", "Total due")}
                        </span>
                        <strong>{total !== null ? money(total) : "—"}</strong>
                      </div>
                    </>
                  ) : verified ? (
                    <div
                      className="skeleton payment-summary-skeleton"
                      aria-busy="true"
                    />
                  ) : (
                    <p className="checkout-notice">
                      {t(
                        "مبلغ و اطلاعات خصوصی پس از ورود مجدد نمایش داده می‌شوند.",
                        "Private amount and details appear after sign-in.",
                      )}
                    </p>
                  )}
                  {cta}
                  <p className="checkout-continue-reason">{reason}</p>
                  {link(
                    "بازگشت به مرور سفارش",
                    "Back to order review",
                    "/checkout",
                  )}
                </section>
              </aside>
            </div>
          </>
        ) : (
          <div className="payment-status-layout">
            <section
              className={`payment-status-panel ${
                authorizedAttempt ? attempt?.status : "unknown"
              }`}
            >
              <span className="eyebrow">
                NILART /{" "}
                {authorizedAttempt && attempt?.status === "succeeded"
                  ? "PAYMENT CONFIRMED"
                  : "TRANSACTION STATUS"}
              </span>
              <div className="payment-status-symbol">
                <StatusIcon
                  type={
                    !authorizedAttempt
                      ? "clock"
                      : attempt?.status === "succeeded"
                        ? "check"
                        : ["failed", "cancelled"].includes(
                              attempt?.status || "",
                            )
                          ? "close"
                          : "clock"
                  }
                />
              </div>
              <h1 id="checkout-title" ref={title} tabIndex={-1}>
                {statusTitle}
              </h1>
              {!authorizedAttempt ? (
                <>
                  <p>
                    {t(
                      "برای مشاهده نتیجه، نشست معتبر و دسترسی به همین تلاش لازم است. آدرس URL به‌تنهایی تأیید پرداخت نیست؛ تراکنش تازه ایجاد نمی‌شود.",
                      "A valid session and access to this attempt are required. A URL alone does not confirm payment; no new transaction is created.",
                    )}
                  </p>
                  {link(
                    "ورود و مرور سفارش",
                    "Sign in and review order",
                    "/checkout",
                  )}
                  {link("پشتیبانی", "Support", "/contact")}
                </>
              ) : (
                attempt && (
                  <>
                    <p className="payment-status-intro">
                      {attempt.status === "succeeded"
                        ? t(
                            "پاسخ تأیید سرویس در این نمونه دریافت شد. پرداخت با ارسال کالا یا آماده‌شدن فایل یکی نیست.",
                            "The simulated service confirmation was received. Payment is not the same as dispatch or file readiness.",
                          )
                        : attempt.status === "late-paid"
                          ? t(
                              "پرداخت تأیید شد؛ وضعیت موجودی سفارش در حال بررسی است. نتیجه تخصیص یا بازپرداخت اطلاع داده می‌شود؛ بازپرداخت هنوز انجام‌شده نیست.",
                              "Payment was confirmed; stock availability is under review. Allocation or refund outcomes will be communicated. A refund has not been completed.",
                            )
                          : attempt.status === "failed"
                            ? t(
                                "سرویس نمونه، شکست قطعی این تلاش و امن‌بودن بازبینی برای تلاش تازه را تأیید کرده است. وضعیت کسر یا بازگشت وجه از داده موجود قابل اعلام نیست.",
                                "The demo service confirmed this attempt failed and can safely be reviewed for retry. Debit or refund status cannot be inferred from the supplied data.",
                              )
                            : attempt.status === "cancelled"
                              ? t(
                                  "لغو قطعی این تلاش از پاسخ نمونه سرویس تأیید شده است؛ بستن صفحه به‌تنهایی لغو محسوب نشده. درباره کسر وجه حدس نمی‌زنیم.",
                                  "Cancellation was confirmed by the simulated service; closing the page alone was not treated as cancellation. We do not infer debit status.",
                                )
                              : t(
                                  "وضعیت تراکنش در حال بررسی است. تا مشخص‌شدن نتیجه، دوباره پرداخت نکنید.",
                                  "We're checking the transaction status. Please do not pay again until the result is confirmed.",
                                )}
                    </p>
                    {["gateway", "verifying", "unknown"].includes(
                      attempt.status,
                    ) &&
                      (longCheck || attempt.status === "unknown") && (
                        <p className="checkout-notice warning">
                          {t(
                            "بررسی طولانی‌تر شده است؛ مرجع زیر را برای پشتیبانی نگه دارید. وضعیت نامشخص، شکست نیست.",
                            "Checking is taking longer. Keep the reference below for support. Unknown does not mean failed.",
                          )}
                        </p>
                      )}
                    {state.reservation?.status === "expired" && (
                      <p className="checkout-notice warning">
                        {t(
                          "رزرو نمونه منقضی شده است؛ وضعیت تراکنش و امکان تخصیص باید دوباره بررسی شوند. پرداخت مجدد پیشنهاد نمی‌شود.",
                          "The demo reservation expired. Transaction status and allocation must be checked again. Do not pay again.",
                        )}
                      </p>
                    )}
                    <div className="payment-status-amount">
                      <span>
                        {attempt.status === "succeeded" ||
                        attempt.status === "late-paid"
                          ? t("مبلغ پرداخت‌شده · نمونه", "Paid amount · demo")
                          : t("مبلغ تلاش پرداخت", "Payment attempt amount")}
                      </span>
                      <strong>{money(attempt.amount)}</strong>
                    </div>
                    <dl className="payment-references">
                      <div>
                        <dt>{t("مرجع تلاش", "Attempt reference")}</dt>
                        <dd dir="ltr">{attempt.id}</dd>
                      </div>
                      {["succeeded", "late-paid"].includes(attempt.status) && (
                        <div>
                          <dt>{t("شماره سفارش", "Order number")}</dt>
                          <dd dir="ltr">{attempt.orderId}</dd>
                        </div>
                      )}
                      {attempt.transactionRef && (
                        <div>
                          <dt>{t("مرجع تراکنش", "Transaction reference")}</dt>
                          <dd dir="ltr">{attempt.transactionRef}</dd>
                        </div>
                      )}
                    </dl>
                    {attempt.status === "succeeded" && (
                      <>
                        <div className="payment-fulfillment">
                          <StatusIcon type="file" />
                          <div>
                            <strong>
                              {t(
                                "در انتظار آماده‌سازی و تحویل",
                                "Awaiting preparation and delivery",
                              )}
                            </strong>
                            <p>
                              {t(
                                "موعد مصوب ارائه نشده است. فایل دیجیتال هنوز آماده دانلود نیست؛ لینک دانلود ساختگی ارائه نشده.",
                                "No approved deadline supplied. Digital files are not yet ready; no invented download link is provided.",
                              )}
                            </p>
                          </div>
                        </div>
                        <ul className="payment-paid-items">
                          {attempt.items.map((item, index) => (
                            <li key={index}>
                              {item.name[language]} · {item.quantity}
                            </li>
                          ))}
                        </ul>
                        <div className="payment-status-actions">
                          {link(
                            "پیگیری سفارش",
                            "Track order",
                            `/account/orders/${attempt.orderId}`,
                          )}
                          <button
                            className="button secondary"
                            onClick={() => setReceiptOpen(!receiptOpen)}
                            aria-expanded={receiptOpen}
                            aria-controls="demo-payment-receipt"
                          >
                            {t("مشاهده رسید", "View receipt")}
                          </button>
                          {link("ادامه خرید", "Continue shopping", "/shop")}
                        </div>
                      </>
                    )}
                    {attempt.retrySafe && (
                      <div className="payment-status-actions">
                        <button className="button primary" onClick={retry}>
                          {t(
                            "تلاش دوباره با مرور اطلاعات",
                            "Try again after review",
                          )}
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => {
                            retry()
                            onState({
                              ...state,
                              attempt: null,
                              reservation: null,
                              selectedMethod: null,
                            })
                          }}
                        >
                          {t("انتخاب روش دیگر", "Choose another method")}
                        </button>
                        {link("بازگشت به سبد", "Back to cart", "/cart")}
                      </div>
                    )}
                    {![
                      "succeeded",
                      "failed",
                      "cancelled",
                      "late-paid",
                    ].includes(attempt.status) && (
                      <button
                        className="button secondary payment-check-again"
                        onClick={() => {
                          setLongCheck(true)
                          result("unknown")
                        }}
                      >
                        {t(
                          "بررسی دوباره همین تلاش · نمونه",
                          "Check this attempt again · demo",
                        )}
                      </button>
                    )}
                    {attempt.status === "late-paid" && (
                      <p className="checkout-notice warning">
                        {t(
                          "در حال رسیدگی · ارسال هنوز تأیید نشده است. پرداخت مجدد لازم نیست.",
                          "Under review · dispatch has not been confirmed. Do not pay again.",
                        )}
                      </p>
                    )}
                    {link("پشتیبانی", "Support", "/contact")}
                    {receiptOpen && (
                      <section
                        id="demo-payment-receipt"
                        className="payment-receipt"
                      >
                        <h2>
                          {t("خلاصه رسید نمایشی", "Demo receipt summary")}
                        </h2>
                        {attempt.items.map((item, index) => (
                          <div key={index}>
                            <span>
                              {item.name[language]}
                              <small>
                                × {item.quantity} ·{" "}
                                {item.digital
                                  ? t("دیجیتال", "Digital")
                                  : t("فیزیکی", "Physical")}
                              </small>
                            </span>
                            <strong>{money(item.total)}</strong>
                          </div>
                        ))}
                        <div>
                          <span>{t("تخفیف کد", "Code discount")}</span>
                          <strong>
                            − {money(attempt.breakdown.codeDiscount)}
                          </strong>
                        </div>
                        <div>
                          <span>{t("ارسال", "Shipping")}</span>
                          <strong>{money(attempt.breakdown.shipping)}</strong>
                        </div>
                        <div>
                          <span>{t("مالیات", "Tax")}</span>
                          <strong>{money(attempt.breakdown.tax)}</strong>
                        </div>
                        <div>
                          <span>
                            {t("مبلغ کل تأییدشده", "Confirmed total")}
                          </span>
                          <strong>{money(attempt.amount)}</strong>
                        </div>
                        <small>
                          {t(
                            "رسید قانونی یا بانکی نیست؛ مقادیر فاکتور نمونه و درگاه نمونه برابرند.",
                            "Not a legal or bank receipt. Demo invoice and gateway amounts match.",
                          )}
                        </small>
                      </section>
                    )}
                  </>
                )
              )}
              <p className="checkout-demo-banner">
                {t(
                  "نمای وضعیت تراکنش کاملاً نمایشی است؛ نتیجه واقعی مالی ادعا نمی‌شود.",
                  "Transaction status is entirely simulated; no actual financial outcome is claimed.",
                )}
              </p>
            </section>
            <aside className="payment-status-sidebar">
              <span className="eyebrow">A CLEAR NEXT STEP</span>
              <h2>{t("چه اتفاقی می‌افتد؟", "What happens next?")}</h2>
              <ol>
                <li>
                  {t(
                    "تأیید وضعیت از سرویس پرداخت",
                    "Payment service verifies status",
                  )}
                </li>
                <li>
                  {t(
                    "بررسی تخصیص موجودی و سفارش",
                    "Stock allocation and order are checked",
                  )}
                </li>
                <li>
                  {t(
                    "آماده‌سازی و اطلاع‌رسانی تحویل",
                    "Preparation and delivery updates",
                  )}
                </li>
              </ol>
              <p>
                {t(
                  "تا دریافت نتیجه قطعی، دوباره پرداخت نکنید. بستن این صفحه به معنی لغو قطعی نیست.",
                  "Do not pay again until a confirmed result arrives. Closing this page does not confirm cancellation.",
                )}
              </p>
              {link("ارتباط با پشتیبانی", "Contact support", "/contact")}
            </aside>
          </div>
        )}
      </div>
      <CheckoutFooter language={language} onNavigate={onNavigate}>
        <details className="address-demo-states payment-demo-controls">
          <summary>
            {t(
              "حالت‌های نمایشی · PUB-13 تا PUB-16",
              "Prototype states · PUB-13 to PUB-16",
            )}
          </summary>
          <div>
            {[
              ["physical", "فیزیکی / Physical"],
              ["digital", "دیجیتال / Digital"],
              ["mixed", "مختلط / Mixed"],
              ["unselected", "بدون روش / No method"],
              ["terms", "بدون پذیرش / Terms unchecked"],
              ["terms-changed", "نسخه شرایط تازه / New terms version"],
              ["loading", "بارگذاری / Loading"],
              ["disabled", "روش غیرفعال / Disabled method"],
              ["price", "تغییر قیمت / Changed price"],
              ["coupon", "کد نامعتبر / Invalid code"],
              ["stock", "کمبود موجودی / Stock conflict"],
              ["create-error", "خطای ایجاد / Creation error"],
              ["offline", "قطع اتصال / Offline"],
              ["session", "نشست منقضی / Expired session"],
              ["other-tab", "تلاش تب دیگر / Other tab"],
            ].map(([value, label]) => (
              <button
                className="button secondary"
                key={value}
                disabled={busy || activeAttempt(attempt)}
                onClick={() => {
                  if (value === "session") {
                    props.onSession({ status: "expired", demo: true })
                    return
                  }
                  if (["physical", "digital", "mixed"].includes(value)) {
                    key.current = crypto.randomUUID()
                    props.onDemo(
                      value === "physical"
                        ? "payment-physical"
                        : value === "mixed"
                          ? "payment-mixed"
                          : "digital",
                    )
                    setMode("normal")
                    setError("")
                    onNavigate(
                      t("پرداخت نمونه", "Demo payment"),
                      "/checkout/payment",
                    )
                    return
                  }
                  if (value === "price" || value === "coupon") {
                    if (review.total === null) {
                      setError(
                        t(
                          "ابتدا یک checkout نمونه معتبر بارگذاری کنید.",
                          "Load a valid demo checkout first.",
                        ),
                      )
                      return
                    }
                    const partial = {
                      ...state,
                      adjustment: {
                        reason: value as "price" | "coupon",
                        previous: review.total,
                        next: 0,
                        accepted: false,
                        sourceKey,
                      },
                    }
                    const proposed = paymentInvoice(input, partial)
                    onState({
                      ...partial,
                      adjustment: {
                        ...partial.adjustment,
                        next: proposed.total!,
                      },
                    })
                    setMode("normal")
                    setError("")
                    return
                  }
                  if (value === "unselected")
                    onState({ ...state, selectedMethod: null })
                  if (value === "terms")
                    onState({ ...state, acceptedTermsVersion: null })
                  if (value === "terms-changed")
                    onState({
                      ...state,
                      acceptedTermsVersion: "DEMO-OLD-VERSION",
                    })
                  setMode(
                    [
                      "loading",
                      "disabled",
                      "stock",
                      "create-error",
                      "offline",
                      "other-tab",
                    ].includes(value)
                      ? value as Mode
                      : "normal",
                  )
                  setError("")
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {authorizedAttempt &&
            statusPage &&
            attempt &&
            !["succeeded", "failed", "cancelled", "late-paid"].includes(
              attempt.status,
            ) && (
              <>
                <h3>
                  {t("پاسخ سرویس شبیه‌سازی‌شده", "Simulated service response")}
                </h3>
                <div>
                  <button
                    className="button secondary"
                    onClick={() => {
                      if (!state.reservation) return
                      navigateAttempt(
                        demoCallback(
                          {
                            ...state,
                            reservation: {
                              ...state.reservation,
                              status: "expired",
                            },
                          },
                          "unknown",
                        ),
                      )
                    }}
                  >
                    {t("انقضای رزرو · نمونه", "Expired reservation · demo")}
                  </button>
                  {[
                    ["unknown", "نامشخص / Unknown"],
                    ["succeeded", "تأیید موفق / Confirm success"],
                    ["failed", "شکست قطعی / Confirm failure"],
                    ["cancelled", "لغو قطعی / Confirm cancellation"],
                    ["late-paid", "پرداخت دیرهنگام / Late paid"],
                  ].map(([value, label]) => (
                    <button
                      className="button secondary"
                      key={value}
                      onClick={() => result(value as AttemptStatus)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          <p>
            {t(
              "فقط پاسخ سرویس مرجع نتیجه است. رزرو و callback اینجا محلی و نمایشی‌اند. مبلغ summary، CTA و تلاش درگاه یک منبع دارند. ارسال یا آماده‌شدن اثر با پرداخت یکی نیست. وضعیت نامشخص اجازه retry ندارد.",
              "Only the service response determines the outcome. Reservation and callbacks here are local demos. Summary, CTA and gateway attempt share one amount. Payment does not mean dispatch or artwork readiness. Unknown status cannot be retried.",
            )}
          </p>
        </details>
      </CheckoutFooter>
      {!statusPage && !attempt && (
        <div className="payment-mobile-bar">
          <div>
            <small>{t("مبلغ قابل پرداخت", "Total due")}</small>
            <strong>{verified && total !== null ? money(total) : "—"}</strong>
          </div>
          {cta}
          <p className="checkout-continue-reason">{reason}</p>
        </div>
      )}
    </div>
  )
}
function StatusIcon({
  type,
}: {
  type: "shield" | "arrow" | "file" | "clock" | "check" | "close"
}) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === "shield" ? (
        <>
          <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
          <path d="m8 12 3 3 5-6" />
        </>
      ) : type === "file" ? (
        <>
          <path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6" />
        </>
      ) : type === "arrow" ? (
        <path d="M6 18 18 6M6 6h12v12" />
      ) : type === "check" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m7 12 3 3 7-7" />
        </>
      ) : type === "close" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 8 8 8M8 16l8-8" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
    </svg>
  )
}
