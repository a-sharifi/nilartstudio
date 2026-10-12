import { useEffect, useRef, useState, type ReactNode } from "react"
import { faqHighlightRanges } from "./faq"
import {
  isTermsRoute,
  publishedTermsAvailable,
  searchTerms,
  termsDemoDocument,
  termsSummary,
  validTermsMetadata,
  type TermsDocument,
} from "./terms"

interface TermsHighlightProps {
  text: string
  query: string
}
function TermsHighlight({ text, query }: TermsHighlightProps) {
  const ranges = faqHighlightRanges(text, query)
  let cursor = 0
  const result: ReactNode[] = []
  ranges.forEach((range) => {
    result.push(
      text.slice(cursor, range.start),
      <mark key={range.start}>{text.slice(range.start, range.end)}</mark>,
    )
    cursor = range.end
  })
  result.push(text.slice(cursor))
  return <>{result}</>
}
interface TermsProps {
  language: 0 | 1
  signedIn: boolean
  mode: string
  onMode: (mode: string) => void
  onNavigate: (name: string, route: string) => void
  arrow: ReactNode
  document?: TermsDocument
}
export default function TermsPage({
  language,
  signedIn,
  mode,
  onMode,
  onNavigate,
  arrow,
  document: terms = termsDemoDocument,
}: TermsProps) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const [input, setInput] = useState("")
  const [query, setQuery] = useState("")
  const [active, setActive] = useState("scope")
  const [missingAnchor, setMissingAnchor] = useState(false)
  const mobileTopics = useRef<HTMLDetailsElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const translationMissing =
    mode === "translation" ||
    !terms.languages.includes(language === 0 ? "fa" : "en") ||
    !terms.title[language] ||
    !terms.introduction[language] ||
    terms.sections.some(
      (section) =>
        !section.title[language] ||
        section.paragraphs.some((paragraph) => !paragraph[language]) ||
        section.points?.some((point) => !point[language]),
    )
  const available =
    mode === "normal" && publishedTermsAvailable(terms) && !translationMissing
  const matches = searchTerms(terms, query, language)
  const metadata =
    !terms.demo &&
    terms.approved &&
    terms.published &&
    validTermsMetadata(terms)
  const summary = termsSummary(terms)
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input), 280)
    return () => clearTimeout(timer)
  }, [input])
  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
    },
    [],
  )
  useEffect(() => {
    if (!available) return
    const sections = terms.sections
      .map((section) => window.document.getElementById(`terms-${section.id}`))
      .filter(Boolean) as HTMLElement[]
    const update = () => {
      const passed = sections.filter(
        (section) => section.getBoundingClientRect().top <= 180,
      )
      setActive(
        passed[passed.length - 1]?.id.replace("terms-", "") ||
          sections[0]?.id.replace("terms-", "") ||
          "",
      )
    }
    const restore = () => {
      let hash = ""
      try {
        hash = decodeURIComponent(window.location.hash.slice(1))
      } catch {
        hash = "unavailable"
      }
      if (!hash) {
        setMissingAnchor(false)
        return
      }
      const section = sections.find((section) => section.id === hash)
      setMissingAnchor(!section)
      requestAnimationFrame(() => {
        if (section)
          section.scrollIntoView({ behavior: "instant", block: "start" })
        else
          title.current?.scrollIntoView({ behavior: "instant", block: "start" })
      })
    }
    update()
    restore()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("hashchange", restore)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("hashchange", restore)
    }
  }, [available, terms])
  const link = (
    fa: string,
    en: string,
    route: string,
    className = "text-link",
  ) => {
    const target =
      route === "/account/orders" && !signedIn
        ? "/login?returnTo=%2Faccount%2Forders"
        : route
    return (
      <a
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
    if (mobileTopics.current) mobileTopics.current.open = false
    window.history.replaceState(
      { ...window.history.state, scroll: window.scrollY },
      "",
    )
    window.history.pushState({ ...window.history.state }, "", `#terms-${id}`)
    const section = window.document.getElementById(`terms-${id}`)
    section?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    })
    section?.focus({ preventScroll: true })
    setActive(id)
    setMissingAnchor(false)
  }
  const sectionLink = (id: string, name: string, children?: ReactNode) => (
    <a
      href={`#terms-${id}`}
      aria-current={active === id ? "location" : undefined}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return
        event.preventDefault()
        jump(id)
      }}
    >
      {children || name}
    </a>
  )
  const navigation = (
    <nav aria-label={t("بخش‌های قوانین خرید", "Purchase terms sections")}>
      {terms.sections.map((section, index) => (
        <div key={section.id}>
          {sectionLink(
            section.id,
            section.title[language],
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
  const clearSearch = () => {
    setInput("")
    setQuery("")
    searchInput.current?.focus()
  }
  const retry = () => {
    onMode("loading")
    if (retryTimer.current) clearTimeout(retryTimer.current)
    retryTimer.current = setTimeout(() => onMode("normal"), 650)
  }
  const date = (value: string) =>
    new Intl.DateTimeFormat(language === 0 ? "fa-IR" : "en-GB", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(value))
  return (
    <div className="container terms-page">
      <nav className="breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        {link("خانه", "Home", "/", "")}
        <span>/</span>
        <span aria-current="page">{t("قوانین خرید", "Purchase terms")}</span>
      </nav>
      <header className="terms-intro">
        <div>
          <span className="guide-kicker">
            <span className="tiny-line" />
            {t("شفافیت، پیش از هر انتخاب", "CLARITY BEFORE EVERY CHOICE")}
          </span>
          <h1 ref={title} tabIndex={-1}>
            {terms.title[language] ||
              t("قوانین و شرایط خرید", "Purchase terms and conditions")}
          </h1>
          <p>
            {terms.introduction[language] ||
              t(
                "شرایط منتشرشده را در این صفحه بررسی کنید.",
                "Review the published conditions on this page.",
              )}
          </p>
        </div>
        {available && (
          <button
            className="terms-print"
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
            {t("چاپ شرایط", "Print terms")}
          </button>
        )}
      </header>
      {mode === "loading" ? (
        <div className="terms-loading" aria-busy="true">
          <span className="sr-only">
            {t("در حال دریافت شرایط خرید", "Loading purchase terms")}
          </span>
          <div className="skeleton terms-heading-skeleton" />
          <div className="terms-metadata">
            {[1, 2, 3].map((i) => (
              <div className="skeleton terms-meta-skeleton" key={i} />
            ))}
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div className="skeleton terms-text-skeleton" key={i} />
          ))}
        </div>
      ) : !available ? (
        <section
          className="terms-state"
          role={mode === "error" ? "alert" : undefined}
        >
          <span className="terms-state-icon" aria-hidden="true">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              <path d="M6 3h9l4 4v14H6Zm9 0v5h4M9 12h7m-7 4h5" />
            </svg>
          </span>
          <h2>
            {mode === "error"
              ? t(
                  "دریافت شرایط خرید ممکن نشد.",
                  "Unable to load the purchase terms.",
                )
              : translationMissing
                ? t(
                    "این شرایط هنوز به زبان انتخاب‌شده منتشر نشده‌اند.",
                    "These terms haven't been published in the selected language yet.",
                  )
                : t(
                    "شرایط خرید هنوز منتشر نشده است.",
                    "Purchase terms have not been published yet.",
                  )}
          </h2>
          <p>
            {translationMissing
              ? t(
                  "نسخه موجود را با نام زبان روشن ببینید؛ زبان مرجع یا ترجمه حدسی تعیین نمی‌شود.",
                  "Choose the available version by its language; no reference language or guessed translation is assigned.",
                )
              : t(
                  "محتوای ناموجود با قوانین تولیدشده جایگزین نمی‌شود؛ پذیرش نسخه ناموجود نیز ممکن نیست.",
                  "Unavailable content is not replaced with generated terms; a missing version cannot be accepted.",
                )}
          </p>
          <div className="guide-actions">
            {mode === "error" ? (
              <button className="button primary" onClick={retry}>
                {t("تلاش دوباره", "Try again")}
              </button>
            ) : translationMissing && terms.languages[0] ? (
              <button
                className="button primary"
                onClick={() => {
                  onMode("normal")
                  onNavigate(
                    terms.languages[0] === "fa"
                      ? t("نسخه فارسی", "Persian version")
                      : t("نسخه انگلیسی", "English version"),
                    `/${terms.languages[0]}/terms`,
                  )
                }}
              >
                {terms.demo
                  ? terms.languages[0] === "fa"
                    ? t(
                        "مشاهده نمونه فارسی · Demo",
                        "View Persian sample · Demo",
                      )
                    : t(
                        "مشاهده نمونه انگلیسی · Demo",
                        "View English sample · Demo",
                      )
                  : terms.languages[0] === "fa"
                    ? t("مشاهده نسخه فارسی", "View Persian version")
                    : t("مشاهده نسخه انگلیسی", "View English version")}
              </button>
            ) : null}
            {link(
              "تماس با نیل‌آرت",
              "Contact NilArt",
              "/contact",
              "button secondary",
            )}
          </div>
        </section>
      ) : (
        <>
          <dl className="terms-metadata">
            <div>
              <dt>{t("نسخه شرایط", "Terms version")}</dt>
              <dd>
                {metadata ? (
                  <bdi>{terms.version}</bdi>
                ) : (
                  t("نسخه مصوب ارائه نشده", "No approved version supplied")
                )}
              </dd>
            </div>
            <div>
              <dt>{t("تاریخ انتشار", "Published")}</dt>
              <dd>
                {metadata ? (
                  <time dateTime={terms.publishedAt}>
                    {date(terms.publishedAt!)}
                  </time>
                ) : (
                  t("تاریخ واقعی ارائه نشده", "No publication date supplied")
                )}
              </dd>
            </div>
            <div>
              <dt>{t("آخرین به‌روزرسانی", "Last updated")}</dt>
              <dd>
                {metadata ? (
                  <time dateTime={terms.updatedAt}>
                    {date(terms.updatedAt!)}
                  </time>
                ) : (
                  t("پس از انتشار مشخص می‌شود", "Available after publication")
                )}
              </dd>
            </div>
          </dl>
          {terms.demo && (
            <div className="terms-demo-notice">
              <span className="tracking-demo-tag">DEMO / PUB–22</span>
              <p>
                {t(
                  "نیازمند تأیید حقوقی و کسب‌وکار · این متن آموزشی نمونه، شرایط منتشرشده نیل‌آرت نیست. هیچ تاریخ، مهلت یا حق حقوقی فرضی تعیین نشده است.",
                  "Legal and business approval required · This educational sample is not NilArt's published terms. No invented dates, deadlines or legal rights are assigned.",
                )}
              </p>
            </div>
          )}
          {!terms.demo && metadata && terms.sourceState !== "current" && (
            <div className="terms-version-notice" role="status">
              <strong>
                {terms.sourceState === "previous"
                  ? t("نسخه پیشین", "Previous version")
                  : t(
                      "نسخه ذخیره‌شده؛ ممکن است آخرین نسخه نباشد",
                      "Cached version; it may not be the latest",
                    )}
              </strong>
              <p>
                {t(
                  "نسخه و تاریخ همین متن در بالا نمایش داده شده‌اند. نسخه مرتبط با سفارش قبلی جدا بررسی می‌شود.",
                  "This document's version and dates are shown above. An earlier order's applicable version is reviewed separately.",
                )}
              </p>
              {terms.currentVersionRoute &&
                isTermsRoute(terms.currentVersionRoute) &&
                link(
                  "مشاهده نسخه جاری",
                  "View the current version",
                  terms.currentVersionRoute,
                )}
            </div>
          )}
          {missingAnchor && (
            <p className="terms-anchor-notice" role="status">
              {t(
                "بخش قبلی در دسترس نیست؛ متن و فهرست فعلی را از اینجا ببینید.",
                "That earlier section is unavailable; browse the current text and contents here.",
              )}
            </p>
          )}
          <details
            className="guide-mobile-topics terms-mobile-topics"
            ref={mobileTopics}
          >
            <summary>
              {t("در این صفحه", "On this page")}
              <span aria-hidden="true">⌄</span>
            </summary>
            {navigation}
          </details>
          <div className="terms-layout">
            <aside className="guide-sidebar terms-sidebar">
              <span className="guide-kicker">
                {t("در این صفحه", "ON THIS PAGE")}
              </span>
              {navigation}
              <div className="guide-sidebar-help">
                <span>
                  {t("یک پرسش درباره خرید؟", "A question about shopping?")}
                </span>
                <p>
                  {t(
                    "قوانین، راهنما و پشتیبانی مسیرهای مرتبط اما متفاوت‌اند.",
                    "Terms, guidance and support are related but distinct paths.",
                  )}
                </p>
                {link("راهنمای خرید", "Buying guide", "/guides/buying")}
              </div>
            </aside>
            <div className="terms-content">
              <section
                className="terms-summary"
                aria-labelledby="terms-summary-title"
              >
                <div className="terms-summary-heading">
                  <span className="terms-summary-icon" aria-hidden="true">
                    <svg
                      width="25"
                      height="25"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    >
                      <rect x="4" y="3" width="16" height="18" rx="2" />
                      <path d="m7 8 1 1 2-2m2 1h5m-10 5 1 1 2-2m2 1h5m-10 4h10" />
                    </svg>
                  </span>
                  <h2 id="terms-summary-title">
                    {t("مرور سریع", "At a glance")}
                  </h2>
                </div>
                <ul>
                  {summary.map((point) => (
                    <li key={point[1]}>{point[language]}</li>
                  ))}
                </ul>
                <p className="terms-summary-note">
                  {t(
                    "این بخش خلاصه است؛ متن کامل شرایط را در ادامه بخوانید.",
                    "This is a summary. Read the full terms below.",
                  )}
                </p>
              </section>
              <form
                className="terms-search"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault()
                  setQuery(input)
                }}
              >
                <label htmlFor="terms-search">
                  {t("جست‌وجو در متن شرایط", "Search the terms")}
                </label>
                <div className="terms-search-field">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <circle cx="10" cy="10" r="6" />
                    <path d="m15 15 6 6" />
                  </svg>
                  <input
                    id="terms-search"
                    ref={searchInput}
                    type="search"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={t(
                      "مثلاً: پرداخت، پکیج یا فایل دیجیتال",
                      "For example: payment, bundle or digital file",
                    )}
                    autoComplete="off"
                    aria-describedby="terms-search-note"
                  />
                  {input && (
                    <button
                      type="button"
                      className="icon-button"
                      onClick={clearSearch}
                      aria-label={t("پاک‌کردن جست‌وجو", "Clear search")}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                </div>
                <p id="terms-search-note">
                  {t(
                    "جست‌وجو فقط تطابق‌ها را مشخص می‌کند؛ متن کامل همچنان باز و قابل مطالعه است.",
                    "Search highlights matches; the complete text remains open and readable.",
                  )}
                </p>
              </form>
              {query.trim() && (
                <div className="terms-search-results">
                  <div className="terms-search-result-heading">
                    <h3>{t("بخش‌های مرتبط", "Matching sections")}</h3>
                    <span>
                      {new Intl.NumberFormat(
                        language === 0 ? "fa" : "en",
                      ).format(matches.length)}{" "}
                      {t("بخش", "sections")}
                    </span>
                  </div>
                  {matches.length ? (
                    <div>
                      {matches.map((section) => (
                        <span key={section.id}>
                          {sectionLink(section.id, section.title[language])}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p>
                      {t(
                        "تطابقی پیدا نشد. عبارت دیگری امتحان کنید؛ متن کامل در ادامه در دسترس است.",
                        "No matches found. Try another phrase; the full text is available below.",
                      )}
                    </p>
                  )}
                </div>
              )}
              <p
                className="sr-only"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {query.trim()
                  ? t(
                      `${matches.length} بخش مرتبط با جست‌وجو`,
                      `${matches.length} sections match the search`,
                    )
                  : ""}
              </p>
              <div className="terms-full-heading">
                <span className="guide-kicker">
                  {t(
                    "متن کامل، بدون بخش پنهان",
                    "FULL TEXT, NO HIDDEN SECTIONS",
                  )}
                </span>
                {terms.demo && (
                  <span className="terms-sample-label">
                    {t(
                      "متن آموزشی نمونه؛ نیازمند تأیید",
                      "Educational sample; approval required",
                    )}
                  </span>
                )}
              </div>
              {terms.sections.map((section, index) => (
                <section
                  className="terms-section"
                  id={`terms-${section.id}`}
                  key={section.id}
                  tabIndex={-1}
                >
                  <div className="terms-section-heading">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h2>
                      <TermsHighlight
                        text={section.title[language]}
                        query={query}
                      />
                    </h2>
                  </div>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph[1]}>
                      <TermsHighlight
                        text={paragraph[language]}
                        query={query}
                      />
                    </p>
                  ))}
                  {section.points && (
                    <ul>
                      {section.points.map((point) => (
                        <li key={point[1]}>
                          <TermsHighlight
                            text={point[language]}
                            query={query}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.notice && (
                    <div
                      className={`terms-section-note ${
                        section.id === "payment" ? "warning" : ""
                      }`}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v6m0 3v1" />
                      </svg>
                      <p>
                        <TermsHighlight
                          text={section.notice[language]}
                          query={query}
                        />
                      </p>
                    </div>
                  )}
                  {section.links && (
                    <div className="terms-related-links">
                      {section.links.map((related) => (
                        <span key={related.route}>
                          {link(
                            related.label[0],
                            related.label[1],
                            related.route,
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              ))}
              <div className="terms-help">
                <span className="guide-kicker">
                  {t("برای انتخاب روشن‌تر", "A LITTLE MORE CLARITY")}
                </span>
                <h2>{t("هنوز پرسشی دارید؟", "Still have a question?")}</h2>
                <p>
                  {t(
                    "برای توضیح شرایط خرید با نیل‌آرت در ارتباط باشید.",
                    "Get in touch with NilArt for help understanding purchase conditions.",
                  )}
                </p>
                <div className="guide-actions">
                  {link(
                    "تماس با نیل‌آرت",
                    "Contact NilArt",
                    "/contact",
                    "button primary",
                  )}
                  {link("سؤالات متداول", "FAQ", "/faq", "button secondary")}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
