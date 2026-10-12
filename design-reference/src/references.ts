export type ReferenceMode = "normal" | "loading" | "upload-error" | "save-error" | "offline" | "low-quality" | "expired" | "denied" | "conflict"
export type InputKind = "image" | "idea"
export type UploadStatus = "ready" | "uploading" | "checking" | "accepted" | "failed"
export interface SavedReference {
  id: string
  file: File
  status: UploadStatus
  receipt?: string
}
export interface ReferenceDraft {
  owner: "demo-session"
  kind: InputKind
  brief: string
  primary: string
  files: SavedReference[]
  version: number
}
// Explicit prototype contract only; never use these as production service limits.
export const referenceDemoConfig = {
  demo: true,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxBytes: 10 * 1024 * 1024,
  maxFiles: 3,
  maxText: 2000,
  supportsIdea: true,
  supportsMultiple: true,
  storage: "authenticated-demo-session-memory",
} as const
export const referenceModes: [ReferenceMode, string, string][] = [
  ["normal", "عادی", "Normal"],
  ["loading", "بارگذاری پیش‌نویس", "Loading draft"],
  ["upload-error", "خطای آپلود", "Upload failure"],
  ["save-error", "خطای ذخیره", "Save failure"],
  ["offline", "خطای شبکه", "Network failure"],
  ["low-quality", "هشدار کیفیت نمونه", "Demo quality warning"],
  ["expired", "نشست منقضی", "Session expired"],
  ["denied", "عدم دسترسی", "Permission denied"],
  ["conflict", "تعارض پیش‌نویس", "Draft conflict"],
]
export function isReferencesRoute(path: string) {
  return /^\/(fa|en)\/commissions\/new\/references?$/.test(
    path.split(/[?#]/)[0],
  )
}
export function referenceFileError(
  file: Pick<File, "type" | "size">,
): "type" | "size" | undefined {
  if (!referenceDemoConfig.mimeTypes.some((type) => type === file.type))
    return "type"
  if (file.size > referenceDemoConfig.maxBytes) return "size"
}
export function referenceErrors(
  draft: Pick<ReferenceDraft, "kind" | "brief" | "primary" | "files">,
) {
  const errors: {
    brief?: "required" | "long"
    files?: "required" | "pending" | "primary"
  } = {}
  if (!draft.brief.trim()) errors.brief = "required"
  else if (draft.brief.length > referenceDemoConfig.maxText)
    errors.brief = "long"
  if (draft.kind === "image" && !draft.files.length) errors.files = "required"
  else if (
    draft.files.some((file) => file.status !== "accepted" || !file.receipt)
  )
    errors.files = "pending"
  else if (
    draft.files.length &&
    !draft.files.some((file) => file.id === draft.primary)
  )
    errors.files = "primary"
  return errors
}
export function referenceSignature(
  draft: Pick<ReferenceDraft, "kind" | "brief" | "primary" | "files">,
) {
  return JSON.stringify([
    draft.kind,
    draft.brief,
    draft.primary,
    draft.files.map((f) => [f.id, f.status, f.receipt || ""]),
  ])
}
export function sameReferenceFile(
  a: Pick<File, "name" | "size" | "lastModified" | "type">,
  b: Pick<File, "name" | "size" | "lastModified" | "type">,
) {
  return (
    a.name === b.name &&
    a.size === b.size &&
    a.lastModified === b.lastModified &&
    a.type === b.type
  )
}
