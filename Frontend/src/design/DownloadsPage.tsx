import { useEffect, useRef, useState, type MouseEvent } from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import {
  authorizedFiles,
  canRequestDownload,
  downloadFixture,
  searchFiles,
  type CustomerFile,
  type DownloadFilter,
  type DownloadMode,
  type FileStatus,
} from "./downloads"
import "./downloads.css"

type DownloadState = "preparing" | "started" | "error" | "link-expired"
const previews: [DownloadMode, string, string][] = [
  ["normal", "فهرست نمونه", "Sample list"],
  ["started", "آغاز دریافت شبیه‌سازی‌شده", "Simulated download start"],
  ["error", "خطای یک فایل", "Single-file error"],
  ["link-expired", "لینک منقضی، مجوز برقرار", "Link expired, access valid"],
  ["access-expired", "حق دسترسی پایان‌یافته Demo", "Demo access expired"],
  ["missing", "فایل ناموجود", "Missing file"],
  ["empty", "بدون فایل", "No files"],
  ["loading", "بارگذاری", "Loading"],
  ["network", "خطای دریافت فهرست", "List network error"],
  ["denied", "عدم دسترسی", "Access denied"],
]
export default function DownloadsPage({
  page,
  navigate,
}: {
  page: string
  navigate: (route: string) => void
}) {
  const en = page.startsWith("/en/"),
    index = en ? 1 : 0
  const t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa",
    account = `${prefix}/account`
  const [mode, setMode] = useState<DownloadMode>("normal")
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState<DownloadFilter>("all")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [states, setStates] = useState<Record<string, DownloadState>>({})
  const [live, setLive] = useState(""),
    [retrying, setRetrying] = useState(false)
  const [destination, setDestination] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null),
    origin = useRef<HTMLElement | null>(null)
  const locks = useRef(new Set<string>())
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const visible = mode !== "denied" && mode !== "loading" && mode !== "network"
  const files = visible
    ? authorizedFiles(downloadFixture(mode), "demo-customer")
    : []
  const results = searchFiles(files, query, filter)
  const groups = Array.from(new Set(results.map((file) => file.orderId)))
  const later = (fn: () => void, ms = 800) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      fn()
    }, ms)
    timers.current.add(timer)
  }
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      locks.current.clear()
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
    if (route === account || route.includes("/auth/") || route.endsWith("/artwork-review")) navigate(route)
    else {
      origin.current = event.currentTarget
      setDestination(route)
    }
  }
  const requestFile = (file: CustomerFile) => {
    if (locks.current.has(file.id) || !canRequestDownload(file) || !visible)
      return
    locks.current.add(file.id)
    const previous = states[file.id]
    setStates((old) => ({ ...old, [file.id]: "preparing" }))
    setLive(
      t(
        "Demo: بررسی نشست، مجوز و درخواست لینک کوتاه‌عمر شبیه‌سازی می‌شود.",
        "Demo: simulating session, permission and short-lived link checks.",
      ),
    )
    later(() => {
      // No download service or actual order file exists; never fabricate a URL or device-save success.
      const next =
        mode === "started"
          ? "started"
          : mode === "link-expired" && previous !== "link-expired"
            ? "link-expired"
            : "error"
      setStates((old) => ({ ...old, [file.id]: next }))
      locks.current.delete(file.id)
      setLive(
        next === "started"
          ? t(
              "Demo: آغاز دریافت شبیه‌سازی شد؛ لینک واقعی صادر نشد و هیچ فایلی دانلود نشده است.",
              "Demo: download start simulated; no real link was issued and no file was downloaded.",
            )
          : next === "link-expired"
            ? t(
                "Demo: لینک دریافت منقضی شده، اما حق دسترسی فایل برقرار است؛ لینک تازه درخواست کنید.",
                "Demo: the download link expired, but file access remains valid. Request a fresh link.",
              )
            : t(
                "دریافت آغاز نشد؛ سرویس دانلود خصوصی متصل نیست. سایر فایل‌ها باقی می‌مانند.",
                "Download did not start; no private download service is connected. Other files remain available in the preview.",
              ),
      )
    })
  }
  const retryList = () => {
    if (retrying) return
    setRetrying(true)
    later(() => {
      setRetrying(false)
      setLive(
        t(
          "دریافت فهرست فایل‌ها ممکن نشد؛ سرویس متصل نیست.",
          "Unable to load your files; no service is connected.",
        ),
      )
    })
  }
  const preview = (value: DownloadMode) => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
    locks.current.clear()
    setMode(value)
    setStates({})
    setExpanded({})
    setQuery("")
    setFilter("all")
    setLive("")
    setRetrying(false)
  }
  const statusLabel: Record<FileStatus, string> = {
    ready: t("آماده دانلود", "Ready to download"),
    preparing: t("در حال آماده‌سازی", "Being prepared"),
    inactive: t("دسترسی هنوز فعال نشده", "Access not yet enabled"),
    updated: t("نسخه جدید موجود است", "New version available"),
    expired: t("دسترسی پایان یافته", "Access expired"),
    unavailable: t("در حال حاضر قابل دریافت نیست", "Currently unavailable"),
  }
  const size = (bytes: number | null) =>
    bytes === null
      ? t("ثبت نشده", "Not recorded")
      : `${(bytes / 1024 / 1024).toLocaleString(en ? "en" : "fa", { maximumFractionDigits: 1 })} MB`
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(en ? "en-GB" : "fa-IR", {
          dateStyle: "medium",
          timeZone: "Asia/Tehran",
        }).format(new Date(value))
      : t("هنوز تحویل نشده", "Not delivered yet")
  return (
    <DashboardPage
      page={page}
      navigate={navigate}
      renderMedia={() => null}
      activeSection="downloads"
      panelTitle={t("فایل‌های دیجیتال شما", "Your digital files")}
    >
      <div className="downloads-page">
        <nav
          className="downloads-breadcrumb"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          <a href={account} onClick={follow(account)}>
            {t("حساب", "Account")}
          </a>
          <span>/</span>
          <span aria-current="page">{t("دانلودها", "Downloads")}</span>
        </nav>
        <div className="downloads-heading">
          <div>
            <span className="downloads-eyebrow">YOUR ACCOUNT · USER-08</span>
            <h1>{t("فایل‌های دیجیتال شما", "Your digital files")}</h1>
            <p>
              {t(
                "فایل‌های تحویل‌شده و وضعیت دسترسی آن‌ها را اینجا ببینید.",
                "Find your delivered files and their access status here.",
              )}
            </p>
          </div>
          <span className="downloads-heading-icon">
            <Glyph name="download" size={30} />
          </span>
        </div>
        <div className="downloads-demo">
          <span>Demo</span>
          <p>
            {t(
              "همه فایل‌ها، مشخصات و وضعیت‌ها نمونه‌اند. فایل سفارش یا سرویس دانلود متصل نیست؛ هیچ لینک معتبر یا دانلود واقعی ادعا نمی‌شود.",
              "All files, specifications and statuses are fixtures. No order file or download service is connected; no valid link or actual download is claimed.",
            )}
          </p>
        </div>
        <div className="downloads-live" role="status" aria-live="polite">
          {live}
        </div>
        {mode === "loading" ? (
          <div
            className="downloads-skeletons"
            aria-busy="true"
            aria-label={t("در حال دریافت فایل‌ها", "Loading files")}
          >
            <div className="skeleton" />
            {[0, 1].map((i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        ) : mode === "denied" ? (
          <section className="downloads-state">
            <Glyph name="shield" size={36} />
            <h2>
              {t(
                "دسترسی به فایل‌های این حساب مجاز نیست.",
                "This account’s files are not accessible.",
              )}
            </h2>
            <p>
              {t(
                "تا بررسی نشست و مجوز سرویس، هیچ اطلاعات خصوصی نمایش داده نمی‌شود.",
                "No private information is shown until service session and permission checks succeed.",
              )}
            </p>
          </section>
        ) : mode === "network" ? (
          <section className="downloads-state">
            <Glyph name="download" size={36} />
            <h2>
              {t("دریافت فهرست فایل‌ها ممکن نشد.", "Unable to load your files.")}
            </h2>
            <p>
              {t(
                "این خطا به معنی حذف سفارش یا ازبین‌رفتن حق شما نیست.",
                "This error does not mean your order was deleted or your rights were lost.",
              )}
            </p>
            <button
              className="button primary"
              onClick={retryList}
              disabled={retrying}
            >
              {retrying
                ? t("در حال تلاش…", "Trying…")
                : t("تلاش دوباره", "Try again")}
            </button>
          </section>
        ) : !files.length ? (
          <section className="downloads-state">
            <span className="downloads-empty-icon">
              <Glyph name="download" size={36} />
            </span>
            <h2>
              {t(
                "هنوز فایل دیجیتالی برای حساب شما تحویل نشده است.",
                "No digital files have been delivered to your account yet.",
              )}
            </h2>
            <p>
              {t(
                "خرید اثر فیزیکی به معنی دریافت خودکار فایل دیجیتال نیست.",
                "Purchasing physical artwork does not automatically include a digital file.",
              )}
            </p>
            <a
              className="button primary"
              href={`${account}/orders`}
              onClick={follow(`${account}/orders`)}
            >
              {t("مشاهده سفارش‌ها", "View orders")}
              <Glyph name="arrow" size={16} />
            </a>
          </section>
        ) : (
          <>
            <section
              className="downloads-tools"
              aria-label={t("جست‌وجو و فیلتر فایل‌ها", "File search and filters")}
            >
              <label className="downloads-search">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m16 16 5 5" />
                </svg>
                <span className="sr-only">
                  {t(
                    "نام فایل، عنوان اثر یا شماره سفارش",
                    "File name, artwork title or order number",
                  )}
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t(
                    "نام فایل، عنوان اثر یا شماره سفارش",
                    "File name, artwork title or order number",
                  )}
                />
                {query && (
                  <button
                    className="icon-button"
                    aria-label={t("پاک‌کردن جست‌وجو", "Clear search")}
                    onClick={() => setQuery("")}
                  >
                    <Glyph name="close" size={17} />
                  </button>
                )}
              </label>
              <div className="downloads-filter-row">
                <div
                  className="downloads-filters"
                  role="group"
                  aria-label={t("وضعیت فایل", "File status")}
                >
                  {([
                    ["all", t("همه", "All")],
                    ["ready", t("آماده دریافت", "Ready to download")],
                    ["pending", t("در انتظار آماده‌سازی", "Not ready yet")],
                    ["attention", t("نیازمند پیگیری", "Needs attention")],
                  ] as [DownloadFilter, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="downloads-sort">
                  <Glyph name="clock" size={15} />
                  {t("جدیدترین تحویل", "Latest delivery")}
                </span>
              </div>
              <div className="downloads-results">
                <span>
                  {results.length.toLocaleString(en ? "en" : "fa")}{" "}
                  {t("فایل نمونه", "sample files")}
                </span>
                <span>
                  {t(
                    "جست‌وجو فقط در فایل‌های مجاز این حساب",
                    "Searches only this account’s authorized files",
                  )}
                </span>
              </div>
            </section>
            {!results.length ? (
              <section className="downloads-state downloads-no-results">
                <Glyph name="download" size={32} />
                <h2>
                  {query
                    ? t(
                        "فایلی با این جست‌وجو پیدا نشد.",
                        "No files match your search.",
                      )
                    : t(
                        "فایلی با این فیلتر پیدا نشد.",
                        "No files match this filter.",
                      )}
                </h2>
                <button
                  className="button secondary"
                  onClick={() => {
                    setQuery("")
                    setFilter("all")
                  }}
                >
                  {t("پاک‌کردن جست‌وجو و فیلتر", "Clear search and filters")}
                </button>
              </section>
            ) : (
              groups.map((orderId) => {
                const orderFiles = results.filter(
                  (file) => file.orderId === orderId,
                )
                return (
                  <section className="downloads-order" key={orderId}>
                    <header className="downloads-order-heading">
                      <span className="downloads-order-symbol">
                        <Glyph name="box" size={22} />
                      </span>
                      <div>
                        <span className="downloads-order-number">
                          {t("سفارش", "Order")} <bdi>{orderId}</bdi>{" "}
                          <span>· Demo</span>
                        </span>
                        <h2>{orderFiles[0].orderTitle[index]}</h2>
                      </div>
                      <a
                        className="text-link"
                        href={`${account}/orders/${orderId}`}
                        onClick={follow(`${account}/orders/${orderId}`)}
                      >
                        {t("جزئیات سفارش", "Order details")}
                        <Glyph name="arrow" size={16} />
                      </a>
                    </header>
                    <div className="downloads-order-files">
                      {orderFiles.map((file) => {
                        const state = states[file.id],
                          pending = state === "preparing",
                          available = canRequestDownload(file)
                        return (
                          <article
                            className={`downloads-file ${
                              !file.current ? "previous" : ""
                            }`}
                            key={file.id}
                          >
                            <div className="downloads-file-main">
                              <span
                                className={`downloads-file-icon format-${file.format.toLowerCase()}`}
                              >
                                <Glyph
                                  name={
                                    file.format === "PNG" ? "paint" : "book"
                                  }
                                  size={25}
                                />
                                <small>{file.format}</small>
                              </span>
                              <div className="downloads-file-info">
                                <div className="downloads-file-title">
                                  <h3>{file.title[index]}</h3>
                                  <span className="downloads-version-badge">
                                    {file.current
                                      ? t("نسخه جاری", "Current version")
                                      : t("نسخه پیشین", "Previous version")}
                                  </span>
                                </div>
                                <bdi className="downloads-filename">
                                  {file.filename}
                                </bdi>
                                <dl className="downloads-file-meta">
                                  <div>
                                    <dt>{t("فرمت", "Format")}</dt>
                                    <dd>
                                      <bdi>{file.format}</bdi>
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>{t("حجم", "Size")}</dt>
                                    <dd>
                                      <bdi>{size(file.bytes)}</bdi>
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>{t("نسخه", "Version")}</dt>
                                    <dd>
                                      <bdi>{file.version}</bdi>
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>{t("تاریخ تحویل", "Delivered on")}</dt>
                                    <dd>{date(file.deliveredAt)}</dd>
                                  </div>
                                </dl>
                              </div>
                            </div>
                            <div className="downloads-file-footer">
                              <span
                                className={`downloads-status ${file.status}`}
                              >
                                <Glyph
                                  name={
                                    file.status === "ready"
                                      ? "check"
                                      : file.status === "updated"
                                        ? "download"
                                        : "clock"
                                  }
                                  size={14}
                                />
                                {statusLabel[file.status]} <small>· Demo</small>
                              </span>
                              <div className="downloads-file-actions">
                                <button
                                  className="downloads-details-toggle"
                                  aria-expanded={!!expanded[file.id]}
                                  aria-controls={`details-${file.id}`}
                                  onClick={() =>
                                    setExpanded((previous) => ({
                                      ...previous,
                                      [file.id]: !previous[file.id],
                                    }))
                                  }
                                >
                                  {t(
                                    "جزئیات و شرایط استفاده",
                                    "Details & usage conditions",
                                  )}
                                  <span>{expanded[file.id] ? "−" : "+"}</span>
                                </button>
                                {available ? (
                                  <button
                                    className="button primary"
                                    onClick={() => requestFile(file)}
                                    disabled={pending}
                                    aria-label={`${t("دانلود فایل", "Download file")}: ${file.title[index]} · Demo`}
                                  >
                                    <Glyph name="download" size={17} />
                                    {pending
                                      ? t(
                                          "در حال آماده‌سازی دریافت…",
                                          "Preparing download…",
                                        )
                                      : state === "link-expired"
                                        ? t(
                                            "درخواست لینک تازه",
                                            "Request a fresh link",
                                          )
                                        : state === "error"
                                          ? t("تلاش دوباره", "Try again")
                                          : t("دانلود فایل", "Download file")}
                                  </button>
                                ) : (
                                  <button
                                    className="button secondary"
                                    disabled
                                    aria-label={`${statusLabel[file.status]}: ${file.title[index]}`}
                                  >
                                    {file.status === "expired"
                                      ? t(
                                          "دسترسی پایان یافته",
                                          "Access expired",
                                        )
                                      : t(
                                          "دریافت فعال نیست",
                                          "Download unavailable",
                                        )}
                                  </button>
                                )}
                              </div>
                            </div>
                            {file.status === "unavailable" && (
                              <p className="downloads-file-notice">
                                {t(
                                  "فایل در حال حاضر قابل دریافت نیست. با پشتیبانی سفارش تماس بگیرید.",
                                  "This file is currently unavailable. Contact order support.",
                                )}
                              </p>
                            )}
                            {file.status === "expired" && (
                              <p className="downloads-file-notice">
                                {t(
                                  "حق دسترسی در پاسخ Demo پایان یافته است؛ انقضای لینک موقت نیست. تمدید خودکار فرض نمی‌شود.",
                                  "Access entitlement expired in the Demo response; this is not a temporary link expiry. Automatic renewal is not assumed.",
                                )}
                              </p>
                            )}
                            {state === "link-expired" && (
                              <p className="downloads-file-notice">
                                {t(
                                  "Demo: لینک دریافت منقضی شده، اما مجوز فایل برقرار است. درخواست لینک تازه، حق دسترسی را تغییر نمی‌دهد.",
                                  "Demo: the download link expired while file permission remains valid. Requesting a fresh link does not change access entitlement.",
                                )}
                              </p>
                            )}
                            {state === "error" && (
                              <p className="downloads-file-error">
                                {t(
                                  "دریافت فایل آغاز نشد؛ سرویس خصوصی متصل نیست. این خطا به معنی حذف سفارش یا حق دسترسی نیست.",
                                  "Download did not start; no private service is connected. This error does not imply loss of your order or access.",
                                )}
                              </p>
                            )}
                            {state === "started" && (
                              <p className="downloads-file-simulated">
                                {t(
                                  "Demo: «دریافت فایل آغاز شد» فقط شبیه‌سازی است؛ لینک واقعی صادر نشده و فایلی روی دستگاه ذخیره نشده است.",
                                  "Demo: “Download started” is simulated only; no real link was issued and no file was saved to your device.",
                                )}
                              </p>
                            )}
                            {expanded[file.id] && (
                              <div
                                id={`details-${file.id}`}
                                className="downloads-file-details"
                              >
                                <div>
                                  <h4>
                                    {t(
                                      "مشخصات تحویل",
                                      "Delivery specifications",
                                    )}
                                  </h4>
                                  <p>
                                    {t(
                                      "فایل نهایی مشتری در داده نمونه؛ فایل چاپخانه، منبع هنرمند یا طرح تأییدنشده نیست.",
                                      "Final customer deliverable in the fixture; not a print-house file, artist source or unapproved draft.",
                                    )}
                                  </p>
                                  {file.width && file.height && (
                                    <dl>
                                      <div>
                                        <dt>
                                          {t(
                                            "ابعاد پیکسلی ثبت‌شده",
                                            "Recorded pixel dimensions",
                                          )}
                                        </dt>
                                        <dd>
                                          <bdi>
                                            {file.width} × {file.height} px
                                          </bdi>
                                        </dd>
                                      </div>
                                    </dl>
                                  )}
                                  <p>
                                    {t(
                                      "DPI و سایز چاپ در داده نمونه ثبت نشده‌اند؛ چاپ در هر اندازه تضمین نمی‌شود.",
                                      "DPI and physical print size are not recorded in the fixture; printing at any size is not guaranteed.",
                                    )}
                                  </p>
                                  {!file.current && (
                                    <p>
                                      {t(
                                        "دریافت نسخه پیشین فقط در مجوز نمونه فعال است؛ این نسخه با فایل جاری یکی نیست.",
                                        "Previous-version download is enabled only by the fixture permission; it is distinct from the current file.",
                                      )}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <h4>
                                    {t(
                                      "شرایط استفاده از فایل",
                                      "File usage conditions",
                                    )}
                                  </h4>
                                  <p>{file.usage[index]}</p>
                                  <a
                                    className="text-link"
                                    href={`${account}/orders/${file.orderId}/file-usage`}
                                    onClick={follow(
                                      `${account}/orders/${file.orderId}/file-usage`,
                                    )}
                                  >
                                    {t(
                                      "مشاهده توافق مرتبط",
                                      "View the related agreement",
                                    )}
                                    <Glyph name="arrow" size={15} />
                                  </a>
                                </div>
                              </div>
                            )}
                            <div className="downloads-file-support">
                              <a
                                href={`${account}/support?order=${file.orderId}&file=${file.id}`}
                                onClick={follow(
                                  `${account}/support?order=${file.orderId}&file=${file.id}`,
                                )}
                              >
                                <Glyph name="chat" size={14} />
                                {t(
                                  "مشکل در دریافت فایل",
                                  "Having trouble downloading?",
                                )}
                              </a>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                )
              })
            )}
            <section className="downloads-guidance">
              <span className="downloads-guidance-symbol">
                <Glyph name="shield" size={23} />
              </span>
              <div>
                <h2>
                  {t(
                    "دریافت روشن، استفاده مطابق توافق",
                    "Clear delivery, use under your agreement",
                  )}
                </h2>
                <p>
                  {t(
                    "دانلود فایل به‌تنهایی تأیید نهایی اثر یا انتقال حقوق تکثیر نیست. نسخه اولیه برای بررسی، در صفحه تأیید طرح قرار می‌گیرد.",
                    "Downloading alone does not approve artwork or transfer reproduction rights. Drafts for review belong on the artwork approval page.",
                  )}
                </p>
                <p className="downloads-mobile-note">
                  {t(
                    "محل ذخیره و رفتار دریافت به مرورگر و دستگاه شما بستگی دارد؛ آغاز دریافت با ذخیره قطعی یکسان نیست.",
                    "Save location and download behavior depend on your browser and device; download initiation is not confirmed storage.",
                  )}
                </p>
                <a
                  className="text-link"
                  href={`${account}/orders/NA-24106/artwork-review`}
                  onClick={follow(`${account}/orders/NA-24106/artwork-review`)}
                >
                  {t(
                    "رفتن به بررسی طرح · USER-09",
                    "Go to artwork review · USER-09",
                  )}
                  <Glyph name="arrow" size={15} />
                </a>
              </div>
            </section>
          </>
        )}
        <footer className="downloads-footer">
          <span>
            {t(
              "هنر شما، همراه لحظه‌های شما.",
              "Your art, alongside your everyday.",
            )}
          </span>
          <span>Nilart · Demo</span>
        </footer>
        <details className="downloads-preview dash-preview">
          <summary>
            {t("حالت‌های پیش‌نمایش", "Preview states")} <bdi>USER-08 · Demo</bdi>
          </summary>
          <div>
            {previews.map(([value, fa, english]) => (
              <button
                key={value}
                type="button"
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
          className="downloads-destination modal"
          ref={dialog}
          aria-labelledby="downloads-destination-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <div className="modal-head">
            <h2 id="downloads-destination-title">
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
              "صفحه مقصد در این مرحله بازطراحی نشده است. هیچ فایل واقعی، تأیید طرح یا تیکت ثبت نشده است.",
              "This destination is not redesigned here. No real file download, artwork approval or ticket occurred.",
            )}
          </p>
          <code dir="ltr">{destination}</code>
          <button className="button secondary" onClick={close}>
            {t("بازگشت به فایل‌ها", "Back to files")}
          </button>
        </dialog>
      </div>
    </DashboardPage>
  )
}
