import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useRef, useState } from "react"
import { referenceErrors, type ReferenceDraft } from "./references"
import {
  customSizeDemo,
  normalizeDimension,
  preferenceErrors,
  preferenceSizes,
  preferenceStyles,
  type PreferencesDraft,
  type Execution,
} from "./preferences"
import type { ReferenceNavigationGuard } from "./ReferencesPage"
import "./references.css"
import "./preferences.css"

const blank: PreferencesDraft = {
  id: "demo-preferences",
  version: 0,
  referenceVersion: 0,
  execution: "",
  style: "",
  size: "",
  width: "",
  height: "",
  assessmentNeedsReview: false,
}
const modes = [
  ["normal", "عادی", "Normal"],
  ["loading", "بارگذاری", "Loading"],
  ["load-error", "خطای دریافت", "Load error"],
  ["empty-styles", "بدون سبک", "No styles"],
  ["empty-sizes", "بدون سایز", "No sizes"],
  ["removed", "گزینه حذف‌شده", "Removed option"],
  ["save-error", "خطای ذخیره", "Save error"],
  ["offline", "خطای شبکه", "Network error"],
  ["expired", "نشست منقضی", "Session expired"],
  ["denied", "عدم دسترسی", "Permission denied"],
  ["conflict", "تعارض نسخه", "Draft conflict"],
  ["return", "بازگشت از ارزیابی", "Return from assessment"],
]
function ArtSample({ variant }: { variant: number }) {
  return (
    <div
      className={`pref-art pref-art-${variant}`}
      role="img"
      aria-label="Demo · original abstract illustration, not approved NilArt artwork"
    >
      <svg viewBox="0 0 320 220" aria-hidden="true">
        {variant === 0 ? (
          <>
            <path
              d="M45 180Q0 110 75 45T200 60Q280 10 290 100T190 185Z"
              fill="var(--accent)"
              opacity=".7"
            />
            <path
              d="M30 160Q100 20 150 130T290 65"
              fill="none"
              stroke="var(--warning-text)"
              strokeWidth="22"
              opacity=".6"
            />
            <path
              d="M50 185Q145 75 265 155"
              fill="none"
              stroke="var(--surface)"
              strokeWidth="9"
            />
            <path
              d="m115 35 65 145M60 95l200-40"
              stroke="var(--text)"
              opacity=".3"
              strokeWidth="3"
            />
          </>
        ) : variant === 1 ? (
          <>
            <circle
              cx="210"
              cy="76"
              r="35"
              fill="var(--accent)"
              opacity=".65"
            />
            <path
              d="M58 185V115a55 55 0 0 1 110 0v70Z"
              fill="var(--muted)"
              opacity=".35"
            />
            <path
              d="M138 180V95a38 38 0 0 1 76 0v85"
              fill="none"
              stroke="var(--text)"
              strokeWidth="2"
            />
            <path d="M35 185h250" stroke="var(--text)" opacity=".4" />
          </>
        ) : (
          <>
            <path
              d="M88 185q-8-52 16-90 10-52 54-65 45 22 55 75 28 37 15 80Z"
              fill="var(--accent)"
              opacity=".35"
            />
            <path
              d="M116 190q20-32 13-64-19-22-6-47 5-22 30-31 35 12 43 37 8 25-11 42-7 23 9 63M140 89q9-6 15 0m14 0q9-6 15 0m-24 3-4 24 12 0m-24 13q16 10 29 0"
              fill="none"
              stroke="var(--text)"
              strokeWidth="2"
            />
            <path
              d="m65 163 21-9m152-39 22-10m-54-67 15-12"
              stroke="var(--accent)"
              strokeWidth="3"
            />
          </>
        )}
      </svg>
      <span>DEMO · STUDY {variant + 1}</span>
    </div>
  )
}
export default function PreferencesPage({
  language,
  signedIn,
  reference,
  saved,
  onSave,
  onNavigate,
  onDemoSignIn,
  registerGuard,
  hasPriorAssessment = false,
  live = false,
  liveSubmission,
}: {
  language: 0 | 1
  signedIn: boolean
  reference: ReferenceDraft | null
  saved: PreferencesDraft | null
  onSave: (draft: PreferencesDraft | null) => void
  onNavigate: (name: string, route: string) => void
  onDemoSignIn: (value: boolean) => void
  registerGuard: (guard: ReferenceNavigationGuard | null) => void
  live?: boolean
  liveSubmission?: { status: string; receipt: string; submit: (draft: PreferencesDraft) => Promise<boolean> }
  hasPriorAssessment?: boolean
}) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const prefix = `/${language === 0 ? "fa" : "en"}`
  const [draft, setDraft] = useState<PreferencesDraft>(
    signedIn && saved ? saved : blank,
  )
  const [mode, setMode] = useState("normal")
  const [status, setStatus] = useState("idle")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState("")
  const [detail, setDetail] = useState<string | null>(null)
  const [privateUrl, setPrivateUrl] = useState("")
  const dialog = useRef<HTMLDialogElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const busy = useRef(false)
  const epoch = useRef(0)
  const baseline = useRef(JSON.stringify(signedIn && saved ? saved : blank))
  const dirty = !liveSubmission?.receipt && JSON.stringify(draft) !== baseline.current
  const authorized = signedIn && !["denied", "expired"].includes(mode)
  const validReference =
    authorized &&
    reference?.owner === (live ? "account-session" : "demo-session") &&
    reference.version > 0 &&
    Object.keys(referenceErrors(reference, live ? 4000 : 2000)).length === 0
  const blocked =
    !authorized || ["loading", "load-error", "conflict"].includes(mode) || !!(liveSubmission && ["unknown", "saving", "saved"].includes(liveSubmission.status))
  const currentErrors = preferenceErrors(
    draft,
    mode === "empty-styles",
    mode === "empty-sizes",
  )
  if (mode === "removed" && draft.style) currentErrors.style = "unavailable"
  const valid = validReference && !blocked && !Object.keys(currentErrors).length
  const selectedStyle = preferenceStyles.find((s) => s.id === draft.style)
  const selectedSize = preferenceSizes.find((s) => s.id === draft.size)
  const width =
    draft.size === "custom"
      ? normalizeDimension(draft.width)
      : selectedSize?.width
  const height =
    draft.size === "custom"
      ? normalizeDimension(draft.height)
      : selectedSize?.height
  const orientation =
    width && height
      ? Number(width) === Number(height)
        ? t("مربع", "Square")
        : Number(width) > Number(height)
          ? t("افقی", "Landscape")
          : t("عمودی", "Portrait")
      : t("هنوز انتخاب نشده", "Not selected yet")
  const sizeText = draft.size
    ? `${width || "—"} × ${height || "—"} ${
        draft.size === "custom" || selectedSize?.unit === "cm"
          ? t("سانتی‌متر", "cm")
          : t("پیکسل", "px")
      }`
    : t("هنوز انتخاب نشده", "Not selected yet")
  const update = (patch: Partial<PreferencesDraft>) => {
    setDraft((old) => ({
      ...old,
      ...patch,
      assessmentNeedsReview:
        old.assessmentNeedsReview || mode === "return" || hasPriorAssessment,
    }))
    setStatus("idle")
    setErrors({})
    if ("execution" in patch)
      setNotice(
        t(
          "با تغییر نوع اجرا، انتخاب‌های قبلی را دوباره بررسی کنید؛ هیچ انتخابی خودکار جایگزین نشده است.",
          "Review previous choices after changing execution; no selections were automatically replaced.",
        ),
      )
  }
  useEffect(() => {
    epoch.current++
    if (!authorized) {
      setDraft(blank)
      baseline.current = JSON.stringify(blank)
      setStatus("idle")
      setDetail(null)
      dialog.current?.close()
    } else {
      setDraft(saved || blank)
      baseline.current = JSON.stringify(saved || blank)
    }
  }, [authorized])
  useEffect(() => {
    if (!authorized || !reference || reference.owner !== (live ? "account-session" : "demo-session")) {
      setPrivateUrl("")
      return
    }
    const file = reference.files.find(
      (f) => f.id === reference.primary && f.status === "accepted",
    )
    if (!file) {
      setPrivateUrl("")
      return
    }
    const url = URL.createObjectURL(file.file)
    setPrivateUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [authorized, reference])
  useEffect(() => {
    if (detail) dialog.current?.showModal()
  }, [detail])
  useEffect(() => {
    const guard: ReferenceNavigationGuard = (proceed) => {
      if (busy.current) return false
      if (
        dirty &&
        authorized &&
        !window.confirm(
          t(
            "تغییرات این صفحه ذخیره نشده‌اند. بدون ذخیره خارج می‌شوید؟",
            "These changes are not saved. Leave without saving?",
          ),
        )
      )
        return false
      proceed()
      return true
    }
    registerGuard(guard)
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty && authorized) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", unload)
    return () => {
      registerGuard(null)
      window.removeEventListener("beforeunload", unload)
    }
  }, [dirty, authorized, language, registerGuard])
  useEffect(
    () => () => {
      epoch.current++
    },
    [],
  )
  const save = async (continueNext = false, previous = false) => {
    if (busy.current) return
    if (liveSubmission?.status === "unknown" && continueNext) {
      busy.current = true; setStatus("saving"); const generation = epoch.current;
      const confirmed = await liveSubmission.submit(draft);
      if (generation !== epoch.current) return;
      busy.current = false; setStatus(confirmed ? "saved" : "failed"); return
    }
    if (blocked) return
    const problems = { ...currentErrors }
    if (!validReference) problems.reference = "required"
    setErrors(problems)
    if (Object.keys(problems).length) {
      const key = Object.keys(problems)[0]
      form.current
        ?.querySelector<HTMLElement>(
          `[data-section="${key}"] input:not(:disabled), [data-section="${key}"] button, [data-section="${key}"]`,
        )
        ?.focus()
      return
    }
    if (live) {
      if (continueNext && liveSubmission) {
        busy.current = true; setStatus("saving"); const generation = epoch.current;
        const confirmed = await liveSubmission.submit(draft);
        if (generation !== epoch.current) return;
        busy.current = false; setStatus(confirmed ? "saved" : "failed");
        if (confirmed) baseline.current = JSON.stringify(draft);
      } else { const next = { ...draft, version: (saved?.version || 0) + 1, referenceVersion: reference!.version }; setDraft(next); baseline.current = JSON.stringify(next); onSave(next); setStatus("saved") }
      return
    }
    busy.current = true
    setStatus("saving")
    const generation = epoch.current
    await new Promise((resolve) => setTimeout(resolve, 650))
    busy.current = false
    if (epoch.current !== generation) return
    if (["save-error", "offline", "conflict"].includes(mode)) {
      setStatus("failed")
      return
    }
    const next = {
      ...draft,
      version: (saved?.version || 0) + 1,
      referenceVersion: reference!.version,
    }
    setDraft(next)
    baseline.current = JSON.stringify(next)
    onSave(next)
    setStatus("saved")
    if (continueNext || previous) {
      registerGuard(null)
      onNavigate(
        previous
          ? t("تصویر و توضیحات", "References and brief")
          : t("ارزیابی", "Assessment"),
        `${prefix}/commissions/new/${previous ? "references" : "assessment"}`,
      )
    }
  }
  const back = () => {
    if (busy.current || liveSubmission?.status === "unknown" || liveSubmission?.status === "saved") return
    // Secure session-memory checkpoint: partial choices survive an intentional step back.
    if (authorized) {
      onSave(draft)
      baseline.current = JSON.stringify(draft)
      registerGuard(null)
    }
    onNavigate(
      t("تصویر و توضیحات", "References and brief"),
      `${prefix}/commissions/new/references`,
    )
  }
  const errorText = (key: string) => {
    const error =
      errors[key] ||
      (draft[(key as "style" | "size")] && currentErrors[key] === "unavailable"
        ? "unavailable"
        : "")
    if (!error) return null
    return (
      <p id={`pref-error-${key}`} className="ref-field-error" role="alert">
        {error === "unavailable"
          ? t(
              "این ترکیب در حال حاضر قابل انتخاب نیست؛ انتخاب قبلی نیازمند بررسی است.",
              "This combination is currently unavailable. Review the previous selection.",
            )
          : error === "dimensions"
            ? t(
                "ابعاد را در محدوده مجاز وارد کنید.",
                "Enter dimensions within the allowed range.",
              )
            : key === "execution"
              ? t("نوع اجرا را انتخاب کنید.", "Choose an execution type.")
              : key === "style"
                ? t("سبک موردنظر را انتخاب کنید.", "Choose an art style.")
                : t("سایز اثر را انتخاب کنید.", "Choose an artwork size.")}
      </p>
    )
  }
  const close = () => {
    dialog.current?.close()
    setDetail(null)
    trigger.current?.focus()
  }
  const detailStyle = preferenceStyles.find((s) => s.id === detail)
  return (
    <div className="container references-page preferences-page">
      <nav className="ref-breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        <button onClick={() => onNavigate(t("خانه", "Home"), "/")}>
          {t("خانه", "Home")}
        </button>
        <span>/</span>
        <button
          onClick={() =>
            onNavigate(t("سفارش نقاشی", "Commission"), `${prefix}/commissions`)
          }
        >
          {t("سفارش نقاشی", "Commission")}
        </button>
        <span>/</span>
        <span>{t("سبک و اجرا", "Style and execution")}</span>
      </nav>
      <div className="ref-heading">
        <div>
          <span className="eyebrow">
            PAINT–05 / {t("سفارش یک اثر، به سلیقه شما", "AN ARTWORK, YOUR WAY")}
          </span>
          <h1>
            {t(
              "سبک و مشخصات اثرتان را انتخاب کنید",
              "Choose your artwork preferences",
            )}
          </h1>
          <p>
            {t(
              "نوع اجرا، سبک و سایز را مشخص کنید. پیشنهاد قیمت پس از ارزیابی اطلاعات نمایش داده می‌شود.",
              live ? "Choose your requested execution, style and size, then submit a text brief for review. No quote is generated." : "Choose the execution type, style and size. A price proposal follows assessment of your request.",
            )}
          </p>
        </div>
        <span className="ref-step-label">
          {t("مرحله ۲ از ۴", "Step 2 of 4")}
        </span>
      </div>
      <ol className="ref-stepper">
        {[
          [
            t("تصویر و توضیحات", "References and brief"),
            validReference
              ? t("انجام‌شده · Demo", "Complete · Demo")
              : t("نیازمند ذخیره معتبر", "Valid save required"),
          ],
          [
            t("سبک و اجرا", "Style and execution"),
            t("مرحله جاری", "Current step"),
          ],
          [t("ارزیابی", "Assessment"), live ? t("فعلاً در دسترس نیست", "Currently unavailable") : t("مرحله بعد", "Next step")],
          [
            t("پیشنهاد و تأیید", "Proposal and approval"),
            live ? t("فعلاً در دسترس نیست", "Currently unavailable") : t("در انتظار", "Upcoming"),
          ],
        ].map(([name, state], i) => (
          <li
            key={i}
            aria-current={i === 1 ? "step" : undefined}
            className={i === 0 && validReference ? "pref-completed" : ""}
          >
            <span>
              {i === 0 && validReference
                ? "✓"
                : (i + 1).toLocaleString(language === 0 ? "fa" : "en")}
            </span>
            <div>
              {name}
              <small>{state}</small>
            </div>
          </li>
        ))}
      </ol>
      <div className="ref-demo-banner">
        <span>{live ? t("ترجیحات درخواستی", "Requested preferences") : "DEMO"}</span>
        <p>
          {live ? t("گزینه‌ها و نمونه‌های تصویری صرفاً برای بیان خواسته شما هستند؛ تولید، قیمت یا سفارش خرید را تأیید نمی‌کنند. تا ثبت نهایی، اطلاعات در حافظه این نشست است. ثبت نهایی فقط درخواست بررسی را ذخیره می‌کند.", "Options and visual studies express your preferences; they do not confirm production, pricing or a purchase. Checkpoints stay in session memory. Final submission stores a review request only.") : t(
            "گزینه‌ها، نمونه‌های تصویری و محدوده ابعاد صرفاً نمایشی‌اند. ذخیره فقط در حافظه این نشست است؛ با بارگذاری مجدد از بین می‌رود. سرویس واقعی متصل نیست.",
            "Options, visual studies and dimension limits are illustrative. Saves exist only in this session’s memory and are lost on reload. No live service is connected.",
          )}
        </p>
      </div>
      {!authorized ? (
        <section className="ref-auth-notice">
          <div>
            <h2>
              {mode === "denied"
                ? t(
                    "اجازه دسترسی به پیش‌نویس را ندارید",
                    "You cannot access this draft",
                  )
                : t("برای ادامه وارد شوید", "Sign in to continue")}
            </h2>
            <p>
              {mode === "expired"
                ? t(
                    "نشست منقضی شده است. اطلاعات خصوصی نمایش داده نمی‌شوند؛ حفظ داده فقط در حافظه نشست مجاز Demo امکان‌پذیر است.",
                    "Your session has expired. Private data is hidden; preservation is limited to authorized Demo session memory.",
                  )
                : t(
                    "پیش‌نویس و تصویر خصوصی فقط در نشست مجاز Demo نمایش داده می‌شوند.",
                    "Private drafts and references are visible only in the authorized Demo session.",
                  )}
            </p>
            {mode !== "denied" && (
              <button
                className="button primary"
                onClick={() => {
                  onDemoSignIn(true)
                  setMode("normal")
                }}
              >
                {t(
                  "ورود نمایشی و بازگشت به همین مرحله",
                  "Demo sign-in · return to this step",
                )}
              </button>
            )}
          </div>
        </section>
      ) : mode === "loading" ? (
        <div
          className="ref-loading"
          aria-busy="true"
          aria-label={t("در حال دریافت گزینه‌ها", "Loading options")}
        >
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : mode === "load-error" ? (
        <section className="ref-auth-notice">
          <div>
            <h2>
              {t(
                "دریافت گزینه‌های سفارش ممکن نشد.",
                "Unable to load commission options.",
              )}
            </h2>
            <p>
              {t(
                "انتخاب‌های نشست حفظ شده‌اند.",
                "Session selections have been preserved.",
              )}
            </p>
            <button
              className="button secondary"
              onClick={() => setMode("normal")}
            >
              {t("تلاش دوباره", "Try again")}
            </button>
          </div>
        </section>
      ) : (
        <form
          ref={form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void save(true)
          }}
        >
          <div className="pref-layout">
            <div className="pref-main">
              <section
                className="pref-reference"
                data-section="reference"
                tabIndex={-1}
              >
                {validReference ? (
                  <>
                    {privateUrl && (
                      <img
                        src={privateUrl}
                        alt={t(
                          "مرجع اصلی خصوصی شما",
                          "Your private primary reference",
                        )}
                      />
                    )}
                    <div>
                      <span className="pref-kicker">
                        {t("تصویر و توضیحات شما", "Your references and brief")}{" "}
                        · {t("خصوصی", "Private")}
                      </span>
                      <details>
                        <summary>
                          {reference!.brief.slice(0, 100)}
                          {reference!.brief.length > 100 ? "…" : ""}
                        </summary>
                        <p>{reference!.brief}</p>
                      </details>
                      <small>
                        {reference!.kind === "idea"
                          ? t(
                              "درخواست بر اساس ایده · بدون تصویر",
                              "Idea-based request · no image",
                            )
                          : t(
                              `${reference!.files.length.toLocaleString("fa")} تصویر ثبت‌شده · Demo`,
                              `${reference!.files.length} accepted images · Demo`,
                            )}
                      </small>
                    </div>
                  </>
                ) : (
                  <div>
                    <span className="pref-kicker">
                      {t("تصویر و توضیحات شما", "Your references and brief")}
                    </span>
                    <p className="ref-field-error">
                      {t(
                        "مرحله قبل هنوز ذخیره معتبر ندارد؛ پیش از ادامه آن را تکمیل کنید.",
                        "The previous step has no valid save. Complete it before continuing.",
                      )}
                    </p>
                  </div>
                )}
                <button type="button" className="text-link" onClick={back}>
                  {t("ویرایش مرحله قبل", "Edit previous step")}
                </button>
              </section>
              {hasPriorAssessment ||
              mode === "return" ||
              draft.assessmentNeedsReview ||
              (saved?.referenceVersion &&
                saved.referenceVersion !== reference?.version) ? (
                <p className="pref-warning" role="status">
                  {t(
                    "تغییر این مشخصات ممکن است به ارزیابی و پیشنهاد جدید نیاز داشته باشد. نتیجه قبلی معتبر فرض نمی‌شود؛ پیشنهاد و سفارش پرداخت‌شده در این Demo تغییر نمی‌کنند.",
                    "Changing these specifications may require a new assessment and proposal. Previous results are not treated as valid; proposals and paid orders are not modified in this Demo.",
                  )}
                </p>
              ) : null}
              {mode === "conflict" && (
                <div className="pref-warning" role="alert">
                  <p>
                    {t(
                      "نسخه جدیدتری وجود دارد · شبیه‌سازی Demo. ذخیره مسدود است و انتخاب‌ها حفظ شده‌اند.",
                      "A newer version exists · Demo simulation. Saving is blocked and choices are preserved.",
                    )}
                  </p>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            "نسخه ذخیره‌شده نشست جایگزین ویرایش‌های فعلی شود؟",
                            "Replace current edits with the session’s saved version?",
                          ),
                        )
                      ) {
                        setDraft(saved || blank)
                        baseline.current = JSON.stringify(saved || blank)
                        setMode("normal")
                      }
                    }}
                  >
                    {t("بارگیری نسخه ذخیره‌شده", "Load saved version")}
                  </button>
                </div>
              )}
              <fieldset
                className="ref-section pref-fieldset"
                disabled={blocked || status === "saving"}
                data-section="execution"
                aria-describedby="pref-error-execution"
              >
                <legend>
                  <span>01</span>
                  {t("نوع اجرا", "Execution type")}
                  <small>{t("الزامی", "Required")}</small>
                </legend>
                <div className="pref-executions">
                  {(["digital", "hand"] as Execution[]).map((execution) => (
                    <label
                      key={execution}
                      className={`pref-choice ${
                        draft.execution === execution ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="execution"
                        value={execution}
                        checked={draft.execution === execution}
                        onChange={() => update({ execution })}
                      />
                      <div>
                        <svg
                          viewBox="0 0 24 24"
                          width="28"
                          height="28"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          aria-hidden="true"
                        >
                          {execution === "digital" ? (
                            <>
                              <rect x="3" y="4" width="18" height="13" rx="2" />
                              <path d="M8 21h8m-4-4v4m-6-7 3-4 4 3 4-6" />
                            </>
                          ) : (
                            <>
                              <path d="m8 14 9-11 4 3-9 11M8 14l4 3q-1 5-7 4-4 0-2-4 0-3 5-3Z" />
                            </>
                          )}
                        </svg>
                        <strong>
                          {execution === "digital"
                            ? t("اجرای دیجیتال", "Digital artwork")
                            : t("اجرای دستی", "Hand-painted artwork")}
                        </strong>
                        <p>
                          {execution === "digital"
                            ? t(
                                "تحویل فایل نهایی با مشخصات توافق‌شده سفارش.",
                                "Delivery of the final file according to the agreed order specifications.",
                              )
                            : t(
                                "اجرای اثر فیزیکی با مشخصات و شرایط تحویل همان سفارش.",
                                "Creation of a physical artwork with order-specific specifications and delivery conditions.",
                              )}
                        </p>
                        <small>
                          {draft.execution === execution
                            ? t("✓ انتخاب‌شده · Demo", "✓ Selected · Demo")
                            : "Demo"}
                        </small>
                      </div>
                    </label>
                  ))}
                </div>
                {errorText("execution")}
                <p className="pref-help">
                  {t(
                    "اجرای دیجیتال به معنی تولید خودکار AI نیست. تکنیک، سطح و شرایط تحویل دستی در پیشنهاد مشخص می‌شوند.",
                    "Digital artwork does not mean automatic AI generation. Physical technique, surface and delivery terms are defined in the proposal.",
                  )}
                </p>
              </fieldset>
              <fieldset
                className="ref-section pref-fieldset"
                disabled={blocked || status === "saving"}
                data-section="style"
                tabIndex={-1}
                aria-describedby="pref-error-style"
              >
                <legend>
                  <span>02</span>
                  {t("سبک هنری", "Art style")}
                  <small>{t("الزامی", "Required")}</small>
                </legend>
                <p className="pref-help">
                  {t(
                    "تصاویر برای آشنایی با ویژگی‌های سبک هستند؛ نتیجه نهایی به درخواست و اجرای اثر بستگی دارد.",
                    "Examples illustrate the style. The final result depends on your request and the artwork’s execution.",
                  )}
                </p>
                {!draft.execution ? (
                  <p className="pref-empty">
                    {t(
                      "ابتدا نوع اجرا را انتخاب کنید.",
                      "Choose an execution type first.",
                    )}
                  </p>
                ) : mode === "empty-styles" ? (
                  <p className="pref-empty">
                    {t(
                      "برای این نوع اجرا، سبکی در دسترس نیست. نوع اجرا را تغییر دهید.",
                      "No styles are available for this execution type. Change execution type.",
                    )}
                  </p>
                ) : (
                  <div className="pref-styles">
                    {preferenceStyles.map((style) => {
                      const compatible =
                        style.executions.includes(draft.execution) &&
                        !(mode === "removed" && draft.style === style.id)
                      return (
                        <article
                          key={style.id}
                          className={`pref-style ${
                            draft.style === style.id ? "selected" : ""
                          } ${!compatible ? "unavailable" : ""}`}
                        >
                          <label>
                            <ArtSample variant={style.art} />
                            <div className="pref-style-title">
                              <input
                                type="radio"
                                name="style"
                                checked={draft.style === style.id}
                                disabled={!compatible}
                                onChange={() => update({ style: style.id })}
                              />
                              <strong>{style.name[language]}</strong>
                            </div>
                            <p>{style.desc[language]}</p>
                            <small>
                              {!compatible
                                ? t(
                                    "ناسازگار با این اجرا / نیازمند بررسی",
                                    "Unavailable for this execution / review needed",
                                  )
                                : draft.style === style.id
                                  ? t(
                                      "✓ انتخاب‌شده · سازگار",
                                      "✓ Selected · compatible",
                                    )
                                  : t(
                                      "سازگار با این اجرا",
                                      "Compatible with this execution",
                                    )}
                            </small>
                          </label>
                          <button
                            type="button"
                            onClick={(e) => {
                              trigger.current = e.currentTarget
                              setDetail(style.id)
                            }}
                          >
                            {t("درباره این سبک", "About this style")}{" "}
                            <span aria-hidden="true">↗</span>
                          </button>
                        </article>
                      )
                    })}
                  </div>
                )}
                {errorText("style")}
              </fieldset>
              <fieldset
                className="ref-section pref-fieldset"
                disabled={blocked || status === "saving"}
                data-section="size"
                tabIndex={-1}
                aria-describedby="pref-error-size"
              >
                <legend>
                  <span>03</span>
                  {t("سایز اثر", "Artwork size")}
                  <small>{t("الزامی", "Required")}</small>
                </legend>
                <p className="pref-help">
                  {draft.execution === "digital"
                    ? t(
                        "Demo · ابعاد فایل خروجی به پیکسل؛ اندازه چاپ یا DPI در این نمونه تعیین نشده است.",
                        "Demo · output file dimensions in pixels; print size and DPI are not defined here.",
                      )
                    : t(
                        "Demo · عرض × ارتفاع خود اثر، به سانتی‌متر؛ نه ابعاد قاب یا بسته‌بندی.",
                        "Demo · artwork width × height in centimetres, not frame or packaging dimensions.",
                      )}
                </p>
                {!draft.execution || !draft.style || currentErrors.style ? (
                  <p className="pref-empty">
                    {t(
                      "ابتدا نوع اجرا و یک سبک سازگار را انتخاب کنید.",
                      "Choose execution and a compatible style first.",
                    )}
                  </p>
                ) : mode === "empty-sizes" ? (
                  <p className="pref-empty">
                    {t(
                      "برای این ترکیب سایزی در دسترس نیست؛ امکان ادامه وجود ندارد.",
                      "No sizes are available for this combination; you cannot continue.",
                    )}
                  </p>
                ) : (
                  <>
                    <div className="pref-sizes">
                      {preferenceSizes
                        .filter((s) => s.execution === draft.execution)
                        .map((size) => (
                          <label
                            key={size.id}
                            className={`pref-choice ${
                              draft.size === size.id ? "selected" : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name="size"
                              checked={draft.size === size.id}
                              onChange={() => update({ size: size.id })}
                            />
                            <div>
                              <bdi dir="ltr">
                                {size.width} × {size.height} {size.unit}
                              </bdi>
                              <small>
                                {size.width === size.height
                                  ? t("مربع", "Square")
                                  : t("عمودی", "Portrait")}{" "}
                                {draft.size === size.id ? "· ✓" : ""}
                              </small>
                            </div>
                          </label>
                        ))}
                      {draft.execution === "hand" && (
                        <label
                          className={`pref-choice ${
                            draft.size === "custom" ? "selected" : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name="size"
                            checked={draft.size === "custom"}
                            onChange={() => update({ size: "custom" })}
                          />
                          <div>
                            {t("ابعاد سفارشی", "Custom dimensions")}
                            <small>
                              Demo {draft.size === "custom" ? "· ✓" : ""}
                            </small>
                          </div>
                        </label>
                      )}
                    </div>
                    {draft.size === "custom" && (
                      <div className="pref-custom">
                        <p>
                          {t(
                            "محدوده Demo: ۲۰ تا ۸۰ سانتی‌متر، با گام ۵. این محدودیت از سرویس واقعی دریافت نشده است.",
                            "Demo range: 20–80 cm, in increments of 5. These limits are not from a live service.",
                          )}
                        </p>
                        <div>
                          {(["width", "height"] as const).map((key) => (
                            <label key={key}>
                              {key === "width"
                                ? t("عرض", "Width")
                                : t("ارتفاع", "Height")}
                              <input
                                inputMode="decimal"
                                dir="ltr"
                                value={draft[key]}
                                aria-invalid={!!currentErrors.size}
                                aria-describedby="pref-error-size"
                                onChange={(e) =>
                                  update({ [key]: e.target.value })
                                }
                              />
                            </label>
                          ))}
                          <div>
                            <span>{t("واحد", "Unit")}</span>
                            <p>{t("سانتی‌متر", "cm")}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {errorText("size")}
                <details className="pref-size-guide">
                  <summary>
                    {t(
                      "برای انتخاب سایز کمک می‌خواهید؟",
                      "Need help choosing a size?",
                    )}
                  </summary>
                  <p>
                    {t(
                      "اعداد به ترتیب عرض × ارتفاع هستند. مقایسه زیر نسبی است؛ نمایش اندازه واقعی روی صفحه نیست.",
                      "Dimensions are width × height. The comparison below is proportional, not life-size on screen.",
                    )}
                  </p>
                  <div>
                    {preferenceSizes
                      .filter((s) => s.execution === draft.execution)
                      .map((s) => (
                        <div key={s.id}>
                          <svg
                            viewBox="0 0 100 110"
                            width="80"
                            height="100"
                            aria-hidden="true"
                          >
                            <rect
                              x="10"
                              y={100 - s.height / (s.unit === "cm" ? 0.5 : 40)}
                              width={s.width / (s.unit === "cm" ? 0.5 : 40)}
                              height={s.height / (s.unit === "cm" ? 0.5 : 40)}
                              fill="var(--canvas)"
                              stroke="var(--accent)"
                            />
                          </svg>
                          <bdi dir="ltr">
                            {s.width} × {s.height} {s.unit}
                          </bdi>
                        </div>
                      ))}
                  </div>
                  <p>
                    {draft.execution === "digital"
                      ? t(
                          "پیکسل، DPI و اندازه فیزیکی یکسان نیستند؛ مناسب‌بودن چاپ باید جداگانه بررسی شود.",
                          "Pixels, DPI and physical size are different; print suitability needs a separate review.",
                        )
                      : t(
                          "جهت اثر از نسبت عرض و ارتفاع مشخص می‌شود.",
                          "Orientation follows the width-to-height ratio.",
                        )}
                  </p>
                </details>
              </fieldset>
              <section className="ref-section pref-extras">
                <div className="ref-section-title">
                  <span>04</span>
                  <div>
                    <h2>{t("گزینه‌های تکمیلی", "Additional options")}</h2>
                    <p>
                      {t(
                        "در این Demo گزینه تکمیلی فعالی تعریف نشده است.",
                        "No active additional options are defined in this Demo.",
                      )}
                    </p>
                  </div>
                </div>
                <p className="pref-help">
                  {t(
                    "قاب، چاپ، فایل لایه‌باز یا حقوق تجاری به سفارش اضافه نمی‌شوند. شرایط تحویل و هزینه‌های احتمالی پس از ارزیابی مشخص می‌شوند؛ هزینه نامعلوم صفر فرض نمی‌شود.",
                    "Framing, printing, source files and commercial rights are not added. Delivery terms and possible costs follow assessment; unknown costs are not assumed to be zero.",
                  )}
                </p>
              </section>
            </div>
            <aside className="pref-sidebar">
              <section className="pref-summary">
                <span className="pref-kicker">
                  {t("اثری برای شما", "MADE FOR YOU")}
                </span>
                <h2>{t("خلاصه انتخاب‌های شما", "Your selected preferences")}</h2>
                <dl>
                  {[
                    [
                      t("نوع اجرا", "Execution type"),
                      draft.execution === "digital"
                        ? t("اجرای دیجیتال", "Digital artwork")
                        : draft.execution === "hand"
                          ? t("اجرای دستی", "Hand-painted artwork")
                          : t("هنوز انتخاب نشده", "Not selected yet"),
                      currentErrors.execution,
                    ],
                    [
                      t("سبک", "Style"),
                      selectedStyle?.name[language] ||
                        t("هنوز انتخاب نشده", "Not selected yet"),
                      currentErrors.style,
                    ],
                    [
                      t("سایز و واحد", "Size and unit"),
                      sizeText,
                      currentErrors.size,
                    ],
                    [t("جهت اثر", "Orientation"), orientation, ""],
                    [
                      t("گزینه‌های تکمیلی", "Additional options"),
                      t("گزینه فعالی تعریف نشده", "No active options defined"),
                      "",
                    ],
                  ].map(([label, value, error]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>
                        <bdi>{value}</bdi>
                        {error === "unavailable" && (
                          <small className="ref-field-error">
                            {t("نیازمند بررسی", "Review needed")}
                          </small>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className={`pref-completeness ${(valid || !!liveSubmission?.receipt) ? "complete" : ""}`}>
                  {(valid || !!liveSubmission?.receipt)
                    ? t(
                        "✓ اطلاعات ضروری کامل است",
                        "✓ Required information is complete",
                      )
                    : t(
                        "اطلاعات هنوز کامل یا معتبر نیست",
                        "Information is incomplete or invalid",
                      )}
                </p>
                <p className="pref-help">
                  {t(
                    "قیمت و شرایط پیشنهادی پس از ارزیابی مشخص می‌شوند.",
                    "Proposed pricing and conditions are determined after assessment.",
                  )}
                </p>
                <div className="pref-summary-footer">
                  {t(
                    "انتخاب ترجیحات به معنی پذیرش قطعی درخواست یا شروع اجرا نیست.",
                    "Preferences do not confirm acceptance or start artwork creation.",
                  )}
                </div>
              </section>
              <section className="pref-side-note">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  aria-hidden="true"
                >
                  <rect x="5" y="10" width="14" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3m4 4v3" />
                </svg>
                <h3>
                  {t("مرجع شما، خصوصی می‌ماند", "Your reference stays private")}
                </h3>
                <p>
                  {t(
                    "تصویر محلی فقط از طریق آدرس موقت همین مرورگر نمایش داده می‌شود؛ لینک عمومی ساخته نمی‌شود. نمونه‌های سبک مستقل از مرجع شما هستند.",
                    "Local images use temporary browser URLs, never public links. Style studies are independent of your reference.",
                  )}
                </p>
              </section>
            </aside>
          </div>
          <div className="pref-actions">
            <div className="pref-save-state" role="status" aria-live="polite">
              <span
                className={
                  status === "saved" && !dirty
                    ? "saved"
                    : status === "failed"
                      ? "failed"
                      : ""
                }
              >
                {liveSubmission?.receipt ? t("درخواست ثبت شد؛ در انتظار بررسی", "Request saved; awaiting review") : status === "saving"
                  ? t("در حال ذخیره…", "Saving…")
                  : status === "failed"
                    ? t("ذخیره ممکن نشد", "Unable to save")
                    : status === "saved" && !dirty
                      ? t("✓ ذخیره شد · Demo", live ? "✓ Kept in this session" : "✓ Saved · Demo")
                      : t(
                          "تغییرات ذخیره نشده‌اند",
                          "Changes have not been saved",
                        )}
              </span>
              <small>
                {live ? (liveSubmission?.receipt || t("تا ثبت نهایی فقط در حافظه این نشست", "Session memory until final submission")) : t(
                  "فقط حافظه نشست مجاز · بدون ذخیره روی سرور",
                  "Authorized session memory only · no server storage",
                )}
              </small>
            </div>
            <div>
              <button
                type="button"
                className="button secondary"
                disabled={blocked || status === "saving"}
                onClick={() => void save()}
              >
                {status === "failed"
                  ? t("تلاش مجدد ذخیره", "Retry save")
                  : t("ذخیره ترجیحات · Demo", live ? "Keep preferences in this session" : "Save preferences · Demo")}
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={(liveSubmission?.status !== "unknown" && !valid) || status === "saving"}
              >
                {live ? liveSubmission?.status === "unknown" ? t("بررسی دوباره همان درخواست", "Retry same request") : t("ثبت درخواست بررسی", "Submit for review") : t("ادامه به ارزیابی", "Continue to assessment")}
                <span aria-hidden="true">{language === 0 ? "←" : "→"}</span>
              </button>
            </div>
          </div>
          {status === "failed" && (
            <p role="alert" className="pref-warning">
              {live ? liveSubmission?.status === "unknown" ? t("نتیجه ثبت مشخص نیست. بررسی دوباره از همان شناسه و متن استفاده می‌کند.", "Submission is unconfirmed. Retry uses the identical request ID and brief.") : t("درخواست پذیرفته نشد. نشست و اطلاعات را بررسی کنید.", "Request rejected. Check your session and details.") : t(
                "ذخیره Demo تأیید نشد؛ انتخاب‌ها حفظ شده‌اند و ادامه انجام نشده است. حالت خطا را در کنترل Demo رفع و دوباره تلاش کنید.",
                "Demo save was not confirmed. Choices are preserved and navigation was blocked. Clear the error in Demo controls and retry.",
              )}
            </p>
          )}
          <button
            type="button"
            className="text-link pref-back"
            disabled={status === "saving" || liveSubmission?.status === "unknown" || liveSubmission?.status === "saved"}
            onClick={back}
          >
            {t("بازگشت به تصویر و توضیحات", "Back to references and brief")}
          </button>
          <p className="pref-help">
            {t(
              "بازگشت، انتخاب‌های نیمه‌کامل را فقط در حافظه همین نشست مجاز حفظ می‌کند؛ به معنی ذخیره معتبر برای ادامه نیست.",
              "Going back preserves partial choices only in authorized session memory; this is not a validated save for continuation.",
            )}
          </p>
        </form>
      )}
      <p className="pref-announcement" role="status" aria-live="polite">
        {notice}
      </p>
      {!live && <details className="references-demo-controls">
        <summary>
          {t("کنترل حالت‌های نمایشی · Demo", "Prototype state controls · Demo")}
        </summary>
        <div>
          <label>
            {t("حالت صفحه", "Page state")}
            <SelectDropdown
              value={mode}
              disabled={status === "saving"}
              onChange={(e) => {
                setMode(e.target.value)
                setStatus("idle")
                setErrors({})
              }}
            >
              {modes.map(([value, fa, en]) => (
                <option key={value} value={value}>
                  {t(fa, en)}
                </option>
              ))}
            </SelectDropdown>
          </label>
          <label>
            <input
              type="checkbox"
              checked={signedIn}
              onChange={(e) => onDemoSignIn(e.target.checked)}
            />
            {t("نشست مجاز Demo", "Authorized Demo session")}
          </label>
        </div>
        <p>
          {t(
            "حالت بازگشت از ارزیابی فقط شبیه‌سازی نیاز به بازبینی است؛ ارزیابی یا پیشنهادی تولید نمی‌شود. هیچ تصویر تأییدشده برند ارائه نشده؛ نمونه‌ها طراحی انتزاعی مستقل Demo هستند.",
            "Return from assessment simulates review requirements only; no assessment or proposal is produced. No approved brand images were supplied; studies are original abstract Demo illustrations.",
          )}
        </p>
      </details>}
      <dialog
        ref={dialog}
        className="pref-detail-dialog"
        aria-labelledby="pref-detail-title"
        onCancel={(e) => {
          e.preventDefault()
          close()
        }}
        onClose={() => {
          setDetail(null)
          trigger.current?.focus()
        }}
      >
        {detailStyle && (
          <>
            <div className="ref-dialog-heading">
              <h2 id="pref-detail-title">{detailStyle.name[language]}</h2>
              <button
                type="button"
                className="icon-button"
                aria-label={t("بستن", "Close")}
                onClick={close}
              >
                ×
              </button>
            </div>
            <ArtSample variant={detailStyle.art} />
            <span className="pref-kicker">Demo · {detailStyle.name[1]}</span>
            <p>{detailStyle.desc[language]}</p>
            <p className="pref-help">
              {t("اجراهای سازگار:", "Compatible execution:")}{" "}
              {detailStyle.executions
                .map((e) =>
                  e === "digital"
                    ? t("دیجیتال", "Digital")
                    : t("دستی", "Hand-painted"),
                )
                .join(" / ")}
            </p>
            <p className="pref-help">
              {t(
                "این نمونه مستقل از تصویر شماست؛ پیش‌نمایش نتیجه یا تضمین تکرار دقیق نیست.",
                "This study is independent of your image. It is not a result preview or a promise of exact replication.",
              )}
            </p>
            <button
              type="button"
              className="button primary"
              disabled={
                !detailStyle.executions.includes(draft.execution) ||
                blocked ||
                (mode === "removed" && draft.style === detailStyle.id)
              }
              onClick={() => {
                update({ style: detailStyle.id })
                close()
              }}
            >
              {t("انتخاب این سبک", "Choose this style")}
            </button>
          </>
        )}
      </dialog>
    </div>
  )
}
