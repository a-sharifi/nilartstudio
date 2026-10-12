import { useState, type ReactNode } from "react"
import {
  approvedCarrierUrl,
  type TrackingEvent,
  type TrackingResult as ResultData,
  type TrackingText,
} from "./tracking"

interface BadgeProps {
  text: TrackingText
  language: 0 | 1
  tone?: string
}
function StatusBadge({ text, language, tone = "neutral" }: BadgeProps) {
  return (
    <span className={`tracking-badge ${tone}`}>
      <span aria-hidden="true" />
      {text[language]}
    </span>
  )
}
interface TimelineProps {
  events: TrackingEvent[]
  language: 0 | 1
}
function TrackingTimeline({ events, language }: TimelineProps) {
  return (
    <ol className="tracking-timeline">
      {events.map((event, index) => (
        <li key={event.title[1]} className={event.state}>
          <span className="tracking-event-marker" aria-hidden="true">
            {event.state === "done" ? "✓" : index + 1}
          </span>
          <div>
            <h4>
              {event.title[language]}
              <span className="tracking-event-state">
                {language === 0
                  ? {
                      done: "انجام‌شده",
                      current: "جاری",
                      future: "مرحله آینده",
                    }[event.state]
                  : {
                      done: "Completed",
                      current: "Current",
                      future: "Future step",
                    }[event.state]}
              </span>
            </h4>
            {event.at && event.state !== "future" && (
              <time dateTime={event.at}>
                {new Intl.DateTimeFormat(language === 0 ? "fa-IR" : "en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                }).format(new Date(event.at))}{" "}
                <span className="tracking-timezone">UTC · Demo</span>
              </time>
            )}
            <p>{event.description[language]}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
interface CopyProps {
  value: string
  language: 0 | 1
}
function CopyCode({ value, language }: CopyProps) {
  const [message, setMessage] = useState("")
  return (
    <div className="tracking-copy">
      <bdi dir="ltr">{value}</bdi>
      <button
        type="button"
        className="icon-button"
        aria-label={language === 0 ? "کپی کد" : "Copy code"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setMessage(language === 0 ? "کپی شد" : "Copied")
          } catch {
            setMessage(
              language === 0
                ? "کپی ممکن نشد؛ کد را انتخاب کنید."
                : "Couldn't copy; select the code.",
            )
          }
        }}
      >
        <svg
          width="18"
          height="18"
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
      <span className="tracking-copy-message" role="status">
        {message}
      </span>
    </div>
  )
}
interface ResultProps {
  result: ResultData
  language: 0 | 1
  stale: boolean
  noUpdate: boolean
  onAnother: () => void
  onRefresh: () => void
  refreshing: boolean
  onNavigate: (name: string, route: string) => void
  arrow: ReactNode
}
export default function TrackingResult({
  result,
  language,
  stale,
  noUpdate,
  onAnother,
  onRefresh,
  refreshing,
  onNavigate,
  arrow,
}: ResultProps) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const date = (value: string) =>
    new Intl.DateTimeFormat(language === 0 ? "fa-IR" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value))
  const link = (
    fa: string,
    en: string,
    route: string,
    className = "text-link",
  ) => (
    <a
      className={className}
      href={route}
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
  const loginRoute = "/login?returnTo=%2Faccount%2Forders"
  return (
    <div className="tracking-result">
      <div className="tracking-result-bar">
        <div>
          <span className="guide-kicker">
            {t("خلاصه مجاز سفارش", "LIMITED ORDER SUMMARY")}
          </span>
          <CopyCode value={result.orderNumber} language={language} />
        </div>
        <button className="text-link tracking-text-button" onClick={onAnother}>
          {t("پیگیری سفارش دیگر", "Track another order")}
          {arrow}
        </button>
      </div>
      {stale && (
        <div className="tracking-alert warning" role="alert">
          {t(
            "تازه‌سازی انجام نشد؛ اطلاعات زیر ممکن است قدیمی باشند. زمان آخرین به‌روزرسانی را بررسی کنید.",
            "Refresh failed; the information below may be outdated. Check the last update time.",
          )}
          <button
            className="text-link tracking-text-button"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {t("تلاش دوباره", "Try again")}
          </button>
        </div>
      )}
      {noUpdate && (
        <div className="tracking-alert neutral" role="status">
          {t(
            "هنوز به‌روزرسانی جدیدی ثبت نشده است.",
            "No new update has been recorded yet.",
          )}
        </div>
      )}
      <div className="tracking-result-layout">
        <div className="tracking-result-main">
          <section
            className={`tracking-current-status ${result.tone}`}
            aria-labelledby="tracking-current-title"
          >
            <span className="tracking-status-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="30"
                height="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
              >
                <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7 5l9 4" />
              </svg>
            </span>
            <div>
              <span className="guide-kicker">
                {t("آخرین وضعیت سفارش", "LATEST ORDER STATUS")}
              </span>
              <h2 id="tracking-current-title">{result.status[language]}</h2>
              <p>{result.description[language]}</p>
              <div className="tracking-last-update">
                <span>
                  {t("آخرین به‌روزرسانی", "Last updated")} ·{" "}
                  {date(result.updatedAt)} · UTC · Demo
                </span>
                <button
                  className="tracking-text-button"
                  onClick={onRefresh}
                  disabled={refreshing}
                >
                  {refreshing
                    ? t("در حال بررسی…", "Checking…")
                    : t("تازه‌سازی", "Refresh")}
                </button>
              </div>
            </div>
          </section>
          {result.warning && (
            <div className="tracking-alert warning" role="alert">
              {result.warning[language]}
              {link(
                "پشتیبانی این سفارش",
                "Get help with this order",
                "/contact",
              )}
            </div>
          )}
          <div className="tracking-section-heading">
            <h2>{t("بخش‌ها و مرسوله‌های سفارش", "Order parts & parcels")}</h2>
            <span>
              {t("هر بخش، وضعیت خودش را دارد", "Each part has its own status")}
            </span>
          </div>
          {result.parcels.map((parcel) => {
            const carrierUrl = approvedCarrierUrl(parcel.carrierUrl)
            return (
              <section
                className="tracking-panel tracking-parcel"
                key={parcel.id}
              >
                <div className="tracking-panel-heading">
                  <h3>{parcel.name[language]}</h3>
                  <StatusBadge
                    text={parcel.state}
                    language={language}
                    tone={result.tone}
                  />
                </div>
                <div className="tracking-items">
                  {result.items
                    .filter((item) => parcel.itemIds.includes(item.id))
                    .map((item) => (
                      <div className="tracking-item" key={item.id}>
                        <div className="tracking-item-icon" aria-hidden="true">
                          <svg
                            width="30"
                            height="36"
                            viewBox="0 0 30 36"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.2"
                          >
                            <rect x="4" y="2" width="22" height="31" rx="2" />
                            <path d="M8 2v31m4-23h9m-9 5h9m-9 5h6" />
                          </svg>
                        </div>
                        <div>
                          <h4>{item.name[language]}</h4>
                          <p>{item.options[language]}</p>
                          <span>
                            {item.kind === "bundle"
                              ? t("تعداد پکیج", "Bundle quantity")
                              : t("تعداد دفتر", "Notebook quantity")}
                            :{" "}
                            {new Intl.NumberFormat(
                              language === 0 ? "fa" : "en",
                            ).format(item.quantity)}
                          </span>
                        </div>
                        <StatusBadge text={item.status} language={language} />
                      </div>
                    ))}
                </div>
                <div className="tracking-carrier">
                  {parcel.carrier && (
                    <span>
                      {t("شرکت حمل", "Carrier")}: {parcel.carrier[language]}
                    </span>
                  )}
                  {parcel.code ? (
                    <>
                      <span className="tracking-field-caption">
                        {t("کد رهگیری", "Tracking code")}
                      </span>
                      <CopyCode value={parcel.code} language={language} />
                      {carrierUrl ? (
                        <a
                          href={carrierUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button primary"
                        >
                          {t("رهگیری در سایت شرکت حمل", "Track with carrier")}
                          {arrow}
                        </a>
                      ) : (
                        <>
                          <button className="button secondary" disabled>
                            {t("رهگیری در سایت شرکت حمل", "Track with carrier")}
                          </button>
                          <p className="tracking-field-caption">
                            {t(
                              "Demo · نشانی تأییدشده شرکت حمل ارائه نشده؛ لینک خارجی فعال نیست.",
                              "Demo · No approved carrier URL supplied; external tracking is unavailable.",
                            )}
                          </p>
                        </>
                      )}
                    </>
                  ) : (
                    <p>
                      {t(
                        "کد رهگیری پس از تحویل مرسوله به شرکت حمل نمایش داده می‌شود.",
                        "Tracking will appear after the parcel is handed to the carrier.",
                      )}
                    </p>
                  )}
                </div>
                <h3 className="tracking-timeline-heading">
                  {t("مسیر این مرسوله", "This parcel's journey")}
                </h3>
                <TrackingTimeline events={parcel.events} language={language} />
              </section>
            )
          })}
          {result.commissionEvents && (
            <section className="tracking-panel">
              <div className="tracking-panel-heading">
                <h3>
                  {t(
                    "بخش مستقل · نقاشی اختصاصی",
                    "Separate part · Commissioned artwork",
                  )}
                </h3>
                <StatusBadge
                  text={["در حال اجرا", "In progress"]}
                  language={language}
                />
              </div>
              <div className="tracking-commission-note">
                <span className="tracking-item-icon" aria-hidden="true">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  >
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                    <path d="m7 16 4-5 3 3 3-2m-8-5h1" />
                  </svg>
                </span>
                <div>
                  <h4>
                    {t(
                      "نقاشی اختصاصی — نمونه",
                      "Commissioned artwork — sample",
                    )}
                  </h4>
                  <p>
                    {t(
                      "تعداد اثر: ۱ · تصویر و فایل خصوصی در این صفحه نمایش داده نمی‌شوند.",
                      "Artwork quantity: 1 · Private images and files are not shown here.",
                    )}
                  </p>
                </div>
              </div>
              <TrackingTimeline
                events={result.commissionEvents}
                language={language}
              />
              {link(
                "ورود برای مشاهده و تأیید نسخه اولیه",
                "Sign in to view and approve the first version",
                loginRoute,
                "button primary",
              )}
            </section>
          )}
          {!result.parcels.length && (
            <section className="tracking-panel">
              <h3>{t("اقلام سفارش", "Order items")}</h3>
              {result.items.map((item) => (
                <div className="tracking-item" key={item.id}>
                  <div>
                    <h4>{item.name[language]}</h4>
                    <p>{item.options[language]}</p>
                    <span>
                      {t("تعداد واحد خریداری‌شده", "Purchase quantity")}:{" "}
                      {item.quantity}
                    </span>
                  </div>
                  <StatusBadge text={item.status} language={language} />
                </div>
              ))}
              <div className="tracking-alert neutral">
                {t(
                  "هنوز اطلاعات ارسال برای این وضعیت ثبت نشده است.",
                  "No shipping information has been recorded for this status.",
                )}
              </div>
            </section>
          )}
          {result.refund && (
            <section className="tracking-panel">
              <h3>
                {t("لغو، مرجوعی و بازپرداخت", "Cancellation, returns & refund")}
              </h3>
              <dl className="tracking-summary-list">
                <div>
                  <dt>{t("وضعیت سفارش", "Order status")}</dt>
                  <dd>{result.status[language]}</dd>
                </div>
                {result.returnStatus && (
                  <div>
                    <dt>{t("درخواست مرجوعی", "Return request")}</dt>
                    <dd>{result.returnStatus[language]}</dd>
                  </div>
                )}
                {result.returnReceipt && (
                  <div>
                    <dt>{t("دریافت کالا", "Goods receipt")}</dt>
                    <dd>{result.returnReceipt[language]}</dd>
                  </div>
                )}
                <div>
                  <dt>{t("بازپرداخت", "Refund")}</dt>
                  <dd>{result.refund[language]}</dd>
                </div>
              </dl>
              {link(
                "قوانین لغو و مرجوعی",
                "Cancellation and returns policy",
                "/returns-policy",
              )}
            </section>
          )}
        </div>
        <aside className="tracking-result-aside">
          <section className="tracking-panel">
            <span className="guide-kicker">
              {t("یک نگاه به سفارش", "AT A GLANCE")}
            </span>
            <h3>{t("خلاصه سفارش", "Order summary")}</h3>
            <dl className="tracking-summary-list">
              <div>
                <dt>{t("ثبت سفارش", "Placed")}</dt>
                <dd>{date(result.createdAt)} · UTC · Demo</dd>
              </div>
              <div>
                <dt>{t("وضعیت پرداخت", "Payment status")}</dt>
                <dd>
                  <StatusBadge
                    text={result.payment}
                    language={language}
                    tone={
                      result.payment[1] === "Payment confirmed"
                        ? "success"
                        : "warning"
                    }
                  />
                </dd>
              </div>
              <div>
                <dt>{t("وضعیت کلی", "Overall status")}</dt>
                <dd>{result.status[language]}</dd>
              </div>
            </dl>
            <p className="tracking-privacy-note">
              {t(
                "پرداخت موفق به معنی ارسال یا تحویل سفارش نیست.",
                "Successful payment doesn't mean your order has shipped or been delivered.",
              )}
            </p>
            {link(
              "مشاهده جزئیات در حساب کاربری",
              "View details in your account",
              loginRoute,
              "button secondary",
            )}
          </section>
          <section className="tracking-support">
            <span className="guide-kicker">
              {t("نیاز به کمک داری؟", "NEED A HAND?")}
            </span>
            <h3>{t("کنار سفارشت هستیم", "We're here for your order")}</h3>
            <p>
              {t(
                "اگر درباره این سفارش سؤالی داری، از مسیر پشتیبانی با ما در ارتباط باش.",
                "If you have a question about this order, get in touch through support.",
              )}
            </p>
            {link(
              "پشتیبانی این سفارش",
              "Get help with this order",
              "/contact",
              "button primary",
            )}
            {link(
              "قوانین لغو و مرجوعی",
              "Cancellation and returns policy",
              "/returns-policy",
            )}
          </section>
          <p className="tracking-aside-note">
            {t(
              "نمای عمومی محدود است. نام، تلفن، آدرس کامل و فایل‌های خصوصی فقط از مسیر احرازشده در دسترس‌اند.",
              "This public view is limited. Names, full phone numbers, addresses and private files belong in authenticated views.",
            )}
          </p>
        </aside>
      </div>
    </div>
  )
}
