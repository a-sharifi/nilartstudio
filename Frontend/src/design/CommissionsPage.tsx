import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import {
  canShowDemoDraft,
  commissionConfig,
  commissionDestination,
  commissionFAQs,
  commissionModes,
  commissionPreparation,
  commissionSteps,
  type CommissionMode,
} from "./commissions"
import "./commissions.css"

function CommissionIcon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1.5" />
        <path d="m3 17 6-5 4 3 4-6 4 8" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="17" r="3" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
        <path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z" />
      </>
    ),
    document: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 7h6M9 11h6m-6 5 2 2 4-4" />
      </>
    ),
    brush: (
      <>
        <path d="m9 14 9-11 3 3-11 9M9 14c-6-2-6 5-7 6 6 1 10-1 7-6Z" />
      </>
    ),
    box: (
      <>
        <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7 5l9 4" />
      </>
    ),
    digital: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8m-4-4v4m-5-8 4-5 5 5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={name === "arrow" ? "direction-arrow" : undefined}
    >
      {paths[name] || paths.document}
    </svg>
  )
}
function IntroArtwork({ language }: { language: 0 | 1 }) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  return (
    <div
      className="commission-art"
      role="img"
      aria-label={t(
        "ترکیب هنری نمونه: طرح گیاه و فرم‌های انتزاعی؛ سفارش واقعی مشتری نیست.",
        "Demo artistic composition: a botanical sketch and abstract forms, not a real customer commission.",
      )}
    >
      <div className="commission-art-heading">
        <span>MADE PERSONAL</span>
        <span>NILART STUDIO</span>
      </div>
      <svg viewBox="0 0 600 430" aria-hidden="true">
        <defs>
          <filter
            id="commission-paper-shadow"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="12"
              floodColor="#211e1a"
              floodOpacity=".12"
            />
          </filter>
          <pattern
            id="commission-paper-grain"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".45" fill="#706b63" opacity=".11" />
          </pattern>
        </defs>
        <ellipse
          cx="305"
          cy="365"
          rx="220"
          ry="22"
          fill="#6b6251"
          opacity=".06"
        />
        <g
          transform="translate(55 78) rotate(-9 120 145)"
          filter="url(#commission-paper-shadow)"
        >
          <rect width="230" height="287" fill="#fbf8f0" />
          <rect width="230" height="287" fill="url(#commission-paper-grain)" />
          <g stroke="#7e8673" strokeWidth="1.6" fill="none">
            <path d="M107 247Q143 172 102 61m14 153Q65 199 66 163q44-2 50 51m7-27q45-9 42-45-43 2-42 45m-7-28Q68 138 79 111q31 4 37 48m-4-35q39-14 27-44-32 9-27 44M102 61Q77 39 100 21q25 15 2 40" />
            <path d="m72 171 43 40m11-28 30-30m-74-33 29 33m3-31 18-34" />
          </g>
          <path d="M37 262h51M142 262h51" stroke="#d4cbbc" />
          <text
            x="115"
            y="266"
            textAnchor="middle"
            fontFamily="Georgia,serif"
            fontStyle="italic"
            fontSize="12"
            fill="#82735c"
          >
            an idea
          </text>
        </g>
        <g
          transform="translate(286 28) rotate(6 122 170)"
          filter="url(#commission-paper-shadow)"
        >
          <rect width="245" height="332" rx="2" fill="#c4a782" />
          <rect x="10" y="10" width="225" height="312" fill="#f5eddd" />
          <rect x="23" y="23" width="199" height="286" fill="#d8d6b4" />
          <circle cx="163" cy="90" r="39" fill="#c2825d" />
          <path d="M23 202q60-84 115-32t84-2v141H23Z" fill="#89967b" />
          <path d="M23 255q90-78 199-34v88H23Z" fill="#3e5b4f" />
          <path
            d="M113 268q35-88 17-160m-1 107q-56-3-58-51 49 7 58 51m5-38q45-13 39-55-43 13-39 55m0-39q-46-6-39-44 36 6 39 44"
            fill="#d9d9b4"
            stroke="#d9d9b4"
            strokeWidth="2"
          />
          <rect
            x="23"
            y="23"
            width="199"
            height="286"
            fill="url(#commission-paper-grain)"
          />
        </g>
        <g transform="translate(481 324) rotate(23)">
          <path d="M0 0h8v86H0z" fill="#a44a32" />
          <path d="m0 86 4 12 4-12" fill="#c4a782" />
          <path d="m2 92 2 6 2-6" fill="#211e1a" />
        </g>
      </svg>
      <div className="commission-art-caption">
        <span>
          {t(
            "از یک ایده، به اثری برای شما",
            "From an idea, to something yours",
          )}
        </span>
        <span>DEMO</span>
      </div>
      <p className="commission-art-note">
        {t(
          "تصویرسازی معرفی؛ نمونه سفارش واقعی نیست.",
          "Intro illustration, not a real commissioned artwork.",
        )}
      </p>
    </div>
  )
}
export default function CommissionsPage({
  language,
  signedIn,
  onNavigate,
  onDemoSignIn,
  initialMode = "normal",
  live = false,
}: {
  language: 0 | 1
  signedIn: boolean
  onNavigate: (name: string, route: string) => void
  onDemoSignIn?: (value: boolean) => void
  live?: boolean
  initialMode?: CommissionMode
}) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const local = (v: string[]) => v[language]
  const num = (n: number) =>
    n.toLocaleString(language === 0 ? "fa-IR" : "en-US")
  const prefix = language === 0 ? "/fa" : "/en"
  const [mode, setMode] = useState<CommissionMode>(initialMode)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState("")
  const busy = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const id = useId()
  const authorized = signedIn && mode !== "expired"
  const disabled = mode === "disabled" || !commissionConfig.newRequestsEnabled
  const draftVisible = canShowDemoDraft(authorized, mode)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    busy.current = false
    setStarting(false)
  }, [signedIn])
  const setPreview = (next: CommissionMode) => {
    if (timer.current) clearTimeout(timer.current)
    busy.current = false
    setStarting(false)
    setError("")
    setMode(next)
  }
  const start = (resume = false, retry = false) => {
    if (live) { onNavigate(t("شروع درخواست", "Start request"), signedIn ? `${prefix}/commissions/new/references` : `${prefix}/auth/login?returnTo=${encodeURIComponent(`${prefix}/commissions/new/references`)}`); return }
    if (busy.current || (!resume && disabled)) return
    if (resume && !draftVisible) return
    if (mode === "start-error" && !retry) {
      setError(
        t(
          "شروع درخواست ممکن نشد. دوباره تلاش کنید.",
          "Unable to start the request. Try again.",
        ),
      )
      return
    }
    busy.current = true
    setStarting(true)
    setError("")
    timer.current = setTimeout(() => {
      busy.current = false
      setStarting(false)
      onNavigate(
        authorized
          ? resume
            ? t("ادامه درخواست نمونه", "Continue demo request")
            : t("تصویر مرجع و توضیحات", "Image and brief")
          : t("ورود برای شروع درخواست", "Sign in to start a request"),
        commissionDestination(language, authorized, resume),
      )
    }, 250)
  }
  const link = (label: string, route: string, cls = "text-link") => (
    <a
      className={cls}
      href={route}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onNavigate(label, route)
      }}
    >
      {label}
      <CommissionIcon name="arrow" size={18} />
    </a>
  )
  const startButton = (cls = "") => (
    <button
      className={`button primary commission-start ${cls}`}
      onClick={() => start()}
      disabled={disabled || starting}
      aria-busy={starting}
    >
      {starting
        ? t("در حال بازکردن مسیر…", "Opening the flow…")
        : t("شروع سفارش نقاشی", "Start a commission")}
      <CommissionIcon name="arrow" size={19} />
    </button>
  )
  const previews = (
    <details className="commission-preview">
      <summary>
        {t("حالت‌های پروتوتایپ", "Prototype states")} · PAINT-03 / Demo
      </summary>
      <div>
        <label>
          {t("وضعیت صفحه", "Page state")}
          <select
            value={mode}
            onChange={(e) => setPreview(e.target.value as CommissionMode)}
          >
            {commissionModes.map(([value, fa, en]) => (
              <option value={value} key={value}>
                {t(fa, en)}
              </option>
            ))}
          </select>
        </label>
        {onDemoSignIn && (
          <label className="commission-demo-session">
            <input
              type="checkbox"
              checked={signedIn}
              onChange={(e) => onDemoSignIn(e.target.checked)}
            />
            {t("کاربر واردشده — فقط Demo", "Signed-in user — Demo only")}
          </label>
        )}
      </div>
      <p>
        {t(
          "پیش‌نویس این کنترل فقط یک نمونه ساختگی در نشست است؛ هیچ درخواست یا فایل خصوصی ذخیره یا بازیابی نمی‌شود.",
          "The draft preview is a fictional session fixture; no request or private file is saved or retrieved.",
        )}
      </p>
    </details>
  )
  if (mode === "loading")
    return (
      <div className="container commissions-page">
        <div
          className="commission-loading"
          role="status"
          aria-label={t(
            "در حال دریافت معرفی سفارش",
            "Loading commission introduction",
          )}
        >
          <div>
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
          <div className="skeleton" />
        </div>
        <div className="commission-loading-cards">
          {[0, 1, 2].map((i) => (
            <div className="skeleton" key={i} />
          ))}
        </div>
        {!live && previews}
      </div>
    )
  return (
    <div className="container commissions-page">
      <nav
        className="commission-breadcrumb"
        aria-label={t("مسیر صفحه", "Breadcrumb")}
      >
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            onNavigate(t("خانه", "Home"), "/")
          }}
        >
          {t("خانه", "Home")}
        </a>
        <span>/</span>
        <span>{t("سفارش نقاشی سفارشی", "Custom artwork")}</span>
      </nav>
      <section className="commission-hero">
        <div className="commission-hero-copy">
          <div className="eyebrow">
            <span className="tiny-line" />
            {t("اثری که از شما شروع می‌شود", "AN ARTWORK THAT STARTS WITH YOU")}
          </div>
          <h1>
            {t("ایده شما،", "Your idea,")}
            <br />
            {t("نقطه شروع یک ", "the start of an ")}
            <span>{t("نقاشی", "artwork")}</span>
          </h1>
          <p>
            {t(
              "تصویر یا ایده خود را معرفی کنید، ترجیحاتتان را انتخاب کنید و پیشنهاد سفارش را پیش از پرداخت بررسی کنید.",
              "Share your image or idea, choose your preferences, and review the order proposal before payment.",
            )}
          </p>
          <div className="commission-hero-actions">
            {startButton()}
            {link(
              t("آثار آماده را ببینید", "Explore available artworks"),
              `${prefix}/artworks`,
            )}
          </div>
          <p className="commission-no-commitment">
            <CommissionIcon name="document" size={16} />
            {t(
              "شروع درخواست به معنی پرداخت یا آغاز اجرای اثر نیست.",
              "Starting a request does not mean payment or production has begun.",
            )}
          </p>
          <div className="commission-access-note">
            <CommissionIcon name="lock" size={16} />
            <p>
              {t(
                "مطالعه این صفحه عمومی است. در مسیر نمونه، برای آپلود خصوصی و ذخیره درخواست، ورود در مرحله بعد لازم است؛ ذخیره مهمان فعال نیست.",
                "This page is public. In the demo flow, sign-in is required before private uploads or saving a request in the next step; guest storage is not enabled.",
              )}
            </p>
          </div>
        </div>
        <IntroArtwork language={language} />
      </section>
      <div className="commission-demo-notice">
        <span>{live ? t("درخواست بررسی", "Review request") : "DEMO"}</span>
        <p>
          {live ? t("ایده متنی را برای بررسی ثبت کنید. تصویر، ارزیابی و قیمت‌گذاری هنوز در دسترس نیست. نمونه‌ها و گزینه‌ها نمایشی‌اند و تأیید اجرای سفارش نیستند.", "Submit a text brief for review. Images, assessment and quotes are unavailable. Illustrations and options are examples, not confirmed production offerings.") : t(
            "این صفحه نمونه طراحی مسیر است؛ محتوای سیاست‌ها، انواع اجرا و پیش‌نویس‌ها به سرویس واقعی متصل نیستند. نمونه سفارش دارای مجوز ارائه نشده است.",
            "This is a flow-design prototype. Policies, execution options and drafts are not connected to a live service. No licensed commission examples have been provided.",
          )}
        </p>
      </div>
      {disabled && (
        <div className="commission-alert" role="status">
          <CommissionIcon name="document" />
          <div>
            <h2>
              {t(
                "ثبت درخواست جدید در حال حاضر در دسترس نیست.",
                "New commission requests are currently unavailable.",
              )}
            </h2>
            <p>
              {t(
                "درخواست‌های موجود را از حساب پیگیری کنید یا درباره سفارش با ما تماس بگیرید.",
                "Track existing requests from your account or contact us about a commission.",
              )}
            </p>
            <div>
              {link(
                t("تماس درباره سفارش", "Contact about a commission"),
                `${prefix}/contact?topic=commission`,
              )}
              {link(
                t("پیگیری از حساب", "Track in your account"),
                authorized
                  ? "/account/orders"
                  : "/login?returnTo=%2Faccount%2Forders",
              )}
            </div>
          </div>
        </div>
      )}
      {mode === "expired" && (
        <div className="commission-alert" role="status">
          <CommissionIcon name="lock" />
          <div>
            <h2>
              {t("نشست نمونه منقضی شده است.", "The demo session has expired.")}
            </h2>
            <p>
              {t(
                "برای دسترسی به درخواست خصوصی، دوباره وارد شوید. اطلاعات پیش‌نویس نمایش داده نمی‌شود.",
                "Sign in again to access a private request. Draft information is hidden.",
              )}
            </p>
            {link(
              t("ورود مجدد", "Sign in again"),
              `/login?returnTo=${encodeURIComponent(`${prefix}/commissions`)}`,
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="commission-start-error" role="alert">
          <p>{error}</p>
          <button
            className="button secondary"
            onClick={() => {
              setMode("normal")
              start(false, true)
            }}
          >
            {t("تلاش دوباره", "Try again")}
          </button>
          <small>
            {t(
              "خطای شبیه‌سازی‌شده؛ هیچ درخواستی ایجاد نشده است.",
              "Simulated error; no request was created.",
            )}
          </small>
        </div>
      )}
      {draftVisible && (
        <section
          className="commission-draft"
          aria-labelledby="commission-draft-title"
        >
          <div className="commission-draft-icon">
            <CommissionIcon name="document" size={28} />
          </div>
          <div>
            <span className="eyebrow">DEMO / SESSION FIXTURE</span>
            <h2 id="commission-draft-title">
              {t("درخواست نیمه‌تمام دارید", "You have an unfinished request")}
            </h2>
            <p>
              {t(
                "ایده نقاشی نمونه · مرحله فعلی: انتخاب ترجیحات",
                "Demo artwork idea · Current step: Choose preferences",
              )}
            </p>
            <small>
              {t(
                "نمونه مجاز برای کاربر واردشده؛ بدون تصویر خصوصی یا داده ذخیره‌شده واقعی.",
                "Authorized signed-in preview; no private image or actual saved data.",
              )}
            </small>
          </div>
          <div className="commission-draft-actions">
            <button
              className="button secondary"
              onClick={() => start(true)}
              disabled={starting}
            >
              {t("ادامه درخواست", "Continue request")}
              <CommissionIcon name="arrow" size={18} />
            </button>
            <button
              className="commission-new-request"
              disabled={starting || disabled}
              onClick={() => start()}
            >
              {t("شروع درخواست جدید", "Start a new request")}
            </button>
            <small>
              {t("نمونه قبلی حذف نمی‌شود.", "The existing demo is not deleted.")}
            </small>
          </div>
        </section>
      )}
      {authorized && mode === "draft-error" && (
        <div className="commission-alert" role="status">
          <CommissionIcon name="document" />
          <div>
            <h2>
              {t(
                "دریافت درخواست قبلی ممکن نشد.",
                "Unable to retrieve your previous request.",
              )}
            </h2>
            <p>
              {t(
                "شروع درخواست جدید، درخواست قبلی را حذف نمی‌کند. این خطا نمایشی است.",
                "Starting a new request does not delete the previous one. This error is simulated.",
              )}
            </p>
            <button
              className="button secondary"
              onClick={() => setPreview("draft")}
            >
              {t("تلاش دوباره", "Try again")}
            </button>
          </div>
        </div>
      )}
      <section
        className="commission-process"
        aria-labelledby="commission-process-title"
      >
        <div className="commission-section-head">
          <div>
            <div className="eyebrow">01 / THE JOURNEY</div>
            <h2 id="commission-process-title">
              {t("سفارش شما چه مسیری دارد؟", "How does your commission work?")}
            </h2>
          </div>
          <p>
            {t(
              "قدم‌به‌قدم، از ایده تا تحویل",
              "Step by step, from idea to delivery",
            )}
          </p>
        </div>
        <ol className="commission-steps">
          {commissionSteps.map((step, i) => (
            <li key={step.icon}>
              <div className="commission-step-top">
                <span>{num(i + 1).padStart(language === 0 ? 1 : 2, "0")}</span>
                <CommissionIcon name={step.icon} size={25} />
              </div>
              <h3>{local(step.title)}</h3>
              <p>{local(step.desc)}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="commission-prepare">
        <div className="commission-prepare-intro">
          <div className="eyebrow">02 / BEFORE YOU START</div>
          <h2>
            {t("پیش از شروع،", "Before you start,")}
            <br />
            {t("این موارد کمک می‌کنند", "a little preparation helps")}
          </h2>
          <p>
            {t(
              "لازم نیست همه چیز از همین حالا قطعی باشد. این‌ها راهنمای آمادگی‌اند، نه فرم سفارش.",
              "You do not need to have everything decided. These are things to prepare, not an order form.",
            )}
          </p>
          <div className="commission-next-note">
            <CommissionIcon name="image" />
            <p>
              {t(
                "در مرحله بعد مشخص می‌شود کدام اطلاعات برای درخواست شما لازم است.",
                "The next step will show which details are required for your request.",
              )}
            </p>
          </div>
        </div>
        <div>
          <ul className="commission-checklist">
            {commissionPreparation.map((item, i) => (
              <li key={i}>
                <span aria-hidden="true">
                  <CommissionIcon name="plus" size={14} />
                </span>
                {local(item)}
              </li>
            ))}
          </ul>
          <p className="commission-sensitive">
            <CommissionIcon name="lock" size={16} />
            {t(
              "از ارسال اطلاعات حساس غیرضروری در تصاویر خودداری کنید.",
              "Avoid including unnecessary sensitive information in your images.",
            )}
          </p>
        </div>
      </section>
      <section
        className="commission-delivery"
        aria-labelledby="commission-delivery-title"
      >
        <div className="commission-section-head">
          <div>
            <div className="eyebrow">03 / YOUR KIND OF ART</div>
            <h2 id="commission-delivery-title">
              {t(
                "دو مسیر، برای یک ایده شخصی",
                "Different ways to bring your idea to life",
              )}
            </h2>
          </div>
          <p>
            {t(
              "انتخاب واقعی در مرحله ترجیحات انجام می‌شود.",
              "Your selection happens in the preferences step.",
            )}
          </p>
        </div>
        <div className="commission-delivery-grid">
          <article>
            <div className="commission-delivery-icon">
              <CommissionIcon name="digital" size={32} />
            </div>
            <div>
              <span className="commission-type-label">DIGITAL · DEMO</span>
              <h3>{t("اجرای دیجیتال", "Digital artwork")}</h3>
              <p>
                {t(
                  "تحویل فایل نهایی طبق مشخصات توافق‌شده سفارش.",
                  "Delivery of the final file according to the agreed order specifications.",
                )}
              </p>
              <small>
                {t(
                  "اجرای دیجیتال با تولید خودکار AI یکسان نیست.",
                  "Digital creation is not the same as automatic AI generation.",
                )}
              </small>
            </div>
          </article>
          {mode !== "digital-only" && (
            <article>
              <div className="commission-delivery-icon">
                <CommissionIcon name="brush" size={32} />
              </div>
              <div>
                <span className="commission-type-label">
                  HAND-PAINTED · DEMO
                </span>
                <h3>{t("اجرای دستی", "Hand-painted artwork")}</h3>
                <p>
                  {t(
                    "اجرای اثر فیزیکی با مشخصات و شرایط ارسال همان سفارش.",
                    "Creation of a physical artwork with order-specific specifications and shipping conditions.",
                  )}
                </p>
                <small>
                  {t(
                    "تکنیک، قاب و اقلام همراه در پیشنهاد مشخص می‌شوند.",
                    "Medium, frame and included items are specified in the proposal.",
                  )}
                </small>
              </div>
            </article>
          )}
        </div>
      </section>
      <section className="commission-pricing">
        <div className="commission-pricing-copy">
          <div className="eyebrow">04 / A THOUGHTFUL PROPOSAL</div>
          <h2>{t("قیمت چگونه مشخص می‌شود؟", "How is the price determined?")}</h2>
          <p>
            {t(
              "هر ایده جزئیات خودش را دارد. سایز، نوع اجرا، سبک و جزئیات درخواست، سختی تصویر و خدمات اضافه فعال در پیشنهاد بررسی می‌شوند؛ برای اثر فیزیکی، بسته‌بندی و ارسال نیز در صورت نیاز مشخص می‌شوند.",
              "Every idea has its own details. Size, execution type, style, request details, image complexity and active extras are considered in the proposal. Physical orders also specify packaging and shipping where applicable.",
            )}
          </p>
          <div className="commission-price-factors">
            {[
              t("سایز", "Size"),
              t("نوع اجرا", "Execution"),
              t("سبک و جزئیات", "Style & detail"),
              t("سختی تصویر", "Image complexity"),
            ].map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
        </div>
        <div className="commission-review-card">
          <CommissionIcon name="spark" size={28} />
          <h3>
            {t(
              "تحلیل کمک می‌کند؛ هنرمند بررسی می‌کند",
              "Analysis assists. An artist reviews.",
            )}
          </h3>
          <p>
            {t(
              "تحلیل تصویر می‌تواند به ارزیابی سختی کمک کند. درخواست‌های نیازمند بررسی، پیش از پرداخت توسط هنرمند بررسی می‌شوند.",
              "Image analysis can help assess complexity. Requests requiring review are checked by an artist before payment.",
            )}
          </p>
          <div>
            <CommissionIcon name="document" size={22} />
            <strong>
              {t(
                "پیشنهاد و جزئیات مبلغ را پیش از تأیید و پرداخت خواهید دید.",
                "You will see the proposal and price details before approval and payment.",
              )}
            </strong>
          </div>
        </div>
      </section>
      <section
        className="commission-faq"
        aria-labelledby="commission-faq-title"
      >
        <div>
          <div className="eyebrow">05 / GOOD TO KNOW</div>
          <h2 id="commission-faq-title">
            {t("پیش از اولین قدم", "Before your first step")}
          </h2>
          <p>{t("پاسخ کوتاه به چند پرسش مهم", "A few helpful answers")}</p>
          {link(
            t("پرسش دیگری دارید؟", "Have another question?"),
            `${prefix}/contact?topic=commission`,
          )}
        </div>
        <div>
          {commissionFAQs.map((faq, i) => (
            <article className="commission-faq-item" key={i}>
              <h3>
                <button
                  id={`${id}-question-${i}`}
                  aria-expanded={openFAQ === i}
                  aria-controls={`${id}-answer-${i}`}
                  onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                >
                  {local(faq.question)}
                  <span className={openFAQ === i ? "is-open" : ""}>
                    <CommissionIcon name="plus" size={18} />
                  </span>
                </button>
              </h3>
              <div
                id={`${id}-answer-${i}`}
                role="region"
                aria-labelledby={`${id}-question-${i}`}
                hidden={openFAQ !== i}
              >
                <p>{local(faq.answer)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="commission-final">
        <div className="eyebrow">LET’S START WITH AN IDEA</div>
        <h2>
          {t("آماده‌اید ایده‌تان را معرفی کنید؟", "Ready to share your idea?")}
        </h2>
        <p>
          {t(
            "اولین قدم، آشنایی با ایده شماست؛ نه پرداخت و نه آغاز اجرا.",
            "The first step is getting to know your idea, not payment or production.",
          )}
        </p>
        {startButton()}
        {link(
          t("پیش از شروع پرسشی دارید؟", "Have a question before starting?"),
          `${prefix}/contact?topic=commission`,
        )}
        {disabled && (
          <p className="commission-final-unavailable">
            {t(
              "ثبت درخواست جدید در حال حاضر در دسترس نیست.",
              "New commission requests are currently unavailable.",
            )}
          </p>
        )}
      </section>
      {mode === "optional-error" && (
        <p className="commission-optional-error" role="status">
          {t(
            "بخش محتوای اختیاری در این حالت نمونه در دسترس نیست؛ معرفی و شروع مسیر باقی می‌مانند.",
            "Optional content is unavailable in this demo state; the introduction and start action remain available.",
          )}
        </p>
      )}
      {!live && previews}
    </div>
  )
}
