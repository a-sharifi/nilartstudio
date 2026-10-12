import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  returnsConcepts,
  returnsDemoPolicy,
  returnsDocuments,
  returnsOrdersRoute,
  returnsQuestions,
  returnsRequestSteps,
  returnsSections,
  returnsStages,
  type ReturnsPolicy,
  type ReturnsType,
} from "./returns"

interface ReturnsProps {
  language: 0 | 1
  signedIn: boolean
  mode: string
  onMode: (mode: string) => void
  onPersian: () => void
  onNavigate: (name: string, route: string) => void
  arrow: ReactNode
  policy?: ReturnsPolicy
}
interface ConceptIconProps {
  name: string
}
function ConceptIcon({ name }: ConceptIconProps) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "cancel" ? (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="m8 8 8 8M16 8l-8 8" />
        </>
      ) : name === "return" ? (
        <>
          <path d="M9 6 4 11l5 5M4 11h11a5 5 0 0 1 0 10" />
          <path d="M12 3h8v10" />
        </>
      ) : name === "exchange" ? (
        <>
          <path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 9h18m-14 6h4m4 0h3" />
        </>
      )}
    </svg>
  )
}
export default function ReturnsPage({
  language,
  signedIn,
  mode,
  onMode,
  onPersian,
  onNavigate,
  arrow,
  policy = returnsDemoPolicy,
}: ReturnsProps) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const [type, setType] = useState<ReturnsType>("ready")
  const [orderStage, setOrderStage] = useState(0)
  const [active, setActive] = useState("concepts")
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(
    () => new Set(),
  )
  const [oldAnchor, setOldAnchor] = useState(false)
  const mobileTopics = useRef<HTMLDetailsElement>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const available = mode === "normal" || mode === "empty-section"
  const translationMissing =
    !policy.demo &&
    policy.published &&
    !policy.publishedLanguages.includes(language === 0 ? "fa" : "en")
  const showContent =
    available && (policy.demo || policy.published) && !translationMissing
  const stages = policy.demo ? returnsStages : (policy.stageConditions ?? [])
  const questions = policy.demo
    ? returnsQuestions
    : (policy.relatedQuestions ?? [])
  const availableLanguage = policy.demo ? "fa" : policy.publishedLanguages[0]
  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
    },
    [],
  )
  useEffect(() => {
    if (!showContent) return
    const sections = returnsSections
      .map(([id]) => document.getElementById(`returns-${id}`))
      .filter(Boolean) as HTMLElement[]
    const update = () => {
      const passed = sections.filter(
        (section) => section.getBoundingClientRect().top <= 180,
      )
      setActive(
        passed[passed.length - 1]?.id.replace("returns-", "") || "concepts",
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
        setOldAnchor(false)
        return
      }
      const section = sections.find((section) => section.id === hash)
      setOldAnchor(!section)
      requestAnimationFrame(() => {
        if (section)
          section.scrollIntoView({ behavior: "instant", block: "start" })
        else {
          title.current?.scrollIntoView({ behavior: "instant", block: "start" })
          title.current?.focus({ preventScroll: true })
        }
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
  }, [showContent])
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
  const navigateTopic = (id: string) => {
    if (mobileTopics.current) mobileTopics.current.open = false
    window.history.replaceState(
      { ...window.history.state, scroll: window.scrollY },
      "",
    )
    window.history.pushState({ ...window.history.state }, "", `#returns-${id}`)
    setOldAnchor(false)
    const section = document.getElementById(`returns-${id}`)
    section?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    })
    section?.focus({ preventScroll: true })
    setActive(id)
  }
  const navigation = (
    <nav aria-label={t("بخش‌های این صفحه", "On this page")}>
      {returnsSections.map(([id, fa, en], index) => (
        <a
          key={id}
          href={`#returns-${id}`}
          aria-current={active === id ? "location" : undefined}
          onClick={(event) => {
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return
            event.preventDefault()
            navigateTopic(id)
          }}
        >
          <span className="guide-nav-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          {t(fa, en)}
        </a>
      ))}
    </nav>
  )
  const heading = (
    number: number,
    fa: string,
    en: string,
    kickerFa: string,
    kickerEn: string,
  ) => (
    <div className="guide-section-heading">
      <span className="guide-kicker">
        {String(number).padStart(2, "0")} / {t(kickerFa, kickerEn)}
      </span>
      <h2>{t(fa, en)}</h2>
    </div>
  )
  const demoTag = (
    <span className="returns-sample-label">
      {t("محتوای نمونه؛ نیازمند تأیید", "Sample content; approval required")}
    </span>
  )
  const retry = () => {
    onMode("loading")
    if (retryTimer.current) clearTimeout(retryTimer.current)
    retryTimer.current = setTimeout(() => onMode("normal"), 600)
  }
  const empty = (
    <div className="returns-empty">
      <span className="returns-empty-icon" aria-hidden="true">
        <ConceptIcon name="return" />
      </span>
      <h3>
        {t(
          "شرایط این بخش هنوز منتشر نشده است.",
          "Conditions for this section have not been published yet.",
        )}
      </h3>
      <p>
        {t(
          "برای بررسی سفارش خود با پشتیبانی تماس بگیرید. نبود اطلاعات به معنی رد خودکار درخواست نیست.",
          "Contact support for help with your order. Missing information does not mean automatic rejection.",
        )}
      </p>
      {link(
        "تماس با پشتیبانی",
        "Contact support",
        "/contact",
        "button secondary",
      )}
    </div>
  )
  return (
    <div className="container returns-page">
      <nav className="breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        {link("خانه", "Home", "/", "")}
        <span>/</span>
        <span aria-current="page">
          {t("لغو و مرجوعی", "Cancellation and returns")}
        </span>
      </nav>
      <header className="returns-intro">
        <div>
          <span className="guide-kicker">
            <span className="tiny-line" />
            {t(
              "شفاف، قدم‌به‌قدم، همراه شما",
              "CLEAR GUIDANCE, EVERY STEP OF THE WAY",
            )}
          </span>
          <h1 ref={title} tabIndex={-1}>
            {t("لغو، مرجوعی و بازپرداخت", "Cancellation, returns and refunds")}
          </h1>
          <p>
            {t(
              "شرایط درخواست را بر اساس نوع محصول و مرحله سفارش بررسی کنید.",
              "Review the conditions for your product type and order stage.",
            )}
          </p>
          <div className="returns-policy-meta">
            <span>PUB–24</span>
            {policy.published && policy.updatedAt && (
              <span>
                {t("آخرین به‌روزرسانی", "Last updated")}:{" "}
                <time dateTime={policy.updatedAt}>
                  {new Intl.DateTimeFormat(language === 0 ? "fa-IR" : "en-GB", {
                    dateStyle: "long",
                    timeZone: "UTC",
                  }).format(new Date(policy.updatedAt))}
                </time>
              </span>
            )}
            {policy.published && policy.version && (
              <span>
                {t("نسخه", "Version")}: <bdi>{policy.version}</bdi>
              </span>
            )}
            {!policy.published && (
              <span>
                {t(
                  "آخرین به‌روزرسانی: پس از انتشار سیاست اعلام می‌شود",
                  "Last updated: available when the policy is published",
                )}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="returns-print text-link"
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
          {t("نسخه چاپی", "Print guide")}
        </button>
      </header>
      {policy.demo && (
        <div className="returns-demo-notice">
          <span className="tracking-demo-tag">DEMO</span>
          <p>
            {t(
              "این صفحه نمونه رابط است، نه سیاست حقوقی منتشرشده نیل‌آرت. محتوای نمونه نیازمند تأیید است؛ مهلت، مبلغ و شرایط قطعی فقط از سیاست مصوب دریافت می‌شوند.",
              "This is an interface prototype, not NilArt's published legal policy. Sample content needs approval; deadlines, amounts and definitive conditions must come from approved policy.",
            )}
          </p>
        </div>
      )}
      {mode === "loading" ? (
        <div className="returns-loading" aria-busy="true">
          <span className="sr-only">
            {t("در حال دریافت شرایط", "Loading policy")}
          </span>
          <div className="skeleton returns-title-skeleton" />
          <div className="returns-concepts">
            {[1, 2, 3, 4].map((i) => (
              <div className="skeleton returns-concept-skeleton" key={i} />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div className="skeleton returns-block-skeleton" key={i} />
          ))}
        </div>
      ) : !showContent ? (
        <div
          className="returns-state"
          role={["network", "service"].includes(mode) ? "alert" : undefined}
        >
          <h2>
            {mode === "network"
              ? t("دریافت شرایط ممکن نشد.", "Unable to load the policy.")
              : mode === "service"
                ? t(
                    "سرویس دریافت شرایط فعلاً پاسخ نمی‌دهد.",
                    "The policy service isn't responding right now.",
                  )
                : mode === "translation" || translationMissing
                  ? t(
                      "شرایط هنوز به زبان انتخاب‌شده منتشر نشده‌اند.",
                      "The policy hasn't been published in the selected language yet.",
                    )
                  : t(
                      "شرایط این بخش هنوز منتشر نشده است.",
                      "Conditions for this section have not been published yet.",
                    )}
          </h2>
          <p>
            {mode === "translation" || translationMissing
              ? t(
                  "نسخه موجود را با نام زبان روشن ببینید؛ ترجمه حدسی نمایش داده نمی‌شود.",
                  "Choose the available version by its language; no guessed translation is displayed.",
                )
              : t(
                  "برای بررسی سفارش خود با پشتیبانی تماس بگیرید؛ نبود سیاست به معنی رد درخواست نیست.",
                  "Contact support for help with your order; an unavailable policy does not mean rejection.",
                )}
          </p>
          <div className="guide-actions">
            {["network", "service"].includes(mode) ? (
              <button className="button primary" onClick={retry}>
                {t("تلاش دوباره", "Try again")}
              </button>
            ) : mode === "translation" || translationMissing ? (
              availableLanguage ? (
                <button
                  className="button primary"
                  onClick={() => {
                    if (availableLanguage === "fa") onPersian()
                    else
                      onNavigate(
                        t("نسخه انگلیسی", "English version"),
                        "/en/returns",
                      )
                    onMode("normal")
                  }}
                >
                  {policy.demo
                    ? t(
                        "مشاهده نمونه فارسی · Demo",
                        "View Persian sample · Demo",
                      )
                    : availableLanguage === "fa"
                      ? t("مشاهده نسخه فارسی", "View Persian version")
                      : t("مشاهده نسخه انگلیسی", "View English version")}
                </button>
              ) : null
            ) : (
              link(
                "مشاهده سفارش‌های من",
                "View my orders",
                returnsOrdersRoute(signedIn),
                "button primary",
              )
            )}
            {link(
              "تماس با پشتیبانی",
              "Contact support",
              "/contact",
              "button secondary",
            )}
          </div>
        </div>
      ) : (
        <>
          {oldAnchor && (
            <p className="returns-old-anchor" role="status">
              {t(
                "بخش قبلی دیگر در دسترس نیست؛ راهنمای فعلی را از اینجا ببینید.",
                "That previous section is no longer available; browse the current guide here.",
              )}
            </p>
          )}
          <details
            className="guide-mobile-topics returns-mobile-topics"
            ref={mobileTopics}
          >
            <summary>
              {t("در این صفحه", "On this page")}
              <span aria-hidden="true">⌄</span>
            </summary>
            {navigation}
          </details>
          <div className="returns-layout">
            <aside className="guide-sidebar returns-sidebar">
              <span className="guide-kicker">
                {t("در این صفحه", "ON THIS PAGE")}
              </span>
              {navigation}
              <div className="guide-sidebar-help">
                <span>{t("برای سفارش قبلی", "For an earlier order")}</span>
                <p>
                  {t(
                    "نسخه سیاست و توافق همان خرید ملاک بررسی است؛ متن جاری قرارداد تاریخی را تغییر نمی‌دهد.",
                    "Review the policy version and agreement for that purchase; current text doesn't change a historical contract.",
                  )}
                </p>
                {link("تماس با پشتیبانی", "Contact support", "/contact")}
              </div>
            </aside>
            <div className="returns-content">
              <section
                id="returns-concepts"
                className="guide-section"
                tabIndex={-1}
              >
                {heading(
                  1,
                  "چهار مفهوم، چهار مسیر متفاوت",
                  "Four concepts, four different paths",
                  "از اینجا شروع کنید",
                  "START HERE",
                )}
                <div className="returns-concepts">
                  {returnsConcepts.map((concept) => (
                    <div className="returns-concept" key={concept.id}>
                      <span className={`returns-concept-icon ${concept.id}`}>
                        <ConceptIcon name={concept.id} />
                      </span>
                      <h3>{concept.title[language]}</h3>
                      <p>{concept.description[language]}</p>
                    </div>
                  ))}
                </div>
                <p className="returns-caption">
                  {t(
                    "این کارت‌ها آموزشی‌اند؛ نه تأیید صلاحیت مشتری و نه تضمین پذیرش درخواست.",
                    "These cards explain concepts; they don't determine eligibility or guarantee approval.",
                  )}
                </p>
              </section>
              <section
                id="returns-product"
                className="guide-section"
                tabIndex={-1}
              >
                {heading(
                  2,
                  "چه نوع سفارشی دارید؟",
                  "What type of order do you have?",
                  "شرایط هر محصول",
                  "PRODUCT CONDITIONS",
                )}
                <div
                  className="returns-type-selector"
                  role="group"
                  aria-label={t(
                    "انتخاب نوع سفارش برای مطالعه",
                    "Select an order type to read",
                  )}
                >
                  {policy.products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      aria-pressed={type === product.id}
                      aria-controls={`returns-type-${product.id}`}
                      onClick={() => setType(product.id)}
                    >
                      <span
                        className="returns-selection-dot"
                        aria-hidden="true"
                      />
                      {product.title[language]}
                    </button>
                  ))}
                </div>
                <p className="returns-type-hint">
                  {t(
                    "اگر سفارش شما چند نوع محصول دارد، شرایط هر قلم را جداگانه بررسی کنید.",
                    "If your order contains different product types, review the conditions for each item separately.",
                  )}
                </p>
                <p className="returns-caption">
                  {t(
                    "این انتخاب فقط راهنمای مطالعه است؛ وضعیت سفارش را تغییر نمی‌دهد و مجوز درخواست صادر نمی‌کند.",
                    "This selection is a reading aid only; it doesn't change an order or authorize a request.",
                  )}
                </p>
                {mode === "empty-section"
                  ? empty
                  : policy.products.map((product) => (
                      <div
                        id={`returns-type-${product.id}`}
                        key={product.id}
                        className={`returns-product-panel ${product.id}`}
                        hidden={type !== product.id}
                      >
                        <div className="returns-product-heading">
                          <h3>{product.title[language]}</h3>
                          {policy.demo && demoTag}
                        </div>
                        <p className="returns-product-intro">
                          {product.intro[language]}
                        </p>
                        <div
                          className={
                            product.id === "commission"
                              ? "returns-custom-stages"
                              : "returns-conditions"
                          }
                        >
                          {product.items.map((condition, index) => (
                            <div
                              className="returns-condition"
                              key={condition.title[1]}
                            >
                              {product.id === "commission" && (
                                <span className="returns-custom-number">
                                  {new Intl.NumberFormat(
                                    language === 0 ? "fa" : "en",
                                  ).format(index + 1)}
                                </span>
                              )}
                              <div>
                                <h4>{condition.title[language]}</h4>
                                <p>{condition.detail[language]}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {product.note && (
                          <div className="returns-soft-note">
                            {product.note[language]}
                          </div>
                        )}
                        {policy.demo && (
                          <p className="returns-condition-footer">
                            {t(
                              "شرایط قطعی هنوز منتشر نشده‌اند. برای بررسی سفارش، با پشتیبانی در ارتباط باشید.",
                              "Definitive conditions are not published yet. Contact support to review your order.",
                            )}{" "}
                            {link("پشتیبانی", "Support", "/contact")}
                          </p>
                        )}
                      </div>
                    ))}
              </section>
              <section
                id="returns-stage"
                className="guide-section"
                tabIndex={-1}
              >
                {heading(
                  3,
                  "مرحله سفارش چه اثری دارد؟",
                  "How does the order stage affect your request?",
                  "مرحله، نه مجوز",
                  "STAGE, NOT AUTHORIZATION",
                )}
                <p className="returns-lead">
                  {t(
                    "یک راهنمای آموزشی؛ این بخش وضعیت واقعی سفارش شما را تشخیص نمی‌دهد.",
                    "An educational guide; this section doesn't detect your actual order status.",
                  )}
                </p>
                <div
                  className="returns-stage-selector"
                  role="group"
                  aria-label={t(
                    "مرحله سفارش برای مطالعه",
                    "Order stage to read",
                  )}
                >
                  {stages.map((stage, index) => (
                    <button
                      type="button"
                      key={stage.title[1]}
                      aria-pressed={orderStage === index}
                      onClick={() => setOrderStage(index)}
                    >
                      <span>
                        {new Intl.NumberFormat(
                          language === 0 ? "fa" : "en",
                        ).format(index + 1)}
                      </span>
                      {stage.title[language]}
                    </button>
                  ))}
                </div>
                {stages[orderStage] ? (
                  <div
                    className={`returns-stage-summary ${
                      orderStage === 0 ? "payment" : ""
                    }`}
                    aria-live="polite"
                  >
                    <h3>{stages[orderStage].title[language]}</h3>
                    <p>{stages[orderStage].detail[language]}</p>
                    {link(
                      orderStage === 5 ? "مشاهده سفارش‌های من" : "پیگیری سفارش",
                      orderStage === 5 ? "View my orders" : "Track an order",
                      orderStage === 5
                        ? returnsOrdersRoute(signedIn)
                        : `/${language === 0 ? "fa" : "en"}/track-order`,
                    )}
                  </div>
                ) : (
                  empty
                )}
                <div className="returns-print-stages">
                  {stages.map((stage) => (
                    <div key={stage.title[1]}>
                      <h3>{stage.title[language]}</h3>
                      <p>{stage.detail[language]}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section
                id="returns-request"
                className="guide-section"
                tabIndex={-1}
              >
                {heading(
                  4,
                  "از درخواست تا اعلام نتیجه",
                  "From your request to an outcome",
                  "مسیر درخواست",
                  "THE REQUEST PROCESS",
                )}
                <p className="returns-lead">
                  {t(
                    "این مسیر کلی است؛ بسته به نوع درخواست، برخی مراحل ممکن است لازم نباشند.",
                    "This is a general process; some steps may not be needed for your request type.",
                  )}
                </p>
                <ol className="returns-request-steps">
                  {returnsRequestSteps.map((step, index) => (
                    <li key={step[1]}>
                      <span aria-hidden="true">
                        {new Intl.NumberFormat(
                          language === 0 ? "fa" : "en",
                        ).format(index + 1)}
                      </span>
                      <p>{step[language]}</p>
                    </li>
                  ))}
                </ol>
                <div className="returns-distinctions">
                  {[
                    ["ثبت درخواست ≠ پذیرش درخواست", "Submission ≠ approval"],
                    [
                      "پذیرش درخواست ≠ دریافت کالا",
                      "Approval ≠ receipt of goods",
                    ],
                    [
                      "دریافت کالا ≠ تأیید سلامت",
                      "Receipt ≠ condition approval",
                    ],
                    [
                      "تأیید بازپرداخت ≠ تکمیل انتقال وجه",
                      "Refund approval ≠ completed transfer",
                    ],
                  ].map(([fa, en]) => (
                    <span key={en}>{t(fa, en)}</span>
                  ))}
                </div>
              </section>
              <section
                id="returns-documents"
                className="guide-section"
                tabIndex={-1}
              >
                {heading(
                  5,
                  "پیش از ثبت درخواست، آماده کنید",
                  "Before you submit, have these ready",
                  "اطلاعات موردنیاز",
                  "WHAT YOU'LL NEED",
                )}
                <ul className="returns-checklist">
                  {returnsDocuments.map((document) => (
                    <li key={document[1]}>
                      <span aria-hidden="true">✓</span>
                      {document[language]}
                    </li>
                  ))}
                </ul>
                <div className="returns-soft-note">
                  <strong>
                    {t(
                      "اطلاعات شخصی یا بانکی را در پیام عمومی ارسال نکنید.",
                      "Do not share personal or banking details in public messages.",
                    )}
                  </strong>
                  <p>
                    {t(
                      "مدارک فقط در مسیر خصوصی و مجاز درخواست دریافت می‌شوند؛ این صفحه فرم آپلود ندارد.",
                      "Evidence is collected only through an authorized private request flow; this page has no upload form.",
                    )}
                  </p>
                </div>
              </section>
              <section
                id="returns-packing"
                className="guide-section"
                tabIndex={-1}
              >
                {heading(
                  6,
                  "بازگشت کالا، پس از دریافت راهنما",
                  "Send it back only after receiving instructions",
                  "بسته‌بندی و بازگشت",
                  "PACKING & RETURN",
                )}
                <div className="returns-important-note">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v1" />
                  </svg>
                  <p>
                    {t(
                      "پیش از دریافت دستور بازگشت، کالا را به نشانی نامشخص ارسال نکنید.",
                      "Do not send an item to an unconfirmed address before receiving return instructions.",
                    )}
                  </p>
                </div>
                <p className="returns-lead">
                  {t(
                    "روش بسته‌بندی، اقلام همراه، نشانی بازگشت و اطلاعات تماس باید از دستور تأییدشده همان درخواست دریافت شوند. درباره وضعیت بسته‌بندی و کالا، اطلاعات موردنیاز را در مسیر خصوصی ارائه کنید.",
                    "Packaging method, accompanying items, return address and contact details must come from confirmed instructions for that request. Provide any required packaging and item-condition information through the private flow.",
                  )}
                </p>
                {policy.demo && demoTag}
              </section>
              <section
                id="returns-refunds"
                className="guide-section"
                tabIndex={-1}
              >
                {heading(
                  7,
                  "هزینه بازگشت با مبلغ بازپرداخت فرق دارد",
                  "Return shipping and refund amounts are different",
                  "هزینه و بازپرداخت",
                  "COSTS & REFUNDS",
                )}
                <div className="returns-refund-cards">
                  <div className="guide-card">
                    <h3>{t("هزینه ارسال برگشت", "Return shipping cost")}</h3>
                    <p>
                      {t(
                        "به علت درخواست و سیاست مصوب بستگی دارد. مسئول هزینه در این نمونه تعیین نشده است؛ نه همیشه رایگان و نه همیشه با مشتری.",
                        "This depends on the request reason and approved policy. Responsibility is not defined in this sample; it is not always free or always paid by the customer.",
                      )}
                    </p>
                  </div>
                  <div className="guide-card">
                    <h3>
                      {t("مبلغ و روش بازپرداخت", "Refund amount & method")}
                    </h3>
                    <p>
                      {t(
                        "بر اساس درخواست تأییدشده، مبالغ تاریخی سفارش، تخفیف‌ها و شرایط مصوب بررسی می‌شود؛ نه قیمت روز. روش و زمان تخمینی فقط با اطلاعات معتبر نمایش داده می‌شوند.",
                        "Review uses the approved request, historical order amounts, discounts and approved conditions, not current prices. Method and estimated timing are shown only with valid information.",
                      )}
                    </p>
                  </div>
                </div>
                <div className="returns-refund-states">
                  {[
                    ["مبلغ درخواست‌شده", "Requested amount"],
                    ["مبلغ تأییدشده", "Approved amount"],
                    ["بازپرداخت در حال انجام", "Refund in progress"],
                    ["بازپرداخت تکمیل‌شده", "Refund completed"],
                    ["ناموفق یا نیازمند پیگیری", "Failed or needs follow-up"],
                  ].map(([fa, en], index) => (
                    <div key={en}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{t(fa, en)}</p>
                    </div>
                  ))}
                </div>
                <p className="returns-caption">
                  {t(
                    "این‌ها مفاهیم مستقل‌اند، نه وضعیت سفارش شما. زمان بررسی داخلی با زمان انتقال وجه یکسان نیست؛ ارقام شخصی در جزئیات خصوصی درخواست نمایش داده می‌شوند.",
                    "These are separate concepts, not your order's status. Internal review time differs from transfer time; personal amounts appear only in private request details.",
                  )}
                </p>
                <div className="returns-historical-note">
                  {t(
                    "برای سفارش قبلی، نسخه سیاست و توافق مرتبط با همان خرید بررسی می‌شود؛ تغییر متن جاری، قرارداد تاریخی را بازنویسی نمی‌کند.",
                    "For an earlier order, review the policy version and agreement tied to that purchase; updating current text does not rewrite a historical contract.",
                  )}
                </div>
              </section>
              <section
                id="returns-questions"
                className="guide-section"
                tabIndex={-1}
              >
                {heading(
                  8,
                  "چند سؤال مرتبط",
                  "A few related questions",
                  "پاسخ‌های راهنما",
                  "RELATED QUESTIONS",
                )}
                {policy.demo && demoTag}
                <div className="returns-faq">
                  {questions.map((question, index) => (
                    <div className="faq-item" key={question.title[1]}>
                      <h3>
                        <button
                          type="button"
                          aria-expanded={openQuestions.has(index)}
                          aria-controls={`returns-answer-${index}`}
                          id={`returns-question-${index}`}
                          onClick={() =>
                            setOpenQuestions((previous) => {
                              const next = new Set(previous)
                              next.has(index)
                                ? next.delete(index)
                                : next.add(index)
                              return next
                            })
                          }
                        >
                          <span className="faq-question">
                            {question.title[language]}
                          </span>
                          <span className="faq-toggle" aria-hidden="true">
                            {openQuestions.has(index) ? "−" : "+"}
                          </span>
                        </button>
                      </h3>
                      <div
                        className="faq-answer"
                        id={`returns-answer-${index}`}
                        aria-labelledby={`returns-question-${index}`}
                        hidden={!openQuestions.has(index)}
                      >
                        <p>{question.detail[language]}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {!questions.length && empty}
                {link("همه سؤالات متداول", "All FAQs", "/faq")}
              </section>
              <section
                id="returns-help"
                className="returns-help guide-section"
                tabIndex={-1}
              >
                <span className="guide-kicker">
                  {t("قدم بعدی، با خیال روشن", "YOUR NEXT STEP, WITH CLARITY")}
                </span>
                <h2>
                  {t(
                    "برای یک سفارش درخواست دارید؟",
                    "Need help with an order?",
                  )}
                </h2>
                <p>
                  {t(
                    "سفارش مرتبط را در حساب ببینید یا برای بررسی وضعیت، از پیگیری مهمان استفاده کنید.",
                    "View the relevant order in your account, or use guest tracking to check its status.",
                  )}
                </p>
                <div className="guide-actions">
                  {link(
                    "مشاهده سفارش‌های من",
                    "View my orders",
                    returnsOrdersRoute(signedIn),
                    "button primary",
                  )}
                  {link(
                    "پیگیری سفارش",
                    "Track an order",
                    `/${language === 0 ? "fa" : "en"}/track-order`,
                    "button secondary",
                  )}
                </div>
                <p className="returns-caption">
                  {t(
                    "تأیید تلفن در پیگیری مهمان، مجوز ثبت یا تغییر درخواست مرجوعی نیست.",
                    "Phone verification in guest tracking does not authorize creating or changing a return request.",
                  )}
                </p>
                <div className="returns-contact-row">
                  <p>
                    {t(
                      "حساب ندارید یا به آن دسترسی ندارید؟ ساخت حساب تنها راه کمک نیست.",
                      "No account, or can't access it? Creating an account isn't the only way to get help.",
                    )}
                  </p>
                  {link("تماس با پشتیبانی", "Contact support", "/contact")}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
