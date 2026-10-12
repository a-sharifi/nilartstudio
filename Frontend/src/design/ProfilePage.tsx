import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import {
  profileFixture,
  profileDraft,
  profileDirty,
  validateProfile,
  profilePayload,
  applyProfileResponse,
  type ProfileDraft,
  type ProfileMode,
  type ProfileRecord,
} from "./profile"
import type { ReferenceNavigationGuard } from "./ReferencesPage"
import type { LiveSessionEvent } from "./auth"
import "./profile.css"

type SaveState = "idle" | "saving" | "success" | "error" | "unknown" | "conflict"
type Modal = "leave" | "destination" | null
const modes: [ProfileMode, string, string][] = [
  ["normal", "نام و شماره حساب", "Name & account phone"],
  ["optional-empty", "نام اختیاری خالی", "Empty optional name"],
  ["email", "ایمیل فعال در Demo", "Email enabled in Demo"],
  ["email-empty", "ایمیل اختیاری خالی", "Empty optional email"],
  ["dirty", "تغییرات ذخیره‌نشده", "Unsaved changes"],
  [
    "required-name",
    "تکمیل نام برای اقدام Demo",
    "Complete name for Demo action",
  ],
  ["conflict", "تعارض نسخه", "Version conflict"],
  ["loading", "بارگذاری", "Loading"],
  ["network", "خطای دریافت", "Load error"],
  ["save-error", "خطای ذخیره", "Save error"],
  ["unknown", "نتیجه ذخیره نامشخص", "Unknown save result"],
  ["restricted", "ویرایش محدود", "Editing restricted"],
  ["denied", "عدم دسترسی", "Access denied"],
]
export default function ProfilePage({
  page,
  navigate,
  registerGuard,
  liveApi,
}: {
  page: string
  navigate: (route: string) => void
  registerGuard: (guard: ReferenceNavigationGuard | null) => void
  liveApi?: { load(): Promise<ProfileRecord>; save(payload: ReturnType<typeof profilePayload>, owner: string): Promise<ProfileRecord>; subscribe?(listener: (event: LiveSessionEvent) => void): () => void }
}) {
  const en = page.startsWith("/en/"),
    t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa",
    account = `${prefix}/account`
  const [mode, setMode] = useState<ProfileMode>(liveApi ? "loading" : "normal")
  const [record, setRecord] = useState<ProfileRecord>(() => liveApi ? { owner: "", fullName: "", phone: "", phoneVerified: false, email: null, emailVerified: false, version: 0 } : profileFixture("normal").record)
  const [draft, setDraft] = useState(() =>
    profileDraft(record),
  )
  const [state, setState] = useState<SaveState>("idle")
  const [errors, setErrors] =
    useState<Partial<Record<keyof ProfileDraft, string>>>({})
  const [live, setLive] = useState(""),
    [checking, setChecking] = useState(false)
  const [latest, setLatest] = useState<ProfileRecord | null>(null)
  const [modal, setModal] = useState<Modal>(null),
    [destination, setDestination] = useState("")
  const dialog = useRef<HTMLDialogElement>(null),
    form = useRef<HTMLFormElement>(null)
  const origin = useRef<HTMLElement | null>(null),
    leaveAction = useRef<(() => void) | null>(null)
  const dirtyRef = useRef(false),
    authorizedRef = useRef(true),
    savingRef = useRef(false)
  const lock = useRef(false),
    conflictInjected = useRef(false),
    timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const authoritative = useRef(record)
  const liveMounted = useRef(false),
    sessionGeneration = useRef(0),
    readGeneration = useRef(0)
  const saveStateRef = useRef(state)
  saveStateRef.current = state
  const replaceLiveRecord = (value: ProfileRecord) => {
    sessionGeneration.current += 1
    authoritative.current = value
    setRecord(value); setDraft(profileDraft(value)); setLatest(null)
    setState("idle"); setErrors({}); setMode("normal"); setLive("")
    setChecking(false); setModal(null)
    leaveAction.current = null
    dirtyRef.current = false
    lock.current = false
  }
  const denyLiveProfile = () => {
    sessionGeneration.current += 1
    readGeneration.current += 1
    const empty = { owner: "", fullName: "", phone: "", phoneVerified: false, email: null, emailVerified: false, version: 0 }
    authoritative.current = empty
    setRecord(empty); setDraft(profileDraft(empty)); setLatest(null)
    setState("idle"); setErrors({}); setLive(""); setMode("denied")
    setChecking(false); setModal(null)
    leaveAction.current = null
    dirtyRef.current = false
    lock.current = false
  }
  useEffect(() => {
    if (!liveApi) return
    liveMounted.current = true
    const revalidate = async () => {
      const request = ++readGeneration.current
      try {
        const value = await liveApi.load()
        if (!liveMounted.current || request !== readGeneration.current) return
        if (value.owner !== authoritative.current.owner) replaceLiveRecord(value)
        else {
          setMode("normal"); setChecking(false)
          if (saveStateRef.current === "conflict" || saveStateRef.current === "unknown") {
            setLatest(value); setState("conflict")
          }
        }
      } catch (error) {
        if (!liveMounted.current || request !== readGeneration.current) return
        if (error instanceof Error && error.message === "denied") denyLiveProfile()
        else { setMode("network"); setChecking(false) }
      }
    }
    void revalidate()
    const unsubscribe = liveApi.subscribe?.((event) => {
      if (event.type === "changed") {
        denyLiveProfile()
        if (event.signedOut) return
      }
      void revalidate()
    })
    const channel = !liveApi.subscribe && typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("nilart-auth-status") : null
    if (channel) channel.onmessage = (event) => { if (event.data?.type === "session-changed") void revalidate() }
    if (!liveApi.subscribe) window.addEventListener("focus", revalidate)
    return () => {
      liveMounted.current = false
      sessionGeneration.current += 1
      readGeneration.current += 1
      unsubscribe?.(); channel?.close(); window.removeEventListener("focus", revalidate)
    }
  }, [liveApi])
  const policy = liveApi ? { ...profileFixture("normal").policy, phoneChangeEnabled: false } : profileFixture(mode).policy
  const authorized = mode !== "denied"
  const loaded = authorized && !["loading", "network"].includes(mode)
  const dirty = loaded && profileDirty(record, draft, policy)
  const blocked =
    state === "saving" || state === "unknown" || state === "conflict"
  dirtyRef.current = profileDirty(record, draft, policy) || state === "unknown"
  authorizedRef.current = authorized && (liveApi ? !!record.owner : loaded)
  savingRef.current = state === "saving"
  const later = (fn: () => void, ms = 750) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      fn()
    }, ms)
    timers.current.add(timer)
  }
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      lock.current = false
    },
    [],
  )
  useEffect(() => {
    const guard: ReferenceNavigationGuard = (proceed) => {
      if (savingRef.current) return false
      if (!authorizedRef.current || !dirtyRef.current) {
        proceed()
        return true
      }
      leaveAction.current = proceed
      origin.current = (document.activeElement as HTMLElement)
      setModal("leave")
      return false
    }
    registerGuard(guard)
    return () => registerGuard(null)
  }, [registerGuard])
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current && authorizedRef.current) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", unload)
    return () => window.removeEventListener("beforeunload", unload)
  }, [])
  useEffect(() => {
    if (modal) {
      if (!dialog.current?.open) dialog.current?.showModal()
      requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>(modal === "leave" ? "[data-stay]" : "button")?.focus())
    }
    else if (!modal && dialog.current?.open) dialog.current.close()
  }, [modal])
  const close = () => {
    setModal(null)
    leaveAction.current = null
    requestAnimationFrame(() => {
      if (origin.current?.isConnected) origin.current.focus()
      else form.current?.querySelector<HTMLElement>("#profile-fullName")?.focus()
    })
  }
  const requestLeave = (proceed: () => void) => {
    if (state === "saving") return
    if (dirtyRef.current && authorizedRef.current) {
      origin.current = (document.activeElement as HTMLElement)
      leaveAction.current = proceed
      setModal("leave")
    } else proceed()
  }
  const showDestination = (route: string) => {
    origin.current = (document.activeElement as HTMLElement)
    setDestination(route)
    setModal("destination")
  }
  const internalRoute = (route: string) =>
    /^\/(fa|en)\/account\/(profile|addresses|downloads|favorites|security|preferences)$/.test(
      route,
    ) ||
    route === account ||
    route === "/" ||
    route === "/cart" ||
    route.includes("/auth/")
  const beforePanelNavigation = (route: string, proceed: () => void) => {
    // A language change keeps this component and its raw user-entered values mounted.
    if (/^\/(fa|en)\/account\/profile$/.test(route)) {
      if (liveApi && dirtyRef.current) { requestLeave(proceed); return }
      proceed()
      return
    }
    requestLeave(() => {
      if (internalRoute(route)) proceed()
      else showDestination(route)
    })
  }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    requestLeave(() => {
      if (internalRoute(route)) navigate(route)
      else showDestination(route)
    })
  }
  const leaveWithoutSaving = () => {
    dirtyRef.current = false
    const proceed = leaveAction.current
    setDraft(profileDraft(record))
    setErrors({})
    setModal(null)
    leaveAction.current = null
    proceed?.()
  }
  const discard = () => {
    setDraft(profileDraft(record))
    setErrors({})
    setLatest(null)
    if (state !== "unknown") {
      setState("idle")
      lock.current = false
    }
    setLive(
      t(
        "تغییرات به آخرین نسخه معتبر نمونه بازگردانده شدند.",
        "Changes reverted to the last valid fixture version.",
      ),
    )
  }
  const change = (field: keyof ProfileDraft, value: string) => {
    if (!loaded || !policy.canEdit || blocked) return
    setDraft((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    if (state === "success" || state === "error") setState("idle")
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (lock.current || !loaded || !policy.canEdit || !dirty || blocked) return
    const validation = validateProfile(draft, policy)
    setErrors(validation)
    if (Object.keys(validation).length) {
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>(`#profile-${Object.keys(validation)[0]}`)
          ?.focus(),
      )
      return
    }
    const payload = liveApi ? { fullName: draft.fullName.trim(), version: record.version } : profilePayload(draft, policy, record.version)
    lock.current = true
    setState("saving")
    setLive("")
    if (liveApi) {
      const generation = sessionGeneration.current
      const current = () => liveMounted.current && generation === sessionGeneration.current
      try {
        const saved = await liveApi.save(payload, record.owner)
        if (!current()) return
        readGeneration.current += 1
        setChecking(false)
        authoritative.current = saved; setRecord(saved); setDraft(profileDraft(saved)); setState("success")
        setLive(t("اطلاعات پروفایل ذخیره شد.", "Your profile has been saved."))
      } catch (error) {
        if (!current()) return
        const code = error instanceof Error ? error.message : "unknown"
        if (code === "denied") denyLiveProfile()
        else if (code === "conflict") {
          setState("conflict")
          const request = ++readGeneration.current
          try {
            const value = await liveApi.load()
            if (!current() || request !== readGeneration.current) return
            if (value.owner !== authoritative.current.owner) replaceLiveRecord(value)
            else setLatest(value)
          } catch (error) {
            if (!current() || request !== readGeneration.current) return
            if (error instanceof Error && error.message === "denied") denyLiveProfile()
            else setState("unknown")
          }
        } else setState(code === "service" ? "error" : "unknown")
      } finally { if (current()) lock.current = false }
      return
    }
    later(() => {
      if (mode === "unknown") {
        setState("unknown")
        setLive(
          t(
            "نتیجه ذخیره هنوز تأیید نشده است. پیش از ارسال دوباره، وضعیت نسخه حساب را بررسی کنید.",
            "The save result has not been confirmed yet. Check the account version before submitting again.",
          ),
        )
        return
      }
      lock.current = false
      if (mode === "save-error") {
        setState("error")
        setLive(
          t(
            "ذخیره تأیید نشد؛ ورودی‌های شما حفظ شده‌اند. سرویس واقعی متصل نیست.",
            "Save was not confirmed; your inputs were preserved. No real service is connected.",
          ),
        )
        return
      }
      if (mode === "conflict" && !conflictInjected.current) {
        conflictInjected.current = true
        authoritative.current = {
          ...record,
          fullName: "سارا احمدی — نسخه جدید نمونه",
          version: record.version + 1,
        }
        setLatest(authoritative.current)
        setState("conflict")
        setLive(
          t(
            "اطلاعات حساب در جای دیگری تغییر کرده است. نسخه جدید را بررسی کنید. ورودی‌های شما جایگزین نشده‌اند.",
            "Your account details changed elsewhere. Review the latest version. Your inputs have not been replaced.",
          ),
        )
        return
      }
      const response = applyProfileResponse(
        authoritative.current,
        payload,
        policy,
        "demo-customer",
      )
      if (response.error) {
        if (response.error === "conflict") {
          setLatest(authoritative.current)
          setState("conflict")
        } else setState("error")
        setLive(
          t(
            "اطلاعات را بررسی کنید؛ ذخیره تأیید نشد.",
            "Review the entered information; save was not confirmed.",
          ),
        )
        return
      }
      authoritative.current = response.record
      setRecord(response.record)
      setDraft(profileDraft(response.record))
      setState("success")
      setLive(
        t(
          "اطلاعات پروفایل ذخیره شد · Demo؛ ذخیره واقعی سرویس انجام نشده است. شماره ورود، سفارش و رسید تغییر نکردند.",
          "Your profile has been saved · Demo; no real service save occurred. Sign-in phone, orders and receipts were not changed.",
        ),
      )
    })
  }
  const check = async () => {
    if (checking) return
    setChecking(true)
    if (liveApi) {
      const request = ++readGeneration.current
      try {
        const value = await liveApi.load()
        if (!liveMounted.current || request !== readGeneration.current) return
        if (value.owner !== authoritative.current.owner) { replaceLiveRecord(value); return }
        authoritative.current = value
        if (mode === "network" || mode === "loading") {
          setMode("normal")
          if (!profileDirty(record, draft, policy) && state !== "saving" && state !== "unknown" && state !== "conflict") {
            setRecord(value); setDraft(profileDraft(value)); setState("idle")
          } else if (value.version !== record.version && state !== "saving") {
            setLatest(value); setState("conflict")
          }
        } else { setLatest(value); setState("conflict") }
      } catch (error) {
        if (liveMounted.current && request === readGeneration.current && error instanceof Error && error.message === "denied") denyLiveProfile()
      }
      finally { if (liveMounted.current && request === readGeneration.current) setChecking(false) }
      return
    }
    later(() => {
      setChecking(false)
      setLive(
        t(
          "نسخه معتبر تازه دریافت نشد؛ سرویس متصل نیست. تغییرات دوباره ارسال نشدند.",
          "A fresh valid version could not be retrieved; no service is connected. Changes were not resubmitted.",
        ),
      )
    })
  }
  const preview = (value: ProfileMode) => {
    if (liveApi) return
    timers.current.forEach(clearTimeout)
    timers.current.clear()
    lock.current = false
    conflictInjected.current = false
    const fixture = profileFixture(value)
    authoritative.current = fixture.record
    setMode(value)
    setRecord(fixture.record)
    setDraft(
      value === "dirty"
        ? {
            ...profileDraft(fixture.record),
            fullName: "سارا احمدی — ویرایش نمونه",
          }
        : profileDraft(fixture.record),
    )
    setErrors({})
    setState("idle")
    setLatest(null)
    setLive("")
    setChecking(false)
    setModal(null)
  }
  const emailChanged =
    policy.emailSupported && draft.email.trim() !== (record.email || "")
  return (
    <DashboardPage
      page={page}
      navigate={navigate}
      renderMedia={() => null}
      activeSection="profile"
      notificationUnreadCount={liveApi ? null : undefined}
      liveMode={!!liveApi}
      onBeforeNavigate={beforePanelNavigation}
      panelTitle={t("پروفایل شما", "Your profile")}
    >
      <div className="profile-page">
        <nav
          className="profile-breadcrumb"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          <a href={account} onClick={follow(account)}>
            {t("حساب", "Account")}
          </a>
          <span>/</span>
          <span aria-current="page">{t("پروفایل", "Profile")}</span>
        </nav>
        <div className="profile-heading">
          <div>
            <span className="profile-eyebrow">YOUR ACCOUNT · USER-12</span>
            <h1>{t("پروفایل شما", "Your profile")}</h1>
            <p>
              {t(
                "اطلاعات پایه حساب و راه‌های تماس خود را بررسی کنید.",
                "Review your account details and contact information.",
              )}
            </p>
          </div>
          <span className="profile-heading-symbol">
            <Glyph name="user" size={30} />
          </span>
        </div>
        {!liveApi && <div className="profile-demo">
          <span>Demo</span>
          <p>
            {t(
              "اطلاعات، قابلیت‌ها و پاسخ‌ها نمونه طراحی‌اند؛ سرویس واقعی پروفایل متصل نیست. نام یک فیلد کامل دارد و ایمیل فقط در حالت قابلیت Demo نمایش داده می‌شود.",
              "Details, capabilities and responses are design fixtures; no real profile service is connected. The name uses one full-name field; email appears only in its Demo capability states.",
            )}
          </p>
        </div>}
        <div className="profile-live" role="status" aria-live="polite">
          {live}
        </div>
        {!authorized ? (
          <section className="profile-state">
            <Glyph name="shield" size={36} />
            <h2>
              {t(
                "دسترسی به پروفایل این حساب مجاز نیست.",
                "This account’s profile is not accessible.",
              )}
            </h2>
            <p>
              {t(
                "اطلاعات خصوصی تا بررسی مالکیت و نشست نمایش داده نمی‌شوند.",
                "Private information remains hidden pending ownership and session checks.",
              )}
            </p>
          </section>
        ) : mode === "loading" ? (
          <div
            className="profile-loading"
            aria-busy="true"
            aria-label={t(
              "در حال دریافت اطلاعات پروفایل",
              "Loading profile details",
            )}
          >
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : mode === "network" ? (
          <section className="profile-state">
            <Glyph name="user" size={36} />
            <h2>
              {t(
                "دریافت اطلاعات پروفایل ممکن نشد.",
                "Unable to load your profile.",
              )}
            </h2>
            <p>
              {t(
                "این خطا به معنی حذف حساب یا اطلاعات شما نیست.",
                "This error does not mean your account or details were deleted.",
              )}
            </p>
            <button
              className="button primary"
              disabled={checking}
              onClick={check}
            >
              {checking
                ? t("در حال تلاش…", "Trying…")
                : t("تلاش دوباره", "Try again")}
            </button>
          </section>
        ) : (
          <>
            {mode === "restricted" && (
              <div className="profile-restriction">
                <Glyph name="shield" size={21} />
                <div>
                  <strong>
                    {t(
                      "ویرایش پروفایل در پاسخ نمونه محدود است.",
                      "Profile editing is restricted in the fixture response.",
                    )}
                  </strong>
                  <p>
                    {t(
                      "این محدودیت به معنی پایان نشست یا محدودشدن همه امکانات نیست؛ مسیر کمک فعال است.",
                      "This does not imply session expiry or restrictions on all features; help remains available.",
                    )}
                  </p>
                </div>
                <a
                  className="text-link"
                  href={`${account}/support?topic=profile`}
                  onClick={follow(`${account}/support?topic=profile`)}
                >
                  {t("پشتیبانی حساب", "Account support")}
                  <Glyph name="arrow" size={15} />
                </a>
              </div>
            )}
            <div className="profile-layout">
              <form
                noValidate
                onSubmit={submit}
                ref={form}
                className="profile-form"
              >
                <section className="profile-card">
                  <div className="profile-section-heading">
                    <span className="profile-section-icon">
                      <Glyph name="user" size={21} />
                    </span>
                    <div>
                      <h2>{t("اطلاعات پایه", "Account details")}</h2>
                      <p>
                        {t(
                          "برای ارتباطی شخصی‌تر، بدون اطلاعات اضافی.",
                          "For a more personal connection, without unnecessary details.",
                        )}
                      </p>
                    </div>
                  </div>
                  {policy.nameRequired && (
                    <p className="profile-required-notice">
                      {t(
                        "برای ادامه این اقدام نمونه، نام خود را تکمیل کنید.",
                        "Complete your name to continue this Demo action.",
                      )}
                    </p>
                  )}
                  <div className="checkout-field profile-field">
                    <label htmlFor="profile-fullName">
                      {t("نام و نام خانوادگی", "Full name")}
                      <span>
                        {policy.nameRequired
                          ? t(
                              "الزامی طبق قرارداد Demo",
                              "Required by Demo contract",
                            )
                          : liveApi ? t("اختیاری", "Optional") : t("اختیاری در مدل Demo", "Optional in Demo model")}
                      </span>
                    </label>
                    <input
                      id="profile-fullName"
                      name="fullName"
                      autoComplete="name"
                      dir="auto"
                      value={draft.fullName}
                      onChange={(event) =>
                        change("fullName", event.target.value)
                      }
                      maxLength={liveApi ? undefined : policy.nameMax}
                      disabled={!policy.canEdit || blocked}
                      aria-required={policy.nameRequired}
                      aria-invalid={!!errors.fullName}
                      aria-describedby="profile-name-hint profile-name-error"
                      placeholder={t("نام خود را وارد کنید", "Enter your name")}
                    />
                    <small id="profile-name-hint">
                      {t(
                        liveApi ? "نام اختیاری است؛ حداکثر ۱۲۰ نویسه، بدون نویسه‌های کنترلی." : "نام فارسی یا انگلیسی پذیرفته می‌شود. محدودیت این قرارداد نمونه: ۱۲۰ نویسه.",
                        liveApi ? "Optional name, up to 120 characters without control characters." : "Persian or English names are accepted. This fixture contract allows up to 120 characters.",
                      )}
                    </small>
                    {errors.fullName && (
                      <p
                        className="checkout-field-error"
                        id="profile-name-error"
                      >
                        {errors.fullName === "name"
                          ? t("نام خود را وارد کنید.", "Enter your name.")
                          : t(
                              "اطلاعات را بررسی کنید؛ نام از محدودیت قرارداد نمونه بیشتر است یا نویسه نامعتبر دارد.",
                              "Review the entered information; the name exceeds the fixture limit or contains invalid control characters.",
                            )}
                      </p>
                    )}
                  </div>
                </section>
                <section className="profile-card">
                  <div className="profile-section-heading">
                    <span className="profile-section-icon">
                      <Glyph name="chat" size={21} />
                    </span>
                    <div>
                      <h2>{t("اطلاعات تماس", "Contact information")}</h2>
                      <p>
                        {t(
                          "شماره ورود از اطلاعات قابل ویرایش جداست.",
                          "Your sign-in phone is separate from editable details.",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="profile-phone">
                    <span className="profile-contact-label">
                      {t("شماره تلفن حساب", "Account phone number")}
                    </span>
                    <div>
                      <bdi dir="ltr">{record.phone}</bdi>
                      <span className="profile-verified">
                        <Glyph name="check" size={13} />
                        {record.phoneVerified
                          ? liveApi ? t("تأییدشده", "Verified") : t("تأییدشده · Demo", "Verified · Demo")
                          : liveApi ? t("تأییدنشده", "Unverified") : t("تأییدنشده · Demo", "Unverified · Demo")}
                      </span>
                    </div>
                    <p>
                      {t(
                        "شماره ورود در این فرم تغییر نمی‌کند؛ تلفن گیرنده مرسوله مستقل است.",
                        "The sign-in phone cannot be changed in this form; shipment recipient phone is separate.",
                      )}
                    </p>
                    {policy.phoneChangeEnabled ? (
                      <a
                        className="text-link"
                        href={`${account}/security/change-phone`}
                        onClick={follow(`${account}/security/change-phone`)}
                      >
                        {t("تغییر شماره تلفن", "Change phone number")}
                        <Glyph name="arrow" size={16} />
                      </a>
                    ) : (
                      <a
                        className="text-link"
                        href={`${account}/support?topic=phone`}
                        onClick={follow(`${account}/support?topic=phone`)}
                      >
                        {t("راهنمای تغییر شماره", "Help changing your phone")}
                      </a>
                    )}
                    <small>
                      {t(
                        liveApi ? "تغییر شماره هنوز متصل نیست و به تأیید شماره جدید در مسیر مستقل نیاز دارد." : "قابلیت در قرارداد نمونه فعال است؛ تغییر شماره به احراز هویت و تأیید شماره جدید در مسیر مستقل نیاز دارد.",
                        liveApi ? "Phone changes are not connected yet and require separate new-number verification." : "Enabled in the fixture contract; phone changes require authentication and new-number verification in a separate flow.",
                      )}
                    </small>
                  </div>
                  {policy.emailSupported && (
                    <div className="checkout-field profile-field profile-email">
                      <label htmlFor="profile-email">
                        {t("ایمیل", "Email")}
                        <span>{t("اختیاری · Demo", "Optional · Demo")}</span>
                      </label>
                      <input
                        id="profile-email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        dir="ltr"
                        value={draft.email}
                        onChange={(event) =>
                          change("email", event.target.value)
                        }
                        maxLength={policy.emailMax}
                        disabled={!policy.canEdit || blocked}
                        aria-invalid={!!errors.email}
                        aria-describedby="profile-email-hint profile-email-error"
                        placeholder="name@example.com"
                      />
                      <div className="profile-email-status">
                        {!draft.email.trim() ? (
                          <span>
                            {t(
                              "ایمیلی ثبت نشده؛ این فیلد اختیاری است.",
                              "No email recorded; this field is optional.",
                            )}
                          </span>
                        ) : (
                          <span
                            className={
                              record.emailVerified && !emailChanged
                                ? "profile-verified"
                                : "profile-unverified"
                            }
                          >
                            <Glyph
                              name={
                                record.emailVerified && !emailChanged
                                  ? "check"
                                  : "clock"
                              }
                              size={13}
                            />
                            {record.emailVerified && !emailChanged
                              ? t("تأییدشده · Demo", "Verified · Demo")
                              : t("تأییدنشده · Demo", "Unverified · Demo")}
                          </span>
                        )}
                      </div>
                      <small id="profile-email-hint">
                        {t(
                          "ایمیل روش ورود نیست. ذخیره مقدار جدید، تأیید قبلی را منتقل نمی‌کند.",
                          "Email is not a sign-in method. Saving a new value does not transfer previous verification.",
                        )}
                      </small>
                      {errors.email && (
                        <p
                          id="profile-email-error"
                          className="checkout-field-error"
                        >
                          {t(
                            "ایمیل معتبر وارد کنید.",
                            "Enter a valid email address.",
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </section>
                {state === "conflict" && latest && (
                  <section className="profile-conflict" role="alert">
                    <Glyph name="clock" size={20} />
                    <h2>
                      {t(
                        "اطلاعات حساب در جای دیگری تغییر کرده است. نسخه جدید را بررسی کنید.",
                        "Your account details changed elsewhere. Review the latest version.",
                      )}
                    </h2>
                    <dl>
                      <div>
                        <dt>
                          {t(
                            liveApi ? "نام در نسخه جدید" : "نام در نسخه جدید نمونه",
                            liveApi ? "Name in the latest version" : "Name in the latest fixture version",
                          )}
                        </dt>
                        <dd dir="auto">{latest.fullName}</dd>
                      </div>
                      <div>
                        <dt>{t("نسخه داده", "Data version")}</dt>
                        <dd>
                          <bdi>{latest.version}</bdi>
                        </dd>
                      </div>
                    </dl>
                    <p>
                      {t(
                        "ورودی‌های فعلی حفظ شده‌اند. انتخاب «بارگذاری نسخه جدید» آن‌ها را صریحاً جایگزین می‌کند؛ ادغام خودکار انجام نمی‌شود.",
                        "Your entries are preserved. Choosing “Load latest version” explicitly replaces them; no automatic merge occurs.",
                      )}
                    </p>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        authoritative.current = latest
                        setRecord(latest)
                        setDraft(profileDraft(latest))
                        setLatest(null)
                        setState("idle")
                        setErrors({})
                        lock.current = false
                        setLive(
                          t(
                            liveApi ? "نسخه جدید بارگذاری شد؛ تغییرات قبلی جایگزین شدند." : "نسخه جدید نمونه بارگذاری شد؛ تغییرات قبلی جایگزین شدند.",
                            liveApi ? "Latest version loaded; previous edits were replaced." : "Latest fixture version loaded; previous edits were replaced.",
                          ),
                        )
                      }}
                    >
                      {t("بارگذاری نسخه جدید", "Load latest version")}
                    </button>
                  </section>
                )}
                {state === "error" && (
                  <p className="profile-save-error" role="alert">
                    {t(
                      "اطلاعات پروفایل ذخیره نشد؛ ورودی‌ها حفظ شده‌اند. دوباره تلاش کنید.",
                      "Your profile was not saved; your entries are preserved. Try again.",
                    )}
                  </p>
                )}
                {state === "unknown" && (
                  <div className="profile-unknown" role="alert">
                    <strong>
                      {t(
                        "نتیجه ذخیره هنوز تأیید نشده است.",
                        "The save result has not been confirmed yet.",
                      )}
                    </strong>
                    <p>
                      {t(
                        "ارسال دوباره مسدود است تا نتیجه عملیات بررسی شود؛ مقدار تأییدشده جدیدی نداریم.",
                        "Resubmission is blocked pending operation checks; no new confirmed value is available.",
                      )}
                    </p>
                    <button
                      type="button"
                      className="text-link"
                      onClick={check}
                      disabled={checking}
                    >
                      {checking
                        ? t("در حال بررسی…", "Checking…")
                        : t(
                            "بررسی نسخه معتبر حساب",
                            "Check valid account version",
                          )}
                    </button>
                  </div>
                )}
                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="button primary"
                    disabled={!dirty || !policy.canEdit || blocked}
                  >
                    {state === "saving"
                      ? t("در حال ذخیره…", "Saving…")
                      : t("ذخیره تغییرات", "Save changes")}
                    <Glyph name="check" size={17} />
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={!dirty || state === "saving"}
                    onClick={discard}
                  >
                    {t("انصراف از تغییرات", "Discard changes")}
                  </button>
                  <span>
                    {!policy.canEdit
                      ? t(
                          "ویرایش در پاسخ نمونه مجاز نیست.",
                          "Editing is not permitted in the fixture response.",
                        )
                      : dirty
                        ? t(
                            "تغییرات شما هنوز ذخیره نشده‌اند.",
                            "Your changes have not been saved yet.",
                          )
                        : t(
                            "تغییری برای ذخیره وجود ندارد.",
                            "There are no changes to save.",
                          )}
                  </span>
                </div>
              </form>
              <aside className="profile-aside">
                <section className="profile-related">
                  <h2>{t("بخش‌های مرتبط حساب", "Related account settings")}</h2>
                  {[
                    [
                      "pin",
                      "addresses",
                      t("مدیریت آدرس‌ها", "Manage addresses"),
                      "USER-11",
                    ],
                    [
                      "shield",
                      "security",
                      t("امنیت و رمز عبور", "Security and password"),
                      "USER-13",
                    ],
                    [
                      "sliders",
                      "preferences",
                      t("زبان و اعلان‌ها", "Language and notifications"),
                      "USER-14",
                    ],
                  ].map(([icon, slug, label, code]) => (
                    <a
                      key={slug}
                      href={`${account}/${slug}`}
                      onClick={follow(`${account}/${slug}`)}
                    >
                      <Glyph name={icon} size={20} />
                      <div>
                        <strong>{label}</strong>
                        <small>{code}</small>
                      </div>
                      <Glyph name="arrow" size={15} />
                    </a>
                  ))}
                </section>
                <section className="profile-history-note">
                  <span className="profile-note-icon">
                    <Glyph name="box" size={26} />
                  </span>
                  <h2>
                    {t(
                      "حساب امروز، سفارش‌های گذشته",
                      "Your account today, your past orders",
                    )}
                  </h2>
                  <p>
                    {t(
                      "ویرایش پروفایل، اطلاعات ثبت‌شده سفارش‌ها و رسیدهای قبلی را تغییر نمی‌دهد.",
                      "Editing your profile does not change details recorded on existing orders or receipts.",
                    )}
                  </p>
                  <p>
                    {t(
                      "تغییر نام یا شماره حساب، نام و تلفن گیرنده سفارش جاری را خودکار تغییر نمی‌دهد.",
                      "Changing your account name or phone does not automatically change a current order’s recipient details.",
                    )}
                  </p>
                  <a
                    className="text-link"
                    href={`${account}/orders`}
                    onClick={follow(`${account}/orders`)}
                  >
                    {t("مشاهده سفارش‌ها", "View orders")}
                    <Glyph name="arrow" size={15} />
                  </a>
                </section>
                <p className="profile-privacy-note">
                  <Glyph name="shield" size={16} />
                  {t(
                    "اطلاعات تماس برای ورود و ارتباط حساب است؛ رضایت بازاریابی فرض نمی‌شود.",
                    "Contact details support sign-in and account communication; marketing consent is not assumed.",
                  )}
                </p>
              </aside>
            </div>
          </>
        )}
        <footer className="profile-footer">
          <span>
            {t(
              "با دقت در اطلاعات، برای ارتباطی روشن‌تر.",
              "Thoughtful details, for clearer communication.",
            )}
          </span>
          <span>{liveApi ? "Nilart" : "Nilart · Demo"}</span>
        </footer>
        {!liveApi && <details className="dash-preview">
          <summary>
            {t("حالت‌های پیش‌نمایش", "Preview states")} <bdi>USER-12 · Demo</bdi>
          </summary>
          <div>
            {modes.map(([value, fa, english]) => (
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
              href={`${prefix}/auth/session-expired?returnTo=${encodeURIComponent(page)}`}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return
                event.preventDefault()
                dirtyRef.current = false
                navigate(
                  `${prefix}/auth/session-expired?returnTo=${encodeURIComponent(page)}`,
                )
              }}
            >
              {t(
                "نشست منقضی؛ حذف نمای خصوصی",
                "Expired session; remove private view",
              )}
            </a>
          </div>
        </details>}
        <dialog
          ref={dialog}
          className="profile-dialog modal"
          aria-labelledby="profile-dialog-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <div className="modal-head">
            <h2 id="profile-dialog-title">
              {modal === "leave"
                ? t("تغییرات ذخیره نشده‌اند", "Your changes have not been saved")
                : t(
                    "مقصد مستقل پروتوتایپ",
                    "Independent prototype destination",
                  )}
            </h2>
            <button
              className="icon-button"
              onClick={close}
              aria-label={t("بستن", "Close")}
            >
              <Glyph name="close" />
            </button>
          </div>
          {modal === "leave" ? (
            <div className="profile-leave">
              <p>
                {t(
                  "با خروج، تغییرات ذخیره‌نشده کنار گذاشته می‌شوند. اطلاعات سفارش و رسیدهای قبلی تغییر نمی‌کنند.",
                  "Leaving discards unsaved changes. Existing order and receipt details will not change.",
                )}
              </p>
              {state === "unknown" && (
                <p>
                  {t(
                    "نتیجه ذخیره هنوز نامشخص است؛ خروج، نتیجه عملیات را تأیید یا رد نمی‌کند.",
                    "The save result is still unknown; leaving does not confirm or reject the operation.",
                  )}
                </p>
              )}
              <button className="button primary" data-stay onClick={close}>
                {t("ماندن در صفحه", "Stay on this page")}
              </button>
              <button className="button secondary" onClick={leaveWithoutSaving}>
                {t("خروج بدون ذخیره", "Leave without saving")}
              </button>
            </div>
          ) : (
            <div className="profile-destination">
              <p>
                {t(
                  "این فرایند مستقل است و در این مرحله طراحی نشده است. شماره ورود، رمز و تنظیمات از فرم عمومی پروفایل تغییر نمی‌کنند.",
                  "This flow is independent and is not designed in this step. Sign-in phone, password and preferences are not changed by the general profile form.",
                )}
              </p>
              <code dir="ltr">{destination}</code>
              <button className="button secondary" onClick={close}>
                {t("بازگشت به پروفایل", "Back to profile")}
              </button>
            </div>
          )}
        </dialog>
      </div>
    </DashboardPage>
  )
}
