import { demoAuthPolicy, maskedPhone, normalizeDigits } from "./checkout"

export const isAuthRoute = (path: string) => /^\/(fa|en)\/auth\/(login(?:\/(?:password|otp(?:\/verify)?))?|password|otp|register(?:\/(?:verify|set-password|password))?|forgot-password|reset-password|session-expired|account-restricted|logout|recovery(?:\/reset-password)?|verify)$/.test(path) || path === "/login"

type Purpose = "login" | "register" | "recovery"
export interface DemoVerifyFlow {
  demo: true
  purpose: Purpose
  maskedPhone: string
  digits: number
  resendAt: number | null
}

export function createDemoVerifyFlow(purpose: Purpose, phone: string): DemoVerifyFlow {
  return { demo: true, purpose, maskedPhone: maskedPhone(normalizeDigits(phone)), digits: demoAuthPolicy.otpLength, resendAt: null }
}
