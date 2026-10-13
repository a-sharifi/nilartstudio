import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useRef, useState } from "react"
import {
  demoOpsService,
  initialOpsFilters,
  opsPermissions,
  type OpsFilters,
  type OpsInventoryResponse,
  type OpsMode,
  type OpsRole,
  type OpsSummary,
  type StockDetail,
  type StockType,
} from "./operations-data"
import {
  InventoryMobileCard,
  InventoryTable,
  OpsEmpty,
  OpsError,
  OpsModal,
  OpsOperationForm,
  OpsPanel,
  OpsResultPattern,
  OpsShortageCard,
  OpsSkeleton,
  OpsStatusBadge,
  OpsTimeline,
  ProductionBatchCard,
  QualityControlPattern,
  ReservationCard,
  StockDetailPattern,
  opsText,
} from "./OperationsComponents"
import "./operations.css"

export default function OperationsPage({
  en,
  role,
  onNavigate,
  onSessionExpired,
}: {
  en: boolean
  role: "owner" | "warehouse" | "finance"
  onNavigate: (title: string, route: string) => void
  onSessionExpired: () => void
}) {
  return (
    <OperationsOverview
      key={role}
      en={en}
      role={role}
      onNavigate={onNavigate}
      onSessionExpired={onSessionExpired}
    />
  )
}
function OperationsOverview({
  en,
  role,
  onNavigate,
  onSessionExpired,
}: {
  en: boolean
  role: "owner" | "warehouse" | "finance"
  onNavigate: (title: string, route: string) => void
  onSessionExpired: () => void
}) {
  const t = (fa: string, english: string) => (en ? english : fa)
  const num = (value: number) =>
    new Intl.NumberFormat(en ? "en" : "fa").format(value)
  const [productionDemo, setProductionDemo] = useState(false)
  const scopeRole: OpsRole =
    role === "owner" && productionDemo ? "production" : role
  const permissions = opsPermissions(scopeRole)
  const [mode, setMode] = useState<OpsMode>("normal")
  const [filters, setFilters] = useState<OpsFilters>(() => {
    const search = new URLSearchParams(location.search)
    const type = search.get("type")
    return {
      ...initialOpsFilters,
      type: ["finished", "materials", "wip", "bundles"].includes(type ?? "")
        ? type as StockType
        : "finished",
      status:
        search.get("status") === "low" || search.get("filter") === "shortages"
          ? "low"
          : search.get("status") === "qc"
            ? "qc"
            : "",
    }
  })
  const [query, setQuery] = useState(""),
    [advanced, setAdvanced] = useState(false),
    [sheet, setSheet] = useState(false),
    [library, setLibrary] = useState(false)
  const [inventory, setInventory] = useState<{
    scope: OpsRole
    data: OpsInventoryResponse
  } | null>(null)
  const [summary, setSummary] = useState<{
    scope: OpsRole
    data: OpsSummary
  } | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(true),
    [summaryLoading, setSummaryLoading] = useState(true)
  const [inventoryError, setInventoryError] = useState(false),
    [summaryError, setSummaryError] = useState(false)
  const [refresh, setRefresh] = useState(0),
    [summaryRetry, setSummaryRetry] = useState(0)
  const [detail, setDetail] = useState<{
      scope: OpsRole
      data: StockDetail
    } | null>(null),
    [preview, setPreview] = useState(false),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const detailAbort = useRef<AbortController | null>(null),
    detailCode = useRef("")
  const inv = inventory?.scope === scopeRole ? inventory.data : null,
    sum = summary?.scope === scopeRole ? summary.data : null,
    selected = detail?.scope === scopeRole ? detail.data : null
  const denied = mode === "denied"
  const inventoryKey = JSON.stringify(filters)
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setFilters((current) =>
          current.query === query ? current : { ...current, query, page: 1 },
        ),
      300,
    )
    return () => clearTimeout(timer)
  }, [query])
  useEffect(() => {
    const controller = new AbortController()
    setInventory(null)
    setInventoryError(false)
    setInventoryLoading(!denied)
    if (denied || mode === "loading") return () => controller.abort()
    demoOpsService
      .inventory(filters, scopeRole, mode, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setInventory({ scope: scopeRole, data: result })
          setInventoryLoading(false)
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setInventoryError(true)
          setInventoryLoading(false)
        }
      })
    return () => controller.abort()
  }, [inventoryKey, scopeRole, mode, refresh, denied])
  useEffect(() => {
    const controller = new AbortController()
    setSummary(null)
    setSummaryError(false)
    setSummaryLoading(!denied)
    if (denied || mode === "loading") return () => controller.abort()
    demoOpsService
      .summary(
        scopeRole,
        summaryRetry > 0 && mode === "partial" ? "normal" : mode,
        controller.signal,
      )
      .then((result) => {
        if (!controller.signal.aborted) {
          setSummary({ scope: scopeRole, data: result })
          setSummaryLoading(false)
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setSummaryError(true)
          setSummaryLoading(false)
        }
      })
    return () => controller.abort()
  }, [scopeRole, mode, refresh, summaryRetry, denied])
  useEffect(() => {
    setDetail(null)
    setPreview(false)
    setConfirm(false)
    detailAbort.current?.abort()
    setLibrary(false)
  }, [scopeRole, mode])
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex, nofollow"
    document.head.appendChild(meta)
    return () => {
      meta.remove()
      detailAbort.current?.abort()
    }
  }, [])
  function setFilter(key: keyof OpsFilters, value: string) {
    setFilters((previous) => ({ ...previous, [key]: value, page: 1 }))
  }
  function reset() {
    setFilters({ ...initialOpsFilters, type: filters.type })
    setQuery("")
  }
  function setType(type: StockType) {
    setFilters({ ...initialOpsFilters, type, query })
    setAdvanced(false)
  }
  function chooseMode(next: OpsMode) {
    setSummaryRetry(0)
    if (next === "empty") setFilters((current) => ({ ...current, page: 1 }))
    setMode(next)
  }
  function retryOperations() {
    setSummaryRetry((n) => n + 1)
    if (mode === "error") setMode("normal")
  }
  async function viewStock(code: string) {
    detailAbort.current?.abort()
    const controller = new AbortController()
    detailAbort.current = controller
    detailCode.current = code
    setDetail(null)
    setPreview(true)
    setDetailLoading(true)
    setDetailError(false)
    try {
      const data = await demoOpsService.detail(
        code,
        scopeRole,
        controller.signal,
      )
      if (!controller.signal.aborted) {
        setDetail({ scope: scopeRole, data })
        setDetailLoading(false)
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setDetailError(true)
        setDetailLoading(false)
      }
    }
  }
  const tabs = [
    ["finished", "محصولات نهایی", "Finished products"],
    ["materials", "مواد اولیه", "Materials"],
    ["wip", "تولید ناتمام", "Work in progress"],
    ["bundles", "ظرفیت پکیج‌ها", "Bundle availability"],
  ] as const
  const filterLabels: Record<string, readonly [string, string]> = {
    family: ["خانواده", "Family"],
    collection: ["کالکشن", "Collection"],
    status: ["وضعیت", "Status"],
    unit: ["واحد", "Unit"],
    batch: ["بچ", "Batch"],
  }
  const filterOptions: Record<string, Record<string, readonly [string, string]>> =
    {
      family:
        filters.type === "finished"
          ? {
              notebook: ["دفتر", "Notebooks"],
              paper: ["محصول کاغذی", "Paper goods"],
              artwork: ["نقاشی آماده", "Ready artwork"],
            }
          : {},
      collection: {
        garden: ["باغ خیال", "Garden"],
        quiet: ["روزهای آرام", "Quiet days"],
      },
      status: {
        healthy: ["عادی", "Normal"],
        low: ["کم‌موجود", "Low stock"],
        review: ["نیازمند بررسی", "Needs review"],
        qc: ["منتظر QC", "Awaiting QC"],
        incomplete: ["تبدیل ناقص", "Incomplete conversion"],
      },
      unit: {
        sheets: ["ورق", "Sheets"],
        m: ["متر", "Meters"],
        g: ["گرم", "Grams"],
      },
      batch: Object.fromEntries(
        (sum?.batches ?? []).map((batch) => [batch.id, [batch.id, batch.id]]),
      ),
    }
  const visibleFields = [
    "status",
    ...(filters.type === "finished" ? ["family", "collection"] : []),
    ...(filters.type === "materials" ? ["unit"] : []),
    ...(filters.type === "wip" ? ["batch"] : []),
  ]
  const filterControls = (
    <div className="op-filter-fields">
      {visibleFields.map((key) => (
        <label key={key}>
          {opsText(en, filterLabels[key])}
          <SelectDropdown
            value={filters[(key as keyof OpsFilters)]}
            onChange={(e) => setFilter(key as keyof OpsFilters, e.target.value)}
          >
            <option value="">{t("همه", "All")}</option>
            {Object.entries(filterOptions[key]).map(([value, label]) => (
              <option key={value} value={value}>
                {opsText(en, label)}
              </option>
            ))}
          </SelectDropdown>
        </label>
      ))}
    </div>
  )
  const activeFilters = Object.entries(filters).filter(
    ([key, value]) => value && !["type", "page", "query"].includes(key),
  )
  const pages = inv ? Math.max(1, Math.ceil(inv.total / inv.pageSize)) : 1
  const link = (fa: string, english: string, route: string) => (
    <button
      className="ad-link"
      onClick={() => onNavigate(t(fa, english), route)}
    >
      {t(fa, english)}
      <span aria-hidden="true">{en ? "→" : "←"}</span>
    </button>
  )
  const received = [inv?.receivedAt, sum?.receivedAt]
    .filter((value): value is string => !!value)
    .sort()
    .at(-1)
  if (denied)
    return (
      <div className="op-safe">
        <span className="ad-badge danger">
          {t("عدم مجوز", "Permission denied")}
        </span>
        <h1>
          {t(
            "دسترسی به عملیات مجاز نیست",
            "Operations access is not authorized",
          )}
        </h1>
        <p>
          {t(
            "هیچ مقدار یا هزینه‌ای در این نما دریافت یا نمایش داده نمی‌شود.",
            "No quantities or costs are requested or shown in this view.",
          )}
        </p>
        <button
          className="button secondary"
          onClick={() => chooseMode("normal")}
        >
          {t("بازگشت به نمونه مجاز", "Return to authorized demo")}
        </button>
      </div>
    )
  return (
    <div className="op-page">
      <div className="ad-breadcrumb">
        {t("مدیریت", "Admin")}
        <span>/</span>
        {t("عملیات", "Operations")}
        <span>/</span>
        <strong>{t("انبار", "Inventory")}</strong>
        <span className="ad-page-id">OPS–01</span>
      </div>
      <div className="ad-heading">
        <div>
          <h1>
            {t("نمای انبار و عملیات", "Inventory and operations overview")}
          </h1>
          <p>
            {t(
              "موجودی آماده، خریدهای باز و مراحل تولید را با دید روشن دنبال کنید.",
              "Track ready stock, open purchases and production stages with clarity.",
            )}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => setLibrary(!library)}
        >
          {library
            ? t("بازگشت به نمای انبار", "Back to inventory overview")
            : t("کامپوننت‌های OPS", "OPS components")}
        </button>
      </div>
      <div className="ad-meta">
        <span>
          <span className="ad-live-dot" />
          {t("آخرین دریافت نمونه: ", "Sample last received: ")}
          {received
            ? new Date(received).toLocaleTimeString(en ? "en" : "fa", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Tehran",
              })
            : "—"}{" "}
          · {t("زمان تهران", "Tehran time")}
        </span>
        <button
          onClick={() => setRefresh((n) => n + 1)}
          disabled={mode === "loading"}
        >
          {t("تازه‌سازی نمونه", "Refresh sample")}
        </button>
      </div>
      <div className="ad-demo-note">
        <span>
          <span className="ad-badge warm">Demo</span>
          {t(
            "داده‌ها فرضی‌اند؛ هیچ دریافت، مصرف یا تأیید QC واقعی انجام نمی‌شود. یک انبار عملیاتی نمونه.",
            "Fictional data; no real receipt, consumption or QC approval. One sample operational warehouse.",
          )}
        </span>
        <SelectDropdown
          aria-label={t("حالت نمایشی عملیات", "Operations preview state")}
          value={mode}
          onChange={(e) => {
            if (e.target.value === "expired") {
              setInventory(null)
              setSummary(null)
              setDetail(null)
              onSessionExpired()
            } else chooseMode(e.target.value as OpsMode)
          }}
        >
          {[
            ["normal", "عادی", "Normal"],
            ["loading", "بارگذاری", "Loading"],
            ["empty", "بدون مورد", "Empty"],
            ["error", "خطای شبکه", "Network error"],
            ["partial", "خطای بخش عملیات", "Operations section error"],
            ["conversion", "تبدیل ناقص", "Incomplete conversion"],
            ["conflict", "تعارض سند", "Document conflict"],
            ["denied", "عدم مجوز", "Permission denied"],
            ["expired", "پایان نشست", "Session expired"],
          ].map(([value, fa, english]) => (
            <option key={value} value={value}>
              {t(fa, english)}
            </option>
          ))}
        </SelectDropdown>
      </div>
      {role === "owner" && (
        <div className="op-role-preview">
          <span>
            {t("دامنه مجوز عملیاتی Demo", "Demo operational permission scope")}
          </span>
          <label>
            <input
              type="checkbox"
              checked={productionDemo}
              onChange={(e) => {
                setProductionDemo(e.target.checked)
                setFilters({
                  ...initialOpsFilters,
                  type: e.target.checked ? "wip" : "finished",
                })
                setQuery("")
              }}
            />
            {t(
              "نمای مسئول تولید؛ بدون ارزش مالی",
              "Production operator view; no financial valuation",
            )}
          </label>
        </div>
      )}
      {(mode === "conversion" || mode === "conflict") && (
        <div className="op-state-notice" role="status">
          <strong>
            {mode === "conversion"
              ? t(
                  "تبدیل واحد برای این عملیات کامل نیست.",
                  "Unit conversion is incomplete for this operation.",
                )
              : t(
                  "موجودی یا وضعیت سند تغییر کرده است. اطلاعات جدید را بررسی کنید.",
                  "Stock or document status has changed. Review the latest information.",
                )}
          </strong>
          <p>
            {t(
              "ثبت مستقیم در این نما وجود ندارد؛ فرم نمونه تا رفع این وضعیت ادامه نمی‌یابد.",
              "There is no direct posting here; the sample form is blocked until this state is resolved.",
            )}
          </p>
          <button
            className="ad-link"
            onClick={() => {
              chooseMode("normal")
              setRefresh((n) => n + 1)
            }}
          >
            {t("بررسی اطلاعات جدید نمونه", "Reload sample information")}
          </button>
        </div>
      )}
      {library ? (
        <section className="op-library">
          <div className="ad-panel-head">
            <div>
              <h2>
                {t("الگوهای مشترک عملیات", "Reusable operations patterns")}
              </h2>
              <p>
                {t(
                  "فقط بیس کامپوننتی؛ صفحات OPS-02 تا OPS-11 ساخته نشده‌اند",
                  "Component base only; OPS-02–OPS-11 are not built",
                )}
              </p>
            </div>
          </div>
          <div className="op-permissions">
            {Object.entries(permissions).map(([key, allowed]) => (
              <span className={`ad-badge ${allowed ? "green" : ""}`} key={key}>
                {
                  ({
                    view: t("مشاهده", "View"),
                    receive: t("دریافت", "Receive"),
                    consume: t("مصرف", "Consume"),
                    adjust: t("اصلاح", "Adjust"),
                    qc: t("QC", "QC"),
                    value: t("ارزش مالی", "Financial value"),
                  } as Record<string, string>)[key]
                }
                :{" "}
                {allowed
                  ? t("مجاز در Demo", "Allowed in Demo")
                  : t("غیرمجاز", "Not allowed")}
              </span>
            ))}
          </div>
          <div className="op-library-grid">
            <OpsPanel
              title={t(
                "جزئیات SKU و گردش append-only",
                "SKU detail & append-only movement log",
              )}
              description={t(
                "نمونه مشخصات، اسناد و تاریخچه؛ بدون فرم ویرایش سلولی",
                "Specs, documents & history; no inline quantity edits",
              )}
            >
              {inv?.items[0] ? (
                <>
                  <button
                    className="button secondary"
                    onClick={() => viewStock(inv.items[0].code)}
                  >
                    {t("باز کردن نمونه جزئیات", "Open detail pattern")}
                  </button>
                  <InventoryMobileCard
                    item={inv.items[0]}
                    en={en}
                    onView={() => viewStock(inv.items[0].code)}
                  />
                </>
              ) : inventoryLoading ? (
                <OpsSkeleton />
              ) : (
                <OpsEmpty en={en} />
              )}
            </OpsPanel>
            <OpsPanel title={t("فرم دریافت خرید", "Purchase receipt form")}>
              <OpsOperationForm
                kind="receipt"
                en={en}
                allowed={permissions.receive}
                conversionReady={mode !== "conversion"}
                conflict={mode === "conflict"}
                onReview={() => setConfirm(true)}
              />
            </OpsPanel>
            <OpsPanel
              title={t("فرم مصرف مواد", "Material consumption form")}
              description={t(
                "ارجاع به نسخه BOM تأییدشده؛ نه ویرایش فرمول ساخت",
                "References approved BOM; not recipe editing",
              )}
            >
              <OpsOperationForm
                kind="consumption"
                en={en}
                allowed={permissions.consume}
                conversionReady={mode !== "conversion"}
                conflict={mode === "conflict"}
                onReview={() => setConfirm(true)}
              />
            </OpsPanel>
            <OpsPanel
              title={t("خروجی سالم، ضایعات و QC", "Healthy output, waste & QC")}
            >
              <QualityControlPattern en={en} />
              <OpsOperationForm
                kind="output"
                en={en}
                allowed={permissions.qc}
                conflict={mode === "conflict"}
                onReview={() => setConfirm(true)}
              />
            </OpsPanel>
            <OpsPanel
              title={t(
                "افتتاحیه و اصلاح مستند",
                "Documented opening stock & adjustment",
              )}
            >
              <OpsOperationForm
                kind="adjustment"
                en={en}
                allowed={permissions.adjust}
                conflict={mode === "conflict"}
                onReview={() => setConfirm(true)}
              />
              <OpsResultPattern en={en} />
            </OpsPanel>
            <OpsPanel title={t("کارت بچ و رزرو", "Batch & reservation cards")}>
              {sum?.batches[0] && (
                <ProductionBatchCard
                  batch={sum.batches[0]}
                  en={en}
                  onView={() =>
                    onNavigate(
                      t("بچ تولید", "Production batch"),
                      `/inventory/batches/${sum.batches[0].id}`,
                    )
                  }
                />
              )}{" "}
              {sum?.reservations[0] && (
                <ReservationCard
                  reservation={sum.reservations[0]}
                  en={en}
                  onView={() =>
                    onNavigate(
                      t("رزرو", "Reservation"),
                      "/inventory/movements?reservation=RSV-108",
                    )
                  }
                />
              )}
            </OpsPanel>
            <OpsPanel
              title={t("Skeleton، Empty و Error", "Skeleton, Empty & Error")}
            >
              <OpsSkeleton />
              <OpsEmpty en={en} filtered />
              <OpsError en={en} onRetry={() => setRefresh((n) => n + 1)} />
            </OpsPanel>
          </div>
        </section>
      ) : (
        <>
          <section className="op-attention">
            <div className="ad-panel-head">
              <div>
                <h2>{t("نیازمند رسیدگی", "Needs attention")}</h2>
                <p>
                  {t(
                    "صف‌های جاری؛ جمع شمارش‌ها تعداد اقلام یکتا نیست",
                    "Current queues; counts do not sum to unique items",
                  )}
                </p>
              </div>
              <span className="op-current-label">
                {t("وضعیت جاری انبار", "Current stock snapshot")}
              </span>
            </div>
            {summaryLoading ? (
              <OpsSkeleton />
            ) : summaryError ? (
              <OpsError
                en={en}
                onRetry={() => {
                  setSummaryRetry((n) => n + 1)
                  if (mode === "error") chooseMode("normal")
                }}
              />
            ) : (
              sum && (
                <div className="op-shortage-grid">
                  {sum.alerts.map((alert) => (
                    <OpsShortageCard
                      key={alert.key}
                      title={alert.title}
                      count={alert.count}
                      description={alert.description}
                      en={en}
                      onView={() => {
                        if (alert.filter) {
                          setFilters({ ...initialOpsFilters, ...alert.filter })
                          setQuery("")
                        } else onNavigate(opsText(en, alert.title), alert.route)
                      }}
                    />
                  ))}
                </div>
              )
            )}
          </section>
          <div className="op-metric-grid">
            {summaryLoading ? (
              <OpsSkeleton />
            ) : (
              sum?.metrics.map((metric, i) => (
                <article className="op-metric" key={i}>
                  <span>{opsText(en, metric.label)}</span>
                  <strong>{num(metric.count)}</strong>
                  <p>{opsText(en, metric.definition)}</p>
                </article>
              ))
            )}
          </div>
          <section className="ad-panel op-inventory-panel">
            <div
              className="op-stock-tabs"
              role="group"
              aria-label={t("نوع موجودی", "Stock type")}
            >
              {tabs.map(([type, fa, english]) => (
                <button
                  key={type}
                  className={filters.type === type ? "active" : ""}
                  aria-pressed={filters.type === type}
                  onClick={() => setType(type)}
                >
                  {t(fa, english)}
                </button>
              ))}
            </div>
            <div className="op-toolbar">
              <div className="op-search">
                <label htmlFor="ops-search">
                  {t("جست‌وجوی موجودی", "Search inventory")}
                </label>
                <input
                  id="ops-search"
                  type="search"
                  dir="auto"
                  value={query}
                  placeholder={t(
                    "نام، SKU یا کد ماده…",
                    "Name, SKU or material code…",
                  )}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button
                className="button secondary op-desktop-filter"
                aria-expanded={advanced}
                onClick={() => setAdvanced(!advanced)}
              >
                {t("فیلترها", "Filters")}
                <span aria-hidden="true">{advanced ? "−" : "+"}</span>
              </button>
              <button
                className="button secondary op-mobile-filter"
                onClick={() => setSheet(true)}
              >
                {t("فیلترها", "Filters")}
                {activeFilters.length > 0 && (
                  <span>{num(activeFilters.length)}</span>
                )}
              </button>
            </div>
            {advanced && <div className="op-advanced">{filterControls}</div>}
            {(activeFilters.length > 0 || query) && (
              <div className="op-filter-chips">
                {activeFilters.map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as keyof OpsFilters, "")}
                    aria-label={
                      t("حذف فیلتر ", "Remove filter ") +
                      opsText(en, filterLabels[key])
                    }
                  >
                    {opsText(en, filterLabels[key])}:{" "}
                    {opsText(
                      en,
                      filterOptions[key]?.[String(value)] ?? [
                        String(value),
                        String(value),
                      ],
                    )}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
                {query && (
                  <button
                    onClick={() => {
                      setQuery("")
                      setFilter("query", "")
                    }}
                  >
                    {t("جست‌وجو فعال", "Search active")}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
                <button className="op-clear" onClick={reset}>
                  {t("پاک‌کردن همه", "Clear all")}
                </button>
              </div>
            )}
            <div className="op-inventory-meta">
              <span role="status" aria-live="polite">
                {inventoryLoading
                  ? t("در حال دریافت…", "Loading…")
                  : inv
                    ? num(inv.total) + t(" مورد", " items")
                    : t("نتایج در دسترس نیست", "Results unavailable")}
              </span>
              <span>
                {t(
                  "یک انبار عملیاتی · مقدارها با واحد پایه",
                  "One operational warehouse · quantities in base units",
                )}
              </span>
            </div>
            {filters.type === "finished" && inv && (
              <p className="op-model-note">
                {opsText(en, inv.formula)}{" "}
                {t(
                  "SKU چندکالکشنی موجودی مشترک دارد؛ تعداد دفتر با تعداد برگ متفاوت است.",
                  "Multi-collection SKUs share stock; notebook count is not sheet count.",
                )}
              </p>
            )}
            {filters.type === "materials" && (
              <p className="op-model-note">
                {t(
                  "بسته خرید، ورق مادر و برگ برش‌خورده واحدهای مستقل‌اند؛ دریافت واقعی و تبدیل معتبر لازم است.",
                  "Purchase packs, parent sheets and cut sheets are separate units; actual receipt and valid conversion are required.",
                )}
              </p>
            )}
            {filters.type === "bundles" && (
              <p className="op-model-note">
                {t(
                  "ظرفیت از اجزای قابل تخصیص و پس از تجمیع SKU تکراری است؛ پکیج انبار مستقل ندارد.",
                  "Capacity comes from allocatable components after repeated-SKU aggregation; bundles have no independent stock.",
                )}
              </p>
            )}
            {filters.type === "wip" && (
              <p className="op-model-note">
                {t(
                  "هدف تولید و خروجی بررسی‌نشده به موجودی قابل فروش اضافه نمی‌شوند.",
                  "Production targets and uninspected output do not increase sellable stock.",
                )}
              </p>
            )}
            {inventoryLoading ? (
              <OpsSkeleton />
            ) : inventoryError ? (
              <OpsError
                en={en}
                onRetry={() => {
                  chooseMode("normal")
                  setRefresh((n) => n + 1)
                }}
              />
            ) : inv?.items.length ? (
              <>
                <div className="op-table-wrap">
                  <InventoryTable
                    items={inv.items}
                    en={en}
                    onView={viewStock}
                  />
                </div>
                <div className="op-mobile-stock-list">
                  {inv.items.map((item) => (
                    <InventoryMobileCard
                      key={item.code}
                      item={item}
                      en={en}
                      onView={() => viewStock(item.code)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <OpsEmpty
                en={en}
                filtered={activeFilters.length > 0 || !!query}
                message={
                  activeFilters.length || query
                    ? undefined
                    : t(
                        "در این نوع موجودی موردی ثبت نشده است.",
                        "No records exist for this stock type.",
                      )
                }
              />
            )}
            <div className="op-pagination">
              <span>
                {inv && inv.total > 0
                  ? `${num((filters.page - 1) * inv.pageSize + 1)}–${num(Math.min(filters.page * inv.pageSize, inv.total))}${t(" از ", " of ")}${num(inv.total)}`
                  : "—"}
              </span>
              <div>
                <button
                  className="button secondary"
                  disabled={inventoryLoading || filters.page <= 1}
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: f.page - 1 }))
                  }
                >
                  {t("قبلی", "Previous")}
                </button>
                <span>
                  {num(filters.page)} / {inv ? num(pages) : "—"}
                </span>
                <button
                  className="button secondary"
                  disabled={inventoryLoading || !inv || filters.page >= pages}
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: f.page + 1 }))
                  }
                >
                  {t("بعدی", "Next")}
                </button>
              </div>
            </div>
          </section>
          <div className="op-dashboard-grid">
            <OpsPanel
              title={t(
                "خریدهای در انتظار دریافت",
                "Purchases awaiting receipt",
              )}
              description={t(
                "خرید، دریافت و پرداخت؛ سه رخداد مستقل",
                "Purchase, receipt and payment: three independent events",
              )}
              action={link(
                "مشاهده خریدها",
                "View purchases",
                "/inventory/purchases",
              )}
            >
              {summaryLoading ? (
                <OpsSkeleton />
              ) : summaryError ? (
                <OpsError en={en} onRetry={retryOperations} />
              ) : !sum?.purchases.length ? (
                <OpsEmpty
                  en={en}
                  message={t("خرید بازی وجود ندارد.", "No open purchases.")}
                />
              ) : (
                <div className="op-purchases">
                  {sum.purchases.map((purchase) => (
                    <article key={purchase.id}>
                      <header>
                        <strong dir="ltr">{purchase.id}</strong>
                        <span
                          className={`ad-badge ${
                            purchase.receipt === "partial" ? "warm" : ""
                          }`}
                        >
                          {purchase.receipt === "partial"
                            ? t("دریافت جزئی", "Partially received")
                            : purchase.receipt === "draft"
                              ? t("پیش‌نویس خرید", "Draft purchase")
                              : t("منتظر دریافت", "Awaiting receipt")}
                        </span>
                      </header>
                      <h3>{opsText(en, purchase.supplier)}</h3>
                      <p>{opsText(en, purchase.items)}</p>
                      <small>
                        {new Date(purchase.at).toLocaleDateString(
                          en ? "en-GB" : "fa-IR",
                          { timeZone: "Asia/Tehran" },
                        )}
                        {purchase.payment &&
                          " · " + opsText(en, purchase.payment)}
                      </small>
                      <div>
                        {link(
                          "مشاهده خرید",
                          "View purchase",
                          `/inventory/purchases/${purchase.id}`,
                        )}
                        {permissions.receive &&
                          purchase.receipt !== "draft" &&
                          link(
                            "ثبت دریافت",
                            "Record receipt",
                            `/inventory/receipts/new?purchase=${purchase.id}`,
                          )}
                      </div>
                    </article>
                  ))}
                  <p className="op-note">
                    {t(
                      "پیش‌نویس و پرداخت خرید موجودی ایجاد نمی‌کنند؛ برگشت به سند دریافت یا خرید اصلی مرتبط است.",
                      "Draft purchases and payments do not create stock; purchase returns link to the original receipt or purchase.",
                    )}
                  </p>
                </div>
              )}
            </OpsPanel>
            <OpsPanel
              title={t(
                "تولید جاری و کنترل کیفیت",
                "Production in progress & QC",
              )}
              description={t(
                "تولید داخلی برای شارژ انبار؛ مستقل از اجرای نقاشی سفارشی",
                "Internal production replenishes stock, separate from commissioned artwork",
              )}
              action={link(
                "مشاهده تولید",
                "View production",
                "/inventory/batches",
              )}
            >
              {summaryLoading ? (
                <OpsSkeleton />
              ) : summaryError ? (
                <OpsError en={en} onRetry={retryOperations} />
              ) : !sum?.batches.length ? (
                <OpsEmpty
                  en={en}
                  message={t("بچ جاری وجود ندارد.", "No active batches.")}
                />
              ) : (
                <div className="op-batch-list">
                  {sum.batches.map((batch) => (
                    <ProductionBatchCard
                      batch={batch}
                      en={en}
                      key={batch.id}
                      onView={() =>
                        onNavigate(
                          t("بچ تولید", "Production batch"),
                          `/inventory/batches/${batch.id}`,
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </OpsPanel>
          </div>
          <div className="op-dashboard-grid">
            <OpsPanel
              title={t(
                "رزروهای نیازمند بررسی",
                "Reservations requiring review",
              )}
              description={t(
                "بررسی تراکنش قبل از تصمیم آزادسازی؛ بدون عملیات گروهی",
                "Verify transactions before release decisions; no bulk actions",
              )}
              action={link(
                "گردش و رزرو",
                "Movements & reservations",
                "/inventory/movements?status=reservation-review",
              )}
            >
              {summaryLoading ? (
                <OpsSkeleton />
              ) : summaryError ? (
                <OpsError en={en} onRetry={retryOperations} />
              ) : !sum?.reservations.length ? (
                <OpsEmpty
                  en={en}
                  message={t(
                    "رزروی نیازمند بررسی نیست.",
                    "No reservations require review.",
                  )}
                />
              ) : (
                sum.reservations.map((reservation) => (
                  <ReservationCard
                    reservation={reservation}
                    en={en}
                    key={reservation.id}
                    onView={() =>
                      onNavigate(
                        t("رزرو", "Reservation"),
                        `/inventory/movements?reservation=${reservation.id}`,
                      )
                    }
                  />
                ))
              )}
            </OpsPanel>
            <OpsPanel
              title={t(
                "دسترسی به عملیات مجاز",
                "Authorized operation destinations",
              )}
              description={t(
                "ثبت و تأیید فقط در فرم مستقل و با پاسخ معتبر سرویس",
                "Record & approve on separate forms with valid service responses",
              )}
            >
              <div className="op-operation-links">
                {permissions.receive &&
                  link(
                    "ثبت دریافت خرید",
                    "Record purchase receipt",
                    "/inventory/receipts/new",
                  )}
                {permissions.consume &&
                  link(
                    "ثبت مصرف مواد",
                    "Record material consumption",
                    "/inventory/batches?operation=consume",
                  )}
                {permissions.qc &&
                  link(
                    "بررسی کنترل کیفیت",
                    "Review quality control",
                    "/inventory/quality?status=pending",
                  )}
                {permissions.adjust && (
                  <>
                    {link(
                      "ثبت موجودی افتتاحیه",
                      "Record opening stock",
                      "/inventory/adjustments/new?type=opening",
                    )}
                    {link(
                      "ثبت اصلاح موجودی",
                      "Record stock adjustment",
                      "/inventory/adjustments/new?type=adjustment",
                    )}
                  </>
                )}
                {permissions.value &&
                  link(
                    "گزارش ارزش مالی موجودی",
                    "Inventory valuation report",
                    "/finance/inventory-value",
                  )}
                {link(
                  "سفارش‌های آماده ارسال",
                  "Orders ready to ship",
                  "/orders?status=ready-to-ship",
                )}
              </div>
              <p className="op-note">
                {t(
                  "مواد، خدمات و BOM در COST مدیریت می‌شوند؛ عملیات فقط به نسخه تأییدشده ارجاع می‌دهد. این صفحه انتشار قیمت یا بازپرداخت ندارد.",
                  "Materials, services & BOM are managed in COST; operations reference approved versions only. No price publishing or refunds here.",
                )}
              </p>
            </OpsPanel>
          </div>
        </>
      )}
      <footer className="ad-footer">
        <span>
          nilart. /{" "}
          {t(
            "هر مقدار، با واحد و ردپای روشن",
            "Every quantity, with a unit and a trace.",
          )}
        </span>
        <span>
          {t(
            "OPS-01 · داده Demo · مجوزها شبیه‌سازی‌اند",
            "OPS-01 · Demo data · permissions are simulated",
          )}
        </span>
      </footer>
      <OpsModal
        open={sheet}
        onClose={() => setSheet(false)}
        title={t("فیلتر موجودی", "Inventory filters")}
        sheet
      >
        {filterControls}
        <div className="op-modal-actions">
          <button className="button secondary" onClick={reset}>
            {t("پاک‌کردن همه", "Clear all")}
          </button>
          <button className="button primary" onClick={() => setSheet(false)}>
            {t("مشاهده نتایج", "View results")}
          </button>
        </div>
      </OpsModal>
      <OpsModal
        open={preview}
        onClose={() => {
          setPreview(false)
          detailAbort.current?.abort()
        }}
        title={t("جزئیات موجودی و گردش", "Stock detail & movements")}
        drawer
      >
        {detailLoading ? (
          <OpsSkeleton />
        ) : detailError ? (
          <OpsError en={en} onRetry={() => viewStock(detailCode.current)} />
        ) : selected ? (
          <>
            <span className="ad-badge warm">Demo</span>
            {mode === "conflict" && (
              <div className="op-state-notice">
                <strong>
                  {t(
                    "موجودی یا وضعیت سند تغییر کرده است. اطلاعات جدید را بررسی کنید.",
                    "Stock or document status has changed. Review the latest information.",
                  )}
                </strong>
                <button
                  className="button secondary"
                  onClick={() => {
                    chooseMode("normal")
                    setRefresh((n) => n + 1)
                  }}
                >
                  {t("دریافت اطلاعات تازه نمونه", "Reload sample information")}
                </button>
              </div>
            )}
            <StockDetailPattern
              detail={selected}
              en={en}
              onNavigate={() => {
                setPreview(false)
                onNavigate(
                  t("گردش موجودی", "Stock movements"),
                  selected.item.type === "bundles"
                    ? `/inventory/movements?bundle=${selected.item.code}`
                    : `/inventory/movements?item=${selected.item.code}`,
                )
              }}
            />
            <OpsTimeline movements={selected.movements} en={en} />
          </>
        ) : null}
      </OpsModal>
      <OpsModal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t(
          "تأیید سند · نمونه بدون ثبت",
          "Document confirmation · non-posting sample",
        )}
      >
        <p>
          {t(
            "این الگوی بررسی است. هیچ موجودی یا QC تغییر نمی‌کند؛ ثبت قطعی به مجوز سرویس، سند مرتبط، مقدار و واحد معتبر، actor و زمان نیاز دارد.",
            "This is a review pattern. No stock or QC changes; posting requires service authorization, a linked document, valid quantities/units, actor and time.",
          )}
        </p>
        <div className="op-modal-actions">
          <button
            className="button secondary"
            onClick={() => setConfirm(false)}
          >
            {t("انصراف", "Cancel")}
          </button>
          <button className="button primary" onClick={() => setConfirm(false)}>
            {t("بستن نمونه؛ بدون عملیات", "Close sample; no operation")}
          </button>
        </div>
      </OpsModal>
    </div>
  )
}
