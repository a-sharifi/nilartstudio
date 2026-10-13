import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import AuthPasswordInput from "./AuthPasswordInput"
import {
  securityFixture,
  validatePasswordChange,
  passwordChangePayload,
  canRevokeSession,
  type PasswordDraft,
  type SecurityMode,
} from "./security"
import "./security.css"

type ChangeState = "idle" | "submitting" | "incorrect" | "network" | "server" | "unknown" | "success-kept" | "success-relogin"
const previews: [SecurityMode, string, string][] = [
  ["normal", "فرم عادی؛ بدون نشست‌ها", "Normal form; no session management"],
  ["incorrect", "رمز فعلی نادرست", "Incorrect current password"],
  ["limited", "محدودیت تلاش", "Rate limited"],
  ["network", "خطای شبکه", "Network error"],
  ["server", "خطای سرویس", "Server error"],
  ["unknown", "نتیجه نامشخص", "Unknown result"],
  [
    "success-kept",
    "موفقیت Demo؛ نشست جاری معتبر",
    "Demo success; current session retained",
  ],
  [
    "success-relogin",
    "موفقیت Demo؛ ورود مجدد",
    "Demo success; sign-in required",
  ],
  ["sessions", "نشست‌ها با قابلیت Demo", "Sessions with Demo capability"],
  ["session-error", "خطای خروج نشست", "Session sign-out error"],
  ["sessions-empty", "نشست‌های خالی", "Empty sessions"],
  ["sessions-load-error", "خطای دریافت نشست‌ها", "Session list error"],
  ["loading", "بارگذاری", "Loading"],
  ["denied", "عدم مجوز", "Permission denied"],
]
export default function SecurityPage({
  page,
  navigate,
  liveApi,
}: {
  page: string
  navigate: (route: string) => void
  liveApi?: import("../features/identity/security").LiveSecurityApi
}) {
  const en = page.startsWith("/en/"),
    index = en ? 1 : 0,
    t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa",
    account = `${prefix}/account`
  const [mode, setMode] = useState<SecurityMode>("normal")
  const [draft, setDraft] = useState<PasswordDraft>({
    current: "",
    next: "",
    confirm: "",
  })
  const [show, setShow] = useState<Record<keyof PasswordDraft, boolean>>({
    current: false,
    next: false,
    confirm: false,
  })
  const [errors, setErrors] =
    useState<Partial<Record<keyof PasswordDraft, string>>>({})
  const [state, setState] = useState<ChangeState>("idle"),
    [live, setLive] = useState(""),
    [checking, setChecking] = useState(false)
  const [removedSessions, setRemovedSessions] = useState<string[]>([]),
    [sessionError, setSessionError] = useState("")
  const [sessionBusy, setSessionBusy] = useState(false),
    [revokeTarget, setRevokeTarget] = useState<string | "others" | null>(null)
  const [modal, setModal] = useState<"sessions" | "destination" | null>(null),
    [destination, setDestination] = useState("")
  const dialog = useRef<HTMLDialogElement>(null),
    origin = useRef<HTMLElement | null>(null),
    form = useRef<HTMLFormElement>(null),
    result = useRef<HTMLDivElement>(null)
  const changeLock = useRef(false),
    sessionLock = useRef(false),
    timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const [liveSnapshot,setLiveSnapshot]=useState<Awaited<ReturnType<NonNullable<typeof liveApi>["load"]>>|null>(null)
  const liveGeneration=useRef(0)
  const fixture = liveApi ? liveSnapshot || {...securityFixture("denied"),owner:"",minimum:12,sessions:[],maskedPhone:"",phoneVerified:false,passwordEnabled:false,otpEnabled:false,canChange:false,canManageSessions:false} : securityFixture(mode)
  const canRevoke=(session:typeof fixture.sessions[number])=>liveApi?!!liveSnapshot&&!session.current:canRevokeSession(session,fixture.owner,fixture.canManageSessions)
  useEffect(()=>{
    if(!liveApi)return
    const clear=()=>{liveGeneration.current++;setLiveSnapshot(null);setDraft({current:"",next:"",confirm:""});setShow({current:false,next:false,confirm:false});setModal(null);setRemovedSessions([]);setState("idle");setMode("denied")}
    const load=async()=>{const request=++liveGeneration.current;try{const value=await liveApi.load();if(request===liveGeneration.current){setLiveSnapshot(value);setMode("sessions")}}catch(error){if(request===liveGeneration.current){setLiveSnapshot(null);setMode(error instanceof Error && ["unauthenticated","permission_denied"].includes(error.message)?"denied":"sessions-load-error")}}}
    setMode("loading");void load()
    const unregister=liveApi.registerPrivateCache(clear)
    const unsubscribe=liveApi.subscribe(event=>{if(event.type==="changed"){clear();if(event.signedOut)return}void load()})
    return()=>{liveGeneration.current++;unregister();unsubscribe()}
  },[liveApi])
  const privateVisible =
    mode !== "denied" && mode !== "loading" && state !== "success-relogin"
  const busy = state === "submitting",
    blocked = busy || state === "unknown" || !fixture.canChange || sessionBusy
  const sessions = fixture.sessions.filter(
    (session) => !removedSessions.includes(session.id),
  )
  const recovery = `${prefix}/auth/forgot-password?returnTo=${encodeURIComponent(`${account}/security`)}`
  const login = `${prefix}/auth/login?returnTo=${encodeURIComponent(`${account}/security`)}`
  const later = (fn: () => void, ms = 800) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      fn()
    }, ms)
    timers.current.add(timer)
  }
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      changeLock.current = false
      sessionLock.current = false
    },
    [],
  )
  useEffect(() => {
    if (modal) {
      if (!dialog.current?.open) dialog.current?.showModal()
      requestAnimationFrame(() =>
        dialog.current
          ?.querySelector<HTMLElement>("[data-modal-cancel],button")
          ?.focus(),
      )
    } else if (dialog.current?.open) dialog.current.close()
  }, [modal])
  useEffect(() => {
    if (state === "success-kept" || state === "success-relogin")
      result.current?.focus()
  }, [state])
  const clearPasswords = () => {
    setDraft({ current: "", next: "", confirm: "" })
    setShow({ current: false, next: false, confirm: false })
    setErrors({})
  }
  const close = () => {
    if (sessionBusy) return
    setModal(null)
    setRevokeTarget(null)
    requestAnimationFrame(() => {
      if (origin.current?.isConnected) origin.current.focus()
      else result.current?.focus()
    })
  }
  const showDestination = (route: string) => {
    clearPasswords()
    origin.current = (document.activeElement as HTMLElement)
    setDestination(route)
    setModal("destination")
  }
  const internalRoute = (route: string) =>
    /^\/(fa|en)\/account\/(security|profile|addresses|favorites|downloads|preferences)$/.test(
      route,
    ) ||
    route === account ||
    route === "/" ||
    route === "/cart" ||
    route.includes("/auth/")
  const beforePanelNavigation = (route: string, proceed: () => void) => {
    if (/^\/(fa|en)\/account\/security$/.test(route)) {
      proceed()
      return
    }
    clearPasswords()
    if (liveApi || internalRoute(route)) proceed()
    else showDestination(route)
  }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    clearPasswords()
    if (liveApi || internalRoute(route)) navigate(route)
    else showDestination(route)
  }
  const change = (key: keyof PasswordDraft, value: string) => {
    if (blocked || !privateVisible) return
    setDraft((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
    if (["incorrect", "network", "server", "success-kept"].includes(state))
      setState("idle")
  }
  const errorText = (code: string) =>
    ({
      "required-current": t(
        "رمز فعلی را وارد کنید.",
        "Enter your current password.",
      ),
      "required-new": t("رمز جدید را وارد کنید.", "Enter a new password."),
      "required-confirm": t(
        "تکرار رمز جدید را وارد کنید.",
        "Confirm your new password.",
      ),
      rules: (liveApi?t("رمز باید بین ۱۲ تا ۱۲۸ نویسه باشد.","Password must contain 12–128 characters."):t(
        "شرایط رمز جدید را مطابق قرارداد نمونه رعایت کنید.",
        "Meet the new password requirements in the fixture contract.",
      )),
      mismatch: t("رمزها با هم مطابقت ندارند.", "The passwords do not match."),
      incorrect: (liveApi?t("رمز فعلی درست نیست.","The current password is incorrect."):t(
        "رمز فعلی درست نیست. • پاسخ Demo",
        "The current password is incorrect. • Demo response",
      )),
    })[code]
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (changeLock.current || blocked || !privateVisible) return
    const validation = validatePasswordChange(draft, fixture.minimum)
    setErrors(validation)
    if (Object.keys(validation).length) {
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>(
            `#security-${Object.keys(validation)[0]}`,
          )
          ?.focus(),
      )
      return
    }
    if(liveApi){
      changeLock.current=true;setState("submitting");setLive("")
      const request=liveGeneration.current
      void liveApi.change(draft).then(()=>{clearPasswords();setLiveSnapshot(null);setMode("normal");setState("success-relogin");setLive(t("رمز تغییر کرد و همه نشست‌ها پایان یافتند.","Password changed and all sessions ended."))}).catch(error=>{
        if(request!==liveGeneration.current)return
        const code=error instanceof Error?error.message:""
        if(code==="incorrect_current_password"){setErrors({current:"incorrect"});setState("incorrect")}
        else if(code==="rate_limited"){setMode("limited");setState("idle")}
        else{setState(code==="result_unknown"?"unknown":"server");setLive(t("تغییر رمز تأیید نشد.","Password change was not confirmed."))}
      }).finally(()=>{changeLock.current=false})
      return
    }
    // Explicit fixture-response simulation. Never verify a password against a client-side stored credential.
    // Build an allowlisted exact-value payload, then discard it; no network request or persistent storage occurs.
    passwordChangePayload(draft)
    changeLock.current = true
    setState("submitting")
    setLive("")
    later(() => {
      if (mode === "unknown") {
        setState("unknown")
        setLive(
          t(
            "نتیجه تغییر رمز هنوز تأیید نشده است. ارسال تکراری متوقف شده است.",
            "The password change result has not been confirmed yet. Duplicate submission is blocked.",
          ),
        )
        return
      }
      changeLock.current = false
      if (mode === "incorrect") {
        setState("incorrect")
        setErrors({ current: "incorrect" })
        requestAnimationFrame(() =>
          form.current
            ?.querySelector<HTMLElement>("#security-current")
            ?.focus(),
        )
        setLive(
          t(
            "پاسخ نمونه: رمز فعلی نادرست است؛ رمز واقعی بررسی نشده است.",
            "Fixture response: current password is incorrect; no real password was checked.",
          ),
        )
        return
      }
      if (mode === "success-kept" || mode === "success-relogin") {
        clearPasswords()
        setState(mode)
        setLive(
          t(
            "رمز عبور تغییر کرد · Demo؛ تغییر واقعی رمز یا ابطال نشست انجام نشده است.",
            "Your password has been changed · Demo; no actual password change or session revocation occurred.",
          ),
        )
        return
      }
      setState(mode === "network" ? "network" : "server")
      setLive(
        mode === "network"
          ? t(
              "ارتباط برقرار نشد. دوباره تلاش کنید.",
              "Unable to connect. Try again.",
            )
          : t(
              "تغییر رمز در حال حاضر ممکن نیست؛ سرویس واقعی متصل نیست.",
              "Password change is currently unavailable; no real service is connected.",
            ),
      )
    })
  }
  const check = () => {
    if (checking) return
    if(liveApi){setChecking(true);void liveApi.load().then(value=>{setLiveSnapshot(value);setLive(t("نشست هنوز فعال است؛ نتیجه تغییر رمز تأیید نشده است.","The session remains active; password change is unconfirmed."))}).catch(()=>setLive(t("وضعیت تأیید نشد؛ دوباره ارسال نکنید و از ورود یا بازیابی رمز استفاده کنید.","Status is unconfirmed. Use sign-in or password recovery before resubmitting."))).finally(()=>setChecking(false));return}
    setChecking(true)
    later(() => {
      setChecking(false)
      setLive(
        t(
          "وضعیت عملیات دریافت نشد؛ سرویس متصل نیست. تغییر رمز دوباره ارسال نشد.",
          "Operation status was not retrieved; no service is connected. The password change was not resubmitted.",
        ),
      )
    }, 650)
  }
  const openSession = (
    id: string | "others",
    event: MouseEvent<HTMLElement>,
  ) => {
    if (sessionLock.current || !fixture.canManageSessions) return
    const target = sessions.find((session) => session.id === id)
    if (
      id !== "others" &&
      (!target ||
        !canRevoke(target))
    )
      return
    origin.current = event.currentTarget
    setSessionError("")
    setRevokeTarget(id)
    setModal("sessions")
  }
  const revoke = () => {
    if (sessionLock.current || !fixture.canManageSessions || !revokeTarget)
      return
    sessionLock.current = true
    setSessionBusy(true)
    const ids = sessions
      .filter(
        (session) =>
          canRevoke(session) &&
          (revokeTarget === "others" || session.id === revokeTarget),
      )
      .map((session) => session.id)
    if(liveApi){
      const request=liveGeneration.current
      void liveApi.revoke(ids).then(()=>{if(request!==liveGeneration.current)return;setRemovedSessions(previous=>[...previous,...ids]);setModal(null);setRevokeTarget(null);setLive(t("نشست‌های انتخاب‌شده پایان یافتند.","Selected sessions ended."))}).catch(()=>{if(request===liveGeneration.current)setSessionError(t("پایان نشست تأیید نشد. فهرست را دوباره دریافت کنید.","Revocation is unconfirmed. Reload the session list."))}).finally(()=>{sessionLock.current=false;setSessionBusy(false)})
      return
    }
    later(() => {
      sessionLock.current = false
      setSessionBusy(false)
      if (mode === "session-error") {
        setSessionError(
          t(
            "خروج نشست تأیید نشد؛ فهرست قبلی حفظ شده است. • Demo",
            "Session sign-out was not confirmed; the previous list is preserved. • Demo",
          ),
        )
        setLive(
          t(
            "خطای خروج نشست؛ ابطال واقعی انجام نشده است.",
            "Session sign-out error; no actual revocation occurred.",
          ),
        )
        return
      }
      setRemovedSessions((previous) => [...previous, ...ids])
      setModal(null)
      setRevokeTarget(null)
      setLive(
        t(
          "خروج نشست‌های انتخاب‌شده شبیه‌سازی شد · Demo؛ نشست جاری باقی است و هیچ ابطال واقعی انجام نشد.",
          "Selected-session sign-out simulated · Demo; the current session remains and no actual revocation occurred.",
        ),
      )
      requestAnimationFrame(() =>
        document.getElementById("security-sessions-title")?.focus(),
      )
    }, 750)
  }
  const preview = (value: SecurityMode) => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
    changeLock.current = false
    sessionLock.current = false
    clearPasswords()
    setMode(value)
    setState("idle")
    setLive("")
    setChecking(false)
    setRemovedSessions([])
    setSessionError("")
    setSessionBusy(false)
    setModal(null)
    setRevokeTarget(null)
  }
  const policyText = liveApi ? t("پس از تغییر رمز، همه نشست‌ها پایان می‌یابند و ورود دوباره لازم است.","Changing your password ends all sessions and requires sign-in again.") :
    fixture.sessionPolicy === "other-sessions"
      ? t(
          "پس از تغییر رمز، نشست‌های دیگر از حساب خارج می‌شوند؛ نشست جاری معتبر می‌ماند. • سیاست Demo",
          "Other sessions will be signed out after the password change; the current session remains valid. • Demo policy",
        )
      : fixture.sessionPolicy === "all-sessions"
        ? t(
            "پس از تغییر رمز، برای ادامه دوباره وارد شوید؛ نشست جاری و نشست‌های دیگر باطل می‌شوند. • سیاست Demo",
            "Sign in again after changing your password; current and other sessions are revoked. • Demo policy",
          )
        : t(
            "نیازمند تأیید سیاست نشست؛ رفتار نشست جاری و سایر نشست‌ها از سرویس دریافت نشده است.",
            "Session policy requires confirmation; current and other-session behavior has not been received from the service.",
          )
  const field = (
    key: keyof PasswordDraft,
    label: string,
    autoComplete: "current-password" | "new-password",
  ) => (
    <div className="password-field security-password-field">
      <label htmlFor={`security-${key}`}>{label}</label>
      <AuthPasswordInput
        id={`security-${key}`}
        name={
          key === "current"
            ? "currentPassword"
            : key === "next"
              ? "newPassword"
              : "confirmPassword"
        }
        label={label}
        en={en}
        value={draft[key]}
        visible={show[key]}
        autoComplete={autoComplete}
        disabled={blocked}
        invalid={!!errors[key]}
        describedBy={errors[key] ? `security-error-${key}` : undefined}
        onChange={(value) => change(key, value)}
        onToggle={() =>
          setShow((previous) => ({ ...previous, [key]: !previous[key] }))
        }
      />
      {errors[key] && (
        <p
          className="password-field-error"
          id={`security-error-${key}`}
          role="alert"
        >
          {errorText(errors[key]!)}
        </p>
      )}
    </div>
  )
  return (
    <DashboardPage
      page={page}
      navigate={navigate}
      renderMedia={() => null}
      activeSection="security"
      onBeforeNavigate={beforePanelNavigation}
      panelTitle={t("امنیت حساب", "Account security")}
      liveMode={!!liveApi}
    >
      <div className="security-page">
        <nav
          className="security-breadcrumb"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          <a href={account} onClick={follow(account)}>
            {t("حساب", "Account")}
          </a>
          <span>/</span>
          <span aria-current="page">{t("امنیت", "Security")}</span>
        </nav>
        <div className="security-heading">
          <div>
            <span className="security-eyebrow">YOUR ACCOUNT · USER-13</span>
            <h1>{t("امنیت حساب", "Account security")}</h1>
            <p>
              {t(
                "روش‌های ورود و رمز حساب خود را با دقت مدیریت کنید.",
                "Manage your sign-in methods and account password with care.",
              )}
            </p>
          </div>
          <span className="security-heading-icon">
            <Glyph name="shield" size={31} />
          </span>
        </div>
        {!liveApi && <>
        <div className="security-demo">
          <span>Demo</span>
          <p>
            {t(
              "روش‌های ورود، قواعد، سیاست نشست و پاسخ‌ها نمونه‌اند؛ سرویس تغییر رمز یا مدیریت نشست متصل نیست. هیچ رمز واقعی بررسی یا تغییری اعمال نمی‌شود.",
              "Sign-in methods, rules, session policy and responses are fixtures; no password or session-management service is connected. No actual password is checked or changed.",
            )}
          </p>
        </div>
        </>}
        {liveApi && mode==="sessions-load-error" && <div className="security-warning" role="alert"><p>{t("دریافت اطلاعات امنیت ممکن نشد.","Unable to load security settings.")}</p><button className="button secondary" onClick={()=>{const request=++liveGeneration.current;setMode("loading");void liveApi.load().then(value=>{if(request===liveGeneration.current){setLiveSnapshot(value);setMode("sessions")}}).catch(()=>{if(request===liveGeneration.current)setMode("sessions-load-error")})}}>{t("دوباره تلاش کنید","Try again")}</button></div>}
        {liveSnapshot?.sandboxSms && <p className="security-warning">{t("پیامک در حالت آزمایشی محلی است.","SMS uses the local sandbox.")}</p>}
        <div className="security-live" role="status" aria-live="polite">
          {live}
        </div>
        {mode === "denied" ? (
          <section className="security-state">
            <Glyph name="shield" size={36} />
            <h2>
              {t(
                "دسترسی به امنیت این حساب مجاز نیست.",
                "This account’s security settings are not accessible.",
              )}
            </h2>
            <p>
              {t(
                "عدم مجوز با پایان نشست یا نادرست‌بودن رمز یکسان نیست.",
                "Permission denial is not session expiry or an incorrect password.",
              )}
            </p>
          </section>
        ) : mode === "loading" ? (
          <div
            className="security-loading"
            aria-busy="true"
            aria-label={t(
              "در حال دریافت اطلاعات امنیت",
              "Loading security settings",
            )}
          >
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : state === "success-relogin" ? (
          <section
            className="security-state security-success"
            tabIndex={-1}
            ref={result}
          >
            <span className="security-success-symbol">
              <Glyph name="check" size={32} />
            </span>
            <h2>
              {(liveApi?t("رمز عبور تغییر کرد","Your password has been changed"):t(
                "رمز عبور تغییر کرد · Demo",
                "Your password has been changed · Demo",
              ))}
            </h2>
            <p>
              {(liveApi?t("نشست جاری و سایر نشست‌ها پایان یافتند. برای ادامه وارد شوید.","Current and other sessions ended. Sign in to continue."):t(
                "در پاسخ نمونه، نشست جاری و سایر نشست‌ها پایان یافته‌اند؛ نمای خصوصی حذف شده است. هیچ تغییر یا ابطال واقعی انجام نشده است.",
                "In the fixture response, current and other sessions have ended; the private view is removed. No actual change or revocation occurred.",
              ))}
            </p>
            <a className="button primary" href={login} onClick={follow(login)}>
              {t("ورود دوباره", "Sign in again")}
              <Glyph name="arrow" size={16} />
            </a>
            <small>
              {t(
                "رمز جدید به فرم ورود منتقل نمی‌شود؛ سفارش و پرداخت تغییر نکرده‌اند.",
                "The new password is not passed to sign-in; orders and payments are unchanged.",
              )}
            </small>
          </section>
        ) : (
          <>
            <section className="security-methods">
              <div className="security-section-heading">
                <span className="security-section-icon">
                  <Glyph name="user" size={22} />
                </span>
                <div>
                  <h2>{t("روش‌های ورود شما", "Your sign-in methods")}</h2>
                  <p>
                    {t(
                      "فعال‌بودن روش‌ها در پاسخ نمونه حساب",
                      "Method availability in the fixture account response",
                    )}
                  </p>
                </div>
              </div>
              <div className="security-method-grid">
                <div className="security-phone">
                  <span>{t("شماره تلفن حساب", "Account phone number")}</span>
                  <bdi>{fixture.maskedPhone}</bdi>
                  <span className="security-verified">
                    <Glyph name="check" size={13} />
                    {t(liveApi?(fixture.phoneVerified?"تأییدشده":"تأیید نشده"):"تأییدشده · Demo",liveApi?(fixture.phoneVerified?"Verified":"Unconfirmed"):"Verified · Demo")}
                  </span>
                </div>
                <div>
                  <span className="security-method-label">
                    {t("ورود با رمز عبور", "Password sign-in")}
                  </span>
                  <strong>
                    <Glyph name="check" size={14} />
                    {fixture.passwordEnabled
                      ? t(liveApi?"فعال":"فعال · Demo",liveApi?"Enabled":"Enabled · Demo")
                      : t(liveApi?"غیرفعال":"غیرفعال · Demo",liveApi?"Unavailable":"Disabled · Demo")}
                  </strong>
                </div>
                <div>
                  <span className="security-method-label">
                    {t("ورود با کد یک‌بارمصرف", "One-time code sign-in")}
                  </span>
                  <strong>
                    <Glyph name="check" size={14} />
                    {fixture.otpEnabled
                      ? t(liveApi?"فعال":"فعال · Demo",liveApi?"Enabled":"Enabled · Demo")
                      : t(liveApi?"غیرفعال":"غیرفعال · Demo",liveApi?"Unavailable":"Disabled · Demo")}
                  </strong>
                </div>
              </div>
              <a
                className="text-link"
                href={`${account}/security/change-phone`}
                onClick={follow(`${account}/security/change-phone`)}
              >
                {t(
                  "تغییر شماره در مسیر مستقل",
                  "Change phone through its separate flow",
                )}
                <Glyph name="arrow" size={15} />
              </a>
            </section>
            <div className="security-layout">
              <div className="security-primary">
                <section className="security-card">
                  <div className="security-section-heading">
                    <span className="security-section-icon">
                      <Glyph name="shield" size={22} />
                    </span>
                    <div>
                      <h2>{t("تغییر رمز عبور", "Change password")}</h2>
                      <p>
                        {t(
                          "رمز فعلی شما باید در همین جریان معتبر، سمت سرویس بررسی شود.",
                          "Your current password must be checked by the service in this authorized flow.",
                        )}
                      </p>
                    </div>
                  </div>
                  {state === "success-kept" && (
                    <div
                      className="security-success-notice"
                      tabIndex={-1}
                      ref={result}
                    >
                      <Glyph name="check" size={22} />
                      <div>
                        <strong>
                          {(liveApi?t("رمز عبور تغییر کرد","Your password has been changed"):t(
                            "رمز عبور تغییر کرد · Demo",
                            "Your password has been changed · Demo",
                          ))}
                        </strong>
                        <p>
                          {t(
                            "رمزهای فرم پاک شدند. در سیاست نمونه، نشست جاری معتبر می‌ماند و سایر نشست‌ها پایان می‌یابند؛ ابطال واقعی انجام نشده است.",
                            "Form passwords were cleared. In the fixture policy, the current session remains valid and others end; no real revocation occurred.",
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {mode === "limited" && (
                    <div className="security-warning">
                      <Glyph name="clock" size={20} />
                      <div>
                        <strong>
                          {t(
                            "تلاش برای تغییر رمز محدود شده است. • Demo",
                            "Password-change attempts are limited. • Demo",
                          )}
                        </strong>
                        <p>
                          {t(
                            "زمان رفع محدودیت از سرویس دریافت نشده؛ شمارنده یا تلاش خودکار نداریم. تغییر روش ورود محدودیت سرویس را دور نمی‌زند.",
                            "No service-provided retry time is available; no countdown or automatic attempt is shown. Changing sign-in method does not bypass service limits.",
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  <form
                    ref={form}
                    noValidate
                    onSubmit={submit}
                    aria-busy={busy}
                  >
                    {field(
                      "current",
                      t("رمز عبور فعلی", "Current password"),
                      "current-password",
                    )}
                    <div className="security-recovery-link">
                      <a
                        className="text-link"
                        href={recovery}
                        onClick={follow(recovery)}
                      >
                        {t(
                          "رمز فعلی را فراموش کرده‌اید؟",
                          "Forgot your current password?",
                        )}
                        <Glyph name="arrow" size={15} />
                      </a>
                    </div>
                    {field(
                      "next",
                      t("رمز عبور جدید", "New password"),
                      "new-password",
                    )}
                    {field(
                      "confirm",
                      t("تکرار رمز جدید", "Confirm new password"),
                      "new-password",
                    )}
                    <section
                      className="registration-requirements security-requirements"
                      aria-label={t(
                        "شرایط رمز جدید",
                        "New password requirements",
                      )}
                    >
                      <h3>
                        {t("شرایط رمز جدید", "New password requirements")}{" "}
                        <span>Demo</span>
                      </h3>
                      <p
                        className={
                          draft.next.length >= fixture.minimum
                            ? "requirement-met"
                            : ""
                        }
                      >
                        <Glyph
                          name={
                            draft.next.length >= fixture.minimum
                              ? "check"
                              : "clock"
                          }
                          size={14}
                        />
                        {t(
                          `حداقل ${fixture.minimum} نویسه طبق قرارداد نمونه`,
                          liveApi?`12–128 characters`:`At least ${fixture.minimum} characters under the fixture contract`,
                        )}
                        <span>
                          {draft.next.length >= fixture.minimum
                            ? t("رعایت شده", "Met")
                            : t("هنوز رعایت نشده", "Not yet met")}
                        </span>
                      </p>
                      <small>
                        {(liveApi?t("رمز باید بین ۱۲ تا ۱۲۸ نویسه و حداکثر ۵۱۲ بایت باشد. فاصله‌های رمز تغییر داده نمی‌شوند.","Password must contain 12–128 characters and at most 512 bytes. Password spaces are preserved."):t(
                          "قواعد از تنظیمات Demo احراز هویت موجود بازاستفاده شده‌اند؛ الزام استفاده‌نکردن از رمز قبلی یا قواعد اضافه فرض نشده است.",
                          "Rules reuse the existing authentication Demo configuration; no reuse prohibition or extra requirements are assumed.",
                        ))}
                      </small>
                    </section>
                    <section className="security-session-policy">
                      <Glyph name="shield" size={19} />
                      <div>
                        <h3>
                          {t(
                            "اثر تغییر رمز بر نشست‌ها",
                            "Password-change effect on sessions",
                          )}
                        </h3>
                        <p>{policyText}</p>
                      </div>
                    </section>
                    {(state === "network" || state === "server") && (
                      <p className="security-operation-error" role="alert">
                        {state === "network"
                          ? t(
                              "ارتباط برقرار نشد. دوباره تلاش کنید.",
                              "Unable to connect. Try again.",
                            )
                          : t(
                              "تغییر رمز در حال حاضر ممکن نیست؛ سرویس واقعی متصل نیست.",
                              "Password change is currently unavailable; no real service is connected.",
                            )}
                      </p>
                    )}
                    {state === "unknown" && (
                      <div className="security-warning" role="alert">
                        <Glyph name="clock" size={20} />
                        <div>
                          <strong>
                            {t(
                              "نتیجه تغییر رمز هنوز تأیید نشده است.",
                              "The password change result has not been confirmed yet.",
                            )}
                          </strong>
                          <p>
                            {t(
                              "رمز فعلی قبلی ممکن است پس از تغییر احتمالی معتبر نباشد؛ ارسال تکراری مسدود است.",
                              "The old current password may no longer be valid after a possible change; duplicate submission is blocked.",
                            )}
                          </p>
                          <button
                            type="button"
                            className="text-link"
                            disabled={checking}
                            onClick={check}
                          >
                            {checking
                              ? t("در حال بررسی…", "Checking…")
                              : t(
                                  "بررسی وضعیت عملیات",
                                  "Check operation status",
                                )}
                          </button>
                        </div>
                      </div>
                    )}
                    <button
                      type="submit"
                      className="button primary security-submit"
                      disabled={blocked}
                    >
                      {busy
                        ? t("در حال تغییر رمز…", "Changing password…")
                        : t("تغییر رمز عبور", "Change password")}
                      <Glyph name="arrow" size={17} />
                    </button>
                    {!liveApi && <p className="security-submit-demo">
                      {t(
                        "اقدام و نتیجه فقط شبیه‌سازی Demo هستند؛ رمز در ذخیره دائمی یا URL قرار نمی‌گیرد.",
                        "Actions and results are Demo simulations only; passwords are not placed in persistent storage or URLs.",
                      )}
                    </p>}
                  </form>
                </section>
                {fixture.sessionsEnabled && (
                  <section className="security-card security-sessions">
                    <div className="security-section-heading">
                      <span className="security-section-icon">
                        <Glyph name="grid" size={21} />
                      </span>
                      <div>
                        <h2 id="security-sessions-title" tabIndex={-1}>
                          {t("نشست‌های حساب", "Account sessions")}
                        </h2>
                        <p>
                          {(liveApi?t("نشست‌های فعال این حساب؛ اطلاعات دستگاه ثبت نشده است.","Active sessions for this account; device information is not recorded."):t(
                            "قابلیت مدیریت و مجوز در قرارداد Demo فعال است؛ این نشست‌ها واقعی نیستند.",
                            "Management capability and permission are enabled in the Demo contract; these are not real sessions.",
                          ))}
                        </p>
                      </div>
                    </div>
                    {mode === "sessions-load-error" ? (
                      <div className="security-warning">
                        <p>
                          {t(
                            "دریافت نشست‌ها ممکن نشد؛ خالی‌بودن فهرست فرض نمی‌شود.",
                            "Unable to load sessions; an empty list is not assumed.",
                          )}
                        </p>
                        <button
                          type="button"
                          className="text-link"
                          onClick={check}
                          disabled={checking}
                        >
                          {t("تلاش دوباره", "Try again")}
                        </button>
                      </div>
                    ) : !sessions.length ? (
                      <p className="security-empty-sessions">
                        {(liveApi?t("نشست فعالی برای نمایش نیست.","No active sessions to display."):t(
                          "در پاسخ نمونه، نشستی برای نمایش ثبت نشده است.",
                          "No sessions are listed in the fixture response.",
                        ))}
                      </p>
                    ) : (
                      <>
                        <div className="security-session-list">
                          {sessions.map((session) => (
                            <article key={session.id}>
                              <span className="security-device-icon">
                                <Glyph
                                  name={session.current ? "grid" : "user"}
                                  size={21}
                                />
                              </span>
                              <div>
                                <h3>{session.device[index]}</h3>
                                <p>
                                  {(liveApi?t("زمان ایجاد نشست","Session created"):t(
                                    "آخرین فعالیت گزارش‌شده",
                                    "Reported last activity",
                                  ))}
                                  :{" "}
                                  <time dateTime={session.lastActivity}>
                                    {new Intl.DateTimeFormat(
                                      en ? "en-GB" : "fa-IR",
                                      {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                        timeZone: "Asia/Tehran",
                                      },
                                    ).format(new Date(session.lastActivity))}
                                  </time>
                                </p>
                              </div>
                              {session.current ? (
                                <span className="security-current-session">
                                  {(liveApi?t("نشست جاری","Current session"):t(
                                    "نشست جاری · Demo",
                                    "Current session · Demo",
                                  ))}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="text-link"
                                  disabled={
                                    sessionBusy || busy || state === "unknown"
                                  }
                                  onClick={(event) =>
                                    openSession(session.id, event)
                                  }
                                >
                                  {t("خروج این نشست", "Sign out this session")}
                                </button>
                              )}
                            </article>
                          ))}
                        </div>
                        <button
                          className="button secondary"
                          type="button"
                          disabled={
                            !sessions.some((session) => !session.current) ||
                            sessionBusy ||
                            busy ||
                            state === "unknown"
                          }
                          onClick={(event) => openSession("others", event)}
                        >
                          {t("خروج از سایر نشست‌ها", "Sign out other sessions")}
                        </button>
                      </>
                    )}
                  </section>
                )}
              </div>
              <aside className="security-aside">
                <section className="security-guide">
                  <span className="security-guide-icon">
                    <Glyph name="shield" size={27} />
                  </span>
                  <h2>
                    {t(
                      "امنیت، با چند عادت ساده",
                      "Security through simple habits",
                    )}
                  </h2>
                  <ul>
                    <li>
                      {t(
                        "رمز و کد تأیید را با دیگران به اشتراک نگذارید.",
                        "Do not share your password or verification codes.",
                      )}
                    </li>
                    <li>
                      {t(
                        "از مسیر رسمی سایت برای مدیریت حساب استفاده کنید.",
                        "Use the official website to manage your account.",
                      )}
                    </li>
                    <li>
                      {t(
                        "Paste و مدیر رمز عبور در این فرم مجازند؛ رمزها تغییر یا نرمال‌سازی نمی‌شوند.",
                        "Paste and password managers are allowed; passwords are not altered or normalized.",
                      )}
                    </li>
                  </ul>
                </section>
                <section className="security-recovery-note">
                  <h2>
                    {t("تغییر رمز یا بازیابی؟", "Password change or recovery?")}
                  </h2>
                  <p>
                    {t(
                      "برای تعیین رمز جدید بدون رمز فعلی، مسیر بازیابی را ادامه دهید. ورود قبلی با OTP، مجوز دورزدن رمز فعلی نیست.",
                      "To set a new password without your current password, use account recovery. Prior OTP sign-in does not bypass current-password verification.",
                    )}
                  </p>
                  <a
                    className="text-link"
                    href={recovery}
                    onClick={follow(recovery)}
                  >
                    {t("بازیابی رمز • AUTH-07", "Account recovery • AUTH-07")}
                    <Glyph name="arrow" size={15} />
                  </a>
                </section>
                <section className="security-support">
                  <Glyph name="chat" size={22} />
                  <h3>
                    {t(
                      "برای امنیت حساب همراه شما هستیم",
                      "We’re here for your account security",
                    )}
                  </h3>
                  <p>
                    {t(
                      "پشتیبانی رمز عبور یا OTP شما را درخواست نمی‌کند.",
                      "Support does not ask for your password or OTP.",
                    )}
                  </p>
                  <a
                    className="text-link"
                    href={`${account}/support?topic=security`}
                    onClick={follow(`${account}/support?topic=security`)}
                  >
                    {t("تماس با پشتیبانی", "Contact support")}
                    <Glyph name="arrow" size={15} />
                  </a>
                </section>
              </aside>
            </div>
          </>
        )}
        <footer className="security-footer">
          <span>
            {t(
              "امنیت حساب، مستقل از سفارش و پرداخت شما.",
              "Account security is separate from your orders and payments.",
            )}
          </span>
          <span>{liveApi?"Nilart":"Nilart · Demo"}</span>
        </footer>
        {!liveApi && <details className="dash-preview">
          <summary>
            {t("حالت‌های پیش‌نمایش", "Preview states")} <bdi>USER-13 · Demo</bdi>
          </summary>
          <div>
            {previews.map(([value, fa, english]) => (
              <button
                type="button"
                key={value}
                aria-pressed={mode === value}
                onClick={() => preview(value)}
              >
                {en ? english : fa}
              </button>
            ))}
            <a
              href={`${prefix}/auth/session-expired?returnTo=${encodeURIComponent(`${account}/security`)}`}
              onClick={follow(
                `${prefix}/auth/session-expired?returnTo=${encodeURIComponent(`${account}/security`)}`,
              )}
            >
              {t("نشست منقضی", "Expired session")}
            </a>
          </div>
        </details>}
        <dialog
          ref={dialog}
          className="security-dialog modal"
          aria-labelledby="security-dialog-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <div className="modal-head">
            <h2 id="security-dialog-title">
              {modal === "sessions"
                ? revokeTarget === "others"
                  ? t("از سایر نشست‌ها خارج شوید؟", "Sign out other sessions?")
                  : t("این نشست خارج شود؟", "Sign out this session?")
                : t(
                    "مسیر مستقل تغییر شماره یا پشتیبانی",
                    "Independent phone-change or support flow",
                  )}
            </h2>
            <button
              type="button"
              className="icon-button"
              onClick={close}
              disabled={sessionBusy}
              aria-label={t("بستن", "Close")}
            >
              <Glyph name="close" />
            </button>
          </div>
          {modal === "sessions" ? (
            <div>
              <p>
                {revokeTarget === "others"
                  ? (liveApi?t("نشست‌های دیگر پایان می‌یابند و نشست جاری باقی می‌ماند.","Other sessions will end; the current session remains."):t(
                      "در پاسخ نمونه، فقط نشست‌های غیرجاری انتخاب شده‌اند. نشست جاری باقی می‌ماند؛ این اقدام حذف حساب یا لغو سفارش نیست.",
                      "The fixture selects only non-current sessions. The current session remains; this does not delete the account or cancel orders.",
                    ))
                  : (liveApi?t("نشست انتخاب‌شده پایان می‌یابد و نشست جاری باقی می‌ماند.","The selected session will end; the current session remains."):t(
                      "فقط نشست انتخاب‌شده در محدوده مجوز نمونه خارج می‌شود؛ نشست جاری باقی می‌ماند.",
                      "Only the selected session is signed out within the fixture permission; the current session remains.",
                    ))}
              </p>
              <div className="security-revoke-summary">
                {sessions
                  .filter(
                    (session) =>
                      !session.current &&
                      (revokeTarget === "others" ||
                        session.id === revokeTarget),
                  )
                  .map((session) => (
                    <strong key={session.id}>{session.device[index]}</strong>
                  ))}
              </div>
              <small>
                {(liveApi?t("تأیید این اقدام، دسترسی نشست انتخاب‌شده را پایان می‌دهد.","Confirming this action ends access for the selected session."):t(
                  "مجوز این عملیات در پاسخ Demo معتبر است؛ در نسخه واقعی تأیید نشست و احراز هویت مجدد تابع سرویس است. هیچ ابطال واقعی انجام نمی‌شود.",
                  "Operation permission is valid in the Demo response; real session checks and reauthentication follow the service policy. No actual revocation occurs.",
                ))}
              </small>
              {sessionError && (
                <p className="security-operation-error" role="alert">
                  {sessionError}
                </p>
              )}
              <div className="security-dialog-actions">
                <button
                  type="button"
                  className="button primary"
                  onClick={revoke}
                  disabled={sessionBusy}
                >
                  {sessionBusy
                    ? t("در حال خروج…", "Signing out…")
                    : t("تأیید خروج", "Confirm sign-out")}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  data-modal-cancel
                  disabled={sessionBusy}
                  onClick={close}
                >
                  {t("انصراف", "Cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p>
                {t(
                  "این فرایند مستقل است و در این صفحه طراحی نشده است. تغییر شماره با فرم تغییر رمز انجام نمی‌شود.",
                  "This flow is independent and not designed on this page. Changing the password does not change the phone number.",
                )}
              </p>
              <code dir="ltr">{destination}</code>
              <button className="button secondary" onClick={close}>
                {t("بازگشت به امنیت حساب", "Back to account security")}
              </button>
            </div>
          )}
        </dialog>
      </div>
    </DashboardPage>
  )
}
