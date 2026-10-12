import { useEffect, useRef, useState, type MouseEvent } from "react"
import { AuthIcon } from "./AuthPage"

type Access = "expired" | "checking" | "network" | "server" | "denied" | "restricted" | "returned" | "differentAccount"
type Context = "general" | "checkout" | "payment" | "savedDraft" | "unsaved" | "upload" | "analysis"
const contexts: [Context, string, string][] = [
  ["general", "بدون مقصد", "No destination"], ["checkout", "خرید و سبد Demo", "Demo cart"],
  ["payment", "پرداخت نامشخص", "Unknown payment"], ["savedDraft", "پیش‌نویس ذخیره‌شده Demo", "Demo saved draft"],
  ["unsaved", "تغییرات ذخیره‌نشده", "Unsaved changes"], ["upload", "آپلود در حال انجام", "Upload in progress"],
  ["analysis", "تحلیل AI در حال انجام", "AI analysis in progress"],
]
const accesses: [Access, string, string][] = [
  ["expired", "نشست منقضی Demo", "Demo expired session"], ["checking", "بررسی دسترسی", "Checking access"],
  ["network", "خطای شبکه", "Network error"], ["server", "خطای سرور", "Server error"],
  ["denied", "عدم مجوز", "Access denied"], ["restricted", "حساب محدود", "Restricted account"],
  ["returned", "بازگشت مجاز Demo", "Demo authorized return"], ["differentAccount", "حساب متفاوت", "Different account"],
]

export default function SessionExpiredPage({ en, navigate, target }: {
  en: boolean; navigate: (route: string) => void; target: string | null
}) {
  const t = (fa: string, english: string) => en ? english : fa
  const prefix = en ? "/en" : "/fa"
  const [access, setAccess] = useState<Access>("expired")
  const [context, setContext] = useState<Context>(target?.includes("checkout") || target === "/cart" ? "checkout" : "general")
  const [demoTarget, setDemoTarget] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [interrupted, setInterrupted] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [safeReturn, setSafeReturn] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const modalHeading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const safeControl = useRef<HTMLButtonElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const destination = target || demoTarget
  const suffix = destination ? `?returnTo=${encodeURIComponent(destination)}` : ""
  const loginRoute = `${prefix}/auth/login${suffix}`
  const title = access === "checking" ? t("در حال بررسی دسترسی…", "Checking access…")
    : access === "network" ? t("ارتباط برقرار نشد", "Unable to connect")
    : access === "server" ? t("دسترسی موقتاً قابل بررسی نیست", "Access cannot be checked right now")
    : access === "denied" || access === "differentAccount" ? t("دسترسی به این مقصد مجاز نیست", "This destination is not permitted")
    : access === "restricted" ? t("حساب نیازمند بررسی است", "Your account needs review")
    : access === "returned" ? t("بازگشت مجاز · Demo", "Authorized return · Demo")
    : t("برای ادامه، دوباره وارد شوید", "Sign in again to continue")
  const description = access === "checking" ? t("اطلاعات خصوصی تا تأیید دسترسی نمایش داده نمی‌شوند.", "Private information remains hidden until access is confirmed.")
    : access === "network" ? t("بررسی وضعیت نشست ممکن نشد. خطای شبکه به معنی پایان نشست نیست؛ دوباره ارتباط را بررسی کنید.", "Unable to check session status. A network error does not mean your session expired; check the connection again.")
    : access === "server" ? t("بررسی دسترسی در حال حاضر ممکن نیست. خطای سرور باعث خروج خودکار شما نمی‌شود.", "Access cannot be checked right now. A server error does not automatically sign you out.")
    : access === "differentAccount" ? t("Demo: حساب متفاوت اجازه مشاهده داده حساب قبلی را ندارد. ورود موفق به‌تنهایی مجوز مقصد نیست.", "Demo: a different account cannot access the previous account’s data. Sign-in alone does not authorize this destination.")
    : access === "denied" ? t("ورود مجدد لزوماً محدودیت دسترسی را رفع نمی‌کند. به بخش عمومی برگردید یا با پشتیبانی تماس بگیرید.", "Signing in again may not resolve access restrictions. Return to the public shop or contact support.")
    : access === "restricted" ? t("این وضعیت از پایان نشست جداست. مسیر حساب محدود در AUTH-10 بررسی می‌شود.", "This is separate from session expiry. Restricted accounts are handled in AUTH-10.")
    : access === "returned" ? t("Demo: نشست و مجوز مقصد در نمونه تأیید شدند؛ نشست واقعی ایجاد نشده و هیچ عملیات قبلی اجرا نشده است.", "Demo: session and destination permission checks passed in the preview; no real session exists and no previous operation was executed.")
    : t("نشست شما پایان یافته است. برای دسترسی به این بخش، ورود مجدد لازم است.", "Your session has expired. Sign in again to access this section.")
  const destinationName = destination?.includes("checkout") || destination === "/cart" ? t("ادامه خرید", "Your purchase")
    : destination?.includes("commissions") ? t("ادامه درخواست نقاشی", "Your commission request")
    : destination?.startsWith("/products/") ? t("صفحه محصول", "Product page")
    : t("حساب کاربری", "Your account")
  useEffect(() => {
    document.documentElement.lang = en ? "en" : "fa"
    document.documentElement.dir = en ? "ltr" : "rtl"
    document.title = `${title} | Nilart`
    if (!open) heading.current?.focus({ preventScroll: true })
  }, [en, access, title, safeReturn])
  useEffect(() => {
    const node = dialog.current
    if (open && node && !node.open) { node.showModal(); modalHeading.current?.focus() }
    else if (!open && node?.open) node.close()
  }, [open])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => { if (access !== "returned") setSafeReturn(false) }, [access])
  const close = () => { setOpen(false); requestAnimationFrame(() => safeControl.current?.focus()) }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    setOpen(false)
    navigate(route)
  }
  const retry = () => {
    if (access === "checking") return
    setAccess("checking")
    // No service exists: checking cannot manufacture an expired or valid session.
    timer.current = setTimeout(() => setAccess("network"), 700)
  }
  const chooseContext = (value: Context) => {
    setContext(value); setReviewed(false)
    setDemoTarget(value === "checkout" || value === "payment" ? "/checkout" : value === "general" ? null : `${prefix}/commissions/new`)
  }
  const notes = () => <>
    {(context === "checkout" || context === "payment") && <div className="session-note"><AuthIcon kind="notice" /><div><p>{t("برای ادامه خرید، دوباره وارد شوید.", "Sign in again to continue your purchase.")}</p><small>{t("Demo: سبد در جابه‌جایی صفحات این برنامه حفظ می‌شود؛ ادغام، قیمت، موجودی و رزرو پس از ورود نیازمند بررسی سرویس‌اند.", "Demo: this app retains the cart during navigation; merging, prices, stock and reservations require service checks after sign-in.")}</small></div></div>}
    {context === "payment" && <div className="session-note session-operation"><AuthIcon kind="notice" /><div><p>{t("نتیجه پرداخت باید بررسی شود. دوباره پرداخت نکنید.", "Your payment result needs to be checked. Do not pay again.")}</p><small>{t("Demo: نتیجه نامشخص است؛ پایان نشست، پرداخت را ناموفق یا لغوشده نمی‌کند.", "Demo: outcome is unknown; session expiry does not mean payment failure or cancellation.")}</small></div></div>}
    {context === "savedDraft" && <div className="session-note"><AuthIcon kind="notice" /><div><p>{t("Demo: پیش‌نویس ذخیره‌شده پس از ورود دوباره قابل ادامه است.", "Demo: you can continue your saved draft after signing in again.")}</p><small>{t("فقط نمونه طراحی؛ بازیابی واقعی به تأیید ذخیره و مالکیت از سرویس نیاز دارد.", "Design fixture only; actual recovery requires service confirmation of storage and ownership.")}</small></div></div>}
    {context === "unsaved" && <div className="session-note"><AuthIcon kind="notice" /><p>{t("ممکن است تغییرات ذخیره‌نشده قابل بازیابی نباشند.", "Unsaved changes may not be recoverable.")}</p></div>}
    {(context === "upload" || context === "analysis") && <div className="session-note"><AuthIcon kind="notice" /><div><p>{context === "upload" ? t("وضعیت آپلود پس از ورود بررسی می‌شود؛ پایان نشست به معنی شکست قطعی فایل نیست.", "Check upload status after sign-in; session expiry does not confirm file failure.") : t("قطع دسترسی به معنی توقف تحلیل نیست؛ وضعیت کار موجود باید بررسی شود.", "Loss of access does not mean analysis stopped; check the existing job status.")}</p><small>{t("آپلود، تحلیل یا درخواست جدید به‌صورت خودکار آغاز نمی‌شود.", "No upload, analysis or new request will start automatically.")}</small></div></div>}
  </>
  const actions = () => <div className="session-actions">
    {access === "network" || access === "server" ? <button className="button primary" type="button" onClick={retry}>{t("تلاش دوباره برای بررسی", "Try checking again")}</button>
      : access === "checking" ? <p className="session-checking" role="status">{t("Demo: بررسی وضعیت دسترسی؛ بدون نمایش داده خصوصی.", "Demo: checking access; private data stays hidden.")}</p>
      : access === "denied" || access === "differentAccount" || access === "restricted" ? <a className="button primary" href={`${prefix}/contact`} onClick={follow(`${prefix}/contact`)}>{t("تماس با پشتیبانی", "Contact support")}</a>
      : access === "returned" ? <><button className="button primary" type="button" disabled={!reviewed} onClick={() => { setSafeReturn(true); setInterrupted(false); setOpen(false) }}>{t("پیش‌نمایش بازگشت امن", "Preview safe return")}</button>{!reviewed && <p className="session-next-check">{t("ابتدا مجوز مقصد و نتیجه عملیات را در پروتوتایپ بررسی کنید.", "First check permissions and operation results in the prototype.")}</p>}</>
      : <a className="button primary" href={loginRoute} onClick={follow(loginRoute)}>{t("ورود مجدد", "Sign in again")}<span className="auth-forward"><AuthIcon kind="arrow" /></span></a>}
    <a className="button secondary" href="/" onClick={follow("/")}>{t("بازگشت به فروشگاه", "Back to shop")}</a>
  </div>
  const content = (modal: boolean) => safeReturn && !modal ? <div className="session-content"><div className="session-symbol" aria-hidden="true"><AuthIcon kind="lock" /></div><h1 id="session-title" ref={heading} tabIndex={-1}>{t("بازگشت امن به مقصد · Demo", "Safe destination return · Demo")}</h1><p className="auth-intro">{destinationName}</p><p className="session-safe-detail">{t("فقط نمای عمومی پروتوتایپ است؛ نشست یا داده خصوصی واقعی ایجاد نشده و هیچ پرداخت، آپلود یا تحلیل قبلی تکرار نشده است.", "Public prototype placeholder only; no real session or private data exists, and no previous payment, upload or analysis was replayed.")}</p><button type="button" className="button secondary session-reopen" onClick={() => { setSafeReturn(false); setAccess("expired") }}>{t("بازگشت به پیش‌نمایش پایان نشست", "Back to session-expiry preview")}</button></div> : <div className="session-content">
    <div className="session-symbol" aria-hidden="true"><AuthIcon kind="lock" /></div>
    <div className="auth-eyebrow">NILART · AUTH-09</div>
    {modal ? <h2 id="session-dialog-title" ref={modalHeading} tabIndex={-1}>{title}</h2> : <h1 id="session-title" ref={heading} tabIndex={-1}>{title}</h1>}
    <p className="auth-intro" id={modal ? "session-dialog-description" : "session-description"}>{description}</p>
    <div className="password-demo session-demo"><span>Demo</span>{t("وضعیت نمونه است؛ سرویس بررسی نشست متصل نیست.", "Design fixture; session validation service is not connected.")}</div>
    {access === "expired" || access === "returned" ? <><div className="session-destination"><span>{t("پس از ورود و بررسی مجوز", "After sign-in and permission checks")}</span><strong>{destinationName}</strong></div>{notes()}</> : null}
    {actions()}
    <p className="session-reassurance">{t("عملیات حساس یا پرداخت قبلی خودکار تکرار نمی‌شود.", "Previous sensitive operations or payments will not be retried automatically.")}</p>
  </div>
  return <div className="auth-shell session-shell" dir={en ? "ltr" : "rtl"}>
    <div className="session-public-shell" inert={open} aria-hidden={open || undefined}>
      <a className="skip-link" href="#session-title">{t("رفتن به محتوای اصلی", "Skip to content")}</a>
      <header className="auth-header"><a className="wordmark" href="/" onClick={follow("/")} aria-label={t("نیل‌آرت، صفحه اصلی", "Nilart home")}><span>nilart<span className="wordmark-dot">.</span></span><small>ART IN EVERYDAY LIFE</small></a><a className="auth-language" href={`${en ? "/fa" : "/en"}/auth/session-expired${suffix}`} onClick={follow(`${en ? "/fa" : "/en"}/auth/session-expired${suffix}`)}><AuthIcon kind="globe" />{en ? "فارسی" : "English"}</a></header>
      <main className="auth-main"><div className="auth-column">
        {interrupted ? <section className="auth-card session-safe-panel"><div className="session-symbol" aria-hidden="true"><AuthIcon kind="lock" /></div><h1 ref={heading} id="session-title" tabIndex={-1}>{t("این بخش تا بررسی دسترسی قفل است", "This section is locked pending access checks")}</h1><p className="auth-intro">{t("Demo: محتوای خصوصی حذف شده است؛ بستن پنجره آن را بازنمی‌گرداند.", "Demo: private content has been removed; closing the dialog does not restore it.")}</p><p className="session-safe-detail">{t("پشت پنجره هیچ داده حساب، تصویر یا سفارش رندر نمی‌شود؛ فقط این نمای امن وجود دارد.", "No account data, images or orders are rendered behind the dialog; only this safe placeholder exists.")}</p><button ref={safeControl} className="button primary session-reopen" type="button" onClick={() => setOpen(true)}>{t("نمایش راه ادامه", "Show how to continue")}</button><a className="text-link" href={loginRoute} onClick={follow(loginRoute)}>{t("ورود مجدد", "Sign in again")}</a></section> : <section className="auth-card session-card" aria-labelledby="session-title">{content(false)}</section>}
      </div></main>
      <footer className="auth-footer"><span>{t("نیل‌آرت؛ هنر در لحظه‌های روزمره", "Nilart. Art in everyday life.")}</span><nav aria-label={t("لینک‌های راهنما", "Helpful links")}><a href={`${prefix}/privacy`} onClick={follow(`${prefix}/privacy`)}>{t("حریم خصوصی", "Privacy policy")}</a><a href={`${prefix}/contact`} onClick={follow(`${prefix}/contact`)}>{t("تماس", "Contact")}</a></nav></footer>
      <details className="auth-preview"><summary>{t("حالت‌های پیش‌نمایش", "Preview states")} <span>AUTH-09 · Demo</span></summary><p>{t("صفحه مستقل یا پنجره پاسخ نمونه؛ هیچ نشست، پرداخت یا بازیابی داده واقعی انجام نمی‌شود.", "Standalone or simulated response dialog; no real session, payment or data recovery occurs.")}</p><div><button type="button" onClick={() => { setInterrupted(false); setOpen(false) }}>{t("صفحه مستقل", "Standalone page")}</button><button type="button" onClick={() => { setInterrupted(true); setOpen(true) }}>{t("Modal دسکتاپ / Sheet موبایل", "Desktop modal / mobile sheet")}</button>{contexts.map(([value, fa, english]) => <button key={value} type="button" aria-pressed={context === value} onClick={() => chooseContext(value)}>{en ? english : fa}</button>)}</div><div>{accesses.map(([value, fa, english]) => <button key={value} type="button" aria-pressed={access === value} onClick={() => { if (timer.current) clearTimeout(timer.current); setAccess(value); setReviewed(false); setInterrupted(false) }}>{en ? english : fa}</button>)}</div><ol className="session-prototype"><li>{t("پایان نشست تأییدشده · Demo", "Confirmed expiry · Demo")}</li><li><a href={loginRoute} onClick={follow(loginRoute)}>{t("ورود مجدد از AUTH-01", "Sign in again through AUTH-01")}</a></li><li><button type="button" onClick={() => { setAccess("returned"); setReviewed(true); setInterrupted(false) }}>{t("Demo: بررسی مجوز و نتیجه عملیات — بدون اجرای مجدد", "Demo: check permissions and operation results — no replay")}</button></li><li>{t("نمای امن مقصد؛ اطلاعات خصوصی یا نشست واقعی ایجاد نمی‌شود.", "Safe destination preview; no private information or real session is created.")}</li></ol></details>
    </div>
    <dialog ref={dialog} className="session-dialog" aria-labelledby="session-dialog-title" aria-describedby="session-dialog-description" onCancel={(event) => { event.preventDefault(); close() }}>
      <div className="session-sheet-handle" aria-hidden="true" /><button type="button" className="session-close" onClick={close}>{t("بستن پنجره", "Close dialog")}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
      {content(true)}
    </dialog>
  </div>
}
