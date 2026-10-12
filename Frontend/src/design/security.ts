import { demoAuthPolicy } from "./checkout"
export type SecurityMode = "normal" | "incorrect" | "limited" | "network" | "server" | "unknown" | "success-kept" | "success-relogin" | "sessions" | "session-error" | "sessions-empty" | "sessions-load-error" | "loading" | "denied"
export type PasswordDraft = {
  current: string
  next: string
  confirm: string
}
export type SessionPolicy = "unconfirmed" | "other-sessions" | "all-sessions"
export type DemoSession = {
  id: string
  device: [string, string]
  current: boolean
  lastActivity: string
}
export function securityFixture(mode: SecurityMode) {
  const sessionsEnabled = [
    "sessions",
    "session-error",
    "sessions-empty",
    "sessions-load-error",
  ].includes(mode)
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
    sessionsEnabled,
    canManageSessions: sessionsEnabled,
    sessions:
      !sessionsEnabled || mode === "sessions-empty"
        ? []
        : [
            {
              id: "demo-current",
              device: [
                "Chrome روی رایانه • گزارش نمونه",
                "Chrome on desktop • Fixture report",
              ],
              current: true,
              lastActivity: "2025-06-20T10:30:00+03:30",
            },
            {
              id: "demo-mobile",
              device: [
                "Safari روی تلفن • گزارش نمونه",
                "Safari on mobile • Fixture report",
              ],
              current: false,
              lastActivity: "2025-06-19T18:15:00+03:30",
            },
            {
              id: "demo-other",
              device: [
                "Firefox روی رایانه • گزارش نمونه",
                "Firefox on desktop • Fixture report",
              ],
              current: false,
              lastActivity: "2025-06-18T09:10:00+03:30",
            },
          ] as DemoSession[],
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
export function canRevokeSession(
  session: DemoSession,
  owner: string,
  canManage: boolean,
) {
  return owner === "demo-customer" && canManage && !session.current
}
