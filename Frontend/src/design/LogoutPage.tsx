import { useEffect, useRef, useState, type MouseEvent } from "react"
import { AuthIcon } from "./AuthPage"

type State = "confirm" | "saving" | "saveError" | "signingOut" | "success" | "network" | "service" | "unknown" | "signedOut" | "checking" | "otherTab"
const previews: [State, string, string][] = [
  ["confirm", "تأیید عادی", "Confirmation"], ["saving", "ذخیره در حال انجام", "Saving"],
  ["saveError", "خطای ذخیره", "Save error"], ["signingOut", "در حال خروج", "Signing out"],
  ["success", "خروج موفق Demo", "Demo success"], ["network", "خطای شبکه", "Network error"],
  ["service", "خطای سرویس", "Service error"], ["unknown", "نتیجه نامشخص", "Unknown outcome"],
  ["signedOut", "بدون نشست", "No session"], ["otherTab", "خروج تب دیگر Demo", "Demo other-tab sign-out"],
]

export default function LogoutPage({ en, navigate, target, clearDemoData, liveLogout, liveCheck }: {
  en: boolean; navigate: (route: string) => void; target: string | null; clearDemoData: () => void
  liveLogout?: () => Promise<"success" | "signedOut" | "service" | "unknown">
  liveCheck?: () => Promise<"confirm" | "signedOut" | "service" | "unknown">
}) {
  const t = (fa: string, english: string) => en ? english : fa
  const prefix = en ? "/en" : "/fa"
  const suffix = target ? `?returnTo=${encodeURIComponent(target)}` : ""
  const [state, setState] = useState<State>(liveCheck ? "checking" : "confirm")
  const [unsaved, setUnsaved] = useState(false)
  const [canSave, setCanSave] = useState(false)
  const [paymentUnknown, setPaymentUnknown] = useState(false)
  const [uploadPending, setUploadPending] = useState(false)
  const [outcome, setOutcome] = useState<"network" | "service" | "unknown" | "success">("network")
  const [saveSucceeds, setSaveSucceeds] = useState(false)
  const [open, setOpen] = useState(false)
  const [inline, setInline] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [showOtherTab, setShowOtherTab] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const modalHeading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lock = useRef(false)
  const channel = useRef<BroadcastChannel | null>(null)
  const clearRef = useRef(clearDemoData)
  clearRef.current = clearDemoData
  const busy = ["saving", "signingOut", "checking"].includes(state)
  const success = state === "success" || state === "otherTab"
  const noSession = success || state === "signedOut"
  const uncertain = ["network", "service", "unknown", "checking"].includes(state)
  const title = success ? liveLogout ? t("از حساب خارج شدید", "You are signed out") : t("از حساب خارج شدید · Demo", "You are signed out · Demo")
    : state === "signedOut" ? t("در حال حاضر وارد حساب نیستید", "You are not currently signed in")
    : state === "signingOut" ? t("در حال خروج…", "Signing out…")
    : state === "saving" ? t("در حال ذخیره…", "Saving…")
    : state === "checking" ? t("در حال بررسی وضعیت نشست…", "Checking session status…")
    : state === "network" || state === "unknown" ? t("خروج از حساب هنوز تأیید نشده است.", "Sign-out has not been confirmed yet.")
    : state === "service" ? t("در حال حاضر امکان تأیید خروج نیست.", "Sign-out cannot be confirmed right now.")
    : t("از حساب خارج می‌شوید؟", "Sign out of your account?")
  const description = noSession ? t("برای دسترسی به حساب، می‌توانید دوباره وارد شوید.", "You can sign in again to access your account.")
    : uncertain ? t("نمایش اطلاعات خصوصی متوقف است. تا بررسی معتبر سرویس، ابطال نشست یا ادامه ورود قطعی فرض نمی‌شود.", "Private information is hidden. Until the service confirms status, neither session revocation nor continued sign-in is assumed.")
    : t("برای دسترسی دوباره به بخش‌های خصوصی، باید وارد شوید.", "You will need to sign in again to access private areas.")
  useEffect(() => {
    if (!liveCheck) return
    let active = true
    liveCheck().then((next) => { if (active) { setState(next); if (next === "signedOut") clearRef.current() } })
    return () => { active = false }
  }, [liveCheck])
  useEffect(() => {
    document.documentElement.lang = en ? "en" : "fa"
    document.documentElement.dir = en ? "ltr" : "rtl"
    document.title = `${title} | Nilart`
    if (open) modalHeading.current?.focus({ preventScroll: true })
    else heading.current?.focus({ preventScroll: true })
  }, [en, state, title])
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) { dialog.current.showModal(); modalHeading.current?.focus() }
    else if (!open && dialog.current?.open) dialog.current.close()
  }, [open])
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return
    const node = new BroadcastChannel(liveCheck ? "nilart-auth-status" : "nilart-auth-demo-status")
    channel.current = node
    node.onmessage = async (event) => {
      if (liveCheck) {
        if (event.data?.type !== "session-changed") return
        const next = await liveCheck()
        if (next === "signedOut") clearRef.current()
        setState(next)
        return
      }
      if (event.data?.type !== "demo-signout") return
      if (timer.current) clearTimeout(timer.current)
      lock.current = false
      clearRef.current()
      setState("otherTab"); setUnsaved(false); setCancelled(false)
    }
    return () => { node.close(); channel.current = null }
  }, [liveCheck])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const completeDemo = (broadcast: boolean) => {
    if (liveLogout) return
    clearRef.current()
    setUnsaved(false); setCanSave(false); setCancelled(false)
    setState("success")
    if (broadcast) channel.current?.postMessage({ type: "demo-signout" })
  }
  const leaveDialog = () => {
    if (busy) return
    setOpen(false)
    if (!uncertain && !noSession) setCancelled(true)
    requestAnimationFrame(() => trigger.current?.focus())
  }
  const follow = (route: string, language = false) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (busy) return
    if (!language) setOpen(false)
    navigate(route)
  }
  const startLogout = async () => {
    if (lock.current || busy || noSession || uncertain) return
    lock.current = true; setCancelled(false); setState("signingOut")
    if (liveLogout) {
      try {
        const next = await liveLogout(); setState(next)
        if (next === "success" || next === "signedOut") {
          clearRef.current(); channel.current?.postMessage({ type: "session-changed" })
        }
      } catch { setState("unknown") }
      finally { lock.current = false }
      return
    }
    // Prototype only: no session endpoint, cookie mutation or server revocation occurs.
    timer.current = setTimeout(() => {
      lock.current = false
      if (outcome === "success") completeDemo(true)
      else setState(outcome)
    }, 800)
  }
  const saveAndLogout = () => {
    if (!canSave || !unsaved || lock.current || busy) return
    lock.current = true; setState("saving")
    timer.current = setTimeout(() => {
      lock.current = false
      if (!saveSucceeds) { setState("saveError"); return }
      setUnsaved(false); setState("confirm")
      // This sequence is an explicitly selected Demo save result, not real draft persistence.
      startLogout()
    }, 650)
  }
  const checkStatus = async () => {
    if (lock.current || busy) return
    lock.current = true; setState("checking")
    if (liveCheck) {
      try { const next = await liveCheck(); setState(next); if (next === "signedOut") clearRef.current() }
      catch { setState("unknown") }
      finally { lock.current = false }
      return
    }
    // Check simulation only; do not reissue logout after an unknown result.
    timer.current = setTimeout(() => {
      lock.current = false
      if (outcome === "success") completeDemo(true)
      else setState(outcome)
    }, 700)
  }
  const preview = (next: State) => {
    if (liveLogout) return
    if (timer.current) clearTimeout(timer.current)
    lock.current = false; setCancelled(false)
    if (next === "success") completeDemo(false)
    else { if (next === "signedOut" || next === "otherTab") { clearRef.current(); setUnsaved(false) }; setState(next) }
  }
  const stay = () => {
    if (busy) return
    if (open) leaveDialog()
    else setCancelled(true)
  }
  const link = (label: string, route: string, className = "text-link") => <a className={className} href={route} onClick={follow(route)}>{label}</a>
  const content = (modal: boolean) => <div className="logout-content">
    <div className="session-symbol" aria-hidden="true"><AuthIcon kind="lock" /></div>
    <div className="auth-eyebrow">NILART · AUTH-11</div>
    {modal ? <h2 ref={modalHeading} tabIndex={-1} id="logout-dialog-title">{title}</h2> : <h1 ref={heading} tabIndex={-1} id="logout-title">{title}</h1>}
    <p className="auth-intro" id={modal ? "logout-dialog-description" : "logout-description"}>{description}</p>
    {!liveLogout && <div className="password-demo session-demo"><span>Demo</span>{t("سرویس خروج متصل نیست؛ هیچ cookie یا نشست واقعی باطل نمی‌شود.", "Sign-out service is not connected; no real cookie or session is revoked.")}</div>}
    {state === "saveError" && <p className="logout-warning" role="alert">{t("Demo: ذخیره تأیید نشد؛ خروج ادامه پیدا نکرد. دوباره تلاش کنید یا صریحاً خروج بدون ذخیره را انتخاب کنید.", "Demo: saving was not confirmed; sign-out did not continue. Retry or explicitly choose to sign out without saving.")}</p>}
    {unsaved && !noSession && !uncertain && <div className="logout-warning"><AuthIcon kind="notice" /><div><p>{t("تغییرات ذخیره‌نشده ممکن است از دست بروند.", "Unsaved changes may be lost.")}</p><small>{t("Demo: خطر ذخیره‌نشده انتخاب‌شده در پیش‌نمایش؛ رمز و OTP ذخیره نمی‌شوند.", "Demo: unsaved-change fixture selected in preview; passwords and OTPs are never saved.")}</small></div></div>}
    {paymentUnknown && <div className="session-note"><AuthIcon kind="notice" /><p>{t("خروج از حساب نتیجه پرداخت را تغییر نمی‌دهد. پیش از پرداخت دوباره، وضعیت تراکنش را بررسی کنید.", "Signing out does not change the payment result. Check its status before paying again.")}</p></div>}
    {uploadPending && !noSession && <p className="logout-warning">{t("Demo: نتیجه آپلود یا ثبت جاری مشخص نیست. وضعیت آن بعداً باید از سرویس بررسی شود؛ ادامه پس‌زمینه یا بازیابی فایل تضمین نمی‌شود.", "Demo: current upload or submission outcome is unknown. Check its status with the service later; background continuation or file recovery is not guaranteed.")}</p>}
    {success && !liveLogout && <p className="logout-policy" role="status">{t("Demo: فقط نمای خروج و پاک‌کردن داده موقت احراز هویت شبیه‌سازی شد؛ ابطال سرور انجام نشده است.", "Demo: only the signed-out view and temporary auth-data cleanup were simulated; no server revocation occurred.")}</p>}
    <div className="session-actions">
      {noSession ? <>{link(t("بازگشت به فروشگاه", "Back to shop"), "/", "button primary")}{link(success ? t("ورود دوباره", "Sign in again") : t("ورود به حساب", "Sign in"), `${prefix}/auth/login`, "button secondary")}</>
        : uncertain ? <><button className="button primary" type="button" disabled={busy} onClick={checkStatus}>{busy ? t("در حال بررسی…", "Checking…") : t("تلاش دوباره — بررسی وضعیت نشست", "Try again — check session status")}</button>{link(t("بازگشت به فروشگاه", "Back to shop"), "/", "button secondary")}</>
        : busy ? <button className="button primary" type="button" disabled aria-busy="true">{state === "saving" ? t("در حال ذخیره…", "Saving…") : t("در حال خروج…", "Signing out…")}</button>
        : unsaved ? <>{canSave && <button type="button" className="button primary" onClick={saveAndLogout}>{t("ذخیره و خروج · Demo", "Save and sign out · Demo")}</button>}<button className={`button ${canSave ? "secondary" : "primary"}`} type="button" onClick={startLogout}>{t("خروج بدون ذخیره", "Sign out without saving")}</button><button className="button secondary" type="button" onClick={stay}>{t("بازگشت برای ذخیره", "Return to save")}</button></>
        : <><button className="button primary" type="button" onClick={startLogout}>{t("خروج از حساب", "Sign out")}</button><button className="button secondary" type="button" onClick={stay}>{t("ماندن در حساب", "Stay signed in")}</button></>}
    </div>
    <p className="logout-policy">{t("فقط نشست جاری هدف این جریان است؛ خروج حساب یا سفارش را حذف نمی‌کند و تحلیل یا پرداخت را خودکار لغو نمی‌کند.", "This flow targets only the current session; sign-out does not delete accounts or orders, or automatically cancel analysis or payments.")}</p>
    <p className="password-live" role="status">{busy ? liveLogout ? t("در حال بررسی نشست…", "Checking your session…") : t("Demo: نمایش پردازش؛ عملیات واقعی انجام نمی‌شود.", "Demo: showing processing; no actual operation occurs.") : ""}</p>
  </div>
  return <div className="auth-shell" dir={en ? "ltr" : "rtl"}>
    <div className="session-public-shell" inert={open} aria-hidden={open || undefined}>
      <a className="skip-link" href="#logout-title">{t("رفتن به محتوای اصلی", "Skip to content")}</a>
      <header className="auth-header"><a className="wordmark" href="/" onClick={follow("/")} aria-label={t("نیل‌آرت، صفحه اصلی", "Nilart home")}><span>nilart<span className="wordmark-dot">.</span></span><small>ART IN EVERYDAY LIFE</small></a><a className="auth-language" href={`${en ? "/fa" : "/en"}/auth/logout${suffix}`} onClick={follow(`${en ? "/fa" : "/en"}/auth/logout${suffix}`, true)} aria-disabled={busy}><AuthIcon kind="globe" />{en ? "فارسی" : "English"}</a></header>
      <main className="auth-main"><div className="auth-column">
        {inline && !noSession ? <section className="auth-card"><div className="session-symbol" aria-hidden="true"><AuthIcon kind="lock" /></div><h1 ref={heading} id="logout-title" tabIndex={-1}>{uncertain || busy ? t("نمای خصوصی فعلاً در دسترس نیست", "Private view is currently unavailable") : cancelled ? liveLogout ? t("خروج لغو شد", "Sign-out cancelled") : t("خروج لغو شد · Demo", "Sign-out cancelled · Demo") : t("صفحه قبلی · نمای امن Demo", "Previous page · safe Demo view")}</h1><p className="auth-intro">{t("فقط نمای عمومی پروتوتایپ است؛ هیچ تصویر، سفارش یا داده خصوصی پشت پنجره وجود ندارد.", "Public prototype placeholder only; no image, order or private data exists behind the dialog.")}</p><button ref={trigger} className="button primary session-reopen" type="button" disabled={busy} onClick={() => { setCancelled(false); setOpen(true) }}>{uncertain ? t("بررسی نتیجه خروج", "Check sign-out outcome") : t("خروج از حساب", "Sign out")}</button></section>
          : cancelled && !uncertain ? <section className="auth-card"><h1 ref={heading} id="logout-title" tabIndex={-1}>{liveLogout ? t("خروج لغو شد", "Sign-out cancelled") : t("خروج لغو شد · Demo", "Sign-out cancelled · Demo")}</h1><p className="auth-intro">{t("درخواست خروجی ارسال نشد. بازگشت واقعی به بخش خصوصی نیازمند نشست و مجوز معتبر است.", "No sign-out request was sent. Actual private access requires a valid session and permissions.")}</p><button ref={trigger} className="button secondary session-reopen" type="button" onClick={() => setCancelled(false)}>{t("بازگشت به تأیید خروج", "Back to sign-out confirmation")}</button></section>
          : <section className="auth-card" aria-labelledby="logout-title">{content(false)}</section>}
        {showOtherTab && <section className="logout-tab-preview" aria-label={t("نمونه تب دیگر", "Other-tab preview")}><h2>{t("تب دیگر · Demo", "Other tab · Demo")}</h2>{!noSession && !uncertain && !busy ? <p>{t("جای‌نگهدار نمای حساب نمونه؛ هیچ داده خصوصی واقعی وجود ندارد.", "Sample account-view placeholder; no actual private information exists.")}</p> : <p role="status">{t("نمای حساب حذف شد؛ دسترسی فقط پس از بررسی دوباره نشست مجاز است.", "Account view removed; access requires session revalidation.")}</p>}</section>}
        {busy && !liveLogout && <button type="button" className="text-link logout-demo-reset" onClick={() => preview("confirm")}>{t("بازنشانی وضعیت پیش‌نمایش · Demo", "Reset preview state · Demo")}</button>}
      </div></main>
      <footer className="auth-footer"><span>{t("نیل‌آرت؛ هنر در لحظه‌های روزمره", "Nilart. Art in everyday life.")}</span><nav aria-label={t("لینک‌های راهنما", "Helpful links")}>{link(t("تماس", "Contact"), `${prefix}/contact`)}{link(t("حریم خصوصی", "Privacy policy"), `${prefix}/privacy`)}</nav></footer>
      {!liveLogout && <details className="auth-preview"><summary>{t("حالت‌های پیش‌نمایش", "Preview states")} <span>AUTH-11 · Demo</span></summary><p>{t("CSRF، ابطال سرور، پاک‌کردن cookie و cache خصوصی واقعی باید در اتصال سرویس اجرا شوند؛ این صفحه فقط پروتوتایپ است.", "CSRF, server revocation, cookie removal and real private-cache cleanup must be implemented with the service; this page is a prototype.")}</p><div>{previews.map(([value, fa, english]) => <button key={value} type="button" disabled={busy} onClick={() => preview(value)}>{en ? english : fa}</button>)}<button type="button" disabled={busy} onClick={() => { preview("confirm"); setUnsaved(true); setCanSave(false) }}>{t("تغییرات ذخیره‌نشده Demo", "Demo unsaved changes")}</button><button type="button" disabled={busy} onClick={() => { preview("confirm"); setUnsaved(true); setCanSave(true) }}>{t("قابلیت ذخیره Demo", "Demo save capability")}</button><button type="button" disabled={busy} onClick={() => { preview("confirm"); setInline(true); setOpen(true) }}>{t("Modal / Bottom sheet", "Modal / bottom sheet")}</button><button type="button" disabled={busy} onClick={() => { setInline(false); setCancelled(false) }}>{t("صفحه مستقل", "Standalone")}</button><button type="button" disabled={busy} aria-pressed={paymentUnknown} onClick={() => setPaymentUnknown(!paymentUnknown)}>{t("پرداخت نامشخص Demo", "Demo unknown payment")}</button><button type="button" disabled={busy} aria-pressed={uploadPending} onClick={() => setUploadPending(!uploadPending)}>{t("آپلود در جریان Demo", "Demo upload in progress")}</button><button type="button" disabled={busy} aria-pressed={showOtherTab} onClick={() => setShowOtherTab(!showOtherTab)}>{t("نمای تب دیگر Demo", "Demo other-tab view")}</button></div><label className="registration-outcome">{t("پاسخ نمونه خروج یا بررسی نشست", "Simulated sign-out or status-check response")}<select disabled={busy} value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)}><option value="network">{t("خطای شبکه (پیش‌فرض)", "Network error (default)")}</option><option value="service">{t("خطای سرویس", "Service error")}</option><option value="unknown">{t("نتیجه نامشخص", "Unknown")}</option><option value="success">{t("خروج موفق — فقط Demo", "Success — Demo only")}</option></select></label><label className="otp-demo-toggle"><input type="checkbox" disabled={busy} checked={saveSucceeds} onChange={(event) => setSaveSucceeds(event.target.checked)} />{t("Demo: پذیرش ذخیره — بدون ذخیره واقعی", "Demo: save accepted — no actual persistence")}</label><p>{t("در صورت پشتیبانی مرورگر، خروج موفق Demo فقط پیام تغییر وضعیت بدون اطلاعات شخصی به تب‌های همین پیش‌نمایش می‌فرستد.", "If supported by the browser, Demo success broadcasts only a status-change message, without personal data, to tabs of this preview.")}</p></details>}
    </div>
    <dialog ref={dialog} className="session-dialog" aria-labelledby="logout-dialog-title" aria-describedby="logout-dialog-description" onCancel={(event) => { event.preventDefault(); leaveDialog() }}><div className="session-sheet-handle" aria-hidden="true" /><button type="button" className="session-close" disabled={busy} onClick={leaveDialog}>{t("بستن پنجره", "Close dialog")}</button>{content(true)}</dialog>
  </div>
}
