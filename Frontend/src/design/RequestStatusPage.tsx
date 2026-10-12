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
  demoRequestIds,
  requestStatusFixture,
  validateShipment,
  type RequestMode,
} from "./request-status"
import "./cancellation.css"
import "./request-status.css"

const modes: [RequestMode, string, string][] = [
  ["review", "در حال بررسی", "Under review"],
  ["information", "نیازمند اطلاعات", "More information"],
  ["partial", "تأیید جزئی", "Partial approval"],
  ["instructions", "دستور و رهگیری", "Instructions & tracking"],
  ["received", "دریافت کالا", "Items received"],
  ["inspection", "بررسی کالا", "Inspection"],
  ["refund-approved", "مبلغ تأییدشده", "Refund approved"],
  ["processing", "انتقال در حال انجام", "Transfer processing"],
  ["completed", "انتقال تکمیل‌شده", "Transfer completed"],
  ["failed", "انتقال ناموفق", "Transfer failed"],
  ["cancellation", "لغو بدون حمل", "Cancellation, no shipping"],
  ["digital", "رسیدگی دیجیتال", "Digital review"],
  ["declined", "رد با مسیر کمک", "Declined with support"],
  ["payment", "پرداخت اولیه نامشخص", "Unknown original payment"],
  ["empty", "رویداد و مالی خالی", "Empty timeline & refund"],
  ["loading", "بارگذاری", "Loading"],
  ["network", "خطای شبکه", "Network error"],
  ["server", "خطای سرور", "Server error"],
  ["denied", "عدم دسترسی", "Access denied"],
]
export default function RequestStatusPage({
  page,
  navigate,
  renderMedia,
}: {
  page: string
  navigate: (route: string) => void
  renderMedia: (color: string, kind: string) => ReactNode
}) {
  const en = page.startsWith("/en/"),
    index = en ? 1 : 0
  const t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa"
  const id = page.split("/")[4]
  const permittedDemo = demoRequestIds.includes(id)
  const [mode, setMode] = useState<RequestMode>(
    id.startsWith("CR-") ? "cancellation" : "review",
  )
  const [live, setLive] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [destination, setDestination] = useState<string | null>(null)
  const [carrier, setCarrier] = useState(""),
    [tracking, setTracking] = useState("")
  const [shipmentErrors, setShipmentErrors] = useState<Record<string, string>>(
    {},
  )
  const [shipmentPending, setShipmentPending] = useState(false),
    [shipmentSaved, setShipmentSaved] = useState(false)
  const [details, setDetails] = useState(""),
    [detailsError, setDetailsError] = useState("")
  const [evidence, setEvidence] = useState<{
    name: string
    url: string
    accepted: boolean
    invalid?: boolean
  } | null>(null)
  const [evidencePending, setEvidencePending] = useState(false)
  const [infoPending, setInfoPending] = useState(false),
    [infoSaved, setInfoSaved] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null),
    origin = useRef<HTMLElement | null>(null)
  const shipmentForm = useRef<HTMLFormElement>(null),
    infoForm = useRef<HTMLFormElement>(null)
  const shipmentLock = useRef(false),
    infoLock = useRef(false)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const urls = useRef(new Set<string>())
  const snapshot = requestStatusFixture(mode)
  const denied = !permittedDemo || mode === "denied"
  const failedLoad = mode === "network" || mode === "server"
  const physical = snapshot.type === "return"
  const orderId = "NA-24018"
  const orderRoute = denied
    ? `${prefix}/account/orders`
    : `${prefix}/account/orders/${orderId}`
  const title =
    snapshot.type === "cancellation"
      ? t("پیگیری درخواست لغو", "Track your cancellation request")
      : snapshot.type === "digital"
        ? t("پیگیری درخواست رسیدگی دیجیتال", "Track your digital issue")
        : t("پیگیری درخواست مرجوعی", "Track your return request")
  const amount = (value: number | null) =>
    value === null ? (
      <span className="status-undetermined">
        {t("هنوز تعیین نشده", "Not determined yet")}
      </span>
    ) : (
      <span className="status-money">
        <bdi>{value.toLocaleString(en ? "en" : "fa")}</bdi>
        <small>{t("تومان", "IRT")}</small>
      </span>
    )
  const date = (value: string) =>
    new Intl.DateTimeFormat(en ? "en-GB" : "fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tehran",
    }).format(new Date(value))
  const later = (fn: () => void, ms = 700) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      fn()
    }, ms)
    timers.current.add(timer)
  }
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      urls.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )
  useEffect(() => {
    if (destination) dialog.current?.showModal()
    else if (dialog.current?.open) dialog.current.close()
  }, [destination])
  const close = () => {
    setDestination(null)
    requestAnimationFrame(() => origin.current?.focus())
  }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (
      route === `${prefix}/account` ||
      route.includes("/auth/") ||
      route.endsWith("/receipt")
    )
      navigate(route)
    else {
      origin.current = event.currentTarget
      setDestination(route)
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id)
      setLive(t("کپی شد", "Copied"))
    } catch {
      setLive(
        t(
          "کپی ممکن نشد؛ شناسه را انتخاب و کپی کنید.",
          "Unable to copy. Select and copy the ID.",
        ),
      )
    }
  }
  const refresh = () => {
    if (refreshing) return
    setRefreshing(true)
    later(() => {
      setRefreshing(false)
      setLive(
        t(
          "سرویس متصل نیست؛ وضعیت تازه دریافت نشد. داده نمایش‌داده‌شده همچنان نمونه Demo است.",
          "No service is connected; a fresh status was not retrieved. Displayed data remains a Demo fixture.",
        ),
      )
    })
  }
  const submitShipment = (event: FormEvent) => {
    event.preventDefault()
    if (mode !== "instructions" || shipmentLock.current || shipmentSaved) return
    const errors = validateShipment(carrier, tracking)
    setShipmentErrors(errors)
    if (Object.keys(errors).length) {
      requestAnimationFrame(() =>
        shipmentForm.current
          ?.querySelector<HTMLElement>(`#status-${Object.keys(errors)[0]}`)
          ?.focus(),
      )
      return
    }
    shipmentLock.current = true
    setShipmentPending(true)
    later(() => {
      setShipmentPending(false)
      setShipmentSaved(true)
      setLive(
        t(
          "اطلاعات ارسال در نمونه ثبت شد · Demo. این نتیجه تأیید شرکت حمل یا دریافت کالا نیست.",
          "Shipment details recorded in the fixture · Demo. This is not carrier confirmation or receipt of goods.",
        ),
      )
    })
  }
  const chooseEvidence = (file: File | undefined) => {
    if (!file || infoPending) return
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024 ||
      !file.size
    ) {
      setDetailsError(
        t(
          "تصویر با قرارداد نمونه سازگار نیست.",
          "The image does not match the demo contract.",
        ),
      )
      return
    }
    if (evidence) {
      URL.revokeObjectURL(evidence.url)
      urls.current.delete(evidence.url)
    }
    const url = URL.createObjectURL(file)
    urls.current.add(url)
    setEvidence({ name: file.name, url, accepted: false })
    setLive(
      t(
        "تصویر محلی انتخاب شد؛ آپلود نشده است.",
        "Image selected locally; it has not been uploaded.",
      ),
    )
  }
  const acceptEvidence = () => {
    if (!evidence || evidence.invalid || evidencePending) return
    setEvidencePending(true)
    later(() => {
      setEvidencePending(false)
      setEvidence((previous) =>
        previous && !previous.invalid
          ? { ...previous, accepted: true }
          : previous,
      )
      setLive(
        t(
          "بررسی تصویر شبیه‌سازی شد · Demo؛ فایل از دستگاه خارج نشده است.",
          "Image review simulated · Demo; the file has not left your device.",
        ),
      )
    })
  }
  const submitInformation = (event: FormEvent) => {
    event.preventDefault()
    if (mode !== "information" || infoLock.current || infoSaved) return
    if (!details.trim() || !evidence?.accepted) {
      setDetailsError(
        t(
          "توضیح و تصویر پذیرفته‌شده لازم را تکمیل کنید.",
          "Complete the required details and accepted image.",
        ),
      )
      requestAnimationFrame(() =>
        infoForm.current
          ?.querySelector<HTMLElement>(
            !details.trim() ? "#status-details" : "#status-evidence",
          )
          ?.focus(),
      )
      return
    }
    infoLock.current = true
    setInfoPending(true)
    setDetailsError("")
    later(() => {
      setInfoPending(false)
      setInfoSaved(true)
      setLive(
        t(
          "اطلاعات تکمیلی در نمونه ثبت شد · Demo؛ وضعیت درخواست یا انتقال وجه تغییر نکرده است.",
          "Additional information recorded in the fixture · Demo; request and transfer status have not changed.",
        ),
      )
    })
  }
  const preview = (value: RequestMode) => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
    urls.current.forEach((url) => URL.revokeObjectURL(url))
    urls.current.clear()
    setMode(value)
    setLive("")
    setRefreshing(false)
    setCarrier("")
    setTracking("")
    setShipmentErrors({})
    setShipmentSaved(false)
    setShipmentPending(false)
    shipmentLock.current = false
    setDetails("")
    setDetailsError("")
    setEvidence(null)
    setEvidencePending(false)
    setInfoSaved(false)
    setInfoPending(false)
    infoLock.current = false
  }
  const refundLabel = {
    undetermined: t("هنوز تعیین نشده", "Not determined yet"),
    approved: t("تأیید شد", "Approved"),
    processing: t("در حال انجام", "Processing"),
    completed: t("تکمیل شد", "Completed"),
    failed: t("ناموفق", "Failed"),
  }[snapshot.refundStatus]
  const statusDescription =
    mode === "information"
      ? t(
          "برای بررسی دفتر، تصویر جلد آسیب‌دیده و توضیح کوتاه لازم است.",
          "A damaged-cover photo and brief description are needed for the notebook review.",
        )
      : mode === "declined"
        ? t(
            "نتیجه و دلیل عمومی برای هر قلم مشخص است. مسیر پشتیبانی همچنان فعال است.",
            "The result and public reason are shown for each item. Support remains available.",
          )
        : snapshot.instructions || mode === "partial"
          ? t(
              "بازگشت ۱ پکیج و ۱ دفتر مجاز شده است؛ این تصمیم به معنی واریز وجه نیست.",
              "Return of 1 bundle and 1 notebook is authorized; this decision is not a funds transfer.",
            )
          : snapshot.type === "cancellation"
            ? t(
                "لغو ۱ دفتر تأیید شده است · Demo؛ انتقال وجه هنوز تکمیل نشده است.",
                "Cancellation of 1 notebook approved · Demo; the funds transfer is not completed.",
              )
            : t(
                "درخواست و شرایط تاریخی سفارش در حال بررسی‌اند؛ هنوز نتیجه نهایی ثبت نشده است.",
                "Your request and historical order conditions are under review; no final outcome is recorded.",
              )
  return (
    <DashboardPage
      page={page}
      navigate={navigate}
      renderMedia={renderMedia}
      panelTitle={title}
    >
      <div className="cancel-page request-status-page">
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
            <bdi>{denied || mode === "loading" || failedLoad ? "—" : orderId}</bdi>
          </a>
          <span>/</span>
          <span aria-current="page">
            {snapshot.type === "cancellation"
              ? t("درخواست لغو", "Cancellation request")
              : snapshot.type === "digital"
                ? t("رسیدگی دیجیتال", "Digital issue")
                : t("درخواست مرجوعی", "Return request")}
          </span>
        </nav>
        <div className="status-title-row">
          <div className="cancel-heading">
            <span className="cancel-eyebrow">YOUR ACCOUNT · USER-07</span>
            <h1>{title}</h1>
            <p>
              {t(
                "مسیر درخواست و نتیجه مالی آن را، قدم‌به‌قدم، دنبال کنید.",
                "Follow your request and its financial outcome, step by step.",
              )}
            </p>
          </div>
          <button
            className="button secondary"
            disabled={refreshing || denied || mode === "loading"}
            onClick={refresh}
          >
            <Glyph name="clock" size={17} />
            {refreshing
              ? t("در حال بررسی…", "Checking…")
              : t("بررسی دوباره وضعیت", "Check status")}
          </button>
        </div>
        <div className="cancel-demo">
          <span>Demo</span>
          <p>
            {t(
              "همه تصمیم‌ها، نشانی‌ها، رویدادها و تراکنش‌ها نمونه طراحی‌اند؛ هیچ پذیرش، دریافت کالا، QC یا انتقال وجه واقعی انجام نشده است.",
              "All decisions, addresses, events and transactions are design fixtures; no actual approval, receipt, inspection or funds transfer occurred.",
            )}
          </p>
        </div>
        <div className="cancel-live" role="status" aria-live="polite">
          {live}
        </div>
        {denied ? (
          <section className="cancel-state">
            <Glyph name="shield" size={32} />
            <h2>
              {t(
                "امکان دسترسی به این درخواست وجود ندارد.",
                "This request cannot be accessed.",
              )}
            </h2>
            <p>
              {t(
                "نمایش اطلاعات به تأیید مالکیت و مجوز سرویس نیاز دارد.",
                "Displaying information requires service ownership and permission checks.",
              )}
            </p>
          </section>
        ) : mode === "loading" ? (
          <div
            className="cancel-loading"
            aria-busy="true"
            aria-label={t(
              "در حال دریافت وضعیت درخواست",
              "Loading request status",
            )}
          >
            <div className="skeleton" />
            <div className="status-layout">
              <div className="skeleton status-loading-main" />
              <div className="skeleton status-loading-side" />
            </div>
          </div>
        ) : failedLoad ? (
          <section className="cancel-state">
            <Glyph name="clock" size={32} />
            <h2>
              {mode === "server"
                ? t(
                    "وضعیت درخواست موقتاً در دسترس نیست.",
                    "Request status is temporarily unavailable.",
                  )
                : t(
                    "دریافت وضعیت درخواست ممکن نشد.",
                    "Unable to load request status.",
                  )}
            </h2>
            <p>
              {t(
                "این خطا به معنی رد درخواست یا ناموفق‌بودن پرداخت نیست.",
                "This error does not imply a declined request or failed payment.",
              )}
            </p>
            <button
              className="button primary"
              onClick={refresh}
              disabled={refreshing}
            >
              {t("تلاش دوباره", "Try again")}
            </button>
          </section>
        ) : (
          <>
            <section className="status-request-meta">
              <div>
                <span>{t("شماره درخواست", "Request number")}</span>
                <strong>
                  <bdi>{id}</bdi>
                  <button
                    className="icon-button"
                    onClick={copy}
                    aria-label={t("کپی شماره درخواست", "Copy request number")}
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
              </div>
              <div>
                <span>{t("سفارش مرتبط", "Related order")}</span>
                <strong>
                  <bdi>{orderId}</bdi>
                </strong>
              </div>
              <div>
                <span>{t("تاریخ ثبت", "Submitted at")}</span>
                <strong>
                  <time dateTime="2025-06-09T10:30:00+03:30">
                    {date("2025-06-09T10:30:00+03:30")}
                  </time>
                </strong>
              </div>
              <div>
                <span>
                  {t("آخرین به‌روزرسانی نمونه", "Last fixture update")}
                </span>
                <strong>
                  <time dateTime={snapshot.updatedAt}>
                    {date(snapshot.updatedAt)}
                  </time>
                </strong>
              </div>
            </section>
            <div className="status-layout">
              <div className="status-primary">
                <section
                  className={`status-hero ${
                    mode === "declined" ? "declined" : ""
                  }`}
                >
                  <span className="status-hero-icon">
                    <Glyph
                      name={
                        mode === "information"
                          ? "chat"
                          : mode === "review" || mode === "digital" || mode === "payment" || mode === "empty"
                            ? "clock"
                            : mode === "declined" ? "shield" : "check"
                      }
                      size={25}
                    />
                  </span>
                  <div>
                    <span className="status-section-eyebrow">
                      {t("آخرین وضعیت درخواست", "Latest request status")} · Demo
                    </span>
                    <h2>{snapshot.status[index]}</h2>
                    <p>{statusDescription}</p>
                    <div className="status-action-note">
                      {mode === "information" ? (
                        <a
                          href="#status-information"
                          className="button primary"
                        >
                          {t(
                            "تکمیل توضیحات و تصویر",
                            "Provide details & image",
                          )}
                          <Glyph name="arrow" size={16} />
                        </a>
                      ) : mode === "instructions" ? (
                        <a
                          href="#status-instructions"
                          className="button primary"
                        >
                          {t("مشاهده دستور بازگشت", "View return instructions")}
                          <Glyph name="arrow" size={16} />
                        </a>
                      ) : (
                        <span>
                          <Glyph name="shield" size={14} />
                          {t(
                            "در حال حاضر اقدامی از شما لازم نیست.",
                            "No action is required from you right now.",
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </section>
                {mode === "payment" && (
                  <div className="cancel-notice">
                    <Glyph name="clock" />
                    <div>
                      <strong>
                        {t(
                          "نتیجه پرداخت اولیه در حال بررسی است.",
                          "The original payment result is being checked.",
                        )}
                      </strong>
                      <p>
                        {t(
                          "بازپرداخت هنوز تعیین نشده؛ دوباره پرداخت نکنید.",
                          "Refund is not determined yet. Do not pay again.",
                        )}
                      </p>
                    </div>
                  </div>
                )}
                <section className="status-card">
                  <div className="status-card-heading">
                    <h2>
                      {t("اقلام و نتیجه بررسی", "Items & review outcome")}
                    </h2>
                    <span>
                      {t(
                        "درخواست اولیه ≠ تصمیم نهایی",
                        "Original request ≠ final decision",
                      )}
                    </span>
                  </div>
                  {snapshot.lines.map((line) => (
                    <article className="status-item" key={line.id}>
                      <div className="status-item-top">
                        <div className="cancel-item-thumb">
                          {line.kind === "digital" ? (
                            <div className="cancel-neutral-art">
                              <Glyph name="download" size={24} />
                            </div>
                          ) : (
                            renderMedia(
                              line.kind === "bundle" ? "sage" : "sand",
                              "book",
                            )
                          )}
                        </div>
                        <div>
                          <h3>{line.title[index]}</h3>
                          <p>{line.options[index]}</p>
                        </div>
                      </div>
                      <dl className="status-item-counts">
                        <div>
                          <dt>{t("تعداد درخواست‌شده", "Requested quantity")}</dt>
                          <dd>
                            {line.requested.toLocaleString(en ? "en" : "fa")}
                          </dd>
                        </div>
                        <div>
                          <dt>{t("تعداد تأییدشده", "Approved quantity")}</dt>
                          <dd>
                            {line.approved === null
                              ? t("هنوز تصمیمی ثبت نشده", "No decision yet")
                              : line.approved.toLocaleString(en ? "en" : "fa")}
                          </dd>
                        </div>
                        {line.declined !== null && (
                          <div>
                            <dt>{t("تعداد ردشده", "Declined quantity")}</dt>
                            <dd>
                              {line.declined.toLocaleString(en ? "en" : "fa")}
                            </dd>
                          </div>
                        )}
                      </dl>
                      <span
                        className={`status-decision ${
                          line.approved === null ? "pending" : ""
                        }`}
                      >
                        {line.decision[index]} · Demo
                      </span>
                      <p className="status-public-note">{line.note[index]}</p>
                      {line.approved !== null && line.approved > 0 && (
                        <div className="status-paid-share">
                          <span>
                            {t(
                              "سهم پرداختی تاریخی تعداد تأییدشده",
                              "Historical paid share of approved units",
                            )}
                          </span>
                          {amount(line.approved * line.paidUnitShare)}
                        </div>
                      )}
                    </article>
                  ))}
                </section>
                <section className="status-card">
                  <div className="status-card-heading">
                    <h2>{t("مسیر درخواست شما", "Your request journey")}</h2>
                    <Glyph name="clock" size={19} />
                  </div>
                  {snapshot.events.length ? (
                    <ol className="status-timeline">
                      {snapshot.events.map((event, i) => (
                        <li
                          key={i}
                          className={`${event.current ? "current" : ""} ${
                            event.future ? "future" : ""
                          }`}
                          aria-current={event.current ? "step" : undefined}
                        >
                          <span className="status-timeline-marker">
                            {event.future ? (
                              <span />
                            ) : event.current ? (
                              <Glyph name="clock" size={13} />
                            ) : (
                              <Glyph name="check" size={12} />
                            )}
                          </span>
                          <div>
                            <h3>
                              {event.title[index]}
                              {event.current && (
                                <span>{t("مرحله جاری", "Current stage")}</span>
                              )}
                            </h3>
                            {event.timestamp ? (
                              <time dateTime={event.timestamp}>
                                {date(event.timestamp)}
                              </time>
                            ) : (
                              <small>
                                {t(
                                  "هنوز رویدادی ثبت نشده؛ بدون تاریخ",
                                  "Not recorded yet; no date",
                                )}
                              </small>
                            )}
                            <p>{event.note[index]}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="status-empty">
                      {t(
                        "هنوز رویداد جدیدی ثبت نشده است.",
                        "No new event has been recorded yet.",
                      )}
                    </p>
                  )}
                </section>
                {physical && mode !== "declined" && (
                  <section id="status-instructions" className="status-card">
                    <div className="status-card-heading">
                      <h2>{t("دستور بازگشت کالا", "Return instructions")}</h2>
                      <Glyph name="box" size={20} />
                    </div>
                    {snapshot.instructions ? (
                      <>
                        <div className="status-demo-address-warning">
                          {t(
                            "دستور زیر فقط Demo است؛ به این نشانی نمونه کالا ارسال نکنید.",
                            "The following instructions are Demo only. Do not send any item to this sample address.",
                          )}
                        </div>
                        <dl className="status-instructions">
                          <div>
                            <dt>{t("اقلام مجاز", "Authorized items")}</dt>
                            <dd>
                              {t(
                                "۱ پکیج کامل گربه‌ها و ۱ دفتر لحظه‌های آرام",
                                "1 complete cats bundle and 1 Quiet moments notebook",
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              {t("شناسه بازگشت نمونه", "Demo return reference")}
                            </dt>
                            <dd>
                              <bdi>RA-2056</bdi>
                            </dd>
                          </div>
                          <div>
                            <dt>
                              {t(
                                "نشانی تأییدشده در پاسخ نمونه",
                                "Address in fixture response",
                              )}
                            </dt>
                            <dd>
                              {t(
                                "تهران، خیابان نمونه، پلاک ۱۲ • نشانی Demo",
                                "Tehran, Sample Street, No. 12 • Demo address",
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              {t(
                                "گیرنده و تماس مجاز نمونه",
                                "Demo recipient & contact",
                              )}
                            </dt>
                            <dd>
                              {t(
                                "واحد دریافت نمونه نیل‌آرت • تماس از طریق پشتیبانی درخواست",
                                "Nilart demo receiving desk • Contact via request support",
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              {t(
                                "روش حمل مجاز نمونه",
                                "Demo permitted shipping",
                              )}
                            </dt>
                            <dd>
                              {t(
                                "پست یا پیک مجاز در قرارداد نمونه",
                                "Post or courier permitted by the fixture contract",
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              {t(
                                "بسته‌بندی و اقلام همراه",
                                "Packaging & included items",
                              )}
                            </dt>
                            <dd>
                              {t(
                                "پکیج کامل همراه دفتر، ۲ استیکر و نشان‌کتاب؛ محافظت از جلد دفتر هنگام بسته‌بندی • Demo",
                                "Complete bundle with notebook, 2 stickers and bookmark; protect notebook covers during packing • Demo",
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              {t("مسئول هزینه", "Shipping cost responsibility")}
                            </dt>
                            <dd>
                              {t(
                                "فروشگاه در دستور نمونه؛ ارسال رایگان واقعی تضمین نشده است",
                                "Store in the fixture instructions; actual free shipping is not guaranteed",
                              )}
                            </dd>
                          </div>
                        </dl>
                        {mode === "instructions" && (
                          <form
                            className="status-shipment-form"
                            noValidate
                            ref={shipmentForm}
                            onSubmit={submitShipment}
                          >
                            <h3>
                              {t(
                                "ثبت اطلاعات ارسال برگشت",
                                "Add return shipment details",
                              )}
                            </h3>
                            <p>
                              {t(
                                "ثبت توسط شما با تأیید شرکت حمل یا دریافت کالا متفاوت است.",
                                "Your submission differs from carrier confirmation or receipt of goods.",
                              )}
                            </p>
                            {shipmentSaved ? (
                              <div className="status-recorded">
                                <Glyph name="check" size={18} />
                                <span>
                                  {t(
                                    "اطلاعات ارسال ثبت شد · Demo؛ ارسال و دریافت تأیید نشده‌اند.",
                                    "Shipment details recorded · Demo; dispatch and receipt are unconfirmed.",
                                  )}
                                  <bdi>{tracking}</bdi>
                                </span>
                              </div>
                            ) : (
                              <>
                                <label htmlFor="status-carrier">
                                  {t("شرکت حمل", "Carrier")}
                                </label>
                                <select
                                  id="status-carrier"
                                  value={carrier}
                                  onChange={(event) =>
                                    setCarrier(event.target.value)
                                  }
                                  disabled={shipmentPending}
                                  aria-invalid={!!shipmentErrors.carrier}
                                  aria-describedby={
                                    shipmentErrors.carrier
                                      ? "status-carrier-error"
                                      : undefined
                                  }
                                >
                                  <option value="">
                                    {t("انتخاب شرکت حمل", "Select a carrier")}
                                  </option>
                                  <option value="post">
                                    {t("پست · Demo", "Post · Demo")}
                                  </option>
                                  <option value="courier">
                                    {t("پیک · Demo", "Courier · Demo")}
                                  </option>
                                </select>
                                {shipmentErrors.carrier && (
                                  <p
                                    id="status-carrier-error"
                                    className="cancel-field-error"
                                  >
                                    {t(
                                      "شرکت حمل مجاز را انتخاب کنید.",
                                      "Choose a permitted carrier.",
                                    )}
                                  </p>
                                )}
                                <label htmlFor="status-tracking">
                                  {t("کد رهگیری", "Tracking code")}
                                </label>
                                <input
                                  id="status-tracking"
                                  dir="ltr"
                                  value={tracking}
                                  maxLength={40}
                                  onChange={(event) =>
                                    setTracking(event.target.value)
                                  }
                                  disabled={shipmentPending}
                                  aria-invalid={!!shipmentErrors.tracking}
                                  aria-describedby="status-tracking-hint"
                                />
                                <small id="status-tracking-hint">
                                  {shipmentErrors.tracking
                                    ? t(
                                        "کد رهگیری معتبر وارد کنید.",
                                        "Enter a valid tracking code.",
                                      )
                                    : t(
                                        "قرارداد Demo: ۶ تا ۴۰ حرف لاتین، رقم یا خط تیره",
                                        "Demo contract: 6–40 Latin letters, digits or hyphens",
                                      )}
                                </small>
                                <button
                                  type="submit"
                                  className="button primary"
                                  disabled={shipmentPending}
                                >
                                  {shipmentPending
                                    ? t("در حال ثبت…", "Submitting…")
                                    : t(
                                        "ثبت اطلاعات ارسال",
                                        "Submit shipment details",
                                      )}
                                </button>
                              </>
                            )}
                          </form>
                        )}
                        {!snapshot.received && (
                          <div className="status-inspection-note">
                            <Glyph name="box" size={21} />
                            <div>
                              <strong>{t("در انتظار دریافت کالا · Demo", "Awaiting returned item · Demo")}</strong>
                              <p>{t("هیچ رویداد تأییدشده‌ای از دریافت کالا ثبت نشده است.", "No confirmed item-receipt event has been recorded.")}</p>
                            </div>
                          </div>
                        )}
                        {snapshot.received && (
                          <div className="status-inspection-note">
                            <Glyph name="box" size={21} />
                            <div>
                              <strong>
                                {snapshot.inspected
                                  ? t(
                                      "بررسی تکمیل شد · Demo",
                                      "Inspection completed · Demo",
                                    )
                                  : mode === "inspection"
                                    ? t(
                                        "در حال بررسی کالا · Demo",
                                        "Item inspection in progress · Demo",
                                      )
                                    : t(
                                        "کالا دریافت شد · Demo",
                                        "Item received · Demo",
                                      )}
                              </strong>
                              <p>
                                {snapshot.inspected
                                  ? t(
                                      "نتیجه عمومی: ۱ پکیج و ۱ دفتر پذیرفته شدند. وضعیت انتقال وجه جداست.",
                                      "Public outcome: 1 bundle and 1 notebook accepted. Transfer status is separate.",
                                    )
                                  : t(
                                      "دریافت کالا، تأیید سلامت، پذیرش نهایی یا بازپرداخت نیست.",
                                      "Receipt is not confirmation of condition, final acceptance or a refund.",
                                    )}
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="status-no-instructions">
                        <Glyph name="shield" size={19} />
                        <p>
                          {t(
                            "تا دریافت دستور بازگشت، کالا را ارسال نکنید.",
                            "Do not send the item until return instructions are provided.",
                          )}
                        </p>
                      </div>
                    )}
                  </section>
                )}
                {mode === "information" && (
                  <section id="status-information" className="status-card">
                    <div className="status-card-heading">
                      <h2>
                        {t(
                          "اطلاعات تکمیلی موردنیاز",
                          "Requested additional information",
                        )}
                      </h2>
                      <span>
                        {t(
                          "برای دفتر لحظه‌های آرام",
                          "For the Quiet moments notebook",
                        )}
                      </span>
                    </div>
                    <form
                      noValidate
                      ref={infoForm}
                      onSubmit={submitInformation}
                    >
                      <p className="status-public-note">
                        {t(
                          "تصویر جلد آسیب‌دیده و توضیح کوتاه لازم است. رمز، OTP یا اطلاعات بانکی ارسال نکنید.",
                          "A photo of the damaged cover and a brief description are needed. Do not send passwords, OTPs or banking details.",
                        )}
                      </p>
                      {infoSaved ? (
                        <div className="status-recorded">
                          <Glyph name="check" size={18} />
                          <p>
                            {t(
                              "اطلاعات تکمیلی ثبت شد · Demo؛ بررسی هنوز ادامه دارد.",
                              "Additional information recorded · Demo; review is still ongoing.",
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="status-supplement-form">
                          <label htmlFor="status-details">
                            {t(
                              "توضیح مرتبط با دفتر",
                              "Details about the notebook",
                            )}
                          </label>
                          <textarea
                            id="status-details"
                            rows={3}
                            value={details}
                            maxLength={1000}
                            onChange={(event) => setDetails(event.target.value)}
                            disabled={infoPending}
                            aria-describedby="status-details-error"
                          />
                          <label htmlFor="status-evidence">
                            {t("تصویر جلد آسیب‌دیده", "Damaged cover image")}
                          </label>
                          <input
                            id="status-evidence"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={infoPending || evidencePending}
                            onChange={(event) => {
                              chooseEvidence(event.target.files?.[0])
                              event.target.value = ""
                            }}
                          />
                          <small>
                            {t(
                              "قرارداد Demo: ۱ تصویر JPEG، PNG یا WebP تا ۵ مگابایت؛ توضیح تا ۱۰۰۰ نویسه",
                              "Demo contract: 1 JPEG, PNG or WebP image up to 5 MB; up to 1,000 characters",
                            )}
                          </small>
                          {evidence && (
                            <div className="status-local-evidence">
                              <img
                                src={evidence.url}
                                onError={() => {
                                  setEvidence(previous => previous ? { ...previous, invalid: true, accepted: false } : null)
                                  setDetailsError(t("تصویر قابل نمایش نیست؛ فایل معتبر دیگری انتخاب کنید.", "The image cannot be displayed. Choose another valid image."))
                                }}
                                alt={t(
                                  "پیش‌نمایش خصوصی محلی جلد دفتر",
                                  "Local private preview of the notebook cover",
                                )}
                              />
                              <div>
                                <bdi>{evidence.name}</bdi>
                                <p>
                                  {evidence.accepted
                                    ? t(
                                        "پذیرفته‌شده · Demo، نه آپلود واقعی",
                                        "Accepted · Demo, not actually uploaded",
                                      )
                                    : t(
                                        "انتخاب محلی؛ آپلود نشده",
                                        "Selected locally; not uploaded",
                                      )}
                                </p>
                                {!evidence.accepted && (
                                  <button
                                    type="button"
                                    className="text-link"
                                    onClick={acceptEvidence}
                                    disabled={evidencePending || infoPending || evidence.invalid}
                                  >
                                    {evidencePending
                                      ? t(
                                          "شبیه‌سازی بررسی…",
                                          "Simulating review…",
                                        )
                                      : t(
                                          "شبیه‌سازی پذیرش تصویر",
                                          "Simulate image acceptance",
                                        )}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="text-link"
                                  disabled={evidencePending || infoPending}
                                  onClick={() => {
                                    URL.revokeObjectURL(evidence.url)
                                    urls.current.delete(evidence.url)
                                    setEvidence(null)
                                  }}
                                >
                                  {t("حذف تصویر", "Remove image")}
                                </button>
                              </div>
                            </div>
                          )}
                          <p
                            id="status-details-error"
                            className="cancel-field-error"
                          >
                            {detailsError}
                          </p>
                          <button
                            type="submit"
                            className="button primary"
                            disabled={infoPending || evidencePending}
                          >
                            {infoPending
                              ? t("در حال ثبت…", "Submitting…")
                              : t(
                                  "ثبت اطلاعات تکمیلی",
                                  "Submit additional information",
                                )}
                          </button>
                        </div>
                      )}
                    </form>
                  </section>
                )}
                <section className="status-card">
                  <div className="status-card-heading">
                    <h2>
                      {t(
                        "توضیحات و مدارک درخواست",
                        "Request details & evidence",
                      )}
                    </h2>
                    <Glyph name="chat" size={18} />
                  </div>
                  <p className="status-public-note">
                    {snapshot.type === "digital" ? t("توضیح نمونه مشتری: دسترسی به فایل نهایی نیازمند بررسی است.", "Demo customer description: access to the final file needs review.") : snapshot.type === "cancellation" ? t("توضیح نمونه مشتری: درخواست لغو ۱ دفتر ثبت کرده‌ام.", "Demo customer description: I requested cancellation of 1 notebook.") : t(
                      "توضیح عمومی نمونه مشتری: جلد دفتر آسیب دیده است؛ درخواست بررسی همین قلم را دارم.",
                      "Demo customer description: the notebook cover is damaged; please review this item.",
                    )}
                  </p>
                  <div className="status-evidence-empty">
                    {t(
                      "فایل خصوصی معتبر به این پیش‌نمایش متصل نیست؛ تصویر یا لینک عمومی ساختگی نمایش داده نمی‌شود.",
                      "No verified private file is connected to this preview; no fabricated image or public link is shown.",
                    )}
                  </div>
                </section>
              </div>
              <aside className="status-secondary">
                <section className="status-refund-card">
                  <div className="status-card-heading">
                    <h2>{t("وضعیت بازپرداخت", "Refund status")}</h2>
                    <Glyph name="bag" size={21} />
                  </div>
                  <span
                    className={`status-refund-badge ${snapshot.refundStatus}`}
                  >
                    {refundLabel} · Demo
                  </span>
                  {mode === "empty" ? (
                    <p className="status-empty">
                      {t(
                        "بازپرداختی برای این درخواست ثبت نشده است.",
                        "No refund has been recorded for this request.",
                      )}
                    </p>
                  ) : (
                    <>
                      <dl className="status-financial-rows">
                        <div>
                          <dt>{t("مبلغ درخواست‌شده", "Requested amount")}</dt>
                          <dd>{amount(snapshot.requested)}</dd>
                        </div>
                        <div>
                          <dt>{t("مبلغ تأییدشده", "Approved amount")}</dt>
                          <dd>{amount(snapshot.approved)}</dd>
                        </div>
                        <div>
                          <dt>{t("در حال پردازش", "Processing amount")}</dt>
                          <dd>{amount(snapshot.processing)}</dd>
                        </div>
                      </dl>
                      <div className="status-returned">
                        <span>{t("وجه بازگشت‌داده‌شده", "Funds returned")}</span>
                        <strong>{amount(snapshot.returned)}</strong>
                      </div>
                      <p className="status-finance-note">
                        {t(
                          "مبلغ درخواست‌شده تعهد پرداخت نیست. تأیید مبلغ نیز به معنی انتقال وجه نیست.",
                          "A requested amount is not a payment commitment. Approval is not a transfer.",
                        )}
                      </p>
                      {snapshot.approved !== null && (
                        <p className="status-finance-note">
                          {t(
                            "بر پایه سهم پرداختی تاریخی اقلام تأییدشده، پس از تخفیف تخصیص‌یافته.",
                            "Based on historical paid shares of approved items, after allocated discounts.",
                          )}
                        </p>
                      )}
                      {snapshot.refundStatus === "failed" && (
                        <div className="status-refund-attention">
                          <strong>
                            {t(
                              "انتقال وجه نیازمند رسیدگی است.",
                              "The funds transfer needs attention.",
                            )}
                          </strong>
                          <p>
                            {t(
                              "مبلغ تأییدشده باقی است؛ وضعیت تکمیل انتقال تأیید نشده است.",
                              "The approved amount remains; transfer completion is not confirmed.",
                            )}
                          </p>
                        </div>
                      )}
                      {snapshot.refundStatus === "completed" && (
                        <dl className="status-refund-transaction">
                          <div>
                            <dt>{t("روش نمونه", "Demo method")}</dt>
                            <dd>
                              {t(
                                "بازگشت از درگاه اولیه",
                                "Original payment gateway",
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              {t("شناسه عمومی تراکنش", "Public transaction ID")}
                            </dt>
                            <dd>
                              <bdi>RF-TX-821056</bdi>
                            </dd>
                          </div>
                          <div>
                            <dt>
                              {t("زمان تکمیل نمونه", "Fixture completion time")}
                            </dt>
                            <dd>{date("2025-06-16T10:20:00+03:30")}</dd>
                          </div>
                        </dl>
                      )}
                    </>
                  )}
                </section>
                <section className="status-card status-actions-card">
                  <h2>{t("لینک‌های مرتبط", "Related links")}</h2>
                  <a href={orderRoute} onClick={follow(orderRoute)}>
                    <Glyph name="box" size={19} />
                    <span>{t("مشاهده سفارش", "View order")}</span>
                    <Glyph name="arrow" size={15} />
                  </a>
                  <a
                    href={`${orderRoute}/receipt`}
                    onClick={follow(`${orderRoute}/receipt`)}
                  >
                    <Glyph name="book" size={19} />
                    <span>{t("مشاهده رسید", "View receipt")}</span>
                    <Glyph name="arrow" size={15} />
                  </a>
                  <a
                    href={`${prefix}/account/support?request=${id}`}
                    onClick={follow(`${prefix}/account/support?request=${id}`)}
                  >
                    <Glyph name="chat" size={19} />
                    <span>
                      {t("پرسش درباره این درخواست", "Ask about this request")}
                    </span>
                    <Glyph name="arrow" size={15} />
                  </a>
                </section>
                <div className="status-care-note">
                  <Glyph name="paint" size={26} />
                  <h3>
                    {t(
                      "با دقت، تا روشن‌شدن نتیجه",
                      "With care, until the outcome is clear",
                    )}
                  </h3>
                  <p>
                    {t(
                      "ثبت، بررسی و انتقال وجه مراحل مستقل‌اند؛ نتیجه هر مرحله اینجا روشن می‌شود.",
                      "Submission, review and transfer are separate stages. Each outcome is made clear here.",
                    )}
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
        <footer className="cancel-footer">
          <span>
            {t("همراه شما، در هر مرحله.", "Alongside you, at every stage.")}
          </span>
          <span>Nilart · Demo</span>
        </footer>
        <details className="dash-preview">
          <summary>
            {t("حالت‌های پیش‌نمایش", "Preview states")} <bdi>USER-07 · Demo</bdi>
          </summary>
          <div>
            {modes.map(([value, fa, english]) => (
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
          ref={dialog}
          className="cancel-destination modal"
          aria-labelledby="status-destination-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <div className="modal-head">
            <h2 id="status-destination-title">
              {t("مقصد مستقل پروتوتایپ", "Independent prototype destination")}
            </h2>
            <button
              className="icon-button"
              onClick={close}
              aria-label={t("بستن", "Close")}
            >
              <Glyph name="close" />
            </button>
          </div>
          <p>
            {t(
              "این صفحه مقصد در این مرحله بازطراحی نشده است. هیچ تیکت یا اقدام مالی واقعی ثبت نشده است.",
              "This destination is not redesigned in this step. No actual ticket or financial operation has been submitted.",
            )}
          </p>
          <code dir="ltr">{destination}</code>
          <button className="button secondary" onClick={close}>
            {t("بازگشت به درخواست", "Back to request")}
          </button>
        </dialog>
      </div>
    </DashboardPage>
  )
}
