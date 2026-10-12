import { useEffect, useRef, useState, type MouseEvent } from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import {
  demoReceiptOrderIds,
  receiptFixture,
  type ReceiptScenario,
} from "./receipt"
import "./receipt.css"

type View = ReceiptScenario | "loading" | "empty" | "network" | "server" | "denied"
const previews: [View, string, string][] = [
  ["bundle", "محصول و پکیج", "Products & bundle"],
  ["artwork", "نقاشی آماده", "Ready artwork"],
  ["commission", "نقاشی سفارشی", "Commission"],
  ["digital", "فقط دیجیتال", "Digital only"],
  ["verification", "پرداخت در حال بررسی", "Payment under verification"],
  ["refund", "بازپرداخت جزئی", "Partial refund"],
  ["multipage", "چاپ چندصفحه‌ای", "Multi-page print"],
  ["loading", "بارگذاری", "Loading"],
  ["empty", "سند صادرنشده", "Not issued"],
  ["network", "خطای شبکه", "Network error"],
  ["server", "خطای سرور", "Server error"],
  ["denied", "عدم دسترسی", "Access denied"],
]
export default function ReceiptPage({
  page,
  navigate,
}: {
  page: string
  navigate: (route: string) => void
}) {
  const en = page.startsWith("/en/")
  const t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa"
  const orderId = page.split("/")[4]
  const valid = demoReceiptOrderIds.includes(orderId)
  const [view, setView] = useState<View>("bundle")
  const [expanded, setExpanded] = useState(false)
  const [live, setLive] = useState("")
  const [busy, setBusy] = useState(false)
  const [destination, setDestination] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef<HTMLElement | null>(null)
  const mode = valid ? view : "denied"
  const hasDocument = ![
    "loading",
    "empty",
    "network",
    "server",
    "denied",
  ].includes(mode)
  const snapshot = receiptFixture(
    hasDocument ? mode as ReceiptScenario : "bundle",
  )
  const orderRoute = `${prefix}/account/orders/${orderId}`
  const amount = (value: number) => (
    <span className="receipt-money">
      <bdi>{value.toLocaleString(en ? "en-US" : "fa-IR")}</bdi>
      <small>{t("تومان", "IRT")}</small>
    </span>
  )
  const date = t("۱۸ خرداد ۱۴۰۴", "8 June 2025")
  useEffect(() => {
    setView("bundle")
    setExpanded(false)
    setLive("")
    setDestination(null)
  }, [orderId])
  useEffect(() => {
    if (destination) dialog.current?.showModal()
    else if (dialog.current?.open) dialog.current.close()
  }, [destination])
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  const close = () => {
    setDestination(null)
    requestAnimationFrame(() => origin.current?.focus())
  }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (
      route === `${prefix}/account` ||
      route.includes("/auth/") ||
      route.endsWith("/receipt")
    )
      navigate(route)
    else {
      origin.current = event.currentTarget
      setDestination(route)
    }
  }
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setLive(t("کپی شد", "Copied"))
    } catch {
      setLive(
        t(
          "کپی ممکن نشد؛ شماره را انتخاب و کپی کنید.",
          "Unable to copy. Select and copy the number.",
        ),
      )
    }
  }
  const identifier = (value: string) => (
    <span className="receipt-identifier">
      <bdi>{value}</bdi>
      <button
        className="icon-button"
        aria-label={`${t("کپی", "Copy")} ${value}`}
        onClick={() => copy(value)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <rect x="8" y="8" width="12" height="13" rx="2" />
          <path d="M15 8V3H3v13h5" />
        </svg>
      </button>
    </span>
  )
  const retry = () => {
    setBusy(true)
    timer.current = setTimeout(() => {
      setBusy(false)
      setLive(
        t(
          "سرویس رسید متصل نیست؛ دریافت رسید ممکن نشد.",
          "Receipt service is not connected; unable to load the receipt.",
        ),
      )
    }, 700)
  }
  const print = () => {
    setLive("")
    window.print()
  }
  return (
    <DashboardPage
      page={page}
      navigate={navigate}
      renderMedia={() => null}
      panelTitle={t("رسید و جزئیات مبلغ", "Receipt and price details")}
    >
      <div className="receipt-page">
        <nav
          className="receipt-breadcrumb receipt-no-print"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          <a href={`${prefix}/account`} onClick={follow(`${prefix}/account`)}>
            {t("حساب", "Account")}
          </a>
          <span>/</span>
          <a
            href={`${prefix}/account/orders`}
            onClick={follow(`${prefix}/account/orders`)}
          >
            {t("سفارش‌ها", "Orders")}
          </a>
          <span>/</span>
          <a href={orderRoute} onClick={follow(orderRoute)}>
            <bdi>{valid ? orderId : "—"}</bdi>
          </a>
          <span>/</span>
          <span aria-current="page">{t("رسید", "Receipt")}</span>
        </nav>
        <div className="receipt-title-row">
          <div>
            <span className="receipt-eyebrow">NILART · USER-04</span>
            <h1>{t("رسید و جزئیات مبلغ", "Receipt and price details")}</h1>
            <p>
              {t(
                "یک نگاه روشن به جزئیات خرید شما.",
                "A clear view of the details of your purchase.",
              )}
            </p>
          </div>
          <div className="receipt-actions receipt-no-print">
            <a
              className="button secondary"
              href={orderRoute}
              onClick={follow(orderRoute)}
            >
              <Glyph name="arrow" size={17} />
              {t("بازگشت به سفارش", "Back to order")}
            </a>
            <button
              className="button primary"
              onClick={print}
              disabled={!hasDocument}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6Z" />
              </svg>
              {t("چاپ", "Print")}
            </button>
          </div>
        </div>
        <div className="receipt-demo">
          <span>Demo</span>
          <p>
            {t(
              "سند و تمام داده‌های مالی زیر نمونه طراحی هستند؛ پرداخت، بازپرداخت یا صدور واقعی انجام نشده است.",
              "This document and all financial data are design fixtures; no actual payment, refund or issuance has occurred.",
            )}
          </p>
        </div>
        <div
          className="receipt-live receipt-no-print"
          role="status"
          aria-live="polite"
        >
          {live}
        </div>
        {!hasDocument ? (
          mode === "loading" ? (
            <div
              className="receipt-loading"
              aria-busy="true"
              aria-label={t("در حال دریافت سند", "Loading document")}
            >
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : (
            <section className="receipt-state dash-card">
              <Glyph name={mode === "denied" ? "shield" : "book"} size={36} />
              <h2>
                {mode === "empty"
                  ? t(
                      "هنوز سندی برای این سفارش صادر نشده است.",
                      "No document has been issued for this order yet.",
                    )
                  : mode === "denied"
                    ? t(
                        "امکان دسترسی به این رسید وجود ندارد.",
                        "This receipt is not accessible.",
                      )
                    : mode === "server"
                      ? t(
                          "رسید موقتاً در دسترس نیست.",
                          "The receipt is temporarily unavailable.",
                        )
                      : t(
                          "دریافت رسید ممکن نشد.",
                          "Unable to load the receipt.",
                        )}
              </h2>
              <p>
                {mode === "empty"
                  ? t(
                      "نبود سند به معنی نبود سفارش یا ناموفق‌بودن پرداخت نیست.",
                      "A missing document does not mean a missing order or failed payment.",
                    )
                  : mode === "denied"
                    ? t(
                        "برای نمایش سند، تأیید مالکیت و مجوز سرویس لازم است.",
                        "Service ownership and permission checks are required to display a document.",
                      )
                    : t(
                        "این وضعیت، نتیجه پرداخت شما را تغییر نمی‌دهد.",
                        "This does not change your payment result.",
                      )}
              </p>
              {["network", "server"].includes(mode) && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={retry}
                >
                  {busy
                    ? t("در حال تلاش…", "Trying…")
                    : t("تلاش دوباره", "Try again")}
                </button>
              )}
            </section>
          )
        ) : (
          <>
            {snapshot.payment === "verification" && (
              <div className="receipt-warning">
                <Glyph name="clock" />
                <p>
                  {t(
                    "نتیجه پرداخت در حال بررسی است. دوباره پرداخت نکنید.",
                    "Your payment result is being checked. Do not pay again.",
                  )}
                </p>
              </div>
            )}
            <article
              className="receipt-document"
              aria-label={t(
                "سند تاریخی سفارش، نمونه",
                "Historical order document, demo",
              )}
            >
              <header className="receipt-doc-header">
                <div className="receipt-doc-brand">
                  <span>
                    nilart<span>.</span>
                  </span>
                  <small>ART IN EVERYDAY LIFE</small>
                </div>
                <div className="receipt-doc-type">
                  <span
                    className={`receipt-payment-badge ${
                      snapshot.payment === "verification" ? "verification" : ""
                    }`}
                  >
                    <Glyph
                      name={
                        snapshot.payment === "confirmed" ? "check" : "clock"
                      }
                      size={16}
                    />
                    {snapshot.payment === "confirmed"
                      ? t("پرداخت تأییدشده · Demo", "Payment confirmed · Demo")
                      : t(
                          "پرداخت در حال بررسی · Demo",
                          "Payment under verification · Demo",
                        )}
                  </span>
                  <p>
                    {snapshot.payment === "confirmed"
                      ? t("رسید فروشگاه", "Store receipt")
                      : t(
                          "خلاصه سفارش · پرداخت تأیید نشده",
                          "Order summary · Payment unconfirmed",
                        )}
                  </p>
                  <small>
                    {t(
                      "این سند فاکتور رسمی مالیاتی نیست.",
                      "This is not an official tax invoice.",
                    )}
                  </small>
                </div>
              </header>
              <dl className="receipt-metadata">
                <div>
                  <dt>{t("شماره سفارش", "Order number")}</dt>
                  <dd>{identifier(orderId)}</dd>
                </div>
                <div>
                  <dt>
                    {snapshot.payment === "confirmed"
                      ? t("شماره رسید", "Receipt number")
                      : t("شماره رسید", "Receipt number")}
                  </dt>
                  <dd>
                    {snapshot.payment === "confirmed"
                      ? identifier("RC-1404-0818")
                      : t("صادر نشده", "Not issued")}
                  </dd>
                </div>
                <div>
                  <dt>{t("تاریخ ثبت سفارش", "Order date")}</dt>
                  <dd>{date}</dd>
                </div>
                <div>
                  <dt>{t("تاریخ صدور", "Issue date")}</dt>
                  <dd>{snapshot.payment === "confirmed" ? date : "—"}</dd>
                </div>
                <div>
                  <dt>{t("واحد پول", "Currency")}</dt>
                  <dd>
                    {t("تومان", "Iranian toman")} <bdi>(IRT)</bdi>
                  </dd>
                </div>
              </dl>
              <section className="receipt-parties">
                <div>
                  <span className="receipt-small-label">
                    {t("فروشگاه", "Sold by")}
                  </span>
                  <h2>{t("نیل‌آرت", "Nilart")}</h2>
                  <p>{t("هنر، در لحظه‌های روزمره", "Art in everyday life")}</p>
                  <a
                    className="text-link receipt-no-print"
                    href={`${prefix}/account/support?order=${orderId}`}
                    onClick={follow(
                      `${prefix}/account/support?order=${orderId}`,
                    )}
                  >
                    {t("ارتباط با پشتیبانی فروشگاه", "Contact store support")}
                    <Glyph name="arrow" size={15} />
                  </a>
                  <small>
                    {t(
                      "اطلاعات تماس و شناسه قانونی تأییدشده ارائه نشده است.",
                      "Verified contact and legal identifiers have not been provided.",
                    )}
                  </small>
                </div>
                <div>
                  <span className="receipt-small-label">
                    {t(
                      "خریدار · اطلاعات ثبت‌شده در سفارش",
                      "Buyer · Order snapshot",
                    )}
                  </span>
                  <h2>{t("سارا احمدی · Demo", "Sara Ahmadi · Demo")}</h2>
                  <p>
                    {t(
                      "اطلاعات تاریخی این سفارش؛ مستقل از پروفایل فعلی.",
                      "Historical order details, independent of the current profile.",
                    )}
                  </p>
                  {!snapshot.digital && (
                    <div className="receipt-recipient">
                      <strong>
                        {t(
                          "گیرنده: مینا احمدی · Demo",
                          "Recipient: Mina Ahmadi · Demo",
                        )}
                      </strong>
                      <p>
                        {t(
                          "تهران، خیابان نمونه، پلاک ۱۲ · آدرس نمونه",
                          "Tehran, Sample Street, No. 12 · Demo address",
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </section>
              <section className="receipt-items">
                <div className="receipt-section-title">
                  <h2>{t("اقلام سفارش", "Order items")}</h2>
                  <span>
                    {snapshot.lines.length.toLocaleString(en ? "en" : "fa")}{" "}
                    {t("قلم", "lines")}
                  </span>
                </div>
                <table className="receipt-table">
                  <caption className="sr-only">
                    {t(
                      "قیمت‌ها، گزینه‌ها و تخفیف‌های تاریخی اقلام",
                      "Historical line prices, options and discounts",
                    )}
                  </caption>
                  <thead>
                    <tr>
                      {[
                        t("شرح قلم", "Item"),
                        t("گزینه‌ها", "Options"),
                        t("تعداد واحد", "Quantity"),
                        t("قیمت واحد", "Unit price"),
                        t("تخفیف تخصیص‌یافته", "Allocated discount"),
                        t("مبلغ خالص قلم", "Net line amount"),
                      ].map((label) => (
                        <th scope="col" key={label}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.lines.map((line) => (
                      <tr key={line.id}>
                        <th scope="row" data-label={t("شرح قلم", "Item")}>
                          <strong>{line.title[en ? 1 : 0]}</strong>
                          {line.components && (
                            <button
                              className="receipt-expand receipt-no-print"
                              aria-expanded={expanded}
                              aria-controls="bundle-components"
                              onClick={() => setExpanded(!expanded)}
                            >
                              {t("اجزای پکیج", "Bundle components")}
                              <span>{expanded ? "−" : "+"}</span>
                            </button>
                          )}
                        </th>
                        <td
                          data-label={t("گزینه‌ها", "Options")}
                          className="receipt-options"
                        >
                          {line.options[en ? 1 : 0]}
                        </td>
                        <td data-label={t("تعداد واحد", "Quantity")}>
                          {line.quantity.toLocaleString(en ? "en" : "fa")}
                        </td>
                        <td data-label={t("قیمت واحد", "Unit price")}>
                          {amount(line.unitPrice)}
                        </td>
                        <td data-label={t("تخفیف", "Discount")}>
                          {line.bundleDiscount + line.codeDiscount
                            ? amount(line.bundleDiscount + line.codeDiscount)
                            : "—"}
                        </td>
                        <td
                          data-label={t("مبلغ قلم", "Line amount")}
                          className="receipt-line-total"
                        >
                          {amount(
                            line.unitPrice * line.quantity -
                              line.bundleDiscount -
                              line.codeDiscount,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {snapshot.lines.some((line) => line.components) && (
                  <div
                    id="bundle-components"
                    className={`receipt-components ${
                      expanded ? "is-open" : ""
                    }`}
                  >
                    <h3>
                      {t(
                        "اجزای خریداری‌شده پکیج",
                        "Purchased bundle components",
                      )}
                    </h3>
                    <p>
                      {t(
                        "زیرردیف‌های پکیج‌اند؛ دوباره به جمع سفارش اضافه نمی‌شوند.",
                        "These are bundle sub-lines, not additional order charges.",
                      )}
                    </p>
                    {snapshot.lines
                      .find((line) => line.components)!
                      .components!.map((component, i) => (
                        <div className="receipt-component" key={i}>
                          <div>
                            <strong>{component.title[en ? 1 : 0]}</strong>
                            <span>
                              {t("تعداد", "Quantity")}:{" "}
                              {component.quantity.toLocaleString(
                                en ? "en" : "fa",
                              )}
                            </span>
                          </div>
                          <div>
                            <span>
                              {t("جمع قبل از تخفیف", "Before discounts")}
                            </span>
                            {amount(component.price * component.quantity)}
                          </div>
                          <div>
                            <span>
                              {t("تخفیف تخصیص‌یافته", "Allocated discount")}
                            </span>
                            {amount(component.discount)}
                          </div>
                          <div>
                            <span>
                              {t("سهم پرداختی تاریخی", "Historical paid share")}
                            </span>
                            {amount(
                              component.price * component.quantity -
                                component.discount,
                            )}
                          </div>
                        </div>
                      ))}
                    <div className="receipt-component-note">
                      {t(
                        "تخفیف پکیج: ۸۰٬۰۰۰ تومان • کد مجاز ART10: ۷۲٬۰۰۰ تومان • مبلغ خالص: ۶۴۸٬۰۰۰ تومان",
                        "Bundle discount: 80,000 IRT • Eligible ART10 code: 72,000 IRT • Net: 648,000 IRT",
                      )}
                    </div>
                  </div>
                )}
              </section>
              {mode === "commission" && (
                <section className="receipt-commission">
                  <div className="receipt-section-title">
                    <h2>
                      {t("جزئیات قیمت نقاشی", "Commission price details")}
                    </h2>
                    <bdi>Q-1042-V2 · Demo</bdi>
                  </div>
                  <p>
                    {t(
                      "بر پایه نسخه پذیرفته‌شده پیشنهاد؛ ضریب با تحلیل جدید تغییر نمی‌کند.",
                      "Based on the accepted proposal; new analysis does not change this factor.",
                    )}
                  </p>
                  <dl>
                    {[
                      [
                        t("قیمت پایه سایز A3", "A3 base size price"),
                        amount(2000000),
                      ],
                      [
                        t("ضریب سختی تأییدشده", "Approved difficulty factor"),
                        <bdi>1.5×</bdi>,
                      ],
                      [
                        t("هزینه پایه پیچیدگی", "Base complexity cost"),
                        amount(1200000),
                      ],
                      [
                        t(
                          "مبلغ پیچیدگی (۱٫۵ × ۱٬۲۰۰٬۰۰۰)",
                          "Complexity amount (1.5 × 1,200,000)",
                        ),
                        amount(1800000),
                      ],
                      [
                        t("هزینه نوع اجرا", "Execution style cost"),
                        amount(600000),
                      ],
                    ].map(([label, value], i) => (
                      <div key={i}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="receipt-formula">
                    <span>
                      {t(
                        "قیمت اثر = پایه سایز + (ضریب × پایه پیچیدگی) + نوع اجرا",
                        "Artwork price = size base + (factor × complexity base) + execution style",
                      )}
                    </span>
                    <strong>{amount(4400000)}</strong>
                  </div>
                  <small>
                    {t(
                      "دلیل عمومی ثبت‌شده · Demo: وجود ۳ چهره در تصویر. این زیرردیف‌ها در جمع کل دوباره محاسبه نمی‌شوند.",
                      "Recorded public reason · Demo: 3 faces in the reference. These sub-lines are not counted again in the total.",
                    )}
                  </small>
                </section>
              )}
              <div className="receipt-financial-grid">
                <section className="receipt-payment">
                  <h2>{t("اطلاعات پرداخت", "Payment information")}</h2>
                  <dl>
                    <div>
                      <dt>{t("وضعیت پرداخت", "Payment status")}</dt>
                      <dd
                        className={
                          snapshot.payment === "confirmed"
                            ? "receipt-success"
                            : ""
                        }
                      >
                        {snapshot.payment === "confirmed"
                          ? t("تأییدشده · Demo", "Confirmed · Demo")
                          : t(
                              "در حال بررسی · Demo",
                              "Under verification · Demo",
                            )}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("روش پرداخت", "Payment method")}</dt>
                      <dd>
                        {t("درگاه آنلاین · نمونه", "Online gateway · Demo")}
                      </dd>
                    </div>
                    {snapshot.payment === "confirmed" && (
                      <>
                        <div>
                          <dt>{t("زمان تأیید", "Confirmed at")}</dt>
                          <dd>
                            {date}
                            <br />
                            <bdi>11:42 (Asia/Tehran)</bdi>
                          </dd>
                        </div>
                        <div>
                          <dt>{t("مبلغ تأییدشده", "Confirmed amount")}</dt>
                          <dd>{amount(snapshot.total)}</dd>
                        </div>
                        <div>
                          <dt>
                            {t("شناسه عمومی تراکنش", "Public transaction ID")}
                          </dt>
                          <dd>{identifier("TX-814026")}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  <p className="receipt-payment-note">
                    <Glyph name="shield" size={17} />
                    {t(
                      "تأیید پرداخت به معنی ارسال یا تحویل سفارش نیست.",
                      "Payment confirmation does not mean dispatch or delivery.",
                    )}
                  </p>
                </section>
                <section
                  className="receipt-summary"
                  aria-label={t("جمع مبالغ سفارش", "Order totals")}
                >
                  <h2>{t("خلاصه مبالغ", "Price summary")}</h2>
                  <dl>
                    <div>
                      <dt>{t("جمع اقلام", "Items subtotal")}</dt>
                      <dd>{amount(snapshot.subtotal)}</dd>
                    </div>
                    {snapshot.bundleDiscount > 0 && (
                      <div className="receipt-discount">
                        <dt>{t("تخفیف پکیج", "Bundle discount")}</dt>
                        <dd>− {amount(snapshot.bundleDiscount)}</dd>
                      </div>
                    )}
                    {snapshot.codeDiscount > 0 && (
                      <div className="receipt-discount">
                        <dt>
                          {t("کد تخفیف", "Discount code")} <bdi>ART10</bdi>
                        </dt>
                        <dd>− {amount(snapshot.codeDiscount)}</dd>
                      </div>
                    )}
                    <div className="receipt-net">
                      <dt>{t("جمع خالص اقلام", "Net items subtotal")}</dt>
                      <dd>{amount(snapshot.net)}</dd>
                    </div>
                    {!snapshot.digital && (
                      <>
                        <div>
                          <dt>{t("بسته‌بندی سفارش", "Order packaging")}</dt>
                          <dd>{amount(snapshot.packaging)}</dd>
                        </div>
                        <div>
                          <dt>{t("ارسال", "Shipping")}</dt>
                          <dd>{amount(snapshot.shipping)}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  <div className="receipt-grand-total">
                    <span>{t("مبلغ نهایی سفارش", "Order total")}</span>
                    <strong>{amount(snapshot.total)}</strong>
                  </div>
                  <p>
                    {snapshot.digital
                      ? t(
                          "تحویل دیجیتال؛ هزینه بسته‌بندی و ارسال ندارد.",
                          "Digital delivery; no packaging or shipping charge.",
                        )
                      : t(
                          "مبلغ تاریخی ثبت‌شده سفارش؛ مستقل از قیمت روز.",
                          "Historical order total, independent of today’s prices.",
                        )}
                  </p>
                </section>
              </div>
              {mode === "refund" && (
                <section className="receipt-refunds">
                  <div className="receipt-section-title">
                    <h2>{t("بازپرداخت‌های مرتبط", "Related refunds")}</h2>
                    <span>Demo</span>
                  </div>
                  <p>
                    {t(
                      "سند اصلی و پرداخت اولیه حفظ شده‌اند. فقط مبلغ تکمیل‌شده، وجه بازگشت‌داده‌شده محسوب می‌شود.",
                      "The original receipt and initial payment remain unchanged. Only completed refunds count as returned funds.",
                    )}
                  </p>
                  <div className="receipt-refund-row">
                    <div>
                      {identifier("RF-2041")}
                      <p>
                        {t(
                          "۱ واحد دفتر لحظه‌های آرام · سهم پرداختی تاریخی",
                          "1 Quiet moments notebook · Historical paid share",
                        )}
                      </p>
                      <time>{t("۲۴ خرداد ۱۴۰۴", "14 June 2025")}</time>
                    </div>
                    <span className="receipt-payment-badge">
                      <Glyph name="check" size={16} />
                      {t("تکمیل‌شده · Demo", "Completed · Demo")}
                    </span>
                    {amount(snapshot.refunded)}
                  </div>
                  <div className="receipt-refund-row">
                    <div>
                      {identifier("RF-2042")}
                      <p>
                        {t(
                          "۱ واحد دفتر باقی‌مانده · سهم پرداختی تاریخی",
                          "1 remaining notebook · Historical paid share",
                        )}
                      </p>
                      <time>{t("۲۵ خرداد ۱۴۰۴", "15 June 2025")}</time>
                    </div>
                    <span className="receipt-neutral-badge">
                      {t("در حال انجام · Demo", "Processing · Demo")}
                    </span>
                    {amount(346500)}
                  </div>
                  <div className="receipt-returned">
                    <strong>{t("وجه بازگشت‌داده‌شده", "Funds returned")}</strong>
                    {amount(snapshot.refunded)}
                  </div>
                </section>
              )}
              <footer className="receipt-doc-footer">
                <Glyph name="paint" size={20} />
                <span>
                  {t(
                    "با حوصله ساخته شده، برای شما.",
                    "Thoughtfully made, just for you.",
                  )}
                </span>
                <small>
                  {t(
                    "سند فروشگاه · غیررسمی مالیاتی · Demo",
                    "Store document · Not a tax invoice · Demo",
                  )}
                </small>
              </footer>
            </article>
            <section className="receipt-help receipt-no-print">
              <span className="receipt-help-icon">
                <Glyph name="chat" size={23} />
              </span>
              <div>
                <h2>
                  {t(
                    "درباره این رسید پرسشی دارید؟",
                    "A question about your receipt?",
                  )}
                </h2>
                <p>
                  {t(
                    "پشتیبانی، با ارجاع همین سفارش، همراه شماست.",
                    "Our support team can help with this order reference.",
                  )}
                </p>
              </div>
              <a
                className="text-link"
                href={`${prefix}/account/support?order=${orderId}&topic=receipt`}
                onClick={follow(
                  `${prefix}/account/support?order=${orderId}&topic=receipt`,
                )}
              >
                {t("پرسش درباره این رسید", "Ask about this receipt")}
                <Glyph name="arrow" size={16} />
              </a>
            </section>
            <p className="receipt-pdf-note receipt-no-print">
              {t(
                "PDF فعال نیست؛ فایل معتبر و سرویس دانلود خصوصی متصل نشده است. از چاپ مرورگر استفاده کنید.",
                "PDF is not enabled: no verified file or private download service is connected. Use browser printing.",
              )}
            </p>
          </>
        )}
        <details className="receipt-preview dash-preview receipt-no-print">
          <summary>
            {t("حالت‌های پیش‌نمایش", "Preview states")} <bdi>USER-04 · Demo</bdi>
          </summary>
          <div>
            {previews.map(([value, fa, english]) => (
              <button
                key={value}
                aria-pressed={view === value}
                onClick={() => {
                  setView(value)
                  setLive("")
                  setExpanded(false)
                }}
              >
                {en ? english : fa}
              </button>
            ))}
            <a
              href={`${prefix}/auth/session-expired?returnTo=${encodeURIComponent(page)}`}
              onClick={follow(
                `${prefix}/auth/session-expired?returnTo=${encodeURIComponent(page)}`,
              )}
            >
              {t("نشست منقضی", "Session expired")}
            </a>
          </div>
        </details>
        <dialog
          ref={dialog}
          className="receipt-destination modal receipt-no-print"
          aria-labelledby="receipt-destination-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <div className="modal-head">
            <h2 id="receipt-destination-title">
              {t("مقصد مستقل پروتوتایپ", "Independent prototype destination")}
            </h2>
            <button
              className="icon-button"
              aria-label={t("بستن", "Close")}
              onClick={close}
            >
              <Glyph name="close" />
            </button>
          </div>
          <p>
            {t(
              "این مقصد در این مرحله بازطراحی نشده است؛ هیچ درخواست پشتیبانی یا اقدام مالی ثبت نشده است.",
              "This destination has not been redesigned here; no support request or financial operation has been submitted.",
            )}
          </p>
          <code dir="ltr">{destination}</code>
          <button className="button secondary" onClick={close}>
            {t("بازگشت به رسید", "Back to receipt")}
          </button>
        </dialog>
      </div>
    </DashboardPage>
  )
}
