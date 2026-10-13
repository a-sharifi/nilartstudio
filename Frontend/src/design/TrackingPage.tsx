import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useRef, useState, type ReactNode } from "react"
import TrackingResult from "./TrackingResult"
import {
  demoTrackingResult,
  maskTrackingPhone,
  normalizeTrackingDigits,
  normalizeTrackingPhone,
  trackingCountries,
  trackingDemoConfig,
  validateTrackingDetails,
  type TrackingResult as ResultData,
  type TrackingScenario,
  type TrackingStage,
} from "./tracking"

interface TrackingProps {
  language: 0 | 1
  mode: string
  onNavigate: (name: string, route: string) => void
  arrow: ReactNode
}
interface DemoChallenge {
  order: string
  phone: string
  expires: number
}
export default function TrackingPage({
  language,
  mode,
  onNavigate,
  arrow,
}: TrackingProps) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const [stage, setStage] = useState<TrackingStage>("details")
  const [order, setOrder] = useState("")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("IR")
  const [code, setCode] = useState("")
  const [errors, setErrors] = useState({ order: "", phone: "" })
  const [issue, setIssue] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [scenario, setScenario] = useState<TrackingScenario>("single")
  const [result, setResult] = useState<ResultData | null>(null)
  const [challenge, setChallenge] = useState<DemoChallenge | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [accessUntil, setAccessUntil] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [clock, setClock] = useState(Date.now())
  const [stale, setStale] = useState(false)
  const [noUpdate, setNoUpdate] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const orderInput = useRef<HTMLInputElement>(null)
  const phoneInput = useRef<HTMLInputElement>(null)
  const operation = useRef(0)
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousStage = useRef(stage)
  const delay = () =>
    new Promise<void>((resolve) => {
      waitTimer.current = setTimeout(resolve, trackingDemoConfig.requestDelayMs)
    })
  useEffect(
    () => () => {
      operation.current++
      if (waitTimer.current) clearTimeout(waitTimer.current)
    },
    [],
  )
  useEffect(() => {
    operation.current++
    setBusy(false)
    setIssue("")
    setNotice("")
    setCode("")
    setResult(null)
    setChallenge(null)
    setResendAt(0)
    setAccessUntil(0)
    setLockedUntil(0)
    setAttempts(0)
    setStale(false)
    setNoUpdate(false)
    const now = Date.now()
    setClock(now)
    if (mode.startsWith("result-") || mode === "stale") {
      const selected = (
        mode === "stale" ? "single" : mode.slice(7)
      ) as TrackingScenario
      setScenario(selected)
      setResult(demoTrackingResult(order, selected))
      setAccessUntil(now + trackingDemoConfig.accessSeconds * 1000)
      setStage("result")
      setStale(mode === "stale")
      setNoUpdate(selected === "no-update")
    } else if (
      ["otp", "invalid", "code-expired", "limited", "sms-error"].includes(mode)
    ) {
      setStage("otp")
      if (mode !== "otp") setIssue(mode)
      if (mode === "limited")
        setLockedUntil(now + trackingDemoConfig.lockSeconds * 1000)
    } else if (mode === "loading") setStage("loading")
    else {
      setStage("details")
      if (mode !== "initial") setIssue(mode)
    }
    // Preview mode deliberately controls fixtures; changing language or inputs must not reset the flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      setClock(now)
      if (stage === "result" && accessUntil && now >= accessUntil) {
        operation.current++
        setResult(null)
        setAccessUntil(0)
        setCode("")
        setChallenge(null)
        setStage("details")
        setIssue("access-expired")
        setBusy(false)
      }
      if (stage === "otp" && challenge && now >= challenge.expires) {
        operation.current++
        setChallenge(null)
        setCode("")
        setBusy(false)
        setStage("details")
        setIssue("challenge-expired")
      }
    }
    const timer = setInterval(tick, 1000)
    window.addEventListener("focus", tick)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", tick)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [stage, challenge, accessUntil])
  useEffect(() => {
    if (
      previousStage.current !== stage &&
      !document.querySelector("dialog[open]")
    )
      title.current?.focus()
    previousStage.current = stage
  }, [stage])
  const link = (
    fa: string,
    en: string,
    route: string,
    className = "text-link",
  ) => (
    <a
      href={route}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return
        event.preventDefault()
        onNavigate(t(fa, en), route)
      }}
    >
      {t(fa, en)}
      {arrow}
    </a>
  )
  const edit = (clearInputs = false) => {
    operation.current++
    setStage("details")
    setCode("")
    setChallenge(null)
    setResult(null)
    setAccessUntil(0)
    setBusy(false)
    setIssue("")
    setNotice("")
    setAttempts(0)
    setLockedUntil(0)
    setResendAt(0)
    setErrors({ order: "", phone: "" })
    if (clearInputs) {
      setOrder("")
      setPhone("")
    }
  }
  const requestCode = async (resend = false) => {
    if (busy || Date.now() < lockedUntil || (resend && Date.now() < resendAt))
      return
    const nextErrors = validateTrackingDetails(order, phone, country)
    setErrors(nextErrors)
    if (nextErrors.order || nextErrors.phone) {
      if (resend) {
        edit()
        setErrors(nextErrors)
      }
      requestAnimationFrame(() =>
        (nextErrors.order ? orderInput : phoneInput).current?.focus(),
      )
      return
    }
    const number = normalizeTrackingDigits(order)
    const normalizedPhone = normalizeTrackingPhone(phone, country)!
    setOrder(number)
    setPhone(normalizeTrackingDigits(phone))
    setIssue("")
    setNotice("")
    setBusy(true)
    const token = ++operation.current
    await delay()
    if (token !== operation.current) return
    setBusy(false)
    if (mode === "network" || mode === "service" || mode === "sms-error") {
      setIssue(mode)
      return
    }
    // This is only a local demo challenge, not a service authorization or actual SMS.
    const now = Date.now()
    setChallenge({
      order: number,
      phone: normalizedPhone,
      expires: now + trackingDemoConfig.challengeSeconds * 1000,
    })
    setResendAt(now + trackingDemoConfig.resendSeconds * 1000)
    setAttempts(0)
    setCode("")
    setStage("otp")
    setClock(now)
    setNotice("requested")
  }
  const verify = async () => {
    if (busy || Date.now() < lockedUntil) return
    const normalizedCode = normalizeTrackingDigits(code).replace(/\s/g, "")
    if (!challenge || Date.now() >= challenge.expires) {
      setIssue("challenge-expired")
      return
    }
    if (
      normalizedCode.length !== trackingDemoConfig.otpDigits ||
      !/^\d+$/.test(normalizedCode)
    ) {
      setIssue("invalid")
      return
    }
    setBusy(true)
    setIssue("")
    setNotice("")
    const token = ++operation.current
    await delay()
    if (token !== operation.current) return
    setBusy(false)
    if (Date.now() >= challenge.expires) {
      setIssue("challenge-expired")
      return
    }
    if (
      normalizedCode !== trackingDemoConfig.otpCode ||
      ["invalid", "code-expired"].includes(mode)
    ) {
      const next = attempts + 1
      setAttempts(next)
      if (next >= trackingDemoConfig.maxAttempts) {
        setLockedUntil(Date.now() + trackingDemoConfig.lockSeconds * 1000)
        setIssue("limited")
      } else setIssue(mode === "code-expired" ? "code-expired" : "invalid")
      return
    }
    if (
      challenge.order !== normalizeTrackingDigits(order) ||
      challenge.phone !== normalizeTrackingPhone(phone, country)
    ) {
      edit()
      return
    }
    setCode("")
    setStage("loading")
    setBusy(true)
    await delay()
    if (token !== operation.current) return
    const now = Date.now()
    setResult(demoTrackingResult(challenge.order, scenario))
    setAccessUntil(now + trackingDemoConfig.accessSeconds * 1000)
    setChallenge(null)
    setClock(now)
    setStage("result")
    setBusy(false)
    setNotice("ready")
  }
  const refresh = async () => {
    if (busy || !result || Date.now() >= accessUntil) return
    const token = ++operation.current
    setBusy(true)
    await delay()
    if (token !== operation.current || Date.now() >= accessUntil) return
    setBusy(false)
    if (mode === "stale") setStale(true)
    else {
      setStale(false)
      setNoUpdate(true)
    }
  }
  const remaining = Math.max(0, Math.ceil((resendAt - clock) / 1000))
  const lockRemaining = Math.max(0, Math.ceil((lockedUntil - clock) / 1000))
  const issueText: Record<string, string> = {
    invalid: t(
      "کد واردشده معتبر نیست یا منقضی شده است.",
      "The code is invalid or has expired.",
    ),
    "code-expired": t(
      "کد واردشده معتبر نیست یا منقضی شده است. یک کد جدید درخواست کنید.",
      "The code is invalid or has expired. Request a new code.",
    ),
    limited: t(
      "تعداد تلاش‌ها بیش از حد مجاز است. پس از زمان اعلام‌شده دوباره تلاش کنید.",
      "Too many attempts. Try again after the indicated waiting period.",
    ),
    network: t(
      "ارتباط برقرار نشد. اطلاعات شما حفظ شده؛ دوباره تلاش کنید.",
      "Connection failed. Your details are preserved; try again.",
    ),
    service: t(
      "سرویس پیگیری فعلاً پاسخ نمی‌دهد. دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.",
      "The tracking service isn't responding. Try again or contact support.",
    ),
    "sms-error": t(
      "ارسال کد انجام نشد. دوباره درخواست کنید یا با پشتیبانی تماس بگیرید.",
      "The code could not be sent. Try again or contact support.",
    ),
    "challenge-expired": t(
      "فرایند تأیید منقضی شده است. برای دریافت کد جدید، اطلاعات را دوباره تأیید کنید.",
      "Verification has expired. Confirm your details again to request a new code.",
    ),
    "access-expired": t(
      "دسترسی پیگیری منقضی شد. نتیجه حذف شده است؛ برای مشاهده دوباره، شماره تلفن را تأیید کنید.",
      "Tracking access has expired. The result has been removed; verify your phone again to view it.",
    ),
  }
  const hasResult = stage === "result" && result && clock < accessUntil
  const noticeText =
    notice === "requested"
      ? t(
          "اگر اطلاعات واردشده با سفارش مطابقت داشته باشد، کد تأیید ارسال می‌شود. Demo: هیچ پیامکی ارسال نشده است.",
          "If the details match an order, a verification code will be sent. Demo: no SMS was sent.",
        )
      : notice === "ready"
        ? t(
            "خلاصه نمایشی سفارش آماده است؛ این نتیجه، تأیید سفارش واقعی نیست.",
            "Demo order summary is ready; this is not verification of a real order.",
          )
        : ""
  const currentStep = stage === "details" ? 0 : stage === "otp" ? 1 : 2
  return (
    <div className="container tracking-page">
      <nav className="breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        {link("خانه", "Home", "/", "")}
        <span>/</span>
        <span aria-current="page">{t("پیگیری سفارش", "Track order")}</span>
      </nav>
      <header className={`tracking-intro ${hasResult ? "has-result" : ""}`}>
        <span className="guide-kicker">
          <span className="tiny-line" />
          {t("از سفارش تا رسیدن به دست شما", "FROM OUR STUDIO TO YOUR DOOR")}
        </span>
        <h1>{t("پیگیری سفارش", "Track your order")}</h1>
        <p>
          {t(
            "شماره سفارش و شماره تلفنی را وارد کنید که هنگام خرید ثبت کرده‌اید.",
            "Enter your order number and the phone number used at checkout.",
          )}
        </p>
      </header>
      <div className="tracking-demo-banner">
        <span className="tracking-demo-tag">DEMO</span>
        <p>
          {t(
            "نمونه تعاملی · پیامک ارسال نمی‌شود و اطلاعات سفارش واقعی دریافت نمی‌شود. از اطلاعات واقعی مشتری استفاده نکنید.",
            "Interactive prototype · no SMS is sent and no real order is retrieved. Do not enter real customer information.",
          )}
        </p>
      </div>
      <div
        className={`tracking-progress ${hasResult ? "result-progress" : ""}`}
        aria-label={t("مراحل پیگیری", "Tracking steps")}
      >
        <ol>
          {[
            [t("اطلاعات سفارش", "Order details")],
            [t("تأیید تلفن", "Phone verification")],
            [t("وضعیت سفارش", "Order status")],
          ].map(([label], index) => (
            <li
              key={index}
              className={
                index === currentStep
                  ? "current"
                  : index < currentStep
                    ? "complete"
                    : ""
              }
              aria-current={index === currentStep ? "step" : undefined}
            >
              <span>
                {index < currentStep
                  ? "✓"
                  : language === 0
                    ? ["۱", "۲", "۳"][index]
                    : index + 1}
              </span>
              <strong>{label}</strong>
            </li>
          ))}
        </ol>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {busy
          ? t("در حال پردازش درخواست نمایشی", "Processing demo request")
          : noticeText}
      </p>
      {hasResult ? (
        <div>
          <h2 ref={title} tabIndex={-1} className="sr-only">
            {t("نتیجه نمایشی پیگیری", "Demo tracking result")}
          </h2>
          <TrackingResult
            result={result}
            language={language}
            stale={stale}
            noUpdate={noUpdate}
            refreshing={busy}
            onRefresh={refresh}
            onAnother={() => edit(true)}
            onNavigate={onNavigate}
            arrow={arrow}
          />
          <p className="tracking-session-note">
            {t(
              "دسترسی موقت این Demo پس از پایان مهلت حذف می‌شود؛ فقط همان سفارش قابل مشاهده است.",
              "This Demo's temporary access is removed when it expires; it applies only to this order.",
            )}
          </p>
        </div>
      ) : stage === "loading" ? (
        <div className="tracking-result-skeleton" aria-busy="true">
          <h2 ref={title} tabIndex={-1} className="sr-only">
            {t("بارگذاری نتیجه", "Loading result")}
          </h2>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : (
        <div className="tracking-form-area">
          <section className="tracking-form-card">
            <div className="tracking-form-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="27"
                height="27"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              >
                {stage === "otp" ? (
                  <>
                    <rect x="5" y="10" width="14" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
                  </>
                ) : (
                  <>
                    <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10" />
                    <path d="m7 5 9 4" />
                  </>
                )}
              </svg>
            </div>
            <h2 ref={title} tabIndex={-1}>
              {stage === "otp"
                ? t("تأیید شماره تلفن", "Verify your phone number")
                : t("سفارش شما، در یک نگاه", "Your order, at a glance")}
            </h2>
            <p className="tracking-form-description">
              {stage === "otp"
                ? t(
                    "کد دریافتی را وارد کنید. اطلاعات سفارش پس از تأیید نمایش داده می‌شود.",
                    "Enter the verification code. Order details will appear after verification.",
                  )
                : t(
                    "برای پیگیری سفارش موجود، این دو مورد را وارد کنید.",
                    "Enter these two details to track an existing order.",
                  )}
            </p>
            {notice && (
              <div className="tracking-alert neutral">{noticeText}</div>
            )}
            {issue && (
              <div className="tracking-alert error" role="alert">
                <strong>{issueText[issue]}</strong>
                {issue === "limited" && (
                  <p>
                    {lockRemaining > 0
                      ? t(
                          `انتظار نمایشی: ${lockRemaining} ثانیه`,
                          `Demo wait: ${lockRemaining} seconds`,
                        )
                      : t(
                          "انتظار تمام شد؛ اکنون می‌توانید دوباره تلاش کنید.",
                          "The wait has ended; you can try again.",
                        )}
                  </p>
                )}
                {["network", "service", "sms-error"].includes(issue) && (
                  <div className="tracking-error-actions">
                    <button
                      className="text-link tracking-text-button"
                      disabled={busy}
                      onClick={() => requestCode(stage === "otp")}
                    >
                      {t("تلاش دوباره", "Try again")}
                    </button>
                    {link("تماس با پشتیبانی", "Contact support", "/contact")}
                  </div>
                )}
              </div>
            )}
            {stage === "details" ? (
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  requestCode()
                }}
                aria-busy={busy}
              >
                <div className="tracking-field">
                  <label htmlFor="tracking-order">
                    {t("شماره سفارش", "Order number")}
                  </label>
                  <input
                    ref={orderInput}
                    id="tracking-order"
                    dir="ltr"
                    value={order}
                    onChange={(event) => setOrder(event.target.value)}
                    disabled={busy}
                    aria-invalid={Boolean(errors.order)}
                    aria-describedby={`tracking-order-help${
                      errors.order ? " tracking-order-error" : ""
                    }`}
                    autoComplete="off"
                    required
                  />
                  <p
                    id="tracking-order-help"
                    className="tracking-field-caption"
                  >
                    {t(
                      "شماره سفارش در رسید خرید یا پیام تأیید سفارش درج شده است.",
                      "Find this number in your receipt or order confirmation.",
                    )}
                  </p>
                  {errors.order && (
                    <p
                      className="tracking-field-error"
                      id="tracking-order-error"
                    >
                      {t(
                        "شماره سفارش را وارد کنید.",
                        "Enter your order number.",
                      )}
                    </p>
                  )}
                </div>
                <div className="tracking-field">
                  <label htmlFor="tracking-phone">
                    {t(
                      "شماره تلفن ثبت‌شده در سفارش",
                      "Phone number used for this order",
                    )}
                  </label>
                  <div className="tracking-phone-group" dir="ltr">
                    <div>
                      <label className="sr-only" htmlFor="tracking-country">
                        {t(
                          "کد کشور — گزینه‌های Demo",
                          "Country code — Demo options",
                        )}
                      </label>
                      <SelectDropdown
                        id="tracking-country"
                        value={country}
                        onChange={(event) => setCountry(event.target.value)}
                        disabled={busy}
                      >
                        {trackingCountries.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name[language]} {item.code}
                          </option>
                        ))}
                      </SelectDropdown>
                    </div>
                    <input
                      ref={phoneInput}
                      id="tracking-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      dir="ltr"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={busy}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={
                        errors.phone
                          ? "tracking-phone-error"
                          : "tracking-phone-help"
                      }
                      required
                    />
                  </div>
                  <p
                    className="tracking-field-caption"
                    id="tracking-phone-help"
                  >
                    {t(
                      "کشورهای این نمونه Demo هستند؛ تغییر زبان، شماره یا کشور را تغییر نمی‌دهد.",
                      "Country options are for this Demo; language changes don't change your phone or country.",
                    )}
                  </p>
                  {errors.phone && (
                    <p
                      className="tracking-field-error"
                      id="tracking-phone-error"
                    >
                      {t(
                        "شماره تلفن معتبر وارد کنید.",
                        "Enter a valid phone number.",
                      )}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="button primary tracking-submit"
                  disabled={busy}
                >
                  {busy && (
                    <span className="tracking-spinner" aria-hidden="true" />
                  )}
                  {busy
                    ? t("در حال درخواست…", "Requesting…")
                    : t("دریافت کد تأیید", "Get verification code")}
                  {!busy && arrow}
                </button>
                <details className="tracking-find-order">
                  <summary>
                    {t(
                      "شماره سفارش را پیدا نمی‌کنم",
                      "I can't find my order number",
                    )}
                  </summary>
                  <p>
                    {t(
                      "رسید خرید یا پیام تأیید سفارش را بررسی کنید. اگر شماره را پیدا نکردید، با پشتیبانی تماس بگیرید. سفارش‌ها تنها با شماره تلفن جست‌وجو یا فهرست نمی‌شوند.",
                      "Check your receipt or order confirmation. If you can't find the number, contact support. Orders aren't searched or listed by phone alone.",
                    )}
                  </p>
                  {link("تماس با پشتیبانی", "Contact support", "/contact")}
                </details>
              </form>
            ) : (
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  verify()
                }}
                aria-busy={busy}
              >
                <div className="tracking-otp-destination">
                  <bdi dir="ltr">
                    {maskTrackingPhone(
                      normalizeTrackingPhone(phone, country) || "",
                    )}
                  </bdi>
                  <button
                    type="button"
                    className="text-link tracking-text-button"
                    onClick={() => edit()}
                  >
                    {t("ویرایش اطلاعات", "Edit details")}
                  </button>
                </div>
                <div className="tracking-field">
                  <label htmlFor="tracking-otp">
                    {t("کد تأیید", "Verification code")}
                  </label>
                  <input
                    id="tracking-otp"
                    className="tracking-otp-input"
                    type="text"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={trackingDemoConfig.otpDigits}
                    value={code}
                    onPaste={(event) => {
                      event.preventDefault()
                      setCode(
                        normalizeTrackingDigits(
                          event.clipboardData.getData("text"),
                        )
                          .replace(/\s/g, "")
                          .slice(0, trackingDemoConfig.otpDigits),
                      )
                    }}
                    onChange={(event) =>
                      setCode(
                        normalizeTrackingDigits(event.target.value).replace(
                          /\s/g,
                          "",
                        ),
                      )
                    }
                    aria-invalid={["invalid", "code-expired"].includes(issue)}
                    aria-describedby="tracking-demo-code"
                    disabled={busy || lockRemaining > 0}
                    required
                  />
                  <p id="tracking-demo-code" className="tracking-demo-code">
                    Demo · {t("کد آزمایشی", "Test code")}:{" "}
                    <bdi dir="ltr">{trackingDemoConfig.otpCode}</bdi> ·{" "}
                    {t(
                      "تأیید واقعی انجام نمی‌شود.",
                      "No real verification occurs.",
                    )}
                  </p>
                </div>
                <button
                  type="submit"
                  className="button primary tracking-submit"
                  disabled={busy || lockRemaining > 0}
                >
                  {busy && (
                    <span className="tracking-spinner" aria-hidden="true" />
                  )}
                  {busy
                    ? t("در حال بررسی کد…", "Checking code…")
                    : t("تأیید و نمایش سفارش", "Verify and view order")}
                  {!busy && arrow}
                </button>
                <div className="tracking-resend">
                  <span>
                    {remaining > 0
                      ? t(
                          `ارسال مجدد در ${remaining} ثانیه · Demo`,
                          `Resend in ${remaining}s · Demo`,
                        )
                      : t("کد را دریافت نکردید؟", "Didn't receive a code?")}
                  </span>
                  <button
                    type="button"
                    className="text-link tracking-text-button"
                    disabled={busy || remaining > 0 || lockRemaining > 0}
                    onClick={() => requestCode(true)}
                  >
                    {t("ارسال مجدد کد", "Resend code")}
                  </button>
                </div>
                {issue === "challenge-expired" && (
                  <button
                    type="button"
                    className="button secondary tracking-submit"
                    onClick={() => edit()}
                  >
                    {t("شروع تأیید دوباره", "Restart verification")}
                  </button>
                )}
              </form>
            )}
            <div className="tracking-form-trust">
              <svg
                width="18"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
                <path d="m8 12 3 3 5-6" />
              </svg>
              <p>
                {t(
                  "برای حفظ حریم خصوصی، اطلاعات سفارش فقط پس از تأیید شماره تلفن نمایش داده می‌شود.",
                  "To protect your privacy, order details are shown only after phone verification.",
                )}
              </p>
            </div>
          </section>
          <div className="tracking-account-link">
            {link(
              "حساب دارید؟ سفارش‌هایتان را در پنل ببینید",
              "Have an account? View your orders in your account",
              "/login?returnTo=%2Faccount%2Forders",
            )}
          </div>
          <div className="tracking-bottom-help">
            <span>{t("نیاز به راهنمایی دارید؟", "Need a little help?")}</span>
            {link("سؤالات متداول", "FAQ", "/faq")}
            {link("تماس با نیل‌آرت", "Contact NilArt", "/contact")}
          </div>
        </div>
      )}
    </div>
  )
}
