import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useRef, useState } from "react"
import {
  demoArtistService,
  type ArtistSnapshot,
  type ArtistPreview,
} from "./artist-data"
import {
  ArtistIcon,
  ArtistButton,
  ArtistLink,
  ArtistPanel,
  StageBadge,
  ArtistSkeleton,
  ArtistEmpty,
  ArtistError,
  ArtistOrderCard,
  AssessmentCard,
  ArtistMoneyCard,
  ArtistModal,
  ExecutionTimeline,
  PrivateImageViewer,
  VersionFeedbackCard,
  SectionedArtistForm,
  ArtistUpload,
  ArtistListTable,
  artistText,
  type ArtistLocale,
} from "./ArtistComponents"
import "./artist.css"

export default function ArtistDashboard() {
  const [locale, setLocale] = useState<ArtistLocale>(
    location.pathname.startsWith("/en/") ? "en" : "fa",
  )
  const [mode, setMode] = useState<ArtistPreview>("normal")
  const [data, setData] = useState<ArtistSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [networkError, setNetworkError] = useState(false)
  const [earningsError, setEarningsError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [drawer, setDrawer] = useState(false)
  const [gallery, setGallery] = useState(false)
  const [modal, setModal] = useState<{
    title: string
    route?: string
    kind?: string
  } | null>(null)
  const [filter, setFilter] = useState("all")
  const drawerRef = useRef<HTMLDialogElement>(null)
  const t = (fa: string, en: string) => artistText(locale, fa, en)
  const local = (pair: readonly [string, string]) =>
    pair[locale === "fa" ? 0 : 1]
  const base = `/${locale}/artist`
  const restricted = ["denied", "changed", "expired"].includes(mode)
  useEffect(() => {
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr"
    document.documentElement.lang = locale
    const robots = document.createElement("meta")
    robots.name = "robots"
    robots.content = "noindex, nofollow"
    document.head.appendChild(robots)
    return () => robots.remove()
  }, [locale])
  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setLoading(true)
    setNetworkError(false)
    if (restricted || mode === "loading") {
      setLoading(mode === "loading")
      demoArtistService.clear()
      return () => controller.abort()
    }
    demoArtistService
      .load(controller.signal, mode === "empty")
      .then((snapshot) => {
        if (!controller.signal.aborted) {
          setData(snapshot)
          setLoading(false)
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setNetworkError(true)
          setLoading(false)
        }
      })
    setEarningsError(mode === "error")
    return () => controller.abort()
  }, [mode, refreshKey, restricted])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    if (drawer) drawerRef.current?.showModal()
    else drawerRef.current?.close()
    return () => {
      drawerRef.current?.close()
      previous?.focus()
    }
  }, [drawer])
  function open(title: string, route: string) {
    setModal({ title, route: base + route })
    setDrawer(false)
  }
  const link = (fa: string, en: string, route: string) => (
    <ArtistLink onClick={() => open(t(fa, en), route)}>{t(fa, en)}</ArtistLink>
  )
  const navItems = [
    ["داشبورد", "Dashboard", "grid", ""],
    [
      "درخواست‌های نیازمند بررسی",
      "Assessment requests",
      "orders",
      "/assessments",
    ],
    ["سفارش‌های تخصیص‌یافته", "Assigned orders", "brush", "/orders"],
    ["کارهای در حال اجرا", "Work in progress", "clock", "/work"],
    ["اصلاحات", "Revisions", "feedback", "/revisions"],
    ["سوابق و تحویل‌ها", "History & deliveries", "check", "/history"],
    ["درآمد و تسویه", "Earnings & settlements", "wallet", "/earnings"],
    ["پروفایل و نمونه‌کارها", "Profile & portfolio", "user", "/profile"],
    ["اعلان‌ها و تنظیمات", "Notifications & settings", "bell", "/settings"],
  ]
  function signOut() {
    setModal(null)
    setDrawer(false)
    setGallery(false)
    setData(null)
    demoArtistService.clear()
    setMode("expired")
  }
  const brand = (
    <a className="ar-brand wordmark" href={base}>
      <span>
        nilart<span className="wordmark-dot">.</span>
      </span>
      <small>ART, IN EVERY DETAIL</small>
    </a>
  )
  const navigation = (
    <>
      <div className="ar-sidebar-brand">
        {brand}
        <span>{t("فضای کار هنرمند", "Artist workspace")}</span>
      </div>
      <nav aria-label={t("منوی هنرمند", "Artist navigation")}>
        <span className="ar-nav-label">{t("فضای کار", "WORKSPACE")}</span>
        {navItems.slice(0, 6).map(([fa, en, icon, route]) => (
          <button
            key={route}
            className={route === "" ? "active" : ""}
            aria-current={route === "" ? "page" : undefined}
            onClick={() => {
              if (route) open(t(fa, en), route)
              else setDrawer(false)
            }}
          >
            <ArtistIcon name={icon} />
            <span>{t(fa, en)}</span>
            {route === "" && <i />}
          </button>
        ))}
        <span className="ar-nav-label">
          {t("حساب هنرمند", "ARTIST ACCOUNT")}
        </span>
        {navItems
          .slice(6)
          .filter(
            (item) =>
              item[3] !== "/earnings" || !data || data.artist.earningsAllowed,
          )
          .map(([fa, en, icon, route]) => (
            <button key={route} onClick={() => open(t(fa, en), route)}>
              <ArtistIcon name={icon} />
              <span>{t(fa, en)}</span>
            </button>
          ))}
      </nav>
      <div className="ar-sidebar-foot">
        <span className="ar-avatar">S</span>
        <div>
          <strong>
            {data
              ? local(data.artist.name)
              : t("هنرمند نمونه", "Sample artist")}
          </strong>
          <small>{t("هنرمند نیل‌آرت · Demo", "NilArt artist · Demo")}</small>
        </div>
        <button
          className="icon-button"
          onClick={signOut}
          aria-label={t("خروج", "Sign out")}
        >
          <ArtistIcon name="logout" />
        </button>
      </div>
    </>
  )
  const empty = !loading && data?.orders.length === 0
  const ready = data?.orders.find(
    (o) => o.stage === "ready" && o.startAuthorized,
  )
  const revision = data?.orders.find((o) => o.stage === "revision")
  const deliver = data?.orders.find((o) => o.stage === "delivery")
  const actions = [
    ...(data?.requests[0]
      ? [
          {
            title: t("ارزیابی جدید", "New assessment"),
            id: data.requests[0].id,
            desc: t(
              "پیشنهاد اولیه آماده بررسی شماست؛ هنوز سفارش اجرا نیست.",
              "Initial proposal awaits review; not an execution order yet.",
            ),
            cta: t("بررسی ارزیابی", "Review assessment"),
            route: `/assessments/${data.requests[0].id}`,
            icon: "orders",
            tone: "",
          },
        ]
      : []),
    ...(ready
      ? [
          {
            title: t("آماده شروع", "Ready to start"),
            id: ready.id,
            desc: t(
              "پرداخت و مجوز شروع در داده نمونه تأیید شده‌اند.",
              "Sample payment and start authorization are confirmed.",
            ),
            cta: t("مشاهده سفارش", "View order"),
            route: `/orders/${ready.id}`,
            icon: "brush",
            tone: "green",
          },
        ]
      : []),
    ...(revision
      ? [
          {
            title: t("بازخورد جدید", "New feedback"),
            id: revision.id + " · " + revision.version,
            desc: t(
              "اصلاح نور و رنگ؛ بررسی در محدوده توافق.",
              "Light and color revision; check agreed scope.",
            ),
            cta: t("مشاهده اصلاحات", "View revisions"),
            route: `/orders/${revision.id}/revisions?version=${revision.version}`,
            icon: "feedback",
            tone: "warm",
          },
        ]
      : []),
    ...(deliver
      ? [
          {
            title: t("نسخه نهایی آماده", "Final version ready"),
            id: deliver.id + " · " + deliver.version,
            desc: t(
              "نسخه تأییدشده برای ادامه تحویل آماده است.",
              "Approved version is ready to continue delivery.",
            ),
            cta: t("ادامه تحویل", "Continue delivery"),
            route: `/orders/${deliver.id}/delivery`,
            icon: "check",
            tone: "",
          },
        ]
      : []),
  ]
  const counts = [
    data?.requests.length,
    data?.orders.filter((o) => o.stage !== "delivery").length,
    data?.orders.filter((o) => o.stage === "approval").length,
    data?.orders.filter((o) => o.stage === "revision").length,
  ]
  const summaries = [
    [
      "منتظر بررسی شما",
      "Awaiting your assessment",
      "orders",
      "/assessments?status=pending",
    ],
    ["سفارش‌های جاری", "Active commissions", "brush", "/orders?status=active"],
    [
      "منتظر پاسخ مشتری",
      "Awaiting customer response",
      "clock",
      "/orders?status=awaiting-customer",
    ],
    [
      "اصلاحات نیازمند اقدام",
      "Revisions requiring action",
      "feedback",
      "/revisions?status=action-needed",
    ],
  ]
  const visibleOrders =
    data?.orders.filter((o) => filter === "all" || o.stage === filter) ?? []
  if (restricted)
    return (
      <div className="ar-safe" dir={locale === "fa" ? "rtl" : "ltr"}>
        <span className="ar-icon-box">
          <ArtistIcon name="user" />
        </span>
        <h1>
          {mode === "expired"
            ? t("نشست پایان یافت", "Session expired")
            : mode === "changed"
              ? t("تخصیص تغییر کرده است", "Assignment changed")
              : t("دسترسی مجاز نیست", "Access denied")}
        </h1>
        <p>
          {t(
            "اطلاعات خصوصی این نما حذف شد. برای دسترسی، مجوز و تخصیص باید دوباره در سرویس بررسی شوند.",
            "Private data has been removed. The service must revalidate your access and assignment.",
          )}
        </p>
        {mode === "expired" ? (
          <a
            className="ar-button primary"
            href={`/${locale}/auth/login?returnTo=${base}`}
          >
            {t("ورود مجدد", "Sign in again")} · AUTH-09
          </a>
        ) : (
          <ArtistButton onClick={() => setMode("normal")}>
            {t("بازگشت به نمونه مجاز", "Return to authorized demo")}
          </ArtistButton>
        )}
      </div>
    )
  return (
    <div className="ar-app" dir={locale === "fa" ? "rtl" : "ltr"}>
      <aside className="ar-sidebar">{navigation}</aside>
      <div className="ar-workspace">
        <header className="ar-header">
          <div className="ar-header-start">
            <button
              className="icon-button ar-menu"
              onClick={() => setDrawer(true)}
              aria-label={t("باز کردن منو", "Open navigation")}
            >
              <ArtistIcon name="menu" />
            </button>
            <span>{t("پنل هنرمند", "Artist panel")}</span>
            <span className="ar-demo-tag">Demo</span>
          </div>
          <div className="ar-header-actions">
            <a href="/" className="ar-store">
              {t("مشاهده فروشگاه", "View store")}
              <ArtistIcon name="link" />
            </a>
            <span className="ar-divider" />
            <button
              className="icon-button ar-bell"
              aria-label={t(
                "اعلان‌ها؛ بدون تغییر وضعیت خواندن",
                "Notifications; does not mark as read",
              )}
              onClick={() =>
                open(t("اعلان‌ها", "Notifications"), "/notifications")
              }
            >
              <ArtistIcon name="bell" />
              <i />
            </button>
            <button
              className="language-button"
              onClick={() => {
                const next = locale === "fa" ? "en" : "fa"
                setLocale(next)
                history.replaceState(null, "", `/${next}/artist`)
                setModal(null)
              }}
            >
              {locale === "fa" ? "EN" : "فارسی"}
            </button>
            <span className="ar-divider" />
            <span className="ar-avatar">S</span>
            <button
              className="ar-account"
              onClick={() =>
                open(t("حساب هنرمند", "Artist account"), "/profile")
              }
            >
              {data ? local(data.artist.name) : "—"}
              <small>{t("هنرمند", "Artist")}</small>
            </button>
            <button
              className="icon-button ar-header-logout"
              onClick={signOut}
              aria-label={t("خروج", "Sign out")}
            >
              <ArtistIcon name="logout" />
            </button>
          </div>
        </header>
        <main className="ar-main">
          <div className="ar-breadcrumb">
            <span>{t("پنل هنرمند", "Artist workspace")}</span>
            <span>/</span>
            <strong>{t("داشبورد", "Dashboard")}</strong>
            <span className="ar-page-id" dir="ltr">
              ART–01
            </span>
          </div>
          <div className="ar-welcome">
            <div>
              <div className="ar-greeting">
                {data
                  ? t(
                      "سلام، " + local(data.artist.name),
                      "Hello, " + local(data.artist.name),
                    )
                  : t("به فضای کارتان خوش آمدید", "Welcome to your workspace")}
                <span className="ar-greeting-line" />
              </div>
              <h1>{t("داشبورد هنرمند", "Artist dashboard")}</h1>
              <p>
                {t(
                  "درخواست‌های بررسی و مراحل اجرای سفارش‌های خود را دنبال کنید.",
                  "Track assessment requests and the progress of your assigned work.",
                )}
              </p>
            </div>
            <ArtistButton onClick={() => setGallery(!gallery)}>
              <ArtistIcon name="grid" />
              {gallery
                ? t("بازگشت به داشبورد", "Back to dashboard")
                : t("مجموعه کامپوننت‌ها", "Component library")}
            </ArtistButton>
          </div>
          <div className="ar-demo-bar">
            <span>
              <span className="ar-demo-tag">Demo</span>
              {t(
                "تمام تخصیص‌ها، مبالغ و موعدها نمونه‌اند؛ اتصال واقعی وجود ندارد.",
                "All assignments, amounts and dates are samples; no live connection.",
              )}
            </span>
            <SelectDropdown
              aria-label={t("حالت پیش‌نمایش", "Preview state")}
              value={mode}
              onChange={(e) => {
                setModal(null)
                setDrawer(false)
                setGallery(false)
                setMode(e.target.value as ArtistPreview)
              }}
            >
              {([
                ["normal", "عادی", "Normal"],
                ["empty", "بدون کار", "No assigned work"],
                ["loading", "بارگذاری", "Loading"],
                ["error", "خطای درآمد", "Earnings error"],
                ["denied", "عدم دسترسی", "Access denied"],
                ["changed", "تغییر تخصیص", "Assignment changed"],
                ["expired", "پایان نشست", "Session expired"],
              ] as const).map(([value, fa, en]) => (
                <option value={value} key={value}>
                  {t(fa, en)}
                </option>
              ))}
            </SelectDropdown>
          </div>
          <div className="ar-freshness">
            <span>
              <span className="ar-status-dot" />
              {data
                ? t("آخرین دریافت نمونه: ", "Sample last loaded: ") +
                  new Date(data.receivedAt).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Tehran",
                  })
                : t("داده‌ای هنوز دریافت نشده", "No data received yet")}{" "}
              · {t("زمان تهران", "Tehran time")}
            </span>
            <button
              className="ar-link"
              disabled={loading}
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              <ArtistIcon name="refresh" />
              {t("تازه‌سازی نمونه", "Refresh sample")}
            </button>
          </div>
          {networkError ? (
            <ArtistError
              locale={locale}
              onRetry={() => setRefreshKey((k) => k + 1)}
            />
          ) : gallery ? (
            <div className="ar-component-library">
              <ArtistPanel
                title={t("کامپوننت‌های پنل هنرمند", "Artist component library")}
                description={t(
                  "الگوهای قابل استفاده مجدد؛ نه صفحات داخلی کامل",
                  "Reusable patterns, not full internal pages",
                )}
              >
                <div className="ar-library-badges">
                  {([
                    "ready",
                    "working",
                    "approval",
                    "revision",
                    "delivery",
                  ] as const).map((stage) => (
                    <StageBadge key={stage} stage={stage} locale={locale} />
                  ))}
                </div>
              </ArtistPanel>
              <div className="ar-library-grid">
                <ArtistPanel
                  title={t(
                    "جزئیات سفارش · نمونه compact",
                    "Order detail · compact sample",
                  )}
                  description="ART-2084 · Demo"
                >
                  {data?.orders[0] && (
                    <>
                      <ArtistOrderCard
                        order={data.orders[0]}
                        locale={locale}
                        onView={() =>
                          open(
                            t("جزئیات سفارش", "Order details"),
                            "/orders/ART-2084",
                          )
                        }
                      />
                      <PrivateImageViewer authorized={false} locale={locale} />
                      <ExecutionTimeline
                        items={[
                          {
                            title: t(
                              "تخصیص و مجوز شروع",
                              "Assigned & authorized",
                            ),
                            time: t(
                              "۱۲ ژوئن ۲۰۲۶ · نمونه",
                              "12 Jun 2026 · sample",
                            ),
                          },
                          {
                            title: t(
                              "تأیید طرح اولیه V1",
                              "Sketch V1 approved",
                            ),
                            time: t(
                              "۱۳ ژوئن ۲۰۲۶ · نمونه",
                              "13 Jun 2026 · sample",
                            ),
                          },
                          {
                            title: t("اجرای رنگ", "Painting in progress"),
                            time: t(
                              "۱۴ ژوئن ۲۰۲۶ · نمونه",
                              "14 Jun 2026 · sample",
                            ),
                            current: true,
                          },
                        ]}
                      />
                    </>
                  )}
                </ArtistPanel>
                <ArtistPanel
                  title={t("نسخه، بازخورد و فرم", "Version, feedback & form")}
                >
                  <VersionFeedbackCard locale={locale} />
                  <SectionedArtistForm locale={locale} />
                </ArtistPanel>
                <ArtistPanel
                  title={t(
                    "جدول / فهرست با فیلتر و صفحه‌بندی",
                    "List with filters & pagination",
                  )}
                >
                  <ArtistListTable
                    orders={data?.orders ?? []}
                    locale={locale}
                    onView={(id) =>
                      open(t("سفارش", "Order") + " " + id, `/orders/${id}`)
                    }
                  />
                </ArtistPanel>
                <ArtistPanel
                  title={t(
                    "آپلود و تأیید اقدام",
                    "Upload & action confirmation",
                  )}
                >
                  <ArtistUpload locale={locale} />
                  <div className="flex flex-wrap gap-3 mt-4">
                    <ArtistButton
                      onClick={() =>
                        setModal({
                          title: t(
                            "تأیید اقدام نمونه",
                            "Sample action confirmation",
                          ),
                          kind: "confirm",
                        })
                      }
                    >
                      {t("Modal تأیید", "Confirmation modal")}
                    </ArtistButton>
                    <ArtistButton
                      onClick={() =>
                        setModal({
                          title: t("ابزارهای نسخه", "Version tools"),
                          kind: "sheet",
                        })
                      }
                    >
                      {t("Bottom sheet", "Bottom sheet")}
                    </ArtistButton>
                  </div>
                  <p className="ar-note">
                    {t(
                      "هیچ تغییری در نسخه، ارزیابی یا وضعیت مالی ذخیره نمی‌شود.",
                      "No version, assessment or financial change is saved.",
                    )}
                  </p>
                </ArtistPanel>
                <ArtistPanel
                  title={t(
                    "Skeleton، Empty و Error",
                    "Skeleton, Empty & Error",
                  )}
                >
                  <ArtistSkeleton rows={1} />
                  <ArtistEmpty
                    title={t("نسخه‌ای ارائه نشده", "No version submitted")}
                  />
                  <ArtistError
                    locale={locale}
                    onRetry={() => setRefreshKey((k) => k + 1)}
                  />
                </ArtistPanel>
                <ArtistPanel
                  title={t(
                    "درخواست بررسی و مبلغ",
                    "Assessment & settlement card",
                  )}
                >
                  {data?.requests[0] && (
                    <AssessmentCard
                      request={data.requests[0]}
                      locale={locale}
                      onReview={() =>
                        open(
                          t("بررسی ارزیابی", "Review assessment"),
                          "/assessments/REQ-0312",
                        )
                      }
                    />
                  )}
                  <ArtistMoneyCard
                    title={t("در انتظار تسویه", "Pending settlement")}
                    value={data?.earnings.pending ?? null}
                    definition={t(
                      "دستمزد ثبت‌شده که هنوز واریز نشده است",
                      "Recorded earnings not yet paid",
                    )}
                    locale={locale}
                  />
                </ArtistPanel>
              </div>
            </div>
          ) : (
            <>
              <section className="ar-attention">
                <div className="ar-section-head">
                  <div>
                    <h2>{t("نیازمند اقدام", "Needs your attention")}</h2>
                    <p>
                      {t(
                        "قدم بعدی شما، در یک نگاه",
                        "Your next steps, at a glance",
                      )}
                    </p>
                  </div>
                  <span className="ar-section-caption">
                    {t(
                      "فقط کارهای تخصیص‌یافته به شما",
                      "Only work assigned to you",
                    )}
                  </span>
                </div>
                {loading ? (
                  <ArtistSkeleton rows={2} />
                ) : empty ? (
                  <ArtistEmpty
                    title={t(
                      "در حال حاضر کاری به شما تخصیص داده نشده است",
                      "No work is currently assigned to you",
                    )}
                    description={t(
                      "درخواست‌ها و سفارش‌های تخصیص‌یافته در این بخش نمایش داده می‌شوند.",
                      "Assigned requests and commissions will appear here.",
                    )}
                    action={link("مشاهده پروفایل", "View profile", "/profile")}
                  />
                ) : (
                  <div className="ar-actions-grid">
                    {actions.map((a) => (
                      <article className={`ar-action ${a.tone}`} key={a.id}>
                        <div className="ar-action-top">
                          <span className="ar-icon-box">
                            <ArtistIcon name={a.icon} />
                          </span>
                          <span dir="ltr" className="ar-code">
                            {a.id}
                          </span>
                        </div>
                        <h3>{a.title}</h3>
                        <p>{a.desc}</p>
                        <ArtistLink onClick={() => open(a.cta, a.route)}>
                          {a.cta}
                        </ArtistLink>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <div className="ar-summary-grid">
                {summaries.map(([fa, en, icon, route], i) => (
                  <button
                    className="ar-summary"
                    key={route}
                    onClick={() => open(t(fa, en), route)}
                  >
                    <span className="ar-summary-icon">
                      <ArtistIcon name={icon} />
                    </span>
                    <div>
                      <span>{t(fa, en)}</span>
                      {loading ? (
                        <span className="ar-skeleton ar-count-skeleton" />
                      ) : (
                        <strong>
                          {counts[i] === undefined
                            ? "—"
                            : new Intl.NumberFormat(locale).format(counts[i]!)}
                        </strong>
                      )}
                    </div>
                    <ArtistIcon name="arrow" />
                  </button>
                ))}
              </div>
              <div className="ar-dashboard-grid">
                <div className="ar-primary-column">
                  <ArtistPanel
                    title={t("سفارش‌های در حال اجرا", "Your commissions")}
                    description={t(
                      "مرحله واقعی سفارش؛ بدون درصد پیشرفت تخمینی",
                      "Order stages, without invented progress percentages",
                    )}
                    action={link("همه سفارش‌ها", "All orders", "/orders")}
                  >
                    <div
                      className="ar-tabs"
                      role="group"
                      aria-label={t("فیلتر سفارش‌ها", "Filter commissions")}
                    >
                      {[
                        ["all", "همه", "All"],
                        ["working", "در حال اجرا", "In progress"],
                        ["approval", "منتظر مشتری", "Awaiting customer"],
                        ["revision", "اصلاحات", "Revisions"],
                      ].map(([value, fa, en]) => (
                        <button
                          key={value}
                          aria-pressed={filter === value}
                          className={filter === value ? "active" : ""}
                          onClick={() => setFilter(value)}
                        >
                          {t(fa, en)}
                        </button>
                      ))}
                    </div>
                    {loading ? (
                      <ArtistSkeleton />
                    ) : !visibleOrders.length ? (
                      <ArtistEmpty
                        title={t(
                          "سفارشی در این بخش نیست",
                          "No orders in this section",
                        )}
                      />
                    ) : (
                      <div className="ar-orders-list">
                        {visibleOrders.slice(0, 4).map((order) => (
                          <ArtistOrderCard
                            order={order}
                            locale={locale}
                            onView={() =>
                              open(
                                t("سفارش", "Order") + " " + order.id,
                                `/orders/${order.id}`,
                              )
                            }
                            key={order.id}
                          />
                        ))}
                      </div>
                    )}
                  </ArtistPanel>
                  <ArtistPanel
                    title={t("درخواست‌های بررسی قیمت", "Assessment requests")}
                    description={t(
                      "این درخواست‌ها هنوز لزوماً پرداخت‌شده یا آماده اجرا نیستند.",
                      "These requests are not necessarily paid or ready for execution.",
                    )}
                    action={link(
                      "همه درخواست‌ها",
                      "All requests",
                      "/assessments?status=pending",
                    )}
                  >
                    {loading ? (
                      <ArtistSkeleton rows={2} />
                    ) : !data?.requests.length ? (
                      <ArtistEmpty
                        title={t(
                          "درخواستی منتظر بررسی شما نیست",
                          "No requests await your assessment",
                        )}
                      />
                    ) : (
                      <>
                        <div className="ar-assessments-grid">
                          {data.requests.map((request) => (
                            <AssessmentCard
                              key={request.id}
                              request={request}
                              locale={locale}
                              onReview={() =>
                                open(
                                  t("بررسی ارزیابی", "Review assessment"),
                                  `/assessments/${request.id}`,
                                )
                              }
                            />
                          ))}
                        </div>
                        <p className="ar-note">
                          <ArtistIcon name="alert" />
                          {t(
                            "AI فقط ضریب اولیه پیشنهاد می‌کند؛ تأیید یا اصلاح با دلیل در صفحه بررسی انجام می‌شود.",
                            "AI only suggests an initial factor; confirmation or reasoned changes happen on the review page.",
                          )}
                        </p>
                      </>
                    )}
                  </ArtistPanel>
                  <ArtistPanel
                    title={t(
                      "اصلاحات و پاسخ مشتری",
                      "Revisions & customer response",
                    )}
                    action={link(
                      "مشاهده اصلاحات",
                      "View revisions",
                      "/revisions",
                    )}
                  >
                    {loading ? (
                      <ArtistSkeleton rows={1} />
                    ) : revision ? (
                      <>
                        <VersionFeedbackCard locale={locale} />
                        {link(
                          "مشاهده بازخورد نسخه V2",
                          "View version V2 feedback",
                          `/orders/${revision.id}/revisions?version=V2`,
                        )}
                      </>
                    ) : (
                      <ArtistEmpty
                        title={t(
                          "اصلاحات نیازمند اقدامی نیست",
                          "No revisions require action",
                        )}
                      />
                    )}
                  </ArtistPanel>
                </div>
                <aside className="ar-secondary-column">
                  <ArtistPanel
                    title={t("تحویل‌های پیش رو", "Upcoming deliveries")}
                    description={t(
                      "موعدهای توافق‌شده · تقویم نمونه",
                      "Agreed dates · sample calendar",
                    )}
                    className="ar-deliveries"
                  >
                    {loading ? (
                      <ArtistSkeleton rows={2} />
                    ) : empty ? (
                      <ArtistEmpty
                        title={t("موعدی ثبت نشده است", "No deadlines recorded")}
                      />
                    ) : (
                      <>
                        {data?.orders
                          .filter((o) => o.due)
                          .sort((a, b) => a.due!.localeCompare(b.due!))
                          .slice(0, 3)
                          .map((order) => (
                            <button
                              className="ar-deadline"
                              key={order.id}
                              onClick={() =>
                                open(
                                  t("موعد سفارش", "Order deadline"),
                                  `/orders/${order.id}`,
                                )
                              }
                            >
                              <span className="ar-date-tile">
                                <strong>
                                  {new Date(order.due!).toLocaleDateString(
                                    locale === "fa" ? "fa-IR" : "en-GB",
                                    { day: "numeric", timeZone: "Asia/Tehran" },
                                  )}
                                </strong>
                                <small>
                                  {new Date(order.due!).toLocaleDateString(
                                    locale === "fa" ? "fa-IR" : "en-GB",
                                    { month: "short", timeZone: "Asia/Tehran" },
                                  )}
                                </small>
                              </span>
                              <div>
                                <span dir="ltr" className="ar-code">
                                  {order.id}
                                </span>
                                <strong>{local(order.title)}</strong>
                                <StageBadge
                                  stage={order.stage}
                                  locale={locale}
                                />
                              </div>
                            </button>
                          ))}
                        <p className="ar-note">
                          {t(
                            "مبنای زمانی Demo: ۱۴ ژوئن ۲۰۲۶. سفارش بدون موعد در این فهرست نیست.",
                            "Demo date basis: 14 Jun 2026. Orders without deadlines are excluded.",
                          )}
                        </p>
                      </>
                    )}
                  </ArtistPanel>
                  {(!data || data.artist.earningsAllowed) && (
                    <ArtistPanel
                      title={t(
                        "درآمد و تسویه شما",
                        "Your earnings & settlements",
                      )}
                      description={t(
                        "فقط دستمزد هنرمند جاری · تومان",
                        "Only the current artist's earnings · toman",
                      )}
                      className="ar-earnings"
                    >
                      {earningsError ? (
                        <ArtistError
                          locale={locale}
                          onRetry={() => setEarningsError(false)}
                        />
                      ) : loading ? (
                        <ArtistSkeleton rows={2} />
                      ) : (
                        <>
                          {[
                            [
                              t("دستمزد ثبت‌شده", "Recorded earnings"),
                              data?.earnings.recorded,
                              t(
                                "دستمزد قطعی ثبت‌شده؛ نه قیمت فروش مشتری",
                                "Confirmed recorded fees, not customer sales prices",
                              ),
                            ],
                            [
                              t("در انتظار تسویه", "Pending settlement"),
                              data?.earnings.pending,
                              t(
                                "بخش ثبت‌شده که هنوز واریز نشده است",
                                "Recorded amount not yet paid",
                              ),
                            ],
                            [
                              t("تسویه تکمیل‌شده", "Completed settlements"),
                              data?.earnings.settled,
                              t(
                                "واریز تکمیل‌شده طبق داده نمونه",
                                "Completed payouts in the sample dataset",
                              ),
                            ],
                          ].map(([title, value, definition]) => (
                            <ArtistMoneyCard
                              key={String(title)}
                              title={String(title)}
                              value={typeof value === "number" ? value : null}
                              definition={String(definition)}
                              locale={locale}
                            />
                          ))}
                        </>
                      )}
                      {link(
                        "مشاهده درآمد و تسویه",
                        "View earnings & settlements",
                        "/earnings",
                      )}
                    </ArtistPanel>
                  )}
                  <ArtistPanel
                    title={t("رویدادهای مرتبط", "Your recent activity")}
                    description={t(
                      "زمان‌ها نمونه‌اند؛ اعلان‌ها خودکار خوانده نمی‌شوند.",
                      "Sample times; notifications are not auto-read.",
                    )}
                  >
                    {loading ? (
                      <ArtistSkeleton rows={2} />
                    ) : (
                      <div className="ar-events">
                        {[
                          [
                            t(
                              "بازخورد نسخه V2 ثبت شد",
                              "Feedback on V2 received",
                            ),
                            "ART-2081",
                            t("۱۴ ژوئن · ۱۰:۱۵", "14 Jun · 10:15"),
                            "/orders/ART-2081/revisions?version=V2",
                          ],
                          [
                            t(
                              "درخواست ارزیابی تخصیص یافت",
                              "Assessment request assigned",
                            ),
                            "REQ-0312",
                            t("۱۴ ژوئن · ۱۲:۵۰", "14 Jun · 12:50"),
                            "/assessments/REQ-0312",
                          ],
                          [
                            t(
                              "تسویه نمونه تکمیل شد",
                              "Sample settlement completed",
                            ),
                            "SET-008",
                            t("۱۲ ژوئن · ۱۱:۰۰", "12 Jun · 11:00"),
                            "/earnings",
                          ],
                        ]
                          .filter((_, i) => !empty || i === 2)
                          .map(([title, id, time, route]) => (
                            <button key={id} onClick={() => open(title, route)}>
                              <span className="ar-event-dot" />
                              <div>
                                <strong>{title}</strong>
                                <small>
                                  <bdi>{id}</bdi> · {time}
                                </small>
                              </div>
                              <ArtistIcon name="arrow" />
                            </button>
                          ))}
                      </div>
                    )}
                  </ArtistPanel>
                </aside>
              </div>
            </>
          )}
          <footer className="ar-footer">
            <span>
              nilart. <span>/</span>
              {t(
                "فضایی برای خلق، با خیال آسوده",
                "A little more space to create.",
              )}
            </span>
            <span>
              {t(
                "ART-01 · پنل خصوصی هنرمند · Demo",
                "ART-01 · private artist workspace · Demo",
              )}
            </span>
          </footer>
        </main>
      </div>
      <dialog
        className="ar-drawer"
        ref={drawerRef}
        onCancel={() => setDrawer(false)}
        aria-label={t("منوی هنرمند", "Artist navigation")}
      >
        <button
          className="icon-button ar-drawer-close"
          aria-label={t("بستن منو", "Close navigation")}
          onClick={() => setDrawer(false)}
        >
          <ArtistIcon name="close" />
        </button>
        {navigation}
      </dialog>
      <ArtistModal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.title ?? ""}
        sheet={modal?.kind === "sheet"}
      >
        {modal?.route ? (
          <>
            <span className="ar-demo-tag">Demo</span>
            <p className="ar-modal-copy">
              {t(
                "مقصد مستقل این CTA مشخص است. صفحه داخلی در این تسک ساخته نشده؛ هیچ ارزیابی، شروع اجرا یا عملیات مالی انجام نشده است.",
                "This CTA has a defined independent destination. Internal pages are outside this task; no assessment, execution start or financial action has occurred.",
              )}
            </p>
            <code className="ar-route" dir="ltr">
              {modal.route}
            </code>
          </>
        ) : (
          <>
            <p className="ar-modal-copy">
              {t(
                "این الگوی تأیید فقط برای بررسی رابط است؛ هیچ داده‌ای تغییر نمی‌کند.",
                "This confirmation pattern is for interface review only; no data is changed.",
              )}
            </p>
            <ArtistButton onClick={() => setModal(null)}>
              {t("بستن نمونه", "Close sample")}
            </ArtistButton>
          </>
        )}
        <ArtistButton kind="primary" onClick={() => setModal(null)}>
          {t("بازگشت به پنل", "Back to workspace")}
        </ArtistButton>
      </ArtistModal>
    </div>
  )
}
