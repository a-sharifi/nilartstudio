import { useEffect, useRef, useState } from "react"
import {
  demoOrderService,
  initialOrderFilters,
  orderOptions,
  type AdminOrder,
  type OrderFilters,
  type OrderResponse,
  type OrderRole,
  type OrderState,
} from "./order-data"
import {
  OrderQueueCard,
  OrderManagementTable,
  HistoricalOrderAmount,
  OrderBadge,
  OrderDialog,
  OrderEmpty,
  OrderItemsSummary,
  OrderMobileCard,
  OrderOperationResult,
  OrderShipmentCard,
  OrderSkeleton,
  OrderTimeline,
  orderText,
} from "./OrderComponents"
import "./orders.css"

export default function OrdersPage({
  en,
  role,
  onNavigate,
  onSessionExpired,
}: {
  en: boolean
  role: OrderRole
  onNavigate: (title: string, route: string) => void
  onSessionExpired: () => void
}) {
  const t = (fa: string, english: string) => (en ? english : fa)
  const num = (n: number) => new Intl.NumberFormat(en ? "en" : "fa").format(n)
  const [filters, setFilters] = useState<OrderFilters>(() => {
    const params = new URLSearchParams(location.search)
    const status = params.get("status")
    const attention =
      params.get("attention") ??
      ({
        "ready-to-ship": "shipping",
        "action-needed": "",
        "needs-review": "payment",
      } as Record<string, string>)[status ?? ""] ??
      ""
    return {
      ...initialOrderFilters,
      attention: Object.keys(orderOptions.attention).includes(attention)
        ? attention
        : "",
    }
  })
  const [query, setQuery] = useState("")
  const [mode, setMode] = useState<OrderState>("normal")
  const [response, setResponse] = useState<{
    role: OrderRole
    data: OrderResponse
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  const [advanced, setAdvanced] = useState(false)
  const [filterSheet, setFilterSheet] = useState(false)
  const [preview, setPreview] = useState<{
    order: AdminOrder
    role: OrderRole
  } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [library, setLibrary] = useState(false)
  const [detailTab, setDetailTab] = useState("items")
  const [confirmation, setConfirmation] = useState(false)
  const previewController = useRef<AbortController | null>(null)
  const previewId = useRef("")
  const generation = useRef(0)
  const previousRole = useRef(role)
  const data = response?.role === role ? response.data : null
  const selected = preview?.role === role ? preview.order : null
  const financial = role !== "warehouse"
  const invalidRange =
    !!filters.start && !!filters.end && filters.start > filters.end
  const safe = mode === "denied"
  const options = data?.options ?? orderOptions
  const queues = Object.entries(options.attention).filter(
    ([key]) =>
      financial || !["payment", "allocation", "commission"].includes(key),
  )
  const filterFields = [
    "payment",
    "operation",
    "type",
    "delivery",
    "request",
    "method",
  ] as const
  const labels: Record<string, readonly [string, string]> = {
    payment: ["وضعیت پرداخت", "Payment status"],
    operation: ["وضعیت عملیاتی", "Operational status"],
    type: ["نوع سفارش", "Order type"],
    delivery: ["نوع تحویل", "Delivery type"],
    request: ["درخواست مرتبط", "Related request"],
    method: ["روش ارسال", "Shipping method"],
    attention: ["نیاز به رسیدگی", "Needs attention"],
    start: ["از تاریخ", "From date"],
    end: ["تا تاریخ", "To date"],
  }
  function updateFilter(key: keyof OrderFilters, value: string) {
    setFilters((previous) => ({ ...previous, [key]: value, page: 1 }))
  }
  function clearFilters() {
    setFilters({ ...initialOrderFilters })
    setQuery("")
  }
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setFilters((previous) =>
          previous.query === query ? previous : { ...previous, query, page: 1 },
        ),
      300,
    )
    return () => clearTimeout(timer)
  }, [query])
  useEffect(() => {
    if (previousRole.current === role) return
    previousRole.current = role
    setResponse(null)
    setPreview(null)
    setPreviewOpen(false)
    setQuery("")
    setFilters({ ...initialOrderFilters })
    previewController.current?.abort()
    setLibrary(false)
  }, [role])
  useEffect(() => {
    const controller = new AbortController(),
      id = ++generation.current
    setResponse(null)
    setLoading(true)
    setError("")
    if (mode === "loading" || safe || invalidRange) {
      setLoading(mode === "loading")
      return () => controller.abort()
    }
    demoOrderService
      .list(filters, role, mode, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted && id === generation.current) {
          setResponse({ role, data: result })
          setLoading(false)
        }
      })
      .catch((reason) => {
        if (reason.name !== "AbortError" && id === generation.current) {
          setError(reason.message)
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [filters, role, mode, reload, invalidRange, safe])
  useEffect(() => () => previewController.current?.abort(), [])
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex, nofollow"
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
  function changeMode(next: OrderState) {
    previewController.current?.abort()
    setPreview(null)
    setPreviewOpen(false)
    setConfirmation(false)
    setLibrary(false)
    setMode(next)
  }
  async function loadPreview(id: string) {
    previewId.current = id
    previewController.current?.abort()
    const controller = new AbortController()
    previewController.current = controller
    setPreview(null)
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewError(false)
    try {
      const order = await demoOrderService.preview(id, role, controller.signal)
      if (!controller.signal.aborted) {
        setPreview({ order, role })
        setPreviewLoading(false)
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        setPreviewError(true)
        setPreviewLoading(false)
      }
    }
  }
  const activeFilters = Object.entries(filters).filter(
    ([key, value]) => !["query", "sort", "page"].includes(key) && value,
  )
  const isFiltered = activeFilters.length > 0 || !!filters.query
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const filterControls = (
    <div className="od-filter-fields">
      <label>
        {t("از تاریخ ثبت (UTC)", "Registered from (UTC)")}
        <input
          type="date"
          value={filters.start}
          onChange={(e) => updateFilter("start", e.target.value)}
        />
      </label>
      <label>
        {t("تا تاریخ ثبت (UTC)", "Registered to (UTC)")}
        <input
          type="date"
          value={filters.end}
          onChange={(e) => updateFilter("end", e.target.value)}
        />
      </label>
      {filterFields.map((key) => (
        <label key={key}>
          {orderText(en, labels[key])}
          <select
            value={filters[key]}
            onChange={(e) => updateFilter(key, e.target.value)}
          >
            <option value="">{t("همه", "All")}</option>
            {Object.entries(options[key] ?? {}).map(([value, label]) => (
              <option value={value} key={value}>
                {orderText(en, label)}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label>
        {t("نیاز به رسیدگی", "Needs attention")}
        <select
          value={filters.attention}
          onChange={(e) => updateFilter("attention", e.target.value)}
        >
          <option value="">{t("همه", "All")}</option>
          {queues.map(([value, label]) => (
            <option value={value} key={value}>
              {orderText(en, label)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
  const validation = invalidRange && (
    <p role="alert" className="od-validation">
      {t(
        "تاریخ شروع نباید بعد از تاریخ پایان باشد.",
        "Start date must not be after end date.",
      )}
    </p>
  )
  if (safe)
    return (
      <section className="od-safe">
        <span className="ad-badge danger">
          {t("عدم مجوز", "Permission denied")}
        </span>
        <h1>
          {t("دسترسی به سفارش‌ها مجاز نیست", "Order access is not authorized")}
        </h1>
        <p>
          {t(
            "اطلاعات سفارش و مشتری در این نما نمایش داده یا دریافت نمی‌شود.",
            "No order or customer information is fetched or displayed in this view.",
          )}
        </p>
        <button
          className="button secondary"
          onClick={() => changeMode("normal")}
        >
          {t("بازگشت به نمای مجاز نمونه", "Return to authorized demo")}
        </button>
        <button
          className="ad-link"
          onClick={() => onNavigate(t("داشبورد", "Dashboard"), "")}
        >
          {t("داشبورد مدیریت", "Management dashboard")}
        </button>
      </section>
    )
  return (
    <div className="od-page">
      <div className="ad-breadcrumb">
        {t("مدیریت", "Admin")}
        <span>/</span>
        <strong>{t("سفارش‌ها", "Orders")}</strong>
        <span className="ad-page-id">ORDER–01</span>
      </div>
      <div className="ad-heading">
        <div>
          <h1>{t("مدیریت سفارش‌ها", "Order management")}</h1>
          <p>
            {t(
              "پرداخت‌ها و مراحل سفارش را جدا بررسی کنید؛ کارهای مهم را از دست ندهید.",
              "Review payments and order progress separately. Keep important tasks in view.",
            )}
          </p>
        </div>
        <button
          className="button secondary od-library-button"
          onClick={() => setLibrary(!library)}
        >
          {library
            ? t("بازگشت به فهرست", "Back to list")
            : t("کامپوننت‌های ORDER", "ORDER components")}
        </button>
      </div>
      <div className="ad-meta">
        <span>
          <span className="ad-live-dot" />
          {data
            ? t("آخرین دریافت نمونه: ", "Sample last received: ") +
              new Date(data.loadedAt).toLocaleTimeString(en ? "en" : "fa", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Tehran",
              })
            : t(
                "هنوز داده معتبر دریافت نشده است",
                "No valid data received yet",
              )}{" "}
          · {t("زمان تهران", "Tehran time")}
        </span>
        <button
          onClick={() => setReload((r) => r + 1)}
          disabled={loading || invalidRange}
        >
          {t("تازه‌سازی نمونه", "Refresh sample")}
        </button>
      </div>
      <div className="ad-demo-note">
        <span>
          <span className="ad-badge warm">Demo</span>
          {t(
            "تمام سفارش‌ها و وضعیت‌های مالی نمونه‌اند؛ به سرویس واقعی متصل نیست.",
            "All orders and financial states are samples, not connected to a live service.",
          )}
        </span>
        <select
          aria-label={t("حالت نمایشی سفارش", "Order preview state")}
          value={mode}
          onChange={(e) => {
            if (e.target.value === "expired") {
              setResponse(null)
              setPreview(null)
              onSessionExpired()
            } else changeMode(e.target.value as OrderState)
          }}
        >
          {[
            ["normal", "عادی", "Normal"],
            ["loading", "بارگذاری", "Loading"],
            ["empty", "بدون سفارش", "Empty"],
            ["error", "خطای شبکه", "Network error"],
            ["partial", "خطای شمارش صف", "Queue counts error"],
            ["conflict", "تغییر وضعیت", "Status conflict"],
            ["denied", "عدم مجوز", "Permission denied"],
            ["expired", "پایان نشست", "Session expired"],
          ].map(([value, fa, english]) => (
            <option key={value} value={value}>
              {t(fa, english)}
            </option>
          ))}
        </select>
      </div>
      {library ? (
        <section className="od-library">
          <div className="ad-panel-head">
            <div>
              <h2>{t("الگوهای مشترک بخش سفارش", "Shared ORDER patterns")}</h2>
              <p>
                {t(
                  "یک نمونه پایه جزئیات؛ نه صفحه دوم یا عملیات واقعی",
                  "A compact detail pattern, not a second page or live operation",
                )}
              </p>
            </div>
          </div>
          {data?.orders[0] ? (
            <div className="od-library-grid">
              <section className="ad-panel od-detail-pattern">
                <header>
                  <strong dir="ltr">{data.orders[0].id}</strong>
                  <span className="ad-badge">Demo</span>
                  <OrderBadge
                    group="payment"
                    value={data.orders[0].payment}
                    en={en}
                  />
                  <OrderBadge
                    group="operation"
                    value={data.orders[0].operation}
                    en={en}
                  />
                </header>
                <div
                  className="od-detail-tabs"
                  role="group"
                  aria-label={t("بخش نمونه جزئیات", "Sample detail sections")}
                >
                  {[
                    ["items", "اقلام", "Items"],
                    ...(financial ? [["payment", "پرداخت", "Payment"]] : []),
                    ["shipment", "ارسال", "Shipping"],
                    ["requests", "درخواست‌ها", "Requests"],
                    ["history", "تاریخچه", "History"],
                  ].map(([value, fa, english]) => (
                    <button
                      key={value}
                      aria-pressed={detailTab === value}
                      className={detailTab === value ? "active" : ""}
                      onClick={() => setDetailTab(value)}
                    >
                      {t(fa, english)}
                    </button>
                  ))}
                </div>
                <div className="od-customer-card">
                  <strong>
                    {t(
                      "مشتری و گیرنده؛ snapshot تاریخی",
                      "Customer & recipient · historical snapshot",
                    )}
                  </strong>
                  <p>{orderText(en, data.orders[0].customer)}</p>
                  <small>
                    {t(
                      "نمای حداقلی مجاز؛ شماره تماس و آدرس کامل نمایش داده نمی‌شود.",
                      "Permitted minimum view; no full contact number or address.",
                    )}
                  </small>
                </div>
                {detailTab === "items" && (
                  <OrderItemsSummary order={data.orders[0]} en={en} expanded />
                )}
                {detailTab === "payment" && financial && (
                  <>
                    <OrderBadge
                      group="payment"
                      value={data.orders[0].payment}
                      en={en}
                    />
                    <HistoricalOrderAmount order={data.orders[0]} en={en} />
                    <p className="od-note">
                      {t(
                        "مبلغ snapshot زمان ثبت؛ نه قیمت روز. داده تفکیک مالیات و تخفیف این نمونه موجود نیست.",
                        "Historical recorded total, not today's price. This sample has no tax/discount breakdown.",
                      )}
                    </p>
                  </>
                )}
                {detailTab === "shipment" && (
                  <OrderShipmentCard order={data.orders[0]} en={en} />
                )}{" "}
                {detailTab === "requests" && (
                  <OrderBadge
                    group="request"
                    value={data.orders[0].request}
                    en={en}
                  />
                )}{" "}
                {detailTab === "history" && (
                  <OrderTimeline order={data.orders[0]} en={en} />
                )}
                <div className="od-permitted-actions">
                  <button
                    className="ad-link"
                    onClick={() =>
                      onNavigate(
                        t("جزئیات کامل سفارش", "Full order details"),
                        `/orders/${data.orders[0].id}`,
                      )
                    }
                  >
                    {t(
                      "جزئیات کامل در صفحه مستقل",
                      "Full details on a separate page",
                    )}
                  </button>
                  {financial && (
                    <button
                      className="button secondary"
                      onClick={() => setConfirmation(true)}
                    >
                      {t(
                        "الگوی تأیید اقدام حساس",
                        "Sensitive confirmation pattern",
                      )}
                    </button>
                  )}
                </div>
              </section>
              <section className="ad-panel">
                <h2>
                  {t(
                    "اقلام پکیج و تحویل جزئی",
                    "Package items & partial fulfillment",
                  )}
                </h2>
                {data.orders.find((o) => o.type === "mixed") ? (
                  <>
                    <OrderItemsSummary
                      order={data.orders.find((o) => o.type === "mixed")!}
                      en={en}
                      expanded
                    />
                    <OrderShipmentCard
                      order={data.orders.find((o) => o.type === "mixed")!}
                      en={en}
                    />
                  </>
                ) : (
                  <p className="od-note">
                    {t(
                      "برای این الگو، فیلترها را پاک کنید.",
                      "Clear filters to see this pattern.",
                    )}
                  </p>
                )}
                <OrderOperationResult en={en} />
              </section>
              <section className="ad-panel">
                <h2>{t("وضعیت‌های مستقل", "Independent status badges")}</h2>
                {["payment", "operation", "shipment", "request"].map(
                  (group) => (
                    <div className="od-badge-set" key={group}>
                      <strong>
                        {orderText(en, labels[group] ?? ["تحویل", "Delivery"])}
                      </strong>
                      {Object.keys(orderOptions[group]).map((value) => (
                        <OrderBadge
                          key={value}
                          group={group}
                          value={value}
                          en={en}
                        />
                      ))}
                    </div>
                  ),
                )}
              </section>
              <section className="ad-panel">
                <h2>{t("Skeleton و Empty", "Skeleton & Empty")}</h2>
                <OrderSkeleton />
                <OrderEmpty en={en} filtered />
              </section>
            </div>
          ) : loading ? (
            <OrderSkeleton />
          ) : (
            <OrderEmpty en={en} filtered={isFiltered} />
          )}
        </section>
      ) : (
        <>
          <section className="od-queues">
            <div className="ad-panel-head">
              <div>
                <h2>{t("صف‌های نیازمند رسیدگی", "Queues needing attention")}</h2>
                <p>
                  {t(
                    "صف‌ها هم‌پوشانی دارند؛ جمع آن‌ها تعداد کل سفارش نیست.",
                    "Queues can overlap; their sum is not the total order count.",
                  )}
                </p>
              </div>
              <span className="od-current-label">
                {t("وضعیت جاری", "Current snapshot")}
              </span>
            </div>
            <div className="od-queue-grid">
              {queues.map(([key, label]) => (
                <OrderQueueCard
                  key={key}
                  label={label}
                  count={data?.queues?.[key] ?? null}
                  loading={loading}
                  active={filters.attention === key}
                  warning={["payment", "allocation", "return"].includes(key)}
                  onSelect={() =>
                    updateFilter(
                      "attention",
                      filters.attention === key ? "" : key,
                    )
                  }
                  en={en}
                />
              ))}
            </div>
            {data && !data.queues && (
              <div className="od-inline-error" role="status">
                {t(
                  "دریافت شمارش صف‌ها ممکن نشد؛ جدول معتبر همچنان در دسترس است.",
                  "Unable to load queue counts; the valid order table remains available.",
                )}
                <button
                  className="ad-link"
                  onClick={() => changeMode("normal")}
                >
                  {t("تلاش دوباره", "Retry")}
                </button>
              </div>
            )}
          </section>
          <section className="ad-panel od-list-panel">
            <div className="od-toolbar">
              <div className="od-search">
                <label htmlFor="order-search">
                  {t("جست‌وجوی سفارش", "Search orders")}
                </label>
                <div>
                  <svg
                    width="18"
                    height="18"
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
                    id="order-search"
                    type="search"
                    value={query}
                    dir="auto"
                    placeholder={
                      role === "warehouse"
                        ? t(
                            "شماره سفارش، مثل NA-1058",
                            "Order number, e.g. NA-1058",
                          )
                        : t(
                            "شماره سفارش یا نام مجاز مشتری",
                            "Order number or permitted customer name",
                          )
                    }
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <small>
                  {t(
                    "جست‌وجو در URL ذخیره نمی‌شود؛ تماس و تراکنش در این سرویس نمونه پشتیبانی نشده‌اند.",
                    "Search is not stored in the URL; phone and transaction search are not supported by this demo service.",
                  )}
                </small>
              </div>
              <div className="od-toolbar-actions">
                <button
                  className={`button secondary od-desktop-filter ${
                    advanced ? "selected" : ""
                  }`}
                  aria-expanded={advanced}
                  onClick={() => setAdvanced(!advanced)}
                >
                  {t("فیلترهای پیشرفته", "Advanced filters")}
                  <span aria-hidden="true">{advanced ? "−" : "+"}</span>
                </button>
                <button
                  className="button secondary od-mobile-filter"
                  onClick={() => setFilterSheet(true)}
                >
                  {t("فیلترها", "Filters")}
                  {activeFilters.length > 0 && (
                    <span>{num(activeFilters.length)}</span>
                  )}
                </button>
                <label className="od-sort">
                  <span>{t("مرتب‌سازی", "Sort by")}</span>
                  <select
                    value={filters.sort}
                    onChange={(e) => updateFilter("sort", e.target.value)}
                  >
                    <option value="newest">
                      {t("جدیدترین", "Newest first")}
                    </option>
                    <option value="oldest">
                      {t("قدیمی‌ترین", "Oldest first")}
                    </option>
                  </select>
                </label>
              </div>
            </div>
            {advanced && (
              <div className="od-advanced">
                {filterControls}
                {validation}
              </div>
            )}
            {(activeFilters.length > 0 || query) && (
              <div className="od-chips">
                {activeFilters.map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => updateFilter(key as keyof OrderFilters, "")}
                    aria-label={
                      t("حذف فیلتر ", "Remove filter ") +
                      orderText(en, labels[key])
                    }
                  >
                    {orderText(en, labels[key])}:{" "}
                    {orderOptions[key]?.[String(value)]
                      ? orderText(en, orderOptions[key][String(value)])
                      : String(value)}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
                {query && (
                  <button
                    onClick={() => {
                      setQuery("")
                      updateFilter("query", "")
                    }}
                  >
                    {t("جست‌وجو فعال", "Search active")}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
                <button className="od-clear" onClick={clearFilters}>
                  {t("پاک‌کردن همه", "Clear all")}
                </button>
              </div>
            )}
            <div className="od-results-head">
              <span role="status" aria-live="polite">
                {loading
                  ? t("در حال دریافت سفارش‌ها…", "Loading orders…")
                  : data
                    ? num(data.total) + t(" سفارش پیدا شد", " orders found")
                    : t("نتایج در دسترس نیست", "Results unavailable")}
              </span>
              <span>
                {t("مبالغ تاریخی · تومان", "Historical totals · toman")}
              </span>
            </div>
            {invalidRange ? (
              validation
            ) : loading ? (
              <OrderSkeleton />
            ) : error ? (
              <div className="od-empty" role="status">
                <h3>
                  {t("دریافت سفارش‌ها ممکن نشد.", "Unable to load orders.")}
                </h3>
                <p>
                  {t(
                    "فیلترهای شما حفظ شده‌اند؛ نبود داده به معنی نبود سفارش نیست.",
                    "Your filters are preserved; unavailable data does not mean no orders.",
                  )}
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    changeMode("normal")
                    setReload((value) => value + 1)
                  }}
                >
                  {t("تلاش دوباره", "Try again")}
                </button>
              </div>
            ) : data?.orders.length ? (
              <>
                <OrderManagementTable
                  orders={data.orders}
                  en={en}
                  financial={financial}
                  onPreview={loadPreview}
                />
                <div className="od-mobile-list">
                  {data.orders.map((order) => (
                    <OrderMobileCard
                      key={order.id}
                      order={order}
                      en={en}
                      onPreview={() => loadPreview(order.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <OrderEmpty en={en} filtered={isFiltered} />
            )}
            <div className="od-pagination">
              <span>
                {data && data.total > 0
                  ? `${num((filters.page - 1) * data.pageSize + 1)}–${num(Math.min(filters.page * data.pageSize, data.total))}${t(" از ", " of ")}${num(data.total)}`
                  : "—"}
              </span>
              <div>
                <button
                  className="button secondary"
                  disabled={loading || filters.page <= 1}
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: f.page - 1 }))
                  }
                >
                  {t("قبلی", "Previous")}
                </button>
                <span>
                  {t("صفحه ", "Page ")}
                  {num(filters.page)} / {data ? num(pages) : "—"}
                </span>
                <button
                  className="button secondary"
                  disabled={loading || !data || filters.page >= pages}
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: f.page + 1 }))
                  }
                >
                  {t("بعدی", "Next")}
                </button>
              </div>
            </div>
          </section>
          <div className="od-guidance">
            <span className="od-guidance-icon" aria-hidden="true">
              !
            </span>
            <p>
              {t(
                "پرداخت، عملیات و تحویل مستقل‌اند. پرداخت نامشخص نیازمند تطبیق است؛ پرداخت موفق بدون تخصیص، آماده ارسال یا بازپرداخت‌شده محسوب نمی‌شود.",
                "Payment, operations and delivery are independent. Unknown payments require reconciliation; a paid order without allocation is not ready to ship or automatically refunded.",
              )}
            </p>
          </div>
        </>
      )}
      <footer className="ad-footer">
        <span>
          nilart. /{" "}
          {t("مدیریت سفارش، با دید روشن", "Order management, with clarity")}
        </span>
        <span>
          {t(
            "ORDER-01 · داده نمونه · مجوز نقش‌ها شبیه‌سازی است",
            "ORDER-01 · sample data · role permissions are simulated",
          )}
        </span>
      </footer>
      <OrderDialog
        open={filterSheet}
        onClose={() => setFilterSheet(false)}
        title={t("فیلتر سفارش‌ها", "Order filters")}
        sheet
      >
        {filterControls}
        {validation}
        <div className="od-sheet-actions">
          <button className="button secondary" onClick={clearFilters}>
            {t("پاک‌کردن همه", "Clear all")}
          </button>
          <button
            className="button primary"
            onClick={() => setFilterSheet(false)}
            disabled={invalidRange}
          >
            {t("مشاهده نتایج", "View results")}
          </button>
        </div>
      </OrderDialog>
      <OrderDialog
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false)
          previewController.current?.abort()
        }}
        title={t("پیش‌نمایش سفارش", "Order preview")}
        drawer
      >
        {previewLoading ? (
          <OrderSkeleton />
        ) : previewError ? (
          <div className="od-empty">
            <p>{t("دریافت پیش‌نمایش ممکن نشد.", "Unable to load preview.")}</p>
            <button
              className="button secondary"
              onClick={() => loadPreview(previewId.current)}
            >
              {t("تلاش دوباره", "Retry")}
            </button>
          </div>
        ) : selected ? (
          <>
            <div className="od-preview-title">
              <strong dir="ltr">{selected.id}</strong>
              <span className="ad-badge warm">Demo</span>
            </div>
            <p className="od-preview-date">
              {new Date(selected.createdAt).toLocaleString(
                en ? "en-GB" : "fa-IR",
                {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Tehran",
                },
              )}
            </p>
            <div className="od-preview-badges">
              <OrderBadge group="payment" value={selected.payment} en={en} />
              <OrderBadge
                group="operation"
                value={selected.operation}
                en={en}
              />
            </div>
            {mode === "conflict" && (
              <div className="od-conflict" role="status">
                <strong>
                  {t("وضعیت سفارش تغییر کرده است", "Order status has changed")}
                </strong>
                <p>
                  {t(
                    "قبل از هر اقدام، اطلاعات تازه دریافت کنید. این تعارض نمونه است.",
                    "Reload the latest information before any action. This conflict is simulated.",
                  )}
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    setMode("normal")
                    loadPreview(selected.id)
                  }}
                >
                  {t("دریافت وضعیت تازه", "Reload latest state")}
                </button>
              </div>
            )}
            <section className="od-preview-section">
              <h3>{t("مشتری", "Customer")}</h3>
              <p>{orderText(en, selected.customer)}</p>
              <small>
                {t(
                  "اطلاعات حداقلی مجاز · بدون تماس کامل",
                  "Permitted minimum · no full contact details",
                )}
              </small>
            </section>
            <section className="od-preview-section">
              <h3>{t("اقلام ثبت‌شده", "Recorded items")}</h3>
              <OrderItemsSummary order={selected} en={en} expanded />
            </section>
            {financial && (
              <section className="od-preview-section">
                <h3>{t("مبلغ تاریخی سفارش", "Historical order total")}</h3>
                <HistoricalOrderAmount order={selected} en={en} />
                <p className="od-note">
                  {t(
                    "قیمت ثبت‌شده هنگام سفارش؛ با قیمت جاری جایگزین نشده است.",
                    "Recorded at purchase; not replaced with current catalog prices.",
                  )}
                </p>
              </section>
            )}
            <OrderShipmentCard order={selected} en={en} />
            <OrderTimeline order={selected} en={en} />
            <div className="od-preview-actions">
              {mode !== "conflict" && (
                <>
                  {financial &&
                    ["verification", "allocation"].includes(
                      selected.operation === "allocation"
                        ? "allocation"
                        : selected.payment,
                    ) && (
                      <button
                        className="button secondary"
                        onClick={() => {
                          setPreviewOpen(false)
                          onNavigate(
                            t(
                              "بررسی و تطبیق پرداخت",
                              "Payment review & reconciliation",
                            ),
                            `/payments?order=${selected.id}&status=needs-review`,
                          )
                        }}
                      >
                        {t(
                          "بررسی پرداخت در صفحه مستقل",
                          "Review payment on separate page",
                        )}
                      </button>
                    )}
                  {selected.request === "return" && (
                    <button
                      className="button secondary"
                      onClick={() => {
                        setPreviewOpen(false)
                        onNavigate(
                          t("بررسی مرجوعی", "Return review"),
                          `/shipping?order=${selected.id}&status=return-review`,
                        )
                      }}
                    >
                      {t("بررسی مرجوعی", "Review return")}
                    </button>
                  )}
                  <button
                    className="button primary"
                    onClick={() => {
                      setPreviewOpen(false)
                      onNavigate(
                        t("جزئیات کامل سفارش", "Full order details"),
                        `/orders/${selected.id}`,
                      )
                    }}
                  >
                    {t("مشاهده جزئیات کامل", "View full details")}
                    <span aria-hidden="true">{en ? "→" : "←"}</span>
                  </button>
                </>
              )}
              <p className="od-note">
                {t(
                  "این پیش‌نمایش فرم تغییر سفارش یا عملیات مالی نیست. شناسه سفارش به‌تنهایی مجوز دسترسی نیست.",
                  "This preview is not an order-edit or financial-action form. An order ID alone is not authorization.",
                )}
              </p>
            </div>
          </>
        ) : null}
      </OrderDialog>
      <OrderDialog
        open={confirmation && financial}
        onClose={() => setConfirmation(false)}
        title={t(
          "تأیید اقدام حساس · الگوی نمونه",
          "Sensitive action confirmation · sample pattern",
        )}
      >
        <p>
          {t(
            "عملیات حساس باید در صفحه مستقل با مجوز سرویس و وضعیت تازه بررسی شود. این نمونه هیچ پرداخت یا بازپرداختی انجام نمی‌دهد.",
            "Sensitive actions require a separate review page, service authorization and fresh state. This sample performs no payment or refund.",
          )}
        </p>
        <div className="od-sheet-actions">
          <button
            className="button secondary"
            onClick={() => setConfirmation(false)}
          >
            {t("انصراف", "Cancel")}
          </button>
          <button
            className="button primary"
            onClick={() => setConfirmation(false)}
          >
            {t("بستن نمونه؛ بدون عملیات", "Close sample; no operation")}
          </button>
        </div>
      </OrderDialog>
    </div>
  )
}
