export type ProfileMode = "normal" | "optional-empty" | "email" | "email-empty" | "dirty" | "required-name" | "conflict" | "loading" | "network" | "save-error" | "unknown" | "restricted" | "denied"
export type ProfilePolicy = {
  nameModel: "fullName"
  nameRequired: boolean
  nameMax: number
  emailSupported: boolean
  emailVerificationSupported: boolean
  emailMax: number
  phoneChangeEnabled: boolean
  canEdit: boolean
}
export type ProfileRecord = {
  owner: string
  fullName: string
  phone: string
  phoneVerified: boolean
  email: string | null
  emailVerified: boolean
  version: number
}
export type ProfileDraft = {
  fullName: string
  email: string
}
export type ProfilePayload = {
  fullName: string
  email?: string | null
  version: number
}
// Explicit capability and policy fixtures, not a production account schema or service response.
export function profileFixture(mode: ProfileMode) {
  const emailSupported = mode === "email" || mode === "email-empty"
  const policy: ProfilePolicy = {
    nameModel: "fullName",
    nameRequired: mode === "required-name",
    nameMax: 120,
    emailSupported,
    emailVerificationSupported: emailSupported,
    emailMax: 254,
    phoneChangeEnabled: true,
    canEdit: mode !== "restricted" && mode !== "denied",
  }
  const record: ProfileRecord = {
    owner: "demo-customer",
    fullName: ["optional-empty", "required-name"].includes(mode)
      ? ""
      : "سارا احمدی",
    phone: "+989000000000",
    phoneVerified: true,
    email: mode === "email" ? "sara@example.test" : null,
    emailVerified: mode === "email",
    version: 1,
  }
  return { policy, record }
}
export function profileDraft(record: ProfileRecord): ProfileDraft {
  return { fullName: record.fullName, email: record.email || "" }
}
export function profileDirty(
  record: ProfileRecord,
  draft: ProfileDraft,
  policy: ProfilePolicy,
) {
  return (
    draft.fullName !== record.fullName ||
    (policy.emailSupported && draft.email !== (record.email || ""))
  )
}
export function validateProfile(draft: ProfileDraft, policy: ProfilePolicy) {
  const errors: Partial<Record<keyof ProfileDraft, string>> = {}
  if ((policy.nameRequired || !!draft.fullName) && !draft.fullName.trim())
    errors.fullName = "name"
  else if (
    Array.from(draft.fullName).length > policy.nameMax ||
    /[\u0000-\u001f\u007f]/.test(draft.fullName)
  )
    errors.fullName = "name-length"
  if (policy.emailSupported && draft.email.trim()) {
    if (
      draft.email.length > policy.emailMax ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())
    )
      errors.email = "email"
  }
  return errors
}
export function profilePayload(
  draft: ProfileDraft,
  policy: ProfilePolicy,
  version: number,
): ProfilePayload {
  return {
    fullName: draft.fullName.trim().replace(/\s+/g, " "),
    ...(policy.emailSupported ? { email: draft.email.trim() || null } : {}),
    version,
  }
}
export function applyProfileResponse(
  record: ProfileRecord,
  payload: ProfilePayload,
  policy: ProfilePolicy,
  owner: string,
) {
  if (owner !== record.owner || !policy.canEdit)
    return { record, error: "permission" }
  if (payload.version !== record.version) return { record, error: "conflict" }
  const draft = { fullName: payload.fullName, email: payload.email || "" }
  if (Object.keys(validateProfile(draft, policy)).length)
    return { record, error: "validation" }
  const email = policy.emailSupported ? payload.email || null : record.email
  return {
    record: {
      ...record,
      fullName: payload.fullName,
      email,
      emailVerified: email === record.email ? record.emailVerified : false,
      version: record.version + 1,
    },
    error: null,
  }
}
