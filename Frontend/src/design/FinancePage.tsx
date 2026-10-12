import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  demoFinanceService,
  financePermissions,
  financeRange,
  DEMO_FINANCE_BASIS,
  type FinanceDocument,
  type FinanceEnvelope,
  type FinanceMode,
  type FinanceRequest,
  type FinanceRole,
  type FinanceSections,
} from "./finance-data"
import {
  AmountBreakdown,
  FinanceAccountCard,
  FinanceAlertCard,
  FinanceCashFlow,
  FinanceDocumentDetail,
  FinanceDocumentTable,
  FinanceEmpty,
  FinanceError,
  FinanceMetricCard,
  FinanceModal,
  FinanceMoney,
  FinanceOperationResult,
  FinancePanel,
  FinanceSkeleton,
  ReceiptPaymentForm,
  ReconciliationCompare,
  finText,
} from "./FinanceComponents"
import "./finance.css"
interface FinanceSafeProps {
  en: boolean
  onBack: () => void
}
interface FinanceReportTarget {
  title: readonly [string, string]
  route: string
}

function useFinanceSection<K extends keyof FinanceSections>(
  section: K,
  request: FinanceRequest,
  enabled: boolean,
  refresh: number,
) {
  const [result, setResult] =
    useState<FinanceEnvelope<FinanceSections[K]> | null>(null)
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0)
  const [recover, setRecover] = useState(false)
  const identity = JSON.stringify(request)
  const lastIdentity = useRef(identity)
  const current = result && lastIdentity.current === identity ? result : null
  useEffect(() => {
    const controller = new AbortController()
    lastIdentity.current = identity
    setResult(null)
    setError(false)
    setLoading(enabled)
    if (!enabled || request.mode === "loading") return () => controller.abort()
    const effective = {
      ...request,
      mode: recover ? "normal" as const : request.mode,
    }
    demoFinanceService
      .load(section, effective, controller.signal)
      .then((envelope) => {
        if (!controller.signal.aborted) {
          setResult(envelope)
          setLoading(false)
        }
      })
      .catch((reason) => {
        if (reason.name !== "AbortError") {
          setError(true)
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [identity, section, enabled, refresh, retry, recover])
  useEffect(() => setRecover(false), [identity])
  return {
    result: current,
    loading,
    error,
    retry: () => {
      setRecover(true)
      setRetry((n) => n + 1)
    },
  }
}

export function FinanceExport({
  en,
  documents,
  range,
  allowed,
}: {
  en: boolean
  documents: FinanceDocument[]
  range: {
    start: string
    end: string
  }
  allowed: boolean
}) {
  const [status, setStatus] =
    useState<"idle" | "queued" | "processing" | "ready" | "failed">("idle")
  const [format, setFormat] = useState("csv")
  const [download, setDownload] = useState("")
  const job = useRef<AbortController | null>(null),
    url = useRef("")
  const context = range.start + range.end + JSON.stringify(documents)
  useEffect(() => {
    setStatus("idle")
    setDownload("")
    job.current?.abort()
    if (url.current) {
      URL.revokeObjectURL(url.current)
      url.current = ""
    }
    return () => {
      job.current?.abort()
      if (url.current) URL.revokeObjectURL(url.current)
    }
  }, [context, allowed])
  function prepare() {
    if (!allowed) return
    job.current?.abort()
    const controller = new AbortController()
    job.current = controller
    setStatus("queued")
    setTimeout(() => {
      if (!controller.signal.aborted) setStatus("processing")
    }, 150)
    setTimeout(() => {
      if (controller.signal.aborted) return
      if (url.current) URL.revokeObjectURL(url.current)
      const rows = [
        ["DEMO ONLY - NOT AN OFFICIAL ACCOUNTING OR TAX RECORD"],
        ["range_start_utc", range.start, "range_end_utc", range.end],
        [
          "document_id",
          "date_utc",
          "type",
          "direction",
          "amount_toman",
          "status",
          "reference",
        ],
        ...documents.map((doc) => [
          doc.id,
          doc.at,
          finText(true, doc.type),
          doc.direction,
          doc.amount,
          doc.status,
          doc.reference,
        ]),
      ]
      const csv =
        "\uFEFF" +
        rows
          .map((row) =>
            row.map((cell) => '"' + cell.replaceAll('"', '""') + '"').join(","),
          )
          .join("\r\n")
      url.current = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      )
      setDownload(url.current)
      setStatus("ready")
    }, 650)
  }
  if (!allowed) return null
  const labels = {
    idle: ["هنوز خروجی تهیه نشده", "No export prepared"],
    queued: ["در صف · نمونه", "Queued · sample"],
    processing: ["در حال آماده‌سازی · نمونه", "Preparing · sample"],
    ready: ["فایل Demo آماده است", "Demo file ready"],
    failed: ["تهیه فایل ناموفق بود", "Export preparation failed"],
  } as const
  return (
    <div className="fn-export">
      <div className="fn-export-head">
        <span className="fn-export-icon" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M12 11v6m-3-3 3 3 3-3" />
          </svg>
        </span>
        <div>
          <h3>{en ? "Accounting export" : "خروجی حسابدار"}</h3>
          <p>
            {en
              ? "Sample operational report, not a tax return or official ledger."
              : "گزارش عملیاتی نمونه؛ نه اظهارنامه یا دفتر رسمی."}
          </p>
        </div>
        <span className="ad-badge warm">Demo</span>
      </div>
      <div className="fn-export-controls">
        <label>
          {en ? "Format" : "قالب"}
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="csv">CSV</option>
          </select>
        </label>
        <span dir="ltr">
          {range.start} — {range.end} UTC
        </span>
        <button
          className="button secondary"
          onClick={prepare}
          disabled={["queued", "processing"].includes(status)}
        >
          {en ? "Prepare accounting export" : "تهیه خروجی حسابدار"}
        </button>
      </div>
      <div className="fn-export-status" role="status">
        <span
          className={`ad-badge ${
            status === "ready" ? "green" : status === "failed" ? "danger" : ""
          }`}
        >
          {finText(en, labels[status])}
        </span>
        {status === "ready" && (
          <a
            className="ad-link"
            href={download}
            download={`nilart-DEMO-${range.start}-${range.end}.csv`}
          >
            {en ? "Download Demo CSV" : "دریافت CSV نمونه"}
          </a>
        )}
        <button
          className="ad-link fn-export-error-preview"
          onClick={() => {
            job.current?.abort()
            setStatus("failed")
            setDownload("")
          }}
        >
          {en ? "Preview failure" : "نمونه خطا"}
        </button>
      </div>
      <p className="fn-note">
        {en
          ? "Local fictional data only. Production downloads require server-side authorization and a private expiring file URL."
          : "فقط داده فرضی محلی. فایل واقعی نیازمند مجوز سمت سرویس و لینک خصوصی مدت‌دار است."}
      </p>
    </div>
  )
}

export default function FinancePage({
  en,
  role,
  onNavigate,
  onSessionExpired,
}: {
  en: boolean
  role: FinanceRole
  onNavigate: (title: string, route: string) => void
  onSessionExpired: () => void
}) {
  if (!financePermissions(role).view)
    return (
      <FinanceSafe
        en={en}
        onBack={() => onNavigate(en ? "Dashboard" : "داشبورد", "")}
      />
    )
  return (
    <AuthorizedFinancePage
      key={role}
      en={en}
      role={role}
      onNavigate={onNavigate}
      onSessionExpired={onSessionExpired}
    />
  )
}
function FinanceSafe({ en, onBack }: FinanceSafeProps) {
  return (
    <div className="fn-safe">
      <span className="ad-badge danger">
        {en ? "Permission denied" : "عدم مجوز"}
      </span>
      <h1>
        {en
          ? "Financial access is not authorized"
          : "دسترسی به اطلاعات مالی مجاز نیست"}
      </h1>
      <p>
        {en
          ? "Financial amounts are neither requested nor shown for this role. Service permissions must be validated independently."
          : "برای این نقش مبلغ مالی دریافت یا نمایش داده نمی‌شود؛ مجوز واقعی باید در سرویس بررسی شود."}
      </p>
      <button className="button secondary" onClick={onBack}>
        {en ? "Return to dashboard" : "بازگشت به داشبورد"}
      </button>
    </div>
  )
}
function AuthorizedFinancePage({
  en,
  role,
  onNavigate,
  onSessionExpired,
}: {
  en: boolean
  role: FinanceRole
  onNavigate: (title: string, route: string) => void
  onSessionExpired: () => void
}) {
  const t = (fa: string, english: string) => (en ? english : fa)
  const permissions = financePermissions(role)
  const [period, setPeriod] = useState("30"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState("")
  const [mode, setMode] = useState<FinanceMode>("normal"),
    [refresh, setRefresh] = useState(0),
    [library, setLibrary] = useState(false)
  const [selected, setSelected] = useState<FinanceDocument | null>(null),
    [confirm, setConfirm] = useState(false)
  const range = financeRange(period, start, end),
    invalid = !range.start || !range.end || range.start > range.end
  const request: FinanceRequest = { ...range, role, mode }
  const enabled = !invalid && mode !== "denied"
  const attention = useFinanceSection("attention", request, enabled, refresh)
  const performance = useFinanceSection(
    "performance",
    request,
    enabled,
    refresh,
  )
  const balances = useFinanceSection("balances", request, enabled, refresh)
  const flow = useFinanceSection("flow", request, enabled, refresh)
  const gateway = useFinanceSection("gateway", request, enabled, refresh)
  const documents = useFinanceSection("documents", request, enabled, refresh)
  const resources = [attention, performance, balances, flow, gateway, documents]
  const received = resources
    .map((resource) => resource.result?.receivedAt)
    .filter((value): value is string => !!value)
    .sort()
    .at(-1)
  const periodLabel =
    period === "custom"
      ? `${start} — ${end}`
      : period === "1"
        ? t("امروزِ نمونه", "Sample today")
        : period === "7"
          ? t("۷ روز اخیرِ نمونه", "Sample last 7 days")
          : t("۳۰ روز اخیرِ نمونه", "Sample last 30 days")
  const snapshot =
    t("مانده تا ", "Balance as of ") +
    new Date(DEMO_FINANCE_BASIS).toLocaleDateString(en ? "en-GB" : "fa-IR", {
      timeZone: "Asia/Tehran",
    })
  useEffect(() => {
    setSelected(null)
    setConfirm(false)
  }, [mode, period, start, end])
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex, nofollow"
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
  const link = (fa: string, english: string, route: string) => (
    <button
      className="ad-link"
      onClick={() => onNavigate(t(fa, english), route)}
    >
      {t(fa, english)}
      <span aria-hidden="true">{en ? "→" : "←"}</span>
    </button>
  )
  function view(metric: FinanceReportTarget) {
    onNavigate(finText(en, metric.title), metric.route)
  }
  function renderSection<T>(
    resource: {
      loading: boolean
      error: boolean
      result: FinanceEnvelope<T> | null
      retry: () => void
    },
    render: (data: T) => ReactNode,
  ) {
    return resource.loading ? (
      <FinanceSkeleton />
    ) : resource.error ? (
      <FinanceError en={en} onRetry={resource.retry} />
    ) : resource.result ? (
      render(resource.result.data)
    ) : (
      <p className="fn-note">
        {t("داده معتبر در دسترس نیست.", "Valid data is unavailable.")}
      </p>
    )
  }
  if (mode === "denied")
    return <FinanceSafe en={en} onBack={() => setMode("normal")} />
  const businessBalances = balances.result?.data
  const metrics = performance.result?.data.metrics ?? []
  const sampleDoc = documents.result?.data.rows[0]
  return (
    <div className="fn-page">
      <div className="ad-breadcrumb">
        {t("مدیریت", "Admin")}
        <span>/</span>
        <strong>{t("مالی", "Finance")}</strong>
        <span className="ad-page-id">FIN–01</span>
      </div>
      <div className="ad-heading">
        <div>
          <h1>{t("نمای مالی کسب‌وکار", "Business finance overview")}</h1>
          <p>
            {t(
              "فروش، نقد و سود را جدا ببینید؛ وضعیت مالی را با تعریف روشن بررسی کنید.",
              "See sales, cash and profit separately. Review finances with clear definitions.",
            )}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => setLibrary(!library)}
        >
          {library
            ? t("بازگشت به نمای مالی", "Back to finance overview")
            : t("کامپوننت‌های مالی", "Finance components")}
        </button>
      </div>
      <div className="fn-report-toolbar">
        <label className="fn-period-label">
          {t("بازه گزارش", "Reporting period")}
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="1">{t("امروز", "Today")}</option>
            <option value="7">{t("۷ روز اخیر", "Last 7 days")}</option>
            <option value="30">{t("۳۰ روز اخیر", "Last 30 days")}</option>
            <option value="custom">{t("بازه سفارشی", "Custom range")}</option>
          </select>
        </label>
        <span className="fn-time-basis">
          {t(
            "فروش و نقد: دوره گزارش · مانده‌ها: تا تاریخ مبنا · رسیدگی: صف باز",
            "Sales & cash: report period · balances: as-of date · attention: open queues",
          )}
        </span>
        <button
          className="ad-link"
          onClick={() => setRefresh((n) => n + 1)}
          disabled={invalid || mode === "loading"}
        >
          {t("تازه‌سازی نمونه", "Refresh sample")}
        </button>
      </div>
      {period === "custom" && (
        <div className="fn-custom-range">
          <label>
            {t("از (UTC)", "From (UTC)")}
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            {t("تا (UTC)", "To (UTC)")}
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
      )}
      {invalid && (
        <p className="fn-validation" role="alert">
          {t(
            "بازه کامل و معتبر انتخاب کنید؛ شروع نباید بعد از پایان باشد.",
            "Choose a complete valid range; start must not follow end.",
          )}
        </p>
      )}
      <div className="ad-demo-note">
        <span>
          <span className="ad-badge warm">Demo</span>
          {t(
            "داده فرضی · تقویم نمونه تا ۱۴ ژوئن ۲۰۲۶ · حسابداری عملیاتی، نه دفتر رسمی یا مالیاتی",
            "Fictional data · sample calendar through 14 Jun 2026 · operational, not official or tax accounting",
          )}
        </span>
        <select
          aria-label={t("حالت نمایشی مالی", "Finance preview state")}
          value={mode}
          onChange={(e) => {
            if (e.target.value === "expired") {
              setSelected(null)
              setConfirm(false)
              onSessionExpired()
            } else setMode(e.target.value as FinanceMode)
          }}
        >
          {[
            ["normal", "عادی", "Normal"],
            ["loading", "بارگذاری", "Loading"],
            ["empty", "دوره بدون فعالیت", "Empty period"],
            ["incomplete", "هزینه ناقص", "Incomplete costs"],
            ["partial", "خطای گزارش سود", "Profit report error"],
            ["error", "خطای شبکه", "Network error"],
            ["stale", "داده قدیمی", "Stale data"],
            ["denied", "عدم مجوز", "Permission denied"],
            ["expired", "پایان نشست", "Session expired"],
          ].map(([value, fa, english]) => (
            <option key={value} value={value}>
              {t(fa, english)}
            </option>
          ))}
        </select>
      </div>
      <div className="fn-freshness">
        <span>
          <span className="ad-live-dot" />
          {t("آخرین به‌روزرسانی نما: ", "View last updated: ")}
          {received
            ? new Date(received).toLocaleTimeString(en ? "en" : "fa", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Tehran",
              })
            : "—"}{" "}
          ·{" "}
          {t(
            "زمان تهران؛ زمان دریافت محلی، نه اتصال زنده",
            "Tehran; local receipt time, not a live connection",
          )}
        </span>
        {mode === "stale" && (
          <span className="ad-badge warm" role="status">
            {t(
              "داده قدیمی · مبنای snapshot را بررسی کنید",
              "Stale data · check snapshot basis",
            )}
          </span>
        )}
      </div>
      {invalid ? (
        <div className="fn-empty">
          {t(
            "گزارش تا اصلاح بازه دریافت نمی‌شود.",
            "Reports are not requested until the range is valid.",
          )}
        </div>
      ) : library ? (
        <div className="fn-library">
          <FinancePanel
            title={t("الگوهای مشترک مالی", "Reusable finance patterns")}
            description={t(
              "نمونه کامپوننتی؛ نه صفحات FIN-02 تا FIN-12",
              "Component patterns, not FIN-02–FIN-12 pages",
            )}
          >
            <p className="fn-note">
              {t(
                "مشاهده، ثبت، تأیید، بازپرداخت و خروجی مجوزهای مستقل دارند. این نمونه هیچ سند یا تراکنشی را تغییر نمی‌دهد.",
                "View, record, approve, refund and export permissions are independent. This sample does not modify documents or transactions.",
              )}
            </p>
            <div className="fn-permission-chips">
              {Object.entries(permissions).map(([key, allowed]) => (
                <span
                  className={`ad-badge ${allowed ? "green" : ""}`}
                  key={key}
                >
                  {
                    ({
                      view: t("مشاهده", "View"),
                      record: t("ثبت", "Record"),
                      approve: t("تأیید", "Approve"),
                      refund: t("بازپرداخت", "Refund"),
                      export: t("خروجی", "Export"),
                    } as Record<string, string>)[key]
                  }
                  :{" "}
                  {allowed
                    ? t("مجاز در Demo", "Allowed in Demo")
                    : t("غیرمجاز", "Not allowed")}
                </span>
              ))}
            </div>
          </FinancePanel>
          <div className="fn-library-grid">
            {permissions.record && (
              <FinancePanel
                title={t("الگوی دریافت / پرداخت", "Receipt / payment pattern")}
              >
                <ReceiptPaymentForm en={en} onReview={() => setConfirm(true)} />
              </FinancePanel>
            )}
            <FinancePanel
              title={t("جزئیات سند و تاریخچه", "Document details & history")}
            >
              {sampleDoc ? (
                <FinanceDocumentDetail doc={sampleDoc} en={en} />
              ) : (
                <FinanceEmpty en={en} />
              )}
            </FinancePanel>
            <FinancePanel
              title={t(
                "تفکیک مبلغ و تطبیق",
                "Amount breakdown & reconciliation",
              )}
            >
              {gateway.result && (
                <ReconciliationCompare
                  registered={gateway.result.data.registered}
                  matched={gateway.result.data.matched}
                  en={en}
                />
              )}
              <FinanceOperationResult en={en} />
              {permissions.approve && (
                <button
                  className="button secondary"
                  onClick={() => setConfirm(true)}
                >
                  {t("الگوی تأیید حساس", "Sensitive confirmation pattern")}
                </button>
              )}
            </FinancePanel>
            <FinancePanel
              title={t(
                "جدول سند، فیلتر و صفحه‌بندی",
                "Document table, filters & pagination",
              )}
            >
              {renderSection(documents, (result) => (
                <FinanceDocumentTable
                  documents={result.rows}
                  en={en}
                  onView={setSelected}
                />
              ))}
            </FinancePanel>
            <FinancePanel
              title={t("Loading، Empty و Error", "Loading, Empty & Error")}
            >
              <FinanceSkeleton />
              <FinanceEmpty en={en} />
              <FinanceError en={en} onRetry={() => setRefresh((n) => n + 1)} />
            </FinancePanel>
            <FinancePanel
              title={t("وضعیت تهیه خروجی", "Export preparation states")}
            >
              <FinanceExport
                en={en}
                documents={documents.result?.data.rows ?? []}
                range={range}
                allowed={
                  permissions.export && !documents.loading && !documents.error
                }
              />
            </FinancePanel>
          </div>
        </div>
      ) : (
        <>
          <section className="fn-attention">
            <div className="ad-panel-head">
              <div>
                <h2>{t("نیازمند رسیدگی", "Needs attention")}</h2>
                <p>
                  {t(
                    "صف باز جاری · شمارش‌ها الزاماً رخدادهای یکتا نیستند",
                    "Current open queues · counts are not necessarily unique events",
                  )}
                </p>
              </div>
              <span className="fn-snapshot-caption">
                {t("مستقل از بازه گزارش", "Independent of report period")}
              </span>
            </div>
            {renderSection(attention, (result) => (
              <div className="fn-alert-grid">
                {result.rows.map((row) => (
                  <FinanceAlertCard
                    key={row.id}
                    {...row}
                    onView={() => onNavigate(finText(en, row.cta), row.route)}
                    en={en}
                  />
                ))}
              </div>
            ))}
          </section>
          <section className="fn-key-metrics">
            <div className="ad-panel-head">
              <div>
                <h2>{t("شاخص‌های مالی", "Financial overview")}</h2>
                <p>
                  {periodLabel} ·{" "}
                  {t("واحد همه مبالغ: تومان", "All monetary figures in toman")}
                </p>
              </div>
            </div>
            <div className="fn-metric-grid">
              {performance.loading ? (
                <FinanceSkeleton />
              ) : performance.error ? (
                <FinanceError en={en} onRetry={performance.retry} />
              ) : (
                metrics.map((metric) => (
                  <FinanceMetricCard
                    metric={metric}
                    key={metric.key}
                    en={en}
                    scope={periodLabel}
                    onView={() => view(metric)}
                  />
                ))
              )}
              {balances.loading ? (
                <FinanceSkeleton />
              ) : balances.error ? (
                <FinanceError en={en} onRetry={balances.retry} />
              ) : (
                businessBalances &&
                [
                  {
                    key: "accounts",
                    title: ["مانده حساب‌ها", "Account balances"] as const,
                    amount: businessBalances.total,
                    definition: [
                      "جمع مانده ثبت‌شده بانک و صندوق؛ نه موجودی آنلاین",
                      "Sum of recorded bank/cash balances; not online bank balances",
                    ] as const,
                    route: "/finance/accounts",
                  },
                  {
                    key: "receivables",
                    title: ["مطالبات از درگاه", "Gateway receivables"] as const,
                    amount: businessBalances.receivables,
                    definition: [
                      "طلب ثبت‌شده از درگاه تا تاریخ مبنا؛ تسویه آن فروش تازه نیست",
                      "Recorded receivable as of the snapshot date; settlement is not new sales",
                    ] as const,
                    route: "/finance/settlements",
                  },
                  {
                    key: "payables",
                    title: [
                      "بدهی به تأمین‌کنندگان",
                      "Supplier payables",
                    ] as const,
                    amount: businessBalances.payables,
                    definition: [
                      "مانده بدهی خرید؛ خرید نسیه خروج نقد فوری نیست",
                      "Outstanding purchase debt; credit purchases are not immediate cash outflows",
                    ] as const,
                    route: "/finance/balances?type=payable",
                  },
                ].map((metric) => (
                  <FinanceMetricCard
                    metric={metric}
                    key={metric.key}
                    en={en}
                    scope={snapshot}
                    onView={() => view(metric)}
                  />
                ))
              )}
            </div>
          </section>
          <div className="fn-main-grid">
            <FinancePanel
              title={t(
                "دریافت، پرداخت و جریان نقدی",
                "Receipts, payments & cash flow",
              )}
              description={`${periodLabel} · ${t("تومان · قطعی، بدون پیش‌نویس و انتقال داخلی", "toman · posted, excluding drafts & internal transfers")}`}
              action={link(
                "گزارش جریان نقدی",
                "Cash flow report",
                "/finance/cash-flow",
              )}
            >
              {renderSection(flow, (result) =>
                result.receipts === "0" && result.payments === "0" ? (
                  <FinanceEmpty en={en} />
                ) : (
                  <FinanceCashFlow flow={result} en={en} period={periodLabel} />
                ),
              )}
            </FinancePanel>
            <FinancePanel
              title={t("بانک و صندوق", "Bank & cash accounts")}
              description={snapshot}
              action={link(
                "مشاهده حساب‌ها",
                "View accounts",
                "/finance/accounts",
              )}
            >
              {renderSection(balances, (result) => (
                <div className="fn-accounts">
                  {result.accounts.map((account) => (
                    <FinanceAccountCard
                      key={account.id}
                      account={account}
                      en={en}
                    />
                  ))}
                </div>
              ))}
            </FinancePanel>
          </div>
          <FinancePanel
            title={t(
              "فروش و سود؛ تعریف‌های مستقل",
              "Sales & profit, independently defined",
            )}
            description={`${periodLabel} · ${t("قابل جمع‌کردن در یک سود کل مبهم نیستند", "Not additive into an ambiguous total profit")}`}
            action={link("گزارش سود", "Profit report", "/finance/profit")}
          >
            {renderSection(performance, (result) => (
              <>
                {result.incomplete && (
                  <div className="fn-incomplete" role="status">
                    <strong>
                      {t("محاسبه ناقص", "Incomplete calculation")}
                    </strong>
                    <p>
                      {t(
                        "دو هزینه لازم هنوز ثبت نشده‌اند؛ سود ناخالص، مستقیم و عملیاتی قطعی نمایش داده نمی‌شود.",
                        "Two required cost records are missing; gross, direct and operating profit are not shown as definitive.",
                      )}
                    </p>
                    {link(
                      "تکمیل اطلاعات هزینه",
                      "Complete cost records",
                      "/finance/profit?status=incomplete",
                    )}
                  </div>
                )}
                <div className="fn-profit-grid">
                  {result.profits.map((metric) => (
                    <FinanceMetricCard
                      metric={metric}
                      key={metric.key}
                      en={en}
                      scope={
                        ["estimated", "replacement"].includes(metric.key)
                          ? t(
                              "برآورد مستقل / سفارش‌های جاری",
                              "Independent estimate / active orders",
                            )
                          : periodLabel
                      }
                      onView={() => view(metric)}
                    />
                  ))}
                </div>
                <AmountBreakdown
                  en={en}
                  rows={[
                    {
                      label: [
                        "بهای کالای فروش‌رفته ثبت‌شده (COGS)",
                        "Posted cost of goods sold (COGS)",
                      ],
                      value: result.cogs,
                    },
                    {
                      label: ["کارمزد ثبت‌شده دوره", "Posted period fees"],
                      value: result.fees,
                    },
                    {
                      label: ["هزینه مستقیم سفارش", "Direct order costs"],
                      value: result.directCosts,
                    },
                    {
                      label: ["هزینه جاری دوره", "Period operating expenses"],
                      value: result.operatingCosts,
                    },
                  ]}
                />
                <p className="fn-note">
                  {t(
                    "مالیات و ارسال از فروش خالص جدا هستند. پرداخت مشتری به‌تنهایی خروج کالا یا ثبت کامل COGS نیست؛ هزینه تولید تخصیص‌یافته دوباره کسر نمی‌شود.",
                    "Tax and shipping are separate from net sales. Customer payment alone is not dispatch or complete COGS posting; allocated production costs are not deducted twice.",
                  )}
                </p>
              </>
            ))}
          </FinancePanel>
          <div className="fn-main-grid">
            <FinancePanel
              title={t("درگاه و تسویه", "Gateway & settlements")}
              description={t(
                "تراکنش پرداخت و انتقال به بانک مستقل اما مرتبط‌اند",
                "Gateway payments and bank transfers are independent but linked",
              )}
              action={link(
                "تطبیق تسویه‌ها",
                "Reconcile settlements",
                "/finance/settlements?status=discrepancy",
              )}
            >
              {renderSection(gateway, (result) => (
                <>
                  <AmountBreakdown
                    en={en}
                    rows={[
                      {
                        label: [
                          "پرداخت تأییدشده دوره",
                          "Period confirmed customer payments",
                        ],
                        value: result.confirmed,
                      },
                      {
                        label: [
                          "مطالبات جاری از درگاه",
                          "Current gateway receivables",
                        ],
                        value: result.receivables,
                      },
                      {
                        label: [
                          "تسویه دریافت‌شده دوره",
                          "Period settlements received",
                        ],
                        value: result.settlements,
                      },
                      {
                        label: ["کارمزد ثبت‌شده دوره", "Posted period fees"],
                        value: result.fees,
                      },
                    ]}
                  />
                  <div className="fn-mismatch">
                    <div>
                      <span className="fn-alert-symbol">!</span>
                      <strong>
                        {new Intl.NumberFormat(en ? "en" : "fa").format(
                          result.discrepancies,
                        )}{" "}
                        {t("مغایرت باز", "open discrepancies")}
                      </strong>
                    </div>
                    <ReconciliationCompare
                      registered={result.registered}
                      matched={result.matched}
                      en={en}
                    />
                  </div>
                  <p className="fn-note">
                    {t(
                      "تسویه طلب درگاه، درآمد تازه ایجاد نمی‌کند.",
                      "Settling a gateway receivable does not create new revenue.",
                    )}
                  </p>
                </>
              ))}
            </FinancePanel>
            <FinancePanel
              title={t("بازپرداخت‌ها", "Refunds")}
              description={t(
                "وضعیت جاری تا تاریخ مبنا؛ مستقل از مرجوعی فیزیکی",
                "Current status at snapshot date; independent of physical returns",
              )}
              action={link(
                "مدیریت بازپرداخت‌ها",
                "Manage refunds",
                "/finance/refunds",
              )}
            >
              {renderSection(gateway, (result) => (
                <div className="fn-refunds">
                  {result.refundRows.map((row, i) => (
                    <div key={i}>
                      <span
                        className={`ad-badge ${
                          i === 4
                            ? "danger"
                            : i === 3
                              ? "green"
                              : i === 1
                                ? "warm"
                                : ""
                        }`}
                      >
                        {finText(en, row.status)}
                      </span>
                      <span>
                        {new Intl.NumberFormat(en ? "en" : "fa").format(
                          row.count,
                        )}{" "}
                        {t("مورد", "items")}
                      </span>
                      <FinanceMoney value={row.amount} en={en} />
                    </div>
                  ))}
                  <p className="fn-note">
                    {t(
                      "تأیید مبلغ، واریز تکمیل‌شده نیست. بازپرداخت جزئی از سهم تاریخی پرداخت و تخفیف تخصیص‌یافته محاسبه می‌شود، نه قیمت روز.",
                      "Approving an amount is not a completed transfer. Partial refunds use historical paid shares and allocated discounts, not current prices.",
                    )}
                  </p>
                </div>
              ))}
            </FinancePanel>
          </div>
          <FinancePanel
            title={t("ارزش موجودی و تولید", "Inventory & production value")}
            description={`${snapshot} · ${t("ارزش تاریخی با میانگین موزون؛ مستقل از نرخ جایگزینی", "Historical weighted-average value; separate from replacement rates")}`}
            action={link(
              "گزارش موجودی و تولید",
              "Inventory & production report",
              "/finance/inventory-value",
            )}
          >
            {renderSection(performance, (result) => (
              <>
                <div className="fn-inventory-grid">
                  {result.inventory.map((metric) => (
                    <FinanceMetricCard
                      metric={metric}
                      en={en}
                      scope={snapshot}
                      key={metric.key}
                      onView={() => view(metric)}
                    />
                  ))}
                </div>
                <p className="fn-note">
                  {t(
                    "مصرف مواد هزینه را به تولید منتقل می‌کند؛ خروجی سالم هزینه تخصیص می‌گیرد و هنگام خروج برای تحویل به COGS منتقل می‌شود. ضایعات عادی و غیرعادی در گزارش ثبت‌شده جدا هستند؛ این نما فرم تولید نیست.",
                    "Material consumption transfers cost to production; approved output receives allocated costs, transferred to COGS on dispatch. Normal and abnormal waste are separate in the recorded report; this is not a production form.",
                  )}
                </p>
              </>
            ))}
          </FinancePanel>
          <FinancePanel
            title={t(
              "تراکنش‌ها و اسناد اخیر",
              "Recent transactions & documents",
            )}
            description={t(
              "شناسه و اطلاعات عمومی مجاز؛ بدون کارت، توکن یا اطلاعات بانکی حساس",
              "Authorized public identifiers and details; no card, token or sensitive bank data",
            )}
            action={link(
              "مشاهده اسناد",
              "View documents",
              "/finance/receipts-payments",
            )}
          >
            {renderSection(documents, (result) => (
              <FinanceDocumentTable
                documents={result.rows}
                en={en}
                onView={setSelected}
              />
            ))}
          </FinancePanel>
          <div className="fn-report-grid">
            <FinancePanel
              title={t("گزارش‌های تصمیم‌ساز", "Reports for decisions")}
              description={t(
                "گزارش عملیاتی؛ بدون رتبه‌بندی فرضی",
                "Operational reports, without invented rankings",
              )}
            >
              <div className="fn-report-links">
                {link(
                  "سود محصول و SKU",
                  "Product & SKU profit",
                  "/finance/profit?group=sku",
                )}
                {link(
                  "سود پکیج و اجزا",
                  "Package & component profit",
                  "/finance/profit?group=package",
                )}
                {link(
                  "گزارش کالکشن‌ها",
                  "Collection reports",
                  "/finance/profit?group=collection",
                )}
              </div>
              <p className="fn-note">
                {t(
                  "تخفیف پکیج به اجزا تخصیص می‌یابد؛ پکیج و اجزا دوباره شمرده نمی‌شوند. کالکشن‌ها ممکن است هم‌پوشانی داشته باشند؛ جمع رسمی از سفارش‌ها و اقلام یکتا است.",
                  "Package discounts are allocated to components; package and components are not counted twice. Collections may overlap; official totals use unique orders and items.",
                )}
              </p>
            </FinancePanel>
            <FinancePanel
              title={t("خروجی برای حسابدار", "Export for your accountant")}
            >
              {documents.error ? (
                <FinanceError en={en} onRetry={documents.retry} />
              ) : documents.loading ? (
                <FinanceSkeleton />
              ) : (
                <FinanceExport
                  en={en}
                  documents={documents.result?.data.rows ?? []}
                  range={range}
                  allowed={permissions.export}
                />
              )}
            </FinancePanel>
          </div>
        </>
      )}
      <footer className="ad-footer">
        <span>
          nilart. /{" "}
          {t("دید روشن، تصمیم دقیق", "Clear numbers. Considered decisions.")}
        </span>
        <span>
          {t(
            "FIN-01 · داده Demo · حسابداری عملیاتی",
            "FIN-01 · Demo data · operational accounting",
          )}
        </span>
      </footer>
      <FinanceModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={t("پیش‌نمایش سند مالی", "Finance document preview")}
      >
        {selected && (
          <>
            <span className="ad-badge warm">Demo</span>
            <FinanceDocumentDetail doc={selected} en={en} />
            <button
              className="button primary"
              onClick={() => {
                setSelected(null)
                onNavigate(
                  t("جزئیات کامل سند", "Full document details"),
                  `/finance/receipts-payments/${selected.id}`,
                )
              }}
            >
              {t(
                "جزئیات کامل در صفحه مستقل",
                "Full details on a separate page",
              )}
            </button>
          </>
        )}
      </FinanceModal>
      <FinanceModal
        open={confirm && permissions.record}
        onClose={() => setConfirm(false)}
        title={t(
          "تأیید نمونه؛ بدون عملیات مالی",
          "Sample confirmation; no financial operation",
        )}
      >
        <p>
          {t(
            "این الگوی بررسی است. ثبت، تأیید یا بازپرداخت واقعی به مجوز مستقل سرویس، actor، زمان و تاریخچه معتبر نیاز دارد. هیچ سندی ذخیره و هیچ وجهی منتقل نمی‌شود.",
            "This is a review pattern. Real recording, approval or refunds require separate service permissions, actor, time and valid history. No document is saved and no money is transferred.",
          )}
        </p>
        <div className="fn-modal-actions">
          <button
            className="button secondary"
            onClick={() => setConfirm(false)}
          >
            {t("انصراف", "Cancel")}
          </button>
          <button className="button primary" onClick={() => setConfirm(false)}>
            {t("بستن نمونه", "Close sample")}
          </button>
        </div>
      </FinanceModal>
    </div>
  )
}
