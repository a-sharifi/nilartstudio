import { useEffect, useId, useRef, type ReactNode } from "react"
import { type AdminOrder, type OrderText, orderOptions } from "./order-data"
export const orderText = (en: boolean, pair: OrderText) => pair[en ? 1 : 0]
export function OrderQueueCard({
  label,
  count,
  loading,
  active,
  warning,
  onSelect,
  en,
}: {
  label: OrderText
  count: number | null
  loading: boolean
  active: boolean
  warning: boolean
  onSelect: () => void
  en: boolean
}) {
  return (
    <button
      className={`od-queue ${active ? "active" : ""}`}
      aria-pressed={active}
      onClick={onSelect}
    >
      <span
        className={`od-queue-mark ${warning ? "warning" : ""}`}
        aria-hidden="true"
      />
      <span>{orderText(en, label)}</span>
      <strong>
        {loading ? (
          <span className="od-count-skeleton" />
        ) : count === null ? (
          "—"
        ) : (
          new Intl.NumberFormat(en ? "en" : "fa").format(count)
        )}
      </strong>
    </button>
  )
}
export function OrderBadge({
  group,
  value,
  en,
}: {
  group: string
  value: string
  en: boolean
}) {
  const tone = [
    "confirmed",
    "complete",
    "delivered",
    "shipped",
    "digital",
  ].includes(value)
    ? "green"
    : [
          "verification",
          "allocation",
          "return",
          "partial",
          "assignment",
        ].includes(value)
      ? "warm"
      : ["failed", "cancelled"].includes(value)
        ? "danger"
        : ""
  return (
    <span className={`ad-badge od-badge ${tone}`}>
      {orderText(en, orderOptions[group]?.[value] ?? ["نامشخص", "Unknown"])}
    </span>
  )
}
export function OrderItemsSummary({
  order,
  en,
  expanded = false,
}: {
  order: AdminOrder
  en: boolean
  expanded?: boolean
}) {
  return (
    <div className="od-items-summary">
      {order.items.map((item) => (
        <div key={item.sku}>
          <strong>
            {orderText(en, item.title)}{" "}
            <span>
              × {new Intl.NumberFormat(en ? "en" : "fa").format(item.quantity)}
            </span>
          </strong>
          {expanded && (
            <>
              <small dir="ltr">{item.sku}</small>
              <p>{orderText(en, item.options)}</p>
              {item.components && (
                <ul>
                  {item.components.map((c, i) => (
                    <li key={i}>{orderText(en, c)}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ))}
      {expanded && order.items.some((i) => i.components) && (
        <p className="od-note">
          {en
            ? "Packages have no separate stock. Actual components are reserved and deducted. Notebook count is separate from sheet count."
            : "پکیج موجودی مستقل ندارد؛ اجزای واقعی رزرو و کسر می‌شوند. تعداد دفتر با تعداد برگ متفاوت است."}
        </p>
      )}
    </div>
  )
}
export function HistoricalOrderAmount({
  order,
  en,
}: {
  order: AdminOrder
  en: boolean
}) {
  return (
    <span className="od-amount">
      {order.amount === undefined ? (
        en ? (
          "Not authorized"
        ) : (
          "خارج از مجوز"
        )
      ) : (
        <>
          {new Intl.NumberFormat(en ? "en" : "fa").format(order.amount)}
          <small>{en ? "toman" : "تومان"}</small>
        </>
      )}
    </span>
  )
}
export function OrderShipmentCard({
  order,
  en,
}: {
  order: AdminOrder
  en: boolean
}) {
  return (
    <article className="od-shipment-card">
      <div>
        <strong>
          {en ? "Physical / digital delivery" : "ارسال / تحویل دیجیتال"}
        </strong>
        <OrderBadge group="shipment" value={order.shipment} en={en} />
      </div>
      <p>
        {order.shipment === "partial"
          ? en
            ? "Shipment 1 dispatched; custom digital artwork remains in progress. One shipment is not the entire order."
            : "مرسوله ۱ ارسال شده؛ نقاشی دیجیتال هنوز در حال اجراست. تحویل یک مرسوله تکمیل کل سفارش نیست."
          : en
            ? "Sample shipment summary; no real tracking code has been supplied."
            : "خلاصه مرسوله نمونه؛ کد رهگیری واقعی ارائه نشده است."}
      </p>
      <small>
        {en ? "Method: " : "روش: "}
        {orderText(en, orderOptions.method[order.method])}
      </small>
    </article>
  )
}
export function OrderTimeline({
  order,
  en,
}: {
  order: AdminOrder
  en: boolean
}) {
  return (
    <ol className="od-timeline">
      <li>
        <strong>{en ? "Order recorded (sample)" : "ثبت سفارش (نمونه)"}</strong>
        <time dateTime={order.createdAt}>
          {new Date(order.createdAt).toLocaleString(en ? "en-GB" : "fa-IR", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Tehran",
          })}
        </time>
      </li>
      <li>
        <strong>
          {en
            ? "Current state supplied by sample service"
            : "وضعیت جاری دریافتی از سرویس نمونه"}
        </strong>
        <span>{orderText(en, orderOptions.operation[order.operation])}</span>
      </li>
    </ol>
  )
}
export function OrderOperationResult({ en }: { en: boolean }) {
  return (
    <div className="od-operation-result" role="status">
      <strong>
        {en ? "Operation result pattern · Demo" : "الگوی نتیجه عملیات · Demo"}
      </strong>
      <p>
        {en
          ? "Success: 1 sample record · failed: 1 sample record. This is a reusable presentation pattern, not a bulk action."
          : "موفق: ۱ رکورد نمونه · ناموفق: ۱ رکورد نمونه. این فقط الگوی نمایش است؛ عملیات گروهی انجام نمی‌دهد."}
      </p>
      <span className="ad-badge green">
        {en ? "Sample success" : "موفقیت نمونه"}
      </span>
      <span className="ad-badge danger">
        {en
          ? "Sample conflict — recheck status"
          : "تعارض نمونه — بازبینی وضعیت"}
      </span>
    </div>
  )
}
export function OrderDialog({
  open,
  onClose,
  title,
  children,
  drawer = false,
  sheet = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  drawer?: boolean
  sheet?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId()
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const el = ref.current
    if (open) el?.showModal()
    else el?.close()
    return () => {
      el?.close()
      previous?.focus()
    }
  }, [open])
  return (
    <dialog
      className={`od-dialog ${drawer ? "od-preview" : ""} ${
        sheet ? "od-sheet" : ""
      }`}
      ref={ref}
      aria-labelledby={id}
      onCancel={onClose}
      onClick={(e) => {
        if (e.currentTarget === e.target) onClose()
      }}
    >
      <div className="ad-panel-head">
        <h2 id={id}>{title}</h2>
        <button className="icon-button" aria-label={enClose} onClick={onClose}>
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M6 18 18 6" />
          </svg>
        </button>
      </div>
      {children}
    </dialog>
  )
}
const enClose = "بستن / Close"
export function OrderSkeleton() {
  return (
    <div
      className="od-skeleton-list"
      aria-busy="true"
      aria-label="Loading orders / دریافت سفارش‌ها"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <div className="ad-skeleton" key={i} />
      ))}
    </div>
  )
}
export function OrderEmpty({
  en,
  filtered,
}: {
  en: boolean
  filtered: boolean
}) {
  return (
    <div className="od-empty">
      <span className="od-empty-symbol" aria-hidden="true">
        —
      </span>
      <h3>
        {filtered
          ? en
            ? "No orders match these filters."
            : "سفارشی با این فیلترها پیدا نشد."
          : en
            ? "No orders have been recorded yet."
            : "هنوز سفارشی ثبت نشده است."}
      </h3>
      <p>
        {en
          ? "Valid orders will appear here when available."
          : "سفارش‌های معتبر در صورت وجود در این بخش نمایش داده می‌شوند."}
      </p>
    </div>
  )
}
export function OrderMobileCard({
  order,
  en,
  onPreview,
}: {
  order: AdminOrder
  en: boolean
  onPreview: () => void
}) {
  return (
    <article className="od-mobile-card">
      <div className="od-mobile-head">
        <strong dir="ltr">{order.id}</strong>
        <HistoricalOrderAmount order={order} en={en} />
      </div>
      <small>
        {new Date(order.createdAt).toLocaleString(en ? "en-GB" : "fa-IR", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Tehran",
        })}{" "}
        · {orderText(en, order.customer)}
      </small>
      <OrderItemsSummary order={order} en={en} />
      <div className="od-mobile-statuses">
        {(["payment", "operation", "shipment", "request"] as const).map(
          (group) => (
            <div key={group}>
              <span>
                {orderText(
                  en,
                  ({
                    payment: ["پرداخت", "Payment"],
                    operation: ["عملیات", "Operations"],
                    shipment: ["تحویل", "Delivery"],
                    request: ["درخواست", "Request"],
                  } as const)[group],
                )}
              </span>
              <OrderBadge group={group} value={order[group]} en={en} />
            </div>
          ),
        )}
      </div>
      <div className="od-mobile-foot">
        {order.attention.length > 0 && (
          <span className="od-attention-label">
            {en ? "Review required" : "نیازمند رسیدگی"}
          </span>
        )}
        <button className="ad-link" onClick={onPreview}>
          {en ? "View order" : "مشاهده سفارش"}
          <span aria-hidden="true">{en ? "→" : "←"}</span>
        </button>
      </div>
    </article>
  )
}

export function OrderManagementTable({
  orders,
  en,
  financial,
  onPreview,
}: {
  orders: AdminOrder[]
  en: boolean
  financial: boolean
  onPreview: (id: string) => void
}) {
  const t = (fa: string, english: string) => (en ? english : fa)
  return (
    <div className="od-table-wrap">
      <table className="od-table">
        <caption className="sr-only">
          {t(
            "سفارش‌های مجاز با وضعیت مستقل پرداخت، عملیات و تحویل",
            "Permitted orders with independent payment, operation and delivery states",
          )}
        </caption>
        <thead>
          <tr>
            <th scope="col">{t("سفارش / زمان ثبت", "Order / registered")}</th>
            <th scope="col">{t("مشتری / اقلام", "Customer / items")}</th>
            {financial && (
              <th scope="col">{t("مبلغ تاریخی", "Historical total")}</th>
            )}
            <th scope="col">{t("پرداخت", "Payment")}</th>
            <th scope="col">{t("عملیات / تحویل", "Operations / delivery")}</th>
            <th scope="col">{t("رسیدگی / اقدام", "Attention / action")}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <strong className="od-order-number" dir="ltr">
                  {order.id}
                </strong>
                <time dateTime={order.createdAt}>
                  {new Date(order.createdAt).toLocaleDateString(
                    en ? "en-GB" : "fa-IR",
                    {
                      day: "numeric",
                      month: "short",
                      timeZone: "Asia/Tehran",
                    },
                  )}
                  <span>
                    {new Date(order.createdAt).toLocaleTimeString(
                      en ? "en" : "fa",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Tehran",
                      },
                    )}
                  </span>
                </time>
              </td>
              <td>
                <span className="od-customer">
                  {orderText(en, order.customer)}
                </span>
                <OrderItemsSummary order={order} en={en} />
                <small className="od-order-kind">
                  {orderText(en, orderOptions.type[order.type])} ·{" "}
                  {orderText(en, orderOptions.delivery[order.delivery])}
                </small>
              </td>
              {financial && (
                <td>
                  <HistoricalOrderAmount order={order} en={en} />
                </td>
              )}
              <td>
                <OrderBadge group="payment" value={order.payment} en={en} />
                {order.operation === "allocation" && (
                  <small className="od-late">
                    {t("موفقیت دیرهنگام", "Late success")}
                  </small>
                )}
              </td>
              <td>
                <OrderBadge group="operation" value={order.operation} en={en} />
                <div className="od-delivery-status">
                  <OrderBadge group="shipment" value={order.shipment} en={en} />
                </div>
                {order.request !== "none" && (
                  <OrderBadge group="request" value={order.request} en={en} />
                )}
              </td>
              <td>
                {order.attention.length > 0 ? (
                  <span className="od-attention-label">
                    {t("نیازمند رسیدگی", "Review required")}
                  </span>
                ) : (
                  <span className="od-no-action">
                    {t("بدون اقدام فوری", "No urgent action")}
                  </span>
                )}
                <button
                  className="ad-link od-view"
                  onClick={() => onPreview(order.id)}
                >
                  {t("مشاهده سفارش", "View order")}
                  <span aria-hidden="true">{en ? "→" : "←"}</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
