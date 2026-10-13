import {sessionLifecycle} from "../features/identity/session-lifecycle"
import type {preferencesApi} from "../features/customer/api"
import SelectDropdown from "../components/ui/SelectDropdown";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import type { ReferenceNavigationGuard } from "./ReferencesPage"
import {
  accountPreferencesFixture,
  accountPreferenceDraft,
  preferencesDirty,
  channelAvailable,
  validateAccountPreferences,
  applyAccountPreferences,
  type AccountPreferencesMode,
  type AccountPreferenceRecord,
  type AccountLanguage,
  type ChannelId,
} from "./account-preferences"
import "./account-preferences.css"
type SaveState = "idle" | "saving" | "success" | "error" | "unknown" | "conflict"
type Modal = "leave" | "destination" | null
const previews: [AccountPreferencesMode, string, string][] = [
  ["normal", "نسخه پایه", "Base settings"],
  ["email-missing", "ایمیل ناقص", "Email missing"],
  ["email-unverified", "ایمیل تأییدنشده", "Email unverified"],
  ["email-ready", "ایمیل قابل استفاده", "Email available"],
  ["marketing", "بازاریابی خاموش • Demo", "Marketing off • Demo"],
  ["marketing-on", "رضایت قبلی صریح • Demo", "Explicit prior consent • Demo"],
  ["required-channel", "حداقل کانال • Demo", "Minimum channel • Demo"],
  ["unknown-channel", "وضعیت کانال نامشخص", "Unknown channel status"],
  [
    "channel-changed",
    "تغییر مجوز کانال هنگام ذخیره",
    "Channel permission changes at save",
  ],
  ["dirty", "تغییرات ذخیره‌نشده", "Unsaved changes"],
  ["loading", "بارگذاری", "Loading"],
  ["network", "خطای دریافت", "Load error"],
  ["save-error", "خطای ذخیره", "Save error"],
  ["unknown", "نتیجه نامشخص", "Unknown result"],
  ["conflict", "تعارض نسخه", "Version conflict"],
  ["denied", "عدم دسترسی", "Access denied"],
]
export default function AccountPreferencesPage({
  page,
  navigate,
  registerGuard,
  liveApi,
}: {
  liveApi?: typeof preferencesApi
  page: string
  navigate: (route: string) => void
  registerGuard: (guard: ReferenceNavigationGuard | null) => void
}) {
  const en = page.startsWith("/en/"),
    index = en ? 1 : 0,
    t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa",
    account = `${prefix}/account`
  const [mode, setMode] = useState<AccountPreferencesMode>(liveApi?"loading":"normal")
  const [record, setRecord] = useState(
    () => accountPreferencesFixture("normal", en ? "en" : "fa").record,
  )
  const [draft, setDraft] = useState(() =>
    accountPreferenceDraft(
      accountPreferencesFixture("normal", en ? "en" : "fa").record,
    ),
  )
  const [state, setState] = useState<SaveState>("idle"),
    [errors, setErrors] = useState<Record<string, string>>({})
  const [live, setLive] = useState(""),
    [checking, setChecking] = useState(false)
  const [latest, setLatest] = useState<AccountPreferenceRecord | null>(null),
    [smsChanged, setSmsChanged] = useState(false)
  const [modal, setModal] = useState<Modal>(null),
    [destination, setDestination] = useState("")
  const dialog = useRef<HTMLDialogElement>(null),
    form = useRef<HTMLFormElement>(null),
    origin = useRef<HTMLElement | null>(null)
  const leaveAction = useRef<(() => void) | null>(null),
    dirtyRef = useRef(false),
    authorizedRef = useRef(true),
    savingRef = useRef(false)
  const lock = useRef(false),
    conflictInjected = useRef(false),
    authoritative = useRef(record),
    timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const focusAfterLanguage = useRef(false),
    lastPage = useRef(page)
  const basePolicy = liveApi ? {...accountPreferencesFixture("normal", record.language).policy,smsStatus:"unavailable" as const} : accountPreferencesFixture(mode, record.language).policy
  const policy = smsChanged
    ? { ...basePolicy, smsStatus: "unavailable" as const }
    : basePolicy
  const loaded = !["loading", "network", "denied"].includes(mode)
  const dirty = loaded && preferencesDirty(record, draft)
  const blocked =
    state === "saving" || state === "unknown" || state === "conflict"
  dirtyRef.current = dirty || state === "unknown"
  authorizedRef.current = loaded
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
      if (!authorizedRef.current || !dirtyRef.current) {
        proceed()
        return true
      }
      if (savingRef.current) return false
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
      requestAnimationFrame(() =>
        dialog.current
          ?.querySelector<HTMLElement>(
            modal === "leave" ? "[data-stay]" : "button",
          )
          ?.focus(),
      )
    } else if (dialog.current?.open) dialog.current.close()
  }, [modal])
  useEffect(() => {
    if (page !== lastPage.current && focusAfterLanguage.current) {
      focusAfterLanguage.current = false
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>("#account-preferred-language")
          ?.focus(),
      )
    }
    lastPage.current = page
  }, [page])
  const close = () => {
    setModal(null)
    leaveAction.current = null
    requestAnimationFrame(() => {
      if (origin.current?.isConnected) origin.current.focus()
      else
        form.current
          ?.querySelector<HTMLElement>("#account-preferred-language")
          ?.focus()
    })
  }
  const requestLeave = (proceed: () => void) => {
    if (state === "saving") return
    if (dirtyRef.current && loaded) {
      leaveAction.current = proceed
      origin.current = (document.activeElement as HTMLElement)
      setModal("leave")
    } else proceed()
  }
  const internalRoute = (route: string) =>
    /^\/(fa|en)\/account\/(profile|security|addresses|favorites|downloads|preferences|support|notifications)$/.test(
      route,
    ) ||
    route === account ||
    route === "/" ||
    route === "/cart" ||
    route.includes("/auth/")
  const showDestination = (route: string) => {
    origin.current = (document.activeElement as HTMLElement)
    setDestination(route)
    setModal("destination")
  }
  const beforePanelNavigation = (route: string, proceed: () => void) => {
    if (/^\/(fa|en)\/account\/preferences$/.test(route)) {
      if (!loaded || blocked) return
      setDraft((previous) => ({
        ...previous,
        language: route.startsWith("/en/") ? "en" : "fa",
      }))
      setLive(
        t(
          "زبان در فرم به‌صورت تغییر ذخیره‌نشده انتخاب شد؛ رابط پس از ذخیره معتبر تغییر می‌کند.",
          "Language was selected as an unsaved form change; the interface changes after a valid save.",
        ),
      )
      return
    }
    requestLeave(() => {
      if (liveApi || internalRoute(route)) proceed()
      else showDestination(route)
    })
  }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    requestLeave(() => {
      if (liveApi || internalRoute(route)) navigate(route)
      else showDestination(route)
    })
  }
  const leaveWithoutSaving = () => {
    dirtyRef.current = false
    const proceed = leaveAction.current
    leaveAction.current = null
    setDraft(accountPreferenceDraft(record))
    setErrors({})
    setModal(null)
    proceed?.()
  }
  const discard = () => {
    setDraft(accountPreferenceDraft(record))
    setErrors({})
    setLatest(null)
    if (state !== "unknown") {
      setState("idle")
      lock.current = false
    }
    setLive(
      t(
        "انتخاب‌ها به آخرین ترجیحات معتبر نمونه بازگردانده شدند.",
        "Selections reverted to the last valid fixture preferences.",
      ),
    )
  }
  const setChoice = (id: string, channel: ChannelId, value: boolean) => {
    if (blocked || !loaded) return
    if (value && !channelAvailable(channel, policy)) return
    setDraft((previous) => ({
      ...previous,
      choices: {
        ...previous.choices,
        [id]: { ...previous.choices[id], [channel]: value },
      },
    }))
    setErrors((previous) => {
      const next = { ...previous }
      delete next[`category-${id}`]
      return next
    })
    if (state === "success" || state === "error") setState("idle")
  }
  const errorText = (code: string) =>
    ({
      language: t("یک زبان معتبر انتخاب کنید.", "Choose a supported language."),
      channel: t(
        "این کانال در حال حاضر قابل استفاده نیست.",
        "This channel is currently unavailable.",
      ),
      minimum: t(
        "برای این دسته، یک کانال مجاز انتخاب کنید.",
        "Choose an allowed channel for this category.",
      ),
      readonly: t(
        "این گزینه قابل تغییر نیست؛ اطلاعات را بررسی کنید.",
        "This option cannot be changed; review the settings.",
      ),
    })[code]
  const focusError = (validation: Record<string, string>) => {
    const id = Object.keys(validation)[0]
    requestAnimationFrame(() => {
      const field = form.current?.querySelector<HTMLElement>(
        id === "language" ? "#account-preferred-language" : `#${id}`,
      )
      ;(
        field?.querySelector<HTMLElement>("input:not(:disabled)") || field
      )?.focus()
    })
  }
  const liveId=useRef(crypto.randomUUID()),liveGeneration=useRef(0)
  const loadLive=async()=>{if(!liveApi)return;const stamp=++liveGeneration.current;setMode("loading");try{const result=await liveApi.load(en?"en":"fa");if(stamp!==liveGeneration.current)return;liveId.current=result.id;setRecord(result.record);authoritative.current=result.record;setDraft(accountPreferenceDraft(result.record));setMode("normal");setState("idle");lock.current=false;dirtyRef.current=false}catch{if(stamp===liveGeneration.current)setMode("network")}}
  useEffect(()=>{if(!liveApi)return;void loadLive();const clear=sessionLifecycle.registerPrivateCache(()=>{liveGeneration.current++;setMode("denied");setDraft({language:"fa",choices:{}});setRecord(previous=>({...previous,owner:"",choices:{}}));setLatest(null);setModal(null)});return()=>{liveGeneration.current++;clear()}},[liveApi])
  const saveLive=async()=>{if(!liveApi)return;lock.current=true;setState("saving");const stamp=liveGeneration.current;try{const result=await liveApi.save(liveId.current,record,draft);if(stamp!==liveGeneration.current)return;setRecord(result);setDraft(accountPreferenceDraft(result));authoritative.current=result;setState("success");dirtyRef.current=false;setLive(t("ترجیحات ذخیره شد.","Preferences saved."));if(result.language!==(en?"en":"fa"))navigate(`/${result.language}/account/preferences`)}catch(error){if(stamp!==liveGeneration.current)return;const conflict=error instanceof Error && error.message==="record_version_conflict";setState(conflict?"conflict":"unknown");setLive(t("ذخیره تأیید نشد؛ پیش از تکرار نسخه ذخیره‌شده را بررسی کنید.","Save unconfirmed; check the saved version before retrying."))}finally{lock.current=false}}
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (lock.current || blocked || !loaded || !dirty) return
    const validation = validateAccountPreferences(draft, policy)
    setErrors(validation)
    if (Object.keys(validation).length) {
      focusError(validation)
      return
    }
    if(liveApi){void saveLive();return}
    const submitted = {
      language: draft.language,
      choices: Object.fromEntries(
        Object.entries(draft.choices).map(([id, choices]) => [
          id,
          { ...choices },
        ]),
      ),
    }
    lock.current = true
    setState("saving")
    setLive("")
    later(() => {
      if (mode === "unknown") {
        setState("unknown")
        setLive(
          t(
            "نتیجه ذخیره هنوز تأیید نشده است. زبان اعمال نشد و ارسال تکراری مسدود است.",
            "The save result has not been confirmed yet. Language was not applied and duplicate submission is blocked.",
          ),
        )
        return
      }
      lock.current = false
      if (mode === "save-error") {
        setState("error")
        setLive(
          t(
            "ذخیره تأیید نشد؛ انتخاب‌های شما حفظ شده‌اند و زبان رابط تغییر نکرده است.",
            "Save was not confirmed; your selections are preserved and the interface language is unchanged.",
          ),
        )
        return
      }
      if (mode === "channel-changed" && !smsChanged) {
        setSmsChanged(true)
        const validation = validateAccountPreferences(submitted, {
          ...policy,
          smsStatus: "unavailable",
        })
        if (Object.keys(validation).length) {
          setErrors(validation)
          setState("error")
          setLive(
            t(
              "مجوز پیامک در پاسخ نمونه تغییر کرد؛ انتخاب‌های قبلی حفظ شده‌اند. کانال نامعتبر را صریحاً بازبینی کنید.",
              "SMS permission changed in the fixture response; your old choices are preserved. Explicitly review the invalid channel.",
            ),
          )
          focusError(validation)
          return
        }
      }
      if (mode === "conflict" && !conflictInjected.current) {
        conflictInjected.current = true
        const next = accountPreferenceDraft(authoritative.current)
        next.choices.support.inApp = false
        authoritative.current = {
          ...authoritative.current,
          ...next,
          version: authoritative.current.version + 1,
        }
        setLatest(authoritative.current)
        setState("conflict")
        setLive(
          t(
            "ترجیحات در جای دیگری تغییر کرده‌اند. اطلاعات جدید را بررسی کنید؛ ادغام خودکار انجام نشد.",
            "Your preferences changed elsewhere. Review the latest settings; no automatic merge occurred.",
          ),
        )
        return
      }
      const effectivePolicy =
        mode === "channel-changed"
          ? { ...policy, smsStatus: "unavailable" as const }
          : policy
      const response = applyAccountPreferences(
        authoritative.current,
        submitted,
        effectivePolicy,
        "demo-customer",
        record.version,
      )
      if (response.error) {
        if (response.error === "conflict") {
          setLatest(authoritative.current)
          setState("conflict")
        } else {
          setErrors(response.errors)
          setState("error")
          focusError(response.errors)
        }
        return
      }
      authoritative.current = response.record
      setRecord(response.record)
      setDraft(accountPreferenceDraft(response.record))
      setState("success")
      dirtyRef.current = false
      const nextEnglish = response.record.language === "en"
      setLive(
        nextEnglish
          ? "Preferences saved · Demo; no real service settings or marketing consent were applied."
          : "ترجیحات ذخیره شد · Demo؛ هیچ تنظیم سرویس یا رضایت بازاریابی واقعی اعمال نشده است.",
      )
      if (response.record.language !== (en ? "en" : "fa")) {
        focusAfterLanguage.current = true
        navigate(`/${response.record.language}/account/preferences`)
      }
    })
  }
  const check = () => {
    if(liveApi){void loadLive();return}
    if (checking) return
    setChecking(true)
    later(() => {
      setChecking(false)
      setLive(
        t(
          "نسخه معتبر تازه دریافت نشد؛ سرویس متصل نیست. تنظیمات دوباره ارسال نشده‌اند.",
          "A fresh valid version was not retrieved; no service is connected. Settings were not resubmitted.",
        ),
      )
    }, 650)
  }
  const preview = (value: AccountPreferencesMode) => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
    lock.current = false
    conflictInjected.current = false
    const fixture = accountPreferencesFixture(value, en ? "en" : "fa")
    authoritative.current = fixture.record
    setMode(value)
    setRecord(fixture.record)
    setDraft(
      value === "dirty"
        ? {
            ...accountPreferenceDraft(fixture.record),
            language: en ? "fa" : "en",
          }
        : accountPreferenceDraft(fixture.record),
    )
    setState("idle")
    setErrors({})
    setLatest(null)
    setSmsChanged(false)
    setLive("")
    setChecking(false)
    setModal(null)
  }
  const channelLabel: Record<ChannelId, string> = {
    inApp: t("داخل سایت", "In-app"),
    sms: t("پیامک", "SMS"),
    email: t("ایمیل", "Email"),
  }
  const categoryCard = (id: string) => {
    const category = policy.categories.find((item) => item.id === id)!
    return (
      <fieldset
        key={id}
        id={`category-${id}`}
        tabIndex={-1}
        className={`account-pref-category ${
          errors[`category-${id}`] ? "has-error" : ""
        }`}
        disabled={blocked}
        aria-describedby={`description-${id}${
          errors[`category-${id}`] ? ` error-${id}` : ""
        }`}
      >
        <legend>{category.title[index]}</legend>
        <div className="account-pref-category-row">
          <div>
            <p id={`description-${id}`}>{category.description[index]}</p>
            {category.minimum > 0 && (
              <small>
                {t(
                  "طبق قرارداد Demo، حداقل یک کانال مجاز لازم است.",
                  "This Demo contract requires at least one permitted channel.",
                )}
              </small>
            )}
          </div>
          <div className="account-pref-category-channels">
            {category.channels.map((channel) => {
              const selected = draft.choices[id]?.[channel],
                available = channelAvailable(channel, policy)
              return selected === null ? (
                <span key={channel} className="account-pref-unknown-channel">
                  {channelLabel[channel]}{" "}
                  <strong>{t("وضعیت دریافت نشد", "Status unavailable")}</strong>
                </span>
              ) : (
                <label
                  key={channel}
                  className={`checkout-checkbox account-pref-channel ${
                    category.optional ? "account-pref-switch-label" : ""
                  } ${!available ? "unavailable" : ""}`}
                >
                  <input
                    type="checkbox"
                    role={category.optional ? "switch" : undefined}
                    checked={selected === true}
                    disabled={blocked || !available}
                    onChange={(event) =>
                      setChoice(id, channel, event.target.checked)
                    }
                    aria-label={`${category.title[index]} — ${channelLabel[channel]}`}
                    aria-describedby={`description-${id}${
                      !available ? ` channel-reason-${channel}` : ""
                    }${errors[`category-${id}`] ? ` error-${id}` : ""}`}
                  />
                  {category.optional && (
                    <span className="account-pref-switch" aria-hidden="true" />
                  )}
                  <span>
                    {channelLabel[channel]}
                    {!available && (
                      <small>
                        {channel === "email"
                          ? policy.emailStatus === "missing"
                            ? t("نیازمند تکمیل ایمیل", "Email needed")
                            : t(
                                "نیازمند تأیید در قرارداد Demo",
                                "Verification needed in Demo contract",
                              )
                          : t(
                              "فعلاً قابل استفاده نیست",
                              "Currently unavailable",
                            )}
                      </small>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
        {errors[`category-${id}`] && (
          <p id={`error-${id}`} className="checkout-field-error" role="alert">
            {errorText(errors[`category-${id}`])}
          </p>
        )}
        {category.channels
          .filter(
            (channel) =>
              draft.choices[id]?.[channel] === true &&
              !channelAvailable(channel, policy),
          )
          .map((channel) => (
            <button
              key={channel}
              className="text-link account-pref-clear-invalid"
              type="button"
              onClick={() => setChoice(id, channel, false)}
            >
              {t("لغو انتخاب کانال نامعتبر", "Clear invalid channel selection")}
              : {channelLabel[channel]}
            </button>
          ))}
      </fieldset>
    )
  }
  return (
    <DashboardPage
      liveMode={!!liveApi}
      page={page}
      navigate={navigate}
      renderMedia={() => null}
      activeSection="preferences"
      onBeforeNavigate={beforePanelNavigation}
      panelTitle={t("ترجیحات حساب", "Account preferences")}
    >
      <div className="account-preferences-page">
        <nav
          className="account-pref-breadcrumb"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          <a href={account} onClick={follow(account)}>
            {t("حساب", "Account")}
          </a>
          <span>/</span>
          <span aria-current="page">
            {t("زبان و اعلان‌ها", "Language and notifications")}
          </span>
        </nav>
        <div className="account-pref-heading">
          <div>
            <span className="account-pref-eyebrow">YOUR ACCOUNT · USER-14</span>
            <h1>{t("ترجیحات حساب", "Account preferences")}</h1>
            <p>
              {t(
                "زبان و پیام‌های قابل تنظیم حساب را، با انتخاب روشن، مدیریت کنید.",
                "Manage your account language and configurable messages with clear choices.",
              )}
            </p>
          </div>
          <span className="account-pref-heading-icon">
            <Glyph name="sliders" size={30} />
          </span>
        </div>
        {!liveApi && <div className="account-pref-demo">
          <span>Demo</span>
          <p>
            {t(
              "دسته‌ها، کانال‌ها، سیاست‌ها و ترجیحات همگی نمونه‌اند؛ سرویس واقعی متصل نیست. رضایت یا ارسال پیام واقعی از این صفحه نتیجه‌گیری نمی‌شود.",
              "Categories, channels, policies and preferences are fixtures; no real service is connected. No actual consent or message delivery is implied.",
            )}
          </p>
        </div>}
        <div className="account-pref-live" role="status" aria-live="polite">
          {live}
        </div>
        {mode === "denied" ? (
          <section className="account-pref-state">
            <Glyph name="shield" size={36} />
            <h2>
              {t(
                "دسترسی به ترجیحات این حساب مجاز نیست.",
                "This account’s preferences are not accessible.",
              )}
            </h2>
            <p>
              {t(
                "اطلاعات خصوصی تا بررسی مالکیت و نشست نمایش داده نمی‌شوند.",
                "Private settings remain hidden pending ownership and session checks.",
              )}
            </p>
          </section>
        ) : mode === "loading" ? (
          <div
            className="account-pref-loading"
            aria-busy="true"
            aria-label={t("در حال دریافت ترجیحات", "Loading preferences")}
          >
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : mode === "network" ? (
          <section className="account-pref-state">
            <Glyph name="sliders" size={36} />
            <h2>
              {t("دریافت ترجیحات ممکن نشد.", "Unable to load preferences.")}
            </h2>
            <p>
              {t(
                "خطای دریافت به معنی خاموش‌بودن پیام‌ها یا نبود رضایت نیست.",
                "A load error does not mean messages are off or consent is absent.",
              )}
            </p>
            <button
              className="button primary"
              disabled={checking}
              onClick={check}
            >
              {t("تلاش دوباره", "Try again")}
            </button>
          </section>
        ) : (
          <>
            <div className="account-pref-layout">
              <form
                className="account-pref-form"
                ref={form}
                noValidate
                onSubmit={submit}
              >
                <section className="account-pref-card">
                  <div className="account-pref-section-heading">
                    <span className="account-pref-section-icon">
                      <Glyph name="sliders" size={22} />
                    </span>
                    <div>
                      <h2>{t("زبان حساب", "Account language")}</h2>
                      <p>
                        {t(
                          "زبان رابط و پیام‌های پشتیبانی‌شده حساب را انتخاب کنید.",
                          "Choose the language for your interface and supported account messages.",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="checkout-field account-pref-language-field">
                    <label htmlFor="account-preferred-language">
                      {t("زبان ترجیحی", "Preferred language")}
                    </label>
                    <SelectDropdown
                      id="account-preferred-language"
                      value={draft.language}
                      disabled={blocked}
                      onChange={(event) => {
                        setDraft((previous) => ({
                          ...previous,
                          language: event.target.value as AccountLanguage,
                        }))
                        setErrors((previous) => {
                          const next = { ...previous }
                          delete next.language
                          return next
                        })
                        if (state === "success" || state === "error")
                          setState("idle")
                      }}
                      aria-describedby="account-pref-language-hint"
                      aria-invalid={!!errors.language}
                    >
                      <option value="fa">فارسی</option>
                      <option value="en">English</option>
                    </SelectDropdown>
                    <small id="account-pref-language-hint">
                      {t(
                        "انتخاب زبان فعلاً محلی است؛ پس از ذخیره معتبر، همین صفحه با زبان جدید باز می‌شود.",
                        "Language selection is local for now; this page opens in the new language after a valid save.",
                      )}
                    </small>
                    {errors.language && (
                      <p className="checkout-field-error">
                        {errorText(errors.language)}
                      </p>
                    )}
                  </div>
                  <div className="account-pref-language-boundary">
                    <Glyph name="shield" size={16} />
                    <p>
                      {t(
                        "کشور، شماره تلفن، ارز، تقویم و منطقه زمانی تغییر نمی‌کنند. متن مشتری، Prompt و پیام تیکت ترجمه نمی‌شوند.",
                        "Country, phone, currency, calendar and time zone do not change. Customer text, prompts and ticket messages are not translated.",
                      )}
                    </p>
                  </div>
                </section>
                <section className="account-pref-card account-pref-essential">
                  <div className="account-pref-section-heading">
                    <span className="account-pref-section-icon">
                      <Glyph name="shield" size={22} />
                    </span>
                    <div>
                      <h2>{t("پیام‌های ضروری", "Essential messages")}</h2>
                      <p>
                        {t(
                          "برای خدمات مشخص؛ نه مجوز تبلیغات.",
                          "For specific services, not permission for advertising.",
                        )}
                      </p>
                    </div>
                    <span className="account-pref-required-badge">
                      {t("ضروری", "Required")}{!liveApi && " · Demo"}
                    </span>
                  </div>
                  <ul>
                    {[
                      t("OTP و احراز هویت", "OTP & authentication"),
                      t("رخداد امنیتی مهم", "Important security events"),
                      t(
                        "اطلاعات ضروری پرداخت و سفارش",
                        "Essential payment and order information",
                      ),
                    ].map((label) => (
                      <li key={label}>
                        <Glyph name="check" size={14} />
                        {label}
                      </li>
                    ))}
                  </ul>
                  <p>
                    {t(
                      "این دسته‌ها در قرارداد نمونه برای انجام خدمات مرتبط استفاده می‌شوند و از این بخش قابل غیرفعال‌سازی نیستند.",
                      "These fixture categories support the related service and cannot be disabled here.",
                    )}
                  </p>
                </section>
                <section className="account-pref-card">
                  <div className="account-pref-section-heading">
                    <span className="account-pref-section-icon">
                      <Glyph name="bell" size={22} />
                    </span>
                    <div>
                      <h2>
                        {t(
                          "پیام‌های خدماتی قابل تنظیم",
                          "Configurable service messages",
                        )}
                      </h2>
                      <p>
                        {t(
                          "هر کنترل فقط انتخاب محلی است؛ نتیجه با ذخیره نهایی ثبت می‌شود.",
                          "Each control changes a local choice; the result is recorded by the final save.",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="account-pref-channel-info">
                    <span>
                      <Glyph name="grid" size={15} />
                      {t("داخل سایت", "In-app")}
                    </span>
                    <span id="channel-reason-sms">
                      <Glyph name="chat" size={15} />
                      {t(
                        "پیامک به شماره حساب، نه شماره گیرنده",
                        "SMS to account phone, not recipient phone",
                      )}
                      {policy.smsStatus !== "ready" && (
                        <strong>
                          {policy.smsStatus === "unknown"
                            ? t(" • وضعیت دریافت نشد", " • Status unavailable")
                            : t(
                                " • فعلاً قابل استفاده نیست",
                                " • Currently unavailable",
                              )}
                        </strong>
                      )}
                    </span>
                    {policy.channels.includes("email") && (
                      <span id="channel-reason-email">
                        <Glyph name="chat" size={15} />
                        {channelAvailable("email", policy)
                          ? t(
                              "ایمیل قابل استفاده در پاسخ Demo",
                              "Email usable in the Demo response",
                            )
                          : policy.emailStatus === "missing"
                            ? t(
                                "برای فعال‌کردن این کانال، اطلاعات ایمیل را تکمیل کنید.",
                                "Complete your email details to enable this channel.",
                              )
                            : t(
                                "طبق قرارداد Demo، تأیید ایمیل برای این کانال لازم است.",
                                "This Demo contract requires email verification for this channel.",
                              )}
                      </span>
                    )}
                  </div>
                  {policy.channels.includes("email") &&
                    !channelAvailable("email", policy) && (
                      <a
                        className="text-link account-pref-contact-link"
                        href={`${account}/profile`}
                        onClick={follow(`${account}/profile`)}
                      >
                        {t("مدیریت اطلاعات تماس", "Manage contact information")}
                        <Glyph name="arrow" size={15} />
                      </a>
                    )}
                  <div className="account-pref-categories">
                    {policy.categories
                      .filter((category) => !category.optional)
                      .map((category) => categoryCard(category.id))}
                  </div>
                </section>
                {policy.marketingEnabled && (
                  <section className="account-pref-card account-pref-marketing">
                    <div className="account-pref-section-heading">
                      <span className="account-pref-section-icon">
                        <Glyph name="heart" size={22} />
                      </span>
                      <div>
                        <h2>
                          {t(
                            "پیام‌های اختیاری و بازاریابی",
                            "Optional & marketing messages",
                          )}
                        </h2>
                        <p>
                          {t(
                            "رضایت مستقل از خرید، عضویت و اطلاعات تماس.",
                            "Consent is separate from purchases, membership and contact details.",
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="account-pref-consent-note">
                      {mode === "marketing-on"
                        ? t(
                            "رضایت قبلی صریح فقط در داده نمونه ثبت شده است؛ از خرید یا ایمیل شما حدس زده نشده است.",
                            "Explicit prior consent exists only in the fixture; it was not inferred from purchases or your email.",
                          )
                        : t(
                            "رضایت جدید از پیش انتخاب نشده است. خاموش‌کردن این پیام‌ها، خرید یا خدمات ضروری را محدود نمی‌کند.",
                            "New consent is not preselected. Turning these messages off does not restrict purchases or essential services.",
                          )}
                    </p>
                    {policy.categories
                      .filter((category) => category.optional)
                      .map((category) => categoryCard(category.id))}
                    {policy.queuedMessageCaveat && (
                      <p className="account-pref-queue-note">
                        {t(
                          "سیاست Demo: ممکن است پیام‌هایی که پیش‌تر برای ارسال آماده شده‌اند، همچنان دریافت شوند. زمان فرضی برای اعمال تغییر تعیین نمی‌شود.",
                          "Demo policy: messages already prepared for delivery may still arrive. No invented application time is specified.",
                        )}
                      </p>
                    )}
                  </section>
                )}
                {state === "conflict" && latest && (
                  <section className="account-pref-conflict" role="alert">
                    <h2>
                      {t(
                        "ترجیحات در جای دیگری تغییر کرده‌اند. اطلاعات جدید را بررسی کنید.",
                        "Your preferences changed elsewhere. Review the latest settings.",
                      )}
                    </h2>
                    <dl>
                      <div>
                        <dt>
                          {t("زبان نسخه جدید", "Latest version language")}
                        </dt>
                        <dd>
                          {latest.language === "fa" ? "فارسی" : "English"}
                        </dd>
                      </div>
                      <div>
                        <dt>
                          {t(
                            "پاسخ پشتیبانی داخل سایت در نسخه جدید",
                            "In-app support replies in the latest version",
                          )}
                        </dt>
                        <dd>
                          {latest.choices.support.inApp
                            ? t("روشن • Demo", "On • Demo")
                            : t("خاموش • Demo", "Off • Demo")}
                        </dd>
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
                        "انتخاب‌های فعلی حفظ شده‌اند. بارگذاری نسخه جدید آن‌ها را صریحاً جایگزین می‌کند؛ ادغام خودکار انجام نمی‌شود.",
                        "Your selections are preserved. Loading the latest version explicitly replaces them; no automatic merge occurs.",
                      )}
                    </p>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => {
                        setRecord(latest)
                        setDraft(accountPreferenceDraft(latest))
                        setLatest(null)
                        setState("idle")
                        setErrors({})
                        lock.current = false
                        setLive(
                          t(
                            "نسخه جدید نمونه بارگذاری شد؛ انتخاب‌های قبلی جایگزین شدند.",
                            "Latest fixture version loaded; previous choices were replaced.",
                          ),
                        )
                      }}
                    >
                      {t("بارگذاری نسخه جدید", "Load latest version")}
                    </button>
                  </section>
                )}
                {state === "error" && (
                  <p className="account-pref-save-error" role="alert">
                    {t(
                      "ذخیره تأیید نشد؛ انتخاب‌ها حفظ شده‌اند و زبان جدید اعمال نشده است.",
                      "Save was not confirmed; selections are preserved and the new language was not applied.",
                    )}
                  </p>
                )}
                {state === "unknown" && (
                  <div className="account-pref-unknown" role="alert">
                    <strong>
                      {t(
                        "نتیجه ذخیره هنوز تأیید نشده است.",
                        "The save result has not been confirmed yet.",
                      )}
                    </strong>
                    <p>
                      {t(
                        "زبان و پیام‌ها موفق اعلام نمی‌شوند؛ تا بررسی نتیجه، ارسال دوباره متوقف است.",
                        "Language and message updates are not reported as successful; resubmission is blocked pending outcome checks.",
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
                        : t("بررسی نسخه معتبر", "Check valid version")}
                    </button>
                  </div>
                )}
                <div className="account-pref-form-actions">
                  <button
                    type="submit"
                    className="button primary"
                    disabled={!dirty || blocked}
                  >
                    {state === "saving"
                      ? t("در حال ذخیره…", "Saving…")
                      : t("ذخیره ترجیحات", "Save preferences")}
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
                    {dirty
                      ? t(
                          "تغییرات هنوز ذخیره نشده‌اند.",
                          "Changes have not been saved yet.",
                        )
                      : t(
                          "تغییری برای ذخیره وجود ندارد.",
                          "There are no changes to save.",
                        )}
                  </span>
                </div>
              </form>
              <aside className="account-pref-aside">
                <section className="account-pref-explainer">
                  <h2>
                    {t(
                      "هر پیام، با هدف مشخص",
                      "Every message has a clear purpose",
                    )}
                  </h2>
                  <div>
                    <span className="account-pref-explainer-icon">
                      <Glyph name="shield" size={18} />
                    </span>
                    <h3>{t("ضروری", "Essential")}</h3>
                    <p>
                      {t(
                        "احراز هویت و اطلاعات مهم خدمات؛ با تبلیغات ترکیب نمی‌شوند.",
                        "Authentication and important service information; not combined with advertising.",
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="account-pref-explainer-icon">
                      <Glyph name="box" size={18} />
                    </span>
                    <h3>{t("مرتبط با سفارش", "Order-related")}</h3>
                    <p>
                      {t(
                        "خبرهای خدماتی قابل تنظیم، جدا از رخدادهای ضروری.",
                        "Configurable service updates, separate from essential events.",
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="account-pref-explainer-icon">
                      <Glyph name="heart" size={18} />
                    </span>
                    <h3>{t("اختیاری", "Optional")}</h3>
                    <p>
                      {t(
                        "فقط با قابلیت فعال و رضایت معتبر؛ هیچ عضویتی از خرید فرض نمی‌شود.",
                        "Only with active capability and valid consent; purchases do not imply subscription.",
                      )}
                    </p>
                  </div>
                </section>
                <section className="account-pref-links">
                  <h2>{t("بخش‌های مرتبط", "Related settings")}</h2>
                  {[
                    [
                      "user",
                      `${account}/profile`,
                      t("پروفایل و اطلاعات تماس", "Profile & contact"),
                    ],
                    [
                      "bell",
                      `${account}/notifications`,
                      t("مشاهده اعلان‌ها", "View notifications"),
                    ],
                    [
                      "shield",
                      `${prefix}/privacy`,
                      t("حریم خصوصی", "Privacy policy"),
                    ],
                  ].map(([icon, route, label]) => (
                    <a key={route} href={route} onClick={follow(route)}>
                      <Glyph name={icon} size={19} />
                      <span>{label}</span>
                      <Glyph name="arrow" size={15} />
                    </a>
                  ))}
                </section>
                <p className="account-pref-boundary-note">
                  <Glyph name="shield" size={16} />
                  {t(
                    "خاموش‌کردن اعلان، وضعیت سفارش یا تعهد مالی را تغییر نمی‌دهد. این صفحه پیام آزمایشی ارسال نمی‌کند.",
                    "Turning notifications off does not change order status or financial obligations. This page does not send test messages.",
                  )}
                </p>
              </aside>
            </div>
          </>
        )}
        <footer className="account-pref-footer">
          <span>
            {t(
              "ارتباط روشن، با انتخاب شما.",
              "Clear communication, on your terms.",
            )}
          </span>
          <span>{liveApi?"Nilart":"Nilart · Demo"}</span>
        </footer>
        {!liveApi && <details className="dash-preview">
          <summary>
            {t("حالت‌های پیش‌نمایش", "Preview states")} <bdi>USER-14 · Demo</bdi>
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
          className="account-pref-dialog modal"
          aria-labelledby="account-pref-dialog-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <div className="modal-head">
            <h2 id="account-pref-dialog-title">
              {modal === "leave"
                ? t(
                    "تغییرات ذخیره نشده‌اند.",
                    "Your changes have not been saved.",
                  )
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
            <div>
              <p>
                {t(
                  "خروج، انتخاب‌های ذخیره‌نشده را کنار می‌گذارد. پیام‌های ضروری یا سفارش‌ها تغییر نمی‌کنند.",
                  "Leaving discards unsaved selections. Essential messages and orders are not changed.",
                )}
              </p>
              <div className="account-pref-dialog-actions">
                <button className="button primary" data-stay onClick={close}>
                  {t("ماندن در صفحه", "Stay")}
                </button>
                <button
                  className="button secondary"
                  onClick={leaveWithoutSaving}
                >
                  {t("خروج بدون ذخیره", "Leave without saving")}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p>
                {t(
                  "این مقصد مستقل است و در این مرحله بازطراحی نشده است؛ هیچ پیام یا تیکتی ارسال نشده است.",
                  "This destination is independent and not redesigned in this step; no message or ticket has been sent.",
                )}
              </p>
              <code dir="ltr">{destination}</code>
              <button className="button secondary" onClick={close}>
                {t("بازگشت به ترجیحات", "Back to preferences")}
              </button>
            </div>
          )}
        </dialog>
      </div>
    </DashboardPage>
  )
}
