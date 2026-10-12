import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import {
  cancellationFixture,
  cancellationReasons,
  demoCancellationContract,
  demoCancellationIds,
  validateCancellation,
  type CancelMode,
  type CancelSelection,
} from "./cancellation"
import "./cancellation.css"

type Submission = "idle" | "submitting" | "success" | "network" | "server" | "unknown" | "changed"
const previews: [CancelMode, string, string][] = [
  ["normal", "محصول و پکیج", "Products & bundle"],
  ["commission", "نقاشی و فایل دیجیتال", "Commission & digital"],
  ["payment", "پرداخت نامشخص", "Unknown payment"],
  ["active", "درخواست قبلی", "Existing request"],
  ["changed", "تغییر وضعیت هنگام ارسال", "Order changes at submission"],
  ["loading", "بارگذاری", "Loading"],
  ["empty", "نبود قلم مجاز", "No eligible items"],
  ["network", "خطای ارسال شبکه", "Submission network error"],
  ["server", "خطای سرور", "Server error"],
  ["unknown", "نتیجه نامشخص ارسال", "Unknown submission result"],
  ["denied", "عدم دسترسی", "Access denied"],
]
export default function CancellationPage({
  page,
  navigate,
  renderMedia,
}: {
  page: string
  navigate: (route: string) => void
  renderMedia: (color: string, kind: string) => ReactNode
}) {
  const en = page.startsWith("/en/")
  const index = en ? 1 : 0
  const t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa"
  const orderId = page.split("/")[4]
  const valid = demoCancellationIds.includes(orderId)
  const [mode, setMode] = useState<CancelMode>("normal")
  const [selection, setSelection] = useState<CancelSelection>({})
  const [scope, setScope] = useState<"all" | "selected">("selected")
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submission, setSubmission] = useState<Submission>("idle")
  const [live, setLive] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [destination, setDestination] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [orderChanged, setOrderChanged] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const origin = useRef<HTMLElement | null>(null)
  const form = useRef<HTMLFormElement>(null)
  const result = useRef<HTMLElement>(null)
  const lock = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const effectiveMode = valid ? mode : "denied"
  const items = cancellationFixture(effectiveMode)
  const changed = orderChanged
  const currentItems = changed
    ? items.map((item) =>
        item.id === "notebook"
          ? { ...item, allowed: 0, availability: "unavailable" as const }
          : item,
      )
    : items
  const eligible = currentItems.filter(
    (item) =>
      item.allowed > 0 &&
      !item.activeRequest &&
      item.availability !== "unavailable",
  )
  const chosen = currentItems.filter((item) => item.id in selection)
  const selectedReason = cancellationReasons.find(
    (option) => option.id === reason,
  )
  const pending = submission === "submitting"
  const blocked = pending || submission === "unknown" || checking
  const orderRoute = `${prefix}/account/orders/${orderId}`
  const amount = (value: number) => (
    <span className="cancel-money">
      <bdi>{value.toLocaleString(en ? "en" : "fa")}</bdi>{" "}
      <small>{t("تومان", "IRT")}</small>
    </span>
  )
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  useEffect(() => {
    if (destination) dialog.current?.showModal()
    else if (dialog.current?.open) dialog.current.close()
  }, [destination])
  useEffect(() => {
    if (submission === "success")
      result.current?.focus({ preventScroll: false })
  }, [submission])
  const close = () => {
    setDestination(null)
    requestAnimationFrame(() => origin.current?.focus())
  }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (
      route === `${prefix}/account` ||
      route.startsWith(`${prefix}/account/requests/`) ||
      route.includes("/auth/") ||
      /\/(receipt|cancel|return)$/.test(route)
    )
      navigate(route)
    else {
      origin.current = event.currentTarget
      setDestination(route)
    }
  }
  const changeSelection = (id: string, raw?: string) => {
    if (blocked) return
    setScope("selected")
    setSelection((previous) => {
      const next = { ...previous }
      if (raw === undefined) delete next[id]
      else next[id] = raw
      return next
    })
    setErrors((previous) => {
      const next = { ...previous }
      delete next.items
      delete next[`quantity-${id}`]
      return next
    })
  }
  const chooseScope = (value: "all" | "selected") => {
    setScope(value)
    if (value === "all") {
      setSelection(
        Object.fromEntries(
          eligible.map((item) => [item.id, String(item.allowed)]),
        ),
      )
      setErrors({})
    }
  }
  const errorText = (code: string) =>
    ({
      select: t("حداقل یک قلم انتخاب کنید.", "Select at least one item."),
      quantity: t(
        "تعداد را در محدوده مجاز وارد کنید.",
        "Enter a quantity within the allowed range.",
      ),
      reason: t("علت درخواست را انتخاب کنید.", "Choose a cancellation reason."),
      details: t("توضیح لازم را وارد کنید.", "Provide the required details."),
      length: t(
        "توضیح از حد مجاز نمونه بیشتر است.",
        "Details exceed the demo limit.",
      ),
    })[code]
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (lock.current || blocked || submission === "success" || !eligible.length)
      return
    const validation = validateCancellation(
      currentItems,
      selection,
      reason,
      details,
    )
    setErrors(validation)
    if (Object.keys(validation).length) {
      const field = Object.keys(validation)[0]
      const target = field === "items" ? "cancel-items" : field
      requestAnimationFrame(() =>
        form.current?.querySelector<HTMLElement>(`[id="${target}"]`)?.focus(),
      )
      return
    }
    lock.current = true
    setSubmission("submitting")
    setLive(
      t(
        "Demo: در حال اعتبارسنجی مجدد مجوز، تعداد و نسخه وضعیت…",
        "Demo: rechecking permission, quantity and order version…",
      ),
    )
    timer.current = setTimeout(() => {
      const outcome =
        mode === "changed" && !orderChanged
          ? "changed"
          : ["network", "server", "unknown"].includes(mode)
            ? mode as Submission
            : "success"
      // This simulates an explicit fixture response, never an actual financial operation.
      setSubmission(outcome)
      lock.current = outcome === "unknown" || outcome === "success"
      if (outcome === "changed") {
        setOrderChanged(true)
        setErrors(
          "notebook" in selection ? { "quantity-notebook": "quantity" } : {},
        )
        setLive(
          t(
            "وضعیت سفارش تغییر کرده است. انتخاب‌ها را دوباره بررسی کنید. تعداد مجاز دفتر اکنون صفر است · Demo",
            "The order status has changed. Review your selections. The notebook allowed quantity is now zero · Demo",
          ),
        )
        requestAnimationFrame(() =>
          form.current?.querySelector<HTMLElement>("#cancel-items")?.focus(),
        )
      } else
        setLive(
          outcome === "success"
            ? t(
                "پاسخ ثبت درخواست شبیه‌سازی شد · Demo؛ لغو یا بازپرداخت تأیید نشده است.",
                "Request registration response simulated · Demo; no cancellation or refund is confirmed.",
              )
            : outcome === "unknown"
              ? t(
                  "نتیجه ثبت درخواست هنوز تأیید نشده است.",
                  "Request submission has not been confirmed yet.",
                )
              : t(
                  "ثبت درخواست تأیید نشد؛ ورودی‌های شما حفظ شده‌اند.",
                  "Registration was not confirmed; your inputs have been preserved.",
                ),
        )
    }, 800)
  }
  const checkUnknown = () => {
    if (checking) return
    setChecking(true)
    timer.current = setTimeout(() => {
      setChecking(false)
      setLive(
        t(
          "Demo: وضعیت همچنان نامشخص است. درخواست دیگری ارسال نشد؛ سرویس متصل نیست.",
          "Demo: the result is still unknown. No new request was submitted; no service is connected.",
        ),
      )
    }, 700)
  }
  const preview = (value: CancelMode) => {
    if (timer.current) clearTimeout(timer.current)
    lock.current = false
    setMode(value)
    setSelection({})
    setScope("selected")
    setErrors({})
    setSubmission("idle")
    setLive("")
    setChecking(false)
    setOrderChanged(false)
    setReason("")
    setDetails("")
    setExpanded(false)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderId)
      setLive(t("کپی شد", "Copied"))
    } catch {
      setLive(
        t(
          "کپی ممکن نشد؛ شماره سفارش را انتخاب و کپی کنید.",
          "Unable to copy. Select and copy the order number.",
        ),
      )
    }
  }
  return (
    <DashboardPage
      page={page}
      navigate={navigate}
      renderMedia={renderMedia}
      panelTitle={t("درخواست لغو سفارش", "Request order cancellation")}
    >
      <div className="cancel-page">
        <nav
          className="cancel-breadcrumb"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          <a href={`${prefix}/account`} onClick={follow(`${prefix}/account`)}>
            {t("حساب", "Account")}
          </a>
          <span>/</span>
          <a
            href={`${prefix}/account/orders`}
            onClick={follow(`${prefix}/account/orders`)}
          >
            {t("سفارش‌ها", "Orders")}
          </a>
          <span>/</span>
          <a href={orderRoute} onClick={follow(orderRoute)}>
            <bdi>{valid ? orderId : "—"}</bdi>
          </a>
          <span>/</span>
          <span aria-current="page">
            {t("درخواست لغو", "Cancellation request")}
          </span>
        </nav>
        <div className="cancel-heading">
          <span className="cancel-eyebrow">YOUR ACCOUNT · USER-05</span>
          <h1>{t("درخواست لغو سفارش", "Request order cancellation")}</h1>
          <p>
            {t(
              "اقلام موردنظر را انتخاب کنید. امکان لغو بر اساس مرحله سفارش و شرایط مربوط بررسی می‌شود.",
              "Select the relevant items. Cancellation eligibility depends on the order stage and applicable conditions.",
            )}
          </p>
        </div>
        <div className="cancel-demo">
          <span>Demo</span>
          <p>
            {t(
              "همه اقلام، مجوزها، شرایط و پاسخ‌ها نمونه طراحی‌اند. سرویس واقعی ثبت درخواست متصل نیست.",
              "All items, permissions, conditions and responses are design fixtures. No real request service is connected.",
            )}
          </p>
        </div>
        <div className="cancel-live" role="status" aria-live="polite">
          {live}
        </div>
        {effectiveMode === "denied" ? (
          <section className="cancel-state">
            <Glyph name="shield" size={32} />
            <h2>
              {t(
                "دسترسی به این سفارش ممکن نیست.",
                "This order cannot be accessed.",
              )}
            </h2>
            <p>
              {t(
                "نمایش اطلاعات نیازمند تأیید مالکیت و مجوز سرویس است.",
                "Displaying information requires service ownership and permission checks.",
              )}
            </p>
            <a
              className="text-link"
              href={`${prefix}/account`}
              onClick={follow(`${prefix}/account`)}
            >
              {t("بازگشت به حساب", "Back to account")}
            </a>
          </section>
        ) : effectiveMode === "loading" ? (
          <div
            className="cancel-loading"
            aria-busy="true"
            aria-label={t(
              "در حال بررسی سفارش و امکان درخواست",
              "Loading order and eligibility",
            )}
          >
            <div className="skeleton" />
            <div className="cancel-grid">
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          </div>
        ) : submission === "success" ? (
          <section ref={result} tabIndex={-1} className="cancel-success">
            <span className="cancel-success-icon">
              <Glyph name="check" size={32} />
            </span>
            <span className="cancel-eyebrow">DEMO · REQUEST RESPONSE</span>
            <h2>
              {t(
                "درخواست لغو ثبت شد · Demo",
                "Cancellation request submitted · Demo",
              )}
            </h2>
            <p>
              {t(
                "این نتیجه شبیه‌سازی شده است؛ درخواست واقعی، لغو یا بازپرداخت انجام نشده است.",
                "This result is simulated; no actual request, cancellation or refund has occurred.",
              )}
            </p>
            <dl>
              <div>
                <dt>{t("شناسه درخواست نمونه", "Demo request ID")}</dt>
                <dd>
                  <bdi>CR-2056</bdi>
                </dd>
              </div>
              <div>
                <dt>{t("زمان ثبت نمونه", "Demo submission time")}</dt>
                <dd>
                  {t("۱۹ خرداد ۱۴۰۴، ساعت ۱۰:۳۰", "9 June 2025, 10:30")}{" "}
                  <bdi>(Asia/Tehran)</bdi>
                </dd>
              </div>
              <div>
                <dt>{t("وضعیت اولیه", "Initial status")}</dt>
                <dd>{t("در انتظار بررسی · Demo", "Awaiting review · Demo")}</dd>
              </div>
            </dl>
            <div className="cancel-success-items">
              {chosen.map((item) => (
                <p key={item.id}>
                  {item.title[index]}{" "}
                  <strong>
                    × <bdi>{selection[item.id]}</bdi>
                  </strong>
                </p>
              ))}
            </div>
            <p>
              {t(
                "نتیجه بررسی و وضعیت بازپرداخت، در صورت تأیید، جداگانه اعلام می‌شوند.",
                "The review outcome and any approved refund status will be shown separately.",
              )}
            </p>
            <a
              className="button primary"
              href={`${prefix}/account/requests/CR-2056`}
              onClick={follow(`${prefix}/account/requests/CR-2056`)}
            >
              {t("مشاهده وضعیت درخواست", "View request status")}
              <Glyph name="arrow" size={17} />
            </a>
            <a
              className="text-link"
              href={orderRoute}
              onClick={follow(orderRoute)}
            >
              {t("بازگشت به سفارش", "Back to order")}
            </a>
          </section>
        ) : (
          <>
            <section className="cancel-order-strip">
              <div>
                <span className="cancel-small-label">
                  {t("شماره سفارش", "Order number")}
                </span>
                <strong className="cancel-order-id">
                  <bdi>{orderId}</bdi>
                  <button
                    className="icon-button"
                    aria-label={t("کپی شماره سفارش", "Copy order number")}
                    onClick={copy}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <rect x="8" y="8" width="12" height="13" rx="2" />
                      <path d="M15 8V3H3v13h5" />
                    </svg>
                  </button>
                </strong>
                <small>{t("۱۸ خرداد ۱۴۰۴", "8 June 2025")}</small>
              </div>
              <div>
                <span className="cancel-small-label">
                  {t("وضعیت پرداخت", "Payment status")}
                </span>
                <span
                  className={`cancel-badge ${
                    mode === "payment" ? "review" : "available"
                  }`}
                >
                  <Glyph
                    name={mode === "payment" ? "clock" : "check"}
                    size={14}
                  />
                  {mode === "payment"
                    ? t("در حال بررسی", "Under verification")
                    : t("تأییدشده", "Confirmed")}
                </span>
                <small>Demo</small>
              </div>
              <div>
                <span className="cancel-small-label">
                  {t("مبلغ تاریخی سفارش", "Historical order total")}
                </span>
                <strong>
                  {amount(mode === "commission" ? 4840000 : 1881000)}
                </strong>
                <small>
                  {t("واحد پول ثابت است", "Currency stays unchanged")}
                </small>
              </div>
              <a
                className="text-link"
                href={orderRoute}
                onClick={follow(orderRoute)}
              >
                {t("مشاهده سفارش", "View order")}
                <Glyph name="arrow" size={16} />
              </a>
            </section>
            {mode === "payment" && (
              <div className="cancel-notice">
                <Glyph name="clock" />
                <div>
                  <strong>
                    {t(
                      "نتیجه پرداخت هنوز مشخص نیست.",
                      "The payment result is not yet confirmed.",
                    )}
                  </strong>
                  <p>
                    {t(
                      "درخواست شما مطابق وضعیت تأییدشده تراکنش بررسی می‌شود. دوباره پرداخت نکنید.",
                      "Your request will be reviewed against the verified transaction status. Do not pay again.",
                    )}
                  </p>
                  <small>
                    {t(
                      "پاسخ Demo اجازه ثبت درخواست برای بررسی را می‌دهد.",
                      "The Demo response allows submission for review.",
                    )}
                  </small>
                </div>
              </div>
            )}
            <form
              ref={form}
              noValidate
              onSubmit={submit}
              className="cancel-grid"
            >
              <div className="cancel-primary">
                <section className="cancel-conditions">
                  <span className="cancel-condition-symbol">
                    <Glyph name="shield" size={22} />
                  </span>
                  <div>
                    <h2>{t("قبل از ثبت درخواست", "Before you submit")}</h2>
                    <p>
                      {t(
                        "هر قلم بر اساس شرایط توافق‌شده همان سفارش بررسی می‌شود. انتخاب قلم، تضمین لغو نیست.",
                        "Each item is reviewed under the conditions agreed for this order. Selecting an item does not guarantee cancellation.",
                      )}
                    </p>
                    <a
                      className="text-link"
                      href={`${orderRoute}/conditions`}
                      onClick={follow(`${orderRoute}/conditions`)}
                    >
                      {t(
                        "شرایط لغو و مرجوعی",
                        "Cancellation and returns conditions",
                      )}
                      <Glyph name="arrow" size={15} />
                    </a>
                    <small>
                      {t(
                        "نسخه توافق و وضعیت نمونه",
                        "Demo agreement and order version",
                      )}
                      :{" "}
                      <bdi>
                        {demoCancellationContract.policy} ·{" "}
                        {demoCancellationContract.version}
                      </bdi>
                    </small>
                  </div>
                </section>
                <fieldset
                  className="cancel-items"
                  id="cancel-items"
                  tabIndex={-1}
                  aria-describedby={
                    errors.items ? "cancel-items-error" : undefined
                  }
                  disabled={blocked}
                >
                  <legend>
                    <span className="cancel-step">۱</span>
                    {t("انتخاب اقلام", "Select items")}
                  </legend>
                  <p className="cancel-section-description">
                    {t(
                      "اقلام غیرمجاز نیز با دلیل مشخص نمایش داده شده‌اند.",
                      "Unavailable items remain visible with a clear explanation.",
                    )}
                  </p>
                  <div className="cancel-scope">
                    {(["all", "selected"] as const).map((value) => (
                      <label
                        key={value}
                        className={scope === value ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name="scope"
                          value={value}
                          checked={scope === value}
                          onChange={() => chooseScope(value)}
                          disabled={!eligible.length}
                        />
                        <span>
                          {value === "all"
                            ? t("همه اقلام قابل درخواست", "All eligible items")
                            : t("انتخاب اقلام", "Select items")}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.items && (
                    <p id="cancel-items-error" className="cancel-field-error">
                      {errorText(errors.items)}
                    </p>
                  )}
                  {!eligible.length && (
                    <div className="cancel-empty">
                      <Glyph name="box" size={22} />
                      <p>
                        {t(
                          "در حال حاضر قلمی برای درخواست لغو در دسترس نیست.",
                          "No items are currently available for cancellation requests.",
                        )}
                      </p>
                      <a
                        href={`${prefix}/account/support?order=${orderId}`}
                        className="text-link"
                        onClick={follow(
                          `${prefix}/account/support?order=${orderId}`,
                        )}
                      >
                        {t("پشتیبانی", "Support")}
                      </a>
                    </div>
                  )}
                  {currentItems.map((item) => {
                    const selected = item.id in selection
                    const unavailable =
                      item.allowed === 0 || item.availability === "unavailable"
                    const invalid = !!errors[`quantity-${item.id}`]
                    return (
                      <article
                        className={`cancel-item ${
                          selected ? "is-selected" : ""
                        } ${unavailable ? "is-unavailable" : ""}`}
                        key={item.id}
                      >
                        <div className="cancel-item-top">
                          <label
                            className="cancel-check"
                            aria-label={`${t("انتخاب", "Select")} ${item.title[index]}`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={unavailable}
                              onChange={(event) =>
                                changeSelection(
                                  item.id,
                                  event.target.checked ? "1" : undefined,
                                )
                              }
                            />
                          </label>
                          <div className="cancel-item-thumb">
                            {item.kind === "commission" ||
                            item.kind === "digital" ||
                            item.kind === "artwork" ? (
                              <div className="cancel-neutral-art">
                                <Glyph
                                  name={
                                    item.kind === "digital"
                                      ? "download"
                                      : "paint"
                                  }
                                  size={25}
                                />
                                <small>
                                  {item.kind === "commission"
                                    ? t("اثر خصوصی", "Private artwork")
                                    : t("نمونه", "Demo")}
                                </small>
                              </div>
                            ) : (
                              renderMedia(
                                item.kind === "bundle" ? "sage" : "sand",
                                "book",
                              )
                            )}
                          </div>
                          <div className="cancel-item-info">
                            <h3>{item.title[index]}</h3>
                            <p>{item.options[index]}</p>
                            <span className="cancel-item-stage">
                              {item.stage[index]}
                            </span>
                          </div>
                        </div>
                        <div className="cancel-item-meta">
                          <span className={`cancel-badge ${item.availability}`}>
                            <Glyph
                              name={
                                item.availability === "available"
                                  ? "check"
                                  : item.availability === "review"
                                    ? "clock"
                                    : "box"
                              }
                              size={13}
                            />
                            {item.availability === "available"
                              ? t("قابل درخواست", "Request available")
                              : item.availability === "review"
                                ? t("نیازمند بررسی", "Requires review")
                                : t(
                                    "برای لغو در دسترس نیست",
                                    "Not available for cancellation",
                                  )}
                          </span>
                          <span>
                            {t("تعداد ثبت‌شده", "Purchased")}:{" "}
                            <bdi>{item.purchased}</bdi>
                          </span>
                          <span>
                            {t("تعداد مجاز", "Allowed")}:{" "}
                            <bdi>{item.allowed}</bdi>
                          </span>
                        </div>
                        <p className="cancel-item-note">
                          {changed && item.id === "notebook"
                            ? t(
                                "وضعیت این قلم تغییر کرده است · Demo. انتخاب قبلی حفظ شده؛ آن را صریحاً حذف کنید.",
                                "This item’s status changed · Demo. The old selection is preserved; explicitly remove it.",
                              )
                            : item.note[index]}
                        </p>
                        {item.components && (
                          <>
                            <button
                              type="button"
                              className="cancel-component-toggle"
                              aria-expanded={expanded}
                              aria-controls="cancel-bundle-components"
                              onClick={() => setExpanded(!expanded)}
                            >
                              {t("مشاهده اجزای پکیج", "View bundle components")}
                              <span>{expanded ? "−" : "+"}</span>
                            </button>
                            {expanded && (
                              <ul
                                id="cancel-bundle-components"
                                className="cancel-bundle-components"
                              >
                                {item.components.map((component, i) => (
                                  <li key={i}>
                                    <Glyph name="box" size={14} />
                                    {component[index]}
                                    <span>
                                      {t(
                                        "جزء پکیج، بدون انتخاب مستقل",
                                        "Bundle component, not independently selectable",
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                        {selected && !unavailable && (
                          <div className="cancel-quantity">
                            <label htmlFor={`quantity-${item.id}`}>
                              {t("تعداد مورد درخواست", "Requested quantity")}
                            </label>
                            <div className="cancel-stepper">
                              <button
                                type="button"
                                onClick={() =>
                                  changeSelection(
                                    item.id,
                                    String(Number(selection[item.id]) - 1),
                                  )
                                }
                                disabled={Number(selection[item.id]) <= 1}
                                aria-label={`${t("کاهش تعداد", "Decrease quantity")} ${item.title[index]}`}
                              >
                                −
                              </button>
                              <input
                                id={`quantity-${item.id}`}
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={item.allowed}
                                step={1}
                                value={selection[item.id]}
                                onChange={(event) =>
                                  changeSelection(item.id, event.target.value)
                                }
                                aria-invalid={invalid}
                                aria-describedby={
                                  invalid ? `error-${item.id}` : undefined
                                }
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  changeSelection(
                                    item.id,
                                    String(Number(selection[item.id]) + 1),
                                  )
                                }
                                disabled={
                                  Number(selection[item.id]) >= item.allowed
                                }
                                aria-label={`${t("افزایش تعداد", "Increase quantity")} ${item.title[index]}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                        {invalid && (
                          <p
                            id={`error-${item.id}`}
                            className="cancel-field-error"
                          >
                            {errorText("quantity")}
                          </p>
                        )}
                        {selected && unavailable && (
                          <button
                            className="text-link cancel-remove"
                            type="button"
                            onClick={() => changeSelection(item.id)}
                          >
                            {t(
                              "حذف انتخاب نامعتبر",
                              "Remove invalid selection",
                            )}
                          </button>
                        )}
                        {item.activeRequest && (
                          <a
                            className="text-link"
                            href={`${prefix}/account/requests/${item.activeRequest}`}
                            onClick={follow(
                              `${prefix}/account/requests/${item.activeRequest}`,
                            )}
                          >
                            {t("مشاهده درخواست", "View request")}{" "}
                            <bdi>{item.activeRequest}</bdi>
                            <Glyph name="arrow" size={15} />
                          </a>
                        )}
                        {item.alternative && !item.activeRequest && (
                          <a
                            className="text-link"
                            href={
                              item.alternative === "returns"
                                ? `${orderRoute}/return`
                                : `${prefix}/account/support?order=${orderId}`
                            }
                            onClick={follow(
                              item.alternative === "returns"
                                ? `${orderRoute}/return`
                                : `${prefix}/account/support?order=${orderId}`,
                            )}
                          >
                            {item.alternative === "returns"
                              ? t(
                                  "بررسی امکان مرجوعی",
                                  "Review return eligibility",
                                )
                              : t("ارتباط با پشتیبانی", "Contact support")}
                            <Glyph name="arrow" size={15} />
                          </a>
                        )}
                      </article>
                    )
                  })}
                </fieldset>
                <section className="cancel-reason-card">
                  <h2>
                    <span className="cancel-step">۲</span>
                    {t("علت و توضیحات", "Reason & details")}
                  </h2>
                  <label htmlFor="reason">
                    {t("علت درخواست", "Reason for cancellation")}{" "}
                    <span className="cancel-required">
                      {t("الزامی", "Required")}
                    </span>
                  </label>
                  <select
                    id="reason"
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value)
                      setErrors((previous) => {
                        const next = { ...previous }
                        delete next.reason
                        return next
                      })
                    }}
                    disabled={blocked || !eligible.length}
                    aria-invalid={!!errors.reason}
                    aria-describedby={
                      errors.reason ? "reason-error" : undefined
                    }
                  >
                    <option value="">
                      {t(
                        "علت درخواست را انتخاب کنید",
                        "Choose a cancellation reason",
                      )}
                    </option>
                    {cancellationReasons.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label[index]} · Demo
                      </option>
                    ))}
                  </select>
                  {errors.reason && (
                    <p id="reason-error" className="cancel-field-error">
                      {errorText(errors.reason)}
                    </p>
                  )}
                  <label htmlFor="details">
                    {t("توضیحات", "Additional details")}{" "}
                    <span className="cancel-required">
                      {selectedReason?.requiresDetails
                        ? t("الزامی", "Required")
                        : t("اختیاری", "Optional")}
                    </span>
                  </label>
                  <textarea
                    id="details"
                    value={details}
                    rows={4}
                    maxLength={demoCancellationContract.maxDetails}
                    onChange={(event) => {
                      setDetails(event.target.value)
                      setErrors((previous) => {
                        const next = { ...previous }
                        delete next.details
                        return next
                      })
                    }}
                    disabled={blocked || !eligible.length}
                    aria-invalid={!!errors.details}
                    aria-describedby={`details-hint${
                      errors.details ? " details-error" : ""
                    }`}
                    placeholder={t(
                      "دلیل درخواست خود را کوتاه توضیح دهید…",
                      "Briefly describe your reason…",
                    )}
                  />
                  <div className="cancel-details-footer">
                    <p id="details-hint">
                      {t(
                        "موضوع را توضیح دهید؛ رمز، کد تأیید یا اطلاعات بانکی ارسال نکنید.",
                        "Describe the issue. Do not send passwords, verification codes or banking details.",
                      )}
                    </p>
                    <span>
                      <bdi>
                        {details.length}/{demoCancellationContract.maxDetails}
                      </bdi>
                    </span>
                  </div>
                  {errors.details && (
                    <p id="details-error" className="cancel-field-error">
                      {errorText(errors.details)}
                    </p>
                  )}
                </section>
              </div>
              <aside className="cancel-summary-column">
                <section className="cancel-summary">
                  <div className="cancel-summary-heading">
                    <span className="cancel-step">۳</span>
                    <h2>{t("خلاصه درخواست شما", "Your request summary")}</h2>
                  </div>
                  <p className="cancel-summary-caption">
                    {t(
                      "پیش از ارسال، انتخاب‌ها را مرور کنید.",
                      "Review your selections before submitting.",
                    )}
                  </p>
                  <div className="cancel-summary-items">
                    {chosen.length ? (
                      chosen.map((item) => (
                        <div key={item.id}>
                          <span>
                            {item.title[index]}
                            {item.allowed === 0 && (
                              <small className="cancel-field-error">
                                {t("انتخاب نامعتبر", "Invalid selection")}
                              </small>
                            )}
                          </span>
                          <strong>
                            × <bdi>{selection[item.id] || "—"}</bdi>
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p>
                        {t(
                          "هنوز قلمی انتخاب نکرده‌اید.",
                          "No items selected yet.",
                        )}
                      </p>
                    )}
                  </div>
                  <dl>
                    <div>
                      <dt>{t("علت", "Reason")}</dt>
                      <dd>
                        {selectedReason?.label[index] ||
                          t("انتخاب نشده", "Not selected")}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("وضعیت درخواست", "Request status")}</dt>
                      <dd>{t("نیازمند بررسی", "Requires review")}</dd>
                    </div>
                    <div>
                      <dt>{t("پرداخت اولیه", "Initial payment")}</dt>
                      <dd>
                        {mode === "payment"
                          ? t("در حال بررسی", "Under verification")
                          : t("تأییدشده · Demo", "Confirmed · Demo")}
                      </dd>
                    </div>
                  </dl>
                  <div className="cancel-refund-note">
                    <Glyph name="clock" size={19} />
                    <p>
                      {t(
                        "مبلغ قابل بازپرداخت پس از بررسی درخواست مشخص می‌شود.",
                        "The refundable amount will be determined after review.",
                      )}
                    </p>
                  </div>
                  <small className="cancel-financial-note">
                    {t(
                      "برآورد معتبر هزینه یا کسری ارائه نشده است؛ مبلغی صفر یا بازپرداخت کامل فرض نمی‌شود.",
                      "No verified cost or deduction estimate is provided. Neither zero cost nor a full refund is assumed.",
                    )}
                  </small>
                  <div className="cancel-submit-notice">
                    <Glyph name="shield" size={17} />
                    <p>
                      {t(
                        "ثبت این درخواست به معنی تأیید لغو یا انجام بازپرداخت نیست.",
                        "Submitting this request does not confirm cancellation or complete a refund.",
                      )}
                    </p>
                  </div>
                  {["network", "server", "unknown", "changed"].includes(
                    submission,
                  ) && (
                    <div className="cancel-submit-error" role="alert">
                      <strong>
                        {submission === "unknown"
                          ? t(
                              "نتیجه ثبت درخواست هنوز تأیید نشده است.",
                              "Request submission has not been confirmed yet.",
                            )
                          : submission === "changed"
                            ? t(
                                "وضعیت سفارش تغییر کرده است. انتخاب‌ها را دوباره بررسی کنید.",
                                "The order status has changed. Review your selections.",
                              )
                            : submission === "server"
                              ? t(
                                  "ثبت درخواست فعلاً ممکن نشد.",
                                  "Unable to submit the request right now.",
                                )
                              : t(
                                  "ارتباط برقرار نشد؛ درخواست ثبت‌شده فرض نمی‌شود.",
                                  "Unable to connect; registration is not assumed.",
                                )}
                      </strong>
                      <p>
                        {t(
                          "اطلاعات واردشده شما حفظ شده است.",
                          "Your entered information has been preserved.",
                        )}
                      </p>
                      {submission === "unknown" && (
                        <button
                          type="button"
                          className="text-link"
                          onClick={checkUnknown}
                          disabled={checking}
                        >
                          {checking
                            ? t("در حال بررسی…", "Checking…")
                            : t("بررسی وضعیت درخواست", "Check request status")}
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    className="button primary cancel-submit"
                    type="submit"
                    disabled={blocked || !eligible.length}
                  >
                    {pending
                      ? t("در حال ثبت درخواست…", "Submitting request…")
                      : submission === "network" || submission === "server"
                        ? t("تلاش دوباره · Demo", "Try again · Demo")
                        : t("ثبت درخواست لغو", "Submit cancellation request")}
                    <Glyph name="arrow" size={18} />
                  </button>
                  <span className="cancel-submit-demo">
                    {t(
                      "ارسال و نتیجه فقط شبیه‌سازی Demo هستند.",
                      "Submission and result are Demo simulations only.",
                    )}
                  </span>
                  <a
                    className="button secondary cancel-back"
                    href={orderRoute}
                    onClick={follow(orderRoute)}
                  >
                    {t("بازگشت به سفارش", "Back to order")}
                  </a>
                </section>
                <div className="cancel-support-note">
                  <Glyph name="chat" size={20} />
                  <h3>
                    {t("به راهنمایی نیاز دارید؟", "Need a little guidance?")}
                  </h3>
                  <p>
                    {t(
                      "پشتیبانی برای پرسش‌های این سفارش همراه شماست.",
                      "Our support team can help with this order.",
                    )}
                  </p>
                  <a
                    className="text-link"
                    href={`${prefix}/account/support?order=${orderId}`}
                    onClick={follow(
                      `${prefix}/account/support?order=${orderId}`,
                    )}
                  >
                    {t("ارتباط با پشتیبانی", "Contact support")}
                    <Glyph name="arrow" size={15} />
                  </a>
                </div>
              </aside>
            </form>
          </>
        )}
        <footer className="cancel-footer">
          <span>
            {t(
              "انتخاب شما محترم است؛ جزئیات را با هم بررسی می‌کنیم.",
              "Your choice matters. We’ll review the details with care.",
            )}
          </span>
          <Glyph name="paint" size={17} />
        </footer>
        <details className="dash-preview cancel-preview">
          <summary>
            {t("حالت‌های پیش‌نمایش", "Preview states")} <bdi>USER-05 · Demo</bdi>
          </summary>
          <div>
            {previews.map(([value, fa, english]) => (
              <button
                type="button"
                key={value}
                aria-pressed={mode === value}
                onClick={() => preview(value)}
              >
                {en ? english : fa}
              </button>
            ))}
            <a
              href={`${prefix}/auth/session-expired?returnTo=${encodeURIComponent(page)}`}
              onClick={follow(
                `${prefix}/auth/session-expired?returnTo=${encodeURIComponent(page)}`,
              )}
            >
              {t("نشست منقضی", "Expired session")}
            </a>
          </div>
        </details>
        <dialog
          className="cancel-destination modal"
          ref={dialog}
          aria-labelledby="cancel-destination-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <div className="modal-head">
            <h2 id="cancel-destination-title">
              {t("مقصد مستقل پروتوتایپ", "Independent prototype destination")}
            </h2>
            <button
              className="icon-button"
              aria-label={t("بستن", "Close")}
              onClick={close}
            >
              <Glyph name="close" />
            </button>
          </div>
          <p>
            {t(
              "صفحه مقصد در این مرحله بازطراحی نشده است. هیچ درخواست، لغو یا بازپرداخت واقعی انجام نشده است.",
              "The destination is not redesigned in this step. No actual request, cancellation or refund occurred.",
            )}
          </p>
          <code dir="ltr">{destination}</code>
          <button className="button secondary" onClick={close}>
            {t("بازگشت به فرم", "Back to form")}
          </button>
        </dialog>
      </div>
    </DashboardPage>
  )
}
