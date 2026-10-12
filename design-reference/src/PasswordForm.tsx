import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react"
import { normalizeDigits, phoneCountries, validPhone } from "./checkout"
import { AuthIcon } from "./AuthPage"
import AuthPasswordInput from "./AuthPasswordInput"

type State = "initial" | "filled" | "visible" | "phone" | "password" | "incorrect" | "sending" | "network" | "service" | "limited" | "verify" | "restricted" | "checking" | "success" | "expired"
const previews: [State, string, string][] = [
  ["initial", "فرم خالی", "Empty form"], ["filled", "شماره پرشده", "Filled phone"], ["visible", "رمز نمایان", "Visible password"],
  ["phone", "خطای شماره", "Phone error"], ["password", "رمز خالی", "Missing password"], ["incorrect", "ورود نادرست", "Incorrect credentials"],
  ["sending", "در حال ارسال", "Submitting"], ["network", "خطای شبکه", "Network error"], ["service", "خطای سرویس", "Service error"],
  ["limited", "محدودیت تلاش", "Rate limited"], ["verify", "تأیید شماره", "Verification required"], ["restricted", "حساب محدود", "Restricted account"],
  ["checking", "بررسی نشست", "Checking session"], ["success", "موفقیت Demo", "Demo success"], ["expired", "نشست منقضی", "Expired session"],
]

export default function PasswordForm({ en, suffix, navigate, onContext, phone, setPhone, country, setCountry }: {
  en: boolean; suffix: string; navigate: (route: string) => void; onContext: (context: "initial" | "checkout" | "commission") => void
  phone: string; setPhone: (value: string) => void; country: string; setCountry: (value: string) => void
}) {
  const t = (fa: string, english: string) => en ? english : fa
  const prefix = en ? "/en" : "/fa"
  // Country policy is explicitly the existing checkout Demo configuration, not inferred from language.
  const [password, setPassword] = useState("")
  const [visible, setVisible] = useState(false)
  const [caps, setCaps] = useState(false)
  const [state, setState] = useState<State>("initial")
  const [errors, setErrors] = useState<{ phone?: "required" | "invalid"; password?: boolean }>({})
  const phoneRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const busy = state === "sending" || state === "checking"
  const blocked = busy || state === "limited" || state === "restricted" || state === "verify"
  const phoneError = errors.phone === "required" ? t("شماره تلفن را وارد کنید.", "Enter your phone number.") : errors.phone ? t("شماره تلفن معتبر وارد کنید.", "Enter a valid phone number.") : null
  const messages: Partial<Record<State, string>> = {
    incorrect: t("شماره تلفن یا رمز عبور درست نیست.", "The phone number or password is incorrect."),
    network: t("ارتباط برقرار نشد. دوباره تلاش کنید.", "Unable to connect. Try again."),
    service: t("ورود در حال حاضر ممکن نیست. کمی بعد دوباره تلاش کنید.", "Sign-in is currently unavailable. Please try again later."),
    limited: t("تعداد تلاش‌ها بیش از حد مجاز است. پس از زمان اعلام‌شده دوباره تلاش کنید.", "Too many attempts. Try again after the indicated waiting period."),
    verify: t("برای ادامه، شماره تلفن خود را تأیید کنید.", "Verify your phone number to continue."),
    restricted: t("دسترسی به حساب در حال حاضر محدود است. با پشتیبانی تماس بگیرید.", "Account access is currently restricted. Contact support."),
    expired: t("نشست شما پایان یافته است. دوباره وارد شوید.", "Your session has expired. Sign in again."),
    success: t("Demo: نمونه ورود موفق؛ هیچ نشست معتبری ایجاد نشده است.", "Demo: successful sign-in preview; no valid session has been created."),
  }
  const message = messages[state] || null
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    setPassword("")
    setVisible(false)
    navigate(route)
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (submitting.current || blocked) return
    const next: typeof errors = {}
    if (!phone.trim()) next.phone = "required"
    else if (!/^[+\d\s()-]+$/.test(normalizeDigits(phone)) || !validPhone(phone, country)) next.phone = "invalid"
    if (!password) next.password = true
    setErrors(next)
    if (next.phone || next.password) {
      ;(next.phone ? phoneRef : passwordRef).current?.focus()
      return
    }
    // No live service exists: never claim credentials were accepted, rejected, or establish a session.
    submitting.current = true
    setState("sending")
    timer.current = setTimeout(() => { submitting.current = false; setState("service") }, 800)
  }
  const preview = (value: State) => {
    if (timer.current) clearTimeout(timer.current)
    submitting.current = false
    setState(value)
    setErrors(value === "phone" ? { phone: "invalid" } : value === "password" ? { password: true } : {})
    setVisible(value === "visible")
    setCaps(false)
    if (value === "initial") { setPhone(""); setPassword("") }
    if (["filled", "visible", "password"].includes(value)) { setPhone("09123456789"); setCountry("IR"); setPassword(value === "password" ? "" : "Demo password") }
    if (value === "success") setPassword("")
  }
  const navLink = (label: string, route: string, className = "text-link") => <a className={className} href={route} onClick={follow(route)}>{label}</a>
  return <div className="password-content">
    <div className="password-demo"><span>Demo</span>{t("پیش‌نمایش فرم؛ سرویس ورود متصل نیست.", "Form preview; sign-in service is not connected.")}</div>
    {state === "checking" ? <div className="auth-loading" role="status"><div className="auth-skeleton" /><p>{t("در حال بررسی وضعیت ورود…", "Checking sign-in status…")}</p></div> : <>
      {message && <div className={`password-message ${state === "success" ? "demo-success" : ""}`} role={["expired", "success", "verify"].includes(state) ? "status" : "alert"}><AuthIcon kind="notice" /><div><p>{message}</p>
        {state === "limited" && <small>{t("Demo: زمان انتظار از سرویس دریافت نشده؛ شمارنده نمایش داده نمی‌شود.", "Demo: no service-provided waiting period; no countdown is shown.")}</small>}
        {state === "service" && <small>{t("Demo: ارسال واقعی انجام نشده است.", "Demo: no actual request was sent.")}</small>}
        {state === "verify" && navLink(t("ادامه به تأیید شماره", "Continue to phone verification"), `${prefix}/auth/verify${suffix}`)}
        {state === "restricted" && navLink(t("تماس با پشتیبانی", "Contact support"), `${prefix}/contact`)}
        {state === "success" && <small>{t("در محصول واقعی، انتقال فقط پس از تأیید نشست و مجوز مقصد انجام می‌شود.", "In production, redirect only after validating the session and destination permissions.")}</small>}
      </div></div>}
      {state !== "success" && <form onSubmit={submit} noValidate aria-busy={busy}>
        <div className="password-field">
          <label htmlFor="login-phone">{t("شماره تلفن", "Phone number")}</label>
          <div className={`password-phone ${errors.phone ? "field-invalid" : ""}`} dir="ltr">
            <select aria-label={t("کد کشور — تنظیمات Demo", "Country code — Demo configuration")} value={country} disabled={busy} onChange={(event) => { setCountry(event.target.value); setErrors((old) => ({ ...old, phone: undefined })) }}>
              {phoneCountries.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name[en ? 1 : 0]}</option>)}
            </select>
            <input ref={phoneRef} id="login-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} disabled={busy} placeholder="912 345 6789" aria-invalid={!!errors.phone} aria-describedby={`phone-hint${errors.phone ? " phone-error" : ""}`} onChange={(event) => { setPhone(normalizeDigits(event.target.value)); setErrors((old) => ({ ...old, phone: undefined })) }} />
          </div>
          <small id="phone-hint">{t("ارقام فارسی یا انگلیسی؛ قالب کشورها طبق تنظیمات Demo.", "Persian or English digits. Country formats follow Demo settings.")}</small>
          {phoneError && <p id="phone-error" className="password-field-error" role="alert">{phoneError}</p>}
        </div>
        <div className="password-field">
          <label htmlFor="login-password">{t("رمز عبور", "Password")}</label>
          <AuthPasswordInput id="login-password" name="password" label={t("رمز عبور", "Password")} autoComplete="current-password" en={en} inputRef={passwordRef} value={password} visible={visible} disabled={busy} invalid={!!errors.password} describedBy={errors.password ? "password-error" : undefined} onChange={(value) => { setPassword(value); setErrors((old) => ({ ...old, password: false })) }} onToggle={() => setVisible(!visible)} onKeyDown={(event) => setCaps(event.getModifierState("CapsLock"))} onKeyUp={(event) => setCaps(event.getModifierState("CapsLock"))} onBlur={() => setCaps(false)} />
          {errors.password && <p className="password-field-error" id="password-error" role="alert">{t("رمز عبور را وارد کنید.", "Enter your password.")}</p>}
          {caps && <small role="status">{t("Caps Lock روشن است.", "Caps Lock is on.")}</small>}
          <div className="password-recovery">{navLink(t("رمز عبور را فراموش کرده‌اید؟", "Forgot your password?"), `${prefix}/auth/forgot-password${suffix}`)}</div>
        </div>
        <button className="button primary password-submit" type="submit" disabled={blocked}>{state === "sending" ? t("در حال ورود…", "Signing in…") : t("ورود به حساب", "Sign in")}<span className="auth-forward"><AuthIcon kind="arrow" /></span></button>
        <p className="password-live" role="status" aria-live="polite">{state === "sending" ? t("Demo: در حال نمایش وضعیت ارسال؛ درخواست واقعی ارسال نمی‌شود.", "Demo: previewing submission; no actual request is sent.") : ""}</p>
      </form>}
      <div className="password-divider"><span>{t("یا", "or")}</span></div>
      {navLink(t("ورود با کد یک‌بارمصرف", "Sign in with a one-time code"), `${prefix}/auth/login/otp${suffix}`, "button secondary password-otp")}
      <div className="auth-signup"><p>{t("حساب ندارید؟", "New to Nilart?")} {navLink(t("ساخت حساب", "Create an account"), `${prefix}/auth/register${suffix}`)}</p></div>
    </>}
    <details className="auth-preview password-preview"><summary>{t("حالت‌های پیش‌نمایش", "Preview states")} <span>AUTH-02 · Demo</span></summary><div>{previews.map(([value, fa, english]) => <button type="button" key={value} aria-pressed={state === value} onClick={() => preview(value)}>{en ? english : fa}</button>)}<button type="button" onClick={() => onContext("checkout")}>{t("از خرید", "From checkout")}</button><button type="button" onClick={() => onContext("commission")}>{t("از سفارش نقاشی", "From commission")}</button><button type="button" onClick={() => onContext("initial")}>{t("زمینه عمومی", "General context")}</button></div></details>
  </div>
}
