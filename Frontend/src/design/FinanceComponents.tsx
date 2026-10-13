import SelectDropdown from "../components/ui/SelectDropdown";
import { useState, type ReactNode } from "react"
import { OrderDialog, OrderSkeleton } from "./OrderComponents"
import {
  exactMoney,
  formatMoney,
  subtractMoney,
  type FinanceAccount,
  type FinanceDocument,
  type FinanceMetric,
  type FinanceSections,
  type FinanceText,
  type Money,
} from "./finance-data"
export const finText = (en: boolean, text: FinanceText) => text[en ? 1 : 0]
export function FinanceMoney({
  value,
  en,
  signed = false,
}: {
  value: Money | null
  en: boolean
  signed?: boolean
}) {
  return (
    <span className="fn-money">
      {value === null ? "—" : <bdi>{formatMoney(value, en, signed)}</bdi>}
      <small>{en ? "toman" : "تومان"}</small>
    </span>
  )
}
export function FinancePanel({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={`ad-panel fn-panel ${className}`}>
      <div className="ad-panel-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
export function FinanceMetricCard({
  metric,
  en,
  scope,
  onView,
}: {
  metric: FinanceMetric
  en: boolean
  scope: string
  onView: () => void
}) {
  return (
    <article className="fn-metric">
      <div className="fn-metric-title">
        <span>{finText(en, metric.title)}</span>
      </div>
      <FinanceMoney
        value={metric.amount}
        en={en}
        signed={[
          "gross",
          "direct",
          "operating",
          "estimated",
          "realized",
          "replacement",
        ].includes(metric.key)}
      />
      {metric.amount === null && (
        <span className="ad-badge warm">
          {en ? "Incomplete calculation" : "محاسبه ناقص"}
        </span>
      )}
      <p className="fn-scope">{scope}</p>
      <details className="fn-definition">
        <summary>{en ? "Definition & scope" : "تعریف و مبنا"}</summary>
        <p>{finText(en, metric.definition)}</p>
      </details>
      <button className="ad-link" onClick={onView}>
        {en ? "View report" : "مشاهده گزارش"}
        <span aria-hidden="true">{en ? "→" : "←"}</span>
      </button>
    </article>
  )
}
export function FinanceAlertCard({
  title,
  count,
  description,
  cta,
  onView,
  en,
}: {
  title: FinanceText
  count: number | null
  description: FinanceText
  cta: FinanceText
  onView: () => void
  en: boolean
}) {
  return (
    <article className="fn-alert">
      <div>
        <span className="fn-alert-symbol" aria-hidden="true">
          !
        </span>
        <strong>
          {count === null
            ? "—"
            : new Intl.NumberFormat(en ? "en" : "fa").format(count)}
        </strong>
      </div>
      <h3>{finText(en, title)}</h3>
      <p>{finText(en, description)}</p>
      <button className="ad-link" onClick={onView}>
        {finText(en, cta)}
        <span aria-hidden="true">{en ? "→" : "←"}</span>
      </button>
    </article>
  )
}
export function FinanceAccountCard({
  account,
  en,
}: {
  account: FinanceAccount
  en: boolean
}) {
  return (
    <article className="fn-account-card">
      <div>
        <span className="fn-account-icon" aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="m3 8 9-5 9 5H3Zm2 3v7m7-7v7m7-7v7M3 21h18" />
          </svg>
        </span>
        <div>
          <strong>{finText(en, account.name)}</strong>
          <small>
            {finText(en, account.type)} · {en ? "toman" : "تومان"}
          </small>
        </div>
      </div>
      <FinanceMoney value={account.balance} en={en} />
      <span className={`ad-badge ${account.reconciled ? "green" : ""}`}>
        {account.reconciled
          ? en
            ? "Sample ledger reconciled"
            : "تطبیق ثبت‌شده نمونه"
          : en
            ? "Not reconciled"
            : "تطبیق نشده"}
      </span>
      <p>
        {en
          ? "Recorded balance, not a verified online bank balance."
          : "مانده ثبت‌شده؛ نه موجودی آنلاین تأییدشده بانک."}
      </p>
      <small>
        {en ? "Basis: " : "مبنا: "}
        {new Date(account.basis).toLocaleDateString(en ? "en-GB" : "fa-IR", {
          timeZone: "Asia/Tehran",
        })}
      </small>
    </article>
  )
}
export function FinanceError({
  en,
  onRetry,
}: {
  en: boolean
  onRetry: () => void
}) {
  return (
    <div className="fn-empty" role="status">
      <span className="fn-alert-symbol">!</span>
      <p>{en ? "Unable to load this section." : "دریافت این بخش ممکن نشد."}</p>
      <button className="button secondary" onClick={onRetry}>
        {en ? "Try again" : "تلاش دوباره"}
      </button>
    </div>
  )
}
export function FinanceEmpty({ en }: { en: boolean }) {
  return (
    <div className="fn-empty">
      <p>
        {en
          ? "No activity has been recorded for this period."
          : "برای این بازه فعالیتی ثبت نشده است."}
      </p>
    </div>
  )
}
export function FinanceSkeleton() {
  return <OrderSkeleton />
}
export function AmountBreakdown({
  rows,
  en,
}: {
  rows: {
    label: FinanceText
    value: Money | null
  }[]
  en: boolean
}) {
  return (
    <dl className="fn-breakdown">
      {rows.map((row, i) => (
        <div key={i}>
          <dt>{finText(en, row.label)}</dt>
          <dd>
            <FinanceMoney value={row.value} en={en} />
          </dd>
        </div>
      ))}
    </dl>
  )
}
export function ReconciliationCompare({
  registered,
  matched,
  en,
}: {
  registered: Money
  matched: Money
  en: boolean
}) {
  return (
    <div className="fn-reconcile">
      <AmountBreakdown
        en={en}
        rows={[
          { label: ["مبلغ ثبت‌شده", "Recorded amount"], value: registered },
          { label: ["مبلغ تطبیق", "Matched amount"], value: matched },
          {
            label: [
              "اختلاف باز؛ نیازمند بررسی",
              "Open difference; needs review",
            ],
            value: subtractMoney(registered, matched),
          },
        ]}
      />
      <p>
        {en
          ? "A difference is not automatically posted as a fee or cleared."
          : "اختلاف به‌طور خودکار کارمزد ثبت‌شده یا رفع‌شده محسوب نمی‌شود."}
      </p>
    </div>
  )
}
export function FinanceCashFlow({
  flow,
  en,
  period,
}: {
  flow: FinanceSections["flow"]
  en: boolean
  period: string
}) {
  const [table, setTable] = useState(false)
  const max = flow.rows.reduce((m, row) => {
    const a = exactMoney(row.receipts),
      b = exactMoney(row.payments)
    return a > m ? (a > b ? a : b) : b > m ? b : m
  }, 1n)
  // Integer ratios are presentation-only. No floating-point monetary calculation.
  const bar = (value: Money) => Number((exactMoney(value) * 360n) / max)
  return (
    <div className="fn-cash-flow">
      <div className="fn-chart-toolbar">
        <div className="fn-legend">
          <span>
            <i className="receipts" />
            {en ? "Receipts" : "دریافت‌ها"}
          </span>
          <span>
            <i className="payments" />
            {en ? "Payments" : "پرداخت‌ها"}
          </span>
        </div>
        <button className="ad-link" onClick={() => setTable(!table)}>
          {table
            ? en
              ? "Chart view"
              : "نمای نمودار"
            : en
              ? "View data table"
              : "جدول جایگزین"}
        </button>
      </div>
      {table ? (
        <table className="fn-cash-table">
          <caption className="sr-only">
            {period} · {en ? "toman" : "تومان"}
          </caption>
          <thead>
            <tr>
              <th scope="col">{en ? "Category" : "دسته"}</th>
              <th scope="col">{en ? "Receipts (toman)" : "دریافت (تومان)"}</th>
              <th scope="col">{en ? "Payments (toman)" : "پرداخت (تومان)"}</th>
            </tr>
          </thead>
          <tbody>
            {flow.rows.map((row, i) => (
              <tr key={i}>
                <th scope="row">{finText(en, row.label)}</th>
                <td>{formatMoney(row.receipts, en)}</td>
                <td>{formatMoney(row.payments, en)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="fn-bars">
          {flow.rows.map((row, i) => (
            <div className="fn-bar-row" key={i}>
              <span>{finText(en, row.label)}</span>
              <svg
                viewBox="0 0 370 40"
                preserveAspectRatio="none"
                role="img"
                aria-label={`${finText(en, row.label)} · ${
                  en ? "Receipts" : "دریافت"
                } ${formatMoney(row.receipts, en)} · ${
                  en ? "Payments" : "پرداخت"
                } ${formatMoney(row.payments, en)} ${en ? "toman" : "تومان"}`}
              >
                <rect
                  width="360"
                  height="10"
                  y="5"
                  rx="4"
                  fill="var(--canvas)"
                />
                <rect
                  width="360"
                  height="10"
                  y="23"
                  rx="4"
                  fill="var(--canvas)"
                />
                <rect
                  width={bar(row.receipts)}
                  height="10"
                  y="5"
                  rx="4"
                  fill="var(--success)"
                >
                  <title>{formatMoney(row.receipts, en)}</title>
                </rect>
                <rect
                  width={bar(row.payments)}
                  height="10"
                  y="23"
                  rx="4"
                  fill="var(--accent)"
                >
                  <title>{formatMoney(row.payments, en)}</title>
                </rect>
              </svg>
            </div>
          ))}
        </div>
      )}
      <div className="fn-flow-totals">
        <div>
          <span>{en ? "Cash receipts" : "دریافت نقدی"}</span>
          <FinanceMoney value={flow.receipts} en={en} />
        </div>
        <div>
          <span>{en ? "Cash payments" : "پرداخت نقدی"}</span>
          <FinanceMoney value={flow.payments} en={en} />
        </div>
        <div>
          <span>
            {en ? "Net cash inflow / outflow" : "خالص ورود / خروج نقد"}
          </span>
          <FinanceMoney value={flow.net} en={en} signed />
        </div>
      </div>
      <p className="fn-note">
        {en
          ? "Scope: posted bank and cash transactions. Gateway captures create receivables; settlement is counted once on receipt into the bank. Own-account transfers excluded."
          : "مبنا: تراکنش قطعی بانک و صندوق. پرداخت درگاه طلب ایجاد می‌کند؛ تسویه هنگام ورود به بانک یک‌بار حساب می‌شود. انتقال داخلی خارج از جمع است."}
      </p>
    </div>
  )
}
export function FinanceDocumentTable({
  documents,
  en,
  onView,
}: {
  documents: FinanceDocument[]
  en: boolean
  onView: (doc: FinanceDocument) => void
}) {
  const [filter, setFilter] = useState("all"),
    [page, setPage] = useState(1)
  const labels: Record<string, FinanceText> = {
    posted: ["قطعی", "Posted"],
    draft: ["پیش‌نویس", "Draft"],
    correction: ["اصلاحی مرتبط", "Linked correction"],
  }
  const filtered = documents.filter(
      (doc) => filter === "all" || doc.status === filter,
    ),
    pageSize = 4,
    pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    currentPage = Math.min(page, pages),
    rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const status = (doc: FinanceDocument) => (
    <span
      className={`ad-badge ${
        doc.status === "posted" ? "green" : doc.status === "draft" ? "warm" : ""
      }`}
    >
      {finText(en, labels[doc.status])}
    </span>
  )
  return (
    <div className="fn-documents">
      <div className="fn-doc-toolbar">
        <label>
          {en ? "Document status" : "وضعیت سند"}
          <SelectDropdown
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">{en ? "All documents" : "همه اسناد"}</option>
            {Object.entries(labels).map(([key, label]) => (
              <option value={key} key={key}>
                {finText(en, label)}
              </option>
            ))}
          </SelectDropdown>
        </label>
        <span>
          {new Intl.NumberFormat(en ? "en" : "fa").format(filtered.length)}{" "}
          {en ? "records" : "سند"}
        </span>
      </div>
      {!rows.length ? (
        <FinanceEmpty en={en} />
      ) : (
        <>
          <table className="fn-doc-table">
            <caption className="sr-only">
              {en
                ? "Authorized sample finance documents"
                : "اسناد مالی مجاز نمونه"}
            </caption>
            <thead>
              <tr>
                {[
                  ["سند / تاریخ", "Document / date"],
                  ["نوع / طرف", "Type / party"],
                  ["مبلغ و حساب", "Amount / account"],
                  ["وضعیت / ارجاع", "Status / reference"],
                  ["اقدام", "Action"],
                ].map(([fa, english]) => (
                  <th scope="col" key={fa}>
                    {en ? english : fa}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <strong dir="ltr">{doc.id}</strong>
                    <time dateTime={doc.at}>
                      {new Date(doc.at).toLocaleDateString(
                        en ? "en-GB" : "fa-IR",
                        { timeZone: "Asia/Tehran" },
                      )}
                    </time>
                  </td>
                  <td>
                    <span>{finText(en, doc.type)}</span>
                    <small>{finText(en, doc.party)}</small>
                  </td>
                  <td>
                    <span className="fn-direction">
                      {doc.direction === "in"
                        ? en
                          ? "Receipt +"
                          : "دریافت +"
                        : doc.direction === "out"
                          ? en
                            ? "Payment −"
                            : "پرداخت −"
                          : en
                            ? "Internal transfer"
                            : "انتقال داخلی"}
                    </span>
                    <FinanceMoney value={doc.amount} en={en} />
                    <small>{finText(en, doc.account)}</small>
                  </td>
                  <td>
                    {status(doc)}
                    <small className="fn-reference" dir="ltr">
                      {doc.reference}
                    </small>
                  </td>
                  <td>
                    <button className="ad-link" onClick={() => onView(doc)}>
                      {en ? "View" : "مشاهده"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="fn-doc-mobile">
            {rows.map((doc) => (
              <article key={doc.id}>
                <div>
                  <strong dir="ltr">{doc.id}</strong>
                  {status(doc)}
                </div>
                <h3>{finText(en, doc.type)}</h3>
                <p>
                  {finText(en, doc.party)} · {finText(en, doc.account)}
                </p>
                <span className="fn-direction">
                  {doc.direction === "in"
                    ? en
                      ? "Receipt +"
                      : "دریافت +"
                    : doc.direction === "out"
                      ? en
                        ? "Payment −"
                        : "پرداخت −"
                      : en
                        ? "Internal transfer"
                        : "انتقال داخلی"}
                </span>
                <FinanceMoney value={doc.amount} en={en} />
                <small>
                  {new Date(doc.at).toLocaleDateString(en ? "en-GB" : "fa-IR", {
                    timeZone: "Asia/Tehran",
                  })}{" "}
                  · <bdi>{doc.reference}</bdi>
                </small>
                <button className="ad-link" onClick={() => onView(doc)}>
                  {en ? "View document" : "مشاهده سند"}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      <div className="fn-pagination">
        <button
          className="button secondary"
          disabled={currentPage <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          {en ? "Previous" : "قبلی"}
        </button>
        <span>
          {currentPage} / {pages}
        </span>
        <button
          className="button secondary"
          disabled={currentPage >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          {en ? "Next" : "بعدی"}
        </button>
      </div>
    </div>
  )
}
export function FinanceDocumentDetail({
  doc,
  en,
}: {
  doc: FinanceDocument
  en: boolean
}) {
  return (
    <div className="fn-document-detail">
      <div className="fn-document-heading">
        <strong dir="ltr">{doc.id}</strong>
        <span className="ad-badge">
          {doc.status === "posted"
            ? en
              ? "Posted"
              : "قطعی"
            : doc.status === "draft"
              ? en
                ? "Draft"
                : "پیش‌نویس"
              : en
                ? "Linked correction"
                : "اصلاحی مرتبط"}
        </span>
      </div>
      <AmountBreakdown
        en={en}
        rows={[{ label: doc.type, value: doc.amount }]}
      />
      <dl className="fn-detail-fields">
        <div>
          <dt>{en ? "Related party" : "طرف مرتبط"}</dt>
          <dd>{finText(en, doc.party)}</dd>
        </div>
        <div>
          <dt>{en ? "Account" : "حساب"}</dt>
          <dd>{finText(en, doc.account)}</dd>
        </div>
        <div>
          <dt>{en ? "Reference" : "ارجاع"}</dt>
          <dd dir="ltr">{doc.reference}</dd>
        </div>
      </dl>
      <ol className="od-timeline">
        <li>
          <strong>{en ? "Sample document recorded" : "ثبت سند نمونه"}</strong>
          <time dateTime={doc.at}>
            {new Date(doc.at).toLocaleString(en ? "en-GB" : "fa-IR", {
              timeZone: "Asia/Tehran",
            })}
          </time>
        </li>
      </ol>
      <p className="fn-note">
        {en
          ? "Posted records are not silently edited or deleted. Corrections require a linked document and separate review."
          : "سند قطعی بی‌ردپا حذف یا ویرایش نمی‌شود؛ اصلاح با سند مرتبط و بررسی مستقل است."}
      </p>
    </div>
  )
}
export function ReceiptPaymentForm({
  en,
  onReview,
}: {
  en: boolean
  onReview: () => void
}) {
  const [amount, setAmount] = useState(""),
    [error, setError] = useState("")
  return (
    <form
      className="fn-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!/^[1-9]\d*$/.test(amount)) {
          setError(
            en
              ? "Enter a positive whole amount in toman."
              : "مبلغ صحیح و مثبت به تومان وارد کنید.",
          )
          return
        }
        setError("")
        onReview()
      }}
    >
      <fieldset>
        <legend>
          {en ? "Receipt / payment form · Demo" : "فرم دریافت / پرداخت · Demo"}
        </legend>
        <div className="fn-form-grid">
          <label>
            {en ? "Type" : "نوع"}
            <SelectDropdown>
              <option>{en ? "Receipt" : "دریافت"}</option>
              <option>{en ? "Payment" : "پرداخت"}</option>
            </SelectDropdown>
          </label>
          <label>
            {en ? "Related party" : "طرف حساب"}
            <input required placeholder={en ? "Sample party" : "طرف نمونه"} />
          </label>
          <label>
            {en ? "Financial account" : "حساب مالی"}
            <SelectDropdown>
              <option>
                {en ? "Operating bank account" : "حساب عملیاتی بانک"}
              </option>
              <option>{en ? "Store cash fund" : "صندوق فروشگاه"}</option>
            </SelectDropdown>
          </label>
          <label>
            {en ? "Amount (toman)" : "مبلغ (تومان)"}
            <input
              inputMode="numeric"
              dir="ltr"
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value.replace(/[۰-۹]/g, (c) =>
                    String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)),
                  ),
                )
              }
              required
            />
          </label>
          <label>
            {en ? "Date (UTC)" : "تاریخ (UTC)"}
            <input type="date" required />
          </label>
          <label>
            {en ? "Reference" : "ارجاع"}
            <input dir="ltr" placeholder="DOC-…" />
          </label>
          <label className="fn-form-wide">
            {en ? "Description" : "توضیح"}
            <textarea maxLength={500} />
          </label>
        </div>
        {error && (
          <p role="alert" className="fn-validation">
            {error}
          </p>
        )}
        <p className="fn-note">
          {en
            ? "Pattern only; does not save a document or transfer money. Do not enter private banking information."
            : "فقط الگوی فرم؛ سندی ذخیره یا وجهی منتقل نمی‌شود. اطلاعات بانکی خصوصی وارد نکنید."}
        </p>
        <button className="button secondary" type="submit">
          {en ? "Review sample" : "بررسی نمونه"}
        </button>
      </fieldset>
    </form>
  )
}
export function FinanceOperationResult({ en }: { en: boolean }) {
  return (
    <div className="fn-result" role="status">
      <strong>
        {en ? "Sample operation result" : "الگوی نتیجه عملیات نمونه"}
      </strong>
      <p>
        {en
          ? "1 successful sample item; 1 failed item requires fresh-state review. No operation has been executed."
          : "۱ مورد نمونه موفق؛ ۱ شکست نیازمند بررسی وضعیت تازه. هیچ عملیاتی اجرا نشده است."}
      </p>
      <span className="ad-badge green">
        {en ? "Sample success" : "موفقیت نمونه"}
      </span>
      <span className="ad-badge danger">
        {en ? "Sample failure" : "شکست نمونه"}
      </span>
    </div>
  )
}
export { OrderDialog as FinanceModal }
