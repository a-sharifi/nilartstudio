import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react"
import { AuthIcon } from "./AuthPage"
import { demoAuthPolicy, normalizeDigits } from "./checkout"
import { createDemoVerifyFlow, type VerifyFlow } from "./auth"
type State = "initial" | "verifying" | "invalidCode" | "expiredCode" | "resending" | "resendError" | "limited" | "network" | "unknown" | "invalidFlow" | "expiredFlow" | "loading" | "service" | "success"
const previews: [State, string, string][] = [
  ["initial", "ورودی خالی", "Empty"], ["verifying", "در حال تأیید", "Verifying"], ["invalidCode", "کد نامعتبر", "Invalid code"],
  ["expiredCode", "انقضای کد", "Expired code"], ["resending", "ارسال مجدد", "Resending"], ["resendError", "خطای ارسال مجدد", "Resend error"],
  ["limited", "محدودیت تلاش", "Rate limited"], ["network", "خطای شبکه", "Network error"], ["unknown", "نتیجه نامشخص", "Unknown result"],
  ["invalidFlow", "جریان نامعتبر", "Invalid flow"], ["expiredFlow", "پایان جریان", "Expired flow"], ["loading", "بازیابی جریان", "Loading flow"],
  ["success", "موفقیت Demo", "Demo success"],
]
export default function VerifyPage({ en, suffix, flow, setFlow, navigate, target, onRegistrationContinue, onRecoveryContinue, liveVerify, liveResend }: {
  en: boolean; suffix: string; flow: VerifyFlow | null; setFlow: (flow: VerifyFlow | null) => void; navigate: (route: string) => void; target: string | null
  onRegistrationContinue: (maskedPhone: string) => void
  onRecoveryContinue: (maskedPhone: string) => void
  liveVerify?: (code: string) => Promise<"success" | "invalidCode" | "limited" | "network" | "service" | "unknown">
  liveResend?: () => Promise<"initial" | "resendError" | "limited" | "network" | "service" | "unknown">
}) {
  const t = (fa: string, english: string) => en ? english : fa
  const prefix = en ? "/en" : "/fa"
  const purpose = flow?.purpose || "login"
  const [state, setState] = useState<State>("initial")
  const [code, setCode] = useState("")
  const [fieldError, setFieldError] = useState(false)
  const [demoSuccess, setDemoSuccess] = useState(false)
  const [now, setNow] = useState(Date.now())
  const heading = useRef<HTMLHeadingElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousPurpose = useRef(purpose)
  const invalidFlow = !flow || state === "invalidFlow" || state === "expiredFlow" || (!!liveVerify && (flow.demo || flow.expiresAt <= now))
  const busy = state === "verifying" || state === "resending" || state === "loading"
  const blocked = busy || invalidFlow || state === "limited" || state === "unknown" || state === "success"
  const remaining = flow?.resendAt ? Math.max(0, Math.ceil((flow.resendAt - now) / 1000)) : 0
  const phoneRoute = `${prefix}/auth/${purpose === "register" ? "register" : purpose === "recovery" ? "forgot-password" : "login/otp"}${suffix}`
  const title = purpose === "register" ? t("شماره تلفن خود را تأیید کنید", "Verify your phone number") : purpose === "recovery" ? t("کد بازیابی را وارد کنید", "Enter your recovery code") : t("کد ورود را وارد کنید", "Enter your sign-in code")
  useEffect(() => {
    document.documentElement.lang = en ? "en" : "fa"
    document.documentElement.dir = en ? "ltr" : "rtl"
    document.title = `${title} | Nilart`
    heading.current?.focus({ preventScroll: true })
  }, [en, title])
  useEffect(() => {
    if (previousPurpose.current !== purpose) { setCode(""); setFieldError(false); setState("initial"); previousPurpose.current = purpose }
  }, [purpose])
  useEffect(() => {
    if (!flow?.resendAt && !liveVerify) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [flow?.resendAt])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const follow = (route: string, edit = false, preserveCode = false) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (!preserveCode) setCode("")
    if (edit) setFlow(null)
    navigate(route)
  }
  const run = (next: State, result: State, clearCode = false) => {
    lock.current = true
    setState(next)
    timer.current = setTimeout(() => { lock.current = false; if (clearCode) setCode(""); setState(result) }, 800)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (blocked || lock.current || !flow) return
    if (!new RegExp(`^\\d{${flow.digits}}$`).test(code)) { setFieldError(true); input.current?.focus(); return }
    setFieldError(false)
    if (liveVerify) {
      lock.current = true; setState("verifying")
      try { setState(await liveVerify(code)); setCode("") }
      catch { setState("unknown") }
      finally { lock.current = false }
      return
    }
    // Explicit Demo outcome only; never issue a grant, create a session or accept a real OTP.
    run("verifying", demoSuccess ? "success" : "service", demoSuccess)
  }
  const resend = async () => {
    if (blocked || lock.current || remaining || !flow) return
    if (liveResend) {
      lock.current = true; setState("resending")
      try { setState(await liveResend()); setCode(""); setNow(Date.now()) }
      catch { setState("unknown") }
      finally { lock.current = false }
      return
    }
    run("resending", "resendError")
  }
  const preview = (next: State) => {
    if (liveVerify) return
    if (timer.current) clearTimeout(timer.current)
    lock.current = false
    setState(next); setFieldError(false)
    if (next === "initial" || next === "success") setCode("")
  }
  const messages: Partial<Record<State, string>> = {
    invalidCode: t("کد معتبر نیست یا منقضی شده است.", "The code is invalid or has expired."),
    expiredCode: t("اعتبار کد پایان یافته است. کد جدید درخواست کنید.", "The code has expired. Request a new one."),
    resendError: t("ثبت درخواست ارسال مجدد ممکن نشد؛ تحویل پیامک تأیید نشده است.", "Unable to request another code; SMS delivery is not confirmed."),
    limited: t("تعداد تلاش‌ها بیش از حد مجاز است. پس از زمان اعلام‌شده دوباره تلاش کنید.", "Too many attempts. Try again after the indicated waiting period."),
    network: t("ارتباط برقرار نشد. دوباره تلاش کنید.", "Unable to connect. Try again."),
    unknown: t("نتیجه تأیید هنوز مشخص نشده است.", "The verification result has not been confirmed yet."),
    service: t("تأیید کد در حال حاضر ممکن نیست.", "Code verification is currently unavailable."),
    expiredFlow: t("فرایند تأیید پایان یافته است. دوباره شروع کنید.", "The verification flow has expired. Start again."),
    invalidFlow: t("برای تأیید شماره، ابتدا کد درخواست کنید.", "Request a code before verifying your phone number."),
    success: purpose === "register" ? t("Demo: نمونه تأیید شماره؛ ثبت‌نام هنوز کامل نیست و مجوز واقعی ساخت رمز ایجاد نشده است.", "Demo: phone verification preview; registration is not complete and no real set-password grant exists.")
      : purpose === "recovery" ? t("Demo: نمونه تأیید بازیابی؛ رمز تغییر نکرده و مجوز واقعی ایجاد نشده است.", "Demo: recovery verification preview; no password changed and no real grant exists.")
      : t("Demo: نمونه ورود موفق؛ هیچ نشست معتبری ایجاد نشده است.", "Demo: successful sign-in preview; no valid session exists."),
  }
  const message = invalidFlow ? messages.invalidFlow : liveVerify && state === "success" ? t("تأیید موفق بود و نشست شما بررسی شد.", "Verification succeeded and your session was checked.") : messages[state]
  const destination = purpose === "register" ? `${prefix}/auth/register/password${suffix}` : purpose === "recovery" ? `${prefix}/auth/reset-password${suffix}` : target || "/account"
  return <div className="auth-shell" dir={en ? "ltr" : "rtl"}>
    <a className="skip-link" href="#verify-title">{t("رفتن به محتوای اصلی", "Skip to content")}</a>
    <header className="auth-header"><a className="wordmark" href="/" onClick={follow("/")} aria-label={t("نیل‌آرت، صفحه اصلی", "Nilart home")}><span>nilart<span className="wordmark-dot">.</span></span><small>ART IN EVERYDAY LIFE</small></a><a className="auth-language" href={`${en ? "/fa" : "/en"}/auth/verify${suffix}`} onClick={follow(`${en ? "/fa" : "/en"}/auth/verify${suffix}`, false, true)}><AuthIcon kind="globe" />{en ? "فارسی" : "English"}</a></header>
    <main className="auth-main"><div className="auth-column">
      <a className="auth-back" href={phoneRoute} onClick={follow(phoneRoute, true)}><span className="auth-back-arrow"><AuthIcon kind="arrow" /></span>{t("بازگشت به مرحله شماره", "Back to phone number")}</a>
      {target && (target.includes("checkout") || target === "/cart" || target.includes("commissions")) && <div className="auth-notice">{target.includes("commissions") ? t("پس از تکمیل احراز هویت، درخواست خود را ادامه می‌دهید.", "After authentication, you can continue your commission request.") : t("پس از ورود، به ادامه خرید برمی‌گردید.", "After signing in, you will return to your purchase.")}</div>}
      <section className="auth-card" aria-labelledby="verify-title">
        {purpose !== "login" && <ol className="register-steps" aria-label={t("مراحل تأیید", "Verification steps")}>{[t("شماره تلفن", "Phone number"), t("تأیید شماره", "Verify phone"), purpose === "register" ? t("ساخت رمز", "Set password") : t("رمز جدید", "New password")].map((label, index) => <li key={label} aria-current={index === 1 ? "step" : undefined}><span className="register-step-number">{en ? index + 1 : ["۱", "۲", "۳"][index]}</span><span>{label}</span></li>)}</ol>}
        <div className="auth-eyebrow">NILART · AUTH-05</div>
        <h1 ref={heading} id="verify-title" tabIndex={-1}>{title}</h1><p className="auth-intro">{t("کد دریافتی برای شماره زیر را وارد کنید.", "Enter the code received for the number below.")}</p>
        <div className="password-content">
          {!liveVerify && <div className="password-demo"><span>Demo</span>{t("بدون اتصال به سرویس؛ تعداد رقم و زمان‌ها تنظیمات نمونه‌اند.", "No live service; code length and timings are Demo settings.")}</div>}
          {flow && !flow.demo && flow.sandbox && flow.developmentCode && !invalidFlow && state!=="success" && <div className="password-message" role="status"><p>{t("کد تأیید در حالت توسعه: ","Development verification code: ")}<strong dir="ltr">{flow.developmentCode}</strong></p></div>}
          {flow && !flow.demo && flow.sandbox && <p className="password-demo" role="status">{t("پیامک آزمایشی محلی؛ کد در صندوق پیامک آزمایشی است. پیامک واقعی ارسال نشده است.","Local sandbox SMS: the code is in the test inbox. No real SMS was sent.")}</p>}
          {flow && <div className="verify-phone"><bdi dir="ltr">{flow.maskedPhone}</bdi><a className="text-link" href={phoneRoute} onClick={follow(phoneRoute, true)}>{t("ویرایش شماره", "Edit phone number")}</a></div>}
          {message && <div id="verify-status-message" className={`password-message ${state === "success" ? "demo-success" : ""}`} role={state === "success" ? "status" : "alert"}><AuthIcon kind="notice" /><div><p>{message}</p>{state === "limited" && <small>{t("زمان معتبر از سرویس دریافت نشده؛ شمارنده فرضی نمایش داده نمی‌شود.", "No service-provided waiting period; no countdown is shown.")}</small>}{state === "unknown" && <small>{t("تأیید و ارسال مجدد متوقف‌اند؛ بازیابی وضعیت نیازمند سرویس است.", "Verification and resend are paused; status recovery requires the live service.")}</small>}</div></div>}
          {state === "loading" ? <div className="auth-loading" role="status"><div className="auth-skeleton" /><p>{t("در حال بازیابی جریان تأیید…", "Restoring verification flow…")}</p></div>
            : invalidFlow ? <a className="button primary password-otp" href={phoneRoute} onClick={follow(phoneRoute, true)}>{t("بازگشت به دریافت کد", "Back to requesting a code")}</a>
            : state === "success" ? <div className="verify-success">{purpose === "login" ? <p>{t("مقصد پس از تأیید واقعی نشست و مجوز:", "Destination after real session and permission checks:")} <bdi>{destination}</bdi></p> : <a className="button primary password-otp" href={destination} onClick={(event) => { event.preventDefault(); setCode(""); if (purpose === "register") onRegistrationContinue(flow!.maskedPhone); else onRecoveryContinue(flow!.maskedPhone) }}>{purpose === "register" ? t("پیش‌نمایش مقصد ساخت رمز · AUTH-06", "Preview set-password destination · AUTH-06") : t("پیش‌نمایش رمز جدید · AUTH-08", "Preview reset-password destination · AUTH-08")}</a>}</div>
            : <><form noValidate onSubmit={submit} aria-busy={busy}>
              <div className="password-field"><label htmlFor="verify-code">{t("کد تأیید", "Verification code")}</label><input ref={input} className="verify-code" id="verify-code" name="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" value={code} maxLength={flow!.digits} disabled={busy} aria-invalid={fieldError || state === "invalidCode" || state === "expiredCode"} aria-describedby={`verify-hint${fieldError ? " verify-error" : ""}${message ? " verify-status-message" : ""}`} onChange={(event) => { setCode(normalizeDigits(event.target.value).replace(/\s/g, "").replace(/\D/g, "").slice(0, flow!.digits)); setFieldError(false) }} /><small id="verify-hint">{liveVerify ? t(`کد ${flow!.digits} رقمی؛ تأیید با دکمه یا Enter.`, `${flow!.digits}-digit code; submit using the button or Enter.`) : t(`کد ${flow!.digits} رقمی · تنظیمات Demo؛ تأیید فقط با دکمه یا Enter.`, `${flow!.digits}-digit code · Demo settings; submit using the button or Enter.`)}</small>{fieldError && <p id="verify-error" className="password-field-error" role="alert">{t("کد تأیید را کامل وارد کنید.", "Enter the complete verification code.")}</p>}</div>
              <button className="button primary password-submit" type="submit" disabled={blocked}>{state === "verifying" ? t("در حال تأیید…", "Verifying…") : purpose === "register" ? t("تأیید و ادامه", "Verify and continue") : purpose === "recovery" ? t("تأیید و ساخت رمز جدید", "Verify and reset password") : t("تأیید و ورود", "Verify and sign in")}<span className="auth-forward"><AuthIcon kind="arrow" /></span></button>
              <p className="password-live" role="status">{state === "verifying" ? liveVerify ? t("در حال بررسی کد…", "Verifying your code…") : t("Demo: نمایش بررسی کد؛ تأیید واقعی انجام نمی‌شود.", "Demo: previewing verification; no actual verification.") : ""}</p>
            </form><div className="verify-resend"><p>{t("کد را دریافت نکرده‌اید؟", "Didn’t receive a code?")}</p><button type="button" disabled={blocked || remaining > 0} onClick={resend}>{state === "resending" ? t("در حال ثبت درخواست…", "Requesting code…") : remaining > 0 ? liveVerify ? t(`ارسال مجدد پس از ${remaining} ثانیه`, `Resend available in ${remaining}s`) : t(`ارسال مجدد پس از ${remaining} ثانیه · Demo`, `Resend available in ${remaining}s · Demo`) : t("ارسال مجدد کد", "Resend code")}</button><p role="status">{state === "resending" ? liveVerify ? t("در حال درخواست کد جدید…", "Requesting a new code…") : t("Demo: پیامکی ارسال نمی‌شود.", "Demo: no SMS is sent.") : ""}</p></div></>}
          <div className="verify-security"><p>{t("کد تأیید را با دیگران به اشتراک نگذارید.", "Do not share your verification code.")}</p><p>{t("پشتیبانی نیل‌آرت از شما رمز عبور یا کد تأیید درخواست نمی‌کند.", "Nilart support will not ask for your password or verification code.")}</p><a className="text-link" href={`${prefix}/contact`} onClick={follow(`${prefix}/contact`)}>{t("تماس با پشتیبانی", "Contact support")}</a></div>
          {!liveVerify && <details className="auth-preview password-preview"><summary>{t("حالت‌های پیش‌نمایش", "Preview states")} <span>AUTH-05 · Demo</span></summary><div>{(["login", "register", "recovery"] as const).map((value, index) => <button key={value} type="button" onClick={() => { setFlow(createDemoVerifyFlow(value, "09123456789")); preview("initial") }}>{en ? ["Sign-in Demo", "Registration Demo", "Recovery Demo"][index] : ["ورود Demo", "ثبت‌نام Demo", "بازیابی Demo"][index]}</button>)}{previews.map(([value, fa, english]) => <button key={value} type="button" aria-pressed={state === value} onClick={() => preview(value)}>{en ? english : fa}</button>)}<button type="button" onClick={() => { if (flow) { setNow(Date.now()); setFlow({ ...flow, resendAt: Date.now() + demoAuthPolicy.resendSeconds * 1000 }); preview("initial") } }}>{t("انتظار ارسال مجدد Demo", "Demo resend wait")}</button></div><label className="otp-demo-toggle"><input type="checkbox" checked={demoSuccess} onChange={(event) => setDemoSuccess(event.target.checked)} />{t("Demo: شبیه‌سازی نتیجه موفق دکمه تأیید", "Demo: simulate a successful verification result")}</label><p>{t("برای بررسی کد بخشی یا کامل، در ورودی تایپ یا paste کنید؛ هیچ کد نمونه‌ای منتشر نمی‌شود.", "Type or paste a partial or complete code in the input; no sample code is published.")}</p></details>}
        </div>
      </section>
    </div></main>
    <footer className="auth-footer"><span>{t("نیل‌آرت؛ هنر در لحظه‌های روزمره", "Nilart. Art in everyday life.")}</span><nav aria-label={t("لینک‌های راهنما", "Helpful links")}>{[[t("قوانین خرید", "Purchase terms"), "terms"], [t("حریم خصوصی", "Privacy policy"), "privacy"], [t("تماس", "Contact"), "contact"]].map(([label, route]) => <a key={route} href={`${prefix}/${route}`} onClick={follow(`${prefix}/${route}`)}>{label}</a>)}</nav></footer>
  </div>
}
