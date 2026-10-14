import { useEffect, useRef, useState, type MouseEvent } from "react"
import "./auth.css"
import "./auth-phone.css"
import PasswordForm from "./PasswordForm"
import OtpRequestForm from "./OtpRequestForm"
import VerifyPage from "./VerifyPage"
import type { LiveAuthApi, VerifyFlow } from "./auth"
import RegistrationPasswordPage, { type PasswordGrant } from "./RegistrationPasswordPage"
import SessionExpiredPage from "./SessionExpiredPage"
import AccountRestrictedPage from "./AccountRestrictedPage"
import LogoutPage from "./LogoutPage"
import { safeShopReturn } from "./shop"

type Mode = "initial" | "checkout" | "commission" | "account" | "expired" | "loading" | "partial" | "empty" | "error"

// Client-only memory survives Next route remounts, never a full reload. No tokens
// are written to storage or URLs. Demo data cannot enter this live store.
const liveMemory: { flow: VerifyFlow | null; registration: PasswordGrant | null; recovery: PasswordGrant | null } = {
  flow: null, registration: null, recovery: null,
}

export function AuthIcon({ kind }: { kind: "lock" | "sms" | "arrow" | "globe" | "notice" }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "lock" ? <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" /></> : kind === "sms" ? <><path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z" /><path d="M8 8h8M8 12h5" /></> : kind === "globe" ? <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></> : kind === "notice" ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 17h.01" /></> : <path d="M19 12H5m6-6-6 6 6 6" />}
  </svg>
}

// Explicit design fixtures only. These never establish a session or send an SMS.
const modes: [Mode, string, string][] = [
  ["initial", "عمومی", "General"], ["checkout", "خرید", "Checkout"], ["commission", "سفارش نقاشی", "Commission"],
  ["account", "حساب کاربری", "Account"], ["expired", "نشست منقضی", "Expired session"], ["loading", "بررسی نشست", "Loading"],
  ["partial", "روش غیرفعال", "Partial availability"], ["empty", "بدون روش فعال", "Unavailable"], ["error", "خطای شبکه", "Network error"],
]

function validReturn(search: string) {
  const value = new URLSearchParams(search).get("returnTo")
  const shopReturn = value && safeShopReturn(value)
  if (shopReturn) return shopReturn
  if (/^\/(?:fa|en)\/account\/profile$/.test(value || "")) return value
  // Only known public/internal destinations; no query data, role panels or arbitrary redirects.
  if (!value || /[\\?#%]/.test(value)) return null
  return /^(\/cart|\/checkout(?:\/(?:address|delivery|payment))?|\/account|\/(?:fa|en)\/commissions(?:\/new(?:\/(?:references|preferences|assessment))?)?|\/products\/[\w-]+)$/.test(value) ? value : null
}

export function clearLiveAuthMemory() {
  liveMemory.flow = null; liveMemory.registration = null; liveMemory.recovery = null
}

export default function AuthPage({ page, search, navigate, liveSignIn, liveApi }: { page: string; search: string; navigate: (route: string) => void; liveSignIn?: (phone: string, password: string) => Promise<"incorrect" | "service" | "limited" | "success" | "network">; liveApi?: LiveAuthApi }) {
  const en = page.startsWith("/en/")
  const t = (fa: string, english: string) => en ? english : fa
  const prefix = en ? "/en" : "/fa"
  const [mode, setMode] = useState<Mode>("initial")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("IR")
  const [verifyFlow, setFlowState] = useState<VerifyFlow | null>(() => liveApi ? liveMemory.flow : null)
  const [passwordGrant, setRegistrationState] = useState<PasswordGrant | null>(() => liveApi ? liveMemory.registration : null)
  const [recoveryGrant, setRecoveryState] = useState<PasswordGrant | null>(() => liveApi ? liveMemory.recovery : null)
  const setVerifyFlow = (flow: VerifyFlow | null) => {
    if (liveApi && typeof window !== "undefined") { if (flow?.demo) return; liveMemory.flow = flow }
    setFlowState(flow)
  }
  const setPasswordGrant = (grant: PasswordGrant | null) => {
    if (liveApi && typeof window !== "undefined") { if (grant?.demo) return; liveMemory.registration = grant }
    setRegistrationState(grant)
  }
  const setRecoveryGrant = (grant: PasswordGrant | null) => {
    if (liveApi && typeof window !== "undefined") { if (grant?.demo) return; liveMemory.recovery = grant }
    setRecoveryState(grant)
  }
  const operation = useRef(0)
  useEffect(() => {
    operation.current += 1
    return () => { operation.current += 1 }
  }, [page])
  useEffect(() => liveApi?.subscribe?.((event) => {
    if (event.type === "revalidate") {
      if (!page.endsWith("/logout") && !page.endsWith("/session-expired")) void liveApi.checkSession()
      return
    }
    if (event.source === "observation") operation.current += 1
    clearLiveAuthMemory()
    setFlowState(null); setRegistrationState(null); setRecoveryState(null); setPhone("")
  }), [liveApi, page])
  const [retrying, setRetrying] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const returnTo = validReturn(search)
  const isPassword = page.endsWith("/password")
  const isOtp = page.endsWith("/otp")
  const isRegister = page.endsWith("/register")
  const isRecovery = page.endsWith("/forgot-password") || page.endsWith("/recovery")
  const isVerify = page.endsWith("/verify")
  const isRegistrationPassword = /\/register\/(?:password|set-password)$/.test(page)
  const isResetPassword = page.endsWith("/reset-password")
  const isSessionExpired = page.endsWith("/session-expired")
  const isRestricted = page.endsWith("/account-restricted")
  const isLogout = page.endsWith("/logout")
  const nextStep = /\/(password|otp|register|recovery|verify|set-password|reset-password|logout)$/.test(page)
  const context = mode === "initial" ? returnTo?.startsWith("/checkout") || returnTo === "/cart" ? "checkout" : returnTo?.includes("/commissions") ? "commission" : returnTo === "/account" ? "account" : "initial" : mode
  const demoReturn = context === "checkout" ? "/cart" : context === "commission" ? `${prefix}/commissions/new` : context === "account" ? "/account" : null
  const target = returnTo || demoReturn
  const suffix = target ? `?returnTo=${encodeURIComponent(target)}` : ""
  const loading = mode === "loading" || retrying
  useEffect(() => {
    if (isVerify || isRegistrationPassword || isResetPassword || isSessionExpired || isRestricted || isLogout) return
    document.documentElement.lang = en ? "en" : "fa"
    document.documentElement.dir = en ? "ltr" : "rtl"
    document.title = isRecovery ? t("فراموشی رمز عبور | نیل‌آرت", "Forgot password | Nilart") : isRegister ? t("ساخت حساب | نیل‌آرت", "Create your account | Nilart") : isOtp ? t("ورود با کد یک‌بارمصرف | نیل‌آرت", "Sign in with a one-time code | Nilart") : isPassword ? t("ورود با رمز عبور | نیل‌آرت", "Sign in with password | Nilart") : t("انتخاب روش ورود | نیل‌آرت", "Choose how to sign in | Nilart")
    heading.current?.focus({ preventScroll: true })
  }, [page])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(route)
  }
  const retry = () => {
    setRetrying(true)
    timer.current = setTimeout(() => { setRetrying(false); setMode("initial") }, 650)
  }
  const back = isRecovery ? `${prefix}/auth/login/password${suffix}` : context === "checkout" ? "/cart" : isRegister ? target || `${prefix}/auth/login${suffix}` : isPassword || isOtp ? `${prefix}/auth/login${suffix}` : target || "/"
  const languageRoute = `${en ? "/fa" : "/en"}${page === "/login" ? "/auth/login" : page.replace(/^\/(?:fa|en)/, "")}${suffix}`
  const registrationVerify = page.endsWith("/register/verify")
  const setPasswordDestination = page.endsWith("/register/set-password") || page.endsWith("/recovery/reset-password")
  const notice = context === "checkout" ? isRecovery ? t("پس از بازیابی و ورود، به ادامه خرید برمی‌گردید.", "After recovery and sign-in, you will return to your purchase.") : isRegister ? t("برای ادامه خرید، حساب خود را بسازید.", "Create your account to continue your purchase.") : t("برای ادامه خرید وارد شوید.", "Sign in to continue your purchase.")
    : context === "commission" ? isRecovery ? t("پس از بازیابی و ورود، درخواست نقاشی خود را ادامه می‌دهید.", "After recovery and sign-in, you can continue your commission request.") : isRegister ? t("برای ادامه درخواست نقاشی، حساب خود را بسازید.", "Create your account to continue your commission request.") : t("برای ادامه درخواست نقاشی وارد شوید.", "Sign in to continue your commission request.")
    : context === "account" ? t("برای مشاهده حساب خود وارد شوید.", "Sign in to view your account.")
    : mode === "expired" ? t("نشست شما پایان یافته است. دوباره وارد شوید.", "Your session has expired. Sign in again.") : null
  const errorState = (error: unknown) => {
    const code = error instanceof Error ? error.message : "unknown"
    return code === "limited" || code === "network" || code === "service" ? code : "unknown"
  }
  const liveRequest = liveApi ? async (value: string, purpose: "register" | "login" | "recovery") => {
    const id = ++operation.current
    setPasswordGrant(null); setRecoveryGrant(null); setVerifyFlow(null)
    try {
      const flow = await liveApi.request(value, purpose)
      if (id !== operation.current) return "unknown" as const
      setVerifyFlow(flow); navigate(`${prefix}/auth/verify${suffix}`)
      return "accepted" as const
    } catch (error) { if (errorState(error)==="limited") return {status:"limited" as const,retryAfterSeconds:(error as Error & {retryAfterSeconds?:number}).retryAfterSeconds}; return errorState(error) }
  } : undefined
  const liveVerify = liveApi ? async (code: string) => {
    if (!verifyFlow || verifyFlow.demo) return "invalidCode" as const
    const flow = verifyFlow, id = ++operation.current
    try {
      const token = await liveApi.verify(flow, code)
      if (id !== operation.current) return "unknown" as const
      if (flow.purpose !== "login" && token) {
        const grant: PasswordGrant = { demo: false, purpose: flow.purpose, maskedPhone: flow.maskedPhone, token, expiresAt: Date.now() + 600000 }
        if (flow.purpose === "register") setPasswordGrant(grant); else setRecoveryGrant(grant)
        setVerifyFlow(null)
        navigate(`${prefix}/auth/${flow.purpose === "register" ? "register/password" : "reset-password"}${suffix}`)
      }
      return "success" as const
    } catch (error) { return error instanceof Error && error.message === "invalid" ? "invalidCode" as const : errorState(error) }
  } : undefined
  const liveResend = liveApi ? async () => {
    if (!verifyFlow || verifyFlow.demo) return "resendError" as const
    const id = ++operation.current
    try {
      const replacement = await liveApi.request(verifyFlow.phone, verifyFlow.purpose)
      if (id !== operation.current) return "unknown" as const
      setVerifyFlow(replacement)
      return "initial" as const
    } catch (error) { return errorState(error) }
  } : undefined
  const liveComplete = liveApi ? async (password: string) => {
    const grant = isResetPassword ? recoveryGrant : passwordGrant
    if (!grant || grant.demo) return "invalid" as const
    const id = ++operation.current
    try {
      await liveApi.complete(grant.token, grant.purpose, password)
      if (id !== operation.current) return "unknown" as const
      if (isResetPassword) setRecoveryGrant(null); else setPasswordGrant(null)
      return grant.purpose === "recovery" ? "changed" as const : "createdSession" as const
    } catch (error) { return error instanceof Error && error.message === "invalid" ? "invalid" as const : errorState(error) }
  } : undefined
  if (isRegistrationPassword || isResetPassword) return <RegistrationPasswordPage key={isResetPassword ? "recovery" : "register"} purpose={isResetPassword ? "recovery" : "register"} en={en} suffix={suffix} grant={isResetPassword ? recoveryGrant : passwordGrant} setGrant={isResetPassword ? setRecoveryGrant : setPasswordGrant} navigate={navigate} target={target} liveComplete={liveComplete} resetFlow={() => { setVerifyFlow(null); if (isResetPassword) setRecoveryGrant(null); else setPasswordGrant(null) }} />
  if (isSessionExpired) return <SessionExpiredPage en={en} navigate={navigate} target={returnTo} liveApi={liveApi} />
  if (isRestricted) return <AccountRestrictedPage en={en} navigate={navigate} target={returnTo} />
  if (isLogout) return <LogoutPage en={en} navigate={navigate} target={returnTo} liveLogout={liveApi?.logout} liveCheck={liveApi?.checkSession} liveSubscribe={liveApi?.subscribe} clearDemoData={() => { setPhone(""); setVerifyFlow(null); setPasswordGrant(null); setRecoveryGrant(null) }} />
  if (isVerify) return <VerifyPage en={en} suffix={suffix} flow={verifyFlow} setFlow={setVerifyFlow} navigate={navigate} target={target} liveVerify={liveVerify} liveResend={liveResend} onRegistrationContinue={(maskedPhone) => { if (liveApi) return; setPasswordGrant({ demo: true, purpose: "register", maskedPhone }); navigate(`${prefix}/auth/register/password${suffix}`) }} onRecoveryContinue={(maskedPhone) => { if (liveApi) return; setRecoveryGrant({ demo: true, purpose: "recovery", maskedPhone }); navigate(`${prefix}/auth/reset-password${suffix}`) }} />
  return <div className="auth-shell" dir={en ? "ltr" : "rtl"}>
    <a className="skip-link" href="#auth-title">{t("رفتن به محتوای اصلی", "Skip to content")}</a>
    <header className="auth-header">
      <a href="/" onClick={follow("/")} className="wordmark" aria-label={t("نیل‌آرت، صفحه اصلی", "Nilart home")}><span>nilart<span className="wordmark-dot">.</span></span><small>ART IN EVERYDAY LIFE</small></a>
      <a className="auth-language" href={languageRoute} onClick={follow(languageRoute)} lang={en ? "fa" : "en"}><AuthIcon kind="globe" />{en ? "فارسی" : "English"}</a>
    </header>
    <main className="auth-main">
      <div className="auth-column">
        <a href={back} onClick={follow(back)} className="auth-back"><span className="auth-back-arrow"><AuthIcon kind="arrow" /></span>{isRecovery ? t("بازگشت به ورود با رمز", "Back to password sign-in") : context === "checkout" ? t("بازگشت به سبد", "Back to cart") : isRegister ? target ? t("بازگشت به مسیر قبلی", "Back to previous step") : t("بازگشت به انتخاب روش ورود", "Back to sign-in methods") : isPassword || isOtp ? t("بازگشت به انتخاب روش ورود", "Back to sign-in methods") : t("بازگشت به فروشگاه", "Back to store")}</a>
        {notice && <div className="auth-notice" role="status"><AuthIcon kind="notice" /><div>{notice}{context === "checkout" && <small>{t("در این پیش‌نمایش، سبد با جابه‌جایی بین صفحات حفظ می‌شود؛ ادغام پس از ورود به سرویس واقعی نیاز دارد.", "This preview retains your cart during navigation. Post-login merging requires the live service.")}</small>}</div></div>}
        <section className="auth-card" aria-labelledby="auth-title">
          {isRegister || isRecovery ? <ol className="register-steps" aria-label={isRecovery ? t("مراحل بازیابی", "Recovery steps") : t("مراحل ثبت‌نام", "Registration steps")}>{[[t("شماره تلفن", "Phone number"), 1], [isRecovery ? t("تأیید کد", "Verify code") : t("تأیید شماره", "Verify phone"), 2], [isRecovery ? t("رمز جدید", "New password") : t("ساخت رمز", "Set password"), 3]].map(([label, number], index) => <li key={number} aria-current={index === 0 ? "step" : undefined}><span className="register-step-number">{en ? number : ["۱", "۲", "۳"][index]}</span><span>{label}</span></li>)}</ol> : <div className="auth-emblem" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M9 31V19a11 11 0 0 1 22 0v12H9Z" stroke="currentColor" strokeWidth="1.2"/><path d="M15 31V21a5 5 0 0 1 10 0v10M20 8V4M9 10 6 7M31 10l3-3" stroke="currentColor" strokeWidth="1.2"/></svg></div>}
          <div className="auth-eyebrow">NILART · {t("فضایی برای هنر", "A SPACE FOR ART")}</div>
          <h1 id="auth-title" ref={heading} tabIndex={-1}>{isRecovery ? t("رمز عبور را فراموش کرده‌اید؟", "Forgot your password?") : isRegister ? t("حساب نیل‌آرت بسازید", "Create your Nilart account") : isOtp ? t("ورود با کد یک‌بارمصرف", "Sign in with a one-time code") : isPassword ? t("ورود با رمز عبور", "Sign in with password") : nextStep ? t("مرحله بعدی ورود", "Your next step") : t("به نیل‌آرت خوش آمدید", "Welcome to Nilart")}</h1>
          <p className="auth-intro">{isRecovery ? t("شماره تلفن حساب خود را وارد کنید تا درخواست کد بازیابی ثبت شود.", "Enter your account’s phone number to request a recovery code.") : isRegister ? t("ابتدا شماره تلفن خود را تأیید می‌کنید، سپس برای حساب رمز می‌سازید.", "First verify your phone number, then set a password for your account.") : isOtp ? t("شماره تلفن خود را وارد کنید تا درخواست کد ورود ثبت شود.", "Enter your phone number to request a sign-in code.") : isPassword ? t("شماره تلفن و رمز حساب خود را وارد کنید.", "Enter your phone number and account password.") : nextStep ? t("این مقصد در مرحله بعد طراحی می‌شود.", "This destination will be designed next.") : t("روش ورود به حساب خود را انتخاب کنید.", "Choose how you would like to sign in.")}</p>
          {isRecovery && <p className="recovery-next-step">{t("پس از تأیید شماره، می‌توانید رمز جدید تعیین کنید.", "After verifying your phone number, you can set a new password.")}</p>}
          {isRegister || isOtp || isRecovery ? <OtpRequestForm key={isRecovery ? "recovery" : isRegister ? "register" : "login"} purpose={isRecovery ? "recovery" : isRegister ? "register" : "login"} en={en} suffix={suffix} navigate={navigate} phone={phone} setPhone={setPhone} country={country} setCountry={setCountry} onContext={setMode} liveRequest={liveRequest} onContinue={(flow) => { if (liveApi) return; setVerifyFlow(flow); navigate(`${prefix}/auth/verify${suffix}`) }} />
          : isPassword ? <PasswordForm en={en} target={target} suffix={suffix} navigate={navigate} phone={phone} setPhone={setPhone} country={country} setCountry={setCountry} onContext={(value) => setMode(value)} liveSignIn={liveSignIn} otpEnabled={!!liveApi} />
          : page.endsWith("/logout") ? <div className="auth-destination"><span>AUTH-11 · Demo</span><p>{t("مقصد مستقل خروج از حساب؛ این جریان هنوز طراحی نشده و خروج واقعی انجام نمی‌شود.", "Separate sign-out destination; this flow is not designed yet and no actual sign-out occurs.")}</p><a className="text-link" href={`${prefix}/auth/account-restricted${suffix}`} onClick={follow(`${prefix}/auth/account-restricted${suffix}`)}>{t("بازگشت به وضعیت حساب", "Back to account status")}</a></div>
          : page.endsWith("/recovery/reset-password") ? <div className="auth-destination"><span>AUTH-08 · Demo</span><p>{t("مقصد مستقل رمز جدید؛ رمز تغییر نکرده و هیچ مجوز واقعی ایجاد نشده است.", "Separate reset-password destination; no password changed and no real grant exists.")}</p><a className="text-link" href={`${prefix}/auth/recovery${suffix}`} onClick={follow(`${prefix}/auth/recovery${suffix}`)}>{t("بازگشت به بازیابی", "Back to recovery")}</a></div>
          : nextStep ? <div className="auth-destination"><span>{setPasswordDestination ? "AUTH-06 · Demo" : registrationVerify || page.endsWith("/otp/verify") ? "AUTH-05 · Demo" : "Demo"}</span><p>{registrationVerify ? t("مقصد مستقل تأیید کد ثبت‌نام؛ پیامکی ارسال نشده و حسابی ساخته نشده است. پس از تأیید معتبر، ساخت رمز در AUTH-06 انجام می‌شود.", "Separate registration code verification destination; no SMS was sent and no account was created. After valid verification, set a password in AUTH-06.") : setPasswordDestination ? t("مقصد مستقل ساخت رمز؛ دسترسی واقعی نیازمند تأیید مجاز سرویس است. اینجا فرم یا حسابی ایجاد نمی‌شود.", "Separate set-password destination; real access requires service-authorized verification. No form or account is created here.") : page.endsWith("/otp/verify") ? t("مقصد مستقل تأیید کد ورود؛ این فرم هنوز طراحی نشده و هیچ پیامکی ارسال نشده است.", "Separate sign-in code verification destination; this form is not yet designed and no SMS was sent.") : page.endsWith("recovery") ? t("بازیابی رمز عبور؛ مقصد مستقل", "Password recovery; separate destination") : page.endsWith("verify") ? t("تأیید شماره تلفن؛ مقصد مستقل", "Phone verification; separate destination") : t("تأیید شماره تلفن، سپس ساخت رمز عبور", "Verify phone number, then set a password")}</p><a className="text-link" href={`${prefix}/auth/${registrationVerify || setPasswordDestination ? "register" : "login"}${suffix}`} onClick={follow(`${prefix}/auth/${registrationVerify || setPasswordDestination ? "register" : "login"}${suffix}`)}>{registrationVerify || setPasswordDestination ? t("بازگشت به ثبت‌نام", "Back to registration") : t("بازگشت به انتخاب روش ورود", "Back to sign-in methods")}</a></div>
          : loading ? <div className="auth-loading" role="status" aria-live="polite"><div className="auth-skeleton" /><div className="auth-skeleton" /><p>{t("در حال بررسی وضعیت ورود…", "Checking sign-in status…")}</p></div>
          : mode === "error" || mode === "empty" ? <div className="auth-error" role="alert"><AuthIcon kind="notice" /><p>{mode === "error" ? t("بررسی وضعیت ورود ممکن نشد.", "Unable to check your sign-in status.") : t("ورود به حساب در حال حاضر در دسترس نیست.", "Sign-in is currently unavailable.")}</p><button className="button primary" onClick={retry}>{t("تلاش دوباره", "Try again")}</button><a className="text-link" href={`${prefix}/contact`} onClick={follow(`${prefix}/contact`)}>{t("تماس با ما", "Contact us")}</a></div>
          : <><div className="auth-methods">
            {(["password", "otp"] as const).map((method) => {
              const disabled = (!liveApi && !!liveSignIn || mode === "partial") && method === "otp"
              const content = <><span className="auth-method-icon"><AuthIcon kind={method === "password" ? "lock" : "sms"} /></span><span className="auth-method-copy"><strong>{method === "password" ? t("ورود با رمز عبور", "Sign in with password") : t("ورود با کد یک‌بارمصرف", "Sign in with a one-time code")}</strong><span>{disabled ? t("دریافت پیامک موقتاً در دسترس نیست.", "SMS is temporarily unavailable.") : method === "password" ? t("با شماره تلفن و رمز حساب وارد شوید.", "Use your phone number and account password.") : t("کد تأیید را از طریق پیامک دریافت کنید.", "Receive a verification code by SMS.")}</span></span><span className="auth-forward"><AuthIcon kind="arrow" /></span></>
              const route = `${prefix}/auth/${method === "password" ? "login/password" : "login/otp"}${suffix}`
              return disabled ? <div key={method} className="auth-method disabled" aria-disabled="true">{content}</div> : <a key={method} className={`auth-method ${method}`} href={route} onClick={follow(route)}>{content}</a>
            })}
          </div><div className="auth-signup"><p>{t("حساب ندارید؟", "New to Nilart?")} <a href={`${prefix}/auth/register${suffix}`} onClick={follow(`${prefix}/auth/register${suffix}`)}>{t("ساخت حساب", "Create an account")}</a></p><small>{t("ثبت‌نام با تأیید شماره تلفن و ساخت رمز انجام می‌شود.", "Verify your phone number and set a password to create an account.")}</small></div></>}
        </section>
        <p className="auth-bottom-note">{isRecovery ? t("درخواست کد، رمز را تغییر نمی‌دهد و ورود ایجاد نمی‌کند.", "Requesting a code does not change your password or sign you in.") : isRegister ? t("ساخت حساب پس از تأیید شماره و تعیین رمز کامل می‌شود.", "Account creation is complete only after phone verification and setting a password.") : t("ورود، قدمی برای ادامه مسیر شماست.", "Sign in, and pick up where you left off.")}</p>
      </div>
    </main>
    <footer className="auth-footer"><span>{t("نیل‌آرت؛ هنر در لحظه‌های روزمره", "Nilart. Art in everyday life.")}</span><nav aria-label={t("لینک‌های راهنما", "Helpful links")}>{[[t("قوانین خرید", "Purchase terms"), `${prefix}/terms`], [t("حریم خصوصی", "Privacy policy"), `${prefix}/privacy`], [t("تماس", "Contact"), `${prefix}/contact`]].map(([label, route]) => <a href={route} onClick={follow(route)} key={route}>{label}</a>)}</nav></footer>
    {!liveSignIn && !isPassword && !isOtp && !isRegister && !isRecovery && <details className="auth-preview"><summary>{t("حالت‌های پیش‌نمایش", "Preview states")} <span>AUTH-01</span></summary><p>{t("نمونه طراحی · بدون اتصال به سرویس احراز هویت", "Design preview · no authentication service connected")}</p><div>{modes.map(([value, fa, english]) => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{en ? english : fa}</button>)}</div></details>}
  </div>
}
