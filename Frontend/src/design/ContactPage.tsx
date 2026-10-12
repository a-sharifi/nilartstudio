import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  contactCountries,
  contactDemoConfig,
  contactOrdersRoute,
  contactPayload,
  createDemoContactService,
  emptyContactDraft,
  enabledContactOptions,
  normalizeContactDraft,
  publicContactChannels,
  validateContactDraft,
  type ContactConfig,
  type ContactDraft,
  type ContactErrors,
  type ContactOutcome,
  type ContactResponse,
  type ReplyMethod,
} from "./contact"

interface IconProps {
  kind: string
}
function ContactIcon({ kind }: IconProps) {
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
      {kind === "phone" ? (
        <path d="M7 3H4c-4 8 7 19 15 15v-3l-5-2-2 2-4-4 2-2-3-6Z" />
      ) : kind === "email" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 6 9 7 9-7" />
        </>
      ) : kind === "order" ? (
        <>
          <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10" />
        </>
      ) : kind === "returns" ? (
        <>
          <path d="M9 6 4 11l5 5M4 11h11a5 5 0 0 1 0 10M12 3h8v9" />
        </>
      ) : kind === "commission" ? (
        <>
          <path d="m5 17 12-12 3 3L8 20H4l1-3Zm9-9 3 3" />
        </>
      ) : (
        <>
          <path d="M4 4h16v12h-7l-5 4v-4H4Z" />
          <path d="M9 8c0-4 6-4 6 0 0 2-3 2-3 4m0 1v1" />
        </>
      )}
    </svg>
  )
}
interface ContactProps {
  language: 0 | 1
  signedIn: boolean
  mode: string
  onMode: (mode: string) => void
  onNavigate: (name: string, route: string) => void
  arrow: ReactNode
  config?: ContactConfig
  initialDraft?: Partial<ContactDraft>
}
interface PendingContact {
  key: string
  payload: ReturnType<typeof contactPayload>
}
export default function ContactPage({
  language,
  signedIn,
  mode,
  onMode,
  onNavigate,
  arrow,
  config = contactDemoConfig,
  initialDraft,
}: ContactProps) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const [draft, setDraft] = useState<ContactDraft>(() => ({
    ...emptyContactDraft(),
    ...initialDraft,
  }))
  const [errors, setErrors] = useState<ContactErrors>({})
  const [status, setStatus] = useState<ContactOutcome | "idle" | "sending">(
    "idle",
  )
  const [receipt, setReceipt] = useState<ContactResponse | null>(null)
  const [copied, setCopied] = useState("")
  const [receiptMethod, setReceiptMethod] = useState<ReplyMethod>("")
  const form = useRef<HTMLFormElement>(null)
  const resultTitle = useRef<HTMLHeadingElement>(null)
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null)
  const service = useRef(createDemoContactService())
  const pending = useRef<PendingContact | null>(null)
  const sequence = useRef(0)
  const generation = useRef(0)
  const processing = useRef(false)
  const topics = enabledContactOptions(config.topics, config.demo)
  const methods = enabledContactOptions(config.replyMethods, config.demo)
  const channels =
    mode === "empty-channels" || mode === "unavailable"
      ? []
      : publicContactChannels(config.channels)
  const disabled =
    !config.formEnabled ||
    ["form-disabled", "unavailable"].includes(mode) ||
    !topics.length ||
    !methods.length
  const busy = status === "sending"
  const unresolved = status === "unknown"
  const locked = busy || unresolved || status === "limited"
  const translationMissing =
    mode === "translation" ||
    !config.languages.includes(language === 0 ? "fa" : "en")
  const wait = () =>
    new Promise<void>((resolve) => {
      waiting.current = setTimeout(resolve, 600)
    })
  useEffect(
    () => () => {
      generation.current++
      if (waiting.current) clearTimeout(waiting.current)
    },
    [],
  )
  useEffect(() => {
    generation.current++
    processing.current = false
    pending.current = null
    setErrors({})
    setReceipt(null)
    setCopied("")
    setStatus("idle")
    if (mode === "order" || mode === "commission")
      setDraft((previous) => ({ ...previous, topic: mode }))
    if (mode === "phone")
      setDraft((previous) => ({ ...previous, method: "phone" }))
    if (mode === "validation") setErrors(validateContactDraft(draft, config))
    if (["network", "server", "limited"].includes(mode))
      setStatus(mode as ContactOutcome)
    if (mode === "sending") setStatus("sending")
    if (mode === "success" && config.demo) {
      setReceipt({ status: "confirmed", demo: true })
      setStatus("confirmed")
    }
    if (mode === "unknown" && config.demo) {
      const request = {
        key: `demo-contact-${++sequence.current}`,
        payload: contactPayload(draft),
      }
      pending.current = request
      setStatus("unknown")
      void service.current.submit(request.key, "unknown")
    }
    // Fixtures change presentation only. Language changes must not mutate the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])
  useEffect(() => {
    if (status === "confirmed" && !document.querySelector("dialog[open]"))
      resultTitle.current?.focus()
  }, [status])
  const update = <K extends keyof ContactDraft,>(
    field: K,
    value: ContactDraft[K],
  ) => {
    if (locked) return
    setDraft((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    pending.current = null
    if (status !== "idle") setStatus("idle")
  }
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
      {className ? arrow : null}
    </a>
  )
  const focusError = (next: ContactErrors) =>
    requestAnimationFrame(() => {
      const first = [
        "name",
        "topic",
        "method",
        "phone",
        "email",
        "order",
        "message",
      ].find((field) => next[(field as keyof ContactErrors)])
      if (first)
        form.current?.querySelector<HTMLElement>(`#contact-${first}`)?.focus()
    })
  const applyResponse = (response: ContactResponse) => {
    setReceipt(response)
    setStatus(response.status)
    if (response.status === "confirmed") {
      setReceiptMethod(draft.method)
      setDraft(emptyContactDraft())
      setErrors({})
      pending.current = null
    }
  }
  const send = async () => {
    if (processing.current || locked || disabled) return
    const clean = normalizeContactDraft(draft)
    const nextErrors = validateContactDraft(clean, config)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      focusError(nextErrors)
      return
    }
    setDraft(clean)
    if (!config.demo) {
      setStatus("server")
      return
    } // No production submission adapter is installed.
    processing.current = true
    setStatus("sending")
    const token = ++generation.current
    const request = pending.current ?? {
      key: `demo-contact-${++sequence.current}`,
      payload: contactPayload(clean),
    }
    pending.current = request
    await wait()
    if (token !== generation.current) return
    const outcome = ["network", "server", "unknown", "limited"].includes(mode)
      ? mode as ContactOutcome
      : "confirmed"
    const response = await service.current.submit(request.key, outcome)
    if (token !== generation.current) return
    processing.current = false
    applyResponse(response)
  }
  const recover = async () => {
    if (processing.current || !pending.current || !config.demo) return
    processing.current = true
    setStatus("sending")
    const token = ++generation.current
    await wait()
    if (token !== generation.current) return
    const response = await service.current.recover(pending.current!.key)
    if (token !== generation.current) return
    processing.current = false
    applyResponse(response)
  }
  const newMessage = () => {
    generation.current++
    processing.current = false
    pending.current = null
    setStatus("idle")
    setReceipt(null)
    setCopied("")
    setErrors({})
    onMode("normal")
    requestAnimationFrame(() =>
      document.getElementById("contact-name")?.focus(),
    )
  }
  const errorText = (field: keyof ContactDraft) =>
    errors[field] === "too-long"
      ? t(
          "طول این فیلد از حد مجاز سرویس بیشتر است.",
          "This field exceeds the service's allowed length.",
        )
      : {
          name: t("نام خود را وارد کنید.", "Enter your name."),
          topic: t("موضوع پیام را انتخاب کنید.", "Choose a message topic."),
          method: t(
            "یک روش دریافت پاسخ انتخاب کنید.",
            "Choose a reply method.",
          ),
          phone: t(
            "شماره تلفن معتبر وارد کنید.",
            "Enter a valid phone number.",
          ),
          email: t("ایمیل معتبر وارد کنید.", "Enter a valid email address."),
          message: t("متن پیام را وارد کنید.", "Enter your message."),
          order: "",
          country: "",
        }[field]
  const fieldError = (field: keyof ContactDraft) =>
    errors[field] && (
      <p className="contact-field-error" id={`contact-${field}-error`}>
        {errorText(field)}
      </p>
    )
  const required = (
    <span className="contact-required">{t("الزامی", "Required")}</span>
  )
  const messageForStatus =
    status === "network"
      ? t(
          "ارسال پیام ممکن نشد. اتصال را بررسی و دوباره تلاش کنید.",
          "Unable to send your message. Check your connection and try again.",
        )
      : status === "server"
        ? t(
            "در حال حاضر امکان ثبت پیام نیست. از یکی از راه‌های ارتباطی فعال استفاده کنید.",
            "Messages cannot be submitted right now. Use an available contact channel.",
          )
        : status === "unknown"
          ? t(
              "ثبت پیام هنوز تأیید نشده است.",
              "Message submission has not been confirmed yet.",
            )
          : status === "limited"
            ? t(
                "تعداد درخواست‌ها بیش از حد مجاز است. پس از زمان اعلام‌شده دوباره تلاش کنید.",
                "Too many requests. Try again after the indicated waiting period.",
              )
            : ""
  const shortcuts = [
    [
      "order",
      "پیگیری سفارش",
      "Track an order",
      "وضعیت سفارش خود را بررسی کنید.",
      "Check your order status.",
      `/${language === 0 ? "fa" : "en"}/track-order`,
    ],
    [
      "faq",
      "سؤالات متداول",
      "Frequently asked questions",
      "پاسخ پرسش‌های رایج را ببینید.",
      "Find answers to common questions.",
      "/faq",
    ],
    [
      "returns",
      "لغو و مرجوعی",
      "Cancellation and returns",
      "شرایط و مسیر ثبت درخواست را بررسی کنید.",
      "Review the conditions and request process.",
      `/${language === 0 ? "fa" : "en"}/returns`,
    ],
    [
      "commission",
      "سفارش نقاشی سفارشی",
      "Commission an artwork",
      "برای ثبت ایده و دریافت پیشنهاد، از مسیر سفارش سفارشی استفاده کنید.",
      "Use the commission flow to submit your idea and request a proposal.",
      "/commissions/new",
    ],
  ]
  return (
    <div className="container contact-page">
      <nav className="breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        {link("خانه", "Home", "/", "")}
        <span>/</span>
        <span aria-current="page">{t("تماس با ما", "Contact")}</span>
      </nav>
      <header className="contact-intro">
        <span className="guide-kicker">
          <span className="tiny-line" />
          {t("برای یک گفت‌وگوی روشن", "LET'S START A CONVERSATION")}
        </span>
        <h1>{t("با نیل‌آرت در ارتباط باشید", "Get in touch with Nilart")}</h1>
        <p>
          {t(
            "برای پرسش درباره محصولات، همکاری یا راهنمایی سفارش، موضوع مرتبط را انتخاب کنید.",
            "Choose a topic for product questions, collaboration or help with an order.",
          )}
        </p>
      </header>
      {config.demo && (
        <div className="contact-demo-note">
          <span className="tracking-demo-tag">DEMO / PUB–19</span>
          <p>
            {t(
              "نمونه تعاملی؛ پیام واقعی ثبت یا ارسال نمی‌شود. اطلاعات واقعی یا حساس وارد نکنید. کانال‌ها و روش‌های پاسخ نیازمند اطلاعات تأییدشده‌اند.",
              "Interactive prototype; no real message is submitted or sent. Do not enter real or sensitive information. Contact channels and reply methods require approval.",
            )}
          </p>
        </div>
      )}
      <section
        className="contact-shortcuts"
        aria-labelledby="contact-shortcuts-title"
      >
        <h2 className="sr-only" id="contact-shortcuts-title">
          {t("میان‌برهای راهنما", "Helpful shortcuts")}
        </h2>
        {shortcuts.map(([icon, fa, en, bodyFa, bodyEn, route]) => (
          <a
            className="contact-shortcut"
            href={route}
            key={icon}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return
              event.preventDefault()
              onNavigate(t(fa, en), route)
            }}
          >
            <span className={`contact-shortcut-icon ${icon}`}>
              <ContactIcon kind={icon} />
            </span>
            <div>
              <h3>{t(fa, en)}</h3>
              <p>{t(bodyFa, bodyEn)}</p>
            </div>
            <span className="contact-shortcut-arrow">{arrow}</span>
          </a>
        ))}
      </section>
      <div className="contact-layout">
        <section
          className="contact-form-panel"
          aria-labelledby="contact-form-title"
        >
          <div className="contact-panel-heading">
            <span className="guide-kicker">
              {t("یک پیام، برای شروع", "A NOTE TO BEGIN")}
            </span>
            <h2 id="contact-form-title">
              {t("برای ما بنویسید", "Write to us")}
            </h2>
            <p>
              {t(
                "موضوع مرتبط را انتخاب کنید و بگویید چطور می‌توانیم راهنمایی‌تان کنیم.",
                "Choose a topic and tell us how we can help.",
              )}
            </p>
          </div>
          {translationMissing && (
            <div className="contact-status warning" role="status">
              <h3>
                {t(
                  "متن این صفحه هنوز به زبان انتخاب‌شده منتشر نشده است.",
                  "This page's copy hasn't been published in the selected language yet.",
                )}
              </h3>
              <p>
                {t(
                  "راه‌های تماس معتبر در ستون ارتباط باقی می‌مانند؛ ترجمه حدسی نمایش داده نمی‌شود.",
                  "Verified contact channels remain available; no guessed translation is displayed.",
                )}
              </p>
              {config.languages[0] && (
                <button
                  className="button secondary"
                  onClick={() => {
                    onMode("normal")
                    onNavigate(
                      config.languages[0] === "fa"
                        ? t("نسخه فارسی", "Persian version")
                        : t("نسخه انگلیسی", "English version"),
                      `/${config.languages[0]}/contact`,
                    )
                  }}
                >
                  {config.languages[0] === "fa"
                    ? t("مشاهده نسخه فارسی", "View Persian version")
                    : t("مشاهده نسخه انگلیسی", "View English version")}
                </button>
              )}
            </div>
          )}
          {status === "confirmed" ? (
            <div className="contact-receipt">
              <span className="contact-receipt-icon" aria-hidden="true">
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="m7 12 3 3 7-7" />
                </svg>
              </span>
              <h3 ref={resultTitle} tabIndex={-1}>
                {config.demo ? "Demo · " : ""}
                {t("پیام شما ثبت شد.", "Your message has been received.")}
              </h3>
              <p>
                {config.demo
                  ? t(
                      "این فقط رسید آزمایشی است؛ هیچ پیام یا اعلانی واقعاً ارسال نشده است.",
                      "This is a test receipt only; no real message or notification was sent.",
                    )
                  : t(
                      "پاسخ از طریق روش ارتباطی انتخاب‌شده ارسال می‌شود.",
                      "We will respond through your selected contact method.",
                    )}
              </p>
              {receiptMethod && (
                <p className="contact-receipt-method">
                  {t("روش پاسخ انتخاب‌شده", "Selected reply method")}:{" "}
                  {receiptMethod === "email"
                    ? t("ایمیل", "Email")
                    : t("تلفن", "Phone")}
                </p>
              )}
              {receipt?.reference && (
                <div className="contact-reference">
                  <bdi dir="ltr">{receipt.reference}</bdi>
                  <button
                    className="button secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(receipt.reference!)
                        setCopied(t("کپی شد", "Copied"))
                      } catch {
                        setCopied(t("کپی ممکن نشد.", "Couldn't copy."))
                      }
                    }}
                  >
                    {t("کپی شماره پیگیری پیام", "Copy message reference")}
                  </button>
                  <span role="status">{copied}</span>
                </div>
              )}
              <p className="contact-caption">
                {t(
                  "رسید پیام، تأیید مالکیت سفارش، ثبت نقاشی سفارشی یا پذیرش لغو و مرجوعی نیست.",
                  "A message receipt doesn't confirm order ownership, create a commission or approve cancellation or returns.",
                )}
              </p>
              <div className="guide-actions">
                <button className="button primary" onClick={newMessage}>
                  {t("ارسال پیام جدید", "Send another message")}
                </button>
                {link(
                  "بازگشت به فروشگاه",
                  "Back to shop",
                  "/shop",
                  "button secondary",
                )}
              </div>
            </div>
          ) : disabled ? (
            <div className="contact-unavailable">
              <h3>
                {channels.length
                  ? t(
                      "فرم پیام در حال حاضر فعال نیست.",
                      "The message form is currently disabled.",
                    )
                  : t(
                      "اطلاعات ارتباطی در حال حاضر در دسترس نیست.",
                      "Contact options are currently unavailable.",
                    )}
              </h3>
              <p>
                {channels.length
                  ? t(
                      "از یکی از راه‌های ارتباطی فعال استفاده کنید.",
                      "Use an available contact channel.",
                    )
                  : t(
                      "می‌توانید راهنماهای موجود را ببینید یا دوباره تلاش کنید.",
                      "Browse the available guides or try again.",
                    )}
              </p>
              <button
                className="button secondary"
                onClick={() => onMode("normal")}
              >
                {t("تلاش دوباره", "Try again")}
              </button>
              {link("سؤالات متداول", "FAQ", "/faq")}
            </div>
          ) : (
            !translationMissing && (
              <form
                ref={form}
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  send()
                }}
                aria-busy={busy}
              >
                {messageForStatus && (
                  <div
                    className={`contact-status ${
                      status === "unknown" || status === "limited"
                        ? "warning"
                        : "error"
                    }`}
                    role="alert"
                  >
                    <h3>{messageForStatus}</h3>
                    {status === "unknown" && (
                      <>
                        <p>
                          {t(
                            "برای جلوگیری از پیام تکراری، فعلاً دوباره ارسال نکنید. نتیجه همین درخواست را بررسی کنید؛ متن شما حفظ شده است.",
                            "To avoid duplicate messages, do not submit again yet. Check this request's result; your text is preserved.",
                          )}
                        </p>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={recover}
                        >
                          {t(
                            "بررسی نتیجه همین پیام · Demo",
                            "Check this message's result · Demo",
                          )}
                        </button>
                      </>
                    )}
                    {status === "network" && (
                      <button
                        className="text-link contact-text-button"
                        type="button"
                        onClick={send}
                      >
                        {t("تلاش دوباره", "Try again")}
                      </button>
                    )}
                    {status === "limited" && (
                      <p>
                        {receipt?.retryAfterSeconds
                          ? t(
                              `زمان انتظار اعلام‌شده: ${receipt.retryAfterSeconds} ثانیه`,
                              `Reported waiting period: ${receipt.retryAfterSeconds} seconds`,
                            )
                          : t(
                              "Demo · زمان انتظار واقعی از سرویس دریافت می‌شود؛ عدد فرضی تعیین نشده است.",
                              "Demo · The waiting period comes from the service; no invented value is set.",
                            )}
                      </p>
                    )}
                  </div>
                )}
                <div className="contact-field">
                  <label htmlFor="contact-name">
                    {t("نام", "Name")}
                    {required}
                  </label>
                  <input
                    id="contact-name"
                    value={draft.name}
                    onChange={(event) => update("name", event.target.value)}
                    autoComplete="name"
                    maxLength={config.maxLengths?.name}
                    disabled={locked}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name ? "contact-name-error" : undefined
                    }
                    required
                  />
                  {fieldError("name")}
                </div>
                <div className="contact-field">
                  <label htmlFor="contact-topic">
                    {t("موضوع پیام", "Message topic")}
                    {required}
                  </label>
                  <select
                    id="contact-topic"
                    value={draft.topic}
                    onChange={(event) => update("topic", event.target.value)}
                    disabled={locked}
                    aria-invalid={Boolean(errors.topic)}
                    aria-describedby={
                      errors.topic ? "contact-topic-error" : undefined
                    }
                    required
                  >
                    <option value="">
                      {t("موضوع را انتخاب کنید", "Choose a topic")}
                    </option>
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.label[language]}
                      </option>
                    ))}
                  </select>
                  {fieldError("topic")}
                </div>
                {draft.topic === "order" && (
                  <div className="contact-inline-guide">
                    <ContactIcon kind="order" />
                    <div>
                      <p>
                        {t(
                          "برای پیگیری دقیق‌تر، از بخش پشتیبانی سفارش استفاده کنید. اگر به حساب دسترسی ندارید، می‌توانید همین‌جا پیام بفرستید.",
                          "For order-specific help, use order support. If you cannot access your account, you can still send a message here.",
                        )}
                      </p>
                      {link(
                        "رفتن به سفارش‌های من",
                        "Go to my orders",
                        contactOrdersRoute(signedIn),
                      )}
                    </div>
                  </div>
                )}
                {draft.topic === "commission" && (
                  <div className="contact-inline-guide">
                    <ContactIcon kind="commission" />
                    <div>
                      <p>
                        {t(
                          "برای ثبت ایده و دریافت پیشنهاد، از مسیر نقاشی سفارشی استفاده کنید. پیام عمومی جایگزین انتخاب سبک، بررسی تصویر و تأیید قیمت نیست.",
                          "Use the commission flow to submit your idea and request a proposal. A general message doesn't replace style selection, image review or quote acceptance.",
                        )}
                      </p>
                      {link(
                        "شروع سفارش سفارشی",
                        "Start a commission",
                        "/commissions/new",
                      )}
                    </div>
                  </div>
                )}
                <div className="contact-field">
                  <label htmlFor="contact-method">
                    {t("روش دریافت پاسخ", "Reply method")}
                    {required}
                  </label>
                  <select
                    id="contact-method"
                    value={draft.method}
                    onChange={(event) =>
                      update("method", event.target.value as ReplyMethod)
                    }
                    disabled={locked}
                    aria-invalid={Boolean(errors.method)}
                    aria-describedby={
                      errors.method
                        ? "contact-method-error"
                        : "contact-method-note"
                    }
                    required
                  >
                    <option value="">
                      {t("روش پاسخ را انتخاب کنید", "Choose a reply method")}
                    </option>
                    {methods.map((method) => (
                      <option value={method.id} key={method.id}>
                        {method.label[language]}
                      </option>
                    ))}
                  </select>
                  {fieldError("method")}
                  {config.demo && (
                    <p id="contact-method-note" className="contact-caption">
                      {t(
                        "روش‌های این نمونه Demo هستند؛ پشتیبانی واقعی باید تأیید شود.",
                        "These methods are Demo options; actual support must be confirmed.",
                      )}
                    </p>
                  )}
                </div>
                {draft.method === "email" && (
                  <div className="contact-field">
                    <label htmlFor="contact-email">
                      {t("ایمیل", "Email")}
                      {required}
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      inputMode="email"
                      dir="ltr"
                      autoComplete="email"
                      value={draft.email}
                      onChange={(event) => update("email", event.target.value)}
                      maxLength={config.maxLengths?.email}
                      disabled={locked}
                      required
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? "contact-email-error" : undefined
                      }
                    />
                    {fieldError("email")}
                  </div>
                )}
                {draft.method === "phone" && (
                  <div className="contact-field">
                    <label htmlFor="contact-phone">
                      {t("شماره تلفن", "Phone number")}
                      {required}
                    </label>
                    <div className="contact-phone-group" dir="ltr">
                      <div>
                        <label className="sr-only" htmlFor="contact-country">
                          {t("کد کشور", "Country code")}
                        </label>
                        <select
                          id="contact-country"
                          value={draft.country}
                          onChange={(event) =>
                            update("country", event.target.value)
                          }
                          disabled={locked}
                        >
                          {contactCountries.map((country) => (
                            <option key={country.id} value={country.id}>
                              {country.name[language]} {country.code}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        id="contact-phone"
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        autoComplete="tel-national"
                        value={draft.phone}
                        onChange={(event) =>
                          update("phone", event.target.value)
                        }
                        maxLength={config.maxLengths?.phone}
                        disabled={locked}
                        required
                        aria-invalid={Boolean(errors.phone)}
                        aria-describedby={
                          errors.phone
                            ? "contact-phone-error"
                            : "contact-phone-note"
                        }
                      />
                    </div>
                    {fieldError("phone")}
                    <p id="contact-phone-note" className="contact-caption">
                      {t(
                        "کدهای کشور و اعتبارسنجی این نسخه Demo هستند؛ زبان، کشور و شماره را تغییر نمی‌دهد.",
                        "Country codes and validation are Demo-only; language doesn't change your country or phone.",
                      )}
                    </p>
                  </div>
                )}
                {draft.topic === "order" && (
                  <div className="contact-field">
                    <label htmlFor="contact-order">
                      {t("شماره سفارش", "Order number")}
                      <span className="contact-optional">
                        {t("اختیاری", "Optional")}
                      </span>
                    </label>
                    <input
                      id="contact-order"
                      dir="ltr"
                      value={draft.order}
                      onChange={(event) => update("order", event.target.value)}
                      maxLength={config.maxLengths?.order}
                      disabled={locked}
                      autoComplete="off"
                      aria-invalid={Boolean(errors.order)}
                      aria-describedby={`contact-order-note${
                        errors.order ? " contact-order-error" : ""
                      }`}
                    />
                    <p id="contact-order-note" className="contact-caption">
                      {t(
                        "این شماره برای ارجاع پیام است و به‌تنهایی دسترسی به اطلاعات سفارش ایجاد نمی‌کند.",
                        "This number helps reference your message; it does not grant access to order details.",
                      )}
                    </p>
                    {fieldError("order")}
                  </div>
                )}
                <div className="contact-field">
                  <label htmlFor="contact-message">
                    {t("متن پیام", "Message")}
                    {required}
                  </label>
                  <textarea
                    id="contact-message"
                    rows={6}
                    value={draft.message}
                    onChange={(event) => update("message", event.target.value)}
                    maxLength={config.maxLengths?.message}
                    disabled={locked}
                    required
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={`contact-message-note${
                      errors.message ? " contact-message-error" : ""
                    }`}
                  />
                  <p className="contact-caption" id="contact-message-note">
                    {t(
                      "موضوع و توضیح مسئله را بنویسید. رمز عبور، کد تأیید یا اطلاعات بانکی ارسال نکنید.",
                      "Describe your question or issue. Do not send passwords, verification codes or banking details.",
                    )}
                  </p>
                  {fieldError("message")}
                </div>
                <div className="contact-form-footer">
                  <p>
                    {t(
                      "اطلاعات این فرم برای بررسی پیام و پاسخ‌گویی استفاده می‌شود.",
                      "The information in this form is used to review your message and respond.",
                    )}{" "}
                    {link("حریم خصوصی", "Privacy policy", "/privacy")}
                  </p>
                  <button
                    type="submit"
                    className="button primary contact-submit"
                    disabled={locked}
                  >
                    {busy ? (
                      <>
                        <span className="tracking-spinner" aria-hidden="true" />
                        {t("در حال ارسال…", "Sending…")}
                      </>
                    ) : (
                      <>
                        {t("ارسال پیام", "Send message")}
                        {arrow}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          )}
        </section>
        <aside className="contact-aside">
          <section className="contact-channels">
            <span className="guide-kicker">
              {t("راه‌های ارتباطی", "CONTACT CHANNELS")}
            </span>
            <h2>{t("راهی برای گفت‌وگو", "A way to connect")}</h2>
            {mode === "channels-loading" ? (
              <div className="contact-channel-skeletons" aria-busy="true">
                <span className="sr-only">
                  {t("بارگذاری اطلاعات تماس", "Loading contact details")}
                </span>
                {[1, 2, 3].map((i) => (
                  <div className="skeleton" key={i} />
                ))}
              </div>
            ) : channels.length ? (
              channels.map((channel) => (
                <a
                  className="contact-channel"
                  key={channel.id}
                  href={channel.href}
                  target={channel.kind === "social" ? "_blank" : undefined}
                  rel={
                    channel.kind === "social"
                      ? "noopener noreferrer"
                      : undefined
                  }
                >
                  <ContactIcon kind={channel.kind} />
                  <div>
                    <h3>{channel.title[language]}</h3>
                    <bdi dir="ltr">{channel.value}</bdi>
                  </div>
                </a>
              ))
            ) : (
              <div className="contact-channel-empty">
                {config.demo ? (
                  <>
                    <span className="contact-channel-placeholder">
                      <ContactIcon kind="email" />
                    </span>
                    <h3>
                      {t(
                        "نیازمند اطلاعات تأییدشده",
                        "Verified information required",
                      )}
                    </h3>
                    <p>
                      {t(
                        "شماره، ایمیل و شبکه اجتماعی تأییدشده‌ای ارائه نشده است؛ هیچ اطلاعات فرضی نمایش داده نمی‌شود.",
                        "No verified phone, email or social channel has been supplied; no invented details are displayed.",
                      )}
                    </p>
                  </>
                ) : (
                  <p>
                    {t(
                      "کانال تماس عمومی منتشرشده‌ای در دسترس نیست.",
                      "No published public contact channel is available.",
                    )}
                  </p>
                )}
                {!disabled && (
                  <p className="contact-channel-note">
                    {t(
                      "برای شروع، از فرم پیام همین صفحه استفاده کنید.",
                      "Start with the message form on this page.",
                    )}
                  </p>
                )}
              </div>
            )}
            {config.hoursApproved && config.hours && (
              <div className="contact-hours">
                <h3>{t("ساعات پاسخ‌گویی", "Support hours")}</h3>
                <p>{config.hours[language]}</p>
              </div>
            )}
          </section>
          <section className="contact-aside-help">
            <ContactIcon kind="faq" />
            <h3>
              {t(
                "پاسخ ممکن است همین‌جا باشد",
                "Your answer might be right here",
              )}
            </h3>
            <p>
              {t(
                "برای انتخاب محصول یا مسیر خرید، راهنما و سؤالات متداول را ببینید.",
                "For product choices or the shopping journey, explore our guide and FAQs.",
              )}
            </p>
            {link("راهنمای خرید", "Buying guide", "/guides/buying")}
            {link("سؤالات متداول", "FAQ", "/faq")}
          </section>
          <div className="contact-private-note">
            <span className="guide-kicker">
              {t("مسیر امن برای مدارک", "A PRIVATE PATH FOR EVIDENCE")}
            </span>
            <p>
              {t(
                "تصاویر سفارش، آسیب کالا و فایل مرجع نقاشی فقط در مسیر خصوصی و مرتبط دریافت می‌شوند. این فرم عمومی پیوست ندارد.",
                "Order images, damage evidence and artwork references belong in the relevant private flow. This public form has no attachments.",
              )}
            </p>
          </div>
        </aside>
      </div>
      {config.address?.approved && config.address.public && (
        <section className="contact-address">
          <h2>{t("آدرس عمومی", "Public address")}</h2>
          <p>{config.address.text[language]}</p>
          <p>{config.address.visitConditions[language]}</p>
          {config.address.mapUrl?.startsWith("https://") && (
            <a
              href={config.address.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              {t("بازکردن در نقشه", "Open in maps")}
              {arrow}
            </a>
          )}
          <p className="contact-caption">
            {t(
              "این آدرس، نشانی بازگشت کالا نیست؛ دستور بازگشت را از مسیر همان درخواست دریافت کنید.",
              "This is not a return address; obtain return instructions through the relevant request.",
            )}
          </p>
        </section>
      )}
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {busy
          ? t("در حال ارسال درخواست نمایشی", "Sending demo request")
          : status === "confirmed"
            ? t(
                "رسید Demo نمایش داده شد؛ پیام واقعی ارسال نشده است.",
                "Demo receipt displayed; no real message was sent.",
              )
            : messageForStatus}
      </p>
    </div>
  )
}
