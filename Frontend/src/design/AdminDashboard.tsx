import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useRef, useState, type ReactNode } from "react"
import "./admin.css"
import OrdersPage from "./OrdersPage"
import FinancePage from "./FinancePage"
import OperationsPage from "./OperationsPage"

type Role = "owner" | "warehouse" | "finance"
function Glyph({ name = "grid" }: { name?: string }) {
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
    bag: (
      <>
        <path d="M5 7h14l1 14H4L5 7ZM8 7V5a4 4 0 0 1 8 0v2" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v18h17M8 16v-5m5 5V7m5 9V4" />
      </>
    ),
    brush: (
      <>
        <path d="m10 14 9-11 3 3-11 9M10 14c-7-2-2 7-8 7 6 2 12-1 8-7Z" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 6" />
      </>
    ),
    bell: (
      <>
        <path d="M5 16h14l-2-3V8a5 5 0 0 0-10 0v5l-2 3Zm5 4h4" />
      </>
    ),
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    refresh: (
      <>
        <path d="M20 9a8 8 0 1 0 0 6M20 3v6h-6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4m10-4v4M3 11h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    alert: (
      <>
        <path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v1" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    link: (
      <>
        <path d="M14 3h7v7m0-7L10 14M11 5H4v15h15v-7" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H4v16h6m4-4 4-4-4-4m-6 4h12" />
      </>
    ),
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.grid}
    </svg>
  )
}

export default function AdminDashboard({live}: {live?: {path:string;title:string;children:ReactNode;navigate:(path:string)=>void;permissions:readonly string[]}} = {}) {
  const [en, setEn] = useState(location.pathname.startsWith("/en/"))
  const [role, setRole] = useState<Role>("owner")
  const [mode, setMode] = useState("normal")
  const [period, setPeriod] = useState("30")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [updated, setUpdated] = useState<Date | null>(new Date())
  const [loading, setLoading] = useState(false)
  const [priceError, setPriceError] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [table, setTable] = useState(false)
  const [destination, setDestination] = useState<{
    title: string
    route: string
  } | null>(null)
  const [session, setSession] = useState(true)
  const [adminPath, setAdminPath] = useState(location.pathname)
  const isOrders = /^\/(fa|en)\/admin\/orders\/?$/.test(adminPath)
  const isFinance = /^\/(fa|en)\/admin\/finance\/?$/.test(adminPath)
  const isOperations = /^\/(fa|en)\/admin\/inventory\/?$/.test(adminPath)
  const dialog = useRef<HTMLDialogElement>(null)
  const drawerDialog = useRef<HTMLDialogElement>(null)
  const generation = useRef(0)
  const t = (fa: string, english: string) => (en ? english : fa)
  const num = (n: number) => new Intl.NumberFormat(en ? "en" : "fa").format(n)
  const financial = role !== "warehouse"
  const operational = role !== "finance"
  const empty = mode === "empty"
  const busy = loading || mode === "loading"
  useEffect(() => {
    document.documentElement.lang = en ? "en" : "fa"
    document.documentElement.dir = en ? "ltr" : "rtl"
  }, [en])
  useEffect(() => {
    if (destination) dialog.current?.showModal()
    else dialog.current?.close()
  }, [destination])
  useEffect(() => {
    if (drawer) drawerDialog.current?.showModal()
    else drawerDialog.current?.close()
  }, [drawer])
  useEffect(() => {
    const back = () => {
      setEn(location.pathname.startsWith("/en/"))
      setAdminPath(location.pathname)
      setDestination(null)
    }
    addEventListener("popstate", back)
    return () => removeEventListener("popstate", back)
  }, [])
  const base = `/${en ? "en" : "fa"}/admin`
  function open(title: string, route: string) {
    if (
      ["/orders", "/finance", "/inventory", ""].includes(route.split("?")[0])
    ) {
      const path = base + route
      history.pushState(null, "", path)
      setAdminPath(path.split("?")[0])
      setDestination(null)
      setDrawer(false)
      return
    }
    setDestination({ title, route: base + route })
    setDrawer(false)
  }
  function refresh() {
    const id = ++generation.current
    setLoading(true)
    setTimeout(() => {
      if (generation.current === id) {
        setLoading(false)
        setUpdated(new Date())
      }
    }, 650)
  }
  const action = (label: string, route: string) => (
    <button className="ad-link" onClick={() => open(label, route)}>
      {label}
      <Glyph name="arrow" />
    </button>
  )
  const badge = (label: string, tone = "") => (
    <span className={`ad-badge ${tone}`}>{label}</span>
  )
  const panelTitle = (
    title: string,
    subtitle: string,
    link?: string,
    route?: string,
  ) => (
    <div className="ad-panel-head">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {link && action(link, route || "")}
    </div>
  )
  const groups = [
    [
      t("فروش و سفارش", "Sales & orders"),
      "bag",
      [
        ["سفارش‌ها", "Orders", "/orders"],
        ["پرداخت‌ها و بازپرداخت‌ها", "Payments & refunds", "/payments"],
        ["ارسال و مرجوعی", "Shipping & returns", "/shipping"],
        ["پشتیبانی", "Support", "/support"],
      ],
      true,
    ],
    [
      t("کاتالوگ", "Catalog"),
      "box",
      [
        ["کالکشن‌ها و دسته‌ها", "Collections & categories", "/collections"],
        ["محصولات و SKU", "Products & SKUs", "/products"],
        ["پکیج‌ها", "Packages", "/packages"],
        ["نقاشی‌های آماده", "Ready artworks", "/artworks"],
        ["تخفیف‌ها", "Discounts", "/discounts"],
        ["رسانه و محتوا", "Media & content", "/media"],
      ],
      role === "owner",
    ],
    [
      t("هزینه و قیمت", "Cost & pricing"),
      "chart",
      [
        ["مواد و خدمات", "Materials & services", "/materials"],
        ["فرمول ساخت", "Recipes", "/recipes"],
        ["هزینه‌یابی", "Costing", "/costing"],
        ["صف بازبینی قیمت", "Price review queue", "/price-review"],
      ],
      financial,
    ],
    [
      t("عملیات", "Operations"),
      "box",
      [
        ["موجودی و انبار", "Inventory", "/inventory"],
        [
          "گردش و رزرو",
          "Stock movements and reservations",
          "/inventory/movements",
        ],
        [
          "موجودی افتتاحیه و اصلاح",
          "Opening stock and adjustments",
          "/inventory/adjustments",
        ],
        ["تأمین‌کنندگان", "Suppliers", "/inventory/suppliers"],
        ["خریدها", "Purchases", "/inventory/purchases"],
        [
          "دریافت و برگشت خرید",
          "Purchase receipts and returns",
          "/inventory/receipts",
        ],
        ["دستورهای تولید", "Production orders", "/inventory/production-orders"],
        ["بچ‌های تولید", "Production batches", "/inventory/batches"],
        ["کنترل کیفیت", "Quality control", "/inventory/quality"],
        ["ضایعات و خرابی", "Waste and damage", "/inventory/waste"],
      ],
      true,
    ],
    [
      t("مالی", "Finance"),
      "chart",
      [
        ["نمای مالی", "Finance overview", "/finance"],
        [
          "دریافت و پرداخت",
          "Receipts and payments",
          "/finance/receipts-payments",
        ],
        ["بانک و صندوق", "Bank and cash accounts", "/finance/accounts"],
        ["هزینه‌های جاری", "Operating expenses", "/finance/expenses"],
        ["بدهی و مطالبات", "Payables and receivables", "/finance/balances"],
        ["تراکنش‌های پرداخت", "Payment transactions", "/finance/transactions"],
        ["تسویه درگاه", "Gateway settlements", "/finance/settlements"],
        ["بازپرداخت‌ها", "Refunds", "/finance/refunds"],
        ["گزارش سود", "Profit reports", "/finance/profit"],
        ["جریان نقدی", "Cash flow", "/finance/cash-flow"],
        [
          "گزارش ارزش موجودی و تولید",
          "Inventory and production value",
          "/finance/inventory-value",
        ],
        ["خروجی حسابدار", "Accounting exports", "/finance/exports"],
      ],
      financial,
    ],
    [
      t("هنرمندان", "Artists"),
      "brush",
      [
        ["هنرمندان", "Artists", "/artists"],
        ["درخواست‌های سفارشی و تخصیص", "Requests & allocation", "/commissions"],
        ["تسویه هنرمند", "Artist settlements", "/artist-settlements"],
      ],
      role === "owner",
    ],
    [
      t("سیستم", "System"),
      "users",
      [
        ["کاربران", "Users", "/users"],
        ["نقش‌ها و مجوزها", "Roles & permissions", "/roles"],
        ["تنظیمات", "Settings", "/settings"],
        ["لاگ فعالیت", "Activity log", "/activity"],
      ],
      role === "owner",
    ],
  ] as const
  const navigation = (
    <>
      <div className="ad-brand">
        <span className="wordmark">
          <span>
            nilart<span className="wordmark-dot">.</span>
          </span>
          <small>ART, IN EVERY DETAIL</small>
        </span>
        <span className="ad-brand-caption">
          {t("پنل مدیریت نیل‌آرت", "NilArt administration")}
        </span>
      </div>
      <nav aria-label={t("ناوبری مدیریت", "Admin navigation")}>
        <button
          className={
            !isOrders && !isFinance && !isOperations ? "ad-nav-active" : ""
          }
          aria-current={
            !isOrders && !isFinance && !isOperations ? "page" : undefined
          }
          onClick={() => open(t("داشبورد", "Dashboard"), "")}
        >
          <Glyph />
          {t("داشبورد", "Dashboard")}
          {!isOrders && !isFinance && !isOperations && (
            <span className="ad-active-dot" />
          )}
        </button>
        {groups
          .filter((g) => g[3])
          .map(([title, icon, items]) => (
            <details
              key={title}
              open={
                isOperations
                  ? title === t("عملیات", "Operations")
                  : isFinance
                    ? title === t("مالی", "Finance")
                    : title === t("فروش و سفارش", "Sales & orders")
              }
            >
              <summary>
                <Glyph name={icon} />
                <span>{title}</span>
                <Glyph name="chevron" />
              </summary>
              <div>
                {items
                  .filter(
                    (i) =>
                      role === "owner" ||
                      (role === "warehouse"
                        ? !["/payments", "/support"].includes(i[2])
                        : !["/shipping", "/support"].includes(i[2])),
                  )
                  .map(([fa, english, route]) => (
                    <button
                      key={route}
                      className={
                        (isOrders && route === "/orders") ||
                        (isFinance && route === "/finance") ||
                        (isOperations && route === "/inventory")
                          ? "ad-nav-active"
                          : ""
                      }
                      aria-current={
                        (isOrders && route === "/orders") ||
                        (isFinance && route === "/finance") ||
                        (isOperations && route === "/inventory")
                          ? "page"
                          : undefined
                      }
                      onClick={() => open(t(fa, english), route)}
                    >
                      {t(fa, english)}
                    </button>
                  ))}
              </div>
            </details>
          ))}
      </nav>
      <div className="ad-sidebar-bottom">
        <span className="ad-avatar">ن</span>
        <div>
          <strong>{t("فضای کار نیل‌آرت", "NilArt workspace")}</strong>
          <small>
            {t("هنر، با نظم بیشتر", "A little more order, for art")}
          </small>
        </div>
      </div>
    </>
  )
  const attention = [
    {
      title: t("پرداخت نیازمند بررسی", "Payments to review"),
      count: 3,
      desc: t(
        "۲ نامشخص · ۱ موفق، بدون تخصیص موجودی",
        "2 unknown · 1 paid, stock unallocated",
      ),
      cta: t("بررسی پرداخت‌ها", "Review payments"),
      route: "/payments?status=needs-review",
      icon: "alert",
      tone: "danger",
      show: financial,
    },
    {
      title: t("بازبینی قیمت", "Price review"),
      count: 12,
      desc: t(
        "۹ SKU و ۳ پکیج · ۲ هزینه‌یابی ناقص",
        "9 SKUs & 3 packages · 2 incomplete costs",
      ),
      cta: t("بازبینی قیمت‌ها", "Review prices"),
      route: "/price-review?status=pending",
      icon: "chart",
      tone: "warm",
      show: financial,
    },
    {
      title: t("کمبود موجودی و مواد", "Stock & material shortages"),
      count: 7,
      desc: t(
        "۴ محصول · ۳ ماده زیر حد هشدار",
        "4 products · 3 materials below thresholds",
      ),
      cta: t("مشاهده کمبودها", "View shortages"),
      route: "/inventory?filter=shortages",
      icon: "box",
      tone: "warm",
      show: operational,
    },
    {
      title: t("سفارش آماده ارسال", "Orders ready to ship"),
      count: 8,
      desc: t(
        "پرداخت تأییدشده و موجودی تخصیص‌یافته",
        "Payment verified & stock allocated",
      ),
      cta: t("مشاهده سفارش‌ها", "View orders"),
      route: "/orders?status=ready-to-ship",
      icon: "bag",
      tone: "green",
      show: operational,
    },
  ].filter((a) => a.show)
  const metrics = [
    [
      t("فروش خالص", "Net sales"),
      128450000,
      t(
        "فروش پس از تخفیف و مرجوعی؛ بدون مالیات و ارسال",
        "Sales less discounts and returns; excludes tax & shipping",
      ),
      "chart",
    ],
    [
      t("سفارش پرداخت‌تأییدشده", "Verified paid orders"),
      86,
      t(
        "تعداد سفارش یکتا، نه اقلام و مرسوله‌ها",
        "Unique orders, not items or shipments",
      ),
      "bag",
    ],
    [
      t("میانگین مبلغ سفارش", "Average order value"),
      1493605,
      t(
        "فروش خالص ÷ سفارش‌های پرداخت‌تأییدشده",
        "Net sales ÷ verified paid orders",
      ),
      "box",
    ],
    [
      t("سود تحقق‌یافته", "Realized profit"),
      32480000,
      t(
        "پس از خروج کالا و هزینه ثبت‌شده؛ هزینه تولید یک‌بار",
        "After dispatch & posted costs; production cost counted once",
      ),
      "chart",
    ],
  ] as const
  const orders = [
    [
      "NA-1048",
      t("۲۱ خرداد، ۱۰:۳۲", "Jun 11, 10:32"),
      t("دفتر باغ خیال + نشان‌کتاب", "Garden notebook + bookmark"),
      t("کالای آماده", "Ready goods"),
      t("نامشخص", "Unknown"),
      t("در انتظار تطبیق", "Reconciliation needed"),
      "danger",
      "unknown",
    ],
    [
      "NA-1047",
      t("۲۱ خرداد، ۰۹:۴۵", "Jun 11, 09:45"),
      t("پکیج روزهای آرام", "Quiet days package"),
      t("کالای آماده", "Ready goods"),
      t("موفق، دیرهنگام", "Late success"),
      t("بدون تخصیص موجودی", "Stock unallocated"),
      "warm",
      "unallocated",
    ],
    [
      "NA-1046",
      t("۲۰ خرداد، ۱۷:۱۲", "Jun 10, 17:12"),
      t("نقاشی آبی آرام + کارت", "Quiet blue artwork + card"),
      t("مختلط", "Mixed"),
      t("تأییدشده", "Verified"),
      t("آماده ارسال", "Ready to ship"),
      "green",
      "ready-to-ship",
    ],
    [
      "NA-1045",
      t("۲۰ خرداد، ۱۵:۰۸", "Jun 10, 15:08"),
      t("نقاشی سفارشی، پرتره", "Custom portrait"),
      t("نقاشی سفارشی", "Custom artwork"),
      t("تأییدشده", "Verified"),
      t("منتظر تخصیص هنرمند", "Awaiting artist"),
      "green",
      "awaiting-artist",
    ],
  ]
  if (live) {
    const liveBase=`/${live.path.startsWith("/en/")?"en":"fa"}/admin`
    const allowedGroups=["orders.read_all","catalog.manage","pricing.publish","inventory.manage","finance.read","commissions.manage","identity.manage"]
    const sidebar=<><div className="ad-brand"><span className="wordmark"><span>nilart<span className="wordmark-dot">.</span></span><small>ART, IN EVERY DETAIL</small></span><span className="ad-brand-caption">{t("پنل مدیریت نیل‌آرت","NilArt administration")}</span></div><nav aria-label={t("ناوبری مدیریت","Admin navigation")}><button onClick={()=>live.navigate(liveBase)}><Glyph/>{t("داشبورد","Dashboard")}</button>{groups.filter((_,index)=>live.permissions.includes(allowedGroups[index])).map(([title,icon,items])=><details key={title} open={title===t("سیستم","System")}><summary><Glyph name={icon}/><span>{title}</span><Glyph name="chevron"/></summary><div>{items.map(([fa,english,route])=><button key={route} className={live.path===liveBase+route?"ad-nav-active":""} aria-current={live.path===liveBase+route?"page":undefined} onClick={()=>{setDrawer(false);live.navigate(liveBase+route)}}>{t(fa,english)}</button>)}</div></details>)}</nav><div className="ad-sidebar-bottom"><span className="ad-avatar">ن</span><div><strong>{t("فضای کار نیل‌آرت","NilArt workspace")}</strong><small>{t("هنر، با نظم بیشتر","A little more order, for art")}</small></div></div></>
    return <div className="ad-app" dir={en?"ltr":"rtl"}><aside className="ad-sidebar">{sidebar}</aside><div className="ad-workspace"><header className="ad-topbar"><div className="ad-top-start"><button className="icon-button ad-mobile-menu" aria-label={t("باز کردن منو","Open menu")} onClick={()=>setDrawer(true)}><Glyph name="menu"/></button><span>{t("مدیریت کسب‌وکار","Business management")}</span></div><div className="ad-top-actions"><a className="ad-store" href={en?"/en":"/fa"}>{t("مشاهده فروشگاه","View store")}<Glyph name="link"/></a><button className="language-button" onClick={()=>live.navigate(live.path.replace(/^\/(fa|en)/,en?"/fa":"/en"))}>{en?"فارسی":"EN"}</button><a className="icon-button ad-logout" href={`/${en?"en":"fa"}/auth/logout`} aria-label={t("خروج از حساب","Sign out")}><Glyph name="logout"/></a></div></header><main className="ad-main"><div className="ad-panel-head"><div><h1>{live.title}</h1></div></div>{live.children}</main></div><dialog ref={drawerDialog} className="ad-drawer" onCancel={()=>setDrawer(false)}><button className="icon-button" aria-label={t("بستن منو","Close menu")} onClick={()=>setDrawer(false)}><Glyph name="close"/></button>{sidebar}</dialog></div>
  }
  if (!session)
    return (
      <div className="ad-session" dir={en ? "ltr" : "rtl"}>
        <Glyph name="users" />
        <h1>{t("نشست پایان یافت", "Session ended")}</h1>
        <p>
          {t(
            "داده‌های خصوصی از این نما حذف شدند. برای ادامه وارد شوید.",
            "Private data has been removed. Sign in to continue.",
          )}
        </p>
        <a
          className="button primary"
          href={`/${en ? "en" : "fa"}/auth/login?returnTo=${base}`}
        >
          {t("ورود به حساب", "Sign in")} · AUTH-09
        </a>
      </div>
    )
  return (
    <div
      className={`ad-app${isOrders ? " ad-order-shell" : ""}${
        isFinance ? " ad-finance-shell" : ""
      }${isOperations ? " ad-operations-shell" : ""}`}
      dir={en ? "ltr" : "rtl"}
    >
      <aside className="ad-sidebar">{navigation}</aside>
      <div className="ad-workspace">
        <header className="ad-topbar">
          <div className="ad-top-start">
            <button
              className="icon-button ad-mobile-menu"
              aria-label={t("باز کردن منو", "Open menu")}
              onClick={() => setDrawer(true)}
            >
              <Glyph name="menu" />
            </button>
            <span>{t("مدیریت کسب‌وکار", "Business management")}</span>
            {badge("Demo", "warm")}
          </div>
          <div className="ad-top-actions">
            <a className="ad-store" href={en ? "/en" : "/"}>
              {t("مشاهده فروشگاه", "View store")}
              <Glyph name="link" />
            </a>
            <span className="ad-top-divider" />
            <button
              className="icon-button"
              aria-label={t("اعلان‌های عملیاتی", "Operational notifications")}
              onClick={() =>
                open(
                  t("اعلان‌های عملیاتی", "Operational notifications"),
                  "/notifications",
                )
              }
            >
              <Glyph name="bell" />
              <i />
            </button>
            <button
              className="language-button"
              onClick={() => {
                const next = !en
                setEn(next)
                const nextPath = `/${next ? "en" : "fa"}/admin${
                  isOrders
                    ? "/orders"
                    : isFinance
                      ? "/finance"
                      : isOperations
                        ? "/inventory"
                        : ""
                }`
                history.replaceState(null, "", nextPath)
                setAdminPath(nextPath)
                setDestination(null)
              }}
            >
              {en ? "فارسی" : "EN"}
            </button>
            <span className="ad-top-divider" />
            <span className="ad-avatar">{t("ن", "N")}</span>
            <label className="ad-role">
              <span>{t("مدیر نیل‌آرت", "NilArt manager")}</span>
              <SelectDropdown
                aria-label={t("نقش نمایشی Demo", "Demo role")}
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as Role)
                  setDestination(null)
                }}
              >
                <option value="owner">
                  {t("مالک · Demo", "Owner · Demo")}
                </option>
                <option value="warehouse">
                  {t("انبار · Demo", "Warehouse · Demo")}
                </option>
                <option value="finance">
                  {t("مالی · Demo", "Finance · Demo")}
                </option>
              </SelectDropdown>
            </label>
            <button
              className="icon-button ad-logout"
              aria-label={t("خروج از حساب", "Sign out")}
              onClick={() => {
                setSession(false)
                setDestination(null)
                setDrawer(false)
              }}
            >
              <Glyph name="logout" />
            </button>
          </div>
        </header>
        <main className="ad-main">
          {isOrders ? (
            <OrdersPage
              en={en}
              role={role}
              onNavigate={open}
              onSessionExpired={() => {
                setSession(false)
                setDestination(null)
                setDrawer(false)
              }}
            />
          ) : isFinance ? (
            <FinancePage
              en={en}
              role={role}
              onNavigate={open}
              onSessionExpired={() => {
                setSession(false)
                setDestination(null)
                setDrawer(false)
              }}
            />
          ) : isOperations ? (
            <OperationsPage
              en={en}
              role={role}
              onNavigate={open}
              onSessionExpired={() => {
                setSession(false)
                setDestination(null)
                setDrawer(false)
              }}
            />
          ) : (
            <>
              <div className="ad-breadcrumb">
                {t("پنل مدیریت", "Administration")}
                <span>/</span>
                <strong>{t("داشبورد", "Dashboard")}</strong>
                <span className="ad-page-id">ADM–01</span>
              </div>
              <div className="ad-heading">
                <div>
                  <h1>{t("داشبورد مدیریت", "Management dashboard")}</h1>
                  <p>
                    {t(
                      "وضعیت کسب‌وکار و کارهای نیازمند رسیدگی را بررسی کنید.",
                      "Review business activity and tasks that need attention.",
                    )}
                  </p>
                </div>
                <div className="ad-period">
                  <Glyph name="calendar" />
                  <SelectDropdown
                    aria-label={t("بازه زمانی", "Reporting period")}
                    value={period}
                    onChange={(e) => {
                      generation.current++
                      setLoading(false)
                      setPeriod(e.target.value)
                    }}
                  >
                    <option value="1">{t("امروز", "Today")}</option>
                    <option value="7">{t("۷ روز اخیر", "Last 7 days")}</option>
                    <option value="30">
                      {t("۳۰ روز اخیر", "Last 30 days")}
                    </option>
                    <option value="custom">
                      {t("بازه سفارشی", "Custom range")}
                    </option>
                  </SelectDropdown>
                </div>
              </div>
              {period === "custom" && (
                <div className="ad-custom">
                  <label>
                    {t("از", "From")}
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </label>
                  <label>
                    {t("تا", "To")}
                    <input
                      type="date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </label>
                  {(!start || !end || start > end) && (
                    <span role="alert">
                      {t(
                        "بازه کامل و معتبر انتخاب کنید؛ شروع نباید بعد از پایان باشد.",
                        "Choose a complete valid range; start must not follow end.",
                      )}
                    </span>
                  )}
                </div>
              )}
              <div className="ad-meta">
                <span>
                  <span className="ad-live-dot" />
                  {t("آخرین دریافت داده نمونه:", "Sample data last loaded:")}{" "}
                  {updated?.toLocaleTimeString(en ? "en" : "fa", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Tehran",
                  })}{" "}
                  · {t("زمان تهران", "Tehran time")}
                </span>
                <button onClick={refresh} disabled={busy}>
                  <Glyph name="refresh" />
                  {t("تازه‌سازی نمونه", "Refresh sample")}
                </button>
              </div>
              <div className="ad-demo-note">
                <span>
                  {badge("Demo")}
                  {t(
                    "داده‌های این صفحه نمونه‌اند؛ اتصال واقعی به فروش، مالی یا انبار وجود ندارد.",
                    "All figures are samples. No live sales, finance or inventory connection.",
                  )}
                </span>
                <SelectDropdown
                  aria-label={t("حالت نمایشی", "Preview state")}
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value)
                    setPriceError(e.target.value === "error")
                  }}
                >
                  <option value="normal">
                    {t("نمای عادی", "Normal view")}
                  </option>
                  <option value="loading">
                    {t("در حال دریافت", "Loading")}
                  </option>
                  <option value="empty">{t("بدون فعالیت", "Empty")}</option>
                  <option value="error">
                    {t("خطای بخش قیمت", "Price widget error")}
                  </option>
                </SelectDropdown>
              </div>
              <section className="ad-attention">
                {panelTitle(
                  t("نیازمند رسیدگی", "Needs attention"),
                  t(
                    "صف کارهای باز · مستقل از بازه زمانی گزارش",
                    "Open tasks · current snapshot, independent of report period",
                  ),
                )}
                <div className="ad-attention-grid">
                  {attention.map((a) => (
                    <article
                      className={`ad-action-card ${a.tone}`}
                      key={a.route}
                    >
                      <div className="ad-action-top">
                        <span className="ad-icon-tile">
                          <Glyph name={a.icon} />
                        </span>
                        <span className="ad-count">
                          {busy ? "—" : num(empty ? 0 : a.count)}
                        </span>
                      </div>
                      <h3>{a.title}</h3>
                      <p>
                        {busy
                          ? t("در حال دریافت…", "Loading…")
                          : empty
                            ? t("مورد باز وجود ندارد.", "No open items.")
                            : a.desc}
                      </p>
                      {action(a.cta, a.route)}
                    </article>
                  ))}
                </div>
                <div className="ad-other-tasks">
                  {financial &&
                    action(
                      t("۱ بازپرداخت نیازمند بررسی", "1 refund needs review"),
                      "/payments?status=refund-review",
                    )}
                  {operational &&
                    action(
                      t(
                        "۲ مرجوعی منتظر تصمیم / QC",
                        "2 returns awaiting decision / QC",
                      ),
                      "/shipping?status=return-review",
                    )}
                  {role === "owner" && (
                    <>
                      {action(
                        t(
                          "۴ درخواست نقاشی منتظر بررسی",
                          "4 artwork requests to review",
                        ),
                        "/commissions?status=review",
                      )}
                      {action(
                        t("۵ تیکت نیازمند پاسخ", "5 tickets awaiting response"),
                        "/support?status=awaiting-response",
                      )}
                    </>
                  )}
                </div>
              </section>
              {financial && (
                <section className="ad-metrics-section">
                  {panelTitle(
                    t("شاخص‌های دوره", "Period overview"),
                    t(
                      "گزارش نمونه · ارقام مالی به تومان",
                      "Sample report · financial figures in toman",
                    ),
                  )}
                  {period !== "30" && (
                    <div className="ad-unavailable">
                      {t(
                        "داده معتبر برای این بازه نمونه موجود نیست؛ مقدار نامشخص صفر نیست.",
                        "No valid sample dataset for this period. Unknown is not zero.",
                      )}
                    </div>
                  )}
                  <div className="ad-metrics">
                    {metrics.map(([title, value, definition, icon], i) => (
                      <article className="ad-metric" key={title}>
                        <div>
                          <span>{title}</span>
                          <Glyph name={icon} />
                        </div>
                        {busy ? (
                          <div className="ad-skeleton" />
                        ) : (
                          <strong>
                            {period === "30" ? num(empty ? 0 : value) : "—"}
                            <small>
                              {i === 1
                                ? t("سفارش", "orders")
                                : t("تومان", "toman")}
                            </small>
                          </strong>
                        )}
                        <p>{definition}</p>
                        <footer>
                          {t(
                            "۳۰ روز اخیر · داده نمونه",
                            "Last 30 days · sample",
                          )}
                        </footer>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {financial && (
                <div className="ad-chart-grid">
                  <section className="ad-panel ad-sales">
                    {panelTitle(
                      t("روند فروش خالص", "Net sales trend"),
                      t(
                        "۳۰ روز اخیر · میلیون تومان · بدون مالیات و ارسال",
                        "Last 30 days · million toman · excludes tax & shipping",
                      ),
                      t("گزارش فروش", "Sales report"),
                      "/reports?type=net-sales",
                    )}
                    <div className="ad-chart-key">
                      <span />
                      <span>{t("فروش خالص", "Net sales")}</span>
                      <button onClick={() => setTable(!table)}>
                        {table
                          ? t("نمای نمودار", "Chart view")
                          : t("جدول جایگزین", "View data table")}
                      </button>
                    </div>
                    {busy ? (
                      <div className="ad-skeleton ad-chart-skeleton" />
                    ) : period !== "30" ? (
                      <div className="ad-empty">
                        {t(
                          "داده‌ای برای این بازه موجود نیست.",
                          "No data for this period.",
                        )}
                      </div>
                    ) : table ? (
                      <table className="ad-table">
                        <thead>
                          <tr>
                            <th>{t("بخش دوره", "Period segment")}</th>
                            <th>
                              {t(
                                "فروش خالص (میلیون تومان)",
                                "Net sales (million toman)",
                              )}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[24, 31, 28, 45.45].map((v, i) => (
                            <tr key={i}>
                              <td>
                                {t("بخش", "Segment")} {num(i + 1)}
                              </td>
                              <td>{num(empty ? 0 : v)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="ad-chart" dir="ltr">
                        <div className="ad-y-axis">
                          {[50, 40, 30, 20, 10, 0].map((v) => (
                            <span key={v}>{num(v)}</span>
                          ))}
                        </div>
                        <svg
                          viewBox="0 0 660 180"
                          role="img"
                          aria-label={t(
                            "فروش نمونه در چهار بخش: ۲۴، ۳۱، ۲۸ و ۴۵٫۴۵ میلیون تومان",
                            "Sample net sales: 24, 31, 28 and 45.45 million toman",
                          )}
                          preserveAspectRatio="none"
                        >
                          <defs>
                            <linearGradient
                              id="ad-area"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                stopColor="var(--accent)"
                                stopOpacity=".16"
                              />
                              <stop
                                offset="1"
                                stopColor="var(--accent)"
                                stopOpacity="0"
                              />
                            </linearGradient>
                          </defs>
                          {[0, 36, 72, 108, 144, 179].map((y) => (
                            <line
                              key={y}
                              x1="0"
                              x2="660"
                              y1={y}
                              y2={y}
                              stroke="var(--border)"
                              strokeDasharray="4 5"
                            />
                          ))}
                          {!empty && (
                            <>
                              <path
                                d="M0 94 C75 94 145 65 220 68 S365 94 440 79 S585 16 660 17 L660 180H0Z"
                                fill="url(#ad-area)"
                              />
                              <path
                                d="M0 94 C75 94 145 65 220 68 S365 94 440 79 S585 16 660 17"
                                fill="none"
                                stroke="var(--accent)"
                                strokeWidth="2.5"
                              />
                              {[
                                [0, 94, 24],
                                [220, 68, 31],
                                [440, 79, 28],
                                [660, 17, 45.45],
                              ].map(([x, y, v], i) => (
                                <circle
                                  key={i}
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill="var(--surface)"
                                  stroke="var(--accent)"
                                  strokeWidth="2"
                                >
                                  <title>
                                    {t("بخش", "Segment")} {num(i + 1)}: {num(v)}{" "}
                                    {t("میلیون تومان", "million toman")}
                                  </title>
                                </circle>
                              ))}
                            </>
                          )}
                        </svg>
                        <div className="ad-x-axis">
                          {[1, 2, 3, 4].map((v) => (
                            <span key={v}>
                              {t("بخش", "Segment")} {num(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="ad-footnote">
                      {t(
                        "جمع رسمی از اقلام یکتای سفارش محاسبه می‌شود؛ کالکشن‌های هم‌پوشان جمع‌پذیر نیستند.",
                        "Official totals use unique order items; overlapping collections are not additive.",
                      )}
                    </p>
                  </section>
                  <section className="ad-panel ad-money">
                    {panelTitle(
                      t("جریان مالی", "Financial flows"),
                      t(
                        "مفاهیم مستقل · ۳۰ روز اخیر",
                        "Separate concepts · last 30 days",
                      ),
                    )}
                    {[
                      [
                        t(
                          "وجه دریافت‌شده از مشتری",
                          "Customer payments received",
                        ),
                        139200000,
                      ],
                      [t("مطالبات از درگاه", "Gateway receivables"), 18600000],
                      [t("تسویه درگاه", "Gateway settlements"), 120600000],
                      [t("بازپرداخت تکمیل‌شده", "Completed refunds"), 4250000],
                      [
                        t(
                          "سود برآوردی پیش از خروج",
                          "Estimated pre-dispatch profit",
                        ),
                        8400000,
                      ],
                    ].map(([label, value]) => (
                      <div className="ad-money-row" key={label}>
                        <span>{label}</span>
                        <strong>
                          {busy || period !== "30"
                            ? "—"
                            : num(empty ? 0 : Number(value))}
                          <small>{t("تومان", "toman")}</small>
                        </strong>
                      </div>
                    ))}
                    <p className="ad-footnote">
                      {t(
                        "تسویه درآمد تازه نیست. مطالبات، مانده جاری است. سود جایگزینی با نرخ روز: نامشخص؛ مستقل از سود تاریخی. کارمزد، مالیات و ارسال در گزارش تفصیلی جدا هستند.",
                        "Settlement is not new revenue. Receivables are a current balance. Replacement-rate profit: unknown, separate from historical profit. Fees, tax and shipping are separated in the detailed report.",
                      )}
                    </p>
                  </section>
                </div>
              )}
              <section className="ad-panel ad-orders">
                {panelTitle(
                  t("سفارش‌های نیازمند اقدام", "Orders requiring action"),
                  t(
                    "آخرین سفارش‌های باز · بدون اطلاعات خصوصی مشتری",
                    "Latest open orders · no private customer details",
                  ),
                  t("همه سفارش‌ها", "All orders"),
                  "/orders?status=action-needed",
                )}
                {busy ? (
                  <div className="ad-skeleton ad-chart-skeleton" />
                ) : empty ? (
                  <div className="ad-empty">
                    {t(
                      "سفارش نیازمند اقدام وجود ندارد.",
                      "No orders need attention.",
                    )}
                  </div>
                ) : (
                  <div className="ad-order-table">
                    <div className="ad-order-header">
                      <span>{t("سفارش / تاریخ", "Order / date")}</span>
                      <span>{t("خلاصه اقلام", "Item summary")}</span>
                      <span>{t("پرداخت", "Payment")}</span>
                      <span>{t("اجرا / ارسال", "Fulfillment / shipping")}</span>
                      <span />
                    </div>
                    {orders
                      .filter(
                        (o) =>
                          role !== "finance" ||
                          ["unknown", "unallocated"].includes(o[7]),
                      )
                      .map((o) => (
                        <div className="ad-order-row" key={o[0]}>
                          <div>
                            <strong dir="ltr">{o[0]}</strong>
                            <small>{o[1]}</small>
                          </div>
                          <div>
                            <span>{o[2]}</span>
                            <small>{o[3]}</small>
                          </div>
                          <div>{badge(o[4], o[6])}</div>
                          <div>
                            <span>{o[5]}</span>
                          </div>
                          <button
                            className="icon-button"
                            aria-label={`${t("مشاهده", "View")} ${o[0]}`}
                            onClick={() =>
                              open(
                                `${t("سفارش", "Order")} ${o[0]}`,
                                `/orders?order=${o[0]}&status=${o[7]}`,
                              )
                            }
                          >
                            <Glyph name="arrow" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
                <div className="ad-order-note">
                  <Glyph name="alert" />
                  {t(
                    "پرداخت نامشخص نیازمند تطبیق است؛ پرداخت دیرهنگام بدون موجودی، مسیر رسیدگی مستقل دارد.",
                    "Unknown payments require reconciliation; late payments without stock need separate review.",
                  )}
                </div>
              </section>
              <div className="ad-lower-grid">
                {financial && (
                  <section className="ad-panel">
                    {panelTitle(
                      t("صف بازبینی قیمت", "Price review queue"),
                      t(
                        "۹ SKU · ۳ پکیج وابسته · ۵ پیشنهاد آماده",
                        "9 SKUs · 3 dependent packages · 5 ready proposals",
                      ),
                      t("رفتن به صف بازبینی", "Open review queue"),
                      "/price-review?status=pending",
                    )}
                    {priceError ? (
                      <div className="ad-empty" role="status">
                        <Glyph name="alert" />
                        <p>
                          {t(
                            "دریافت این بخش ممکن نشد.",
                            "Unable to load this section.",
                          )}
                        </p>
                        <button
                          className="button secondary"
                          onClick={() => {
                            setPriceError(false)
                            setUpdated(new Date())
                          }}
                        >
                          {t("تلاش دوباره (Demo)", "Retry (Demo)")}
                        </button>
                      </div>
                    ) : busy ? (
                      <div className="ad-skeleton ad-chart-skeleton" />
                    ) : empty ? (
                      <div className="ad-empty">
                        {t(
                          "صف بازبینی خالی است.",
                          "The review queue is empty.",
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="ad-price-item">
                          <div>
                            <strong>
                              {t("دفتر باغ خیال", "Garden notebook")}
                            </strong>
                            <small dir="ltr">NB-GARDEN-A5</small>
                          </div>
                          {badge(
                            t("ورودی تغییرکرده", "Inputs changed"),
                            "warm",
                          )}
                        </div>
                        <p className="ad-footnote">
                          {t(
                            "علت: تغییر نرخ کاغذ · ۲۱ خرداد (نمونه)",
                            "Reason: paper rate changed · Jun 11 (sample)",
                          )}
                        </p>
                        <div className="ad-price-values">
                          {[
                            [
                              t("هزینه قبلی", "Previous cost"),
                              "۸۵٬۰۰۰",
                              "85,000",
                            ],
                            [t("هزینه جدید", "New cost"), "۹۸٬۰۰۰", "98,000"],
                            [
                              t("قیمت جاری", "Current price"),
                              "۱۸۵٬۰۰۰",
                              "185,000",
                            ],
                            [t("حاشیه جدید", "New margin"), "۴۷٪", "47%"],
                          ].map(([label, fa, english]) => (
                            <div key={label}>
                              <span>{label}</span>
                              <strong>{t(fa, english)}</strong>
                            </div>
                          ))}
                        </div>
                        <div className="ad-warning">
                          <Glyph name="alert" />
                          <div>
                            <strong>
                              {t(
                                "۲ محاسبه هزینه ناقص",
                                "2 incomplete cost calculations",
                              )}
                            </strong>
                            <p>
                              {t(
                                "پیشنهاد قدیمی معتبر نیست؛ تغییر هزینه، قیمت را خودکار منتشر نمی‌کند.",
                                "Previous proposals are stale. Cost changes do not publish prices automatically.",
                              )}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </section>
                )}
                {operational && (
                  <section className="ad-panel">
                    {panelTitle(
                      t("موجودی و کمبود", "Stock & shortages"),
                      t(
                        "موجودی جاری · حد هشدار از تنظیمات نمونه",
                        "Current stock · thresholds from sample settings",
                      ),
                      t("مشاهده انبار", "View inventory"),
                      "/inventory?filter=shortages",
                    )}
                    {busy ? (
                      <div className="ad-skeleton ad-chart-skeleton" />
                    ) : empty ? (
                      <div className="ad-empty">
                        {t(
                          "کمبود گزارش‌شده‌ای وجود ندارد.",
                          "No shortages reported.",
                        )}
                      </div>
                    ) : (
                      <>
                        {[
                          [
                            t("کاغذ بافت‌دار ۲۰۰ گرم", "Textured paper 200g"),
                            t(
                              "ماده اولیه · ۱۲ برگ / حد هشدار ۳۰",
                              "Material · 12 sheets / threshold 30",
                            ),
                            "12 / 30",
                          ],
                          [
                            t("دفتر باغ خیال", "Garden notebook"),
                            t(
                              "قابل فروش ۳ · رزروشده ۸ · حد هشدار ۱۰",
                              "Sellable 3 · reserved 8 · threshold 10",
                            ),
                            "3 / 10",
                          ],
                          [
                            t("پکیج روزهای آرام", "Quiet days package"),
                            t(
                              "کمبود مشتق از اجزا؛ انبار مستقل ندارد",
                              "Shortage derived from components; no separate stock",
                            ),
                            "—",
                          ],
                        ].map(([title, desc, value]) => (
                          <div className="ad-stock-row" key={title}>
                            <span className="ad-icon-tile">
                              <Glyph name="box" />
                            </span>
                            <div>
                              <strong>{title}</strong>
                              <small>{desc}</small>
                            </div>
                            <span dir="ltr">{value}</span>
                          </div>
                        ))}
                        {action(
                          t("بررسی تأمین مواد", "Review material purchases"),
                          "/purchases?filter=shortages",
                        )}
                      </>
                    )}
                  </section>
                )}
                {operational && (
                  <section className="ad-panel">
                    {panelTitle(
                      t("تولید جاری", "Production in progress"),
                      t(
                        "خروجی ناتمام قابل فروش نیست",
                        "Unfinished output is not sellable",
                      ),
                      t("مشاهده تولید", "View production"),
                      "/production?status=in-progress",
                    )}
                    {busy ? (
                      <div className="ad-skeleton ad-chart-skeleton" />
                    ) : empty ? (
                      <div className="ad-empty">
                        {t("بچ جاری وجود ندارد.", "No active batches.")}
                      </div>
                    ) : (
                      <>
                        <div className="ad-price-item">
                          <div>
                            <strong>
                              {t("دفتر باغ خیال", "Garden notebook")}
                            </strong>
                            <small dir="ltr">BCH-024 · NB-GARDEN-A5</small>
                          </div>
                          {badge(t("کنترل کیفیت", "Quality control"), "green")}
                        </div>
                        <div className="ad-production-track">
                          <span />
                          <span />
                          <span />
                          <span className="pending" />
                        </div>
                        <div className="ad-price-values">
                          {[
                            [t("هدف", "Target"), 60],
                            [t("خروجی سالم", "Approved"), 42],
                            [t("ضایعات", "Waste"), 2],
                            [t("در بررسی", "Under review"), 16],
                          ].map(([label, n]) => (
                            <div key={label}>
                              <span>{label}</span>
                              <strong>{num(Number(n))}</strong>
                            </div>
                          ))}
                        </div>
                        <p className="ad-footnote">
                          {t(
                            "هدف تولید با خروجی تأییدشده و موجودی قابل فروش یکسان نیست.",
                            "Production targets are not approved output or sellable stock.",
                          )}
                        </p>
                      </>
                    )}
                  </section>
                )}
                {role === "owner" && (
                  <section className="ad-panel">
                    {panelTitle(
                      t("نقاشی سفارشی و هنرمندان", "Custom artworks & artists"),
                      t(
                        "درخواست، سفارش و اجرا؛ سه مرحله مستقل",
                        "Requests, orders and execution: separate stages",
                      ),
                      t("مشاهده درخواست‌ها", "View requests"),
                      "/commissions",
                    )}
                    {[
                      [t("درخواست منتظر بررسی", "Requests awaiting review"), 4],
                      [
                        t(
                          "پیشنهاد منتظر تأیید مشتری",
                          "Proposals awaiting customer",
                        ),
                        3,
                      ],
                      [
                        t(
                          "پرداخت‌شده، منتظر تخصیص",
                          "Paid, awaiting allocation",
                        ),
                        2,
                      ],
                      [t("اجرای جاری", "In progress"), 6],
                      [
                        t("نسخه اولیه آماده بررسی", "Drafts ready for review"),
                        2,
                      ],
                    ].map(([label, n]) => (
                      <div className="ad-money-row" key={label}>
                        <span>{label}</span>
                        <strong>
                          {busy ? "—" : num(empty ? 0 : Number(n))}
                        </strong>
                      </div>
                    ))}
                    <p className="ad-footnote">
                      {t(
                        "تصویر مرجع و Prompt خصوصی در داشبورد نمایش داده نمی‌شوند. تأیید ضریب AI و override فقط در صفحه مستقل.",
                        "Private reference images and prompts are not displayed. AI factor approval and overrides happen on a separate page.",
                      )}
                    </p>
                  </section>
                )}
              </div>
              <section className="ad-panel ad-activity">
                {panelTitle(
                  t("فعالیت‌های اخیر", "Recent activity"),
                  t(
                    "اقدامات عمومی مجاز · زمان‌های نمونه",
                    "Permitted public actions · sample times",
                  ),
                  t("مشاهده لاگ فعالیت", "View activity log"),
                  "/activity",
                )}
                {busy ? (
                  <div className="ad-skeleton" />
                ) : empty ? (
                  <div className="ad-empty">
                    {t("فعالیتی ثبت نشده است.", "No activity recorded.")}
                  </div>
                ) : (
                  <div className="ad-activity-list">
                    {(role === "finance"
                      ? [
                          [
                            t(
                              "تسویه درگاه ثبت شد",
                              "Gateway settlement recorded",
                            ),
                            t("کارشناس مالی", "Finance specialist"),
                            "۱۰:۲۴",
                          ],
                        ]
                      : [
                          [
                            t(
                              "ارسال سفارش NA-1042 ثبت شد",
                              "Shipment NA-1042 recorded",
                            ),
                            t("مسئول ارسال", "Shipping operator"),
                            "۱۰:۲۴",
                          ],
                          [
                            t(
                              "دریافت خرید مواد ثبت شد",
                              "Material purchase received",
                            ),
                            t("مسئول انبار", "Warehouse operator"),
                            "۰۹:۵۸",
                          ],
                          [
                            t("بچ BCH-023 تکمیل شد", "Batch BCH-023 completed"),
                            t("مدیر تولید", "Production manager"),
                            "۰۹:۱۵",
                          ],
                        ]
                    ).map(([title, actor, time]) => (
                      <div key={title}>
                        <span className="ad-activity-dot" />
                        <div>
                          <strong>{title}</strong>
                          <small>
                            {actor} · {t("امروز", "Today")} {time}
                          </small>
                        </div>
                        <Glyph name="clock" />
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <footer className="ad-footer">
                <span>
                  nilart. <span> / </span>
                  {t(
                    "فضایی برای هنر، ابزاری برای مدیریت",
                    "A space for art. Tools for business.",
                  )}
                </span>
                <span>
                  {t(
                    "داده نمونه · منطقه زمانی Asia/Tehran · ذخیره UTC",
                    "Sample data · Asia/Tehran display · UTC storage",
                  )}
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      <dialog
        className="ad-drawer"
        ref={drawerDialog}
        onCancel={() => setDrawer(false)}
      >
        <button
          className="icon-button ad-drawer-close"
          aria-label={t("بستن منو", "Close menu")}
          onClick={() => setDrawer(false)}
        >
          <Glyph name="close" />
        </button>
        {navigation}
        {(isOrders || isFinance || isOperations) && (
          <button
            className="ad-link"
            onClick={() => {
              setSession(false)
              setDestination(null)
              setDrawer(false)
            }}
          >
            <Glyph name="logout" />
            {t("خروج از حساب", "Sign out")}
          </button>
        )}
      </dialog>
      <dialog
        className="ad-destination"
        ref={dialog}
        onCancel={() => setDestination(null)}
      >
        <div className="ad-panel-head">
          <h2>{destination?.title}</h2>
          <button
            className="icon-button"
            aria-label={t("بستن", "Close")}
            onClick={() => setDestination(null)}
          >
            <Glyph name="close" />
          </button>
        </div>
        {badge(
          t(
            "پیش‌نمایش مقصد مستقل · Demo",
            "Independent destination preview · Demo",
          ),
          "warm",
        )}
        <p>
          {t(
            "این مقصد خارج از محدوده ADM-01 است. مسیر و فیلتر انتخابی برای اتصال صفحه مستقل آماده است؛ هیچ عملیات حساس انجام نشده است.",
            "This destination is outside ADM-01. Its route and filter are ready for a separate page; no sensitive operation has been performed.",
          )}
        </p>
        <code dir="ltr">{destination?.route}</code>
        <button className="button primary" onClick={() => setDestination(null)}>
          {t("بازگشت به داشبورد", "Back to dashboard")}
        </button>
      </dialog>
    </div>
  )
}
