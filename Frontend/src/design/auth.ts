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

export interface LiveVerifyFlow {
  sandbox?: boolean
  demo: false
  purpose: Purpose
  maskedPhone: string
  digits: number
  resendAt: number
  challengeId: string
  phone: string
  expiresAt: number
}
export type VerifyFlow = DemoVerifyFlow | LiveVerifyFlow

export type LiveSessionEvent = { type: "revalidate" } | {
  type: "changed"
  source: "authentication" | "observation"
  signedOut: boolean
}

export interface LiveAuthApi {
  request(phone: string, purpose: Purpose): Promise<LiveVerifyFlow>
  verify(flow: LiveVerifyFlow, code: string): Promise<string | null>
  complete(grant: string, purpose: "register" | "recovery", password: string): Promise<void>
  logout(): Promise<"success" | "signedOut" | "service" | "unknown">
  checkSession(): Promise<"confirm" | "signedOut" | "service" | "unknown">
  subscribe?(listener: (event: LiveSessionEvent) => void): () => void
}

export function createDemoVerifyFlow(purpose: Purpose, phone: string): DemoVerifyFlow {
  return { demo: true, purpose, maskedPhone: maskedPhone(normalizeDigits(phone)), digits: demoAuthPolicy.otpLength, resendAt: null }
}
