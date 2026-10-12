import { jobMatches, type AssessmentJob } from "./assessment"
import type { ReferenceDraft } from "./references"
import {
  normalizeDimension,
  preferenceSizes,
  preferenceStyles,
  type PreferencesDraft,
} from "./preferences"
import type { ArtCartLine } from "./cart"
export type QuoteStatus = "pending" | "needs-info" | "valid" | "updated" | "expired" | "rejected"
export type QuoteView = "normal" | "loading" | "load-error" | "denied" | "expired-session" | "add-error" | "network" | "changed" | "unknown-cost"
export interface CommissionQuote {
  id: "demo-commission-quote"
  owner: "demo-session"
  demo: true
  version: number
  termsVersion: number
  requestKey: string
  status: QuoteStatus
  initialFactor?: number
  factor?: number
  reviewed: boolean
  base: number
  executionFee: number
  discount: number
  currency: "IRT"
  previousAmount?: number
}
export interface QuoteAcceptance {
  quoteId: string
  quoteVersion: number
  termsVersion: number
  requestKey: string
  owner: "demo-session"
  acceptedAt: number
}
export const commissionCartId = "demo-custom-commission"
export function isQuoteRoute(path: string) {
  return /^\/(fa|en)\/commissions\/new\/quote$/.test(path.split(/[?#]/)[0])
}
export function quoteAmount(quote: CommissionQuote) {
  if (
    !Number.isSafeInteger(quote.base) ||
    quote.base <= 0 ||
    !Number.isSafeInteger(quote.executionFee) ||
    quote.executionFee < 0 ||
    !Number.isSafeInteger(quote.discount) ||
    quote.discount < 0
  )
    return undefined
  if (!Number.isFinite(quote.factor) || quote.factor! < 1 || quote.factor! > 3)
    return undefined
  const adjusted = Math.round(quote.base * quote.factor!)
  const total = adjusted + quote.executionFee - quote.discount
  return Number.isSafeInteger(total) && total > 0
    ? { adjusted, total }
    : undefined
}
export function quoteMatches(
  q: CommissionQuote | null,
  job: AssessmentJob | null,
  reference: ReferenceDraft | null,
  preferences: PreferencesDraft | null,
) {
  return (
    !!q &&
    q.owner === "demo-session" &&
    jobMatches(job, reference, preferences) &&
    !!job &&
    ["complete", "review", "insufficient"].includes(job.status) &&
    q.requestKey === job.requestKey
  )
}
export function payableQuote(
  q: CommissionQuote | null,
  job: AssessmentJob | null,
  reference: ReferenceDraft | null,
  preferences: PreferencesDraft | null,
) {
  return (
    quoteMatches(q, job, reference, preferences) &&
    !!q &&
    q.reviewed &&
    ["valid", "updated"].includes(q.status) &&
    !!quoteAmount(q)
  )
}
export function acceptanceMatches(
  a: QuoteAcceptance | null,
  q: CommissionQuote | null,
) {
  return (
    !!a &&
    !!q &&
    a.owner === "demo-session" &&
    a.quoteId === q.id &&
    a.quoteVersion === q.version &&
    a.termsVersion === q.termsVersion &&
    a.requestKey === q.requestKey
  )
}
export function demoQuote(
  job: AssessmentJob,
  execution: string,
  status: QuoteStatus = "valid",
  version = 1,
): CommissionQuote {
  return {
    id: "demo-commission-quote",
    owner: "demo-session",
    demo: true,
    version,
    termsVersion: version,
    requestKey: job.requestKey,
    status,
    initialFactor: job.factor,
    factor: ["valid", "updated"].includes(status) ? 2 : undefined,
    reviewed: ["valid", "updated"].includes(status),
    base: 1200000,
    executionFee: execution === "hand" ? 500000 : 300000,
    discount: 0,
    currency: "IRT",
    previousAmount:
      status === "updated"
        ? 2160000 + (execution === "hand" ? 500000 : 300000)
        : undefined,
  }
}
export function quoteSize(p: PreferencesDraft) {
  const size = preferenceSizes.find((s) => s.id === p.size)
  return p.size === "custom"
    ? `${normalizeDimension(p.width)} × ${normalizeDimension(p.height)} cm`
    : size
      ? `${size.width} × ${size.height} ${size.unit}`
      : "—"
}
export function quoteCartLine(
  q: CommissionQuote,
  p: PreferencesDraft,
  a: QuoteAcceptance,
): ArtCartLine {
  return {
    id: commissionCartId,
    kind: "commission",
    name: ["سفارش نقاشی سفارشی · Demo", "Custom commission · Demo"],
    style: preferenceStyles.find((s) => s.id === p.style)
      ?.name as [string, string] || ["سبک نمونه", "Demo style"],
    size: quoteSize(p),
    execution:
      p.execution === "digital"
        ? ["اجرای دیجیتال · Demo", "Digital artwork · Demo"]
        : ["اجرای دستی · Demo", "Hand-painted artwork · Demo"],
    status: "confirmed",
    price: quoteAmount(q)!.total,
    quoteId: q.id,
    delivery: p.execution === "digital" ? "digital" : "physical",
    commissionAcceptance: a,
  }
}
