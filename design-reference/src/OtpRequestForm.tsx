import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react"
import { normalizeDigits, normalizePhone, phoneCountries, validPhone } from "./checkout"
import { AuthIcon } from "./AuthPage"
import { createDemoVerifyFlow, type DemoVerifyFlow } from "./auth"

type State = "initial" | "filled" | "invalid" | "requesting" | "accepted" | "active" | "network" | "service" | "limited" | "unknown" | "checking" | "expired"
const states: [State, string, string][] = [
  ["initial", "فرم خالی", "Empty"], ["filled", "شماره معتبر Demo", "Demo phone"], ["invalid", "خطای شماره", "Validation"],
  ["requesting", "ثبت درخواست", "Requesting"], ["accepted", "درخواست پذیرفته‌شده Demo", "Demo accepted"],
  ["active", "درخواست فعال Demo", "Demo active request"], ["network", "خطای شبکه", "Network error"],
  ["service", "سرویس غیرفعال", "Service unavailable"], ["limited", "محدودیت ارسال", "Rate limited"],
  ["unknown", "نتیجه نامشخص", "Unknown result"], ["checking", "بررسی نشست", "Checking session"], ["expired", "نشست منقضی", "Expired session"],
]

export default function OtpRequestForm({ en, suffix, navigate, phone, setPhone, country, setCountry, onContext, onContinue, purpose = "login" }: {
  en: boolean; suffix: string; navigate: (route: string) => void
  phone: string; setPhone: (value: string) => void; country: string; setCountry: (value: string) => void
  onContext: (value: "initial" | "checkout" | "commission" | "account") => void
  purpose?: "login" | "register" | "recovery"
  onContinue: (flow: DemoVerifyFlow) => void
}) {
  const t = (fa: string, english: string) => en ? english : fa
  const prefix = en ? "/en" : "/fa"
  const registering = purpose === "register"
  const recovering = purpose === "recovery"
  const verificationRoute = `${prefix}/auth/verify${suffix}`
  const [state, setState] = useState<State>("initial")
  const [error, setError] = useState<"required" | "invalid" | "country" | null>(null)
  const [flowPhone, setFlowPhone] = useState<string | null>(null)
  const [demoAccepted, setDemoAccepted] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lock = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const busy = state === "requesting" || state === "checking"
  const fingerprint = `${country}:${normalizePhone(phone, phoneCountries.some((item) => item.id === country) ? country : "IR")}`
  const canContinue = (state === "accepted" || state === "active") && flowPhone === fingerprint
  const blocked = busy || state === "limited" || state === "unknown" || state === "service" || canContinue
  const messages: Partial<Record<State, string>> = {
    accepted: recovering ? t("Demo: درخواست بازیابی در نمونه پذیرفته شد؛ پیامکی ارسال نشده، رمز تغییر نکرده و ورود انجام نشده است.", "Demo: recovery request accepted in this preview; no SMS was sent, no password changed and no sign-in occurred.") : registering ? t("Demo: درخواست تأیید ثبت‌نام پذیرفته شد؛ پیامکی ارسال نشده و حسابی ساخته نشده است.", "Demo: registration verification request accepted; no SMS was sent and no account was created.") : t("Demo: درخواست در نمونه پذیرفته شد؛ این به معنی تحویل پیامک یا ورود نیست.", "Demo: request accepted in this preview; this does not mean SMS delivery or sign-in."),
    active: recovering ? t("Demo: یک جریان بازیابی برای همین شماره قابل ادامه است.", "Demo: an active recovery flow for this number can be continued.") : registering ? t("Demo: یک جریان تأیید ثبت‌نام برای همین شماره قابل ادامه است.", "Demo: an active registration verification flow for this number can be continued.") : t("Demo: یک جریان تأیید ورود برای همین شماره قابل ادامه است.", "Demo: an active sign-in verification flow for this number can be continued."),
    network: recovering ? t("ثبت درخواست بازیابی ممکن نشد. اتصال را بررسی و دوباره تلاش کنید.", "Unable to request recovery. Check your connection and try again.") : registering ? t("ثبت درخواست ممکن نشد. اتصال را بررسی و دوباره تلاش کنید.", "Unable to submit the request. Check your connection and try again.") : t("ثبت درخواست کد ممکن نشد. اتصال را بررسی و دوباره تلاش کنید.", "Unable to request a code. Check your connection and try again."),
    service: recovering ? t("بازیابی رمز در حال حاضر در دسترس نیست.", "Password recovery is currently unavailable.") : registering ? t("ثبت‌نام در حال حاضر در دسترس نیست.", "Registration is currently unavailable.") : t("دریافت کد در حال حاضر در دسترس نیست.", "Code delivery is currently unavailable."),
    limited: t("تعداد درخواست‌ها بیش از حد مجاز است. پس از زمان اعلام‌شده دوباره تلاش کنید.", "Too many requests. Try again after the indicated waiting period."),
    unknown: registering || recovering ? t("نتیجه درخواست هنوز تأیید نشده است.", "The request result has not been confirmed yet.") : t("نتیجه درخواست هنوز مشخص نشده است.", "The request result has not been confirmed yet."),
    expired: t("نشست شما پایان یافته است. دوباره وارد شوید.", "Your session has expired. Sign in again."),
  }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(route)
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (lock.current || blocked) return
    const issue = !phone.trim() ? "required" : !phoneCountries.some((item) => item.id === country) ? "country"
      : !/^[+\d\s()-]+$/.test(normalizeDigits(phone)) || !validPhone(phone, country) ? "invalid" : null
    setError(issue)
    if (issue) { input.current?.focus(); return }
    lock.current = true
    setState("requesting")
    // Explicit user-selected simulation; no SMS, API call, account lookup or session is created.
    timer.current = setTimeout(() => {
      lock.current = false
      if (demoAccepted) { setFlowPhone(fingerprint); setState("accepted") }
      else setState("service")
    }, 800)
  }
  const changePhone = (value: string) => {
    setPhone(normalizeDigits(value))
    setError(null)
    setFlowPhone(null)
    if (state === "active" || state === "accepted") setState("initial")
    // Limits and unknown outcomes intentionally survive edits.
  }
  const preview = (value: State) => {
    if (timer.current) clearTimeout(timer.current)
    lock.current = false
    setError(value === "invalid" ? "invalid" : null)
    setState(value)
    setFlowPhone(null)
    if (value === "initial") setPhone("")
    if (["filled", "active", "accepted"].includes(value)) {
      setPhone("09123456789"); setCountry("IR")
      if (value !== "filled") setFlowPhone("IR:9123456789")
    }
  }
  const errorText = error === "required" ? t("شماره تلفن را وارد کنید.", "Enter your phone number.")
    : error === "country" ? t("ارسال کد برای این کشور پشتیبانی نمی‌شود.", "Code delivery is not supported for this country.")
    : t("شماره تلفن معتبر وارد کنید.", "Enter a valid phone number.")
  return <div className="password-content otp-content">
    <div className="password-demo"><span>Demo</span>{t("سرویس ارسال کد متصل نیست؛ کشورها تنظیمات نمونه‌اند.", "Code delivery is not connected; countries are Demo settings.")}</div>
    {state === "checking" ? <div className="auth-loading" role="status"><div className="auth-skeleton" /><p>{t("در حال بررسی وضعیت ورود…", "Checking sign-in status…")}</p></div> : <>
      {messages[state] && <div className="password-message" role={["active", "accepted", "expired"].includes(state) ? "status" : "alert"}><AuthIcon kind="notice" /><div><p>{messages[state]}</p>
        {state === "limited" && <small>{t("زمان معتبر از سرویس دریافت نشده؛ شمارنده فرضی نداریم.", "No service-provided waiting period; no simulated countdown.")}</small>}
        {state === "unknown" && <small>{t("برای جلوگیری از ارسال تکراری، درخواست دوباره متوقف است. بازیابی وضعیت به سرویس نیاز دارد.", "Retry is paused to avoid duplicate requests. Recovering the flow requires the live service.")}</small>}
      </div></div>}
      <form noValidate onSubmit={submit} aria-busy={busy}>
        <div className="password-field">
          <label htmlFor="otp-phone">{recovering ? t("شماره تلفن حساب", "Account phone number") : t("شماره تلفن", "Phone number")}</label>
          <div className={`password-phone ${error ? "field-invalid" : ""}`} dir="ltr">
            <select value={country} disabled={busy} aria-label={t("کد کشور — Demo", "Country code — Demo")} onChange={(event) => { setCountry(event.target.value); setError(null); setFlowPhone(null); if (state === "active" || state === "accepted") setState("initial") }}>
              {phoneCountries.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name[en ? 1 : 0]}</option>)}
            </select>
            <input ref={input} id="otp-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" dir="ltr" value={phone} disabled={busy} placeholder="912 345 6789" aria-invalid={!!error} aria-describedby={`otp-phone-hint${error ? " otp-phone-error" : ""}`} onChange={(event) => changePhone(event.target.value)} />
          </div>
          <small id="otp-phone-hint">{registering ? t("برای تأیید شماره، کد یک‌بارمصرف درخواست می‌شود.", "A one-time code will be requested to verify your phone number.") : t("از شماره تلفن حساب خود استفاده کنید.", "Use the phone number associated with your account.")}</small>
          {error && <p className="password-field-error" id="otp-phone-error" role="alert">{errorText}</p>}
        </div>
        {canContinue ? <a href={verificationRoute} onClick={(event) => { event.preventDefault(); onContinue(createDemoVerifyFlow(purpose, phone)) }} className="button primary password-submit">{recovering ? t("ادامه تأیید کد بازیابی", "Continue recovery verification") : registering ? t("ادامه تأیید شماره", "Continue phone verification") : t("ادامه تأیید کد", "Continue verification")}<span className="auth-forward"><AuthIcon kind="arrow" /></span></a>
          : <button type="submit" className="button primary password-submit" disabled={blocked}>{busy ? t("در حال ثبت درخواست…", "Requesting code…") : recovering ? t("دریافت کد بازیابی", "Get recovery code") : registering ? t("دریافت کد تأیید", "Get verification code") : t("دریافت کد ورود", "Get sign-in code")}<span className="auth-forward"><AuthIcon kind="arrow" /></span></button>}
        <p className="password-live" role="status" aria-live="polite">{state === "requesting" ? t("Demo: نمایش ثبت درخواست؛ پیامکی ارسال نمی‌شود.", "Demo: previewing the request; no SMS is sent.") : ""}</p>
      </form>
      <p className="otp-eligibility">{recovering ? t("اگر بازیابی برای این شماره قابل انجام باشد، کد تأیید ارسال می‌شود.", "If recovery is available for this number, a verification code will be sent.") : registering ? t("اگر درخواست قابل انجام باشد، کد تأیید برای این شماره ارسال می‌شود.", "If the request can be processed, a verification code will be sent to this number.") : t("اگر این شماره برای ورود قابل استفاده باشد، کد تأیید ارسال می‌شود.", "If this number is eligible for sign-in, a verification code will be sent.")}</p>
      {recovering ? <>
        <div className="password-divider"><span>{t("روش دیگر", "Another way")}</span></div>
        <a className="button secondary password-otp" href={`${prefix}/auth/login/otp${suffix}`} onClick={follow(`${prefix}/auth/login/otp${suffix}`)}>{t("ورود با کد یک‌بارمصرف", "Sign in with a one-time code")}</a>
        <p className="otp-eligibility">{t("اگر به شماره تلفن دسترسی دارید، می‌توانید روش ورود با کد را نیز انتخاب کنید.", "If you can access your phone number, you can also choose code-based sign-in.")}</p>
        <div className="recovery-password-link"><a className="text-link" href={`${prefix}/auth/login/password${suffix}`} onClick={follow(`${prefix}/auth/login/password${suffix}`)}>{t("بازگشت به ورود با رمز", "Back to password sign-in")}</a></div>
        <section className="recovery-support" aria-labelledby="recovery-support-title"><h2 id="recovery-support-title">{t("به شماره تلفن دسترسی ندارید؟", "Can’t access your phone number?")}</h2><p>{t("برای بررسی راه‌های کمک، با پشتیبانی تماس بگیرید.", "Contact support to check available assistance.")}</p><a className="text-link" href={`${prefix}/contact`} onClick={follow(`${prefix}/contact`)}>{t("تماس با پشتیبانی", "Contact support")}</a></section>
        <p className="otp-safety">{t("کد تأیید و رمز عبور را با دیگران به اشتراک نگذارید.", "Do not share your verification code or password.")}</p>
      </> : registering ? <>
        <p className="register-privacy">{t("نحوه استفاده از اطلاعات را در ", "Read how your information is used in the ")}<a href={`${prefix}/privacy`} onClick={follow(`${prefix}/privacy`)}>{t("سیاست حریم خصوصی", "privacy policy")}</a>{t(" بخوانید.", ".")}</p>
        <div className="auth-signup register-signin"><p>{t("حساب دارید؟", "Already have an account?")} <a href={`${prefix}/auth/login${suffix}`} onClick={follow(`${prefix}/auth/login${suffix}`)}>{t("وارد شوید", "Sign in")}</a></p></div>
      </> : <>
      <div className="password-divider"><span>{t("یا", "or")}</span></div>
      <a className="button secondary password-otp" href={`${prefix}/auth/login/password${suffix}`} onClick={follow(`${prefix}/auth/login/password${suffix}`)}>{t("با رمز عبور وارد شوید", "Sign in with password")}</a>
      <div className="auth-signup"><p>{t("حساب ندارید؟", "New to Nilart?")} <a href={`${prefix}/auth/register${suffix}`} onClick={follow(`${prefix}/auth/register${suffix}`)}>{t("ساخت حساب", "Create an account")}</a></p></div>
      <p className="otp-safety">{t("کد تأیید را با دیگران به اشتراک نگذارید.", "Do not share your verification code.")}</p>
      </>}
    </>}
    <details className="auth-preview password-preview"><summary>{t("حالت‌های پیش‌نمایش", "Preview states")} <span>{recovering ? "AUTH-07" : registering ? "AUTH-04" : "AUTH-03"} · Demo</span></summary>
      <label className="otp-demo-toggle"><input type="checkbox" checked={demoAccepted} onChange={(event) => setDemoAccepted(event.target.checked)} />{t("Demo: شبیه‌سازی پذیرش درخواست با دکمه دریافت کد", "Demo: simulate an accepted request using Get sign-in code")}</label>
      <div>{states.map(([value, fa, english]) => <button type="button" key={value} aria-pressed={state === value} onClick={() => preview(value)}>{en ? english : fa}</button>)}
        {(["checkout", "commission", "account", "initial"] as const).map((value, index) => <button key={value} type="button" onClick={() => onContext(value)}>{en ? ["Checkout", "Commission", "Account", "General"][index] : ["خرید", "سفارش نقاشی", "پنل", "عمومی"][index]}</button>)}
      </div>
    </details>
  </div>
}
