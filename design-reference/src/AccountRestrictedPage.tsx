import { useEffect, useRef, useState, type MouseEvent } from "react"
import { AuthIcon } from "./AuthPage"

type Mode = "unavailable" | "loading" | "network" | "server" | "expired" | "temporary" | "reviewNeeded" | "purchase" | "broad" | "underReview" | "lifted"
const previews: [Mode, string, string][] = [
  ["unavailable", "وضعیت نامعتبر", "Unavailable status"], ["loading", "بررسی دسترسی", "Loading"],
  ["temporary", "محدودیت موقت Demo", "Demo temporary restriction"], ["reviewNeeded", "نیازمند بررسی", "Needs review"],
  ["purchase", "فقط خرید", "Purchasing only"], ["broad", "محدودیت گسترده", "Broad restriction"],
  ["underReview", "درخواست قبلی Demo", "Demo existing review"], ["network", "خطای شبکه", "Network error"],
  ["server", "خطای سرور", "Server error"], ["expired", "نشست منقضی", "Expired session"],
  ["lifted", "رفع محدودیت Demo", "Demo restriction lifted"],
]

export default function AccountRestrictedPage({ en, navigate, target }: {
  en: boolean; navigate: (route: string) => void; target: string | null
}) {
  const t = (fa: string, english: string) => en ? english : fa
  const prefix = en ? "/en" : "/fa"
  // No account data is inferred from the URL. All authorized-looking states below are explicit design fixtures.
  const [mode, setMode] = useState<Mode>("unavailable")
  const [open, setOpen] = useState(false)
  const [inline, setInline] = useState(false)
  const [paymentUnknown, setPaymentUnknown] = useState(false)
  const [result, setResult] = useState<"network" | "unchanged" | "lifted">("network")
  const [busy, setBusy] = useState(false)
  const [checkError, setCheckError] = useState(false)
  const [checked, setChecked] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const modalHeading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const safeButton = useRef<HTMLButtonElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lock = useRef(false)
  const suffix = target ? `?returnTo=${encodeURIComponent(target)}` : ""
  const authorizedDemo = ["temporary", "reviewNeeded", "purchase", "broad", "underReview", "lifted"].includes(mode)
  const purchaseOnly = mode === "purchase" || mode === "temporary" || mode === "lifted"
  const title = mode === "unavailable" ? t("امکان نمایش وضعیت حساب وجود ندارد.", "Account status cannot be displayed.")
    : mode === "loading" ? t("در حال بررسی وضعیت دسترسی…", "Checking access status…")
    : mode === "network" ? t("دریافت وضعیت حساب ممکن نشد.", "Unable to load account status.")
    : mode === "server" ? t("وضعیت حساب موقتاً در دسترس نیست", "Account status is temporarily unavailable")
    : mode === "expired" ? t("برای ادامه، دوباره وارد شوید", "Sign in again to continue")
    : mode === "lifted" ? t("محدودیت اعلام‌شده رفع شده است · Demo", "The reported restriction has been lifted · Demo")
    : purchaseOnly ? t("خرید با این حساب در حال حاضر محدود است", "Purchasing with this account is currently restricted")
    : t("دسترسی این حساب محدود شده است", "This account’s access is restricted")
  const description = mode === "unavailable" ? t("برای نمایش وضعیت، پاسخ معتبر و مجاز سرویس لازم است. هیچ اطلاعات حسابی از این مسیر دریافت نمی‌شود.", "Displaying account status requires a valid, authorized service response. This URL reveals no account information.")
    : mode === "network" ? t("قطع ارتباط به معنی محدود یا مسدودشدن حساب نیست. دوباره تلاش کنید.", "A connection failure does not mean your account is restricted or blocked. Try again.")
    : mode === "server" ? t("سرویس فعلاً پاسخ نمی‌دهد؛ محدودیت تازه یا پایان نشست از این خطا نتیجه‌گیری نمی‌شود.", "The service is temporarily unavailable; this does not imply a new restriction or session expiry.")
    : mode === "loading" ? t("تا دریافت پاسخ، علت یا زمان محدودیت نمایش داده نمی‌شود.", "No restriction reason or end time is shown while waiting for a response.")
    : mode === "expired" ? t("نشست شما پایان یافته است؛ این وضعیت محدودیت حساب را تأیید نمی‌کند.", "Your session has expired; this does not confirm an account restriction.")
    : mode === "lifted" ? t("Demo: فقط محدودیت خرید در پاسخ نمونه رفع شده است؛ مجوز نقش‌ها تغییر نکرده و رفع واقعی انجام نشده است. ادامه نیازمند نشست و مجوز معتبر است.", "Demo: only the purchasing restriction was lifted in the sample response; role permissions are unchanged and no real restriction was removed. Continuing requires a valid session and permissions.")
    : t("بعضی از امکانات در حال حاضر در دسترس نیستند. برای اطلاع از اقدام بعدی، راهنمای زیر را بررسی کنید.", "Some features are currently unavailable. Review the guidance below for your next step.")
  useEffect(() => {
    document.documentElement.lang = en ? "en" : "fa"
    document.documentElement.dir = en ? "ltr" : "rtl"
    document.title = `${title} | Nilart`
    if (!open) heading.current?.focus({ preventScroll: true })
  }, [en, mode, title])
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) { dialog.current.showModal(); modalHeading.current?.focus() }
    else if (!open && dialog.current?.open) dialog.current.close()
  }, [open])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const close = () => { setOpen(false); requestAnimationFrame(() => safeButton.current?.focus()) }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault(); setOpen(false); navigate(route)
  }
  const preview = (next: Mode) => {
    if (timer.current) clearTimeout(timer.current)
    lock.current = false; setBusy(false); setCheckError(false); setChecked(false); setMode(next); setInline(false)
  }
  const check = () => {
    if (lock.current || busy) return
    lock.current = true; setBusy(true); setCheckError(false); setChecked(false)
    // Explicit Demo outcomes; no server check, permissions or account-state mutation.
    timer.current = setTimeout(() => {
      lock.current = false; setBusy(false)
      if (result === "network") { if (authorizedDemo) setCheckError(true); else setMode("network") }
      else if (authorizedDemo) { if (result === "lifted") setMode("lifted"); else setChecked(true) }
      else setMode("unavailable")
    }, 700)
  }
  const time = (iso: string) => new Intl.DateTimeFormat(en ? "en-GB" : "fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso))
  const link = (label: string, route: string, className = "text-link") => <a className={className} href={route} onClick={follow(route)}>{label}</a>
  const content = (modal: boolean) => <div className="restriction-content">
    <div className="session-symbol" aria-hidden="true"><AuthIcon kind="notice" /></div>
    <div className="auth-eyebrow">NILART · AUTH-10</div>
    {modal ? <h2 ref={modalHeading} tabIndex={-1} id="restriction-dialog-title">{title}</h2> : <h1 ref={heading} tabIndex={-1} id="restriction-title">{title}</h1>}
    <p className="auth-intro" id={modal ? "restriction-dialog-description" : "restriction-description"}>{description}</p>
    <div className="password-demo session-demo"><span>Demo</span>{t("سرویس وضعیت حساب متصل نیست؛ وضعیت‌ها فقط نمونه طراحی‌اند.", "Account-status service is not connected; all states are design fixtures.")}</div>
    {mode === "loading" ? <div className="auth-loading" role="status"><div className="auth-skeleton" /><p>{t("در حال بررسی وضعیت دسترسی…", "Checking access status…")}</p></div> : <>
      {authorizedDemo && mode !== "lifted" && <>
        <section className="restriction-scope" aria-labelledby={modal ? "restriction-modal-scope" : "restriction-scope"}><h3 id={modal ? "restriction-modal-scope" : "restriction-scope"}>{t("دامنه محدودیت · Demo", "Restriction scope · Demo")}</h3><p>{purchaseOnly ? t("ثبت خرید جدید در نمونه مجاز نیست. مرور فروشگاه و سفارش‌های مجاز همچنان قابل دسترسی‌اند.", "New purchases are not permitted in the preview. Public browsing and authorized existing orders remain available.") : mode === "broad" ? t("دسترسی بخش‌های خصوصی حساب در نمونه محدود است؛ فروشگاه عمومی و تماس با پشتیبانی در دسترس‌اند.", "Private account sections are restricted in the preview; public browsing and support remain available.") : t("برخی امکانات خصوصی نیازمند بررسی‌اند؛ دامنه مجاز باید از پاسخ سرویس دریافت شود.", "Some private features require review; permitted scope must come from the service response.")}</p></section>
        {mode === "temporary" && <div className="restriction-date"><span>{t("زمان اعلام‌شده پایان محدودیت · Demo", "Reported restriction end time · Demo")}</span><time dateTime="2030-04-12T12:00:00Z">{time("2030-04-12T12:00:00Z")} <bdi dir="ltr">UTC (+00:00)</bdi></time><small>{t("تاریخ ثابتِ نمونه، نه داده واقعی سرویس. رسیدن به این زمان دسترسی را باز نمی‌کند؛ وضعیت باید دوباره بررسی شود.", "Fixed sample date, not live service data. Reaching this time does not unlock access; status must be checked again.")}</small></div>}
        {mode !== "temporary" && <p className="restriction-reason">{t("برای بررسی وضعیت حساب، با پشتیبانی تماس بگیرید.", "Contact support to review your account status.")}</p>}
        {mode === "underReview" && <section className="restriction-review" aria-labelledby={modal ? "modal-review-title" : "review-title"}><h3 id={modal ? "modal-review-title" : "review-title"}>{t("درخواست شما در حال بررسی است · Demo", "Your request is under review · Demo")}</h3><dl><div><dt>{t("شناسه عمومی نمونه", "Sample public reference")}</dt><dd dir="ltr">DEMO-REVIEW-001</dd></div><div><dt>{t("تاریخ ثبت نمونه", "Sample submission date")}</dt><dd>{time("2030-04-10T09:00:00Z")} <bdi>UTC</bdi></dd></div></dl><p>{t("نمونه درخواست قبلی است؛ درخواست واقعی ثبت نشده و زمان پاسخ یا نتیجه‌ای وعده داده نمی‌شود.", "Existing-request fixture; no real review was submitted and no response time or outcome is promised.")}</p></section>}
      </>}
      {checkError && <p className="restriction-feedback" role="alert">{t("دریافت وضعیت حساب ممکن نشد. آخرین وضعیت نمونه حفظ شده است؛ خطای شبکه محدودیت تازه نیست.", "Unable to load account status. The last sample status is retained; a network error is not a new restriction.")}</p>}
      {checked && <p className="restriction-feedback">{t("Demo: وضعیت اعلام‌شده تغییری نکرده است.", "Demo: the reported status is unchanged.")}</p>}
      <div className="session-actions">
        {mode === "network" || mode === "server" ? <button type="button" className="button primary" disabled={busy} onClick={check}>{busy ? t("در حال بررسی…", "Checking…") : t("تلاش دوباره", "Try again")}</button>
          : mode === "unavailable" || mode === "lifted" ? link(t("ورود به حساب", "Sign in"), `${prefix}/auth/login${suffix}`, "button primary")
          : mode === "expired" ? link(t("ادامه به راهنمای ورود مجدد", "Continue to sign-in guidance"), `${prefix}/auth/session-expired${suffix}`, "button primary")
          : mode === "temporary" ? <button type="button" className="button primary" disabled={busy} onClick={check}>{busy ? t("در حال بررسی…", "Checking…") : t("بررسی دوباره وضعیت", "Check status again")}</button>
          : link(t("تماس با پشتیبانی", "Contact support"), `${prefix}/contact`, "button primary")}
        {link(t("بازگشت به فروشگاه", "Back to shop"), "/", "button secondary")}
      </div>
      {authorizedDemo && mode !== "lifted" && <section className="restriction-orders"><h3>{t("سفارش‌ها و پرداخت‌های قبلی", "Existing orders and payments")}</h3><p>{t("برای پرسش درباره سفارش یا پرداخت قبلی، از مسیر پشتیبانی مرتبط استفاده کنید.", "For questions about an existing order or payment, use the relevant support channel.")}</p><small>{t("محدودیت حساب به معنی لغو سفارش یا انجام بازپرداخت نیست.", "Account restrictions do not mean orders are cancelled or refunded.")}</small>
        {paymentUnknown && <p className="restriction-payment">{t("پیش از پرداخت دوباره، وضعیت تراکنش را بررسی کنید.", "Check the transaction status before paying again.")}</p>}
        {purchaseOnly ? link(t("مشاهده سفارش‌های من", "View my orders"), "/account/orders") : link(t("پشتیبانی سفارش و پرداخت", "Order and payment support"), `${prefix}/contact`)}
        {purchaseOnly && <small>{t("Demo: فقط مقصد مستقل سفارش‌ها مشخص است؛ دسترسی واقعی باید از سرویس بررسی شود.", "Demo: separate orders destination only; actual access requires service permission checks.")}</small>}
      </section>}
      {authorizedDemo && <section className="restriction-available"><h3>{t("مسیرهای در دسترس · Demo", "Available routes · Demo")}</h3><ul><li>{t("مرور فروشگاه عمومی — نه مجوز خرید", "Public browsing — not permission to purchase")}</li><li>{t("تماس با پشتیبانی", "Contact support")}</li>{purchaseOnly && <li>{t("مشاهده سفارش‌ها فقط با مجوز مستقل", "View orders only with independent authorization")}</li>}</ul>{link(t("خروج از حساب", "Sign out"), `${prefix}/auth/logout${suffix}`)}<small>{t("مقصد AUTH-11 است؛ خروج یا حساب دیگر راه دورزدن محدودیت نیست. نشست این نمونه واقعی نیست.", "Destination: AUTH-11; sign-out or another account is not a restriction bypass. This preview has no real session.")}</small></section>}
      <p className="password-live" role="status" aria-live="polite">{busy ? t("Demo: در حال نمایش بررسی وضعیت؛ درخواست واقعی ارسال نمی‌شود.", "Demo: previewing a status check; no actual request is sent.") : ""}</p>
    </>}
  </div>
  return <div className="auth-shell" dir={en ? "ltr" : "rtl"}>
    <div className="session-public-shell" inert={open} aria-hidden={open || undefined}>
      <a className="skip-link" href="#restriction-title">{t("رفتن به محتوای اصلی", "Skip to content")}</a>
      <header className="auth-header"><a className="wordmark" href="/" onClick={follow("/")} aria-label={t("نیل‌آرت، صفحه اصلی", "Nilart home")}><span>nilart<span className="wordmark-dot">.</span></span><small>ART IN EVERYDAY LIFE</small></a><a className="auth-language" href={`${en ? "/fa" : "/en"}/auth/account-restricted${suffix}`} onClick={follow(`${en ? "/fa" : "/en"}/auth/account-restricted${suffix}`)}><AuthIcon kind="globe" />{en ? "فارسی" : "English"}</a></header>
      <main className="auth-main"><div className="auth-column restriction-column">
        {inline ? <section className="auth-card"><div className="session-symbol" aria-hidden="true"><AuthIcon kind="notice" /></div><h1 ref={heading} id="restriction-title" tabIndex={-1}>{t("خرید جدید در دسترس نیست · Demo", "New purchases are unavailable · Demo")}</h1><p className="auth-intro">{t("بستن پنجره محدودیت را رفع نمی‌کند. هیچ داده خصوصی پشت آن نمایش داده نشده است.", "Closing the dialog does not lift the restriction. No private information was displayed behind it.")}</p><button className="button primary session-reopen" type="button" disabled>{t("ادامه خرید — محدود", "Continue purchase — restricted")}</button><button ref={safeButton} className="button secondary session-reopen" type="button" onClick={() => setOpen(true)}>{t("مشاهده راهنمای محدودیت", "View restriction guidance")}</button></section>
          : <section className="auth-card restriction-card" aria-labelledby="restriction-title">{content(false)}</section>}
      </div></main>
      <footer className="auth-footer"><span>{t("نیل‌آرت؛ هنر در لحظه‌های روزمره", "Nilart. Art in everyday life.")}</span><nav aria-label={t("لینک‌های راهنما", "Helpful links")}>{link(t("تماس", "Contact"), `${prefix}/contact`)}{link(t("حریم خصوصی", "Privacy policy"), `${prefix}/privacy`)}</nav></footer>
      <details className="auth-preview"><summary>{t("حالت‌های پیش‌نمایش", "Preview states")} <span>AUTH-10 · Demo</span></summary><p>{t("بدون سرویس واقعی؛ تاریخ، شناسه و مجوزها صرفاً داده نمونه‌اند. قابلیت ثبت درخواست بررسی اضافه نشده است.", "No live service; dates, references and permissions are fixtures. No review-submission capability has been added.")}</p><div>{previews.map(([value, fa, english]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => preview(value)}>{en ? english : fa}</button>)}<button type="button" onClick={() => { preview("purchase"); setInline(true); setOpen(true) }}>{t("Modal / Bottom sheet خرید", "Purchase modal / bottom sheet")}</button><button type="button" onClick={() => setPaymentUnknown(!paymentUnknown)} aria-pressed={paymentUnknown}>{t("پرداخت نامشخص Demo", "Demo unknown payment")}</button></div><label className="registration-outcome">{t("نتیجه نمونه بررسی وضعیت", "Simulated status-check result")}<select value={result} onChange={(event) => setResult(event.target.value as typeof result)}><option value="network">{t("خطای شبکه", "Network error")}</option><option value="unchanged">{t("بدون تغییر — Demo", "Unchanged — Demo")}</option><option value="lifted">{t("رفع محدودیت خرید — Demo", "Purchasing restriction lifted — Demo")}</option></select></label><div><button type="button" disabled={busy || mode === "loading"} onClick={check}>{t("اجرای بررسی نمونه", "Run Demo check")}</button></div></details>
    </div>
    <dialog ref={dialog} className="session-dialog restriction-dialog" aria-labelledby="restriction-dialog-title" aria-describedby="restriction-dialog-description" onCancel={(event) => { event.preventDefault(); close() }}><div className="session-sheet-handle" aria-hidden="true" /><button type="button" className="session-close" onClick={close}>{t("بستن پنجره", "Close dialog")}</button>{content(true)}</dialog>
  </div>
}
