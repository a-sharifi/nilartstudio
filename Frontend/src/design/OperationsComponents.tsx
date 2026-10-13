import SelectDropdown from "../components/ui/SelectDropdown";
import { useState, type ReactNode } from "react"
import { OrderDialog, OrderSkeleton } from "./OrderComponents"
import { formatMoney } from "./finance-data"
import {
  exactQuantity,
  type OpsText,
  type ProductionBatch,
  type Reservation,
  type StockDetail,
  type StockItem,
  type StockMovement,
} from "./operations-data"
export const opsText = (en: boolean, text: OpsText) => text[en ? 1 : 0]
export function StockQuantity({
  value,
  unit,
  en,
  signed = false,
}: {
  value: string | null | undefined
  unit: OpsText
  en: boolean
  signed?: boolean
}) {
  return (
    <span className="op-quantity">
      {value == null ? "—" : <bdi>{formatMoney(value, en, signed)}</bdi>}
      <small>{opsText(en, unit)}</small>
    </span>
  )
}
const stockStatus: Record<string, OpsText> = {
  healthy: ["عادی", "Normal"],
  low: ["کم‌موجود", "Low stock"],
  review: ["نیازمند بررسی", "Needs review"],
  qc: ["منتظر QC", "Awaiting QC"],
  incomplete: ["تبدیل ناقص", "Incomplete conversion"],
}
export function OpsStatusBadge({ status, en }: OpsStatusProps) {
  return (
    <span
      className={`ad-badge ${
        status === "low" || status === "qc" || status === "incomplete"
          ? "warm"
          : status === "review"
            ? "danger"
            : status === "approved"
              ? "green"
              : ""
      }`}
    >
      {opsText(
        en,
        stockStatus[status] ??
          ({
            approved: ["تأییدشده", "Approved"],
            correction: ["نیازمند اصلاح", "Needs correction"],
            rejected: ["خراب یا مردود", "Damaged or rejected"],
            working: ["در حال تولید", "In production"],
          } as Record<string, OpsText>)[status] ?? ["نامشخص", "Unknown"],
      )}
    </span>
  )
}
export function OpsPanel({
  title,
  description,
  children,
  action,
}: {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="ad-panel op-panel">
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
export function OpsShortageCard({
  title,
  count,
  description,
  en,
  onView,
}: {
  title: OpsText
  count: number | null
  description: OpsText
  en: boolean
  onView: () => void
}) {
  return (
    <button className="op-shortage" onClick={onView}>
      <div>
        <span className="op-alert-symbol" aria-hidden="true">
          !
        </span>
        <strong>
          {count === null
            ? "—"
            : new Intl.NumberFormat(en ? "en" : "fa").format(count)}
        </strong>
      </div>
      <h3>{opsText(en, title)}</h3>
      <p>{opsText(en, description)}</p>
      <span className="op-shortage-cta">
        {en ? "Review queue" : "مشاهده صف"}
        <span aria-hidden="true">{en ? "→" : "←"}</span>
      </span>
    </button>
  )
}
export function StockBreakdown({ item, en }: StockBreakdownProps) {
  const rows: StockBreakdownRow[] =
    item.type === "finished"
      ? [
          { label: ["فیزیکی", "Physical"], value: item.physical },
          { label: ["رزروشده", "Reserved"], value: item.reserved },
          {
            label: [
              "تخصیص پرداخت‌شده (در رزرو)",
              "Paid allocation (within reserved)",
            ],
            value: item.allocated,
          },
          { label: ["قرنطینه", "Quarantine"], value: item.quarantine },
          { label: ["قابل فروش", "Sellable"], value: item.available },
        ]
      : item.type === "materials"
        ? [
            { label: ["موجود", "On hand"], value: item.physical },
            { label: ["قابل استفاده", "Usable"], value: item.available },
            { label: ["قرنطینه", "Quarantine"], value: item.quarantine },
          ]
        : item.type === "wip"
          ? [
              {
                label: ["هدف؛ نه خروجی واقعی", "Target, not actual output"],
                value: item.target ?? null,
              },
              {
                label: ["خروجی سالم تأییدشده", "Approved healthy output"],
                value: item.approved ?? null,
              },
            ]
          : [
              {
                label: ["ظرفیت مشتق‌شده", "Derived capacity"],
                value: item.available,
              },
            ]
  return (
    <dl className="op-breakdown">
      {rows.map((row, i) => (
        <div key={i}>
          <dt>{opsText(en, row.label)}</dt>
          <dd>
            <StockQuantity value={row.value} unit={item.unit} en={en} />
          </dd>
        </div>
      ))}
    </dl>
  )
}
interface StockCell {
  label: OpsText
  value: ReactNode
}
function stockCells(item: StockItem, en: boolean): StockCell[] {
  const qty = (value: string | null | undefined) => (
    <StockQuantity value={value} unit={item.unit} en={en} />
  )
  if (item.type === "finished")
    return [
      { label: ["فیزیکی", "Physical"], value: qty(item.physical) },
      {
        label: ["رزرو / تخصیص مرتبط", "Reserved / allocation"],
        value: (
          <>
            {qty(item.reserved)}
            <small className="op-cell-note">
              {en ? "Includes paid allocation: " : "شامل تخصیص پرداخت‌شده: "}
              {item.allocated === null
                ? "—"
                : new Intl.NumberFormat(en ? "en" : "fa").format(
                    BigInt(item.allocated),
                  )}{" "}
              {opsText(en, item.unit)}
            </small>
          </>
        ),
      },
      { label: ["قابل فروش", "Sellable"], value: qty(item.available) },
      { label: ["حد هشدار", "Threshold"], value: qty(item.threshold) },
    ]
  if (item.type === "materials")
    return [
      { label: ["واحد پایه", "Base unit"], value: opsText(en, item.unit) },
      { label: ["موجود", "On hand"], value: qty(item.physical) },
      { label: ["قابل استفاده", "Usable"], value: qty(item.available) },
      { label: ["حد هشدار", "Threshold"], value: qty(item.threshold) },
      ...(item.historicalValue !== undefined
        ? [
            {
              label: [
                "ارزش تاریخی / تومان",
                "Historical value / toman",
              ] as OpsText,
              value: formatMoney(item.historicalValue, en),
            },
          ]
        : []),
    ]
  if (item.type === "wip")
    return [
      {
        label: ["بچ / نسخه BOM", "Batch / BOM version"],
        value: (
          <>
            <bdi>{item.batch}</bdi>
            <small className="op-cell-note" dir="ltr">
              {item.bom}
            </small>
          </>
        ),
      },
      { label: ["هدف تولید", "Production target"], value: qty(item.target) },
      {
        label: ["سالم تأییدشده", "Approved output"],
        value: qty(item.approved),
      },
      {
        label: ["قابل فروش از تولید ناتمام", "Sellable from WIP"],
        value: en ? "Not sellable" : "قابل فروش نیست",
      },
    ]
  return [
    {
      label: ["ظرفیت قابل خرید", "Purchasable capacity"],
      value: qty(item.available),
    },
    {
      label: ["جزء محدودکننده", "Limiting component"],
      value: item.limiting ? opsText(en, item.limiting) : "—",
    },
    {
      label: ["نوع موجودی", "Stock model"],
      value: en ? "Derived from components" : "مشتق از اجزا",
    },
  ]
}
export function InventoryTable({
  items,
  en,
  onView,
}: {
  items: StockItem[]
  en: boolean
  onView: (code: string) => void
}) {
  const cells = items[0] ? stockCells(items[0], en) : []
  return (
    <table className="op-table">
      <caption className="sr-only">
        {en
          ? "Authorized inventory; each quantity has a base unit"
          : "موجودی مجاز؛ هر مقدار دارای واحد پایه است"}
      </caption>
      <thead>
        <tr>
          <th scope="col">{en ? "Item / specifications" : "مورد / مشخصات"}</th>
          {cells.map((cell, i) => (
            <th key={i} scope="col">
              {opsText(en, cell.label)}
            </th>
          ))}
          <th scope="col">{en ? "Status / action" : "وضعیت / اقدام"}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.code}>
            <td>
              <strong>{opsText(en, item.name)}</strong>
              <span className="op-code" dir="ltr">
                {item.code}
              </span>
              <small>{opsText(en, item.specs)}</small>
            </td>
            {stockCells(item, en).map((cell, i) => (
              <td key={i}>{cell.value}</td>
            ))}
            <td>
              <OpsStatusBadge status={item.status} en={en} />
              <button className="ad-link" onClick={() => onView(item.code)}>
                {item.type === "bundles"
                  ? en
                    ? "View components"
                    : "مشاهده اجزا"
                  : en
                    ? "View movements"
                    : "مشاهده گردش"}
                <span aria-hidden="true">{en ? "→" : "←"}</span>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
export function InventoryMobileCard({
  item,
  en,
  onView,
}: {
  item: StockItem
  en: boolean
  onView: () => void
}) {
  return (
    <article className="op-mobile-card">
      <header>
        <span dir="ltr" className="op-code">
          {item.code}
        </span>
        <OpsStatusBadge status={item.status} en={en} />
      </header>
      <h3>{opsText(en, item.name)}</h3>
      <p>{opsText(en, item.specs)}</p>
      <dl>
        {stockCells(item, en).map((cell, i) => (
          <div key={i}>
            <dt>{opsText(en, cell.label)}</dt>
            <dd>{cell.value}</dd>
          </div>
        ))}
      </dl>
      <button className="ad-link" onClick={onView}>
        {item.type === "bundles"
          ? en
            ? "View components"
            : "مشاهده اجزا"
          : en
            ? "View stock movements"
            : "مشاهده گردش"}
        <span aria-hidden="true">{en ? "→" : "←"}</span>
      </button>
    </article>
  )
}
export function StockMovementTable({
  movements,
  en,
}: {
  movements: StockMovement[]
  en: boolean
}) {
  return movements.length ? (
    <div className="op-movements">
      <p className="op-note">
        {en
          ? "Append-only sample records; these are recent events, not a complete opening-to-closing ledger."
          : "رکوردهای نمونه append-only؛ این‌ها رخدادهای اخیرند، نه دفتر کامل محاسبه مانده."}
      </p>
      <table className="op-movement-table">
        <thead>
          <tr>
            <th scope="col">{en ? "Document / event" : "سند / رخداد"}</th>
            <th scope="col">{en ? "Quantity / unit" : "مقدار / واحد"}</th>
            <th scope="col">{en ? "Reference / actor" : "ارجاع / ثبت‌کننده"}</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((row) => (
            <tr key={row.id}>
              <td>
                <bdi>{row.id}</bdi>
                <strong>{opsText(en, row.type)}</strong>
                <time dateTime={row.at}>
                  {new Date(row.at).toLocaleString(en ? "en-GB" : "fa-IR", {
                    timeZone: "Asia/Tehran",
                  })}
                </time>
              </td>
              <td>
                <StockQuantity
                  value={row.quantity}
                  unit={row.unit}
                  en={en}
                  signed
                />
              </td>
              <td>
                <bdi>{row.reference}</bdi>
                <small>{opsText(en, row.actor)}</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <OpsEmpty
      en={en}
      message={
        en
          ? "No recent movement records in this sample."
          : "رکورد گردش اخیر برای این مورد نمونه موجود نیست."
      }
    />
  )
}
export function StockDetailPattern({
  detail,
  en,
  onNavigate,
}: {
  detail: StockDetail
  en: boolean
  onNavigate: () => void
}) {
  return (
    <div className="op-detail-pattern">
      <header>
        <h3>{opsText(en, detail.item.name)}</h3>
        <OpsStatusBadge status={detail.item.status} en={en} />
      </header>
      <span className="op-code" dir="ltr">
        {detail.item.code} · revision {detail.revision}
      </span>
      <p>{opsText(en, detail.item.specs)}</p>
      <StockBreakdown item={detail.item} en={en} />
      {detail.item.type === "bundles" && (
        <>
          <p className="op-note">
            {en
              ? "Repeated SKUs were aggregated before integer-ratio capacity calculation. No independent bundle stock is created."
              : "SKUهای تکراری پیش از محاسبه نسبت صحیح تجمیع شده‌اند؛ موجودی مستقل پکیج ایجاد نمی‌شود."}
          </p>
          <ul className="op-bundle-requirements">
            {detail.item.requirements?.map((row) => (
              <li key={row.code}>
                <bdi>{row.code}</bdi>
                <span>
                  ×{" "}
                  {new Intl.NumberFormat(en ? "en" : "fa").format(
                    BigInt(row.quantity),
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <StockMovementTable movements={detail.movements} en={en} />
      <button className="button secondary" onClick={onNavigate}>
        {detail.item.type === "bundles"
          ? en
            ? "Component movement history"
            : "گردش اجزای پکیج"
          : en
            ? "Full movement history"
            : "تاریخچه کامل گردش"}
      </button>
    </div>
  )
}
export function ReservationCard({
  reservation,
  en,
  onView,
}: {
  reservation: Reservation
  en: boolean
  onView: () => void
}) {
  return (
    <article className="op-reservation">
      <div>
        <span className="op-code" dir="ltr">
          {reservation.id} · {reservation.order}
        </span>
        <StockQuantity
          value={reservation.quantity}
          unit={reservation.unit}
          en={en}
        />
      </div>
      <span className="op-code" dir="ltr">
        {reservation.sku}
      </span>
      <p>{opsText(en, reservation.status)}</p>
      <small>
        {reservation.expiresAt
          ? (en ? "Sample reservation expiry: " : "پایان رزرو نمونه: ") +
            new Date(reservation.expiresAt).toLocaleString(
              en ? "en-GB" : "fa-IR",
              { timeZone: "Asia/Tehran" },
            )
          : en
            ? "No verified expiry"
            : "زمان پایان معتبر موجود نیست"}
      </small>
      <p className="op-note">
        {en
          ? "Demo time basis: 14 Jun 2026. A UI timer is not a release operation; a cart is not a confirmed reservation."
          : "مبنای زمانی Demo: ۱۴ ژوئن ۲۰۲۶. تایمر رابط آزادسازی واقعی نیست؛ سبد خرید رزرو قطعی نیست."}
      </p>
      <button className="ad-link" onClick={onView}>
        {en ? "Review reservation" : "بررسی رزرو"}
      </button>
    </article>
  )
}
export function ProductionBatchCard({
  batch,
  en,
  onView,
}: {
  batch: ProductionBatch
  en: boolean
  onView: () => void
}) {
  return (
    <article className="op-batch">
      <header>
        <strong dir="ltr">{batch.id}</strong>
        <OpsStatusBadge status={batch.stage} en={en} />
      </header>
      <h3>{opsText(en, batch.title)}</h3>
      <p className="op-code" dir="ltr">
        {batch.sku} · {batch.bom}
      </p>
      <div className="op-batch-values">
        {[
          { label: ["هدف", "Target"] as OpsText, value: batch.target },
          {
            label: ["سالم تأییدشده", "Approved"] as OpsText,
            value: batch.approved,
          },
          {
            label: ["ضایعات ثبت‌شده", "Posted waste"] as OpsText,
            value: batch.waste,
          },
        ].map((row, i) => (
          <div key={i}>
            <span>{opsText(en, row.label)}</span>
            <StockQuantity value={row.value} unit={batch.unit} en={en} />
          </div>
        ))}
      </div>
      <p>{opsText(en, batch.consumption)}</p>
      <small>
        {batch.due
          ? (en ? "Sample due: " : "موعد نمونه: ") +
            new Date(batch.due).toLocaleDateString(en ? "en-GB" : "fa-IR", {
              timeZone: "Asia/Tehran",
            })
          : en
            ? "No agreed deadline"
            : "موعد تعیین نشده"}
      </small>
      <p className="op-note">
        {en
          ? "The starting BOM version is pinned. Targets and estimated consumption are not posted output or actual consumption."
          : "نسخه BOM شروع بچ ثابت است. هدف و مصرف برآوردی، خروجی واقعی یا مصرف ثبت‌شده نیستند."}
      </p>
      <button className="ad-link" onClick={onView}>
        {en ? "View batch" : "مشاهده بچ"}
        <span aria-hidden="true">{en ? "→" : "←"}</span>
      </button>
    </article>
  )
}
export function QualityControlPattern({ en }: { en: boolean }) {
  return (
    <div className="op-qc-pattern">
      <p className="op-code" dir="ltr">
        BCH-024 · QC-018 · Demo
      </p>
      <div className="op-qc-badges">
        {["qc", "approved", "correction", "rejected"].map((status) => (
          <OpsStatusBadge key={status} status={status} en={en} />
        ))}
      </div>
      <dl className="op-breakdown">
        <div>
          <dt>{en ? "Approved healthy output" : "خروجی سالم تأییدشده"}</dt>
          <dd>
            <StockQuantity value="42" unit={["عدد", "pcs"]} en={en} />
          </dd>
        </div>
        <div>
          <dt>{en ? "Registered waste" : "ضایعات ثبت‌شده"}</dt>
          <dd>
            <StockQuantity value="2" unit={["عدد", "pcs"]} en={en} />
          </dd>
        </div>
      </dl>
      <p className="op-note">
        {en
          ? "Sample: 2 rejected notebooks, unusual cover damage; waste document WST-012, BCH-024, 14 Jun 2026, authorized sample QC operator. Only approved output is eligible for a posted stock receipt."
          : "نمونه: ۲ دفتر مردود، آسیب غیرعادی جلد؛ سند WST-012، بچ BCH-024، ۱۴ ژوئن ۲۰۲۶، مسئول QC مجاز نمونه. فقط خروجی تأییدشده برای دریافت قطعی انبار واجد شرایط است."}
      </p>
    </div>
  )
}
type OperationKind = "receipt" | "consumption" | "output" | "adjustment"
export function OpsOperationForm({
  kind,
  en,
  allowed,
  conversionReady = true,
  conflict = false,
  onReview,
}: {
  kind: OperationKind
  en: boolean
  allowed: boolean
  conversionReady?: boolean
  conflict?: boolean
  onReview: () => void
}) {
  const [quantity, setQuantity] = useState(""),
    [waste, setWaste] = useState(""),
    [error, setError] = useState("")
  const titles: Record<OperationKind, OpsText> = {
    receipt: ["فرم دریافت خرید", "Purchase receipt form"],
    consumption: ["فرم مصرف مواد", "Material consumption form"],
    output: ["خروجی سالم و ضایعات", "Healthy output & waste"],
    adjustment: ["سند افتتاحیه یا اصلاح", "Opening / adjustment document"],
  }
  if (!allowed)
    return (
      <p className="op-note">
        {en
          ? "This role has no permission for this operation."
          : "این نقش مجوز این عملیات را ندارد."}
      </p>
    )
  return (
    <form
      className="op-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!conversionReady || conflict) return
        try {
          if (exactQuantity(quantity) <= 0n) throw new Error()
          if (kind === "output" && waste && exactQuantity(waste) < 0n)
            throw new Error()
          setError("")
          onReview()
        } catch {
          setError(
            en
              ? "Enter valid whole quantities in the registered base unit."
              : "مقدار صحیح معتبر در واحد پایه ثبت‌شده وارد کنید.",
          )
        }
      }}
    >
      <fieldset>
        <legend>{opsText(en, titles[kind])} · Demo</legend>
        <div className="op-form-grid">
          <label>
            {en ? "Related document" : "سند مرتبط"}
            <input
              required
              dir="ltr"
              defaultValue={
                kind === "receipt"
                  ? "PO-0241"
                  : kind === "adjustment"
                    ? "ADJ-…"
                    : "BCH-024"
              }
            />
          </label>
          <label>
            {en ? "Item / SKU" : "ماده / SKU"}
            <input
              required
              dir="ltr"
              readOnly
              value={kind === "output" ? "NB-GARDEN-A5" : "MAT-PAPER-200"}
            />
          </label>
          <label>
            {kind === "output"
              ? en
                ? "Healthy output quantity"
                : "مقدار خروجی سالم"
              : en
                ? "Quantity"
                : "مقدار"}
            <input
              required
              value={quantity}
              inputMode="numeric"
              dir="ltr"
              onChange={(e) =>
                setQuantity(
                  e.target.value.replace(/[۰-۹]/g, (c) =>
                    String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)),
                  ),
                )
              }
            />
          </label>
          <label>
            {en ? "Registered base unit" : "واحد پایه ثبت‌شده"}
            <input
              readOnly
              value={
                kind === "output" ? (en ? "pcs" : "عدد") : en ? "sheets" : "ورق"
              }
            />
          </label>
          {kind === "output" && (
            <>
              <label>
                {en ? "Waste quantity" : "مقدار ضایعات"}
                <input
                  required
                  value={waste}
                  dir="ltr"
                  inputMode="numeric"
                  onChange={(e) =>
                    setWaste(
                      e.target.value.replace(/[۰-۹]/g, (c) =>
                        String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)),
                      ),
                    )
                  }
                />
              </label>
              <label>
                {en ? "Waste classification" : "نوع ضایعات"}
                <SelectDropdown>
                  <option>{en ? "Unusual" : "غیرعادی"}</option>
                  <option>{en ? "Normal" : "عادی"}</option>
                </SelectDropdown>
              </label>
            </>
          )}
          {kind === "adjustment" && (
            <label>
              {en ? "Operation type" : "نوع عملیات"}
              <SelectDropdown>
                <option>{en ? "Opening stock" : "موجودی افتتاحیه"}</option>
                <option>{en ? "Documented increase" : "افزایش مستند"}</option>
                <option>{en ? "Documented decrease" : "کاهش مستند"}</option>
              </SelectDropdown>
            </label>
          )}
          <label>
            {en ? "Date (UTC)" : "تاریخ (UTC)"}
            <input type="date" required />
          </label>
          <label className="op-form-wide">
            {en ? "Reason / description" : "دلیل / توضیح"}
            <textarea required maxLength={500} />
          </label>
        </div>
        {!conversionReady && (
          <p className="op-validation" role="alert">
            {en
              ? "Unit conversion is incomplete for this operation."
              : "تبدیل واحد برای این عملیات کامل نیست."}
          </p>
        )}
        {conflict && (
          <p className="op-validation" role="alert">
            {en
              ? "Stock or document status has changed. Review the latest information."
              : "موجودی یا وضعیت سند تغییر کرده است. اطلاعات جدید را بررسی کنید."}
          </p>
        )}
        {error && (
          <p className="op-validation" role="alert">
            {error}
          </p>
        )}
        <p className="op-note">
          {en
            ? "Sample form only; quantities are not posted. Receiving, payment and production are separate events."
            : "فقط الگوی فرم؛ مقداری ثبت قطعی نمی‌شود. دریافت، پرداخت و تولید رخدادهای مستقل‌اند."}
        </p>
        <button
          className="button secondary"
          type="submit"
          disabled={!conversionReady || conflict}
        >
          {en ? "Review sample document" : "بررسی سند نمونه"}
        </button>
      </fieldset>
    </form>
  )
}
export function OpsTimeline({
  movements,
  en,
}: {
  movements: StockMovement[]
  en: boolean
}) {
  return (
    <ol className="od-timeline">
      {movements.map((row) => (
        <li key={row.id}>
          <strong>{opsText(en, row.type)}</strong>
          <bdi>
            {row.id} · {row.reference}
          </bdi>
          <time dateTime={row.at}>
            {new Date(row.at).toLocaleString(en ? "en-GB" : "fa-IR", {
              timeZone: "Asia/Tehran",
            })}{" "}
            · {opsText(en, row.actor)}
          </time>
        </li>
      ))}
    </ol>
  )
}
export function OpsResultPattern({ en }: { en: boolean }) {
  return (
    <div className="op-result" role="status">
      <strong>
        {en ? "Operation-result pattern · Demo" : "الگوی نتیجه عملیات · Demo"}
      </strong>
      <div>
        <span className="ad-badge green">
          {en ? "Sample success" : "موفقیت نمونه"}
        </span>
        <span className="ad-badge danger">
          {en ? "Sample failure" : "شکست نمونه"}
        </span>
        <span className="ad-badge warm">
          {en ? "Conflict; reload required" : "تعارض؛ دریافت تازه لازم"}
        </span>
      </div>
      <p>
        {en
          ? "No inventory quantity has been changed. A definitive result requires a service response linked to document, actor and time."
          : "هیچ مقدار موجودی تغییر نکرده است. نتیجه قطعی نیازمند پاسخ سرویس مرتبط با سند، ثبت‌کننده و زمان است."}
      </p>
    </div>
  )
}
export function OpsEmpty({
  en,
  filtered = false,
  message,
}: {
  en: boolean
  filtered?: boolean
  message?: string
}) {
  return (
    <div className="op-empty">
      <span className="op-empty-symbol" aria-hidden="true">
        —
      </span>
      <p>
        {message ??
          (filtered
            ? en
              ? "No items match these filters."
              : "موردی با این فیلترها پیدا نشد."
            : en
              ? "No items in this section."
              : "موردی در این بخش وجود ندارد.")}
      </p>
    </div>
  )
}
export function OpsError({ en, onRetry }: OpsErrorProps) {
  return (
    <div className="op-empty" role="status">
      <p>{en ? "Unable to load this section." : "دریافت این بخش ممکن نشد."}</p>
      <button className="button secondary" onClick={onRetry}>
        {en ? "Try again" : "تلاش دوباره"}
      </button>
    </div>
  )
}
export { OrderDialog as OpsModal, OrderSkeleton as OpsSkeleton }

interface OpsStatusProps {
  status: string
  en: boolean
}
interface StockBreakdownProps {
  item: StockItem
  en: boolean
}
interface StockBreakdownRow {
  label: OpsText
  value: string | null
}
interface OpsErrorProps {
  en: boolean
  onRetry: () => void
}
