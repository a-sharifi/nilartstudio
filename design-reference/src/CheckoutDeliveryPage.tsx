import { useEffect, useRef, useState, type ReactNode } from "react"
import { AddressDetails } from "./CheckoutAddressPage"
import { addressErrors, type AddressCheckout } from "./address"
import {
  checkoutAmounts,
  checkoutRows,
  physicalCheckout,
  type CheckoutSession,
} from "./checkout"
import { evaluateCart, type CartSnapshot } from "./cart"
import CheckoutAmounts from "./CheckoutAmounts"
import {
  CheckoutHeader,
  CheckoutStepper,
  CheckoutFooter,
  CheckoutLink,
} from "./CheckoutChrome"
import {
  deliveryContext,
  deliveryTotal,
  isPhysicalRow,
  requestDemoDelivery,
  validDelivery,
  type DeliveryMode,
  type DeliveryState,
} from "./delivery"
import "./delivery.css"
interface Props {
  language: 0 | 1
  onLanguage: () => void
  onNavigate: (name: string, route: string) => void
  snapshot: CartSnapshot
  selectedIds: string[] | null
  cartMode: string
  couponCode: string
  session: CheckoutSession
  blocked: boolean
  addressState: AddressCheckout
  state: DeliveryState
  onState: (s: DeliveryState) => void
  onDemo: (s: string) => void
  onSession: (s: CheckoutSession) => void
  arrow: ReactNode
}
export default function CheckoutDeliveryPage(props: Props) {
  const {
    language,
    onLanguage,
    onNavigate,
    snapshot,
    selectedIds,
    cartMode,
    couponCode,
    session,
    addressState,
    state,
    onState,
    onDemo,
    onSession,
    arrow,
  } = props
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const money = (n: number) =>
    `${n.toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("تومان", "toman")}`
  const [fallbackIds] = useState(() =>
    evaluateCart(snapshot, cartMode)
      .filter((r) => !r.issue)
      .map((r) => r.line.id),
  )
  const ids = selectedIds ?? fallbackIds
  const rows = checkoutRows(snapshot, ids, cartMode)
  const ready = rows.filter((r) => !r.issue)
  const physical = physicalCheckout(ready)
  const digital = ready.some((r) => !isPhysicalRow(r))
  const artwork = ready.some(
    (r) => isPhysicalRow(r) && r.line.kind === "commission",
  )
  const address = addressState.addresses.find(
    (a) => a.id === addressState.selectedAddressId,
  )
  const addressValid = !!address && !Object.keys(addressErrors(address)).length
  const { coupon, totals } = checkoutAmounts(
    rows,
    couponCode,
    cartMode === "stacking",
  )
  const blocked =
    props.blocked ||
    rows.length !== ids.length ||
    !!coupon.error ||
    rows.some((r) => r.issue) ||
    !rows.length
  const verified = session.status === "verified"
  const context = deliveryContext(address, rows, couponCode)
  const [mode, setMode] = useState<DeliveryMode>("normal")
  const [refresh, setRefresh] = useState(0)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  )
  const [switching, setSwitching] = useState(false)
  const [checking, setChecking] = useState(false)
  const [notice, setNotice] = useState("")
  const [change, setChange] = useState<{
    old: number
    next: number
  } | null>(state.costChange ?? null)
  const [expanded, setExpanded] = useState(false)
  const request = useRef(0)
  const selectionRequest = useRef(0)
  const inFlight = useRef(false)
  const alive = useRef(true)
  const title = useRef<HTMLHeadingElement>(null)
  const latest = useRef(props)
  latest.current = props
  const modeRef = useRef(mode)
  modeRef.current = mode
  const serviceQuote = state.quote
  const quoteMatches =
    !!serviceQuote &&
    serviceQuote.context === context &&
    serviceQuote.validity === "valid"
  const option = serviceQuote?.options.find(
    (o) => o.id === state.selectedDeliveryOption,
  )
  const available =
    verified &&
    addressValid &&
    physical &&
    !blocked &&
    mode !== "offline" &&
    mode !== "items-changed" &&
    mode !== "loading"
  const fresh = quoteMatches && status === "ready" && available && !switching
  const total = fresh ? deliveryTotal(totals.total, option, serviceQuote) : null
  const canContinue =
    fresh && validDelivery(state, context) && !checking && !change
  useEffect(() => {
    alive.current = true
    title.current?.focus({ preventScroll: true })
    return () => {
      alive.current = false
      request.current++
      selectionRequest.current++
    }
  }, [])
  useEffect(() => {
    if (verified && ready.length && !physical && !blocked)
      onNavigate(
        t(
          "این سفارش به ارسال فیزیکی نیاز ندارد.",
          "This order doesn't require physical delivery.",
        ),
        "/checkout/payment",
      )
  }, [verified, physical, blocked])
  useEffect(() => {
    const ticket = ++request.current
    ++selectionRequest.current
    setSwitching(false)
    setChecking(false)
    inFlight.current = false
    if (!available) {
      setStatus(mode === "loading" ? "loading" : "idle")
      return
    }
    const before = latest.current.state
    if (
      before.quote?.context === context &&
      before.quote.validity === "valid" &&
      refresh === 0 &&
      mode === "normal"
    ) {
      setChange(before.costChange ?? null)
      setStatus("ready")
      return
    }
    setStatus("loading")
    requestDemoDelivery(context, rows, mode)
      .then((q) => {
        if (!alive.current || request.current !== ticket) return
        const p = latest.current
        if (p.session.status !== "verified") return
        const old = p.state.quote?.options.find(
          (o) => o.id === p.state.selectedDeliveryOption,
        )
        let selected = p.state.selectedDeliveryOption
        if (selected && !q.options.some((o) => o.id === selected)) {
          selected = null
          setNotice(
            t(
              "روش قبلی دیگر قابل ارائه نیست؛ روش دیگری انتخاب کنید.",
              "Your previous option is no longer available. Choose another delivery method.",
            ),
          )
        } else if (!selected && q.options.length === 1)
          selected = q.options[0].id
        const next = q.options.find((o) => o.id === selected)
        const previousCost =
          p.state.costChange?.old ??
          (old ? old.amount + (p.state.quote?.tax.amount || 0) : null)
        const changed =
          previousCost !== null &&
          !!next &&
          previousCost !== next.amount + q.tax.amount
        const costChange = changed
          ? {
              old: previousCost!,
              next: next!.amount + q.tax.amount,
            }
          : null
        setChange(costChange)
        onState({
          quote: q,
          selectedDeliveryOption: selected,
          acceptedVersion: changed ? null : q.version,
          costChange,
        })
        setStatus("ready")
      })
      .catch(() => {
        if (alive.current && request.current === ticket) setStatus("error")
      })
    return () => {
      if (request.current === ticket) request.current++
    }
  }, [context, verified, addressValid, physical, blocked, mode, refresh])
  const choose = async (id: string) => {
    if (
      !quoteMatches ||
      !available ||
      status !== "ready" ||
      !serviceQuote?.options.some((o) => o.id === id)
    )
      return
    const ticket = ++selectionRequest.current
    onState({
      ...state,
      selectedDeliveryOption: id,
      acceptedVersion: serviceQuote.version,
      costChange: null,
    })
    setChange(null)
    setNotice("")
    setSwitching(true)
    // Local asynchronous summary update; only the newest user selection may resolve.
    await new Promise((resolve) => setTimeout(resolve, 350))
    if (alive.current && ticket === selectionRequest.current)
      setSwitching(false)
  }
  const proceed = async () => {
    if (!canContinue || inFlight.current) return
    inFlight.current = true
    setChecking(true)
    const version = serviceQuote?.version
    await new Promise((resolve) => setTimeout(resolve, 450))
    if (!alive.current) return
    inFlight.current = false
    setChecking(false)
    const p = latest.current
    const latestRows = checkoutRows(
      p.snapshot,
      p.selectedIds ?? fallbackIds,
      p.cartMode,
    )
    const latestAddress = p.addressState.addresses.find(
      (a) => a.id === p.addressState.selectedAddressId,
    )
    const key = deliveryContext(latestAddress, latestRows, p.couponCode)
    if (
      p.session.status !== "verified" ||
      !latestAddress ||
      Object.keys(addressErrors(latestAddress)).length ||
      p.blocked ||
      latestRows.some((r) => r.issue) ||
      latestRows.length !== (p.selectedIds ?? fallbackIds).length ||
      !physicalCheckout(latestRows) ||
      modeRef.current === "offline" ||
      !validDelivery(p.state, key) ||
      p.state.quote?.version !== version ||
      p.state.selectedDeliveryOption !== state.selectedDeliveryOption
    ) {
      setNotice(
        t(
          "اطلاعات این خرید تغییر کرده‌اند؛ روش و هزینه باید دوباره بررسی شوند.",
          "This checkout has changed. Delivery options and cost need to be checked again.",
        ),
      )
      return
    }
    onNavigate(
      t("پرداخت — مقصد پروتوتایپ", "Payment — prototype destination"),
      "/checkout/payment",
    )
  }
  const reason = !verified
    ? t("برای ادامه دوباره وارد شوید.", "Sign in again to continue.")
    : !addressValid
      ? t("ابتدا یک آدرس معتبر انتخاب کنید.", "Choose a valid address first.")
      : blocked
        ? t(
            "اقلام و تغییرات این خرید را دوباره مرور کنید.",
            "Review checkout items and changes first.",
          )
        : mode === "offline"
          ? t(
              "اتصال قطع است؛ پیشنهاد قبلی معتبر برای ادامه نیست.",
              "You're offline. The previous quote cannot be used to continue.",
            )
          : change
            ? t(
                "هزینه تازه را پیش از ادامه تأیید کنید.",
                "Accept the updated cost before continuing.",
              )
            : !fresh
              ? t(
                  "روش و هزینه ارسال باید بررسی شوند.",
                  "Delivery options and cost must be checked.",
                )
              : !option
                ? t("یک روش ارسال انتخاب کنید.", "Choose a delivery method.")
                : t(
                    "در مرحله بعد مبلغ را پیش از پرداخت مرور می‌کنید؛ ادامه پرداخت یا رزرو نیست.",
                    "You'll review the amount again before payment. Continuing does not pay or reserve stock.",
                  )
  const link = (fa: string, en: string, route: string) => (
    <CheckoutLink
      language={language}
      onNavigate={onNavigate}
      fa={fa}
      en={en}
      route={route}
    />
  )
  const retry = () => {
    setMode("normal")
    setRefresh((n) => n + 1)
  }
  const cta = (
    <button
      className="button primary checkout-continue-button"
      disabled={!canContinue}
      onClick={proceed}
      aria-busy={checking}
    >
      {checking
        ? t("در حال بررسی…", "Checking…")
        : t("ادامه به پرداخت", "Continue to payment")}
      {arrow}
    </button>
  )
  const pending = status === "loading" || switching
  return (
    <div className="checkout-page delivery-page">
      <CheckoutHeader
        language={language}
        onLanguage={onLanguage}
        onNavigate={onNavigate}
      />
      <div className="container checkout-content">
        <CheckoutStepper
          language={language}
          onNavigate={onNavigate}
          current={2}
        />
        <div className="checkout-page-heading">
          <span className="eyebrow">NILART STUDIO / DELIVERY</span>
          <h1 id="checkout-title" ref={title} tabIndex={-1}>
            {t("روش ارسال را انتخاب کن", "Choose a delivery method")}
          </h1>
          <p>
            {t(
              "روش‌های قابل ارائه برای آدرس شما را ببین و هزینه و زمان تقریبی آن‌ها را مقایسه کن.",
              "Compare the available delivery options, their costs, and estimated delivery times.",
            )}
          </p>
        </div>
        <p className="checkout-demo-banner">
          {t(
            "پروتوتایپ نمایشی — قیمت‌ها و زمان‌ها نمونه‌اند، نه نرخ حامل یا وعده برند. پرداخت و رزرو موجودی انجام نمی‌شود.",
            "Demo prototype — prices and times are fixtures, not carrier rates or brand promises. No payment or stock reservation is made.",
          )}
        </p>
        <div className="checkout-layout">
          <div className="checkout-main-column">
            <section
              className="address-destination delivery-destination"
              aria-labelledby="delivery-destination-title"
            >
              <div className="address-section-heading">
                <div>
                  <span className="eyebrow">
                    01 / {t("مقصد انتخاب‌شده", "YOUR DESTINATION")}
                  </span>
                  <h2 id="delivery-destination-title">
                    {t("ارسال به", "Deliver to")}
                  </h2>
                </div>
                {link("تغییر آدرس", "Change address", "/checkout/address")}
              </div>
              {verified && addressValid && address ? (
                <AddressDetails address={address} language={language} />
              ) : (
                <p className="checkout-notice">
                  {verified
                    ? t(
                        "مقصد ناقص یا نامعتبر است؛ برای دریافت روش‌ها، آدرس را اصلاح کنید.",
                        "The destination is incomplete or invalid. Update the address to see delivery options.",
                      )
                    : t(
                        "اطلاعات خصوصی تا ورود مجدد پنهان است. ورود مجدد، ادامه خودکار را انجام نمی‌دهد.",
                        "Private information is hidden until you sign in again. Sign-in does not continue automatically.",
                      )}
                  {!verified && link("ورود مجدد", "Sign in again", "/checkout")}
                </p>
              )}
            </section>
            {verified && (
              <>
                {notice && (
                  <p className="checkout-notice warning" role="alert">
                    {notice}
                  </p>
                )}
                {mode === "offline" && (
                  <div className="checkout-notice warning" role="alert">
                    {t(
                      "قطع اتصال · داده قبلی قدیمی است و برای پرداخت استفاده نمی‌شود.",
                      "Offline · previous data is stale and cannot be used for payment.",
                    )}
                    <button className="text-link" onClick={retry}>
                      {t("بررسی دوباره اتصال", "Check connection again")}
                    </button>
                  </div>
                )}
                {mode === "items-changed" && (
                  <div className="checkout-notice warning" role="alert">
                    {t(
                      "اقلام تغییر کرده‌اند؛ روش و هزینه باید دوباره بررسی شوند.",
                      "Items have changed. Delivery options and cost need to be checked again.",
                    )}
                    <button className="text-link" onClick={retry}>
                      {t("محاسبه مجدد", "Recalculate")}
                    </button>
                  </div>
                )}
                {mode === "expired" && (
                  <p className="checkout-notice warning">
                    {pending
                      ? t(
                          "پیشنهاد قبلی منقضی شده است؛ دریافت هزینه تازه…",
                          "The previous quote has expired. Fetching a fresh cost…",
                        )
                      : t(
                          "پیشنهاد تازه دریافت شد؛ تغییر هزینه را بررسی کنید.",
                          "A fresh quote has been received. Review any cost change.",
                        )}
                  </p>
                )}
                <section
                  className="delivery-options-section"
                  aria-labelledby="delivery-options-title"
                >
                  <div className="address-section-heading">
                    <div>
                      <span className="eyebrow">
                        02 / {t("روش ارسال", "DELIVERY OPTIONS")}
                      </span>
                      <h2 id="delivery-options-title">
                        {t("چطور به دستت برسد؟", "How should it reach you?")}
                      </h2>
                    </div>
                    <span className="delivery-demo-tag">
                      {t("داده نمایشی", "Demo data")}
                    </span>
                  </div>
                  <p className="delivery-estimate-note">
                    {t(
                      "زمان‌های نمایش‌داده‌شده تقریبی‌اند؛ زمان حمل پس از آماده‌شدن و ارسال سفارش محاسبه می‌شود.",
                      "Displayed times are estimates. Transit starts after your order is ready and dispatched.",
                    )}
                  </p>
                  {status === "loading" ? (
                    <div
                      className="delivery-skeletons"
                      aria-busy="true"
                      aria-label={t(
                        "دریافت روش‌های ارسال",
                        "Loading delivery options",
                      )}
                    >
                      <div className="skeleton delivery-skeleton" />
                      <div className="skeleton delivery-skeleton" />
                    </div>
                  ) : status === "error" ? (
                    <div className="delivery-empty" role="alert">
                      <DeliveryIcon />
                      <h3>
                        {t(
                          "روش‌های ارسال بارگذاری نشدند.",
                          "We couldn't load delivery options.",
                        )}
                      </h3>
                      <p>
                        {t(
                          "مقصد و انتخاب قبلی حفظ شده‌اند؛ هزینه قدیمی برای ادامه معتبر نیست.",
                          "Your destination and previous choice are kept; the old cost cannot be used to continue.",
                        )}
                      </p>
                      <button className="button secondary" onClick={retry}>
                        {t("دوباره تلاش کنید", "Try again")}
                      </button>
                    </div>
                  ) : fresh && !serviceQuote?.options.length ? (
                    <div className="delivery-empty">
                      <DeliveryIcon />
                      <h3>
                        {t(
                          "برای این مقصد، روش ارسال در دسترس نیست.",
                          "No delivery options are available for this destination.",
                        )}
                      </h3>
                      <p>
                        {t(
                          "آدرس را بررسی کنید یا با پشتیبانی تماس بگیرید.",
                          "Check your address or contact support.",
                        )}
                      </p>
                      <div>
                        {link(
                          "تغییر آدرس",
                          "Change address",
                          "/checkout/address",
                        )}
                        {link("پشتیبانی", "Contact support", "/contact")}
                      </div>
                    </div>
                  ) : quoteMatches && serviceQuote?.options.length ? (
                    <fieldset
                      className="delivery-radiogroup"
                      disabled={!available || status !== "ready" || checking}
                    >
                      <legend className="sr-only">
                        {t("انتخاب روش ارسال", "Choose a delivery method")}
                      </legend>
                      {serviceQuote.options.map((o) => (
                        <label
                          className={`delivery-option ${
                            o.id === state.selectedDeliveryOption
                              ? "selected"
                              : ""
                          }`}
                          key={o.id}
                        >
                          <input
                            type="radio"
                            name="delivery-method"
                            value={o.id}
                            checked={o.id === state.selectedDeliveryOption}
                            onChange={() => choose(o.id)}
                          />
                          <span className="delivery-option-body">
                            <span className="delivery-option-top">
                              <strong>{o.name[language]}</strong>
                              <span className="delivery-option-price">
                                {money(o.amount)}
                              </span>
                            </span>
                            <span className="delivery-option-description">
                              {o.description[language]}
                            </span>
                            <span className="delivery-transit">
                              <DeliveryIcon />
                              <span>
                                <small>
                                  {t(
                                    "زمان حمل پس از ارسال",
                                    "Transit after dispatch",
                                  )}
                                </small>
                                <span>{o.transit[language]}</span>
                              </span>
                            </span>
                            {o.id === state.selectedDeliveryOption && (
                              <span className="delivery-selected-mark">
                                {t(
                                  "انتخاب این خرید",
                                  "Selected for this checkout",
                                )}
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  ) : (
                    <p className="checkout-notice">{reason}</p>
                  )}
                  {switching && (
                    <p className="delivery-calculating" role="status">
                      {t(
                        "در حال به‌روزرسانی هزینه و زمان…",
                        "Updating cost and transit estimate…",
                      )}
                    </p>
                  )}
                  {!option && fresh && !!serviceQuote?.options.length && (
                    <p className="delivery-selection-helper">
                      {t(
                        "انتخاب با شماست؛ یک روش را برای این خرید مشخص کنید.",
                        "It's your choice. Select a method for this checkout.",
                      )}
                    </p>
                  )}
                  {mode === "single" && option && (
                    <p className="delivery-selection-helper">
                      {t(
                        "فقط یک روش قابل ارائه است؛ نام و هزینه آن را پیش از ادامه بررسی کنید.",
                        "Only one option is available. Review its name and cost before continuing.",
                      )}
                    </p>
                  )}
                </section>
                {change && fresh && (
                  <section className="delivery-cost-change" role="alert">
                    <h3>
                      {t(
                        "هزینه ارسال تغییر کرده است؛ لطفاً مبلغ جدید را بررسی کنید.",
                        "Delivery cost has changed; please review the updated amount.",
                      )}
                    </h3>
                    <div>
                      <span>
                        {t("هزینه قبلی", "Previous cost")}
                        <strong>{money(change.old)}</strong>
                      </span>
                      <span>
                        {t("هزینه جدید", "Updated cost")}
                        <strong>{money(change.next)}</strong>
                      </span>
                    </div>
                    <p>
                      {t(
                        "مجموع قبلی / جدید با اقلام فعلی:",
                        "Previous / updated total with current items:",
                      )}{" "}
                      <bdi>
                        {money(totals.total + change.old)} →{" "}
                        {money(totals.total + change.next)}
                      </bdi>
                    </p>
                    <button
                      className="button primary"
                      onClick={() => {
                        if (!serviceQuote) return
                        onState({
                          ...state,
                          acceptedVersion: serviceQuote.version,
                          costChange: null,
                        })
                        setChange(null)
                      }}
                    >
                      {t("تأیید هزینه جدید", "Accept updated delivery cost")}
                    </button>
                  </section>
                )}
                {fresh && option && (
                  <section className="delivery-groups">
                    <button
                      className="delivery-group-toggle"
                      aria-expanded={expanded}
                      aria-controls="delivery-groups-content"
                      onClick={() => setExpanded(!expanded)}
                    >
                      <span>
                        <span className="eyebrow">
                          03 / {t("جزئیات تحویل", "DELIVERY DETAILS")}
                        </span>
                        <strong>
                          {option.groups.length.toLocaleString(
                            language === 0 ? "fa-IR" : "en-US",
                          )}{" "}
                          {t(
                            "مرسوله فیزیکی · نمونه",
                            "physical shipment(s) · demo",
                          )}
                        </strong>
                      </span>
                      <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                    </button>
                    {expanded && (
                      <div id="delivery-groups-content">
                        {option.groups.map((g) => (
                          <div className="delivery-group" key={g.id}>
                            <h3>{g.title[language]}</h3>
                            <ul>
                              {g.itemIds.map((id) => (
                                <li key={id}>
                                  {
                                    ready.find((r) => r.line.id === id)?.name[
                                      language
                                    ]
                                  }
                                </li>
                              ))}
                            </ul>
                            <dl>
                              <div>
                                <dt>
                                  {t("آماده‌سازی سفارش", "Preparation time")}
                                </dt>
                                <dd>{g.preparation[language]}</dd>
                              </div>
                              <div>
                                <dt>
                                  {t(
                                    "حمل پس از ارسال",
                                    "Transit after dispatch",
                                  )}
                                </dt>
                                <dd>{g.transit[language]}</dd>
                              </div>
                              <div>
                                <dt>
                                  {t(
                                    "روش و هزینه این گروه",
                                    "Group method & cost",
                                  )}
                                </dt>
                                <dd>
                                  {option.name[language]} · {money(g.cost)}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        ))}
                        <p className="delivery-estimate-note">
                          {t(
                            "تقسیم مرسوله و هزینه‌ها از پیشنهاد نمونه می‌آیند؛ از تعداد کالا یا اجزای پکیج حدس زده نشده‌اند. بسته‌بندی محصول دوباره اضافه نشده است.",
                            "Shipment groups and costs come from the demo quote, not item or bundle-component counts. Product packaging is not charged again.",
                          )}
                        </p>
                      </div>
                    )}
                    {option.groups.length > 1 && (
                      <p className="delivery-estimate-note">
                        {t(
                          "ممکن است اقلام سفارش در زمان‌های متفاوت تحویل داده شوند.",
                          "Your items may be delivered at different times.",
                        )}
                      </p>
                    )}
                  </section>
                )}
                {artwork && (
                  <div className="delivery-info-note">
                    <h3>
                      {t(
                        "آماده‌سازی نقاشی، جدا از حمل",
                        "Artwork preparation is separate from transit",
                      )}
                    </h3>
                    <p>
                      {t(
                        "زمان اجرای توافق‌شده هنرمند مستقل از حمل است. بازه حمل، زمان نهایی تحویل نقاشی نیست.",
                        "The artist's agreed execution time is independent of transit. Transit estimates are not the final artwork delivery date.",
                      )}
                    </p>
                  </div>
                )}
                {digital && (
                  <div className="delivery-info-note digital">
                    <h3>{t("تحویل دیجیتال", "Digital delivery")}</h3>
                    <p>
                      {t(
                        "فایل دیجیتال پس از آماده‌شدن در حساب شما قرار می‌گیرد و هزینه حمل فیزیکی ندارد. پرداخت به معنی دانلود فوری همه فایل‌ها نیست.",
                        "Your digital file will be available in your account when ready and has no physical shipping charge. Payment does not mean every file is immediately downloadable.",
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <aside className="checkout-summary-column">
            <section className="checkout-summary">
              <span className="eyebrow">YOUR ORDER, AT A GLANCE</span>
              <h2>{t("خلاصه این خرید", "Your order summary")}</h2>
              <p className="checkout-summary-count">
                {ready.length.toLocaleString(
                  language === 0 ? "fa-IR" : "en-US",
                )}{" "}
                {t("قلم آماده", "ready items")}
              </p>
              {verified ? (
                <>
                  <details className="address-order-items">
                    <summary>
                      {t("مشاهده اقلام سفارش", "View order items")}
                    </summary>
                    {ready.map((r) => (
                      <div key={r.line.id}>
                        {r.name[language]}
                        <small>
                          × {r.quantity} ·{" "}
                          {isPhysicalRow(r)
                            ? t("فیزیکی", "Physical")
                            : t("دیجیتال · بدون حمل", "Digital · no shipping")}
                        </small>
                      </div>
                    ))}
                  </details>
                  <CheckoutAmounts
                    rows={ready}
                    code={couponCode}
                    stacking={cartMode === "stacking"}
                    language={language}
                  />
                  <div className="delivery-summary-cost">
                    <div>
                      <span>{t("ارسال منتخب", "Selected delivery")}</span>
                      <strong>
                        {fresh && option
                          ? money(option.amount)
                          : pending
                            ? t("در حال محاسبه…", "Calculating…")
                            : "—"}
                      </strong>
                    </div>
                    {fresh && option && <small>{option.name[language]}</small>}
                    <div>
                      <span>{t("مالیات", "Tax")}</span>
                      <strong>
                        {fresh && serviceQuote
                          ? money(serviceQuote.tax.amount)
                          : "—"}
                      </strong>
                    </div>
                    <small>
                      {t(
                        "مالیات صفر فقط تنظیم نمونه این quote است؛ سیاست واقعی فروشگاه نیست.",
                        "Zero tax is only this demo quote's setting, not store policy.",
                      )}
                    </small>
                  </div>
                  <div
                    className="delivery-order-total"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <span>
                      {change
                        ? t(
                            "مجموع تازه · نیازمند تأیید",
                            "Updated total · needs approval",
                          )
                        : t(
                            "مجموع با روش ارسال منتخب",
                            "Total with selected delivery",
                          )}
                    </span>
                    <strong>
                      {total !== null
                        ? money(total)
                        : pending
                          ? t("در حال محاسبه…", "Calculating…")
                          : "—"}
                    </strong>
                  </div>
                </>
              ) : (
                <p className="checkout-notice">
                  {t(
                    "اطلاعات خرید پس از ورود مجدد نمایش داده می‌شود.",
                    "Checkout details appear after sign-in.",
                  )}
                </p>
              )}
              <p className="checkout-shipping-note">
                {t(
                  "کد تخفیف فقط روی اقلام اعمال می‌شود؛ ارسال از آن مستثناست.",
                  "Discount codes apply to items only, not delivery.",
                )}
              </p>
              {cta}
              <p className="checkout-continue-reason">{reason}</p>
              {link("بازگشت به آدرس", "Back to address", "/checkout/address")}
            </section>
          </aside>
        </div>
      </div>
      <CheckoutFooter language={language} onNavigate={onNavigate}>
        <details className="address-demo-states">
          <summary>
            {t(
              "حالت‌های نمایشی و تحویل · PUB-12",
              "Prototype states & handoff · PUB-12",
            )}
          </summary>
          <div>
            {[
              ["normal", "دو روش / Two options"],
              ["unselected", "بدون انتخاب / No selection"],
              ["single", "یک روش / One option"],
              ["loading", "بارگذاری / Loading"],
              ["error", "خطای سرویس / Service error"],
              ["none", "بدون روش / No options"],
              ["changed", "هزینه جدید / Updated cost"],
              ["expired", "quote منقضی / Expired quote"],
              ["removed", "روش حذف‌شده / Removed option"],
              ["items-changed", "اقلام تغییرکرده / Changed items"],
              ["mixed", "مختلط / Mixed"],
              ["multiple", "چند مرسوله / Multiple shipments"],
              ["offline", "قطع اتصال / Offline"],
              ["session", "نشست منقضی / Expired session"],
              ["digital", "فقط دیجیتال / Digital only"],
            ].map(([value, label]) => (
              <button
                key={value}
                className="button secondary"
                onClick={async () => {
                  request.current++
                  selectionRequest.current++
                  setChange(null)
                  setNotice("")
                  setExpanded(value === "multiple")
                  if (value === "session") {
                    onSession({ status: "expired", demo: true })
                    return
                  }
                  onDemo(
                    value === "digital"
                      ? "digital"
                      : value === "mixed"
                        ? "delivery-mixed"
                        : "verified",
                  )
                  const demoMode = ["unselected", "mixed", "digital"].includes(
                    value,
                  )
                    ? "normal"
                    : value as DeliveryMode
                  // Seed old values only for explicit scenario controls, never on normal checkout entry.
                  if (["changed", "expired", "removed"].includes(value)) {
                    const ticket = ++request.current
                    const q = await requestDemoDelivery(context, rows, "normal")
                    if (!alive.current || request.current !== ticket) return
                    onState({
                      quote: {
                        ...q,
                        validity: value === "expired" ? "expired" : "valid",
                      },
                      selectedDeliveryOption: "standard",
                      acceptedVersion: q.version,
                    })
                  } else
                    onState({
                      quote: null,
                      selectedDeliveryOption:
                        value === "normal" ||
                        value === "multiple" ||
                        value === "mixed"
                          ? "standard"
                          : null,
                      acceptedVersion: null,
                    })
                  setMode(demoMode)
                  setRefresh((n) => n + 1)
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p>
            {t(
              "PUB-12 · adapter محلی، بدون حامل واقعی. quote به مقصد و اقلام متصل است؛ آماده‌سازی جدا از حمل؛ دیجیتال بدون حمل؛ تغییر هزینه نیازمند تأیید. تعداد مرسوله از fixture مشخص می‌آید. وزن و تعرفه واقعی ارائه نشده‌اند. ادامه هنوز پرداخت یا رزرو نیست.",
              "PUB-12 · Local adapter, no real carrier. Quotes are bound to destination and items; preparation is separate from transit; digital has no shipping; cost changes need approval. Shipment counts come from explicit fixtures. Real weights and tariffs were not supplied. Continuing does not pay or reserve stock.",
            )}
          </p>
        </details>
      </CheckoutFooter>
      <div className="delivery-mobile-bar">
        <div>
          <small>
            {t("مجموع با ارسال منتخب", "Total with selected delivery")}
          </small>
          <strong>{total !== null && verified ? money(total) : "—"}</strong>
        </div>
        {cta}
        <p className="checkout-continue-reason">{reason}</p>
      </div>
    </div>
  )
}
function DeliveryIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7h11v11H3zM14 11h4l3 4v3h-7M3 11h11" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  )
}
