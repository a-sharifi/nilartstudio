import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react"
import { AuthIcon } from "./AuthPage"
import { demoAuthPolicy } from "./checkout"

export interface DemoPasswordGrant { demo: true; purpose: "register" | "recovery"; maskedPhone: string }
export interface LivePasswordGrant { demo: false; purpose: "register" | "recovery"; maskedPhone: string; token: string; expiresAt: number }
export type PasswordGrant = DemoPasswordGrant | LivePasswordGrant
type State = "initial" | "checking" | "submitting" | "network" | "service" | "unknown" | "expired" | "invalid" | "consumed" | "changed" | "existing" | "limited" | "createdSession" | "createdOnly"
type Errors = { password?: "required" | "rules"; confirm?: "required" | "mismatch" }
const previews: [string, string, string][] = [
  ["checking", "بررسی جریان", "Checking flow"], ["empty", "فرم خالی Demo", "Demo empty form"], ["masked", "رمز پوشیده", "Masked"],
  ["visible", "رمز نمایان", "Visible"], ["rules", "قواعد ناقص", "Unmet requirements"], ["mismatch", "عدم تطبیق", "Mismatch"],
  ["valid", "فرم معتبر Demo", "Demo valid form"], ["submitting", "در حال تکمیل", "Submitting"], ["network", "خطای شبکه", "Network error"],
  ["service", "خطای سرویس", "Service error"], ["unknown", "نتیجه نامشخص", "Unknown result"], ["expired", "مجوز منقضی", "Expired grant"],
  ["existing", "حساب موجود Demo", "Demo existing account"], ["limited", "محدودیت درخواست", "Rate limited"],
  ["createdSession", "حساب و نشست Demo", "Demo account and session"], ["createdOnly", "حساب بدون نشست Demo", "Demo account only"],
]
export default function RegistrationPasswordPage({ en, suffix, grant, setGrant, navigate, target, resetFlow, purpose = "register", liveComplete }: {
  en: boolean; suffix: string; grant: PasswordGrant | null; setGrant: (grant: PasswordGrant | null) => void
  navigate: (route: string) => void; target: string | null; resetFlow: () => void
  purpose?: "register" | "recovery"
  liveComplete?: (password: string) => Promise<"createdSession" | "changed" | "invalid" | "limited" | "network" | "service" | "unknown">
}) {
  const t = (fa: string, english: string) => en ? english : fa
  const prefix = en ? "/en" : "/fa"
  const recovering = purpose === "recovery"
  const pagePath = recovering ? "/auth/reset-password" : "/auth/register/password"
  const restartPath = recovering ? "/auth/forgot-password" : "/auth/register"
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [touched, setTouched] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [state, setState] = useState<State>("initial")
  const [outcome, setOutcome] = useState<"service" | "createdSession" | "createdOnly" | "changed">("service")
  const [pendingExit, setPendingExit] = useState<{ route: string; reset: boolean } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lock = useRef(false)
  const created = state === "createdSession" || state === "createdOnly" || state === "changed"
  const validDemoGrant = grant?.purpose === purpose && (!liveComplete || (!grant.demo && grant.expiresAt > Date.now())) && !["expired", "invalid", "consumed"].includes(state) && !created
  const busy = state === "checking" || state === "submitting"
  const blocked = !validDemoGrant || busy || state === "unknown" || state === "limited" || state === "existing"
  const minimum = liveComplete ? 12 : demoAuthPolicy.passwordMinLength
  const characterCount = liveComplete ? Array.from(password).length : password.length
  const meetsRules = characterCount >= minimum && (!liveComplete || (characterCount <= 128 && new TextEncoder().encode(password).length <= 512 && !!password.trim()))
  const mismatch = touched && confirm.length > 0 && password !== confirm
  useEffect(() => {
    document.documentElement.lang = en ? "en" : "fa"
    document.documentElement.dir = en ? "ltr" : "rtl"
    document.title = recovering ? t("رمز جدید | نیل‌آرت", "Reset password | Nilart") : t("ساخت رمز ثبت‌نام | نیل‌آرت", "Set registration password | Nilart")
    heading.current?.focus({ preventScroll: true })
  }, [en])
  useEffect(() => { if (created) heading.current?.focus({ preventScroll: true }) }, [created])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => {
    if (!password && !confirm) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [password, confirm])
  useEffect(() => { if (pendingExit && !dialog.current?.open) dialog.current?.showModal() }, [pendingExit])
  const clearPasswords = () => { setPassword(""); setConfirm(""); setShowPassword(false); setShowConfirm(false); setTouched(false); setErrors({}) }
  const leave = (route: string, reset: boolean) => {
    clearPasswords()
    if (reset) resetFlow()
    else setGrant(null)
    navigate(route)
  }
  const follow = (route: string, reset = false, language = false) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (language) { navigate(route); return }
    if (password || confirm) setPendingExit({ route, reset })
    else leave(route, reset)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (blocked || lock.current) return
    const next: Errors = {}
    if (!password) next.password = "required"
    else if (!meetsRules) next.password = "rules"
    if (!confirm) next.confirm = "required"
    else if (confirm !== password) next.confirm = "mismatch"
    setErrors(next); setTouched(true)
    if (next.password || next.confirm) { (next.password ? passwordRef : confirmRef).current?.focus(); return }
    lock.current = true; setState("submitting")
    if (liveComplete) {
      try { setState(await liveComplete(password)) }
      catch { setState("unknown") }
      finally { lock.current = false; clearPasswords() }
      return
    }
    // UI-only simulation. No credentials leave this form and no account/session/grant is created.
    timer.current = setTimeout(() => {
      lock.current = false
      if (outcome !== "service") { clearPasswords(); setGrant(null) }
      setState(outcome)
    }, 800)
  }
  const preview = (value: string) => {
    if (liveComplete) return
    if (timer.current) clearTimeout(timer.current)
    lock.current = false
    clearPasswords()
    if (["empty", "masked", "visible", "rules", "mismatch", "valid", "submitting", "network", "service", "unknown", "existing", "limited"].includes(value)) {
      setGrant({ demo: true, purpose, maskedPhone: "09•••••••89" })
    }
    if (["masked", "visible", "mismatch", "valid"].includes(value)) { setPassword("Demo password"); setConfirm(value === "mismatch" ? "Different Demo password" : "Demo password"); setTouched(value === "mismatch") }
    if (value === "rules") { setPassword("Demo"); setErrors({ password: "rules" }) }
    if (value === "visible") { setShowPassword(true); setShowConfirm(true) }
    if (["expired", "invalid", "consumed", "changed"].includes(value) || value.startsWith("created")) setGrant(null)
    setState(["empty", "masked", "visible", "rules", "mismatch", "valid"].includes(value) ? "initial" : value as State)
  }
  const passwordError = errors.password === "required" ? recovering ? t("رمز جدید را وارد کنید.", "Enter a new password.") : t("رمز عبور را وارد کنید.", "Enter a password.") : errors.password ? t("رمز، شرایط اعلام‌شده را ندارد.", "The password does not meet the stated requirements.") : null
  const confirmError = errors.confirm === "required" ? recovering ? t("رمز جدید را دوباره وارد کنید.", "Confirm your new password.") : t("رمز عبور را دوباره وارد کنید.", "Confirm your password.") : errors.confirm === "mismatch" || mismatch ? t("رمزها با هم مطابقت ندارند.", "The passwords do not match.") : null
  const messages: Partial<Record<State, string>> = {
    expired: recovering ? t("اعتبار بازیابی پایان یافته است. دوباره کد بازیابی درخواست کنید.", "Your recovery access has expired. Request a new recovery code.") : t("برای ساخت رمز، شماره تلفن را دوباره تأیید کنید.", "Verify your phone number again to set a password."),
    invalid: recovering ? t("مجوز بازیابی معتبر نیست. دوباره کد بازیابی درخواست کنید.", "Recovery access is invalid. Request a new recovery code.") : t("مجوز ثبت‌نام معتبر نیست یا حساب موجود است؛ ورود یا تأیید دوباره را انتخاب کنید.", "Registration access is invalid or the account exists. Sign in or verify again."),
    consumed: t("مجوز بازیابی قبلاً مصرف شده است؛ نتیجه تغییر رمز از این وضعیت قابل تأیید نیست.", "Recovery access has already been used; this alone does not confirm a password change."),
    changed: t("Demo: رمز شما تغییر کرد. برای ادامه دوباره وارد شوید — فقط شبیه‌سازی؛ رمز واقعی تغییر نکرده و نشست‌های واقعی باطل نشده‌اند.", "Demo: your password has been changed. Sign in again to continue — simulation only; no real password changed or sessions were revoked."),
    network: t("ارتباط برقرار نشد. دوباره تلاش کنید.", "Unable to connect. Try again."),
    service: recovering ? t("ثبت رمز جدید در حال حاضر ممکن نیست.", "The new password cannot be saved right now.") : t("تکمیل ثبت‌نام در حال حاضر ممکن نیست.", "Registration cannot be completed right now."),
    unknown: recovering ? t("نتیجه تغییر رمز هنوز تأیید نشده است.", "The password change result has not been confirmed yet.") : t("نتیجه ثبت‌نام هنوز تأیید نشده است.", "The registration result has not been confirmed yet."),
    existing: t("برای این شماره، مسیر ورود یا بازیابی حساب را ادامه دهید.", "Continue with sign-in or account recovery for this number."),
    limited: t("تعداد درخواست‌ها بیش از حد مجاز است. پس از زمان اعلام‌شده دوباره تلاش کنید.", "Too many requests. Try again after the indicated waiting period."),
    createdSession: t("Demo: حساب شما ساخته شد و نشست ایجاد شد — فقط شبیه‌سازی؛ هیچ حساب یا نشست واقعی وجود ندارد.", "Demo: account created with a session — simulation only; no actual account or session exists."),
    createdOnly: t("Demo: حساب ساخته شد. برای ادامه وارد شوید — فقط شبیه‌سازی؛ حساب واقعی ایجاد نشده است.", "Demo: account created. Sign in to continue — simulation only; no actual account was created."),
  }
  const message = liveComplete && created ? recovering ? t("رمز تغییر کرد، نشست‌های قبلی باطل شدند و نشست جدید تأیید شد.", "Password updated, previous sessions revoked and your new session verified.") : t("حساب ساخته شد و نشست شما تأیید شد.", "Account created and your session verified.") : !validDemoGrant && !created && !["checking", "invalid", "consumed"].includes(state) ? messages.expired : messages[state]
  const pagePreviews = recovering ? [
    ...previews.filter(([value]) => !["existing", "createdSession", "createdOnly"].includes(value)),
    ["invalid", "مجوز نامعتبر", "Invalid grant"],
    ["consumed", "مجوز مصرف‌شده", "Used grant"],
    ["changed", "تغییر رمز Demo", "Demo password changed"],
  ] : previews
  return <div className="auth-shell" dir={en ? "ltr" : "rtl"}>
    <a className="skip-link" href="#registration-password-title">{t("رفتن به محتوای اصلی", "Skip to content")}</a>
    <header className="auth-header"><a className="wordmark" href="/" onClick={follow("/")} aria-label={t("نیل‌آرت، صفحه اصلی", "Nilart home")}><span>nilart<span className="wordmark-dot">.</span></span><small>ART IN EVERYDAY LIFE</small></a><a className="auth-language" href={`${en ? "/fa" : "/en"}${pagePath}${suffix}`} onClick={follow(`${en ? "/fa" : "/en"}${pagePath}${suffix}`, false, true)}><AuthIcon kind="globe" />{en ? "فارسی" : "English"}</a></header>
    <main className="auth-main"><div className="auth-column">
      {target && (target.includes("checkout") || target === "/cart" || target.includes("commissions")) && <div className="auth-notice">{target.includes("commissions") ? recovering ? t("پس از ورود، درخواست نقاشی خود را ادامه می‌دهید.", "After signing in, you can continue your commission request.") : t("پس از تکمیل ثبت‌نام، درخواست نقاشی خود را ادامه می‌دهید.", "After registration, you can continue your commission request.") : recovering ? t("پس از ورود، به ادامه خرید برمی‌گردید.", "After signing in, you will return to your purchase.") : t("پس از تکمیل ثبت‌نام، به ادامه خرید برمی‌گردید.", "After registration, you will return to your purchase.")}</div>}
      <section className="auth-card" aria-labelledby="registration-password-title">
        <ol className="register-steps" aria-label={recovering ? t("مراحل بازیابی", "Recovery steps") : t("مراحل ثبت‌نام", "Registration steps")}>{[t("شماره تلفن", "Phone number"), recovering ? t("تأیید کد", "Verify code") : t("تأیید شماره", "Verify phone"), recovering ? t("رمز جدید", "New password") : t("ساخت رمز", "Set password")].map((label, index) => <li key={label} aria-current={index === 2 ? "step" : undefined} className={index < 2 && validDemoGrant ? "step-complete" : ""}><span className="register-step-number">{index < 2 && validDemoGrant ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg> : en ? index + 1 : ["۱", "۲", "۳"][index]}</span><span>{label}{index < 2 && validDemoGrant && <span className="sr-only">{liveComplete ? t(" — انجام‌شده", " — completed") : t(" — انجام‌شده در Demo", " — completed in Demo")}</span>}</span></li>)}</ol>
        <div className="auth-eyebrow">NILART · {recovering ? "AUTH-08" : "AUTH-06"}</div><h1 id="registration-password-title" ref={heading} tabIndex={-1}>{recovering ? state === "changed" ? liveComplete ? t("رمز عبور تغییر کرد", "Password changed") : t("رمز عبور تغییر کرد · Demo", "Password changed · Demo") : t("رمز جدید تعیین کنید", "Set a new password") : t("برای حساب خود رمز بسازید", "Set a password for your account")}</h1>
        <p className="auth-intro">{recovering ? state === "changed" ? liveComplete ? t("رمز جدید ثبت و نشست شما تأیید شد.", "Your new password was saved and your session verified.") : t("Demo: اکنون می‌توانید با شماره تلفن و رمز جدید وارد حساب شوید؛ تغییر واقعی انجام نشده است.", "Demo: you can now sign in with your phone number and new password; no real change occurred.") : t("برای حساب خود رمز جدید بسازید. پس از ثبت موفق، می‌توانید دوباره وارد شوید.", "Set a new password for your account. After saving it successfully, you can sign in again.") : validDemoGrant ? liveComplete ? t("شماره تلفن تأیید شده است. با ساخت رمز، ثبت‌نام را تکمیل کنید.", "Your phone is verified. Set a password to complete registration.") : t("Demo: شماره تلفن تأیید شده است. با ساخت رمز، ثبت‌نام را تکمیل کنید.", "Demo: your phone number is verified. Set a password to complete registration.") : t("ساخت رمز فقط پس از تأیید شماره و دریافت مجوز معتبر انجام می‌شود.", "Set a password only after phone verification and a valid grant.")}</p>
        <div className="password-content">
          {!liveComplete && <div className="password-demo"><span>Demo</span>{t("سرویس متصل نیست؛ تأیید، قواعد و نتایج فقط نمونه طراحی‌اند.", "No live service; verification, policy and outcomes are design fixtures.")}</div>}
          {grant && <div className="verify-phone"><bdi dir="ltr">{grant.maskedPhone}</bdi><span className="registration-verified">{liveComplete ? t("شماره تأیید شد", "Phone verified") : t("شماره تأیید شد · Demo", "Phone verified · Demo")}</span></div>}
          {message && <div className={`password-message ${created ? "demo-success" : ""}`} role={created ? "status" : "alert"}><AuthIcon kind="notice" /><div><p>{message}</p>{state === "unknown" && <small>{recovering ? t("ثبت مجدد متوقف است؛ بررسی نتیجه عملیات به سرویس نیاز دارد.", "Resubmission is paused; checking the operation result requires the live service.") : t("ثبت مجدد متوقف است؛ بررسی نتیجه حساب یا نشست به سرویس نیاز دارد.", "Resubmission is paused; checking account or session results requires the live service.")}</small>}{state === "limited" && <small>{t("زمان انتظار معتبر دریافت نشده؛ شمارنده فرضی نمایش داده نمی‌شود.", "No service-provided waiting period; no countdown is shown.")}</small>}</div></div>}
          {state === "checking" ? <div className="auth-loading" role="status"><div className="auth-skeleton" /><p>{recovering ? t("در حال بررسی امکان تغییر رمز…", "Checking password reset access…") : t("در حال بررسی اعتبار جریان…", "Checking registration flow…")}</p></div>
            : created ? <div className="verify-success">{state === "changed" || state === "createdOnly" ? <a className="button primary password-otp" href={`${prefix}/auth/${recovering ? "login/password" : "login"}${suffix}`} onClick={follow(`${prefix}/auth/${recovering ? "login/password" : "login"}${suffix}`)}>{t("ورود به حساب", "Sign in")}</a> : <p>{t("مقصد پس از تأیید واقعی نشست و مجوز:", "Destination after real session and permission checks:")} <bdi>{target || "/account"}</bdi></p>}</div>
            : !validDemoGrant ? <><a className="button primary password-otp" href={`${prefix}${restartPath}${suffix}`} onClick={follow(`${prefix}${restartPath}${suffix}`, true)}>{recovering ? t("شروع دوباره بازیابی", "Restart recovery") : t("تأیید دوباره شماره", "Verify phone again")}</a>{recovering && <a className="text-link registration-other-phone" href={`${prefix}/auth/login/password${suffix}`} onClick={follow(`${prefix}/auth/login/password${suffix}`)}>{t("ورود به حساب", "Sign in")}</a>}</>
            : state === "existing" ? <div className="registration-existing"><a className="button primary" href={`${prefix}/auth/login${suffix}`} onClick={follow(`${prefix}/auth/login${suffix}`)}>{t("ورود به حساب", "Sign in")}</a><a className="text-link" href={`${prefix}/auth/recovery${suffix}`} onClick={follow(`${prefix}/auth/recovery${suffix}`)}>{t("بازیابی حساب", "Recover account")}</a></div>
            : <><form noValidate onSubmit={submit} aria-busy={busy}>
              <div className="password-field"><label htmlFor="registration-password">{recovering ? t("رمز عبور جدید", "New password") : t("رمز عبور", "Password")}</label><div className={`password-input-wrap ${passwordError ? "field-invalid" : ""}`}><input ref={passwordRef} id="registration-password" name="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" dir="ltr" value={password} disabled={busy} aria-invalid={!!passwordError} aria-describedby={`registration-requirements${passwordError ? " registration-password-error" : ""}`} onChange={(event) => { setPassword(event.target.value); setErrors((old) => ({ ...old, password: undefined, confirm: undefined })) }} /><button type="button" className="password-reveal" aria-controls="registration-password" aria-pressed={showPassword} disabled={busy} onClick={() => setShowPassword(!showPassword)}>{showPassword ? t("پنهان‌کردن رمز", "Hide password") : t("نمایش رمز", "Show password")}</button></div>{passwordError && <p id="registration-password-error" className="password-field-error" role="alert">{passwordError}</p>}</div>
              <div className="registration-requirements" id="registration-requirements"><h2>{t("شرایط رمز عبور", "Password requirements")} {!liveComplete && <span>Demo</span>}</h2><p className={meetsRules ? "requirement-met" : ""}><span aria-hidden="true">{meetsRules ? "✓" : "○"}</span>{t(`حداقل ${minimum} نویسه — ${meetsRules ? "برآورده شده" : "هنوز برآورده نشده"}`, `At least ${minimum} characters — ${meetsRules ? "met" : "not yet met"}`)}</p><small>{liveComplete ? t("۱۲ تا ۱۲۸ نویسه، حداکثر ۵۱۲ بایت؛ رمز و تأیید آن باید یکسان باشند.", "12–128 characters, at most 512 UTF-8 bytes; passwords must match.") : t("حداقل از تنظیمات Demo موجود آمده است؛ سیاست واقعی سرویس هنوز متصل نیست. شرط ترکیب یا حداکثر فرضی اضافه نشده است.", "Minimum comes from existing Demo settings; live service policy is not connected. No invented composition or maximum-length rule.")}</small></div>
              <div className="password-field"><label htmlFor="registration-confirm">{recovering ? t("تکرار رمز عبور جدید", "Confirm new password") : t("تکرار رمز عبور", "Confirm password")}</label><div className={`password-input-wrap ${confirmError ? "field-invalid" : ""}`}><input ref={confirmRef} id="registration-confirm" name="confirm-password" type={showConfirm ? "text" : "password"} autoComplete="new-password" dir="ltr" value={confirm} disabled={busy} aria-invalid={!!confirmError} aria-describedby={confirmError ? "registration-confirm-error" : undefined} onBlur={() => setTouched(true)} onChange={(event) => { setConfirm(event.target.value); setErrors((old) => ({ ...old, confirm: undefined })) }} /><button type="button" className="password-reveal" aria-controls="registration-confirm" aria-pressed={showConfirm} disabled={busy} onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? t("پنهان‌کردن رمز", "Hide password") : t("نمایش رمز", "Show password")}</button></div>{confirmError && <p id="registration-confirm-error" className="password-field-error" role="alert">{confirmError}</p>}</div>
              <button type="submit" className="button primary password-submit" disabled={blocked}>{state === "submitting" ? recovering ? t("در حال ثبت رمز…", "Saving password…") : t("در حال تکمیل ثبت‌نام…", "Completing registration…") : recovering ? t("ثبت رمز جدید", "Save new password") : t("تکمیل ثبت‌نام", "Complete registration")}<span className="auth-forward"><AuthIcon kind="arrow" /></span></button><p className="password-live" role="status">{state === "submitting" ? liveComplete ? t("در حال ثبت امن رمز…", "Saving your password securely…") : t("Demo: نمایش ثبت؛ رمزها ارسال نمی‌شوند.", "Demo: previewing submission; passwords are not sent.") : ""}</p>
            </form>{recovering && state === "unknown" && <a className="text-link registration-other-phone" href={`${prefix}/auth/login/password${suffix}`} onClick={follow(`${prefix}/auth/login/password${suffix}`)}>{t("ورود به حساب", "Sign in")}</a>}<a className="text-link registration-other-phone" href={`${prefix}${restartPath}${suffix}`} onClick={follow(`${prefix}${restartPath}${suffix}`, true)}>{recovering ? t("شروع دوباره بازیابی", "Restart recovery") : t("استفاده از شماره دیگر", "Use another phone number")}</a></>}
          <div className="verify-security"><p>{t("رمز عبور و کد تأیید را با دیگران به اشتراک نگذارید.", "Do not share your password or verification codes.")}</p><a className="text-link" href={`${prefix}/contact`} onClick={follow(`${prefix}/contact`)}>{t("تماس با پشتیبانی", "Contact support")}</a></div>
          {recovering && <p className="reset-session-policy">{liveComplete ? t("پس از ثبت موفق رمز، همه نشست‌های قبلی باطل می‌شوند و یک نشست جدید برای شما ایجاد می‌شود.", "After a successful reset, all previous sessions are revoked and a new session is issued.") : t("سیاست موردنظر: پس از تغییر موفق، نشست‌های قبلی باید سمت سرویس باطل شوند و ورود دوباره لازم است. سرویس متصل نیست؛ این پیش‌نمایش هیچ نشستی را باطل نمی‌کند.", "Required policy: after a successful reset, the service must revoke previous sessions and require sign-in again. No service is connected; this preview revokes no sessions.")}</p>}
          {!liveComplete && <details className="auth-preview password-preview"><summary>{t("حالت‌های پیش‌نمایش", "Preview states")} <span>{recovering ? "AUTH-08" : "AUTH-06"} · Demo</span></summary><div>{pagePreviews.map(([value, fa, english]) => <button key={value} type="button" onClick={() => preview(value)}>{en ? english : fa}</button>)}</div><label className="registration-outcome">{t("نتیجه شبیه‌سازی دکمه ثبت", "Simulated submission result")}<select value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)}><option value="service">{t("خطای سرویس (پیش‌فرض)", "Service error (default)")}</option>{recovering ? <option value="changed">{t("تغییر رمز — فقط Demo", "Password changed — Demo only")}</option> : <><option value="createdSession">{t("حساب و نشست — Demo", "Account and session — Demo")}</option><option value="createdOnly">{t("حساب بدون نشست — Demo", "Account only — Demo")}</option></>}</select></label><div>{["/checkout", `${prefix}/commissions/new`].map((route, index) => <a className="text-link" key={route} href={`${prefix}${pagePath}?returnTo=${encodeURIComponent(route)}`} onClick={follow(`${prefix}${pagePath}?returnTo=${encodeURIComponent(route)}`, false, true)}>{index === 0 ? t("زمینه خرید Demo", "Checkout context Demo") : t("زمینه نقاشی Demo", "Commission context Demo")}</a>)}</div></details>}
        </div>
      </section>
    </div></main>
    <footer className="auth-footer"><span>{t("نیل‌آرت؛ هنر در لحظه‌های روزمره", "Nilart. Art in everyday life.")}</span><nav aria-label={t("لینک‌های راهنما", "Helpful links")}>{[[t("قوانین خرید", "Purchase terms"), "terms"], [t("حریم خصوصی", "Privacy policy"), "privacy"], [t("تماس", "Contact"), "contact"]].map(([label, route]) => <a key={route} href={`${prefix}/${route}`} onClick={follow(`${prefix}/${route}`)}>{label}</a>)}</nav></footer>
    <dialog ref={dialog} className="registration-leave-dialog" onCancel={() => setPendingExit(null)}><h2>{t("از این مرحله خارج می‌شوید؟", "Leave this step?")}</h2><p>{t("رمزهای واردشده پاک می‌شوند. استفاده از شماره دیگر به تأیید جدید نیاز دارد.", "Entered passwords will be cleared. Another phone number requires new verification.")}</p><div><button type="button" className="button secondary" onClick={() => { dialog.current?.close(); setPendingExit(null) }}>{t("ماندن در فرم", "Stay on this form")}</button><button type="button" className="button primary" onClick={() => { if (pendingExit) { const next = pendingExit; dialog.current?.close(); setPendingExit(null); leave(next.route, next.reset) } }}>{t("خروج و پاک‌کردن رمزها", "Leave and clear passwords")}</button></div></dialog>
  </div>
}
