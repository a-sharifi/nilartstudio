import { useEffect, useState, type ReactNode } from "react"
import { catalogProducts } from "./catalog"
import { covers } from "./product"
import BundleStillLife from "./BundleStillLife"
import type { EvaluatedLine, CouponResult } from "./cart"

interface Props {
  row: EvaluatedLine
  language: 0 | 1
  coupon: CouponResult
  stacking: boolean
  busy: boolean
  error?: string
  expanded: boolean
  offline: boolean
  onQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onEdit: (id: string) => void
  onAcceptPrice: (row: EvaluatedLine) => void
  onNavigate: (name: string, route: string) => void
  renderMedia: (color: string, kind: string, hero?: boolean) => ReactNode
  arrow: ReactNode
  readOnly?: boolean
  hidePrivate?: boolean
}
export default function CartRow({
  row,
  language,
  coupon,
  stacking,
  busy,
  error,
  expanded,
  offline,
  onQuantity,
  onRemove,
  onEdit,
  onAcceptPrice,
  onNavigate,
  renderMedia,
  arrow,
  readOnly = false,
  hidePrivate = false,
}: Props) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const money = (value: number) =>
    `${value.toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("تومان", "toman")}`
  const { line } = row
  const product =
    line.kind === "product"
      ? catalogProducts.find((product) =>
          product.skus.some((sku) => sku.id === line.data.skuId),
        )
      : undefined
  const canEdit =
    line.kind === "bundle" ||
    (line.kind === "product" &&
      !!line.data.selection.sheets &&
      !!line.data.selection.cover)
  const isArt = line.kind === "commission" || line.kind === "artwork"
  const displayName =
    hidePrivate && isArt
      ? t("سفارش نقاشی ذخیره‌شده", "Saved art order")
      : row.name[language]
  const label =
    line.kind === "bundle"
      ? t("پکیج", "Bundle")
      : line.kind === "commission"
        ? t("سفارش نقاشی", "Commission")
        : line.kind === "artwork"
          ? t("اثر آماده", "Original artwork")
          : t("محصول", "Product")
  const summary =
    line.kind === "product" || line.kind === "bundle"
      ? [
          line.data.selection.size,
          line.data.selection.sheets
            ? `${Number(line.data.selection.sheets).toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("برگ در هر دفتر", "sheets per notebook")}`
            : "",
          covers.find((cover) => cover.value === line.data.selection.cover)
            ?.label[language] || "",
        ]
          .filter(Boolean)
          .join(" · ")
      : `${line.data.style[language]} · ${line.data.size} · ${line.data.execution[language]}`
  const action = (name: string, route: string) => (
    <a
      className="text-link"
      href={route}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return
        event.preventDefault()
        onNavigate(name, route)
      }}
    >
      {name}
      {arrow}
    </a>
  )
  return (
    <article
      id={`cart-row-${line.id}`}
      tabIndex={-1}
      className={`cart-row cart-row-${line.kind} ${
        row.issue ? "cart-row-attention" : ""
      }`}
      aria-busy={busy}
    >
      <div className="cart-row-top">
        <div
          className="cart-row-image"
          role="img"
          aria-label={t("تصویر نمونه: ", "Sample image: ") + displayName}
        >
          <div aria-hidden="true">
            {line.kind === "bundle" ? (
              <BundleStillLife renderMedia={renderMedia} />
            ) : isArt ? (
              <div className="cart-art-reference">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                >
                  <rect x="7" y="5" width="34" height="38" rx="2" />
                  <circle cx="18" cy="17" r="4" />
                  <path d="m10 37 10-12 9 8 6-7 5 11" />
                </svg>
                <span>{t("تصویر نمونه", "Placeholder")}</span>
              </div>
            ) : (
              renderMedia("sage", product?.kind || "book")
            )}
          </div>
        </div>
        <div className="cart-row-title">
          <span className="cart-type-label">{label}</span>
          <h3>{displayName}</h3>
          {hidePrivate && isArt ? (
            <p className="cart-options">
              {t(
                "برای مشاهده جزئیات خصوصی دوباره حساب را تأیید کنید.",
                "Confirm your account to view private details.",
              )}
            </p>
          ) : (
            <p className="cart-options">
              {summary ||
                t("طرح و مشخصات ثابت", "Fixed design and specification")}
            </p>
          )}
          {!isArt && <small>{t("کالکشن گربه", "Cats collection")}</small>}
          {isArt && (
            <span className={`cart-art-status ${row.issue ? "" : "confirmed"}`}>
              {row.issue === "pending"
                ? t("در انتظار بررسی هنرمند", "Awaiting artist review")
                : row.issue === "expired"
                  ? t("قیمت نیازمند تأیید دوباره", "Quote needs reconfirmation")
                  : t("قیمت تأییدشده — نمونه", "Confirmed price — demo")}
            </span>
          )}
        </div>
      </div>
      {line.kind === "bundle" && (
        <details
          className="cart-bundle-components"
          open={expanded || row.issue === "out-of-stock"}
        >
          <summary>
            {t("اجزای پکیج", "Bundle components")}
            <span>
              {t("تعداد ثابت در هر پکیج", "Fixed quantity per bundle")}
            </span>
          </summary>
          <div>
            {line.data.parts.map((part, index) => {
              const item = catalogProducts.find(
                (product) => product.id === part.productId,
              )
              const blocked = row.blockedParts.includes(part.skuId)
              return (
                <div
                  className={`cart-bundle-part ${blocked ? "blocked" : ""}`}
                  key={`${part.skuId}-${index}`}
                >
                  <div aria-hidden="true">
                    {renderMedia("sage", item?.kind || "book")}
                  </div>
                  <div>
                    <h4>
                      {item?.name[language] ||
                        t("جزء ثبت‌شده", "Saved component")}
                    </h4>
                    <p>
                      {t("در هر پکیج: ", "Per bundle: ")}
                      {part.quantity.toLocaleString(
                        language === 0 ? "fa-IR" : "en-US",
                      )}{" "}
                      · {t("تعداد کل: ", "Total quantity: ")}
                      {(part.quantity * row.quantity).toLocaleString(
                        language === 0 ? "fa-IR" : "en-US",
                      )}
                    </p>
                    {item?.category === "sketchbooks" && (
                      <small>{summary}</small>
                    )}
                    {blocked && (
                      <p className="cart-part-warning">
                        {t(
                          "این جزء برای ترکیب انتخاب‌شده موجود نیست.",
                          "This component is unavailable for the selected combination.",
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </details>
      )}
      {!isArt && (
        <div className="cart-row-values">
          <div className="cart-unit-price">
            <span>
              {line.kind === "bundle"
                ? t(
                    "قیمت هر پکیج پس از تخفیف",
                    "Price per bundle after discount",
                  )
                : product?.category === "sketchbooks" ||
                    product?.category === "notebooks"
                  ? t("قیمت هر دفتر", "Price per notebook")
                  : t("قیمت واحد", "Unit price")}
            </span>
            <strong>{money(row.acceptedPrice)}</strong>
          </div>
          {readOnly ? (
            <div className="checkout-readonly-quantity">
              <span>
                {line.kind === "bundle"
                  ? t("تعداد پکیج", "Bundle quantity")
                  : product?.kind === "book"
                    ? t("تعداد دفتر", "Number of notebooks")
                    : t("تعداد", "Quantity")}
              </span>
              <strong>
                {row.quantity.toLocaleString(
                  language === 0 ? "fa-IR" : "en-US",
                )}
              </strong>
            </div>
          ) : (
            <QuantityControl
              id={line.id}
              name={row.name[language]}
              label={
                line.kind === "bundle"
                  ? t("تعداد پکیج", "Bundle quantity")
                  : product?.kind === "book"
                    ? t("تعداد دفتر", "Number of notebooks")
                    : t("تعداد", "Quantity")
              }
              quantity={row.quantity}
              max={row.maxQuantity}
              disabled={
                offline ||
                row.issue === "deleted" ||
                row.issue === "out-of-stock"
              }
              busy={busy}
              language={language}
              onChange={(value) => onQuantity(line.id, value)}
            />
          )}
          <div className="cart-line-total">
            <span>{t("مبلغ ردیف", "Line total")}</span>
            {busy ? (
              <span className="skeleton cart-money-skeleton" />
            ) : (
              <strong>{money(row.acceptedPrice * row.quantity)}</strong>
            )}
          </div>
        </div>
      )}
      {isArt && row.issue !== "pending" && !hidePrivate && (
        <div className="cart-art-price">
          <span>
            {row.issue === "expired"
              ? t(
                  "مبلغ quote قبلی — غیرقابل پرداخت",
                  "Previous quote — not payable",
                )
              : t("مبلغ تأییدشده", "Confirmed amount")}
          </span>
          <strong>{money(row.acceptedPrice)}</strong>
          <small>
            {t(
              line.kind === "artwork"
                ? "یک اثر؛ تعداد قابل تغییر نیست"
                : "یک سفارش؛ تعداد قابل تغییر نیست",
              line.kind === "artwork"
                ? "One artwork; quantity is not editable"
                : "One order; quantity is not editable",
            )}
          </small>
        </div>
      )}
      {line.kind === "bundle" && (
        <p className="cart-bundle-saving">
          {t("تخفیف پکیج این ردیف: ", "This line's bundle saving: ")}
          {money(
            Math.max(
              0,
              line.data.parts.reduce(
                (sum, part) => sum + part.unitPrice * part.quantity,
                0,
              ) - line.data.unitPrice,
            ) * row.quantity,
          )}
        </p>
      )}
      {coupon.code && !coupon.error && (
        <div className="cart-code-line-label">
          {coupon.byLine[line.id]
            ? t("مشمول کد", "Code applied")
            : line.kind === "bundle" && !stacking
              ? t(
                  "کد روی این پکیج اعمال نمی‌شود",
                  "Code doesn't apply to this bundle",
                )
              : null}
        </div>
      )}
      {row.issue && (
        <div
          className={`cart-row-notice ${
            row.issue === "pending" ? "pending" : ""
          }`}
          role={row.issue === "pending" ? undefined : "alert"}
        >
          {row.issue === "price" ? (
            <>
              <h4>
                {t(
                  "قیمت این انتخاب تغییر کرده است.",
                  "The price of this selection has changed.",
                )}
              </h4>
              <div className="cart-price-comparison">
                <span>
                  {t("قیمت قبلی", "Previous price")}
                  <s>{money(row.acceptedPrice)}</s>
                </span>
                <span>
                  {t("قیمت جدید", "New price")}
                  <strong>{money(row.currentPrice)}</strong>
                </span>
              </div>
              <p>
                {t("تغییر مبلغ ردیف: ", "Line amount change: ")}
                {row.currentPrice >= row.acceptedPrice ? "+" : "−"}{" "}
                {money(
                  Math.abs(row.currentPrice - row.acceptedPrice) * row.quantity,
                )}
              </p>
              {line.kind === "bundle" && (
                <p>
                  {t(
                    "خرید جداگانه جدید: ",
                    "Updated separate-purchase total: ",
                  )}
                  {money(row.basePrice)} ·{" "}
                  {t("تخفیف پکیج: ", "Bundle discount: ")}
                  {money(row.bundleSaving)}
                </p>
              )}
              <button
                className="button secondary"
                disabled={offline || busy}
                onClick={() => onAcceptPrice(row)}
              >
                {t("تأیید قیمت جدید", "Accept updated price")}
              </button>
            </>
          ) : row.issue === "pending" ? (
            <p>
              {t(
                "این سفارش پس از بررسی هنرمند و تأیید قیمت، قابل پرداخت است.",
                "This commission can be paid after artist review and your acceptance of the final quote.",
              )}
            </p>
          ) : row.issue === "expired" ? (
            <p>
              {t(
                "این quote منقضی شده است؛ پیش از پرداخت، قیمت باید دوباره تأیید شود.",
                "This quote has expired. The price must be confirmed again before payment.",
              )}
            </p>
          ) : row.issue === "deleted" ? (
            <>
              <p>
                {t(
                  "این قلم دیگر در کاتالوگ عرضه نمی‌شود؛ اطلاعات قبلی برای شناسایی حفظ شده‌اند.",
                  "This item is no longer offered. Previous details are kept for identification.",
                )}
              </p>
              {action(t("تماس با پشتیبانی", "Contact support"), "/contact")}
            </>
          ) : row.issue === "shared-stock" ? (
            <>
              <h4>{t("تعارض موجودی میان ردیف‌ها", "Shared stock conflict")}</h4>
              <p>
                {t(
                  "محصول مستقل و پکیج از SKU مشترک استفاده می‌کنند. تعداد را کاهش دهید یا گزینه دیگری انتخاب کنید.",
                  "The product and bundle use a shared SKU. Reduce quantities or choose another option.",
                )}
              </p>
              <p>
                {t("تعداد فعلی: ", "Current quantity: ")}
                {row.quantity.toLocaleString(
                  language === 0 ? "fa-IR" : "en-US",
                )}{" "}
                · {t("قابل خرید در این ردیف: ", "Available for this line: ")}
                {row.maxQuantity.toLocaleString(
                  language === 0 ? "fa-IR" : "en-US",
                )}
              </p>
            </>
          ) : row.issue === "quantity" ? (
            <>
              <p>
                {t(
                  "موجودی این گزینه تغییر کرده است؛ تعداد را بررسی کنید.",
                  "Stock has changed; please review the quantity.",
                )}
              </p>
              <p>
                {t("تعداد فعلی: ", "Current quantity: ")}
                {row.quantity.toLocaleString(
                  language === 0 ? "fa-IR" : "en-US",
                )}{" "}
                · {t("تعداد قابل خرید: ", "Purchasable quantity: ")}
                {row.maxQuantity.toLocaleString(
                  language === 0 ? "fa-IR" : "en-US",
                )}
              </p>
            </>
          ) : (
            <p>
              {t(
                "این گزینه فعلاً موجود نیست.",
                "This option is currently out of stock.",
              )}
            </p>
          )}
          {!readOnly &&
            (row.issue === "shared-stock" || row.issue === "quantity") &&
            row.maxQuantity > 0 && (
              <button
                className="button secondary"
                disabled={busy || offline}
                onClick={() => onQuantity(line.id, row.maxQuantity)}
              >
                {t("تأیید تعداد ", "Confirm quantity ")}
                {row.maxQuantity.toLocaleString(
                  language === 0 ? "fa-IR" : "en-US",
                )}
              </button>
            )}
        </div>
      )}
      {error && (
        <p className="cart-operation-error" role="alert">
          {error}
        </p>
      )}
      {!readOnly && (
        <div className="cart-row-actions">
          {canEdit && (
            <button
              className="filter-clear"
              disabled={busy || offline}
              onClick={() => onEdit(line.id)}
            >
              {line.kind === "bundle"
                ? t("ویرایش پکیج", "Edit bundle")
                : t("ویرایش انتخاب", "Edit options")}
            </button>
          )}
          {isArt &&
            action(
              row.issue === "pending"
                ? t("پیگیری درخواست", "View request")
                : t("مشاهده جزئیات سفارش", "View commission details"),
              line.kind === "commission"
                ? line.data.commissionAcceptance
                  ? `/${language === 0 ? "fa" : "en"}/commissions/new/quote`
                  : `/commissions/${line.data.id}${
                    line.data.quoteId ? "/quote" : ""
                  }`
                : `/artworks/${line.data.id}`,
            )}
          <button
            className="cart-remove-button"
            disabled={busy || offline}
            onClick={() => onRemove(line.id)}
            aria-label={
              t("حذف از سبد: ", "Remove from cart: ") + row.name[language]
            }
          >
            <TrashIcon />
            {t("حذف", "Remove")}
          </button>
        </div>
      )}
      <small className="cart-row-demo">
        {t("اطلاعات و مبلغ نمایشی", "Demo details and price")}
      </small>
    </article>
  )
}
function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7M14 10v7" />
    </svg>
  )
}
function QuantityControl({
  id,
  name,
  label,
  quantity,
  max,
  disabled,
  busy,
  language,
  onChange,
}: {
  id: string
  name: string
  label: string
  quantity: number
  max: number
  disabled: boolean
  busy: boolean
  language: 0 | 1
  onChange: (quantity: number) => void
}) {
  const [draft, setDraft] = useState(String(quantity))
  const [error, setError] = useState("")
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  useEffect(() => {
    if (!busy) setDraft(String(quantity))
  }, [quantity, busy])
  const submit = (value: string) => {
    if (
      !/^\d+$/.test(value) ||
      !Number.isSafeInteger(Number(value)) ||
      Number(value) < 1 ||
      Number(value) > max
    ) {
      setError(
        t("تعداد صحیح بین ۱ و ", "Use a whole number between 1 and ") +
          max.toLocaleString(language === 0 ? "fa-IR" : "en-US"),
      )
      return
    }
    setError("")
    if (Number(value) !== quantity) onChange(Number(value))
  }
  return (
    <div className="cart-quantity">
      <label htmlFor={`quantity-${id}`}>{label}</label>
      <div className="quantity-stepper">
        <button
          disabled={disabled || busy || quantity <= 1}
          onClick={() => submit(String(quantity - 1))}
          aria-label={t("کم‌کردن تعداد ", "Decrease quantity of ") + name}
        >
          −
        </button>
        <input
          id={`quantity-${id}`}
          inputMode="numeric"
          disabled={disabled || busy || max < 1}
          value={draft}
          onChange={(event) =>
            setDraft(
              event.target.value
                .replace(/[۰-۹]/g, (digit) =>
                  String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
                )
                .replace(/[٠-٩]/g, (digit) =>
                  String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
                ),
            )
          }
          onBlur={() => submit(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              submit(draft)
            }
            if (event.key === "Escape") {
              setDraft(String(quantity))
              setError("")
            }
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `quantity-error-${id}` : undefined}
        />
        <button
          disabled={disabled || busy || quantity >= max}
          onClick={() => submit(String(quantity + 1))}
          aria-label={t("افزایش تعداد ", "Increase quantity of ") + name}
        >
          +
        </button>
      </div>
      {busy && (
        <small role="status">
          {t("در حال تأیید تعداد…", "Confirming quantity…")}
        </small>
      )}
      {error && (
        <small
          className="cart-field-error"
          id={`quantity-error-${id}`}
          role="alert"
        >
          {error}
        </small>
      )}
    </div>
  )
}
