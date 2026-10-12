import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  privacyAccessRows,
  privacyActions,
  privacyDemoDocument,
  privacyDocumentAvailable,
  privacyLanguageAvailable,
  privacySummary,
  validPrivacyMetadata,
  type PrivacyDocument,
} from "./privacy"

interface PrivacyProps {
  language: 0 | 1
  signedIn?: boolean
  mode: string
  onMode: (mode: string) => void
  onNavigate: (name: string, route: string) => void
  arrow: ReactNode
  document?: PrivacyDocument
}
export default function PrivacyPage({
  language,
  signedIn = false,
  mode,
  onMode,
  onNavigate,
  arrow,
  document: policy = privacyDemoDocument,
}: PrivacyProps) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const [active, setActive] = useState("scope")
  const [invalidAnchor, setInvalidAnchor] = useState(false)
  const topics = useRef<HTMLDetailsElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const translationMissing =
    mode === "translation" || !privacyLanguageAvailable(policy, language)
  const available =
    ["normal", "cached"].includes(mode) &&
    privacyDocumentAvailable(policy) &&
    !translationMissing
  const metadata =
    !policy.demo &&
    policy.published &&
    policy.approved &&
    validPrivacyMetadata(policy)
  const summaries = privacySummary(policy)
  const accessRows = privacyAccessRows(policy)
  const actions = privacyActions(policy)
  const availableLanguage = policy.languages.find((code) =>
    privacyLanguageAvailable(policy, code === "fa" ? 0 : 1),
  )
  const cached = mode === "cached" || policy.sourceState === "cached"
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  useEffect(() => {
    if (!available) return
    const sections = policy.sections
      .map((section) => window.document.getElementById(`privacy-${section.id}`))
      .filter(Boolean) as HTMLElement[]
    const update = () => {
      const passed = sections.filter(
        (section) => section.getBoundingClientRect().top <= 180,
      )
      setActive(
        passed[passed.length - 1]?.id.replace("privacy-", "") ||
          policy.sections[0]?.id ||
          "",
      )
    }
    let frame = 0
    const restore = () => {
      let hash = ""
      try {
        hash = decodeURIComponent(window.location.hash.slice(1))
      } catch {
        hash = "unavailable"
      }
      if (!hash) {
        setInvalidAnchor(false)
        return
      }
      const target = sections.find((section) => section.id === hash)
      setInvalidAnchor(!target)
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (target)
          target.scrollIntoView({ behavior: "instant", block: "start" })
        else {
          heading.current?.scrollIntoView({
            behavior: "instant",
            block: "start",
          })
          heading.current?.focus({ preventScroll: true })
        }
      })
    }
    update()
    restore()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("hashchange", restore)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", update)
      window.removeEventListener("hashchange", restore)
    }
  }, [available, policy])
  const link = (
    fa: string,
    en: string,
    route: string,
    className = "text-link",
  ) => {
    const target =
      route.startsWith("/account/") && !signedIn
        ? `/login?returnTo=${encodeURIComponent(route)}`
        : route
    return (
      <a
        key={target}
        href={target}
        className={className}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return
          event.preventDefault()
          onNavigate(t(fa, en), target)
        }}
      >
        {t(fa, en)}
        {className ? arrow : null}
      </a>
    )
  }
  const jump = (id: string) => {
    if (topics.current) topics.current.open = false
    window.history.replaceState(
      { ...window.history.state, scroll: window.scrollY },
      "",
    )
    window.history.pushState({ ...window.history.state }, "", `#privacy-${id}`)
    const target = window.document.getElementById(`privacy-${id}`)
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    })
    target?.focus({ preventScroll: true })
    setActive(id)
    setInvalidAnchor(false)
  }
  const anchor = (id: string, label: ReactNode, className?: string) => (
    <a
      key={id}
      href={`#privacy-${id}`}
      className={className}
      aria-current={active === id ? "location" : undefined}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return
        event.preventDefault()
        jump(id)
      }}
    >
      {label}
    </a>
  )
  const navigation = (
    <nav aria-label={t("فهرست بخش‌های حریم خصوصی", "Privacy policy sections")}>
      {policy.sections.map((section, index) => (
        <div key={section.id}>
          {anchor(
            section.id,
            <>
              <span className="guide-nav-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              {section.title[language]}
            </>,
          )}
        </div>
      ))}
    </nav>
  )
  const retry = () => {
    onMode("loading")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onMode("normal"), 600)
  }
  const date = (value: string) =>
    new Intl.DateTimeFormat(language === 0 ? "fa-IR" : "en-GB", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(value))
  const print = (
    <button
      className="privacy-print text-link"
      type="button"
      onClick={() => window.print()}
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        aria-hidden="true"
      >
        <path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 13h10v8H7Zm10-2h1" />
      </svg>
      {t("نسخه چاپی", "Print policy")}
    </button>
  )
  return (
    <div className="container privacy-page">
      <nav className="breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        {link("خانه", "Home", "/", "")}
        <span>/</span>
        <span aria-current="page">{t("حریم خصوصی", "Privacy")}</span>
      </nav>
      <header className="privacy-intro">
        <div>
          <span className="guide-kicker">
            <span className="tiny-line" />
            {t("شفافیت درباره اطلاعات", "CLARITY ABOUT YOUR INFORMATION")}
          </span>
          {mode === "loading" ? (
            <>
              <h1 className="sr-only">
                {t("بارگذاری سیاست حریم خصوصی", "Loading privacy policy")}
              </h1>
              <div
                className="skeleton privacy-title-skeleton"
                aria-hidden="true"
              />
              <div
                className="skeleton privacy-description-skeleton"
                aria-hidden="true"
              />
            </>
          ) : (
            <>
              <h1 ref={heading} tabIndex={-1}>
                {policy.title[language] || t("حریم خصوصی", "Privacy")}
              </h1>
              <p>
                {translationMissing
                  ? t(
                      "نسخه زبان انتخاب‌شده هنوز منتشر نشده است.",
                      "The selected language version has not been published yet.",
                    )
                  : policy.introduction[language]}
              </p>
            </>
          )}
          <div className="privacy-page-id">
            PUB–23 {policy.demo && <span> / DEMO</span>}
          </div>
        </div>
        {available && print}
      </header>
      {mode === "loading" ? (
        <div className="privacy-metadata-skeleton" aria-busy="true">
          <span className="sr-only">
            {t("بارگذاری نسخه و تاریخ", "Loading version and dates")}
          </span>
          {[1, 2, 3].map((i) => (
            <div className="skeleton" key={i} />
          ))}
        </div>
      ) : metadata ? (
        <dl className="privacy-metadata">
          <div>
            <dt>{t("نسخه سیاست", "Policy version")}</dt>
            <dd>
              <bdi dir="ltr">{policy.version}</bdi>
            </dd>
          </div>
          <div>
            <dt>{t("تاریخ انتشار", "Published")}</dt>
            <dd>
              <time dateTime={policy.publishedAt}>
                {date(policy.publishedAt!)}
              </time>
            </dd>
          </div>
          <div>
            <dt>{t("آخرین به‌روزرسانی", "Last updated")}</dt>
            <dd>
              <time dateTime={policy.updatedAt}>{date(policy.updatedAt!)}</time>
            </dd>
          </div>
        </dl>
      ) : (
        <p className="privacy-metadata-pending">
          {t(
            "نسخه سیاست، تاریخ انتشار و آخرین به‌روزرسانی پس از انتشار نسخه مصوب نمایش داده می‌شوند.",
            "The policy version, publication date and last update are displayed once an approved version is published.",
          )}
        </p>
      )}
      {policy.demo && (
        <div className="privacy-demo-notice">
          <span className="tracking-demo-tag">DEMO</span>
          <p>
            {t(
              "نمونه UI/UX؛ سیاست حقوقی منتشرشده نیست. متن و جزئیات فنی نیازمند تأییدند. هیچ مدت نگهداری، نام سرویس، تضمین امنیت یا حق قانونی فرضی تعیین نشده است.",
              "UI/UX sample, not a published legal policy. Copy and technical details require approval. No invented retention period, service name, security guarantee or legal entitlement is set.",
            )}
          </p>
        </div>
      )}
      {mode === "loading" ? (
        <div className="privacy-loading" aria-busy="true">
          <span className="sr-only">
            {t("دریافت متن سیاست", "Loading policy text")}
          </span>
          <div className="skeleton privacy-summary-skeleton" />
          {[1, 2, 3].map((i) => (
            <div className="skeleton privacy-block-skeleton" key={i} />
          ))}
        </div>
      ) : !available ? (
        <section
          className="privacy-state"
          role={["error", "service-error"].includes(mode) ? "alert" : undefined}
        >
          <h2>
            {mode === "error"
              ? t(
                  "دریافت سیاست حریم خصوصی ممکن نشد.",
                  "Unable to load the privacy policy.",
                )
              : mode === "service-error"
                ? t(
                    "سرویس دریافت سیاست فعلاً پاسخ نمی‌دهد.",
                    "The policy service isn't responding right now.",
                  )
                : translationMissing
                  ? t(
                      "این سیاست هنوز به زبان انتخاب‌شده منتشر نشده است.",
                      "This policy hasn't been published in the selected language yet.",
                    )
                  : t(
                      "سیاست حریم خصوصی هنوز منتشر نشده است.",
                      "The privacy policy has not been published yet.",
                    )}
          </h2>
          <p>
            {t(
              "محتوای تأییدنشده یا ترجمه حدسی جایگزین سیاست نمی‌شود.",
              "Unapproved copy or guessed translations do not replace a policy.",
            )}
          </p>
          <div className="guide-actions">
            {["error", "service-error"].includes(mode) ? (
              <button className="button primary" onClick={retry}>
                {t("تلاش دوباره", "Try again")}
              </button>
            ) : translationMissing && availableLanguage ? (
              <button
                className="button primary"
                onClick={() => {
                  onMode("normal")
                  onNavigate(
                    availableLanguage === "fa"
                      ? t("نسخه فارسی", "Persian version")
                      : t("نسخه انگلیسی", "English version"),
                    `/${availableLanguage}/privacy`,
                  )
                }}
              >
                {availableLanguage === "fa"
                  ? t("مشاهده نسخه فارسی", "View Persian version")
                  : t("مشاهده نسخه انگلیسی", "View English version")}
              </button>
            ) : null}
            {link(
              "تماس درباره حریم خصوصی",
              "Contact about privacy",
              `/${language === 0 ? "fa" : "en"}/contact`,
              "button secondary",
            )}
          </div>
        </section>
      ) : (
        <>
          {(cached || policy.sourceState === "previous") && (
            <div className="privacy-version-notice" role="status">
              <strong>
                {policy.sourceState === "previous"
                  ? t("نسخه پیشین", "Previous version")
                  : t(
                      "محتوای ذخیره‌شده؛ آخرین نسخه تأیید نشده است",
                      "Cached content; the latest version has not been verified",
                    )}
              </strong>
              <p>
                {policy.demo
                  ? t(
                      "Demo · این فقط نمایش حالت محتوای قدیمی است؛ نسخه و تاریخ فرضی نمایش داده نمی‌شوند.",
                      "Demo · This previews an older-content state only; no invented version or dates are shown.",
                    )
                  : t(
                      "نسخه و تاریخ این متن در بالا مشخص‌اند. این محتوا بدون بررسی به‌عنوان آخرین سیاست معرفی نمی‌شود.",
                      "This text's version and dates are shown above. It is not presented as the latest policy without verification.",
                    )}
              </p>
              {policy.currentVersionRoute &&
                /^\/(?!\/)/.test(policy.currentVersionRoute) &&
                link(
                  "مشاهده نسخه جاری",
                  "View current version",
                  policy.currentVersionRoute,
                )}
            </div>
          )}
          {invalidAnchor && (
            <p className="privacy-old-anchor" role="status">
              {t(
                "بخش موردنظر در این نسخه موجود نیست؛ متن کامل را از ابتدای صفحه ببینید.",
                "That section isn't available in this version; read the complete text from the beginning.",
              )}
            </p>
          )}
          <details
            className="guide-mobile-topics privacy-mobile-topics"
            ref={topics}
          >
            <summary>
              {t("در این صفحه", "On this page")}
              <span aria-hidden="true">⌄</span>
            </summary>
            {navigation}
          </details>
          <div className="privacy-layout">
            <aside className="guide-sidebar privacy-sidebar">
              <span className="guide-kicker">
                {t("در این صفحه", "ON THIS PAGE")}
              </span>
              {navigation}
              <div className="guide-sidebar-help">
                <p>
                  {t(
                    "متن کامل را بخوانید؛ مرور سریع جایگزین بندهای سیاست نیست.",
                    "Read the full text; the summary doesn't replace the policy sections.",
                  )}
                </p>
                {link(
                  "پرسش درباره اطلاعات",
                  "Questions about your information",
                  `/${language === 0 ? "fa" : "en"}/contact`,
                )}
              </div>
            </aside>
            <div className="privacy-content">
              <section
                className="privacy-summary"
                aria-labelledby="privacy-summary-title"
              >
                <div className="privacy-summary-heading">
                  <h2 id="privacy-summary-title">
                    {t("مرور سریع", "At a glance")}
                  </h2>
                  <span>
                    {new Intl.NumberFormat(language === 0 ? "fa" : "en").format(
                      summaries.length,
                    )}{" "}
                    {t("موضوع برای شروع", "PLACES TO START")}
                  </span>
                </div>
                <p>
                  {t(
                    "این بخش خلاصه است؛ توضیحات کامل را در ادامه بخوانید.",
                    "This is a summary. Read the full explanation below.",
                  )}
                </p>
                <div className="privacy-summary-grid">
                  {summaries.map((item, index) =>
                    anchor(
                      item.id,
                      <>
                        <span className="privacy-summary-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3>{item.title[language]}</h3>
                        <p>{item.summary[language]}</p>
                        <span className="privacy-summary-link">
                          {t("خواندن توضیحات", "Read more")}
                          {arrow}
                        </span>
                      </>,
                      "privacy-summary-card",
                    ),
                  )}
                </div>
              </section>
              {policy.sections.map((section, index) => (
                <section
                  className={`privacy-section privacy-section-${section.id}`}
                  id={`privacy-${section.id}`}
                  key={section.id}
                  tabIndex={-1}
                >
                  <div className="privacy-section-heading">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h2>{section.title[language]}</h2>
                  </div>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph[1]}>{paragraph[language]}</p>
                  ))}
                  {section.details && (
                    <div
                      className={`privacy-detail-grid ${
                        section.id === "files" ? "privacy-files-grid" : ""
                      }`}
                    >
                      {section.details.map((item) => (
                        <article
                          className="privacy-detail-card"
                          key={item.title[1]}
                        >
                          <span className="privacy-detail-caption">
                            {section.id === "files"
                              ? t("دسته فایل", "FILE CATEGORY")
                              : t("چه اطلاعاتی؟", "WHAT INFORMATION?")}
                          </span>
                          <h3>{item.title[language]}</h3>
                          {section.id !== "files" && (
                            <span className="privacy-detail-purpose">
                              {t("برای چه هدفی؟", "For what purpose?")}
                            </span>
                          )}
                          <p>{item.description[language]}</p>
                        </article>
                      ))}
                    </div>
                  )}
                  {section.notice && (
                    <div
                      className={`privacy-note ${
                        section.id === "ai" ? "technical" : ""
                      }`}
                    >
                      <span className="privacy-note-line" aria-hidden="true" />
                      <p>{section.notice[language]}</p>
                    </div>
                  )}
                  {section.points && (
                    <ul className="privacy-points">
                      {section.points.map((point) => (
                        <li key={point[1]}>{point[language]}</li>
                      ))}
                    </ul>
                  )}
                  {section.id === "ai" && (
                    <div className="privacy-ai-caption">
                      {t(
                        "تصویر خصوصی، Prompt و نسخه سفارش در این صفحه نمایش داده نمی‌شوند.",
                        "Private images, prompts and order versions are not displayed on this page.",
                      )}
                    </div>
                  )}
                  {section.id === "access" && (
                    <>
                      {policy.demo && (
                        <p className="privacy-access-demo">
                          {t(
                            "Demo · دسته‌های زیر فقط برای بررسی سیاست‌اند؛ استفاده واقعی از هر سرویس باید تأیید شود.",
                            "Demo · The categories below are for policy review only; actual use of every service must be confirmed.",
                          )}
                        </p>
                      )}
                      {accessRows.length ? (
                        <div
                          className="privacy-access-table"
                          role="table"
                          aria-label={t(
                            "هدف و اطلاعات هر دسته دسترسی",
                            "Purposes and information for each access category",
                          )}
                        >
                          <div className="privacy-access-header" role="row">
                            <span role="columnheader">
                              {t("دسته دسترسی", "Access category")}
                            </span>
                            <span role="columnheader">
                              {t(
                                "هدف و اطلاعات موردنیاز",
                                "Purpose & required information",
                              )}
                            </span>
                            <span role="columnheader">
                              {t("شرایط و محدودیت", "Conditions & scope")}
                            </span>
                          </div>
                          {accessRows.map((row) => (
                            <div
                              className="privacy-access-row"
                              role="row"
                              key={row.id}
                            >
                              <div role="rowheader">
                                <span className="privacy-mobile-cell-label">
                                  {t("دسته دسترسی", "Access category")}
                                </span>
                                <h3>{row.role[language]}</h3>
                              </div>
                              <div role="cell">
                                <span className="privacy-mobile-cell-label">
                                  {t(
                                    "هدف و اطلاعات موردنیاز",
                                    "Purpose & required information",
                                  )}
                                </span>
                                <p>{row.purpose[language]}</p>
                                <small>{row.information[language]}</small>
                              </div>
                              <div role="cell">
                                <span className="privacy-mobile-cell-label">
                                  {t("شرایط و محدودیت", "Conditions & scope")}
                                </span>
                                <p>{row.condition[language]}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="privacy-unpublished-detail">
                          {t(
                            "اطلاعات تأییدشده‌ای برای این دسته‌ها منتشر نشده است.",
                            "No approved information for these categories has been published.",
                          )}
                        </p>
                      )}
                    </>
                  )}
                  {section.id === "security" &&
                    link(
                      "پیگیری از مسیر رسمی سایت",
                      "Track through the official website",
                      `/${language === 0 ? "fa" : "en"}/track-order`,
                    )}
                  {section.id === "requests" && (
                    <div className="privacy-action-links">
                      {actions.map((action) =>
                        link(
                          action.label[0],
                          action.label[1],
                          action.route,
                          "button secondary",
                        ),
                      )}
                    </div>
                  )}
                  {section.id === "changes" &&
                    policy.changeSummary &&
                    policy.changeSummary.length > 0 &&
                    !policy.demo && (
                      <div className="privacy-change-summary">
                        <h3>
                          {t(
                            "خلاصه تغییرات تأییدشده",
                            "Approved change summary",
                          )}
                        </h3>
                        <ul>
                          {policy.changeSummary.map((change) => (
                            <li key={change[1]}>{change[language]}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {section.id === "contact" && (
                    <div className="privacy-contact-block">
                      <span className="guide-kicker">
                        {t(
                          "مسیر پرسش و بررسی",
                          "A PATH FOR QUESTIONS & REVIEW",
                        )}
                      </span>
                      <h3>
                        {t(
                          "درباره اطلاعات خود پرسشی دارید؟",
                          "Have a question about your information?",
                        )}
                      </h3>
                      <p>
                        {t(
                          "از مسیر تماس شروع کنید؛ اطلاعات خصوصی را در پیام عمومی نفرستید.",
                          "Start with the contact route; don't send private information in public messages.",
                        )}
                      </p>
                      {link(
                        "تماس درباره حریم خصوصی",
                        "Contact about privacy",
                        `/${language === 0 ? "fa" : "en"}/contact`,
                        "button primary",
                      )}
                    </div>
                  )}
                </section>
              ))}
              <div className="privacy-reading-note">
                <p>
                  {t(
                    "مطالعه صفحه، رضایت جدید یا درخواست تغییر اطلاعات ثبت نمی‌کند.",
                    "Reading this page doesn't record new consent or a data-change request.",
                  )}
                </p>
                {print}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
