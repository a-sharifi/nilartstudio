import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import {
  referenceDemoConfig,
  referenceErrors,
  referenceFileError,
  referenceModes,
  referenceSignature,
  sameReferenceFile,
  type InputKind,
  type ReferenceDraft,
  type ReferenceMode,
  type SavedReference,
} from "./references"
import "./references.css"

type LocalReference = SavedReference & { url: string; warning?: boolean }
export type ReferenceNavigationGuard = (proceed: () => void) => boolean
function RefIcon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1.5" />
        <path d="m3 17 6-5 4 3 4-6 4 8" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    text: (
      <>
        <path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" />
      </>
    ),
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={name === "arrow" ? "direction-arrow" : undefined}
    >
      {paths[name] || paths.image}
    </svg>
  )
}
export default function ReferencesPage({
  language,
  signedIn,
  draft,
  onSave,
  onNavigate,
  onDemoSignIn,
  registerGuard,
  initialMode = "normal",
  live = false,
}: {
  language: 0 | 1
  signedIn: boolean
  draft: ReferenceDraft | null
  onSave: (draft: ReferenceDraft | null) => void
  onNavigate: (name: string, route: string) => void
  onDemoSignIn: (value: boolean) => void
  registerGuard: (guard: ReferenceNavigationGuard | null) => void
  live?: boolean
  initialMode?: ReferenceMode
}) {
  const config = live ? { ...referenceDemoConfig, maxText: 4000 } : referenceDemoConfig
  const owner = live ? "account-session" : "demo-session"
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const num = (n: number) =>
    n.toLocaleString(language === 0 ? "fa-IR" : "en-US")
  const prefix = language === 0 ? "/fa" : "/en"
  const initial =
    signedIn &&
    initialMode !== "expired" &&
    initialMode !== "denied" &&
    draft?.owner === owner
      ? draft
      : null
  const [kind, setKind] = useState<InputKind>(initial?.kind || (live ? "idea" : "image"))
  const [brief, setBrief] = useState(initial?.brief || "")
  const ownedUrls = useRef(new Set<string>())
  const [files, setFiles] = useState<LocalReference[]>(
    () =>
      initial?.files.map((f) => {
        const url = URL.createObjectURL(f.file)
        ownedUrls.current.add(url)
        return { ...f, url }
      }) || [],
  )
  const [primary, setPrimary] = useState(initial?.primary || "")
  const [mode, setMode] = useState<ReferenceMode>(initialMode)
  const [fileError, setFileError] = useState("")
  const [briefError, setBriefError] = useState("")
  const [saveStatus, setSaveStatus] =
    useState<"idle" | "saving" | "saved" | "failed">("idle")
  const [saveError, setSaveError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const textInput = useRef<HTMLTextAreaElement>(null)
  const uploadRegion = useRef<HTMLDivElement>(null)
  const previewDialog = useRef<HTMLDialogElement>(null)
  const leaveDialog = useRef<HTMLDialogElement>(null)
  const previewTrigger = useRef<HTMLElement | null>(null)
  const leaveTrigger = useRef<HTMLElement | null>(null)
  const leaveAction = useRef<(() => void) | null>(null)
  const replaceId = useRef<string | null>(null)
  const busySave = useRef(false)
  const readLock = useRef(false)
  const authorizedRef = useRef(false)
  const privateEpoch = useRef(0)
  const generations = useRef(new Map<string, number>())
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const id = useId()
  const authorized = signedIn && mode !== "expired" && mode !== "denied"
  authorizedRef.current = authorized
  const snapshot = (): ReferenceDraft => ({
    owner,
    kind,
    brief,
    primary,
    files: files.map(({ url: _url, warning: _warning, ...f }) => f),
    version: (draft?.version || 0) + 1,
  })
  const currentSignature = referenceSignature({ kind, brief, primary, files })
  const savedSignature = useRef(
    initial
      ? referenceSignature(initial)
      : referenceSignature({
          kind: live ? "idea" : "image",
          brief: "",
          primary: "",
          files: [],
        }),
  )
  const dirty = currentSignature !== savedSignature.current
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const uploading = files.some(
    (f) => f.status === "uploading" || f.status === "checking",
  )
  const frozen = !authorized || saveStatus === "saving" || mode === "loading"
  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      fn()
    }, ms)
    timers.current.add(timer)
    return timer
  }
  const revoke = (url: string) => {
    URL.revokeObjectURL(url)
    ownedUrls.current.delete(url)
  }
  const clearPrivate = () => {
    privateEpoch.current++
    for (const url of ownedUrls.current) URL.revokeObjectURL(url)
    ownedUrls.current.clear()
    for (const timer of timers.current) clearTimeout(timer)
    timers.current.clear()
    generations.current.clear()
    readLock.current = false
    busySave.current = false
    setFiles([])
    setBrief("")
    setPrimary("")
    setKind(live ? "idea" : "image")
    setPreview(null)
    setLeaving(false)
    leaveAction.current = null
    setFileError("")
    setBriefError("")
    setSaveError("")
    setSaveStatus("idle")
    savedSignature.current = referenceSignature({
      kind: live ? "idea" : "image",
      brief: "",
      primary: "",
      files: [],
    })
    dirtyRef.current = false
  }
  useEffect(() => {
    if (!authorized) {
      clearPrivate()
      onSave(null)
    }
  }, [authorized])
  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer)
      for (const url of ownedUrls.current) URL.revokeObjectURL(url)
    },
    [],
  )
  useEffect(() => {
    const guard: ReferenceNavigationGuard = (proceed) => {
      if (!dirtyRef.current || !authorizedRef.current) {
        proceed()
        return true
      }
      leaveAction.current = proceed
      leaveTrigger.current = (document.activeElement as HTMLElement)
      setLeaving(true)
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
    if (preview && authorized) previewDialog.current?.showModal()
    else {
      previewDialog.current?.close()
      previewTrigger.current?.focus()
    }
  }, [preview, authorized])
  useEffect(() => {
    if (leaving && authorized) leaveDialog.current?.showModal()
    else {
      leaveDialog.current?.close()
      leaveTrigger.current?.focus()
    }
  }, [leaving, authorized])
  const changed = () => {
    setSaveStatus("idle")
    setSaveError("")
  }
  const pickFiles = async (incoming: File[]) => {
    if (!authorizedRef.current || frozen || readLock.current) return
    readLock.current = true
    setFileError("")
    const epoch = privateEpoch.current
    const existing = files
    const replacement = replaceId.current
    replaceId.current = null
    const fresh: LocalReference[] = []
    for (const file of incoming) {
      if (!authorizedRef.current || epoch !== privateEpoch.current) break
      const error = referenceFileError(file)
      if (error) {
        setFileError(
          error === "type"
            ? t(
                "این نوع فایل پشتیبانی نمی‌شود.",
                "This file type is not supported.",
              )
            : t(
                "حجم فایل از حد مجاز بیشتر است.",
                "The file exceeds the allowed size.",
              ),
        )
        continue
      }
      if (
        existing
          .concat(fresh)
          .some((f) => f.id !== replacement && sameReferenceFile(f.file, file))
      ) {
        setFileError(
          t(
            "این فایل قبلاً انتخاب شده است؛ نسخه تکراری اضافه نشد.",
            "This file is already selected; no duplicate was added.",
          ),
        )
        continue
      }
      if (
        existing.length - (replacement ? 1 : 0) + fresh.length >=
        config.maxFiles
      ) {
        setFileError(
          t(
            "تعداد تصویر از حد تنظیمات Demo بیشتر است.",
            "The image count exceeds the Demo configuration limit.",
          ),
        )
        break
      }
      const url = URL.createObjectURL(file)
      try {
        await new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => reject()
          img.src = url
        })
        if (!authorizedRef.current || epoch !== privateEpoch.current) {
          URL.revokeObjectURL(url)
          break
        }
        ownedUrls.current.add(url)
        fresh.push({ id: crypto.randomUUID(), file, url, status: "ready" })
        if (replacement) break
      } catch {
        URL.revokeObjectURL(url)
        setFileError(
          t(
            "فایل قابل خواندن نیست. تصویر دیگری انتخاب کنید.",
            "The file could not be read. Choose another image.",
          ),
        )
      }
    }
    if (epoch === privateEpoch.current) readLock.current = false
    if (
      fresh.length &&
      authorizedRef.current &&
      epoch === privateEpoch.current
    ) {
      if (replacement) {
        const old = existing.find((f) => f.id === replacement)
        if (old) {
          generations.current.set(old.id, -1)
          revoke(old.url)
        }
      }
      setFiles((old) => old.filter((f) => f.id !== replacement).concat(fresh))
      setPrimary((old) => (!old || old === replacement ? fresh[0].id : old))
      changed()
    }
  }
  const upload = (file: LocalReference) => {
    if (
      !authorizedRef.current ||
      busySave.current ||
      ["uploading", "checking", "accepted"].includes(file.status)
    )
      return
    const generation = (generations.current.get(file.id) || 0) + 1
    generations.current.set(file.id, generation)
    const active = () =>
      authorizedRef.current && generations.current.get(file.id) === generation
    changed()
    setFiles((old) =>
      old.map((f) =>
        f.id === file.id
          ? { ...f, status: "uploading", receipt: undefined }
          : f,
      ),
    )
    later(() => {
      if (!active()) return
      if (mode === "upload-error" || mode === "offline") {
        setFiles((old) =>
          old.map((f) => (f.id === file.id ? { ...f, status: "failed" } : f)),
        )
        return
      }
      setFiles((old) =>
        old.map((f) => (f.id === file.id ? { ...f, status: "checking" } : f)),
      )
      later(() => {
        if (!active()) return
        setFiles((old) =>
          old.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "accepted",
                  receipt: `demo-local-${file.id}`,
                  warning: mode === "low-quality",
                }
              : f,
          ),
        )
      }, 550)
    }, 700)
  }
  const cancel = (file: LocalReference) => {
    generations.current.set(
      file.id,
      (generations.current.get(file.id) || 0) + 1,
    )
    setFiles((old) =>
      old.map((f) =>
        f.id === file.id ? { ...f, status: "ready", receipt: undefined } : f,
      ),
    )
    changed()
  }
  const remove = (file: LocalReference) => {
    generations.current.set(
      file.id,
      (generations.current.get(file.id) || 0) + 1,
    )
    revoke(file.url)
    setFiles((old) => old.filter((f) => f.id !== file.id))
    if (primary === file.id) setPrimary("")
    setFileError("")
    changed()
  }
  const validate = () => {
    const errors = referenceErrors({ kind, brief, primary, files }, config.maxText)
    setBriefError(
      errors.brief === "required"
        ? t("توضیح ایده را وارد کنید.", "Describe your idea.")
        : errors.brief
          ? t(
              "طول توضیح از حد تنظیمات Demo بیشتر است.",
              "The brief exceeds the Demo text limit.",
            )
          : "",
    )
    setFileError(
      errors.files === "required"
        ? t("تصویر مرجع را اضافه کنید.", "Add a reference image.")
        : errors.files === "primary"
          ? t("مرجع اصلی را انتخاب کنید.", "Choose a primary reference.")
          : errors.files
            ? t(
                "آپلود و بررسی تمام تصاویر را تکمیل کنید.",
                "Complete uploading and checking all images.",
              )
            : "",
    )
    if (errors.files) uploadRegion.current?.focus()
    else if (errors.brief) textInput.current?.focus()
    return !Object.keys(errors).length
  }
  const save = (continueNext = false, exit = false) => {
    if (!authorizedRef.current || busySave.current) return
    if (uploading) {
      setSaveError(
        t(
          "ابتدا آپلود و بررسی تصویر را تمام کنید یا لغو کنید.",
          "Finish or cancel the image upload and check first.",
        ),
      )
      return
    }
    if (continueNext && !validate()) return
    busySave.current = true
    setSaveStatus("saving")
    setSaveError("")
    const data = snapshot()
    const signature = currentSignature
    if (live) {
      busySave.current = false; onSave(data); savedSignature.current = signature; dirtyRef.current = false; setSaveStatus("saved");
      if (continueNext) { registerGuard(null); onNavigate(t("ترجیحات", "Preferences"), `${prefix}/commissions/new/preferences`) }
      if (exit) { const action = leaveAction.current; leaveAction.current = null; setLeaving(false); action?.() }
      return
    }
    later(() => {
      busySave.current = false
      if (!authorizedRef.current) return
      if (mode === "save-error" || mode === "offline" || mode === "conflict") {
        setSaveStatus("failed")
        setSaveError(
          mode === "conflict"
            ? t(
                "تعارض پیش‌نویس — Demo. نسخه جدیدتر باید بررسی شود؛ متن شما حفظ شده و هیچ نسخه‌ای بازنویسی نشده است.",
                "Draft conflict — Demo. A newer version needs review; your text is retained and no version was overwritten.",
              )
            : t(
                "ذخیره ممکن نشد. متن و وضعیت فایل‌ها در این صفحه حفظ شده‌اند.",
                "Unable to save. Your text and file states are retained on this page.",
              ),
        )
        return
      }
      onSave(data)
      savedSignature.current = signature
      dirtyRef.current = false
      setSaveStatus("saved")
      if (continueNext)
        onNavigate(
          t("سبک، سایز و نوع اجرا", "Style, size and execution"),
          `${prefix}/commissions/new/preferences`,
        )
      if (exit) {
        const action = leaveAction.current
        leaveAction.current = null
        setLeaving(false)
        action?.()
      }
    }, 650)
  }
  const navigate = (label: string, route: string) => onNavigate(label, route)
  const leaveWithoutSaving = () => {
    const action = leaveAction.current
    clearPrivate()
    if (authorizedRef.current && draft?.owner === owner) {
      setKind(draft.kind)
      setBrief(draft.brief)
      setPrimary(draft.primary)
      setFiles(
        draft.files.map((file) => {
          const url = URL.createObjectURL(file.file)
          ownedUrls.current.add(url)
          return { ...file, url }
        }),
      )
      savedSignature.current = referenceSignature(draft)
      setSaveStatus("saved")
    }
    setLeaving(false)
    action?.()
  }
  const stay = () => {
    leaveAction.current = null
    setLeaving(false)
  }
  const modeChange = (next: ReferenceMode) => {
    setMode(next)
    setSaveError("")
    setFileError("")
    setBriefError("")
  }
  const fileStatus = (file: LocalReference) =>
    file.status === "ready"
      ? t("آماده آپلود", "Ready to upload")
      : file.status === "uploading"
        ? t("در حال آپلود", "Uploading")
        : file.status === "checking"
          ? t("در حال بررسی فایل", "Checking file")
          : file.status === "accepted"
            ? t("آپلود شد — Demo، فقط محلی", "Uploaded — Demo, local only")
            : t("آپلود ناموفق — Demo", "Upload failed — Demo")
  const policyLink = (
    <a
      href="/privacy"
      onClick={(e) => {
        e.preventDefault()
        navigate(t("حریم خصوصی", "Privacy policy"), "/privacy")
      }}
    >
      {t("حریم خصوصی", "Privacy policy")}
      <RefIcon name="arrow" size={16} />
    </a>
  )
  const previews = (
    <details className="references-demo-controls">
      <summary>
        {t("حالت‌های پروتوتایپ", "Prototype states")} · PAINT-04 / Demo
      </summary>
      <div>
        <label>
          {t("وضعیت صفحه", "Page state")}
          <SelectDropdown
            value={mode}
            onChange={(e) => modeChange(e.target.value as ReferenceMode)}
          >
            {referenceModes.map(([v, fa, en]) => (
              <option key={v} value={v}>
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
          {t(
            "ورود نمونه (بدون احراز هویت واقعی)",
            "Demo sign-in (not real authentication)",
          )}
        </label>
      </div>
      <p>
        {t(
          "خطاها و هشدار کیفیت شبیه‌سازی‌شده‌اند؛ هیچ تشخیص AI یا درخواست شبکه‌ای روی تصویر انجام نمی‌شود.",
          "Failures and quality warnings are simulated; no AI analysis or network request is performed on the image.",
        )}
      </p>
    </details>
  )
  const activePreview = authorized
    ? files.find((f) => f.id === preview)
    : undefined
  const savedText =
    saveStatus === "saving"
      ? t("در حال ذخیره… — Demo", "Saving… — Demo")
      : saveStatus === "failed"
        ? t("ذخیره ممکن نشد — Demo", "Unable to save — Demo")
        : dirty
          ? t("تغییرات ذخیره نشده‌اند", "Changes have not been saved")
          : saveStatus === "saved" || initial
            ? t(
                "ذخیره شد — فقط حافظه نشست Demo",
                live ? "Kept in this session only" : "Saved — Demo session memory only",
              )
            : t(
                "هنوز اطلاعاتی ذخیره نشده است",
                "No information has been saved yet",
              )
  return (
    <div className="container references-page">
      <nav className="ref-breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            navigate(t("خانه", "Home"), "/")
          }}
        >
          {t("خانه", "Home")}
        </a>
        <span>/</span>
        <a
          href={`${prefix}/commissions`}
          onClick={(e) => {
            e.preventDefault()
            navigate(t("سفارش نقاشی", "Commission"), `${prefix}/commissions`)
          }}
        >
          {t("سفارش نقاشی", "Commission")}
        </a>
        <span>/</span>
        <span>{t("تصویر و توضیحات", "References and brief")}</span>
      </nav>
      <div className="ref-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-line" />
            YOUR IDEA, FIRST
          </div>
          <h1>
            {t("تصویر و ایده‌تان را معرفی کنید", "Share your image and idea")}
          </h1>
          <p>
            {t(
              "تصویر مرجع و نکات مهم را ثبت کنید. در مرحله بعد، سبک، سایز و نوع اجرا را انتخاب می‌کنید.",
              "Add your reference and key details. Next, choose the style, size and execution type.",
            )}
          </p>
        </div>
        <span className="ref-step-label">
          {t("مرحله", "Step")} {num(1)} {t("از", "of")} {num(4)}
        </span>
      </div>
      <ol
        className="ref-stepper"
        aria-label={t("مراحل درخواست", "Request steps")}
      >
        {[
          t("تصویر و توضیحات", "References and brief"),
          t("سبک و اجرا", "Style and execution"),
          t("ارزیابی", "Assessment"),
          t("پیشنهاد و تأیید", "Proposal and approval"),
        ].map((label, i) => (
          <li key={i} aria-current={i === 0 ? "step" : undefined}>
            <span>{num(i + 1)}</span>
            <div>
              <small>
                {t("مرحله", "Step")} {num(i + 1)}
              </small>
              {label}
            </div>
          </li>
        ))}
      </ol>
      <div className="ref-demo-banner">
        <span>{live ? t("توضیحات متنی", "Text brief") : "DEMO"}</span>
        <p>
          {live ? t("فعلاً فقط ایده متنی پذیرفته می‌شود؛ آپلود تصویر در دسترس نیست. تا ثبت نهایی، متن فقط در حافظه این نشست است و با خروج یا بازخوانی پاک می‌شود.", "Only text briefs are supported; image upload is unavailable. Until final submission, your brief stays in session memory and clears on sign-out or reload.") : t(
            "آپلود و ذخیره شبیه‌سازی می‌شوند؛ فایل به هیچ سروری ارسال نمی‌شود. داده فقط در حافظه نشست نمونه است و با خروج، انقضای نشست یا بازخوانی صفحه از بین می‌رود.",
            "Upload and save are simulated; no file is sent to a server. Data is only in demo session memory and is lost on sign-out, session expiry or page reload.",
          )}
        </p>
        {!live && <label>
          <input
            type="checkbox"
            checked={signedIn}
            onChange={(e) => onDemoSignIn(e.target.checked)}
          />
          {t("ورود نمونه", "Demo sign-in")}
        </label>}
      </div>
      {!authorized && (
        <section className="ref-auth-notice">
          <RefIcon name="lock" size={26} />
          <div>
            <h2>
              {mode === "denied"
                ? t(
                    "دسترسی به این درخواست مجاز نیست.",
                    "You do not have access to this request.",
                  )
                : mode === "expired"
                  ? t(
                      "برای ادامه، دوباره وارد شوید.",
                      "Sign in again to continue.",
                    )
                  : t(
                      "پیش از انتخاب تصویر، وارد شوید.",
                      "Sign in before selecting an image.",
                    )}
            </h2>
            <p>
              {t(
                "شناسه یا لینک درخواست مجوز دسترسی نیست. در این نمونه، فایل و متن خصوصی بدون ورود دریافت یا نمایش داده نمی‌شوند.",
                "A request id or link is not authorization. In this demo, private files and text are not collected or shown without sign-in.",
              )}
            </p>
            <div>
              <a
                className="button secondary"
                href={`/login?returnTo=${encodeURIComponent(`${prefix}/commissions/new/references`)}`}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(
                    t("ورود و ادامه", "Sign in and continue"),
                    `/login?returnTo=${encodeURIComponent(`${prefix}/commissions/new/references`)}`,
                  )
                }}
              >
                {t("ورود و ادامه", "Sign in and continue")}
                <RefIcon name="arrow" size={18} />
              </a>
              {mode === "denied" && (
                <a
                  href={`${prefix}/commissions`}
                  className="text-link"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(
                      t("بازگشت به شروع", "Back to introduction"),
                      `${prefix}/commissions`,
                    )
                  }}
                >
                  {t("بازگشت به شروع", "Back to introduction")}
                </a>
              )}
            </div>
          </div>
        </section>
      )}
      {mode === "loading" && authorized ? (
        <div
          className="ref-loading"
          role="status"
          aria-label={t("در حال دریافت پیش‌نویس", "Loading draft")}
        >
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : (
        <div className="ref-layout">
          <div className="ref-form-column">
            <section className="ref-section ref-input-section">
              <div className="ref-section-title">
                <span>01</span>
                <div>
                  <h2>{t("از کجا شروع می‌کنیم؟", "Where shall we start?")}</h2>
                  <p>
                    {t(
                      "نوع ورودی را انتخاب کنید؛ تصویرها و متن با تغییر انتخاب پاک نمی‌شوند.",
                      "Choose an input type; switching will not delete your images or text.",
                    )}
                  </p>
                </div>
              </div>
              <fieldset className="ref-input-types" disabled={frozen}>
                <legend className="sr-only">
                  {t("نوع ورودی سفارش — Demo", "Request input type — Demo")}
                </legend>
                {(["image", "idea"] as const).map((v) => (
                  <label key={v} className={kind === v ? "selected" : ""}>
                    <input
                      type="radio"
                      name="ref-kind"
                      disabled={live && v === "image"}
                      checked={kind === v}
                      onChange={() => {
                        setKind(v)
                        setFileError("")
                        setBriefError("")
                        changed()
                      }}
                    />
                    <RefIcon
                      name={v === "image" ? "image" : "text"}
                      size={24}
                    />
                    <span>
                      {v === "image"
                        ? t("بر اساس تصویر", "From a reference image")
                        : t("بر اساس ایده و توضیح", "From an idea and brief")}
                      <small>
                        {v === "image"
                          ? t(
                              "تصویر و توضیح ضروری است · Demo",
                              "Image and brief required · Demo",
                            )
                          : t(
                              "توضیح ضروری؛ تصویر اختیاری · Demo",
                              "Brief required; image optional · Demo",
                            )}
                      </small>
                    </span>
                  </label>
                ))}
              </fieldset>
            </section>
            <section className="ref-section">
              <div className="ref-section-title">
                <span>02</span>
                <div>
                  <h2>
                    {t("تصویر مرجع", "Reference image")}{" "}
                    <small>
                      {kind === "idea"
                        ? t("اختیاری", "Optional")
                        : t("ضروری", "Required")}
                    </small>
                  </h2>
                  <p>
                    {t(
                      "تصویرها برای همین درخواست استفاده می‌شوند؛ در مسیر ایده، تصویر اختیاری است.",
                      "Images belong to this request; for an idea-based request, images are optional.",
                    )}
                  </p>
                </div>
              </div>
              <p className="ref-limits">
                {t(
                  "تنظیمات نمونه، نه محدودیت سرویس واقعی:",
                  "Demo configuration, not live service limits:",
                )}{" "}
                <bdi>JPG, PNG, WEBP</bdi> · {t("هر تصویر تا", "Up to")}{" "}
                {num(config.maxBytes / 1024 / 1024)} MB ·{" "}
                {t("حداکثر", "Maximum")} {num(config.maxFiles)}{" "}
                {t("تصویر", "images")}
              </p>
              <div
                ref={uploadRegion}
                tabIndex={-1}
                className={`ref-upload-zone ${dragging ? "dragging" : ""} ${
                  !authorized ? "locked" : ""
                }`}
                aria-describedby={fileError ? `${id}-file-error` : undefined}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (!frozen) setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  if (!frozen) {
                    replaceId.current = null
                    void pickFiles(Array.from(e.dataTransfer.files))
                  }
                }}
              >
                <div className="ref-upload-symbol">
                  <RefIcon name="upload" size={30} />
                </div>
                <h3>
                  {t(
                    "تصویر را انتخاب کنید یا اینجا رها کنید.",
                    "Choose an image or drop it here.",
                  )}
                </h3>
                <p>
                  {t(
                    "یک تصویر روشن، اولین قدم برای معرفی ایده شماست.",
                    "A clear image is the first step in sharing your idea.",
                  )}
                </p>
                <input
                  ref={fileInput}
                  className="sr-only"
                  tabIndex={-1}
                  type="file"
                  accept={config.mimeTypes.join(",")}
                  multiple
                  disabled={frozen}
                  aria-label={t("انتخاب تصویر مرجع", "Choose reference images")}
                  onChange={(e) => {
                    void pickFiles(Array.from(e.target.files || []))
                    e.target.value = ""
                  }}
                />
                <button
                  type="button"
                  className="button secondary"
                  disabled={frozen || files.length >= config.maxFiles}
                  onClick={() => {
                    replaceId.current = null
                    fileInput.current?.click()
                  }}
                >
                  {t("انتخاب تصویر", "Choose image")}
                  <RefIcon name="image" size={18} />
                </button>
                <small>
                  {t(
                    "انتخاب و پیش‌نمایش محلی، هنوز آپلود تأییدشده نیست.",
                    "Local selection and preview are not an accepted upload.",
                  )}
                </small>
              </div>
              {authorized && fileError && (
                <p
                  id={`${id}-file-error`}
                  className="ref-field-error"
                  role="alert"
                >
                  {fileError}
                </p>
              )}
              {authorized && files.length > 0 && (
                <div className="ref-file-list">
                  {files.map((file, i) => (
                    <article className="ref-file-card" key={file.id}>
                      <button
                        className="ref-file-preview"
                        onClick={(e) => {
                          previewTrigger.current = e.currentTarget
                          setPreview(file.id)
                        }}
                        aria-label={t(
                          "نمایش بزرگ تصویر مرجع",
                          "View reference image larger",
                        )}
                      >
                        <img
                          src={file.url}
                          alt={t(
                            "پیش‌نمایش تصویر مرجع",
                            "Reference image preview",
                          )}
                        />
                      </button>
                      <div className="ref-file-details">
                        <h3 dir="auto">{file.file.name}</h3>
                        <p>
                          <bdi>{num(Math.round(file.file.size / 1024))} KB</bdi>{" "}
                          ·{" "}
                          {primary === file.id
                            ? t("مرجع اصلی", "Primary reference")
                            : t("مرجع تکمیلی", "Additional reference")}
                        </p>
                        <span
                          className={`ref-file-status ${file.status}`}
                          role="status"
                        >
                          {["uploading", "checking"].includes(file.status) && (
                            <span className="ref-spinner" />
                          )}
                          {file.status === "accepted" && (
                            <RefIcon name="check" size={14} />
                          )}{" "}
                          {fileStatus(file)}
                          {file.status === "uploading" ||
                          file.status === "checking"
                            ? " · Demo"
                            : ""}
                        </span>
                        <div className="ref-file-actions">
                          {["ready", "failed"].includes(file.status) && (
                            <button
                              disabled={frozen}
                              onClick={() => upload(file)}
                            >
                              {file.status === "failed"
                                ? t("تلاش دوباره", "Retry")
                                : t("آپلود نمونه", "Demo upload")}
                            </button>
                          )}
                          {["uploading", "checking"].includes(file.status) && (
                            <button
                              disabled={frozen}
                              onClick={() => cancel(file)}
                            >
                              {t("لغو آپلود", "Cancel upload")}
                            </button>
                          )}
                          <button
                            disabled={frozen}
                            onClick={() => {
                              replaceId.current = file.id
                              fileInput.current?.click()
                            }}
                          >
                            {t("جایگزینی", "Replace")}
                          </button>
                          <button
                            disabled={frozen}
                            aria-label={`${t("حذف تصویر", "Remove image")} ${file.file.name}`}
                            onClick={() => remove(file)}
                          >
                            <RefIcon name="trash" size={14} />
                            {t("حذف", "Remove")}
                          </button>
                        </div>
                      </div>
                      <div className="ref-file-order">
                        <button
                          disabled={frozen || primary === file.id}
                          className={primary === file.id ? "is-primary" : ""}
                          onClick={() => {
                            setPrimary(file.id)
                            setFileError("")
                            changed()
                          }}
                        >
                          {primary === file.id
                            ? t("مرجع اصلی", "Primary reference")
                            : t(
                                "انتخاب به‌عنوان مرجع اصلی",
                                "Set as primary reference",
                              )}
                        </button>
                        <div>
                          <button
                            disabled={frozen || i === 0}
                            aria-label={t(
                              "انتقال تصویر به قبل",
                              "Move image earlier",
                            )}
                            onClick={() => {
                              setFiles((old) => {
                                const next = [...old]
                                ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                                return next
                              })
                              changed()
                            }}
                          >
                            ↑
                          </button>
                          <button
                            disabled={frozen || i === files.length - 1}
                            aria-label={t(
                              "انتقال تصویر به بعد",
                              "Move image later",
                            )}
                            onClick={() => {
                              setFiles((old) => {
                                const next = [...old]
                                ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                                return next
                              })
                              changed()
                            }}
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                      {file.warning && (
                        <p className="ref-file-warning">
                          {t(
                            "هشدار نمایشی کیفیت؛ تشخیص واقعی انجام نشده است. در این نمونه می‌توانید تصویر را جایگزین کنید یا ادامه دهید.",
                            "Simulated quality warning; no actual quality detection occurred. You may replace the image or continue in this demo.",
                          )}
                        </p>
                      )}
                    </article>
                  ))}
                  {files.some(
                    (f) => f.status === "ready" || f.status === "failed",
                  ) && (
                    <button
                      className="text-link ref-upload-all"
                      disabled={frozen}
                      onClick={() => files.forEach(upload)}
                    >
                      <RefIcon name="upload" size={18} />
                      {t(
                        "آپلود تصاویر آماده — Demo",
                        "Upload ready images — Demo",
                      )}
                    </button>
                  )}
                  <p className="ref-file-explanation">
                    {t(
                      "با حذف مرجع اصلی، باید جایگزین آن را انتخاب کنید. تصاویر تکمیلی خودکار ادغام نمی‌شوند؛ ارتباطشان را در توضیح مشخص کنید. حذف اینجا فقط نسخه محلی نمونه را حذف می‌کند.",
                      "After removing the primary reference, select a replacement. Additional images are not automatically combined; explain their relationship in your brief. Removal here deletes only the local demo copy.",
                    )}
                  </p>
                </div>
              )}
              <div className="ref-inline-privacy">
                <RefIcon name="lock" size={16} />
                <p>
                  {t(
                    "پیش‌نمایش‌ها خصوصی و محلی‌اند و لینک عمومی ندارند. سیاست واقعی پردازش هنوز متصل نیست؛ قبل از آپلود واقعی، آن را بررسی کنید.",
                    "Previews are private and local, with no public link. A live processing policy is not connected; review it before any real upload.",
                  )}
                </p>
              </div>
            </section>
            <section className="ref-section">
              <div className="ref-section-title">
                <span>03</span>
                <div>
                  <h2>
                    {t("از ایده‌تان برای ما بگویید", "Tell us about your idea")}
                  </h2>
                  <p>
                    {t(
                      "موضوع، تغییرات دلخواه و جزئیاتی که برایتان مهم‌اند.",
                      "The subject, your desired changes, and details that matter to you.",
                    )}
                  </p>
                </div>
              </div>
              <label className="ref-text-label" htmlFor={`${id}-brief`}>
                {t("ایده و توضیحات شما", "Your idea and brief")}{" "}
                <span>{t("ضروری", "Required")}</span>
              </label>
              <textarea
                id={`${id}-brief`}
                maxLength={config.maxText}
                ref={textInput}
                value={authorized ? brief : ""}
                disabled={frozen}
                aria-invalid={Boolean(briefError)}
                aria-describedby={`${id}-brief-help${
                  briefError ? ` ${id}-brief-error` : ""
                }`}
                placeholder={t(
                  "چه چیزی می‌خواهید نقاشی شود؟ موضوع، تغییرات موردنظر و نکات مهم را توضیح دهید.",
                  "What would you like painted? Describe the subject, desired changes and important details.",
                )}
                onChange={(e) => {
                  setBrief(e.target.value)
                  setBriefError("")
                  changed()
                }}
              />
              <div id={`${id}-brief-help`} className="ref-text-help">
                <span>
                  {t(
                    "چه چیزی حفظ شود؟ چه تغییری می‌خواهید؟ تصاویر چه ارتباطی دارند؟",
                    "What should stay? What should change? How do the images relate?",
                  )}
                </span>
                <bdi>
                  {num(authorized ? brief.length : 0)} / {num(config.maxText)} ·
                  Demo
                </bdi>
              </div>
              {authorized && briefError && (
                <p
                  id={`${id}-brief-error`}
                  className="ref-field-error"
                  role="alert"
                >
                  {briefError}
                </p>
              )}
              <div className="ref-example">
                <span>{t("نمونه توضیح", "Example brief")}</span>
                <p>
                  {t(
                    "موضوع اصلی تصویر حفظ شود، پس‌زمینه ساده‌تر باشد و رنگ‌ها حال‌وهوای گرم داشته باشند. درباره سبک در مرحله بعد انتخاب می‌کنم.",
                    "Keep the main subject, simplify the background and use a warm mood. I will choose the style in the next step.",
                  )}
                </p>
                <small>
                  {t(
                    "این نمونه راهنماست و در متن شما ثبت نمی‌شود.",
                    "This example is guidance only; it is not inserted into your brief.",
                  )}
                </small>
              </div>
            </section>
            <div className="ref-save-panel">
              <div className="ref-save-state" role="status">
                <span
                  className={saveStatus === "saved" && !dirty ? "saved" : ""}
                >
                  {saveStatus === "saving" ? (
                    <span className="ref-spinner" />
                  ) : (
                    <RefIcon
                      name={saveStatus === "saved" && !dirty ? "check" : "text"}
                      size={18}
                    />
                  )}{" "}
                  {authorized
                    ? savedText
                    : t(
                        "برای ذخیره، ورود لازم است.",
                        "Sign-in is required to save.",
                      )}
                </span>
                <small>
                  {t(
                    "ذخیره متن از وضعیت آپلود فایل‌ها مستقل است.",
                    "Saving text is separate from image upload status.",
                  )}
                </small>
              </div>
              <button
                className="ref-save-button"
                disabled={frozen || uploading}
                onClick={() => save()}
              >
                {live ? t("نگه‌داشتن توضیحات در این نشست", "Keep brief in this session") : t("ذخیره پیش‌نویس — Demo", "Save draft — Demo")}
              </button>
            </div>
            {authorized && saveError && (
              <div className="ref-save-error" role="alert">
                <p>{saveError}</p>
                {mode !== "conflict" && (
                  <button
                    disabled={frozen}
                    className="text-link"
                    onClick={() => save()}
                  >
                    {t("تلاش دوباره", "Retry")}
                  </button>
                )}
              </div>
            )}
            <div className="ref-bottom-actions">
              <button
                className="button secondary"
                onClick={() =>
                  navigate(
                    t("شروع سفارش نقاشی", "Commission introduction"),
                    `${prefix}/commissions`,
                  )
                }
              >
                <span className="ref-back-arrow">
                  <RefIcon name="arrow" size={18} />
                </span>
                {t("بازگشت", "Back")}
              </button>
              <button
                className="button primary"
                disabled={frozen || uploading}
                onClick={() => save(true)}
              >
                {saveStatus === "saving"
                  ? t("در حال ذخیره…", "Saving…")
                  : t("ادامه: سبک و نوع اجرا", "Continue: style and execution")}
                <RefIcon name="arrow" size={18} />
              </button>
            </div>
            <p className="ref-next-note">
              {uploading
                ? t(
                    "برای ادامه، منتظر تکمیل آپلود و بررسی نمونه بمانید.",
                    "Wait for the demo upload and check to finish before continuing.",
                  )
                : t(
                    "ادامه پس از اعتبارسنجی و تأیید ذخیره نمونه انجام می‌شود؛ سفارش هنوز ثبت نشده است.",
                    "Continue follows validation and confirmed demo save; no order has been placed.",
                  )}
            </p>
          </div>
          <aside className="ref-guide">
            <section>
              <span className="ref-guide-icon">
                <RefIcon name="image" size={26} />
              </span>
              <h2>
                {t(
                  "چه تصویری کمک‌کننده‌تر است؟",
                  "What makes a useful reference?",
                )}
              </h2>
              <ul>
                {[
                  t("موضوع اصلی واضح باشد.", "Make the main subject clear."),
                  t(
                    "جزئیات مهم قابل مشاهده باشند.",
                    "Keep important details visible.",
                  ),
                  t(
                    "نور و وضوح مناسب به بررسی کمک می‌کنند.",
                    "Good lighting and clarity help assessment.",
                  ),
                  t(
                    "بخش‌های قابل حفظ یا تغییر را مشخص کنید.",
                    "Identify what should stay or change.",
                  ),
                  t(
                    "اطلاعات حساس غیرضروری ارسال نکنید.",
                    "Avoid unnecessary sensitive information.",
                  ),
                ].map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
              <p>
                {t(
                  "کیفیت تصویر می‌تواند بر امکان بررسی و اجرای درخواست اثر بگذارد.",
                  "Image quality may affect how the request can be assessed and created.",
                )}
              </p>
            </section>
            <section className="ref-privacy-guide">
              <RefIcon name="lock" size={24} />
              <h2>{t("ایده شما، با حریم شما", "Your idea, your privacy")}</h2>
              <p>
                {t(
                  "در مسیر واقعی، تصاویر و توضیحات برای بررسی و اجرای درخواست استفاده می‌شوند؛ متن نهایی باید با سیاست تأییدشده محصول تطبیق داده شود.",
                  "In the intended live flow, images and descriptions are used to assess and fulfil the request; final wording must match an approved product policy.",
                )}
              </p>
              <p>
                {t(
                  "ارسال تصویر، رضایت انتشار عمومی، تبلیغات یا آموزش مدل نیست. رضایت نمونه‌کار باید جداگانه دریافت شود.",
                  "Submitting an image is not consent for publication, advertising or model training. Portfolio permission must be obtained separately.",
                )}
              </p>
              {policyLink}
            </section>
            <div className="ref-not-order">
              <RefIcon name="text" size={20} />
              <p>
                {t(
                  "این فقط معرفی ایده شماست؛ نه پذیرش سفارش، تأیید قیمت یا آغاز اجرا.",
                  "This is only introducing your idea, not order acceptance, price approval or the start of production.",
                )}
              </p>
            </div>
          </aside>
        </div>
      )}
      {!live && previews}
      <dialog
        ref={previewDialog}
        className="ref-preview-dialog"
        aria-labelledby={`${id}-preview-title`}
        onCancel={() => setPreview(null)}
      >
        <div className="ref-dialog-heading">
          <div>
            <h2 id={`${id}-preview-title`}>
              {t("پیش‌نمایش تصویر مرجع", "Reference image preview")}
            </h2>
            <small>
              {t("فقط محلی و خصوصی · Demo", "Local and private only · Demo")}
            </small>
          </div>
          <button
            className="icon-button"
            onClick={() => setPreview(null)}
            aria-label={t("بستن", "Close")}
          >
            <RefIcon name="close" />
          </button>
        </div>
        {activePreview && (
          <img
            src={activePreview.url}
            alt={t("پیش‌نمایش تصویر مرجع", "Reference image preview")}
          />
        )}
      </dialog>
      <dialog
        ref={leaveDialog}
        className="ref-leave-dialog"
        aria-labelledby={`${id}-leave-title`}
        onCancel={stay}
      >
        <div className="ref-dialog-heading">
          <h2 id={`${id}-leave-title`}>
            {t("تغییرات ذخیره نشده‌اند", "Changes have not been saved")}
          </h2>
          <button
            className="icon-button"
            onClick={stay}
            aria-label={t("بستن", "Close")}
          >
            <RefIcon name="close" />
          </button>
        </div>
        <p>
          {t(
            "خروج بدون ذخیره، تغییرات ذخیره‌نشده را کنار می‌گذارد. نسخه قبلیِ ذخیره‌شده نمونه، در صورت وجود، فقط در حافظه همین نشست باقی می‌ماند.",
            "Leaving without saving discards unsaved changes. Any previously saved demo version remains only in this session's memory.",
          )}
        </p>
        <small>
          {t(
            "ذخیره فقط در حافظه نشست Demo است و با بازخوانی صفحه بازیابی نمی‌شود.",
            "Save is only in Demo session memory; it is not recoverable after a page reload.",
          )}
        </small>
        <div>
          <button className="button primary" onClick={stay}>
            {t("ماندن در صفحه", "Stay")}
          </button>
          <button
            className="button secondary"
            disabled={saveStatus === "saving" || uploading}
            onClick={() => save(false, true)}
          >
            {t("ذخیره و خروج — Demo", "Save and leave — Demo")}
          </button>
          <button
            className="ref-discard"
            disabled={saveStatus === "saving"}
            onClick={leaveWithoutSaving}
          >
            {t("خروج بدون ذخیره", "Leave without saving")}
          </button>
        </div>
        {saveStatus === "saving" && (
          <p role="status">{t("در حال ذخیره… — Demo", "Saving… — Demo")}</p>
        )}
        {saveError && (
          <p className="ref-field-error" role="alert">
            {saveError}
          </p>
        )}
      </dialog>
    </div>
  )
}
