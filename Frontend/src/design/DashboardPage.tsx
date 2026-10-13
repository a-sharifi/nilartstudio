import { useEffect, useRef, useState, type ReactNode } from "react"
import "./dashboard.css"

type Mode = "normal" | "new" | "draft" | "payment" | "loading" | "error" | "restricted" | "denied"
const navigation = [
  ["grid", "", "داشبورد", "Dashboard"],
  ["box", "orders", "سفارش‌های من", "My orders"],
  ["download", "downloads", "دانلودها", "Downloads"],
  ["heart", "favorites", "علاقه‌مندی‌ها", "Favorites"],
  ["pin", "addresses", "آدرس‌ها", "Addresses"],
  ["user", "profile", "پروفایل", "Profile"],
  ["shield", "security", "امنیت", "Security"],
  ["sliders", "preferences", "زبان و اعلان‌ها", "Preferences"],
  ["chat", "support", "پشتیبانی", "Support"],
  ["bell", "notifications", "اعلان‌ها", "Notifications"],
]
export function Glyph({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    box: (
      <>
        <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7 5l9 4" />
      </>
    ),
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
    heart: (
      <path d="M12 21 3.5 12.5a5.5 5.5 0 0 1 8.5-7 5.5 5.5 0 0 1 8.5 7Z" />
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="2" />
        <circle cx="15" cy="17" r="2" />
      </>
    ),
    chat: <path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4Z" />,
    bell: (
      <>
        <path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4ZM10 21h4" />
      </>
    ),
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    exit: <path d="M10 4H4v16h6m-1-8h12m-5-5 5 5-5 5" />,
    paint: (
      <>
        <path d="m14 4 6 6-10 10H4v-6Z" />
        <path d="m12 6 6 6" />
      </>
    ),
    bag: (
      <>
        <path d="M5 7h14l1 14H4ZM8 7V5a4 4 0 0 1 8 0v2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
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
      className={name === "arrow" ? "direction-arrow" : ""}
    >
      {paths[name] || paths.grid}
    </svg>
  )
}

export default function DashboardPage({
  page,
  navigate,
  renderMedia,
  children,
  panelTitle,
  activeSection,
  onBeforeNavigate,
  notificationUnreadCount,
  liveMode = false,
}: {
  page: string
  navigate: (route: string) => void
  renderMedia: (color: string, kind: string) => ReactNode
  children?: ReactNode
  panelTitle?: string
  activeSection?: string
  onBeforeNavigate?: (route: string, proceed: () => void) => void
  notificationUnreadCount?: number | null
  liveMode?: boolean
}) {
  const en = page.startsWith("/en/")
  const t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa"
  const account = `${prefix}/account`
  const selectedSection = activeSection ?? (children ? "orders" : "")
  const [mode, setMode] = useState<Mode>("normal")
  const [drawer, setDrawer] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [destination, setDestination] = useState<string | null>(null)
  const destinationDialog = useRef<HTMLDialogElement>(null)
  const [retrying, setRetrying] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (page === account) setDestination(null)
  }, [page, account])
  useEffect(() => {
    document.documentElement.lang = en ? "en" : "fa"
    document.documentElement.dir = en ? "ltr" : "rtl"
    document.title = `${panelTitle || t("داشبورد شما", "Your dashboard")} | Nilart`
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex, nofollow"
    document.head.append(meta)
    return () => meta.remove()
  }, [en, panelTitle])
  useEffect(() => {
    if (drawer) dialog.current?.showModal()
    else if (dialog.current?.open) dialog.current.close()
  }, [drawer])
  useEffect(() => {
    if (destination) destinationDialog.current?.showModal()
    else if (destinationDialog.current?.open) destinationDialog.current.close()
  }, [destination])
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  const closeDrawer = () => {
    setDrawer(false)
    requestAnimationFrame(() => trigger.current?.focus())
  }
  const link =
    (route: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return
      event.preventDefault()
      const proceed = () => {
        setDrawer(false)
        if (route.startsWith(account + "/") && ![`${account}/downloads`, `${account}/favorites`, `${account}/addresses`, `${account}/profile`, `${account}/security`, `${account}/preferences`, `${account}/support`, `${account}/notifications`].includes(route) && !/^\/(fa|en)\/account\/support\/[^/]+$/.test(route) && !/\/(receipt|cancel|return|artwork-review)$/.test(route) && !route.startsWith(`${account}/requests/`)) {
          navigate(route)
          setDestination(route)
        } else navigate(route)
      }
      if (onBeforeNavigate) onBeforeNavigate(route, proceed)
      else proceed()
    }
  const action = (label: string, route: string, primary = false) => (
    <a
      className={primary ? "button primary" : "text-link"}
      href={route}
      onClick={link(route)}
    >
      {label}
      <Glyph name="arrow" size={16} />
    </a>
  )
  const nav = () => (
    <>
      <div className="dash-account-label">
        <span className="dash-avatar">
          <Glyph name="user" size={24} />
        </span>
        <div>
          <strong>{t("حساب شما", "Your account")}</strong>
          <small>
            {t("فضای شخصی شما در نیل‌آرت", "Your personal Nilart space")}
          </small>
        </div>
      </div>
      <nav aria-label={t("منوی حساب کاربری", "Account navigation")}>
        {navigation.map(([icon, slug, fa, english]) => (
          <a
            key={slug}
            href={`${account}${slug ? "/" + slug : ""}`}
            onClick={link(`${account}${slug ? "/" + slug : ""}`)}
            className={`dash-nav-item ${slug === selectedSection ? "active" : ""}`}
            aria-current={slug === selectedSection ? "page" : undefined}
          >
            <Glyph name={icon} />
            <span>{en ? english : fa}</span>
            {slug === "notifications" && typeof notificationUnreadCount === "number" && notificationUnreadCount > 0 && <bdi className="dash-notification-count">{notificationUnreadCount.toLocaleString(en ? "en" : "fa")}</bdi>}
            {!liveMode && slug === "support" && mode !== "new" && (
              <span
                className="dash-nav-dot"
                aria-label={t("پاسخ خوانده‌نشده نمونه", "Demo unread reply")}
              />
            )}
          </a>
        ))}
      </nav>
      <a
        className="dash-nav-item dash-signout"
        href={`${prefix}/auth/logout`}
        onClick={(event) => {
          setMode("denied")
          setDestination(null)
          link(`${prefix}/auth/logout`)(event)
        }}
      >
        <Glyph name="exit" />
        {t("خروج از حساب", "Sign out")}
      </a>
      <div className="dash-sidebar-note">
        <Glyph name="paint" />
        <p>{t("هنر، همراه لحظه‌های شما", "Art, alongside your everyday")}</p>
        <small>MADE WITH CARE, KEPT WITH LOVE</small>
      </div>
    </>
  )
  const heading = (title: string, label?: string, route?: string) => (
    <div className="dash-section-heading">
      <h2>{title}</h2>
      {label && route && action(label, route)}
    </div>
  )
  const count = (n: number) => n.toLocaleString(en ? "en" : "fa")
  const noOrders = mode === "new"
  const loading = mode === "loading"
  const unavailable = mode === "denied"
  const draft = mode === "draft"
  const retry = () => {
    setRetrying(true)
    timer.current = setTimeout(() => setRetrying(false), 800)
  }
  return (
    <div className="dashboard-app" dir={en ? "ltr" : "rtl"}>
      <a className="skip-link" href="#dashboard-main">
        {t("رفتن به محتوای اصلی", "Skip to content")}
      </a>
      <header className="header dash-header">
        <div className="container header-inner">
          <a
            className="wordmark"
            href="/"
            onClick={link("/")}
            aria-label="Nilart"
          >
            <span>
              nilart<span className="wordmark-dot">.</span>
            </span>
            <small>ART IN EVERYDAY LIFE</small>
          </a>
          <div className="dash-header-shop">
            {action(t("بازگشت به فروشگاه", "Back to shop"), "/")}
          </div>
          <div className="header-actions">
            <a
              className="language-button"
              href={page.replace(/^\/(fa|en)/, en ? "/fa" : "/en")}
              onClick={link(page.replace(/^\/(fa|en)/, en ? "/fa" : "/en"))}
            >
              {en ? "فارسی" : "EN"}
              <span className="dash-language-mark">◎</span>
            </a>
            <span className="header-divider" />
            <a
              className="icon-button"
              href={`${account}/notifications`}
              onClick={link(`${account}/notifications`)}
              aria-label={notificationUnreadCount === undefined ? t("اعلان‌ها", "Notifications") : notificationUnreadCount === null ? t("اعلان‌ها؛ تعداد خوانده‌نشده نامشخص", "Notifications; unread count unknown") : `${t("اعلان‌های خوانده‌نشده", "Unread notifications")}: ${notificationUnreadCount}`}
            >
              <Glyph name="bell" />
              {notificationUnreadCount === undefined ? (!liveMode ? <span className="dash-alert-dot" /> : null) : typeof notificationUnreadCount === "number" && notificationUnreadCount > 0 ? <bdi className="dash-notification-count">{notificationUnreadCount.toLocaleString(en ? "en" : "fa")}</bdi> : null}
            </a>
            <a
              className="icon-button"
              href="/cart"
              onClick={link("/cart")}
              aria-label={t("سبد خرید", "Shopping bag")}
            >
              <Glyph name="bag" />
            </a>
            <button
              ref={trigger}
              className="icon-button dash-menu"
              onClick={() => setDrawer(true)}
              aria-label={t("بازکردن منوی پنل", "Open account menu")}
              aria-expanded={drawer}
              aria-controls="account-drawer"
            >
              <Glyph name="menu" />
            </button>
          </div>
        </div>
      </header>
      <div className="container dash-layout">
        <aside className="dash-sidebar">{nav()}</aside>
        <main id="dashboard-main" className="dash-main">
          {children || <>
          <div className="dash-breadcrumb">
            {t("حساب کاربری", "Your account")}
            <span>/</span>
            {t("داشبورد", "Dashboard")}
          </div>
          <div className="dash-title-row">
            <div>
              <div className="dash-greeting">
                {t(
                  "خوش آمدید به فضای هنری خود",
                  "Welcome to your little art space",
                )}
              </div>
              <h1>{t("داشبورد شما", "Your dashboard")}</h1>
              <p>
                {t(
                  "سفارش‌ها و اقدام‌های مهم حساب خود را اینجا ببینید.",
                  "Find your orders and important account actions here.",
                )}
              </p>
            </div>
            <span className="dash-demo-badge">
              Demo <span>·</span> {t("داده نمونه", "Sample data")}
            </span>
          </div>
          <p className="dash-demo-note">
            {t(
              "این پیش‌نمایش به سرویس حساب متصل نیست؛ تمام سفارش‌ها، تعدادها و وضعیت‌ها نمونه‌اند.",
              "This preview is not connected to account services. All orders, counts and statuses are sample data.",
            )}
          </p>
          {unavailable ? (
            <section className="dash-card dash-empty">
              <Glyph name="shield" size={36} />
              <h2>
                {t(
                  "دسترسی به اطلاعات حساب مجاز نیست",
                  "Account information is not accessible",
                )}
              </h2>
              <p>
                {t(
                  "هیچ داده خصوصی نمایش داده نمی‌شود.",
                  "No private data is displayed.",
                )}
              </p>
              {action(
                t("ورود مجدد", "Sign in again"),
                `${prefix}/auth/login`,
                true,
              )}
            </section>
          ) : loading ? (
            <div
              aria-busy="true"
              aria-label={t("در حال دریافت داشبورد", "Loading dashboard")}
              className="dash-skeletons"
            >
              <div className="skeleton dash-skeleton-wide" />
              <div className="dash-stats">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="skeleton dash-skeleton-stat" />
                ))}
              </div>
              <div className="skeleton dash-skeleton-orders" />
            </div>
          ) : (
            <>
              {mode === "restricted" && (
                <div className="dash-restriction" role="status">
                  <Glyph name="shield" />
                  <div>
                    <strong>
                      {t(
                        "خرید با این حساب فعلاً محدود است · Demo",
                        "Purchasing is currently restricted · Demo",
                      )}
                    </strong>
                    <p>
                      {t(
                        "مشاهده سفارش‌ها، دانلودها و پشتیبانی همچنان در دسترس است.",
                        "Orders, downloads and support remain available.",
                      )}
                    </p>
                  </div>
                  {action(
                    t("بررسی محدودیت", "Review restriction"),
                    `${prefix}/auth/account-restricted`,
                  )}
                </div>
              )}
              {!noOrders && (
                <section
                  className="dash-attention"
                  aria-labelledby="attention-title"
                >
                  <div className="dash-attention-head">
                    <span className="dash-attention-symbol">
                      <Glyph name="clock" />
                    </span>
                    <h2 id="attention-title">
                      {t("نیازمند اقدام شما", "Needs your attention")}
                    </h2>
                    <span className="dash-soft-count">
                      {count(2)} {t("مورد", "items")}
                    </span>
                  </div>
                  <div className="dash-attention-row">
                    <div>
                      <strong>
                        {draft
                          ? t(
                              "نسخه اولیه نقاشی شما آماده است",
                              "Your artwork draft is ready",
                            )
                          : t(
                              "پیشنهاد نقاشی شما آماده بررسی است",
                              "Your commission proposal is ready",
                            )}
                      </strong>
                      <p>
                        {t("پرتره دو نفره", "Portrait for two")} <span>·</span>{" "}
                        <bdi>CM-1042</bdi> <span>·</span>{" "}
                        {draft
                          ? t(
                              "طرح را ببینید و نظرتان را بگویید.",
                              "View the draft and share your feedback.",
                            )
                          : t(
                              "جزئیات و زمان‌بندی پیشنهاد را بررسی کنید.",
                              "Review the proposal details and timeline.",
                            )}
                      </p>
                    </div>
                    {action(
                      draft
                        ? t("بررسی نسخه اولیه", "Review draft")
                        : t("بررسی پیشنهاد", "Review proposal"),
                      `${account}/commissions/CM-1042/${
                        draft ? "draft" : "proposal"
                      }`,
                      true,
                    )}
                  </div>
                  <div className="dash-attention-row">
                    <div>
                      <strong>
                        {mode === "payment"
                          ? t(
                              "نتیجه پرداخت در حال بررسی است",
                              "Your payment result is being checked",
                            )
                          : t(
                              "پاسخ تازه‌ای از پشتیبانی دارید",
                              "You have a new support reply",
                            )}
                      </strong>
                      <p>
                        {mode === "payment"
                          ? t(
                              "دوباره پرداخت نکنید. وضعیت پرداخت را بررسی کنید.",
                              "Do not pay again. Check your payment status.",
                            )
                          : t(
                              "درباره ارسال سفارش شما · تیکت SP-208",
                              "About your order delivery · Ticket SP-208",
                            )}
                      </p>
                    </div>
                    {action(
                      mode === "payment"
                        ? t("مشاهده وضعیت پرداخت", "View payment status")
                        : t("مشاهده پاسخ", "View reply"),
                      mode === "payment"
                        ? `${account}/orders/NA-24018/payment`
                        : `${account}/support/SP-208`,
                    )}
                  </div>
                </section>
              )}
              <div className="dash-stats">
                {[
                  [
                    "box",
                    t("سفارش‌های جاری", "Active orders"),
                    noOrders ? 0 : 2,
                    "orders",
                  ],
                  [
                    "clock",
                    t("اقدام‌های منتظر شما", "Actions awaiting you"),
                    noOrders ? 0 : 2,
                    "notifications",
                  ],
                  [
                    "download",
                    t("فایل‌های آماده دانلود", "Files ready to download"),
                    noOrders ? 0 : 1,
                    "downloads",
                  ],
                  [
                    "chat",
                    t("پاسخ‌های خوانده‌نشده", "Unread support replies"),
                    noOrders ? 0 : 1,
                    "support",
                  ],
                ].map(([icon, title, n, slug]) => (
                  <a
                    className="dash-stat"
                    key={String(slug)}
                    href={`${account}/${slug}`}
                    onClick={link(`${account}/${slug}`)}
                  >
                    <span className="dash-stat-icon">
                      <Glyph name={String(icon)} />
                    </span>
                    <strong>
                      {slug === "downloads" && mode === "error"
                        ? "—"
                        : count(Number(n))}
                    </strong>
                    <span>{title}</span>
                    {slug === "downloads" && mode === "error" && (
                      <small>{t("دریافت نشد", "Unavailable")}</small>
                    )}
                    <Glyph name="arrow" size={15} />
                  </a>
                ))}
              </div>
              <div className="dash-content-grid">
                <div className="dash-primary-column">
                  <section>
                    {heading(
                      t("سفارش‌های شما", "Your orders"),
                      t("همه سفارش‌ها", "All orders"),
                      `${account}/orders`,
                    )}
                    {noOrders ? (
                      <div className="dash-card dash-empty">
                        <span className="dash-empty-art">
                          <Glyph name="paint" size={36} />
                        </span>
                        <h2>
                          {t(
                            "اولین انتخاب هنری شما از اینجا شروع می‌شود",
                            "Your first art discovery starts here",
                          )}
                        </h2>
                        <p>
                          {t(
                            "هنوز سفارشی ثبت نکرده‌اید. کالکشن‌ها و آثار را ببینید یا درخواست نقاشی سفارشی شروع کنید.",
                            "You haven’t placed an order yet. Explore collections and artworks, or start a commission request.",
                          )}
                        </p>
                        <div>
                          {action(
                            t("کشف کالکشن‌ها", "Explore collections"),
                            "/collections",
                            true,
                          )}
                          {action(
                            t("دیدن نقاشی‌ها", "Explore artworks"),
                            `${prefix}/artworks`,
                          )}
                        </div>
                        {action(
                          t("شروع سفارش نقاشی", "Start a commission"),
                          `${prefix}/commissions`,
                        )}
                      </div>
                    ) : (
                      <div className="dash-card dash-orders">
                        {[0, 1].map((i) => (
                          <article className="dash-order" key={i}>
                            <div className="dash-order-top">
                              <strong>
                                {t("سفارش", "Order")}{" "}
                                <bdi>{i ? "NA-23976" : "NA-24018"}</bdi>
                              </strong>
                              <small>
                                {i
                                  ? t("۱۲ خرداد ۱۴۰۴", "2 June 2025")
                                  : t("۱۸ خرداد ۱۴۰۴", "8 June 2025")}
                              </small>
                            </div>
                            <div className="dash-order-body">
                              <div className="dash-product-thumb">
                                {renderMedia(i ? "sand" : "sage", "book")}
                              </div>
                              <div className="dash-order-info">
                                <h3>
                                  {i
                                    ? t(
                                        "دفتر «لحظه‌های آرام»",
                                        "Quiet moments notebook",
                                      )
                                    : t(
                                        "پکیج کالکشن گربه‌ها",
                                        "The cats collection bundle",
                                      )}
                                </h3>
                                <p>
                                  {i
                                    ? t(
                                        "۱ دفتر · جلد سخت · ۸۰ برگ",
                                        "1 notebook · Hardcover · 80 sheets",
                                      )
                                    : t(
                                        "۱ پکیج: دفتر، ۲ استیکر و نشان‌کتاب",
                                        "1 bundle: notebook, 2 stickers and bookmark",
                                      )}
                                </p>
                                <strong className="dash-money">
                                  {i ? count(385000) : count(720000)}{" "}
                                  <small>{t("تومان", "IRT")}</small>
                                </strong>
                              </div>
                            </div>
                            <div className="dash-order-bottom">
                              <div className="dash-order-status">
                                <span
                                  className={`dash-status ${
                                    mode === "payment" && !i
                                      ? "pending"
                                      : "paid"
                                  }`}
                                >
                                  <Glyph
                                    name={
                                      mode === "payment" && !i
                                        ? "clock"
                                        : "check"
                                    }
                                    size={13}
                                  />
                                  {mode === "payment" && !i
                                    ? t(
                                        "پرداخت در حال بررسی",
                                        "Payment being checked",
                                      )
                                    : t("پرداخت‌شده", "Paid")}
                                </span>
                                <span className="dash-status">
                                  {i
                                    ? t(
                                        "تحویل‌شده · ۱ از ۱ مرسوله",
                                        "Delivered · 1 of 1 shipment",
                                      )
                                    : t(
                                        "در حال آماده‌سازی · ارسال نشده",
                                        "Preparing · Not shipped",
                                      )}
                                </span>
                              </div>
                              {action(
                                t("مشاهده رسید · Demo", "View receipt · Demo"),
                                `${account}/orders/${i ? "NA-23976" : "NA-24018"}/receipt`,
                              )}
                              {action(
                                t("مشاهده سفارش", "View order"),
                                `${account}/orders/${
                                  i ? "NA-23976" : "NA-24018"
                                }`,
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                  <section>
                    {heading(
                      t("نقاشی‌های سفارشی", "Your commissions"),
                      t("همه درخواست‌ها", "All requests"),
                      `${account}/commissions`,
                    )}
                    <div className="dash-card dash-commission">
                      <span className="dash-private-art">
                        <Glyph name="paint" size={28} />
                        <small>{t("اثر خصوصی", "Private artwork")}</small>
                      </span>
                      <div>
                        <span className="dash-commission-eyebrow">
                          {noOrders
                            ? t("پیش‌نویس درخواست", "Request draft")
                            : draft
                              ? t("نسخه اولیه آماده", "Draft ready")
                              : t("پیشنهاد آماده تأیید", "Proposal ready")}
                        </span>
                        <h3>{t("پرتره دو نفره", "Portrait for two")}</h3>
                        <p>
                          <bdi>CM-1042</bdi> ·{" "}
                          {t("نقاشی سفارشی دیجیتال", "Digital commission")}
                        </p>
                        <p className="dash-commission-note">
                          {noOrders
                            ? t(
                                "درخواست هنوز ارسال نشده است.",
                                "Your request has not been submitted.",
                              )
                            : draft
                              ? t(
                                  "سفارش پرداخت‌شده؛ نسخه اولیه آماده بررسی شماست.",
                                  "Paid order; the first draft is ready for your review.",
                                )
                              : t(
                                  "درخواست بررسی شده؛ هنوز سفارش قطعی نیست.",
                                  "Reviewed request; not yet a confirmed order.",
                                )}
                        </p>
                      </div>
                      {action(
                        noOrders
                          ? t("ادامه درخواست", "Continue request")
                          : draft
                            ? t("بررسی طرح", "Review artwork draft")
                            : t("بررسی پیشنهاد", "Review proposal"),
                        `${account}/commissions/CM-1042/${
                          noOrders ? "request" : draft ? "draft" : "proposal"
                        }`,
                      )}
                    </div>
                  </section>
                  <section>
                    {heading(
                      t("فایل‌های آماده شما", "Your ready files"),
                      undefined,
                    )}
                    <div className="dash-card dash-file">
                      {mode === "error" ? (
                        <div className="dash-section-error" role="status">
                          <Glyph name="download" />
                          <strong>
                            {t(
                              "دریافت این بخش ممکن نشد.",
                              "Unable to load this section.",
                            )}
                          </strong>
                          <button
                            className="text-link"
                            disabled={retrying}
                            onClick={retry}
                          >
                            {retrying
                              ? t("در حال تلاش…", "Trying…")
                              : t("تلاش دوباره", "Try again")}
                          </button>
                          <small>
                            {t(
                              "سرویس متصل نیست؛ سفارش‌های شما همچنان نمایش داده می‌شوند.",
                              "No service connected; your orders remain visible.",
                            )}
                          </small>
                        </div>
                      ) : noOrders ? (
                        <p>
                          {t(
                            "فایل آماده‌ای برای دانلود ندارید.",
                            "You have no files ready to download.",
                          )}
                        </p>
                      ) : (
                        <>
                          <span className="dash-file-icon">
                            <Glyph name="download" size={24} />
                          </span>
                          <div>
                            <h3>
                              {t(
                                "راهنمای نگهداری و استفاده از کالکشن",
                                "Collection care & use guide",
                              )}
                            </h3>
                            <p>
                              <bdi>NA-24018</bdi> <span>·</span>{" "}
                              <bdi>PDF · 2.4 MB</bdi>
                            </p>
                            <span className="dash-ready">
                              <Glyph name="check" size={13} />
                              {t(
                                "فایل مشتری · آماده دانلود",
                                "Customer file · Ready to download",
                              )}
                            </span>
                          </div>
                          {action(
                            t("مشاهده و دانلود", "View and download"),
                            `${account}/downloads`,
                          )}
                        </>
                      )}
                    </div>
                  </section>
                </div>
                <aside className="dash-secondary-column">
                  <section>
                    {heading(t("تازه‌های حساب شما", "Your account updates"))}
                    <div className="dash-card dash-updates">
                      {noOrders ? (
                        <p>
                          {t("اعلان تازه‌ای ندارید.", "No new notifications.")}
                        </p>
                      ) : (
                        [
                          {
                            icon: "chat",
                            title: t("پاسخ پشتیبانی", "Support replied"),
                            desc: t(
                              "پاسخ پرسش شما درباره ارسال سفارش آماده است.",
                              "A reply to your delivery question is ready.",
                            ),
                            time: t(
                              "۱۹ خرداد ۱۴۰۴، ۱۰:۳۰",
                              "9 June 2025, 10:30",
                            ),
                            route: "support/SP-208",
                          },
                          {
                            icon: "paint",
                            title: t(
                              "پیشنهاد شما آماده است",
                              "Your proposal is ready",
                            ),
                            desc: t(
                              "پیشنهاد پرتره دو نفره را بررسی کنید.",
                              "Review your portrait commission proposal.",
                            ),
                            time: t(
                              "۱۸ خرداد ۱۴۰۴، ۱۶:۴۵",
                              "8 June 2025, 16:45",
                            ),
                            route: "commissions/CM-1042/proposal",
                          },
                          {
                            icon: "box",
                            title: t(
                              "سفارش در حال آماده‌سازی",
                              "Preparing your order",
                            ),
                            desc: t(
                              "پکیج گربه‌ها برای ارسال آماده می‌شود.",
                              "Your cats bundle is being prepared for delivery.",
                            ),
                            time: t(
                              "۱۸ خرداد ۱۴۰۴، ۱۲:۰۰",
                              "8 June 2025, 12:00",
                            ),
                            route: "orders/NA-24018",
                          },
                        ].map((item, i) => (
                          <a
                            key={item.route}
                            className="dash-update"
                            href={`${account}/${item.route}`}
                            onClick={link(`${account}/${item.route}`)}
                          >
                            <span className="dash-update-icon">
                              <Glyph name={item.icon} size={18} />
                            </span>
                            <div>
                              <strong>
                                {item.title}
                                {i === 0 && <span className="dash-nav-dot" />}
                              </strong>
                              <p>{item.desc}</p>
                              <time>{item.time}</time>
                            </div>
                          </a>
                        ))
                      )}
                      <div className="dash-updates-footer">
                        {action(
                          t("همه اعلان‌ها", "All notifications"),
                          `${account}/notifications`,
                        )}
                      </div>
                    </div>
                  </section>
                  <section>
                    {heading(t("دسترسی سریع", "Quick access"))}
                    <div className="dash-card dash-quick">
                      {[
                        [
                          "pin",
                          "addresses",
                          t("مدیریت آدرس‌ها", "Manage addresses"),
                        ],
                        [
                          "user",
                          "profile",
                          t("ویرایش پروفایل", "Edit profile"),
                        ],
                        [
                          "shield",
                          "security",
                          t("تنظیمات امنیت", "Security settings"),
                        ],
                        ["heart", "favorites", t("علاقه‌مندی‌ها", "Favorites")],
                      ].map(([icon, slug, title]) => (
                        <a
                          key={slug}
                          href={`${account}/${slug}`}
                          onClick={link(`${account}/${slug}`)}
                        >
                          <Glyph name={icon} />
                          <span>{title}</span>
                          <Glyph name="arrow" size={16} />
                        </a>
                      ))}
                    </div>
                  </section>
                  <div className="dash-commission-invite">
                    <span className="dash-invite-line" />
                    <Glyph name="paint" size={28} />
                    <h3>{t("ایده شما، هنر ما", "Your idea. Our artistry.")}</h3>
                    <p>
                      {t(
                        "یک اثر منحصربه‌فرد، با داستان شما.",
                        "A one-of-a-kind artwork, with your story.",
                      )}
                    </p>
                    {mode === "restricted" ? (
                      <small>
                        {t(
                          "شروع درخواست جدید فعلاً محدود است.",
                          "New requests are currently restricted.",
                        )}
                      </small>
                    ) : (
                      action(
                        t("شروع سفارش نقاشی", "Start a commission"),
                        `${prefix}/commissions`,
                      )
                    )}
                    <span className="dash-invite-line" />
                  </div>
                </aside>
              </div>
            </>
          )}
          <footer className="dash-footer">
            <span>
              {t(
                "با حوصله ساخته شده، برای شما.",
                "Thoughtfully made, just for you.",
              )}
            </span>
            <a href={`${prefix}/contact`} onClick={link(`${prefix}/contact`)}>
              {t("به کمک نیاز دارید؟", "Need a hand?")}{" "}
              <span>{t("پشتیبانی نیل‌آرت", "Nilart support")}</span>
            </a>
          </footer>
          <details className="dash-preview">
            <summary>
              {t("حالت‌های پیش‌نمایش", "Preview states")}{" "}
              <bdi>USER-01 · Demo</bdi>
            </summary>
            <div>
              {([
                ["normal", "مشتری دارای سفارش", "Customer with orders"],
                ["new", "کاربر جدید + پیش‌نویس", "New customer + draft"],
                ["draft", "نسخه اولیه آماده", "Artwork draft ready"],
                ["payment", "پرداخت نامشخص", "Unknown payment"],
                ["loading", "بارگذاری کلی", "Loading"],
                ["error", "خطای دانلودها", "Downloads error"],
                ["restricted", "محدودیت خرید", "Restricted purchases"],
                ["denied", "عدم مجوز", "Permission denied"],
              ] as const).map(([value, fa, english]) => (
                <button
                  key={value}
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value)
                    setDestination(null)
                  }}
                >
                  {en ? english : fa}
                </button>
              ))}
              <a
                href={`${prefix}/auth/session-expired?returnTo=${encodeURIComponent(account)}`}
                onClick={link(
                  `${prefix}/auth/session-expired?returnTo=${encodeURIComponent(account)}`,
                )}
              >
                {t("نشست منقضی", "Expired session")}
              </a>
            </div>
          </details>
          </>}
        </main>
      </div>
      <dialog
        id="account-drawer"
        ref={dialog}
        className="dash-drawer"
        aria-label={t("منوی حساب کاربری", "Account menu")}
        onCancel={(event) => {
          event.preventDefault()
          closeDrawer()
        }}
      >
        <div className="dash-drawer-head">
          <strong>{t("پنل مشتری", "Your account")}</strong>
          <button
            className="icon-button"
            onClick={closeDrawer}
            aria-label={t("بستن منو", "Close menu")}
          >
            <Glyph name="close" />
          </button>
        </div>
        {nav()}
      </dialog>
      <dialog
        ref={destinationDialog}
        className="dash-destination modal"
        aria-labelledby="destination-heading"
        onCancel={(event) => {
          event.preventDefault()
          setDestination(null)
          window.history.back()
        }}
      >
        <div className="modal-head">
          <h2 id="destination-heading">
            {t("مقصد مستقل پروتوتایپ", "Prototype destination")}
          </h2>
          <button
            className="icon-button"
            aria-label={t("بستن", "Close")}
            onClick={() => {
              setDestination(null)
              window.history.back()
            }}
          >
            <Glyph name="close" />
          </button>
        </div>
        <p>
          {t(
            "این مسیر، مقصد مستقل این اقدام است. مطابق درخواست، صفحه مقصد در این مرحله بازطراحی نشده است.",
            "This action leads to an independent page. As requested, the destination has not been redesigned in this step.",
          )}
        </p>
        <code dir="ltr">{destination}</code>
        <p className="dash-demo-note">
          {t(
            "Demo: هیچ پرداخت، تأیید طرح، دانلود یا خوانده‌شدن اعلان انجام نشده است.",
            "Demo: no payment, artwork approval, download or notification read operation occurred.",
          )}
        </p>
      </dialog>
    </div>
  )
}
