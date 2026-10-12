import { useEffect, useRef, type Dispatch, type SetStateAction } from "react"
import { Glyph } from "./DashboardPage"
import { acceptedSupportFile, supportPolicy } from "./support"
import type { ReplyFile } from "./support-conversation"

export type LocalReplyFile = ReplyFile & {
  file: File
  preview?: string
}
// The repo has no separate upload primitive; compose its existing support form styles and rules.
export default function ReplyAttachments({
  en,
  files,
  setFiles,
  error,
  setError,
  disabled,
}: {
  en: boolean
  files: LocalReplyFile[]
  setFiles: Dispatch<SetStateAction<LocalReplyFile[]>>
  error: boolean
  setError: (value: boolean) => void
  disabled: boolean
}) {
  const t = (fa: string, english: string) => (en ? english : fa)
  const urls = useRef(new Set<string>())
  useEffect(
    () => () => {
      urls.current.forEach(URL.revokeObjectURL)
      urls.current.clear()
    },
    [],
  )
  useEffect(() => {
    const retained = new Set(files.map((f) => f.preview).filter(Boolean))
    for (const url of urls.current)
      if (!retained.has(url)) {
        URL.revokeObjectURL(url)
        urls.current.delete(url)
      }
  }, [files])
  const changeState = (id: string, state: ReplyFile["state"]) => {
    setFiles((previous) =>
      previous.map((f) => (f.id === id ? { ...f, state } : f)),
    )
    setError(false)
  }
  return (
    <div className="reply-attachments">
      <label htmlFor="reply-files">
        <Glyph name="box" size={18} />
        {t("افزودن فایل", "Attach file")}{" "}
        <span>{t("(اختیاری)", "(optional)")}</span>
      </label>
      <p id="reply-file-rules">
        {t(
          "قواعد Demo: JPEG، PNG یا PDF · حداکثر ۳ فایل · هر فایل تا ۵ مگابایت. انتخاب محلی به معنی آپلود نیست.",
          "Demo rules: JPEG, PNG or PDF · Up to 3 files · 5 MB each. Local selection does not mean upload.",
        )}
      </p>
      <input
        id="reply-files"
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf"
        disabled={disabled}
        aria-invalid={error}
        aria-describedby={`reply-file-rules${error ? " reply-file-error" : ""}`}
        onChange={(e) => {
          const incoming = Array.from(e.target.files || [])
          if (
            incoming.length + files.length > supportPolicy.fileCount ||
            incoming.some((f) => !acceptedSupportFile(f))
          )
            setError(true)
          else {
            const selected = incoming.map((file) => {
              const preview = file.type.startsWith("image/")
                ? URL.createObjectURL(file)
                : undefined
              if (preview) urls.current.add(preview)
              return {
                id: crypto.randomUUID(),
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                state: "selected" as const,
                preview,
              }
            })
            setFiles((f) => [...f, ...selected])
            setError(false)
          }
          e.target.value = ""
        }}
      />
      {error && (
        <p id="reply-file-error" className="checkout-field-error" role="alert">
          {t(
            "این فایل قابل قبول نیست. فایل ناموفق را حذف یا دوباره بررسی کنید.",
            "This file is not accepted. Remove or retry the failed file.",
          )}
        </p>
      )}
      <div className="support-files">
        {files.map((f) => (
          <div key={f.id}>
            {f.preview && (
              <img
                className="reply-file-preview"
                src={f.preview}
                alt={t(
                  "پیش‌نمایش محلی؛ آپلود نشده",
                  "Local preview; not uploaded",
                )}
              />
            )}
            <div>
              <bdi>{f.name}</bdi>
              <small>
                {(f.size / 1024).toFixed(0)} KB ·{" "}
                {
                  {
                    selected: t("انتخاب‌شده", "Selected"),
                    uploading: t("در حال آپلود · Demo", "Uploading · Demo"),
                    checking: t("بررسی فایل · Demo", "Checking file · Demo"),
                    accepted: t("پذیرفته‌شده · Demo", "Accepted · Demo"),
                    failed: t("ناموفق · Demo", "Failed · Demo"),
                  }[f.state]
                }
              </small>
            </div>
            {["selected", "failed"].includes(f.state) && (
              <button
                type="button"
                className="button secondary"
                disabled={disabled}
                onClick={() => changeState(f.id, "uploading")}
              >
                {f.state === "failed"
                  ? t("تلاش مجدد · Demo", "Retry · Demo")
                  : t("آپلود نمونه", "Demo upload")}
              </button>
            )}
            {f.state === "uploading" && (
              <button
                type="button"
                className="button secondary"
                disabled={disabled}
                onClick={() => changeState(f.id, "checking")}
              >
                {t("ادامه بررسی · Demo", "Continue check · Demo")}
              </button>
            )}
            {f.state === "checking" && (
              <>
                <button
                  type="button"
                  className="button secondary"
                  disabled={disabled}
                  onClick={() => changeState(f.id, "accepted")}
                >
                  {t("پاسخ پذیرش · Demo", "Accept · Demo")}
                </button>
                <button
                  type="button"
                  className="text-link reply-text-button"
                  disabled={disabled}
                  onClick={() => changeState(f.id, "failed")}
                >
                  {t("خطای نمونه", "Demo failure")}
                </button>
              </>
            )}
            <button
              type="button"
              className="icon-button"
              disabled={disabled}
              aria-label={`${t("حذف", "Remove")} ${f.name}`}
              onClick={() => {
                setFiles((previous) => previous.filter((x) => x.id !== f.id))
                setError(false)
              }}
            >
              <Glyph name="close" />
            </button>
          </div>
        ))}
      </div>
      <p className="support-caption">
        {t(
          "این مراحل دستی پروتوتایپ‌اند؛ فایل به سرور نمی‌رود و پیش‌نمایش فقط در حافظه این صفحه است.",
          "These are manual prototype steps; files do not reach a server and previews remain in this page’s memory.",
        )}
      </p>
    </div>
  )
}
