import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import type { ArtistOrder, ArtistStage, AssessmentRequest } from "./artist-data"

export type ArtistLocale = "fa" | "en"
export const artistText = (locale: ArtistLocale, fa: string, en: string) =>
  locale === "fa" ? fa : en
export function ArtistIcon({ name = "grid" }: { name?: string }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    brush: (
      <>
        <path d="m10 14 9-11 3 3-11 9M10 14c-7-2-2 7-8 7 6 2 12-1 8-7Z" />
      </>
    ),
    orders: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6m-6 4h6m-6 4h4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    feedback: (
      <>
        <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9ZM7 8h10M7 12h7" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="2" />
        <path d="M3 8h18m-6 4h6v5h-6z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    bell: (
      <>
        <path d="M5 17h14l-2-4V8a5 5 0 0 0-10 0v5l-2 4Zm5 4h4" />
      </>
    ),
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    check: <path d="m5 12 4 4L19 6" />,
    logout: <path d="M10 4H4v16h6m4-4 4-4-4-4m-6 4h12" />,
    link: <path d="M14 3h7v7m0-7L10 14M11 5H4v15h15v-7" />,
    alert: <path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v1" />,
    upload: <path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" />,
    refresh: <path d="M20 9a8 8 0 1 0 0 6M20 3v6h-6" />,
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.grid}
    </svg>
  )
}
export function ArtistButton({
  children,
  onClick,
  kind = "secondary",
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  kind?: string
  disabled?: boolean
}) {
  return (
    <button
      className={`ar-button ${kind}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
export function ArtistLink({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button className="ar-link" onClick={onClick}>
      {children}
      <ArtistIcon name="arrow" />
    </button>
  )
}
export function ArtistPanel({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={`ar-panel ${className}`}>
      <div className="ar-section-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
const stages: Record<ArtistStage, readonly [string, string]> = {
  ready: ["آماده شروع", "Ready to start"],
  working: ["در حال اجرا", "In progress"],
  approval: ["منتظر تأیید مشتری", "Awaiting customer approval"],
  revision: ["اصلاحات", "Revisions"],
  delivery: ["آماده تحویل", "Ready for delivery"],
}
export function StageBadge({
  stage,
  locale,
}: {
  stage: ArtistStage
  locale: ArtistLocale
}) {
  return (
    <span className={`ar-badge ${stage}`}>
      <span className="ar-status-dot" />
      {stages[stage][locale === "fa" ? 0 : 1]}
    </span>
  )
}
export function ArtistSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading / در حال دریافت"
      className="ar-skeleton-group"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div className="ar-skeleton" key={i} />
      ))}
    </div>
  )
}
export function ArtistEmpty({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="ar-empty">
      <span className="ar-icon-box">
        <ArtistIcon name="brush" />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
export function ArtistError({
  locale,
  onRetry,
}: {
  locale: ArtistLocale
  onRetry: () => void
}) {
  return (
    <div className="ar-empty" role="status">
      <ArtistIcon name="alert" />
      <p>
        {artistText(
          locale,
          "دریافت این بخش ممکن نشد.",
          "Unable to load this section.",
        )}
      </p>
      <ArtistButton onClick={onRetry}>
        {artistText(locale, "تلاش دوباره", "Try again")}
      </ArtistButton>
    </div>
  )
}
export function ArtistOrderCard({
  order,
  locale,
  onView,
}: {
  order: ArtistOrder
  locale: ArtistLocale
  onView: () => void
}) {
  const i = locale === "fa" ? 0 : 1
  return (
    <article className="ar-order-card">
      <div className={`ar-art-symbol ${order.stage}`} aria-hidden="true">
        <svg viewBox="0 0 80 100">
          <rect
            x="8"
            y="6"
            width="64"
            height="88"
            rx="2"
            fill="var(--surface)"
          />
          <circle cx="43" cy="35" r="14" fill="currentColor" opacity=".2" />
          <path
            d="M16 79q14-47 29-15 10-29 22 15Z"
            fill="currentColor"
            opacity=".45"
          />
          <path
            d="M33 76q2-31 19-46m-12 25-10-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <div className="ar-order-info">
        <div className="ar-order-title">
          <span dir="ltr" className="ar-code">
            {order.id}
          </span>
          <StageBadge stage={order.stage} locale={locale} />
        </div>
        <h3>{order.title[i]}</h3>
        <p>
          {order.technique[i]}
          <span> / </span>
          {order.specs[i]}
        </p>
        <small>{order.event[i]}</small>
        <div className="ar-order-footer">
          <span>
            <ArtistIcon name="clock" />
            {order.due
              ? artistText(locale, "موعد نمونه: ", "Sample due: ") +
                new Date(order.due).toLocaleDateString(
                  locale === "fa" ? "fa-IR" : "en-GB",
                  { day: "numeric", month: "short", timeZone: "Asia/Tehran" },
                )
              : artistText(locale, "موعد تعیین نشده", "No agreed deadline")}
          </span>
          <ArtistLink onClick={onView}>
            {artistText(locale, "مشاهده سفارش", "View order")}
          </ArtistLink>
        </div>
      </div>
    </article>
  )
}
export function AssessmentCard({
  request,
  locale,
  onReview,
}: {
  request: AssessmentRequest
  locale: ArtistLocale
  onReview: () => void
}) {
  const i = locale === "fa" ? 0 : 1
  return (
    <article className="ar-assessment">
      <div className="ar-assessment-top">
        <span className="ar-code" dir="ltr">
          {request.id}
        </span>
        <span className="ar-mini-label">
          {artistText(
            locale,
            "ارزیابی اولیه آماده",
            "Initial assessment ready",
          )}
        </span>
      </div>
      <h3>{request.title[i]}</h3>
      <p>{request.specs[i]}</p>
      <div className="ar-assessment-bottom">
        <small>
          {artistText(locale, "تخصیص نمونه: ", "Sample assignment: ")}
          {new Date(request.assignedAt).toLocaleDateString(
            locale === "fa" ? "fa-IR" : "en-GB",
            { day: "numeric", month: "short", timeZone: "Asia/Tehran" },
          )}
        </small>
        <ArtistLink onClick={onReview}>
          {artistText(locale, "بررسی ارزیابی", "Review assessment")}
        </ArtistLink>
      </div>
    </article>
  )
}
export function ArtistMoneyCard({
  title,
  value,
  definition,
  locale,
}: {
  title: string
  value: number | null
  definition: string
  locale: ArtistLocale
}) {
  return (
    <div className="ar-money-card">
      <span>{title}</span>
      <strong>
        {value === null ? "—" : new Intl.NumberFormat(locale).format(value)}
        <small>{artistText(locale, "تومان", "toman")}</small>
      </strong>
      <p>{definition}</p>
    </div>
  )
}
export function ArtistModal({
  open,
  onClose,
  title,
  children,
  sheet = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  sheet?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null),
    heading = useId()
  useEffect(() => {
    const el = ref.current
    const previous = document.activeElement as HTMLElement | null
    if (open) el?.showModal()
    else el?.close()
    return () => {
      el?.close()
      previous?.focus()
    }
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`ar-modal ${sheet ? "ar-bottom-sheet" : ""}`}
      aria-labelledby={heading}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="ar-section-head">
        <h2 id={heading}>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="بستن / Close"
        >
          <ArtistIcon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function ExecutionTimeline({
  items,
}: {
  items: {
    title: string
    time: string
    current?: boolean
  }[]
}) {
  return (
    <ol className="ar-timeline">
      {items.map((item, i) => (
        <li key={i} aria-current={item.current ? "step" : undefined}>
          <span className={item.current ? "current" : ""} />
          <div>
            <strong>{item.title}</strong>
            <small>{item.time}</small>
          </div>
        </li>
      ))}
    </ol>
  )
}
export function PrivateImageViewer({
  authorized,
  src,
  locale,
}: {
  authorized: boolean
  src?: string
  locale: ArtistLocale
}) {
  const [zoom, setZoom] = useState(false)
  useEffect(() => {
    if (!authorized) setZoom(false)
  }, [authorized])
  return (
    <>
      <div className="ar-private-image">
        {authorized && src ? (
          <button
            onClick={() => setZoom(true)}
            aria-label={artistText(
              locale,
              "بزرگ‌نمایی مرجع مجاز",
              "Enlarge authorized reference",
            )}
          >
            <img
              src={src}
              alt={artistText(
                locale,
                "مرجع مجاز این سفارش",
                "Authorized reference for this order",
              )}
            />
          </button>
        ) : (
          <>
            <ArtistIcon name="orders" />
            <span>{artistText(locale, "مرجع خصوصی", "Private reference")}</span>
            <small>
              {artistText(
                locale,
                "فقط با مجوز سرویس؛ فایل نمونه ارائه نشده",
                "Service authorization required; no sample file",
              )}
            </small>
          </>
        )}
      </div>
      <ArtistModal
        open={zoom && authorized}
        onClose={() => setZoom(false)}
        title={artistText(locale, "مرجع مجاز", "Authorized reference")}
      >
        {authorized && src && (
          <img
            className="ar-zoom-image"
            src={src}
            alt={artistText(locale, "مرجع سفارش", "Order reference")}
          />
        )}
      </ArtistModal>
    </>
  )
}
export function VersionFeedbackCard({ locale }: { locale: ArtistLocale }) {
  return (
    <article className="ar-feedback-card">
      <div className="ar-assessment-top">
        <span className="ar-code" dir="ltr">
          ART-2081 · V2
        </span>
        <span className="ar-badge revision">
          {artistText(locale, "بازخورد جدید", "New feedback")}
        </span>
      </div>
      <h3>
        {artistText(
          locale,
          "تنظیم نور و رنگ پس‌زمینه",
          "Adjust background light and color",
        )}
      </h3>
      <p>
        {artistText(
          locale,
          "نمونه: کمی گرم‌ترشدن نور، بدون تغییر ترکیب‌بندی.",
          "Sample: slightly warmer light, without changing the composition.",
        )}
      </p>
      <small>
        {artistText(
          locale,
          "۱۴ ژوئن ۲۰۲۶ · اصلاح ۱ از ۲ طبق توافق نمونه",
          "14 Jun 2026 · revision 1 of 2 in sample agreement",
        )}
      </small>
      <p className="ar-note">
        {artistText(
          locale,
          "ثبت بازخورد، پذیرش تغییر خارج از توافق نیست. تصمیم این نسخه به نسخه بعد منتقل نمی‌شود.",
          "Feedback does not accept out-of-scope changes. Version decisions are not inherited by a new version.",
        )}
      </p>
    </article>
  )
}
export function SectionedArtistForm({ locale }: { locale: ArtistLocale }) {
  return (
    <fieldset className="ar-form">
      <legend>
        {artistText(
          locale,
          "یادداشت ارزیابی · نمونه کامپوننت",
          "Assessment note · component sample",
        )}
      </legend>
      <label>
        {artistText(
          locale,
          "دلیل تغییر ارزیابی",
          "Reason for assessment change",
        )}
        <textarea
          placeholder={artistText(
            locale,
            "دلیل روشن و مرتبط با اجرای اثر…",
            "A clear reason related to the artwork…",
          )}
        />
      </label>
      <label>
        {artistText(
          locale,
          "برآورد آماده‌سازی (روز کاری)",
          "Preparation estimate (working days)",
        )}
        <input type="number" min="1" placeholder="—" />
      </label>
      <p>
        {artistText(
          locale,
          "این فرم نمونه است؛ ارزیابی یا توافقی ذخیره نمی‌کند.",
          "This sample form does not save an assessment or agreement.",
        )}
      </p>
    </fieldset>
  )
}
export function ArtistUpload({ locale }: { locale: ArtistLocale }) {
  const [status, setStatus] = useState<"idle" | "error" | "progress">("idle")
  return (
    <div className="ar-upload">
      <ArtistIcon name="upload" />
      <strong>
        {artistText(
          locale,
          "آپلود نسخه · الگوی رابط",
          "Version upload · UI pattern",
        )}
      </strong>
      <p>
        {artistText(
          locale,
          "فایل به سرویس ارسال نمی‌شود؛ وضعیت‌های نمونه را بررسی کنید.",
          "No file is sent to a server; preview sample states.",
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <ArtistButton onClick={() => setStatus("progress")}>
          {artistText(locale, "نمایش پیشرفت", "Preview progress")}
        </ArtistButton>
        <ArtistButton onClick={() => setStatus("error")}>
          {artistText(locale, "نمایش خطا", "Preview error")}
        </ArtistButton>
      </div>
      {status === "progress" && (
        <>
          <progress value={48} max={100} aria-label="Sample upload progress" />
          <small>
            {artistText(
              locale,
              "۴۸٪ · شبیه‌سازی، نه ارسال واقعی",
              "48% · simulated, not an actual upload",
            )}
          </small>
        </>
      )}
      {status === "error" && (
        <p role="status" className="ar-error-text">
          {artistText(
            locale,
            "ارسال نمونه ناموفق بود؛ دوباره تلاش کنید.",
            "Sample upload failed; try again.",
          )}
          <button className="ar-link" onClick={() => setStatus("idle")}>
            {artistText(locale, "بازنشانی", "Reset")}
          </button>
        </p>
      )}
    </div>
  )
}
export function ArtistListTable({
  orders,
  locale,
  onView,
}: {
  orders: ArtistOrder[]
  locale: ArtistLocale
  onView: (id: string) => void
}) {
  const [filter, setFilter] = useState("all"),
    [page, setPage] = useState(1)
  const filtered = orders.filter((o) => filter === "all" || o.stage === filter),
    pages = Math.max(1, Math.ceil(filtered.length / 2))
  return (
    <div>
      <div className="ar-list-tools">
        <label>
          {artistText(locale, "مرحله", "Stage")}
          <SelectDropdown
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">
              {artistText(locale, "همه مراحل", "All stages")}
            </option>
            {Object.entries(stages).map(([key, label]) => (
              <option key={key} value={key}>
                {label[locale === "fa" ? 0 : 1]}
              </option>
            ))}
          </SelectDropdown>
        </label>
        <span>
          {new Intl.NumberFormat(locale).format(filtered.length)}{" "}
          {artistText(locale, "سفارش", "orders")}
        </span>
      </div>
      <table className="ar-reusable-table">
        <caption className="sr-only">
          {artistText(
            locale,
            "فهرست سفارش‌های تخصیص‌یافته نمونه",
            "Sample assigned orders",
          )}
        </caption>
        <thead>
          <tr>
            <th scope="col">{artistText(locale, "سفارش", "Order")}</th>
            <th scope="col">{artistText(locale, "مرحله", "Stage")}</th>
            <th scope="col">{artistText(locale, "اقدام", "Action")}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice((page - 1) * 2, page * 2).map((order) => (
            <tr key={order.id}>
              <td>
                <span className="ar-code" dir="ltr">
                  {order.id}
                </span>
                <strong>{order.title[locale === "fa" ? 0 : 1]}</strong>
              </td>
              <td>
                <StageBadge stage={order.stage} locale={locale} />
              </td>
              <td>
                <ArtistLink onClick={() => onView(order.id)}>
                  {artistText(locale, "مشاهده", "View")}
                </ArtistLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ar-sample-table ar-mobile-list">
        {filtered.slice((page - 1) * 2, page * 2).map((order) => (
          <ArtistOrderCard
            key={order.id}
            order={order}
            locale={locale}
            onView={() => onView(order.id)}
          />
        ))}
        {!filtered.length && (
          <ArtistEmpty
            title={artistText(
              locale,
              "موردی در این فیلتر نیست",
              "No matches for this filter",
            )}
          />
        )}
      </div>
      <div className="ar-pagination">
        <ArtistButton
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          {artistText(locale, "قبلی", "Previous")}
        </ArtistButton>
        <span>
          {page} / {pages}
        </span>
        <ArtistButton
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          {artistText(locale, "بعدی", "Next")}
        </ArtistButton>
      </div>
    </div>
  )
}
