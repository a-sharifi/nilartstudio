import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  faqHighlightRanges,
  faqItems,
  faqTopics,
  searchFAQ,
  type FAQItem,
} from "./faq"

interface HighlightProps {
  text: string
  query: string
}
function Highlight({ text, query }: HighlightProps) {
  const ranges = faqHighlightRanges(text, query)
  const parts: ReactNode[] = []
  let cursor = 0
  ranges.forEach((range) => {
    parts.push(
      text.slice(cursor, range.start),
      <mark key={range.start}>{text.slice(range.start, range.end)}</mark>,
    )
    cursor = range.end
  })
  parts.push(text.slice(cursor))
  return <>{parts}</>
}

function FAQAccordion({
  item,
  language,
  query,
  open,
  onToggle,
  onLink,
  arrow,
}: {
  item: FAQItem
  language: 0 | 1
  query: string
  open: boolean
  onToggle: () => void
  onLink: (name: string, route: string) => void
  arrow: ReactNode
}) {
  const topic = faqTopics.find((topic) => topic.id === item.topic)!
  return (
    <article id={item.id} className={`faq-item ${open ? "is-open" : ""}`}>
      <h3>
        <button
          id={`${item.id}-trigger`}
          type="button"
          aria-expanded={open}
          aria-controls={`${item.id}-answer`}
          onClick={onToggle}
        >
          <span>
            <span className="faq-topic-label">{topic.label[language]}</span>
            <span className="faq-question">
              <Highlight text={item.question[language]} query={query} />
            </span>
          </span>
          <span className="faq-toggle" aria-hidden="true">
            {open ? "−" : "+"}
          </span>
        </button>
      </h3>
      <div
        id={`${item.id}-answer`}
        aria-labelledby={`${item.id}-trigger`}
        hidden={!open}
        className="faq-answer"
      >
        <p>
          <Highlight text={item.answer[language]} query={query} />
        </p>
        <div className="faq-answer-links">
          {item.link && (
            <a
              className="text-link"
              href={item.link.route}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return
                event.preventDefault()
                onLink(item.link!.label[language], item.link!.route)
              }}
            >
              {item.link.label[language]}
              {arrow}
            </a>
          )}
          <a
            className="faq-permalink"
            href={`#${item.id}`}
            aria-label={
              language === 0
                ? "لینک مستقیم این سؤال"
                : "Direct link to this question"
            }
            onClick={() => {
              window.history.replaceState(
                { ...window.history.state, scroll: window.scrollY },
                "",
              )
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                d="m10 13 4-4m-5 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 10a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-2 2"
                transform="translate(1 0) scale(.9)"
              />
            </svg>
            {language === 0 ? "لینک سؤال" : "Question link"}
          </a>
        </div>
      </div>
    </article>
  )
}

export default function FAQPage({
  language,
  mode,
  onMode,
  onNavigate,
  onPersian,
  arrow,
  searchIcon,
}: {
  language: 0 | 1
  mode: string
  onMode: (mode: string) => void
  onNavigate: (name: string, route: string) => void
  onPersian: () => void
  arrow: ReactNode
  searchIcon: ReactNode
}) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const [topic, setTopic] = useState("all")
  const [input, setInput] = useState("")
  const [query, setQuery] = useState("")
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const [missing, setMissing] = useState(false)
  const [pendingAnchor, setPendingAnchor] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const debounce = setTimeout(() => setQuery(input), 280)
    return () => clearTimeout(debounce)
  }, [input])
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  useEffect(() => {
    if (mode !== "normal" && mode !== "removed") return
    const restore = () => {
      let id = ""
      try {
        id = decodeURIComponent(window.location.hash.slice(1))
      } catch {
        /* Invalid anchor is unavailable. */
      }
      if (!id) {
        setMissing(mode === "removed")
        return
      }
      const item = faqItems.find((item) => item.id === id && item.published)
      setMissing(!item)
      if (item) {
        setTopic("all")
        setInput("")
        setQuery("")
        setOpenIds((previous) => new Set([...previous, id]))
        setPendingAnchor(id)
      }
    }
    restore()
    window.addEventListener("hashchange", restore)
    return () => window.removeEventListener("hashchange", restore)
  }, [mode])
  useEffect(() => {
    if (!pendingAnchor) return
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(pendingAnchor)
        ?.scrollIntoView({ behavior: "instant", block: "start" })
      setPendingAnchor("")
    })
    return () => cancelAnimationFrame(frame)
  }, [pendingAnchor, query, topic])
  const results =
    mode === "topic-empty" ? [] : searchFAQ(faqItems, topic, query, language)
  const selectedTopic = faqTopics.find((item) => item.id === topic)!
  const count = new Intl.NumberFormat(language === 0 ? "fa" : "en").format(
    results.length,
  )
  const selectTopic = (id: string) => {
    setTopic(id)
    setOpenIds(new Set())
    if (mode === "topic-empty") onMode("normal")
  }
  const clear = () => {
    setInput("")
    setQuery("")
    setOpenIds(new Set())
    searchRef.current?.focus()
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
  const retry = () => {
    onMode("loading")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onMode("normal"), 650)
  }
  const navigation = (
    <nav
      className="faq-topics"
      aria-label={t("موضوعات سؤال‌ها", "Question topics")}
    >
      {faqTopics.map((item) => {
        const topicCount = faqItems.filter(
          (question) =>
            question.published &&
            (item.id === "all" || question.topic === item.id),
        ).length
        return (
          <button
            type="button"
            key={item.id}
            aria-pressed={item.id === topic}
            onClick={() => selectTopic(item.id)}
          >
            <span>{item.label[language]}</span>
            <span className="faq-topic-count">
              {new Intl.NumberFormat(language === 0 ? "fa" : "en").format(
                topicCount,
              )}
            </span>
          </button>
        )
      })}
    </nav>
  )
  return (
    <div className="container faq-page">
      <nav className="breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        {link("خانه", "Home", "/", "")}
        <span>/</span>
        <span aria-current="page">{t("سؤالات متداول", "FAQ")}</span>
      </nav>
      <header className="faq-intro">
        <div>
          <span className="guide-kicker">
            <span className="tiny-line" />
            {t(
              "پاسخ‌های کوتاه، انتخاب‌های روشن",
              "A LITTLE CLARITY GOES A LONG WAY",
            )}
          </span>
          <h1>
            {t(
              "پاسخ سؤال‌هایت را اینجا پیدا کن",
              "Find answers to your questions",
            )}
          </h1>
          <p>
            {t(
              "درباره انتخاب محصول، خرید، پرداخت، ارسال و سفارش نقاشی بخوان.",
              "Find answers about products, shopping, payments, delivery and commissioned artworks.",
            )}
          </p>
        </div>
        <div className="faq-intro-note" aria-hidden="true">
          <svg
            viewBox="0 0 90 90"
            width="72"
            height="72"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          >
            <path d="M18 22h54v39H45L31 73V61H18Z" />
            <path d="M38 35c0-10 17-10 17 0 0 7-10 7-10 14m0 4v3" />
            <path d="m12 10 5 5m57-5-5 5m11 30h6" />
          </svg>
          <span className="handwritten">a little help, a lot of heart.</span>
        </div>
      </header>
      <div className="faq-layout">
        <aside className="faq-sidebar">
          <span className="guide-kicker">
            {t("موضوع سؤال تو", "WHAT'S ON YOUR MIND?")}
          </span>
          {mode === "loading" ? (
            <div aria-hidden="true" className="faq-nav-skeleton">
              {[1, 2, 3, 4, 5].map((i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          ) : (
            navigation
          )}
          <p className="faq-demo-note">
            {t(
              "محتوای نمونه طراحی · تعدادها از همین سؤال‌ها محاسبه می‌شوند.",
              "Design sample content · counts reflect these questions.",
            )}
          </p>
          <div className="guide-sidebar-help">
            <span>
              {t("برای شروع، یک راهنما", "A little guidance to begin")}
            </span>
            <p>
              {t(
                "از انتخاب دفتر تا آخرین قدم خرید.",
                "From choosing a notebook to checking out.",
              )}
            </p>
            {link("راهنمای خرید", "Buying guide", "/guides/buying")}
          </div>
        </aside>
        <div className="faq-main">
          <form
            className="faq-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              setQuery(input)
            }}
          >
            <label htmlFor="faq-search-input">
              {t("جست‌وجو در سؤال‌ها", "Search questions")}
            </label>
            <div className="faq-search-field">
              {searchIcon}
              <input
                ref={searchRef}
                id="faq-search-input"
                type="search"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value)
                  setOpenIds(new Set())
                }}
                placeholder={t(
                  "مثلاً: تعداد برگ، کد تخفیف یا پیگیری سفارش",
                  "For example: sheet count, discount code or order tracking",
                )}
                autoComplete="off"
                aria-describedby="faq-search-scope"
              />
              {input && (
                <button
                  type="button"
                  className="icon-button"
                  onClick={clear}
                  aria-label={t("پاک‌کردن جست‌وجو", "Clear search")}
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </div>
            <div className="faq-search-meta">
              <span id="faq-search-scope">
                {topic === "all"
                  ? t("جست‌وجو در همه موضوعات", "Searching all topics")
                  : t(
                      `جست‌وجو در «${selectedTopic.label[0]}»`,
                      `Searching in “${selectedTopic.label[1]}”`,
                    )}
              </span>
              {topic !== "all" && (
                <button
                  className="faq-inline-button"
                  type="button"
                  onClick={() => selectTopic("all")}
                >
                  {t("جست‌وجو در همه موضوعات", "Search all topics")}
                </button>
              )}
            </div>
          </form>
          <div className="faq-mobile-topics">
            {mode === "loading" ? (
              <div className="faq-mobile-skeleton" aria-hidden="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton" />
                ))}
              </div>
            ) : (
              navigation
            )}
            <p className="faq-demo-note">
              {t(
                "محتوای نمونه طراحی · تعدادها از همین سؤال‌ها محاسبه می‌شوند.",
                "Design sample content · counts reflect these questions.",
              )}
            </p>
          </div>
          {mode === "loading" ? (
            <div aria-busy="true" className="faq-loading">
              <span className="sr-only">
                {t("در حال بارگذاری سؤال‌ها", "Loading questions")}
              </span>
              {[1, 2, 3, 4, 5].map((i) => (
                <div className="skeleton faq-row-skeleton" key={i} />
              ))}
            </div>
          ) : ["error", "empty", "translation"].includes(mode) ? (
            <div
              className="faq-empty"
              role={mode === "error" ? "alert" : undefined}
            >
              <span className="faq-empty-symbol" aria-hidden="true">
                ?
              </span>
              <h2>
                {mode === "error"
                  ? t(
                      "سؤال‌ها بارگذاری نشدند.",
                      "We couldn't load the questions.",
                    )
                  : mode === "translation"
                    ? t(
                        "سؤالات متداول هنوز به زبان انتخاب‌شده منتشر نشده‌اند.",
                        "The FAQ hasn't been published in the selected language yet.",
                      )
                    : t(
                        "سؤالات متداول فعلاً در دسترس نیستند.",
                        "The FAQ isn't available yet.",
                      )}
              </h2>
              <div className="guide-actions">
                {mode === "error" ? (
                  <button className="button primary" onClick={retry}>
                    {t("دوباره تلاش کنید", "Try again")}
                  </button>
                ) : mode === "translation" ? (
                  <button
                    className="button primary"
                    onClick={() => {
                      onPersian()
                      onMode("normal")
                    }}
                  >
                    {t("مشاهده نسخه فارسی", "View Persian version")}
                  </button>
                ) : (
                  link(
                    "راهنمای خرید",
                    "Buying guide",
                    "/guides/buying",
                    "button primary",
                  )
                )}
                {link("تماس", "Contact", "/contact", "button secondary")}
              </div>
            </div>
          ) : (
            <>
              {(missing || mode === "removed") && (
                <p className="guide-note" role="status">
                  {t(
                    "این سؤال دیگر در دسترس نیست. سؤال‌های دیگر را در ادامه ببین.",
                    "This question is no longer available. Browse the other questions below.",
                  )}
                </p>
              )}
              <div className="faq-results-heading">
                <h2>
                  {query.trim()
                    ? t("نتایج جست‌وجو", "Search results")
                    : selectedTopic.label[language]}
                </h2>
                <span>
                  {count} {t("سؤال", "questions")}
                </span>
              </div>
              <p
                className="sr-only"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {count} {t("سؤال در", "questions in")}{" "}
                {selectedTopic.label[language]}
                {query.trim() ? t(` برای «${query}»`, ` for “${query}”`) : ""}
              </p>
              {results.length ? (
                <div className="faq-accordions">
                  {results.map((item) => (
                    <FAQAccordion
                      key={item.id}
                      item={item}
                      language={language}
                      query={query}
                      open={openIds.has(item.id)}
                      onToggle={() =>
                        setOpenIds((previous) => {
                          const next = new Set(previous)
                          if (next.has(item.id)) next.delete(item.id)
                          else next.add(item.id)
                          return next
                        })
                      }
                      onLink={onNavigate}
                      arrow={arrow}
                    />
                  ))}
                </div>
              ) : (
                <div className="faq-empty">
                  <span className="faq-empty-symbol" aria-hidden="true">
                    {searchIcon}
                  </span>
                  <h2>
                    {mode === "topic-empty" || !query.trim()
                      ? t(
                          "هنوز سؤالی در این موضوع منتشر نشده است.",
                          "No questions have been published in this topic yet.",
                        )
                      : t(
                          "پاسخی با این عبارت پیدا نشد.",
                          "No answers match this search.",
                        )}
                  </h2>
                  {query.trim() && mode !== "topic-empty" && (
                    <p>
                      {t(
                        "عبارت دیگری امتحان کن یا در همه موضوعات جست‌وجو کن.",
                        "Try another phrase or search all topics.",
                      )}
                    </p>
                  )}
                  <div className="guide-actions">
                    {query.trim() && (
                      <button className="button secondary" onClick={clear}>
                        {t("پاک‌کردن جست‌وجو", "Clear search")}
                      </button>
                    )}
                    <button
                      className="button primary"
                      onClick={() => selectTopic("all")}
                    >
                      {t("مشاهده همه موضوعات", "All topics")}
                    </button>
                    {link("تماس", "Contact", "/contact")}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="faq-help">
            <div className="faq-help-icon" aria-hidden="true">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
              >
                <path d="M4 4h16v12h-7l-5 4v-4H4Z" />
                <path d="M8 8h8m-8 4h5" />
              </svg>
            </div>
            <span className="guide-kicker">
              {t("کنارت هستیم", "WE'RE HERE FOR YOU")}
            </span>
            <h2>{t("پاسخت را پیدا نکردی؟", "Couldn't find your answer?")}</h2>
            <p>
              {t(
                "برای سؤال درباره خرید با ما در تماس باش. برای وضعیت یک سفارش، ابتدا صفحه پیگیری را ببین.",
                "Contact us for shopping questions. For an existing order, check the tracking page first.",
              )}
            </p>
            <div className="guide-actions">
              {link(
                "تماس با نیل‌آرت",
                "Contact NilArt",
                "/contact",
                "button primary",
              )}
              {link(
                "پیگیری سفارش",
                "Track order",
                "/track-order",
                "button secondary",
              )}
            </div>
            {link("راهنمای خرید", "Buying guide", "/guides/buying")}
          </div>
        </div>
      </div>
    </div>
  )
}
