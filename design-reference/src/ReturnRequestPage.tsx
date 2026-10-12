import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import { demoCancellationIds } from "./cancellation"
import {
  demoReturnContract,
  returnFixture,
  returnReasons,
  validateReturn,
  type ReturnMode,
  type ReturnIssues,
  type ReturnEvidence,
  type EvidenceStatus,
} from "./return-request"
import "./cancellation.css"
import "./return-request.css"

type Evidence = ReturnEvidence & {
  name: string
  url: string
  size: number
  invalidPreview?: boolean
}
type Outcome = "idle" | "submitting" | "success" | "network" | "server" | "unknown" | "changed"
const previewModes: [ReturnMode, string, string][] = [
  ["normal", "محصول و پکیج", "Products & bundle"],
  ["damage", "آسیب‌دیدگی و تصاویر", "Damage & images"],
  ["artwork", "نقاشی آماده", "Original artwork"],
  ["commission", "نقاشی سفارشی", "Commission"],
  ["digital", "رسیدگی دیجیتال", "Digital issue"],
  ["active", "درخواست فعال", "Active request"],
  ["upload-error", "خطای آپلود Demo", "Demo upload error"],
  ["changed", "تعارض هنگام ارسال", "Order conflict"],
  ["loading", "بارگذاری", "Loading"],
  ["empty", "نبود قلم مجاز", "No eligible items"],
  ["network", "خطای شبکه", "Network error"],
  ["server", "خطای سرور", "Server error"],
  ["unknown", "نتیجه نامشخص", "Unknown result"],
  ["denied", "عدم دسترسی", "Access denied"],
]
export default function ReturnRequestPage({
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
  const authorizedDemo = demoCancellationIds.includes(orderId)
  const orderRoute = `${prefix}/account/orders/${orderId}`
  const [mode, setMode] = useState<ReturnMode>("normal")
  const [issues, setIssues] = useState<ReturnIssues>({})
  const [files, setFiles] = useState<Evidence[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [outcome, setOutcome] = useState<Outcome>("idle")
  const [changed, setChanged] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [live, setLive] = useState("")
  const [destination, setDestination] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const result = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const origin = useRef<HTMLElement | null>(null)
  const urls = useRef(new Set<string>())
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const uploadLocks = useRef(new Set<string>())
  const requestLock = useRef(false)
  const activeMode = authorizedDemo ? mode : "denied"
  const lines = returnFixture(activeMode).map((item) =>
    changed && item.id === "notebook"
      ? { ...item, allowed: 0, availability: "unavailable" as const }
      : item,
  )
  const eligible = lines.filter(
    (item) =>
      item.allowed > 0 &&
      !item.activeRequest &&
      item.availability !== "unavailable",
  )
  const selected = lines.filter((item) => item.id in issues)
  const digital = mode === "digital"
  const busy = outcome === "submitting" || outcome === "unknown" || checking
  const uploading = files.some(
    (file) => file.status === "uploading" || file.status === "checking",
  )
  const later = (fn: () => void, ms: number) => {
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
  useEffect(() => {
    if (outcome === "success") result.current?.focus()
  }, [outcome])
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
  const removeFile = (id: string) => {
    const file = files.find((file) => file.id === id)
    if (file) {
      URL.revokeObjectURL(file.url)
      urls.current.delete(file.url)
    }
    uploadLocks.current.delete(id)
    setFiles((previous) => previous.filter((file) => file.id !== id))
  }
  const toggle = (id: string, checked: boolean) => {
    if (busy) return
    setIssues((previous) => {
      const next = { ...previous }
      if (checked)
        next[id] = {
          quantity: "1",
          reason: mode === "damage" ? "damaged" : "",
          details: "",
        }
      else delete next[id]
      return next
    })
    if (!checked)
      files
        .filter((file) => file.itemId === id)
        .forEach((file) => removeFile(file.id))
    setErrors({})
  }
  const update = (
    id: string,
    field: "quantity" | "reason" | "details",
    value: string,
  ) => {
    setIssues((previous) => ({
      ...previous,
      [id]: { ...previous[id], [field]: value },
    }))
    setErrors((previous) => {
      const next = { ...previous }
      delete next[`${field}-${id}`]
      return next
    })
  }
  const addFiles = (id: string, chosen: FileList | null) => {
    if (!chosen || busy) return
    let count = files.filter((file) => file.itemId === id).length
    const added: Evidence[] = []
    let rejected = false
    for (const file of Array.from(chosen)) {
      if (
        !demoReturnContract.fileTypes.includes(file.type) ||
        file.size > demoReturnContract.fileBytes ||
        file.size === 0 ||
        count >= demoReturnContract.fileCount
      ) {
        rejected = true
        continue
      }
      const url = URL.createObjectURL(file)
      urls.current.add(url)
      added.push({
        id: crypto.randomUUID(),
        itemId: id,
        name: file.name,
        size: file.size,
        url,
        status: "selected",
      })
      count++
    }
    setFiles((previous) => [...previous, ...added])
    setLive(
      rejected
        ? t(
            "برخی فایل‌ها با قرارداد نمونه مطابقت ندارند. فایل‌های مجاز انتخاب شدند؛ هنوز آپلود نشده‌اند.",
            "Some files do not match the demo contract. Eligible files were selected, not uploaded.",
          )
        : t(
            "تصاویر فقط روی دستگاه انتخاب شدند؛ هیچ فایل به سرویس ارسال نشده است.",
            "Images were selected locally; no file was sent to a service.",
          ),
    )
  }
  const simulateUpload = (file: Evidence, retry = false) => {
    if (busy || file.invalidPreview || uploadLocks.current.has(file.id)) return
    uploadLocks.current.add(file.id)
    const setStatus = (status: EvidenceStatus) =>
      setFiles((previous) =>
        previous.map((item) =>
          item.id === file.id ? { ...item, status } : item,
        ),
      )
    setStatus("uploading")
    setLive(
      t(
        "Demo: شبیه‌سازی آپلود؛ فایل از دستگاه خارج نمی‌شود.",
        "Demo: simulating upload; the file stays on your device.",
      ),
    )
    later(() => {
      if (!uploadLocks.current.has(file.id)) return
      if (mode === "upload-error" && !retry) {
        setStatus("failed")
        uploadLocks.current.delete(file.id)
        setLive(
          t(
            "آپلود نمونه ناموفق بود؛ سایر داده‌ها حفظ شده‌اند.",
            "Demo upload failed; other data remains intact.",
          ),
        )
        return
      }
      setStatus("checking")
      later(() => {
        if (!uploadLocks.current.has(file.id)) return
        setStatus("accepted")
        uploadLocks.current.delete(file.id)
        setErrors((previous) => {
          const next = { ...previous }
          delete next[`evidence-${file.itemId}`]
          return next
        })
        setLive(
          t(
            "مدرک در پاسخ نمونه پذیرفته شد · Demo؛ آپلود یا پذیرش واقعی انجام نشده است.",
            "Evidence accepted in the fixture · Demo; no real upload or acceptance occurred.",
          ),
        )
      }, 600)
    }, 700)
  }
  const errorText = (code: string) =>
    ({
      select: t("حداقل یک قلم انتخاب کنید.", "Select at least one item."),
      quantity: t(
        "تعداد را در محدوده مجاز وارد کنید.",
        "Enter a quantity within the allowed range.",
      ),
      reason: t("علت درخواست را انتخاب کنید.", "Choose a return reason."),
      details: t("توضیح مسئله را وارد کنید.", "Describe the issue."),
      length: t(
        "توضیح از حد قرارداد نمونه بیشتر است.",
        "Details exceed the demo contract limit.",
      ),
      evidence: t(
        "تصاویر لازم را تکمیل کنید.",
        "Add the required supporting images.",
      ),
      pending: t(
        "مدارک انتخاب‌شده باید پذیرفته شوند یا از درخواست حذف شوند.",
        "Selected evidence must be accepted or removed from the request.",
      ),
    })[code]
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (requestLock.current || busy || uploading || !eligible.length) return
    const validation = validateReturn(lines, issues, files)
    setErrors(validation)
    if (Object.keys(validation).length) {
      const first = Object.keys(validation)[0]
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>(
            `[id="${first === "items" ? "return-items" : first}"]`,
          )
          ?.focus(),
      )
      return
    }
    requestLock.current = true
    setOutcome("submitting")
    setLive(
      t(
        "Demo: بررسی دوباره مجوز، تعداد، مدارک و نسخه وضعیت…",
        "Demo: rechecking permission, quantity, evidence and order version…",
      ),
    )
    later(() => {
      const response: Outcome =
        mode === "changed" && !changed
          ? "changed"
          : mode === "network" || mode === "server" || mode === "unknown"
            ? mode
            : "success"
      setOutcome(response)
      requestLock.current = response === "unknown" || response === "success"
      if (response === "changed") {
        setChanged(true)
        setErrors(issues.notebook ? { "quantity-notebook": "quantity" } : {})
        setLive(
          t(
            "وضعیت سفارش تغییر کرده است؛ تعداد مجاز دفتر اکنون صفر است · Demo. انتخاب قبلی حفظ شده است.",
            "Order status changed; allowed notebook quantity is now zero · Demo. Your old selection is preserved.",
          ),
        )
        requestAnimationFrame(() =>
          form.current?.querySelector<HTMLElement>("#return-items")?.focus(),
        )
      } else
        setLive(
          response === "success"
            ? t(
                "ثبت درخواست شبیه‌سازی شد · Demo؛ مرجوعی، دریافت کالا یا بازپرداخت تأیید نشده است.",
                "Request submission simulated · Demo; return approval, receipt of goods and refunds are not confirmed.",
              )
            : response === "unknown"
              ? t(
                  "نتیجه ثبت درخواست هنوز تأیید نشده است.",
                  "Request submission has not been confirmed yet.",
                )
              : t(
                  "ثبت درخواست تأیید نشد؛ اطلاعات فرم و مدارک حفظ شده‌اند.",
                  "Submission was not confirmed; form data and evidence were preserved.",
                ),
        )
    }, 800)
  }
  const reset = (value: ReturnMode) => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
    urls.current.forEach((url) => URL.revokeObjectURL(url))
    urls.current.clear()
    uploadLocks.current.clear()
    requestLock.current = false
    setMode(value)
    setIssues({})
    setFiles([])
    setErrors({})
    setOutcome("idle")
    setChanged(false)
    setExpanded(false)
    setLive("")
    setChecking(false)
  }
  const checkStatus = () => {
    if (checking) return
    setChecking(true)
    later(() => {
      setChecking(false)
      setLive(
        t(
          "Demo: نتیجه همچنان نامشخص است؛ درخواست دیگری ارسال نشد.",
          "Demo: the result remains unknown; no second request was submitted.",
        ),
      )
    }, 700)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderId)
      setLive(t("کپی شد", "Copied"))
    } catch {
      setLive(
        t(
          "کپی ممکن نشد؛ شماره را انتخاب و کپی کنید.",
          "Unable to copy. Select and copy the number.",
        ),
      )
    }
  }
  const statuses: Record<EvidenceStatus, string> = {
    selected: t("انتخاب محلی • آپلود نشده", "Selected locally • Not uploaded"),
    uploading: t("در حال آپلود • Demo", "Uploading • Demo"),
    checking: t("در حال بررسی • Demo", "Checking • Demo"),
    accepted: t("پذیرفته‌شده • Demo", "Accepted • Demo"),
    failed: t("ناموفق • Demo", "Failed • Demo"),
  }
  return (
    <DashboardPage
      page={page}
      navigate={navigate}
      renderMedia={renderMedia}
      panelTitle={t("درخواست مرجوعی", "Request a return")}
    >
      <div className="cancel-page return-page">
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
            <bdi>{authorizedDemo ? orderId : "—"}</bdi>
          </a>
          <span>/</span>
          <span aria-current="page">
            {t("درخواست مرجوعی", "Return request")}
          </span>
        </nav>
        <div className="cancel-heading">
          <span className="cancel-eyebrow">YOUR ACCOUNT · USER-06</span>
          <h1>{t("درخواست مرجوعی", "Request a return")}</h1>
          <p>
            {t(
              "اقلام و مسئله را مشخص کنید تا درخواست مطابق شرایط سفارش بررسی شود.",
              "Select the items and describe the issue so your request can be reviewed under the order’s conditions.",
            )}
          </p>
        </div>
        <div className="cancel-demo">
          <span>Demo</span>
          <p>
            {t(
              "داده‌ها، شرایط و پاسخ‌ها نمونه‌اند؛ سرویس واقعی متصل نیست. تصاویر فقط روی دستگاه می‌مانند.",
              "Data, conditions and responses are fixtures; no real service is connected. Images remain on your device.",
            )}
          </p>
        </div>
        <div className="cancel-live" role="status" aria-live="polite">
          {live}
        </div>
        {activeMode === "denied" ? (
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
          </section>
        ) : activeMode === "loading" ? (
          <div
            className="cancel-loading"
            aria-busy="true"
            aria-label={t(
              "در حال دریافت سفارش و مجوزها",
              "Loading order and permissions",
            )}
          >
            <div className="skeleton" />
            <div className="cancel-grid">
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          </div>
        ) : outcome === "success" ? (
          <section className="cancel-success" ref={result} tabIndex={-1}>
            <span className="cancel-success-icon">
              <Glyph name="check" size={32} />
            </span>
            <span className="cancel-eyebrow">DEMO · REQUEST RESPONSE</span>
            <h2>
              {t(
                "درخواست مرجوعی ثبت شد · Demo",
                "Return request submitted · Demo",
              )}
            </h2>
            <p>
              {t(
                "این پاسخ نمونه است؛ هیچ درخواست واقعی یا پذیرش مرجوعی انجام نشده است.",
                "This is a fixture response; no actual request or return approval occurred.",
              )}
            </p>
            <dl>
              <div>
                <dt>{t("شناسه درخواست نمونه", "Demo request ID")}</dt>
                <dd>
                  <bdi>RR-2056</bdi>
                </dd>
              </div>
              <div>
                <dt>{t("تاریخ نمونه", "Demo date")}</dt>
                <dd>
                  {t("۱۹ خرداد ۱۴۰۴، ۱۰:۳۰", "9 June 2025, 10:30")}{" "}
                  <bdi>(Asia/Tehran)</bdi>
                </dd>
              </div>
              <div>
                <dt>{t("وضعیت اولیه", "Initial status")}</dt>
                <dd>{t("در انتظار بررسی · Demo", "Awaiting review · Demo")}</dd>
              </div>
            </dl>
            <div className="cancel-success-items">
              {selected.map((item) => (
                <p key={item.id}>
                  {item.title[index]}
                  <strong>
                    × <bdi>{issues[item.id].quantity}</bdi>
                  </strong>
                </p>
              ))}
            </div>
            <p>
              {t(
                "نتیجه بررسی و مراحل بازگشت یا بازپرداخت را در صفحه درخواست دنبال کنید.",
                "Follow the review outcome and return or refund steps on the request page.",
              )}
            </p>
            <a
              className="button primary"
              href={`${prefix}/account/requests/RR-2056`}
              onClick={follow(`${prefix}/account/requests/RR-2056`)}
            >
              {t("مشاهده وضعیت درخواست", "View request status")}
              <Glyph name="arrow" size={17} />
            </a>
            <p className="return-next-label">
              USER-07 ·{" "}
              {t("مقصد مستقل پروتوتایپ", "Independent prototype destination")}
            </p>
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
                <span className="cancel-badge available">
                  <Glyph name="check" size={14} />
                  {t("تأییدشده · Demo", "Confirmed · Demo")}
                </span>
              </div>
              <div>
                <span className="cancel-small-label">
                  {t("وضعیت تحویل", "Delivery status")}
                </span>
                <strong>
                  {digital
                    ? t("تحویل دیجیتال", "Digital delivery")
                    : t(
                        "وضعیت هر قلم در کارت آن",
                        "See each item’s delivery state",
                      )}
                </strong>
                <small>
                  {t(
                    "تحویل یک مرسوله، تحویل کل سفارش نیست.",
                    "One delivered shipment is not the entire order.",
                  )}
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
            <form
              noValidate
              onSubmit={submit}
              ref={form}
              className="cancel-grid"
            >
              <div className="cancel-primary">
                <section className="cancel-conditions">
                  <span className="cancel-condition-symbol">
                    <Glyph name="shield" size={22} />
                  </span>
                  <div>
                    <h2>
                      {t(
                        "شرایط همین سفارش ملاک بررسی است",
                        "Review follows this order’s conditions",
                      )}
                    </h2>
                    <p>
                      {t(
                        "امکان و تعداد مجاز هر قلم از پاسخ نمونه قرارداد دریافت شده‌اند؛ انتخاب قلم تضمین پذیرش نیست.",
                        "Each line’s eligibility and quantity come from the fixture contract; selection does not guarantee approval.",
                      )}
                    </p>
                    <a
                      href={`${orderRoute}/conditions`}
                      onClick={follow(`${orderRoute}/conditions`)}
                      className="text-link"
                    >
                      {t("شرایط مرجوعی سفارش", "Order return conditions")}
                      <Glyph name="arrow" size={15} />
                    </a>
                    <small>
                      <bdi>
                        {demoReturnContract.policy} ·{" "}
                        {demoReturnContract.version}
                      </bdi>
                    </small>
                  </div>
                </section>
                <fieldset
                  id="return-items"
                  tabIndex={-1}
                  className="cancel-items"
                  disabled={busy}
                >
                  <legend>
                    <span className="cancel-step">۱</span>
                    {t("اقلام موردنظر شما", "Your selected items")}
                  </legend>
                  <p className="cancel-section-description">
                    {t(
                      "قلم و تعداد را انتخاب کنید؛ علت و تصویر به همان قلم مرتبط می‌شوند.",
                      "Choose items and quantities; reasons and images are linked to each item.",
                    )}
                  </p>
                  {errors.items && (
                    <p className="cancel-field-error">
                      {errorText(errors.items)}
                    </p>
                  )}
                  {!eligible.length && (
                    <div className="cancel-empty">
                      <Glyph name="box" />
                      <p>
                        {t(
                          "قلمی برای درخواست مرجوعی در این مسیر در دسترس نیست.",
                          "No items are available for a return request through this flow.",
                        )}
                      </p>
                      <a
                        className="text-link"
                        href={`${prefix}/account/support?order=${orderId}`}
                        onClick={follow(
                          `${prefix}/account/support?order=${orderId}`,
                        )}
                      >
                        {t("پشتیبانی", "Support")}
                      </a>
                    </div>
                  )}
                  {lines.map((item) => {
                    const chosen = !!issues[item.id]
                    const unavailable =
                      item.allowed < 1 || item.availability === "unavailable"
                    return (
                      <article
                        className={`cancel-item ${
                          chosen ? "is-selected" : ""
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
                              checked={chosen}
                              disabled={unavailable}
                              onChange={(event) =>
                                toggle(item.id, event.target.checked)
                              }
                            />
                          </label>
                          <div className="cancel-item-thumb">
                            {item.kind === "product" ||
                            item.kind === "bundle" ? (
                              renderMedia(
                                item.kind === "bundle" ? "sage" : "sand",
                                "book",
                              )
                            ) : (
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
                                    : "Demo"}
                                </small>
                              </div>
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
                            {item.availability === "available"
                              ? t("قابل درخواست", "Request available")
                              : item.availability === "review"
                                ? t("نیازمند بررسی", "Requires review")
                                : t(
                                    "در حال حاضر قابل درخواست نیست",
                                    "Currently unavailable",
                                  )}
                          </span>
                          <span>
                            {t("تعداد خرید", "Purchased")}:{" "}
                            <bdi>{item.purchased}</bdi>
                          </span>
                          <span>
                            {t("تعداد قابل درخواست", "Allowed")}:{" "}
                            <bdi>{item.allowed}</bdi>
                          </span>
                        </div>
                        <p className="cancel-item-note">
                          {changed && item.id === "notebook"
                            ? t(
                                "تعداد مجاز تغییر کرده است. انتخاب قبلی حفظ شده؛ آن را صریحاً حذف کنید.",
                                "The allowed quantity changed. Your old selection is preserved; explicitly remove it.",
                              )
                            : item.note[index]}
                        </p>
                        {item.components && (
                          <>
                            <button
                              type="button"
                              className="cancel-component-toggle"
                              aria-expanded={expanded}
                              aria-controls="return-bundle-components"
                              onClick={() => setExpanded(!expanded)}
                            >
                              {t(
                                "اجزای تاریخی پکیج",
                                "Historical bundle components",
                              )}
                              <span>{expanded ? "−" : "+"}</span>
                            </button>
                            {expanded && (
                              <ul
                                id="return-bundle-components"
                                className="cancel-bundle-components"
                              >
                                {item.components.map((component, i) => (
                                  <li key={i}>
                                    <Glyph name="box" size={14} />
                                    {component[index]}
                                    <span>
                                      {t(
                                        "جزء پکیج؛ انتخاب مستقل فعال نیست",
                                        "Bundle component; independent selection is disabled",
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                        {chosen && !unavailable && (
                          <div className="cancel-quantity">
                            <label htmlFor={`quantity-${item.id}`}>
                              {t("تعداد مورد درخواست", "Requested quantity")}
                            </label>
                            <div className="cancel-stepper">
                              <button
                                type="button"
                                disabled={Number(issues[item.id].quantity) <= 1}
                                aria-label={`${t("کاهش تعداد", "Decrease quantity")} ${item.title[index]}`}
                                onClick={() =>
                                  update(
                                    item.id,
                                    "quantity",
                                    String(
                                      Number(issues[item.id].quantity) - 1,
                                    ),
                                  )
                                }
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
                                value={issues[item.id].quantity}
                                onChange={(event) =>
                                  update(
                                    item.id,
                                    "quantity",
                                    event.target.value,
                                  )
                                }
                                aria-invalid={!!errors[`quantity-${item.id}`]}
                                aria-describedby={
                                  errors[`quantity-${item.id}`]
                                    ? `quantity-error-${item.id}`
                                    : undefined
                                }
                              />
                              <button
                                type="button"
                                disabled={
                                  Number(issues[item.id].quantity) >=
                                  item.allowed
                                }
                                aria-label={`${t("افزایش تعداد", "Increase quantity")} ${item.title[index]}`}
                                onClick={() =>
                                  update(
                                    item.id,
                                    "quantity",
                                    String(
                                      Number(issues[item.id].quantity) + 1,
                                    ),
                                  )
                                }
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                        {errors[`quantity-${item.id}`] && (
                          <p
                            id={`quantity-error-${item.id}`}
                            className="cancel-field-error"
                          >
                            {errorText("quantity")}
                          </p>
                        )}
                        {chosen && unavailable && (
                          <button
                            type="button"
                            className="text-link cancel-remove"
                            onClick={() => toggle(item.id, false)}
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
                            href={`${prefix}/account/support?order=${orderId}`}
                            onClick={follow(
                              `${prefix}/account/support?order=${orderId}`,
                            )}
                          >
                            {t(
                              "بررسی مسیر رسیدگی با پشتیبانی",
                              "Review options with support",
                            )}
                            <Glyph name="arrow" size={15} />
                          </a>
                        )}
                      </article>
                    )
                  })}
                </fieldset>
                <section className="return-issues">
                  <h2 className="return-section-heading">
                    <span className="cancel-step">۲</span>
                    {t("مسئله و مدارک مرتبط", "Issue & supporting evidence")}
                  </h2>
                  <p className="cancel-section-description">
                    {t(
                      "برای هر قلم، علت و تصویر جدا مشخص کنید تا ارتباط مدارک روشن باشد.",
                      "Set a reason and images per item so evidence is clearly attributable.",
                    )}
                  </p>
                  {!selected.length && (
                    <div className="return-select-hint">
                      <Glyph name="chat" size={22} />
                      <p>
                        {t(
                          "پس از انتخاب قلم، بخش علت و مدارک آن اینجا نمایش داده می‌شود.",
                          "Select an item to see its reason and evidence fields here.",
                        )}
                      </p>
                    </div>
                  )}
                  {selected
                    .filter((item) => item.allowed > 0)
                    .map((item) => {
                      const issue = issues[item.id],
                        attached = files.filter(
                          (file) => file.itemId === item.id,
                        ),
                        reason = returnReasons.find(
                          (option) => option.id === issue.reason,
                        )
                      return (
                        <section
                          className="cancel-reason-card return-issue-card"
                          key={item.id}
                        >
                          <div className="return-issue-title">
                            <Glyph
                              name={
                                item.kind === "digital" ? "download" : "box"
                              }
                              size={18}
                            />
                            <h3>{item.title[index]}</h3>
                            <span>
                              × <bdi>{issue.quantity}</bdi>
                            </span>
                          </div>
                          <label htmlFor={`reason-${item.id}`}>
                            {t("علت درخواست", "Return reason")}
                            <span className="cancel-required">
                              {t("الزامی", "Required")}
                            </span>
                          </label>
                          <select
                            id={`reason-${item.id}`}
                            value={issue.reason}
                            onChange={(event) =>
                              update(item.id, "reason", event.target.value)
                            }
                            disabled={busy}
                            aria-invalid={!!errors[`reason-${item.id}`]}
                            aria-describedby={
                              errors[`reason-${item.id}`]
                                ? `reason-error-${item.id}`
                                : undefined
                            }
                          >
                            <option value="">
                              {t(
                                "علت درخواست را انتخاب کنید",
                                "Choose a return reason",
                              )}
                            </option>
                            {returnReasons
                              .filter(
                                (option) =>
                                  item.kind !== "digital" ||
                                  ["mismatch", "quality", "other"].includes(
                                    option.id,
                                  ),
                              )
                              .map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label[index]} · Demo
                                </option>
                              ))}
                          </select>
                          {errors[`reason-${item.id}`] && (
                            <p
                              id={`reason-error-${item.id}`}
                              className="cancel-field-error"
                            >
                              {errorText("reason")}
                            </p>
                          )}
                          <label htmlFor={`details-${item.id}`}>
                            {t("توضیح مسئله", "Describe the issue")}
                            <span className="cancel-required">
                              {t(
                                "الزامی در قرارداد Demo",
                                "Required by Demo contract",
                              )}
                            </span>
                          </label>
                          <textarea
                            id={`details-${item.id}`}
                            rows={3}
                            value={issue.details}
                            maxLength={demoReturnContract.maxDetails}
                            onChange={(event) =>
                              update(item.id, "details", event.target.value)
                            }
                            disabled={busy}
                            aria-invalid={!!errors[`details-${item.id}`]}
                            aria-describedby={`hint-${item.id}${
                              errors[`details-${item.id}`]
                                ? ` details-error-${item.id}`
                                : ""
                            }`}
                            placeholder={t(
                              "چه مسئله‌ای در این قلم دیده‌اید؟",
                              "What issue did you notice with this item?",
                            )}
                          />
                          <div className="cancel-details-footer">
                            <p id={`hint-${item.id}`}>
                              {t(
                                "مشکل و قلم مرتبط را توضیح دهید. رمز، کد تأیید یا اطلاعات بانکی ارسال نکنید.",
                                "Describe the issue and affected item. Do not send passwords, verification codes or banking details.",
                              )}
                            </p>
                            <span>
                              <bdi>
                                {issue.details.length}/
                                {demoReturnContract.maxDetails}
                              </bdi>
                            </span>
                          </div>
                          {errors[`details-${item.id}`] && (
                            <p
                              id={`details-error-${item.id}`}
                              className="cancel-field-error"
                            >
                              {errorText(errors[`details-${item.id}`])}
                            </p>
                          )}
                          <div
                            className="return-evidence"
                            id={`evidence-${item.id}`}
                            tabIndex={-1}
                          >
                            <div className="return-evidence-title">
                              <h4>{t("تصاویر مرتبط", "Supporting images")}</h4>
                              <span>
                                {reason?.imagesRequired
                                  ? t(
                                      "الزامی برای این علت · Demo",
                                      "Required for this reason · Demo",
                                    )
                                  : t("اختیاری · Demo", "Optional · Demo")}
                              </span>
                            </div>
                            <p>
                              {t(
                                "مدارک فقط برای همین قلم‌اند؛ تصویر کارت بانکی یا مدرک هویتی لازم نیست.",
                                "Evidence is linked only to this item; banking card or identity images are not needed.",
                              )}
                            </p>
                            <label className="return-file-picker">
                              <Glyph name="plus" size={20} />
                              <strong>
                                {t("انتخاب تصاویر", "Choose images")}
                              </strong>
                              <span>
                                {t(
                                  "گالری یا انتخاب فایل؛ دوربین خودکار فعال نمی‌شود",
                                  "Gallery or file picker; camera does not start automatically",
                                )}
                              </span>
                              <input
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/webp"
                                disabled={
                                  busy ||
                                  attached.length >=
                                    demoReturnContract.fileCount
                                }
                                onChange={(event) => {
                                  addFiles(item.id, event.target.files)
                                  event.target.value = ""
                                }}
                              />
                            </label>
                            <small className="return-upload-contract">
                              {t(
                                "قرارداد نمونه، نه سیاست واقعی: JPEG، PNG یا WebP • حداکثر ۳ تصویر برای هر قلم • هر فایل تا ۵ مگابایت",
                                "Demo contract, not actual policy: JPEG, PNG or WebP • Up to 3 images per item • Up to 5 MB each",
                              )}
                            </small>
                            {attached.map((file) => (
                              <div className="return-file" key={file.id}>
                                <img
                                  src={file.url}
                                  alt={t(
                                    "پیش‌نمایش خصوصی محلی",
                                    "Private local preview",
                                  )}
                                  onError={() => {
                                    uploadLocks.current.delete(file.id)
                                    setFiles((previous) =>
                                      previous.map((entry) =>
                                        entry.id === file.id
                                          ? { ...entry, status: "failed", invalidPreview: true }
                                          : entry,
                                      ),
                                    )
                                    setLive(
                                      t(
                                        "تصویر قابل نمایش نیست؛ فایل را حذف یا فایل معتبر انتخاب کنید.",
                                        "Image cannot be displayed; remove it or choose a valid image.",
                                      ),
                                    )
                                  }}
                                />
                                <div className="return-file-info">
                                  <bdi>{file.name}</bdi>
                                  <small>
                                    {(file.size / 1024 / 1024).toLocaleString(
                                      en ? "en" : "fa",
                                      { maximumFractionDigits: 2 },
                                    )}{" "}
                                    MB
                                  </small>
                                  <span
                                    className={`return-file-status ${file.status}`}
                                  >
                                    {(file.status === "uploading" ||
                                      file.status === "checking") && (
                                      <span className="return-spinner" />
                                    )}
                                    {statuses[file.status]}
                                  </span>
                                </div>
                                <div className="return-file-actions">
                                  {(file.status === "selected" ||
                                    file.status === "failed") && (
                                    <button
                                      type="button"
                                      className="text-link"
                                      disabled={busy || file.invalidPreview}
                                      onClick={() =>
                                        simulateUpload(
                                          file,
                                          file.status === "failed",
                                        )
                                      }
                                    >
                                      {file.status === "failed"
                                        ? t("تلاش مجدد · Demo", "Retry · Demo")
                                        : t(
                                            "شبیه‌سازی آپلود",
                                            "Simulate upload",
                                          )}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="icon-button"
                                    disabled={
                                      busy || uploadLocks.current.has(file.id)
                                    }
                                    aria-label={`${t("حذف فایل", "Remove file")} ${file.name}`}
                                    onClick={() => removeFile(file.id)}
                                  >
                                    <Glyph name="close" size={18} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {errors[`evidence-${item.id}`] && (
                              <p className="cancel-field-error">
                                {errorText(errors[`evidence-${item.id}`])}
                              </p>
                            )}
                            <p className="return-local-note">
                              <Glyph name="shield" size={14} />
                              {t(
                                "پیش‌نمایش محلی و موقت است؛ انتخاب فایل، آپلود موفق نیست.",
                                "Previews are local and temporary. File selection is not successful upload.",
                              )}
                            </p>
                          </div>
                        </section>
                      )
                    })}
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
                      "پیش از ثبت، قلم و مسئله را مرور کنید.",
                      "Review the items and issues before submitting.",
                    )}
                  </p>
                  <div className="cancel-summary-items">
                    {selected.length ? (
                      selected.map((item) => (
                        <div className="return-summary-line" key={item.id}>
                          <div>
                            <span>{item.title[index]}</span>
                            <strong>
                              × <bdi>{issues[item.id].quantity || "—"}</bdi>
                            </strong>
                          </div>
                          <small>
                            {returnReasons.find(
                              (reason) => reason.id === issues[item.id].reason,
                            )?.label[index] ||
                              t("علت انتخاب نشده", "Reason not selected")}
                          </small>
                          <small>
                            {
                              files.filter(
                                (file) =>
                                  file.itemId === item.id &&
                                  file.status === "accepted",
                              ).length
                            }{" "}
                            {t(
                              "مدرک پذیرفته‌شده · Demo",
                              "accepted evidence · Demo",
                            )}
                          </small>
                          {item.allowed === 0 && (
                            <span className="cancel-field-error">
                              {t("انتخاب نامعتبر", "Invalid selection")}
                            </span>
                          )}
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
                      <dt>{t("نوع درخواست", "Request type")}</dt>
                      <dd>
                        {digital
                          ? t("رسیدگی دیجیتال", "Digital issue review")
                          : t(
                              "مرجوعی برای بررسی بازپرداخت",
                              "Return for refund review",
                            )}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("وضعیت درخواست", "Request status")}</dt>
                      <dd>{t("نیازمند بررسی", "Requires review")}</dd>
                    </div>
                    <div>
                      <dt>{t("پرداخت اولیه", "Initial payment")}</dt>
                      <dd>{t("تأییدشده · Demo", "Confirmed · Demo")}</dd>
                    </div>
                  </dl>
                  <div className="cancel-refund-note">
                    <Glyph name="clock" size={19} />
                    <p>
                      {t(
                        "مبلغ قابل بازپرداخت پس از بررسی مشخص می‌شود.",
                        "The refundable amount will be determined after review.",
                      )}
                    </p>
                  </div>
                  <small className="cancel-financial-note">
                    {t(
                      "محاسبه معتبر مبلغ یا تخفیف مرتبط ارائه نشده؛ قیمت روز یا مبلغ کامل، بازپرداخت قطعی نیست.",
                      "No verified amount or discount allocation is provided; current or full prices are not guaranteed refunds.",
                    )}
                  </small>
                  {!digital && (
                    <div className="return-shipping-note">
                      <p>
                        {t(
                          "روش بازگشت و مسئول هزینه پس از بررسی اعلام می‌شوند.",
                          "Return instructions and responsibility for shipping costs will be provided after review.",
                        )}
                      </p>
                      <strong>
                        {t(
                          "پیش از دریافت دستور بازگشت، کالا را به نشانی تأییدنشده ارسال نکنید.",
                          "Do not send an item to an unconfirmed address before receiving return instructions.",
                        )}
                      </strong>
                    </div>
                  )}
                  {digital && (
                    <div className="return-shipping-note">
                      <Glyph name="download" size={19} />
                      <p>
                        {t(
                          "این درخواست برای رسیدگی به فایل است و ارسال فیزیکی ندارد.",
                          "This request concerns a file issue and involves no physical shipping.",
                        )}
                      </p>
                    </div>
                  )}
                  <div className="cancel-submit-notice">
                    <Glyph name="shield" size={17} />
                    <p>
                      {t(
                        "ثبت درخواست به معنی پذیرش مرجوعی، تأیید تعویض یا انجام بازپرداخت نیست.",
                        "Submitting a request does not approve a return, confirm an exchange or complete a refund.",
                      )}
                    </p>
                  </div>
                  {["network", "server", "unknown", "changed"].includes(
                    outcome,
                  ) && (
                    <div className="cancel-submit-error" role="alert">
                      <strong>
                        {outcome === "unknown"
                          ? t(
                              "نتیجه ثبت درخواست هنوز تأیید نشده است.",
                              "Request submission has not been confirmed yet.",
                            )
                          : outcome === "changed"
                            ? t(
                                "وضعیت سفارش تغییر کرده است؛ انتخاب‌ها را دوباره بررسی کنید.",
                                "Order status changed; review your selections.",
                              )
                            : t(
                                "ثبت درخواست تأیید نشد؛ اطلاعات شما حفظ شده است.",
                                "Submission was not confirmed; your data was preserved.",
                              )}
                      </strong>
                      {outcome === "unknown" && (
                        <button
                          type="button"
                          className="text-link"
                          onClick={checkStatus}
                          disabled={checking}
                        >
                          {checking
                            ? t("در حال بررسی…", "Checking…")
                            : t("بررسی وضعیت ثبت", "Check submission status")}
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="button primary cancel-submit"
                    disabled={busy || uploading || !eligible.length}
                  >
                    {outcome === "submitting"
                      ? t("در حال ثبت درخواست…", "Submitting request…")
                      : t("ثبت درخواست مرجوعی", "Submit return request")}
                    <Glyph name="arrow" size={18} />
                  </button>
                  <span className="cancel-submit-demo">
                    {t(
                      "ثبت و پاسخ فقط شبیه‌سازی Demo هستند.",
                      "Submission and response are Demo simulations only.",
                    )}
                  </span>
                  <a
                    href={orderRoute}
                    onClick={follow(orderRoute)}
                    className="button secondary cancel-back"
                  >
                    {t("بازگشت به سفارش", "Back to order")}
                  </a>
                </section>
                <div className="cancel-support-note">
                  <Glyph name="chat" size={20} />
                  <h3>
                    {t(
                      "برای بررسی مسئله همراه شما هستیم",
                      "We’re here to review your issue",
                    )}
                  </h3>
                  <p>
                    {t(
                      "مسیر استاندارد تنها راه رسیدگی نیست.",
                      "The standard flow is not the only review option.",
                    )}
                  </p>
                  <a
                    className="text-link"
                    href={`${prefix}/account/support?order=${orderId}`}
                    onClick={follow(
                      `${prefix}/account/support?order=${orderId}`,
                    )}
                  >
                    {t("پشتیبانی سفارش", "Order support")}
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
              "جزئیات را با دقت و آرامش بررسی می‌کنیم.",
              "We’ll review the details with care.",
            )}
          </span>
          <Glyph name="paint" size={17} />
        </footer>
        <details className="dash-preview">
          <summary>
            {t("حالت‌های پیش‌نمایش", "Preview states")} <bdi>USER-06 · Demo</bdi>
          </summary>
          <div>
            {previewModes.map(([value, fa, english]) => (
              <button
                type="button"
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
          className="cancel-destination modal"
          aria-labelledby="return-destination-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <div className="modal-head">
            <h2 id="return-destination-title">
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
              "صفحه مقصد در این مرحله بازطراحی نشده است. مرجوعی، دریافت کالا، کنترل کیفیت و بازپرداخت مراحل مستقل‌اند.",
              "The destination has not been redesigned here. Return approval, receiving goods, quality checks and refunds are separate stages.",
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
