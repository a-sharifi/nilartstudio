import { demoAuthPolicy } from "./checkout"
export type SecurityMode = "normal" | "incorrect" | "limited" | "network" | "server" | "unknown" | "success-kept" | "success-relogin" | "load-error" | "loading" | "denied"
export type PasswordDraft = {
  current: string
  next: string
  confirm: string
}
export type SessionPolicy = "unconfirmed" | "other-sessions" | "all-sessions"
export function securityFixture(mode: SecurityMode) {
  return {
    owner: "demo-customer",
    passwordEnabled: true,
    otpEnabled: true,
    phoneVerified: true,
    maskedPhone: "+98 9•• ••• ••••",
    canChange: mode !== "denied" && mode !== "limited",
    minimum: demoAuthPolicy.passwordMinLength,
    sessionPolicy: (mode === "success-kept"
      ? "other-sessions"
      : mode === "success-relogin"
        ? "all-sessions"
        : "unconfirmed") as SessionPolicy,

  }
}
export function validatePasswordChange(draft: PasswordDraft, minimum: number) {
  const errors: Partial<Record<keyof PasswordDraft, string>> = {}
  if (!draft.current) errors.current = "required-current"
  if (!draft.next) errors.next = "required-new"
  else if (draft.next.length < minimum) errors.next = "rules"
  if (!draft.confirm) errors.confirm = "required-confirm"
  else if (draft.confirm !== draft.next) errors.confirm = "mismatch"
  return errors
}
export function passwordChangePayload(draft: PasswordDraft) {
  // Keep the exact values: no trim, digit normalization, case conversion or extra mutable account fields.
  return { currentPassword: draft.current, newPassword: draft.next }
}
