import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
} from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import ArtworkReviewImage from "./ArtworkReviewImage"
import {
  demoArtworkVersions,
  demoReviewContract,
  demoReviewOrders,
  reviewPermissions,
  validateArtworkDecision,
  type ReviewMode,
} from "./artwork-review"
import "./cancellation.css"
import "./artwork-review.css"
type ModalKind = "large" | "approve" | "destination" | null
type Decision = "idle" | "submitting" | "approved" | "revision" | "unknown" | "error" | "changed"
const previews: [ReviewMode, string, string][] = [
  ["ready", "نسخه آماده بررسی", "Ready for review"],
  ["new", "نسخه جدید", "New version"],
  ["manual", "اجرای دستی", "Hand-painted"],
  ["revision-pending", "اصلاح ثبت‌شده", "Revision requested"],
  ["in-progress", "در حال اصلاح", "Revision in progress"],
  ["approved", "نسخه تأییدشده", "Approved version"],
  ["exhausted", "پایان اصلاحات توافق‌شده", "Agreed revisions exhausted"],
  ["conflict", "تغییر هم‌زمان نسخه", "Concurrent version change"],
  ["unknown", "نتیجه نامشخص", "Unknown result"],
  ["network", "خطای شبکه", "Network error"],
  ["server", "خطای سرور", "Server error"],
  ["loading", "بارگذاری", "Loading"],
  ["empty", "نسخه ارائه‌نشده", "No version"],
  ["image-error", "خطای تصویر", "Image error"],
  ["denied", "عدم دسترسی", "Access denied"],
]
export default function ArtworkReviewPage({
  page,
  navigate,
}: {
  page: string
  navigate: (route: string) => void
}) {
  const en = page.startsWith("/en/"),
    index = en ? 1 : 0,
    t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa",
    account = `${prefix}/account`,
    orderId = page.split("/")[4],
    orderRoute = `${account}/orders/${orderId}`
  const owned = demoReviewOrders.includes(orderId)
  const [mode, setMode] = useState<ReviewMode>("ready"),
    [decision, setDecision] = useState<Decision>("idle")
  const [current, setCurrent] = useState("ART-V2"),
    [displayed, setDisplayed] = useState("ART-V2")
  const [formOpen, setFormOpen] = useState(false),
    [details, setDetails] = useState(""),
    [error, setError] = useState("")
  const [live, setLive] = useState(""),
    [checking, setChecking] = useState(false),
    [submittedDetails, setSubmittedDetails] = useState("")
  const [modal, setModal] = useState<ModalKind>(null),
    [destination, setDestination] = useState("")
  const [compare, setCompare] = useState(false),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 })
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null),
    revisionText = useRef<HTMLTextAreaElement>(null)
  const lock = useRef(false),
    timers = useRef(new Set<ReturnType<typeof setTimeout>>()),
    drag = useRef<{
      x: number
      y: number
      px: number
      py: number
    } | null>(null)
  const target = useRef<{
    version: string
    action: "approve" | "revise"
  } | null>(null)
  const resultNotice = useRef<HTMLElement>(null)
  const denied = !owned || mode === "denied",
    loading = mode === "loading",
    empty = mode === "empty"
  const imageVisible = !denied && !loading && !empty && mode !== "image-error"
  const active = displayed === current
  const settled =
    decision === "approved" || decision === "revision" || mode === "approved"
  const blocked = decision === "submitting" || decision === "unknown" || settled
  const permissions = reviewPermissions(mode, imageVisible)
  const canApprove = permissions.approve && active && !blocked,
    canRevise = permissions.revise && active && !blocked
  const number = displayed === "ART-V1" ? 1 : displayed === "ART-V3" ? 3 : 2
  const comparisonVersion = displayed === "ART-V2" ? "ART-V1" : "ART-V2"
  const versions =
    current === "ART-V3"
      ? [
          {
            ...demoArtworkVersions[0],
            id: "ART-V3",
            number: 3,
            submittedAt: "2025-06-19T12:00:00+03:30",
            note: [
              "نسخه جدید برای بررسی دوباره ارائه شده است.",
              "A new version is submitted for another review.",
            ] as [string, string],
          },
          ...demoArtworkVersions,
        ]
      : demoArtworkVersions
  const version = versions.find((item) => item.id === displayed)!
  const date = (value: string) =>
    new Intl.DateTimeFormat(en ? "en-GB" : "fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tehran",
    }).format(new Date(value))
  const later = (fn: () => void, ms = 800) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      fn()
    }, ms)
    timers.current.add(timer)
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal()
    else if (!modal && dialog.current?.open) dialog.current.close()
  }, [modal])
  const close = () => {
    if (decision === "submitting" && modal === "approve") return
    setModal(null)
    drag.current = null
    requestAnimationFrame(() => trigger.current?.focus())
  }
  const open = (kind: ModalKind, event: MouseEvent<HTMLElement>) => {
    trigger.current = event.currentTarget
    setModal(kind)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setCompare(false)
  }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (
      route === account ||
      route === `${account}/downloads` ||
      route.includes("/auth/")
    )
      navigate(route)
    else {
      setDestination(route)
      open("destination", event)
    }
  }
  const submit = (action: "approve" | "revise") => {
    if (lock.current || blocked) return
    const payload = {
      owned: !denied,
      displayedVersion: displayed,
      currentVersion: current,
      imageVisible,
      mode,
      action,
      details,
    }
    const validation = validateArtworkDecision(payload)
    if (Object.keys(validation).length) {
      setError(
        validation.version
          ? t(
              "نسخه نمایش‌داده‌شده دیگر نسخه جاری نیست.",
              "The displayed version is no longer current.",
            )
          : validation.details
            ? t(
                "موارد اصلاح را توضیح دهید.",
                "Describe the requested revisions.",
              )
            : t(
                "این اقدام برای نسخه نمایش‌داده‌شده مجاز نیست.",
                "This action is not permitted for the displayed version.",
              ),
      )
      if (action === "revise")
        requestAnimationFrame(() => revisionText.current?.focus())
      return
    }
    lock.current = true
    target.current = { version: displayed, action }
    setDecision("submitting")
    setError("")
    later(() => {
      if (mode === "conflict" && current !== "ART-V3") {
        setCurrent("ART-V3")
        setDecision("changed")
        lock.current = false
        setModal(null)
        setLive(
          t(
            "نسخه جدیدی ارائه شده است. پیش از ثبت تصمیم، آن را بررسی کنید. تصمیم قبلی به نسخه جدید منتقل نشد.",
            "A new version has been submitted. Review it before recording your decision. The old decision was not transferred.",
          ),
        )
        requestAnimationFrame(() => trigger.current?.focus())
        return
      }
      if (mode === "unknown") {
        setDecision("unknown")
        setModal(null)
        setLive(
          t(
            "نتیجه ثبت تصمیم هنوز تأیید نشده است. ابتدا وضعیت عملیات را بررسی کنید؛ دوباره ارسال نکنید.",
            "Your decision has not been confirmed yet. Check the operation status first; do not submit again.",
          ),
        )
        requestAnimationFrame(() => trigger.current?.focus())
        return
      }
      if (mode === "network" || mode === "server") {
        setDecision("error")
        lock.current = false
        setModal(null)
        setError(
          t(
            "ثبت تصمیم تأیید نشد؛ بازخورد شما حفظ شده است. سرویس متصل نیست.",
            "Decision registration was not confirmed; your feedback is preserved. No service is connected.",
          ),
        )
        setLive(
          t(
            "خطای ثبت تصمیم؛ موفقیت فرض نمی‌شود.",
            "Decision submission error; success is not assumed.",
          ),
        )
        requestAnimationFrame(() => trigger.current?.focus())
        return
      }
      setDecision(action === "approve" ? "approved" : "revision")
      setSubmittedDetails(action === "revise" ? details : "")
      setModal(null)
      setLive(
        action === "approve"
          ? t(
              `نسخه ${target.current!.version} در پاسخ نمونه تأیید شد · Demo؛ تأیید واقعی انجام نشده است.`,
              `Version ${target.current!.version} approved in the fixture · Demo; no actual approval occurred.`,
            )
          : t(
              "درخواست اصلاح برای همین نسخه در نمونه ثبت شد · Demo؛ شروع یا تکمیل اصلاح تأیید نشده است.",
              "Revision request recorded for this version in the fixture · Demo; work has not been started or completed.",
            ),
      )
      requestAnimationFrame(() => resultNotice.current?.focus())
    })
  }
  const check = () => {
    if (checking) return
    setChecking(true)
    later(() => {
      setChecking(false)
      setLive(
        t(
          "وضعیت تازه دریافت نشد؛ سرویس متصل نیست. درخواست تکراری ارسال نشد.",
          "Fresh status could not be retrieved; no service is connected. No duplicate decision was submitted.",
        ),
      )
    })
  }
  const reset = (value: ReviewMode) => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
    lock.current = false
    target.current = null
    setMode(value)
    setDecision("idle")
    setCurrent("ART-V2")
    setDisplayed("ART-V2")
    setFormOpen(false)
    setDetails("")
    setSubmittedDetails("")
    setError("")
    setLive("")
    setChecking(false)
    setModal(null)
  }
  const zoomTo = (value: number) => {
    setZoom(Math.max(1, Math.min(3, value)))
    if (value <= 1) setPan({ x: 0, y: 0 })
  }
  const move = (x: number, y: number) =>
    setPan((old) => ({
      x: Math.max(-400, Math.min(400, old.x + x)),
      y: Math.max(-400, Math.min(400, old.y + y)),
    }))
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return
    drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    setPan({
      x: Math.max(
        -400,
        Math.min(400, drag.current.px + event.clientX - drag.current.x),
      ),
      y: Math.max(
        -400,
        Math.min(400, drag.current.py + event.clientY - drag.current.y),
      ),
    })
  }
  const versionLabel = (id: string) => `${t("نسخه", "Version")} ${id}`
  const stateLabel =
    decision === "approved" || mode === "approved"
      ? t("این نسخه تأیید شد", "This version is approved")
      : decision === "revision" || mode === "revision-pending"
        ? t("درخواست اصلاح ثبت شد", "Revision requested")
        : mode === "in-progress"
          ? t("در حال اصلاح", "Revision in progress")
          : mode === "new"
            ? t("نسخه جدید آماده است", "New version ready")
            : mode === "image-error"
              ? t(
                  "بررسی در حال حاضر در دسترس نیست",
                  "Review is currently unavailable",
                )
              : t("منتظر بررسی شما", "Awaiting your review")
  return (
    <DashboardPage
      page={page}
      navigate={navigate}
      renderMedia={() => null}
      panelTitle={t("طرح خود را بررسی کنید", "Review your artwork")}
    >
      <div className="cancel-page artwork-review-page">
        <nav
          className="cancel-breadcrumb"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          <a href={account} onClick={follow(account)}>
            {t("حساب", "Account")}
          </a>
          <span>/</span>
          <a href={`${account}/orders`} onClick={follow(`${account}/orders`)}>
            {t("سفارش‌ها", "Orders")}
          </a>
          <span>/</span>
          <a
            href={denied ? `${account}/orders` : orderRoute}
            onClick={follow(denied ? `${account}/orders` : orderRoute)}
          >
            <bdi>{denied || loading ? "—" : orderId}</bdi>
          </a>
          <span>/</span>
          <span aria-current="page">{t("بررسی طرح", "Artwork review")}</span>
        </nav>
        <div className="cancel-heading">
          <span className="cancel-eyebrow">YOUR ACCOUNT · USER-09</span>
          <h1>{t("طرح خود را بررسی کنید", "Review your artwork")}</h1>
          <p>
            {t(
              "اثر را با توافق سفارش مرور کنید؛ تصمیم شما فقط برای نسخه مشخص ثبت می‌شود.",
              "Review the artwork against your order agreement. Your decision applies only to a specific version.",
            )}
          </p>
        </div>
        <div className="cancel-demo">
          <span>Demo</span>
          <p>
            {t(
              "تصویر، توافق، نسخه‌ها و نتایج، نمونه طراحی‌اند؛ این تصویر ساخته‌شده برای پروتوتایپ است و هیچ تأیید یا اصلاح واقعی انجام نمی‌شود.",
              "The image, agreement, versions and results are design fixtures. This illustration was made for the prototype; no real approval or revision occurs.",
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
                "دسترسی به این بررسی مجاز نیست.",
                "This review cannot be accessed.",
              )}
            </h2>
            <p>
              {t(
                "تا بررسی مالکیت و مجوز سرویس، هیچ تصویر یا اطلاعات سفارش نمایش داده نمی‌شود.",
                "No image or order information is shown until ownership and permissions are checked by the service.",
              )}
            </p>
          </section>
        ) : loading ? (
          <div
            className="review-loading"
            aria-busy="true"
            aria-label={t(
              "در حال دریافت نسخه و توافق",
              "Loading version and agreement",
            )}
          >
            <div className="skeleton" />
            <div className="review-layout">
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          </div>
        ) : empty ? (
          <section className="cancel-state">
            <Glyph name="paint" size={36} />
            <h2>
              {t(
                "هنوز نسخه‌ای برای بررسی ارائه نشده است.",
                "No version has been submitted for review yet.",
              )}
            </h2>
            <a
              className="button secondary"
              href={orderRoute}
              onClick={follow(orderRoute)}
            >
              {t("مشاهده سفارش", "View order")}
            </a>
          </section>
        ) : (
          <>
            <section className="review-status" ref={resultNotice} tabIndex={-1}>
              <span className="review-status-icon">
                <Glyph
                  name={
                    decision === "approved" || mode === "approved"
                      ? "check"
                      : "paint"
                  }
                  size={21}
                />
              </span>
              <div>
                <strong>{stateLabel} · Demo</strong>
                <p>
                  {decision === "revision" || mode === "revision-pending"
                    ? t(
                        "ثبت درخواست، شروع یا تکمیل اصلاح نیست. برای این نسخه درخواست فعال دارید.",
                        "Registration is not work starting or finishing. An active request exists for this version.",
                      )
                    : mode === "in-progress"
                      ? t(
                          "وضعیت اجرای اصلاح در پاسخ نمونه؛ نسخه نهایی هنوز تحویل نشده است.",
                          "Revision work status in the fixture; the final file has not been delivered.",
                        )
                      : decision === "approved" || mode === "approved"
                        ? t(
                            "تأیید طرح از پرداخت، تحویل و رضایت انتشار جداست؛ فایل نهایی هنوز آماده نیست.",
                            "Artwork approval is separate from payment, delivery and publication consent; the final file is not ready yet.",
                          )
                        : t(
                            "دیدن تصویر، بستن صفحه یا دانلود پیش‌نمایش به معنی تأیید نیست.",
                            "Viewing the image, leaving the page or downloading a preview does not approve it.",
                          )}
                </p>
              </div>
              <span className="review-status-version">
                <bdi>{current}</bdi>
              </span>
            </section>
            {decision === "changed" && (
              <div className="review-conflict" role="alert">
                <strong>
                  {t(
                    "نسخه جدیدی ارائه شده است. پیش از ثبت تصمیم، آن را بررسی کنید.",
                    "A new version has been submitted. Review it before recording your decision.",
                  )}
                </strong>
                <p>
                  {t(
                    "نسخه در حال مشاهده شما حفظ شده است؛ بازخورد یا تأیید به نسخه جدید منتقل نشد.",
                    "Your displayed version is preserved; feedback or approval was not transferred to the new version.",
                  )}
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    setDisplayed(current)
                    setDecision("idle")
                    setError("")
                    setFormOpen(false)
                    setLive(
                      t(
                        "نسخه جدید برای بررسی باز شد؛ هنوز تصمیمی ثبت نشده است.",
                        "The new version is open for review; no decision has been recorded.",
                      ),
                    )
                  }}
                >
                  {t("بررسی نسخه جدید", "Review the new version")}
                </button>
              </div>
            )}
            <div className="review-layout">
              <div className="review-primary">
                <section className="review-image-card">
                  <div className="review-image-heading">
                    <div>
                      <span>
                        {active
                          ? t("نسخه جاری", "Current version")
                          : t(
                              "نسخه پیشین • فقط خواندنی",
                              "Previous version • Read only",
                            )}
                      </span>
                      <h2>
                        <bdi>{displayed}</bdi>
                        <span> · Demo</span>
                      </h2>
                    </div>
                    <button
                      className="text-link"
                      onClick={(event) => open("large", event)}
                      disabled={!imageVisible}
                    >
                      <Glyph name="plus" size={18} />
                      {t("نمایش بزرگ‌تر", "View larger")}
                    </button>
                  </div>
                  <div className="review-canvas">
                    {imageVisible ? (
                      <ArtworkReviewImage
                        version={number}
                        label={t(
                          "تصویر نمونه نسخه طرح؛ تصویر واقعی مشتری نیست",
                          "Sample artwork version; not a real customer image",
                        )}
                      />
                    ) : (
                      <div className="review-image-error">
                        <Glyph name="paint" size={36} />
                        <h3>
                          {t(
                            "دریافت تصویر ممکن نشد.",
                            "Unable to load the image.",
                          )}
                        </h3>
                        <p>
                          {t(
                            "بدون مشاهده اثر، اقدام تأیید فعال نیست؛ مشخصات سفارش باقی است.",
                            "Approval is unavailable without seeing the artwork; order details remain visible.",
                          )}
                        </p>
                        <button
                          className="button secondary"
                          onClick={check}
                          disabled={checking}
                        >
                          {t("تلاش دوباره", "Try again")}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="review-image-caption">
                    <span>
                      {t(
                        "نمای بررسی نمونه؛ فایل نهایی قابل چاپ نیست.",
                        "Demo review preview; not a print-ready final file.",
                      )}
                    </span>
                    <time dateTime={version.submittedAt}>
                      {t("ارائه‌شده در", "Submitted on")}:{" "}
                      {date(version.submittedAt)}
                    </time>
                  </div>
                </section>
                <section className="review-artist-note">
                  <span className="review-note-icon">
                    <Glyph name="paint" size={20} />
                  </span>
                  <div>
                    <h2>
                      {t("توضیح هنرمند", "Artist’s note")} <span>· Demo</span>
                    </h2>
                    <p>{version.note[index]}</p>
                  </div>
                </section>
                <section className="review-history">
                  <div className="review-section-heading">
                    <h2>
                      {t(
                        "سابقه نسخه‌ها و بازخورد",
                        "Version & feedback history",
                      )}
                    </h2>
                    <span>
                      {versions.length.toLocaleString(en ? "en" : "fa")}{" "}
                      {t("نسخه نمونه", "sample versions")}
                    </span>
                  </div>
                  {versions
                    .filter((item) => item.authorized)
                    .map((item) => (
                      <article
                        className={`review-history-card ${
                          item.id === current ? "current" : ""
                        }`}
                        key={item.id}
                      >
                        <div className="review-history-top">
                          <div>
                            <h3>
                              <bdi>{item.id}</bdi>
                              <span>
                                {item.id === current
                                  ? t("نسخه جاری", "Current version")
                                  : t("نسخه پیشین", "Previous version")}
                              </span>
                            </h3>
                            <time dateTime={item.submittedAt}>
                              {date(item.submittedAt)}
                            </time>
                          </div>
                          <button
                            className="text-link"
                            onClick={() => {
                              setDisplayed(item.id)
                              setFormOpen(false)
                              setError("")
                            }}
                            disabled={
                              decision === "submitting" ||
                              decision === "unknown" ||
                              !imageVisible
                            }
                          >
                            {t("مشاهده نسخه", "View version")}
                            <Glyph name="arrow" size={15} />
                          </button>
                        </div>
                        <p>{item.note[index]}</p>
                        {item.feedback && (
                          <div className="review-history-feedback">
                            <span>
                              {t(
                                "بازخورد ثبت‌شده مشتری • Demo",
                                "Recorded customer feedback • Demo",
                              )}
                            </span>
                            <p>{item.feedback[index]}</p>
                            <time dateTime={item.feedbackAt!}>
                              {date(item.feedbackAt!)}
                            </time>
                          </div>
                        )}
                        {item.id === target.current?.version &&
                          decision === "revision" && (
                            <div className="review-history-feedback">
                              <span>
                                {t(
                                  "درخواست اصلاح ثبت‌شده • Demo",
                                  "Recorded revision request • Demo",
                                )}
                              </span>
                              <p>{submittedDetails}</p>
                              <small>
                                {t(
                                  "زمان پاسخ نمونه: ۱۹ خرداد ۱۴۰۴، ۱۴:۳۰",
                                  "Fixture response time: 19 June 2025, 14:30",
                                )}
                              </small>
                            </div>
                          )}
                        {item.id === (target.current?.version || "ART-V2") &&
                          (decision === "approved" || mode === "approved") && (
                            <div className="review-history-feedback">
                              <span>
                                {t(
                                  "این نسخه تأیید شد • Demo",
                                  "This version approved • Demo",
                                )}
                              </span>
                              <time dateTime="2025-06-19T14:30:00+03:30">
                                {date("2025-06-19T14:30:00+03:30")}
                              </time>
                            </div>
                          )}
                      </article>
                    ))}
                </section>
              </div>
              <aside className="review-secondary">
                <section className="review-agreement">
                  <div className="review-section-heading">
                    <h2>{t("توافق سفارش شما", "Your order agreement")}</h2>
                    <Glyph name="shield" size={20} />
                  </div>
                  <dl>
                    <div>
                      <dt>{t("موضوع", "Subject")}</dt>
                      <dd>{t("پرتره دو نفره", "Portrait for two")}</dd>
                    </div>
                    <div>
                      <dt>{t("سبک", "Style")}</dt>
                      <dd>
                        {t(
                          "تصویرسازی مینیمال با رنگ‌های گرم",
                          "Minimal illustration, warm palette",
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("سایز توافق‌شده", "Agreed size")}</dt>
                      <dd>
                        <bdi>A3</bdi>
                      </dd>
                    </div>
                    <div>
                      <dt>{t("نوع اجرا", "Execution")}</dt>
                      <dd>
                        {mode === "manual"
                          ? t("نقاشی دستی", "Hand-painted")
                          : t("دیجیتال", "Digital")}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("نوع تحویل", "Delivery")}</dt>
                      <dd>
                        {mode === "manual"
                          ? t(
                              "اثر فیزیکی پس از تکمیل",
                              "Physical artwork after completion",
                            )
                          : t(
                              "فایل نهایی پس از آماده‌سازی",
                              "Final file after preparation",
                            )}
                      </dd>
                    </div>
                  </dl>
                  <div className="review-revision-policy">
                    <span>
                      {t(
                        "اصلاحات باقی‌مانده طبق توافق",
                        "Revisions remaining under the agreement",
                      )}
                    </span>
                    <strong>
                      {mode === "exhausted" ? "۰" : en ? "1" : "۱"}{" "}
                      <small>· Demo</small>
                    </strong>
                    <p>{demoReviewContract.scope[index]}</p>
                    <small>
                      {t(
                        "سقف نمونه: ۲ نوبت؛ این عدد سیاست واقعی فروشگاه نیست.",
                        "Fixture limit: 2 rounds; this is not the store’s actual policy.",
                      )}
                    </small>
                  </div>
                  <a
                    className="text-link"
                    href={`${orderRoute}/agreement`}
                    onClick={follow(`${orderRoute}/agreement`)}
                  >
                    {t("مشاهده توافق تاریخی", "View historical agreement")}{" "}
                    <bdi>{demoReviewContract.agreement}</bdi>
                  </a>
                </section>
                <section className="review-decision-card">
                  <h2>
                    {t(
                      "تصمیم شما برای این نسخه",
                      "Your decision for this version",
                    )}
                  </h2>
                  <p className="review-decision-version">
                    <bdi>{displayed}</bdi> ·{" "}
                    {active
                      ? t("نسخه جاری", "Current version")
                      : t("فقط خواندنی", "Read only")}
                  </p>
                  {!active && (
                    <p className="review-readonly">
                      {t(
                        "نسخه پیشین قابل تصمیم‌گیری نیست؛ برای اقدام، نسخه جاری را بررسی کنید.",
                        "Previous versions cannot receive a decision; review the current version to act.",
                      )}
                    </p>
                  )}
                  {decision === "approved" || mode === "approved" ? (
                    <div className="review-decision-result">
                      <Glyph name="check" size={24} />
                      <strong>
                        {t(
                          `نسخه ${target.current?.version || "ART-V2"} تأیید شد · Demo`,
                          `Version ${target.current?.version || "ART-V2"} approved · Demo`,
                        )}
                      </strong>
                      <p>
                        {mode === "manual"
                          ? t(
                              "مرحله بعد نمونه: تکمیل اثر و آماده‌سازی ارسال؛ ارسال آغاز نشده است.",
                              "Demo next stage: complete the artwork and prepare shipping; dispatch has not started.",
                            )
                          : t(
                              "مرحله بعد نمونه: آماده‌سازی فایل نهایی؛ فایل قابل دانلود هنوز ارائه نشده است.",
                              "Demo next stage: final-file preparation; no downloadable final file has been delivered.",
                            )}
                      </p>
                      <a
                        className="button secondary"
                        href={orderRoute}
                        onClick={follow(orderRoute)}
                      >
                        {t("مشاهده وضعیت سفارش", "View order status")}
                      </a>
                    </div>
                  ) : (
                    <>
                      {mode === "exhausted" && (
                        <p className="review-readonly">
                          {t(
                            "اصلاحات توافق‌شده در داده نمونه پایان یافته است؛ مسیر کمک فعال است. درخواست خارج از توافق باید جدا بررسی شود.",
                            "Agreed revisions are exhausted in the fixture; help remains available. Out-of-scope changes require separate review.",
                          )}
                        </p>
                      )}
                      <button
                        className="button primary review-approve-button"
                        disabled={!canApprove}
                        onClick={(event) => open("approve", event)}
                      >
                        <Glyph name="check" size={18} />
                        {t("تأیید این نسخه", "Approve this version")}
                      </button>
                      <button
                        className="button secondary review-revise-button"
                        disabled={!canRevise}
                        onClick={() => {
                          setFormOpen(true)
                          requestAnimationFrame(() =>
                            revisionText.current?.focus(),
                          )
                        }}
                      >
                        <Glyph name="chat" size={18} />
                        {t("درخواست اصلاح", "Request revisions")}
                      </button>
                      {formOpen && (
                        <form
                          className="review-revision-form"
                          noValidate
                          onSubmit={(event: FormEvent) => {
                            event.preventDefault()
                            submit("revise")
                          }}
                        >
                          <label htmlFor="revision-details">
                            {t(
                              "چه مواردی نیاز به اصلاح دارند؟",
                              "What needs to be revised?",
                            )}
                          </label>
                          <p id="revision-hint">
                            {t(
                              "تغییرهای موردنظر را روشن و مرتبط با نسخه نمایش‌داده‌شده بنویسید.",
                              "Describe the requested changes clearly and relate them to the displayed version.",
                            )}
                          </p>
                          <textarea
                            ref={revisionText}
                            id="revision-details"
                            rows={5}
                            value={details}
                            onChange={(event) => {
                              setDetails(event.target.value)
                              setError("")
                            }}
                            maxLength={demoReviewContract.maxDetails}
                            disabled={blocked}
                            aria-invalid={!!error}
                            aria-describedby="revision-hint revision-error"
                            placeholder={t(
                              "مثال Demo: لطفاً پس‌زمینه ساده‌تر شود و جزئیات لباس مطابق مرجع حفظ شود.",
                              "Demo example: Please simplify the background and keep clothing details consistent with the reference.",
                            )}
                          />
                          <span className="review-text-count">
                            <bdi>
                              {details.length}/{demoReviewContract.maxDetails}
                            </bdi>{" "}
                            · Demo
                          </span>
                          <p className="review-outside-scope">
                            {t(
                              "تغییر خارج از توافق ممکن است به بررسی و پیشنهاد جداگانه نیاز داشته باشد. ثبت درخواست، پذیرش هزینه یا تغییر قرارداد نیست.",
                              "Changes outside the agreement may require a separate review and proposal. Submitting does not accept a charge or change the agreement.",
                            )}
                          </p>
                          <button
                            className="button primary"
                            type="submit"
                            disabled={!canRevise}
                          >
                            {decision === "submitting"
                              ? t("در حال ثبت…", "Submitting…")
                              : t(
                                  "ثبت درخواست اصلاح",
                                  "Submit revision request",
                                )}
                          </button>
                        </form>
                      )}
                      {(decision === "revision" ||
                        mode === "revision-pending" ||
                        mode === "in-progress") && (
                        <div className="review-decision-result">
                          <strong>{stateLabel} · Demo</strong>
                          <p>
                            {t(
                              "برای این نسخه درخواست اصلاح فعال دارید؛ درخواست تکراری ایجاد نمی‌شود.",
                              "An active revision request exists for this version; no duplicate request will be created.",
                            )}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {error && (
                    <p
                      id="revision-error"
                      className="cancel-field-error"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}
                  {decision === "unknown" && (
                    <div className="review-unknown" role="alert">
                      <p>
                        {t(
                          "نتیجه ثبت تصمیم هنوز تأیید نشده است.",
                          "Your decision has not been confirmed yet.",
                        )}
                      </p>
                      <button
                        className="text-link"
                        onClick={check}
                        disabled={checking}
                      >
                        {checking
                          ? t("در حال بررسی…", "Checking…")
                          : t("بررسی وضعیت عملیات", "Check operation status")}
                      </button>
                    </div>
                  )}
                  <p className="review-approval-boundary">
                    {t(
                      "تأیید طرح، رضایت انتشار، انتقال همه حقوق یا تأیید دریافت اثر فیزیکی نیست.",
                      "Artwork approval is not publication consent, transfer of all rights or confirmation of physical receipt.",
                    )}
                  </p>
                  <small className="review-response-demo">
                    {t(
                      "اقدام و پاسخ فقط شبیه‌سازی Demo هستند.",
                      "Actions and responses are Demo simulations only.",
                    )}
                  </small>
                </section>
                <div className="review-support">
                  <Glyph name="chat" size={22} />
                  <h3>
                    {t(
                      "درباره طرح پرسشی دارید؟",
                      "A question about your artwork?",
                    )}
                  </h3>
                  <a
                    className="text-link"
                    href={`${account}/support?order=${orderId}`}
                    onClick={follow(`${account}/support?order=${orderId}`)}
                  >
                    {t("پشتیبانی همین سفارش", "Support for this order")}
                    <Glyph name="arrow" size={15} />
                  </a>
                  <a
                    className="text-link"
                    href={orderRoute}
                    onClick={follow(orderRoute)}
                  >
                    {t("جزئیات سفارش", "Order details")}
                    <Glyph name="arrow" size={15} />
                  </a>
                </div>
              </aside>
            </div>
          </>
        )}
        <footer className="cancel-footer">
          <span>
            {t(
              "با دقت شما، نزدیک‌تر به اثری برای شما.",
              "With your thoughtful review, closer to your artwork.",
            )}
          </span>
          <span>Nilart · Demo</span>
        </footer>
        <details className="dash-preview">
          <summary>
            {t("حالت‌های پیش‌نمایش", "Preview states")} <bdi>USER-09 · Demo</bdi>
          </summary>
          <div>
            {previews.map(([value, fa, english]) => (
              <button
                key={value}
                aria-pressed={mode === value}
                onClick={() => reset(value)}
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
          className={`review-dialog ${
            modal === "large"
              ? "review-large-dialog"
              : modal === "approve"
                ? "review-approve-dialog"
                : "review-destination-dialog"
          }`}
          aria-labelledby="review-dialog-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <div className="review-dialog-heading">
            <h2 id="review-dialog-title">
              {modal === "large"
                ? t("نمای بزرگ طرح", "Artwork enlarged view")
                : modal === "approve"
                  ? t("این نسخه را تأیید می‌کنید؟", "Approve this version?")
                  : t(
                      "مقصد مستقل پروتوتایپ",
                      "Independent prototype destination",
                    )}
            </h2>
            <button
              className="icon-button"
              onClick={close}
              disabled={decision === "submitting"}
              aria-label={t("بستن", "Close")}
            >
              <Glyph name="close" />
            </button>
          </div>
          {modal === "large" && imageVisible && (
            <>
              <div className="review-zoom-tools">
                <span>
                  <bdi>{displayed}</bdi> · Demo
                </span>
                <button
                  className="icon-button"
                  aria-label={t("کوچک‌نمایی", "Zoom out")}
                  onClick={() => zoomTo(zoom - 0.25)}
                  disabled={zoom <= 1}
                >
                  −
                </button>
                <output>{Math.round(zoom * 100)}%</output>
                <button
                  className="icon-button"
                  aria-label={t("بزرگ‌نمایی", "Zoom in")}
                  onClick={() => zoomTo(zoom + 0.25)}
                  disabled={zoom >= 3}
                >
                  +
                </button>
                <button className="text-link" onClick={() => zoomTo(1)}>
                  {t("بازنشانی", "Reset")}
                </button>
                <button
                  className="text-link"
                  onClick={() => {
                    setCompare(!compare)
                    zoomTo(1)
                  }}
                >
                  {compare
                    ? t("پایان مقایسه", "End comparison")
                    : t("مقایسه با نسخه پیشین", "Compare previous version")}
                </button>
              </div>
              <p className="review-zoom-hint">
                {t(
                  "کلیدهای + و − برای zoom، جهت‌ها برای جابه‌جایی؛ بزرگ‌نمایی مرورگر حفظ می‌شود.",
                  "Use + and − to zoom, arrows to pan; browser zoom remains available.",
                )}
              </p>
              <div
                className={`review-zoom-stage ${compare ? "comparing" : ""}`}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.ctrlKey || event.metaKey || event.altKey) return
                  if (
                    [
                      "+",
                      "=",
                      "-",
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      "0",
                    ].includes(event.key)
                  ) {
                    event.preventDefault()
                    if (event.key === "+" || event.key === "=")
                      zoomTo(zoom + 0.25)
                    else if (event.key === "-") zoomTo(zoom - 0.25)
                    else if (event.key === "0") zoomTo(1)
                    else if (zoom > 1)
                      move(
                        event.key === "ArrowLeft"
                          ? -24
                          : event.key === "ArrowRight"
                            ? 24
                            : 0,
                        event.key === "ArrowUp"
                          ? -24
                          : event.key === "ArrowDown"
                            ? 24
                            : 0,
                      )
                  }
                }}
                onPointerDown={pointerDown}
                onPointerMove={pointerMove}
                onPointerUp={() => {
                  drag.current = null
                }}
                onPointerCancel={() => {
                  drag.current = null
                }}
              >
                <div
                  className="review-zoom-surface"
                  style={{
                    transform: compare
                      ? "none"
                      : `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  }}
                >
                  <figure>
                    <figcaption>
                      <bdi>{displayed}</bdi> ·{" "}
                      {t("نسخه نمایش‌داده‌شده", "Displayed version")}
                    </figcaption>
                    <ArtworkReviewImage
                      version={number}
                      label={t(
                        "نمای بزرگ نمونه طرح",
                        "Enlarged sample artwork",
                      )}
                    />
                  </figure>
                  {compare && (
                    <figure>
                      <figcaption>
                        <bdi>
                          {comparisonVersion}
                        </bdi>{" "}
                        · {t("نسخه مجاز دیگر", "Other authorized version")}
                      </figcaption>
                      <ArtworkReviewImage
                        version={comparisonVersion === "ART-V1" ? 1 : 2}
                        label={t(
                          "نسخه نمونه برای مقایسه",
                          "Sample version for comparison",
                        )}
                      />
                    </figure>
                  )}
                </div>
              </div>
            </>
          )}
          {modal === "approve" && (
            <div className="review-confirmation">
              <div className="review-confirmation-preview">
                <ArtworkReviewImage
                  version={number}
                  label={t(
                    "پیش‌نمایش نمونه نسخه انتخاب‌شده",
                    "Sample preview of selected version",
                  )}
                />
                <div>
                  <strong>
                    <bdi>{displayed}</bdi> · Demo
                  </strong>
                  <span>
                    {t("نسخه مشخص برای تأیید", "Specific version to approve")}
                  </span>
                </div>
              </div>
              <p>
                {t(
                  "تأیید شما برای همین نسخه ثبت می‌شود. مرحله بعد مطابق شرایط سفارش انجام خواهد شد.",
                  "Your approval will be recorded for this version. The next step follows the order’s conditions.",
                )}
              </p>
              <p className="review-confirmation-warning">
                {mode === "manual"
                  ? t(
                      "پس از تأیید، اثر برای تکمیل و آماده‌سازی ارسال بررسی می‌شود؛ تحویل یا ارسال تأیید نمی‌شود.",
                      "After approval, the artwork proceeds toward completion and shipping preparation; delivery or dispatch is not confirmed.",
                    )
                  : t(
                      "پس از تأیید، فایل نهایی آماده‌سازی می‌شود؛ تأیید طرح به معنی آماده‌بودن دانلود نیست.",
                      "After approval, the final file is prepared; approval does not mean downloads are ready.",
                    )}
              </p>
              <small>
                {t(
                  "Demo: هیچ تأیید واقعی انجام نمی‌شود.",
                  "Demo: no actual approval occurs.",
                )}
              </small>
              <button
                className="button primary"
                disabled={decision === "submitting"}
                onClick={() => submit("approve")}
              >
                {decision === "submitting"
                  ? t("در حال ثبت…", "Submitting…")
                  : t("تأیید نسخه", "Approve version")}
              </button>
              <button
                className="button secondary"
                disabled={decision === "submitting"}
                onClick={close}
              >
                {t("بازگشت به بررسی", "Continue reviewing")}
              </button>
            </div>
          )}
          {modal === "destination" && (
            <div className="review-destination">
              <p>
                {t(
                  "این صفحه مقصد مستقل است و در این مرحله بازطراحی نشده است.",
                  "This is an independent destination and is not redesigned in this step.",
                )}
              </p>
              <code dir="ltr">{destination}</code>
              <button className="button secondary" onClick={close}>
                {t("بازگشت به بررسی", "Continue reviewing")}
              </button>
            </div>
          )}
        </dialog>
      </div>
    </DashboardPage>
  )
}
