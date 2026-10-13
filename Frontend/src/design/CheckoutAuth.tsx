import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useId, useRef, useState } from "react"
import {
  challengeError,
  createDemoChallenge,
  demoAuthPolicy,
  maskedPhone,
  normalizeDigits,
  normalizePhone,
  phoneCountries,
  validDemoPassword,
  validPhone,
  type AuthPurpose,
  type CheckoutSession,
  type DemoChallenge,
} from "./checkout"

interface Props {
  language: 0 | 1
  session: CheckoutSession
  mode: string
  onSession: (session: CheckoutSession) => void
  onNavigate: (name: string, route: string) => void
  onKeyboard: (active: boolean) => void
}
export default function CheckoutAuth({
  language,
  session,
  mode,
  onSession,
  onNavigate,
  onKeyboard,
}: Props) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const id = useId()
  const [flow, setFlow] = useState<AuthPurpose>("login")
  const [method, setMethod] = useState("password")
  const [stage, setStage] = useState("phone")
  const [phone, setPhone] = useState(session.phone || "")
  const [country, setCountry] = useState(session.country || "IR")
  const [password, setPassword] = useState("")
  const [repeat, setRepeat] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeat, setShowRepeat] = useState(false)
  const [signupTerms, setSignupTerms] = useState(false)
  const [challenge, setChallenge] = useState<DemoChallenge | null>(null)
  const [code, setCode] = useState("")
  const [proof, setProof] = useState<AuthPurpose | null>(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState("")
  const [clock, setClock] = useState(Date.now())
  const [retryAt, setRetryAt] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submitting = useRef(false)
  const codeRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const verifiedRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (session.status === "verified") {
      onKeyboard(false)
      verifiedRef.current?.focus({ preventScroll: true })
    }
  }, [session.status, onKeyboard])
  const offline = mode === "offline"
  const seconds = challenge
    ? Math.max(0, Math.ceil((challenge.resendAt - clock) / 1000))
    : 0
  const limited = retryAt > clock
  useEffect(() => {
    const tick = setInterval(() => setClock(Date.now()), 1000)
    return () => {
      clearInterval(tick)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])
  useEffect(() => {
    if (stage === "code") codeRef.current?.focus()
    if (stage === "new-password") passwordRef.current?.focus()
  }, [stage])
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    submitting.current = false
    setBusy(false)
    if (session.status === "expired") {
      setFlow("login")
      setMethod("password")
      setSignupTerms(false)
      setShowPassword(false)
      setShowRepeat(false)
      setPhone("")
      setPassword("")
      setRepeat("")
      setCode("")
      setProof(null)
      setChallenge(null)
      setStage("phone")
    }
  }, [mode, session.status])
  const resetFlow = (next: AuthPurpose) => {
    if (timer.current) clearTimeout(timer.current)
    submitting.current = false
    setBusy(false)
    setShowPassword(false)
    setShowRepeat(false)
    setFlow(next)
    setStage("phone")
    setChallenge(null)
    setProof(null)
    setCode("")
    setPassword("")
    setRepeat("")
    setErrors({})
    setMessage("")
    setRetryAt(0)
  }
  const asyncAction = (action: () => void) => {
    if (submitting.current || offline || limited) return
    submitting.current = true
    setBusy(true)
    setErrors({})
    timer.current = setTimeout(() => {
      submitting.current = false
      setBusy(false)
      if (mode === "rate-limited") {
        setRetryAt(Date.now() + 60000)
        setErrors({
          form: t(
            "تلاش‌ها محدود شده‌اند؛ بعداً طبق بازه سرویس نمونه دوباره تلاش کنید.",
            "Attempts are limited. Retry after the demo service interval.",
          ),
        })
        return
      }
      if (mode === "restricted") {
        setErrors({
          form: t(
            "ادامه در این حالت حساب محدود است؛ با پشتیبانی تماس بگیرید.",
            "This account state cannot continue. Contact support.",
          ),
        })
        return
      }
      action()
    }, 550)
  }
  const complete = () => {
    onSession({
      status: "verified",
      country,
      phone: normalizePhone(phone, country),
      demo: true,
      ...(flow === "register"
        ? { signupTermsVersion: demoAuthPolicy.signupTermsVersion }
        : {}),
    })
    setPassword("")
    setRepeat("")
    setCode("")
    setProof(null)
    setChallenge(null)
    setMessage("")
  }
  const checkPhone = () => {
    if (!validPhone(phone, country)) {
      setErrors({
        phone: t(
          "شماره مطابق کشور انتخاب‌شده معتبر نیست.",
          "Enter a valid phone number for the selected country.",
        ),
      })
      return false
    }
    return true
  }
  const purpose = session.status === "unverified" ? "verify" : flow
  const sendCode = () => {
    if (!checkPhone()) return
    if (flow === "register" && !signupTerms) {
      setErrors({
        terms: t(
          "پذیرش شرایط نمونه ثبت‌نام لازم است.",
          "Accept the demo registration terms.",
        ),
      })
      return
    }
    asyncAction(() => {
      if (mode === "sms-error") {
        setErrors({
          phone: t(
            "ارسال کد در این حالت نمونه ناموفق بود. دوباره تلاش کنید.",
            "Code sending failed in this demo state. Try again.",
          ),
        })
        return
      }
      if (mode === "rate-limited") {
        setRetryAt(Date.now() + 60000)
        setErrors({
          form: t(
            "تلاش‌ها محدود شده‌اند؛ پس از بازه نمونه سرویس دوباره تلاش کنید.",
            "Too many attempts. Wait for the demo service's retry interval.",
          ),
        })
        return
      }
      if (mode === "restricted") {
        setErrors({
          form: t(
            "ادامه برای این حساب در حالت نمونه محدود است؛ با پشتیبانی تماس بگیرید.",
            "This demo account is restricted. Contact support.",
          ),
        })
        return
      }
      setChallenge(createDemoChallenge(purpose))
      setClock(Date.now())
      setCode("")
      setStage("code")
      setMessage(
        flow === "recovery"
          ? t(
              "اگر حسابی با این شماره وجود داشته باشد، کد ارسال می‌شود. در این نمونه پیامکی ارسال نمی‌شود.",
              "If an account exists for this number, a code will be sent. No SMS is sent in this demo.",
            )
          : t(
              "مرحله کد در نمونه آماده شد؛ پیامک واقعی ارسال نشده است.",
              "The demo code step is ready. No real SMS was sent.",
            ),
      )
    })
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (stage === "code") {
      const issue = challengeError(challenge, purpose, code)
      if (issue || mode === "otp-invalid" || mode === "otp-expired") {
        setErrors({
          code:
            issue === "expired" || mode === "otp-expired"
              ? t(
                  "کد منقضی شده است؛ کد جدید درخواست کنید.",
                  "The code expired. Request a new code.",
                )
              : t(
                  "کد معتبر نیست؛ دوباره بررسی کنید.",
                  "The code is invalid. Please check it again.",
                ),
        })
        return
      }
      asyncAction(() => {
        setChallenge((previous) =>
          previous ? { ...previous, used: true } : null,
        )
        if (flow === "register" || flow === "recovery") {
          setProof(flow)
          setStage("new-password")
          setMessage("")
        } else complete()
      })
      return
    }
    if (stage === "new-password") {
      if (proof !== flow || !validDemoPassword(password, repeat)) {
        setErrors({
          password:
            password.length < demoAuthPolicy.passwordMinLength
              ? t(
                  "رمز با policy نمونه سرویس سازگار نیست.",
                  "The password doesn't meet the demo service policy.",
                )
              : "",
          repeat:
            password !== repeat
              ? t("تکرار رمز یکسان نیست.", "Passwords don't match.")
              : "",
          form:
            proof !== flow
              ? t(
                  "تأیید شماره را دوباره انجام دهید.",
                  "Verify your phone again.",
                )
              : "",
        })
        return
      }
      asyncAction(complete)
      return
    }
    if (
      flow !== "login" ||
      method === "otp" ||
      session.status === "unverified"
    ) {
      sendCode()
      return
    }
    if (!checkPhone()) return
    if (!password) {
      setErrors({
        password: t("رمز عبور را وارد کنید.", "Enter your password."),
      })
      return
    }
    asyncAction(() => {
      if (mode === "invalid-credentials") {
        setErrors({
          form: t(
            "شماره یا رمز معتبر نیست.",
            "Phone number or password is invalid.",
          ),
        })
        return
      }
      if (mode === "rate-limited") {
        setRetryAt(Date.now() + 60000)
        setErrors({
          form: t(
            "تلاش‌های زیاد؛ پس از محدودیت زمانی نمونه دوباره تلاش کنید.",
            "Too many attempts. Wait for the demo retry interval.",
          ),
        })
        return
      }
      if (mode === "restricted") {
        setErrors({
          form: t(
            "این حساب در نمونه محدود است. با پشتیبانی تماس بگیرید.",
            "This demo account is restricted. Contact support.",
          ),
        })
        return
      }
      complete()
    })
  }
  const fieldPassword = (confirm = false) => (
    <div className="checkout-field">
      <label htmlFor={`${id}-${confirm ? "repeat" : "password"}`}>
        {confirm
          ? t("تکرار رمز", "Repeat password")
          : stage === "new-password"
            ? t("رمز جدید", "New password")
            : t("رمز عبور", "Password")}
      </label>
      <div className="checkout-password-input">
        <input
          ref={!confirm && stage === "new-password" ? passwordRef : undefined}
          id={`${id}-${confirm ? "repeat" : "password"}`}
          dir="ltr"
          type={(confirm ? showRepeat : showPassword) ? "text" : "password"}
          autoComplete={
            stage === "new-password" ? "new-password" : "current-password"
          }
          value={confirm ? repeat : password}
          onChange={(event) =>
            confirm
              ? setRepeat(event.target.value)
              : setPassword(event.target.value)
          }
          disabled={busy || offline}
          aria-invalid={!!errors[confirm ? "repeat" : "password"]}
          aria-describedby={
            errors[confirm ? "repeat" : "password"]
              ? `${id}-${confirm ? "repeat" : "password"}-error`
              : undefined
          }
        />
        <button
          type="button"
          className="icon-button"
          onClick={() =>
            confirm
              ? setShowRepeat(!showRepeat)
              : setShowPassword(!showPassword)
          }
          aria-label={
            (confirm ? showRepeat : showPassword)
              ? confirm
                ? t("پنهان‌کردن تکرار رمز", "Hide repeat password")
                : t("پنهان‌کردن رمز", "Hide password")
              : confirm
                ? t("نمایش تکرار رمز", "Show repeat password")
                : t("نمایش رمز", "Show password")
          }
        >
          <EyeIcon hidden={confirm ? showRepeat : showPassword} />
        </button>
      </div>
      {errors[confirm ? "repeat" : "password"] && (
        <p
          id={`${id}-${confirm ? "repeat" : "password"}-error`}
          className="checkout-field-error"
          role="alert"
        >
          {errors[confirm ? "repeat" : "password"]}
        </p>
      )}
    </div>
  )
  if (session.status === "verified")
    return (
      <section className="checkout-auth-card verified">
        <div className="checkout-verified-icon">
          <CheckIcon />
        </div>
        <div>
          <span className="eyebrow">{t("حساب نمایشی", "DEMO ACCOUNT")}</span>
          <h2 ref={verifiedRef} tabIndex={-1}>
            {t("حساب شما تأیید شده است.", "Your account is confirmed.")}
          </h2>
          <p>
            <span dir="ltr">{maskedPhone(session.phone)}</span> ·{" "}
            {t("شماره تأییدشده در نمونه", "Phone verified in this demo")}
          </p>
          <small>
            {t(
              "تأیید واقعی حساب یا پیامک انجام نشده است.",
              "No real account verification or SMS has occurred.",
            )}
          </small>
          <button
            className="filter-clear"
            onClick={() => {
              onSession({ status: "guest", demo: true })
              setPhone("")
              resetFlow("login")
            }}
          >
            {t("استفاده از حساب دیگر", "Use another account")}
          </button>
        </div>
      </section>
    )
  const strength =
    password.length >= demoAuthPolicy.passwordMinLength
      ? Math.min(
          4,
          1 +
            Number(/[a-z]/i.test(password)) +
            Number(/\d/.test(password)) +
            Number(/[^a-z0-9]/i.test(password)),
        )
      : password
        ? 1
        : 0
  return (
    <section className="checkout-auth-card">
      <div className="checkout-auth-heading">
        <span className="checkout-section-index">01</span>
        <div>
          <h2>
            {session.status === "unverified"
              ? t("شماره تلفن را تأیید کنید.", "Verify your phone number.")
              : t(
                  "برای ادامه، حساب خود را تأیید کنید.",
                  "Confirm your account to continue.",
                )}
          </h2>
          <p>
            {t(
              "احراز هویت نمایشی؛ هیچ حساب واقعی ساخته نمی‌شود.",
              "Demo authentication; no real account is created.",
            )}
          </p>
        </div>
      </div>
      {session.status === "expired" && (
        <p className="checkout-notice warning" role="alert">
          {t(
            "نشست شما پایان یافته؛ دوباره وارد شوید.",
            "Your session has expired; please sign in again.",
          )}
        </p>
      )}
      {session.status !== "unverified" && (
        <AuthChoice
          label={t("ورود یا ثبت‌نام", "Sign in or create an account")}
          value={flow === "register" ? "register" : "login"}
          choices={[
            ["login", t("ورود", "Sign in")],
            ["register", t("ساخت حساب", "Create account")],
          ]}
          onChange={(value) => resetFlow(value as AuthPurpose)}
        />
      )}
      {flow === "login" &&
        stage === "phone" &&
        session.status !== "unverified" && (
          <AuthChoice
            label={t("روش ورود", "Sign-in method")}
            value={method}
            choices={[
              ["password", t("با رمز عبور", "With password")],
              ["otp", t("با کد یک‌بارمصرف", "With a one-time code")],
            ]}
            onChange={(value) => {
              setMethod(value)
              resetFlow("login")
            }}
          />
        )}
      {flow === "register" && (
        <ol
          className="checkout-signup-steps"
          aria-label={t("مراحل ثبت‌نام", "Registration steps")}
        >
          {[
            t("شماره", "Phone"),
            t("تأیید کد", "Verify code"),
            t("ساخت رمز", "Password"),
          ].map((label, index) => (
            <li
              key={label}
              aria-current={
                (stage === "phone" ? 0 : stage === "code" ? 1 : 2) === index
                  ? "step"
                  : undefined
              }
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      )}
      {flow === "recovery" && (
        <div className="checkout-recovery-title">
          <h3>{t("بازیابی رمز عبور", "Reset your password")}</h3>
          <button className="filter-clear" onClick={() => resetFlow("login")}>
            {t("بازگشت به ورود", "Back to sign in")}
          </button>
        </div>
      )}
      <form
        className="checkout-auth-form"
        onSubmit={submit}
        onFocusCapture={() => onKeyboard(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            onKeyboard(false)
        }}
      >
        {stage === "phone" ? (
          <>
            <div className="checkout-field">
              <label htmlFor={`${id}-phone`}>
                {t("شماره تلفن", "Phone number")}
              </label>
              <div className="checkout-phone-input">
                <SelectDropdown
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  aria-label={t("کد کشور", "Country code")}
                  disabled={busy || offline}
                >
                  {phoneCountries.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      aria-label={`${item.name[language]} ${item.code}`}
                    >
                      {item.code} · {item.id}
                    </option>
                  ))}
                </SelectDropdown>
                <input
                  id={`${id}-phone`}
                  dir="ltr"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(event) =>
                    setPhone(normalizeDigits(event.target.value))
                  }
                  placeholder={t("شماره موبایل", "Mobile number")}
                  disabled={busy || offline}
                  aria-invalid={!!errors.phone}
                  aria-describedby={
                    errors.phone ? `${id}-phone-error` : undefined
                  }
                />
              </div>
              {errors.phone && (
                <p
                  className="checkout-field-error"
                  id={`${id}-phone-error`}
                  role="alert"
                >
                  {errors.phone}
                </p>
              )}
            </div>
            {flow === "login" &&
              method === "password" &&
              session.status !== "unverified" && (
                <>
                  {fieldPassword()}
                  <button
                    type="button"
                    className="filter-clear checkout-forgot-link"
                    onClick={() => resetFlow("recovery")}
                  >
                    {t("رمز را فراموش کرده‌اید؟", "Forgot your password?")}
                  </button>
                </>
              )}
            {flow === "register" && (
              <label className="checkout-checkbox">
                <input
                  type="checkbox"
                  checked={signupTerms}
                  aria-invalid={!!errors.terms}
                  aria-describedby={
                    errors.terms ? `${id}-terms-error` : undefined
                  }
                  onChange={(event) => setSignupTerms(event.target.checked)}
                  disabled={busy}
                />
                <span>
                  {t(
                    "شرایط نمونه ثبت‌نام را می‌پذیرم؛ نسخه مصوب برند هنوز ارائه نشده است.",
                    "I accept the demo registration terms; approved brand terms have not been supplied.",
                  )}
                  <a
                    href="/terms"
                    onClick={(event) => {
                      event.preventDefault()
                      onNavigate(
                        t("شرایط ثبت‌نام", "Registration terms"),
                        "/terms",
                      )
                    }}
                  >
                    {t("مشاهده شرایط", "View terms")}
                  </a>
                </span>
              </label>
            )}
          </>
        ) : stage === "code" ? (
          <>
            <h3>{t("کد ارسال‌شده را وارد کنید.", "Enter the code we sent.")}</h3>
            <p className="checkout-masked-phone">
              <span dir="ltr">
                {phoneCountries.find((item) => item.id === country)?.code}{" "}
                {maskedPhone(normalizePhone(phone, country))}
              </span>
              <button
                type="button"
                className="filter-clear"
                disabled={busy}
                onClick={() => {
                  setStage("phone")
                  setChallenge(null)
                  setProof(null)
                  setCode("")
                  setErrors({})
                }}
              >
                {t("تغییر شماره", "Change number")}
              </button>
            </p>
            <div className="checkout-field">
              <label htmlFor={`${id}-otp`}>
                {t("کد تأیید", "Verification code")}
              </label>
              <input
                className="checkout-otp"
                id={`${id}-otp`}
                ref={codeRef}
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                onPaste={(event) => {
                  event.preventDefault()
                  setCode(
                    normalizeDigits(event.clipboardData.getData("text"))
                      .replace(/\D/g, "")
                      .slice(0, challenge?.length || 6),
                  )
                }}
                maxLength={challenge?.length || demoAuthPolicy.otpLength}
                value={code}
                onChange={(event) =>
                  setCode(
                    normalizeDigits(event.target.value)
                      .replace(/\D/g, "")
                      .slice(0, challenge?.length || 6),
                  )
                }
                disabled={busy || offline}
                aria-invalid={!!errors.code}
                aria-describedby={
                  errors.code ? `${id}-code-error` : `${id}-otp-demo`
                }
              />
              {errors.code && (
                <p
                  className="checkout-field-error"
                  id={`${id}-code-error`}
                  role="alert"
                >
                  {errors.code}
                </p>
              )}
              <p id={`${id}-otp-demo`} className="checkout-demo-note">
                {t(
                  "فقط نمونه محلی: ورود شش رقم، تأیید نمایشی را شبیه‌سازی می‌کند؛ این کد واقعی پیامک نیست.",
                  "Local demo only: entering six digits simulates verification. This is not a real SMS code.",
                )}
              </p>
            </div>
            <div className="checkout-resend">
              <button
                type="button"
                className="filter-clear"
                disabled={seconds > 0 || busy || offline || limited}
                onClick={sendCode}
              >
                {t("ارسال مجدد", "Resend code")}
              </button>
              {seconds > 0 && (
                <span aria-hidden="true">
                  {seconds.toLocaleString(language === 0 ? "fa-IR" : "en-US")}{" "}
                  {t("ثانیه تا ارسال مجدد", "seconds until resend")}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            {fieldPassword()}
            {fieldPassword(true)}
            <div
              className="checkout-strength"
              role="progressbar"
              aria-label={t(
                "قدرت رمز — شاخص نمونه",
                "Password strength — demo indicator",
              )}
              aria-valuemin={0}
              aria-valuemax={4}
              aria-valuenow={strength}
            >
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  className={index < strength ? "active" : ""}
                />
              ))}
            </div>
            <p className="checkout-demo-note">
              {t(
                `policy نمونه سرویس: حداقل ${demoAuthPolicy.passwordMinLength} نویسه. این قاعده، policy واقعی برند نیست.`,
                `Demo service policy: at least ${demoAuthPolicy.passwordMinLength} characters. This is not the brand's production policy.`,
              )}
            </p>
          </>
        )}
        {errors.terms && (
          <p
            id={`${id}-terms-error`}
            className="checkout-field-error"
            role="alert"
          >
            {errors.terms}
          </p>
        )}
        {errors.form && (
          <p className="checkout-field-error" role="alert">
            {errors.form}
          </p>
        )}
        {message && (
          <p className="checkout-auth-message" role="status">
            {message}
          </p>
        )}
        <button
          className="button primary checkout-auth-submit"
          disabled={busy || offline || limited}
          aria-busy={busy}
          type="submit"
        >
          {busy
            ? t("در حال بررسی…", "Checking…")
            : stage === "code"
              ? t("تأیید کد", "Verify code")
              : stage === "new-password"
                ? flow === "register"
                  ? t("ساخت حساب و ادامه", "Create account and continue")
                  : t("ذخیره رمز جدید و ورود", "Save new password and sign in")
                : session.status === "unverified"
                  ? t("ارسال کد تأیید", "Send verification code")
                  : flow === "register"
                    ? t("ارسال کد ثبت‌نام", "Send registration code")
                    : flow === "recovery"
                      ? t("ارسال کد بازیابی", "Send reset code")
                      : method === "otp"
                        ? t("ارسال کد ورود", "Send sign-in code")
                        : t("ورود و ادامه", "Sign in and continue")}
        </button>
        {limited && (
          <p className="checkout-demo-note">
            {t(
              "محدودیت تلاش از پاسخ سرویس نمونه محاسبه شده است.",
              "The attempt limit is based on the demo service response.",
            )}
          </p>
        )}
      </form>
    </section>
  )
}
function AuthChoice({
  label,
  value,
  choices,
  onChange,
}: {
  label: string
  value: string
  choices: string[][]
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <fieldset className="checkout-auth-choice">
      <legend className="sr-only">{label}</legend>
      {choices.map(([key, text]) => (
        <label className={value === key ? "selected" : ""} key={key}>
          <input
            type="radio"
            name={id}
            checked={value === key}
            onChange={() => onChange(key)}
          />
          <span>{text}</span>
        </label>
      ))}
    </fieldset>
  )
}
function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {hidden && <path d="m3 3 18 18" />}
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m7 12 3 3 7-7" />
    </svg>
  )
}
