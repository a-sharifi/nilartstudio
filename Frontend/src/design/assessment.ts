import {
  referenceErrors,
  referenceSignature,
  type ReferenceDraft,
} from "./references"
import { preferenceErrors, type PreferencesDraft } from "./preferences"

export type AssessmentStatus = "queued" | "processing" | "complete" | "review" | "insufficient" | "needs-details" | "failed"
export type AssessmentView = "normal" | "loading" | "empty" | "network" | "unknown" | "limited" | "stale" | "denied" | "expired" | "progress"
export interface AssessmentJob {
  id: string
  owner: "demo-session"
  demo: true
  requestKey: string
  referenceVersion: number
  preferenceVersion: number
  status: AssessmentStatus
  checkedAt: number
  factor?: number
  reasons: [string, string][]
}
export function isAssessmentRoute(path: string) {
  return /^\/(fa|en)\/commissions\/new\/assessment$/.test(path.split(/[?#]/)[0])
}
export function assessmentPrerequisites(
  reference: ReferenceDraft | null,
  preferences: PreferencesDraft | null,
) {
  return !!(
    reference?.owner === "demo-session" &&
    reference.version > 0 &&
    !Object.keys(referenceErrors(reference)).length &&
    preferences?.id === "demo-preferences" &&
    preferences.version > 0 &&
    preferences.referenceVersion === reference.version &&
    !Object.keys(preferenceErrors(preferences)).length
  )
}
export function assessmentKey(
  reference: ReferenceDraft,
  preferences: PreferencesDraft,
) {
  return JSON.stringify([
    reference.version,
    referenceSignature(reference),
    preferences.version,
    preferences.execution,
    preferences.style,
    preferences.size,
    preferences.width,
    preferences.height,
  ])
}
export function jobMatches(
  job: AssessmentJob | null,
  reference: ReferenceDraft | null,
  preferences: PreferencesDraft | null,
) {
  return !!(
    job?.owner === "demo-session" &&
    reference &&
    preferences &&
    assessmentPrerequisites(reference, preferences) &&
    job.requestKey === assessmentKey(reference, preferences)
  )
}
export function canContinueAssessment(
  job: AssessmentJob | null,
  reference: ReferenceDraft | null,
  preferences: PreferencesDraft | null,
) {
  return (
    jobMatches(job, reference, preferences) &&
    !!job &&
    (job.status === "review" ||
      job.status === "insufficient" ||
      (job.status === "complete" &&
        Number.isFinite(job.factor) &&
        job.factor! >= 1 &&
        job.factor! <= 3))
  )
}
export function createDemoJob(
  reference: ReferenceDraft,
  preferences: PreferencesDraft,
): AssessmentJob {
  return {
    id: `demo-assessment-${reference.version}-${preferences.version}`,
    owner: "demo-session",
    demo: true,
    requestKey: assessmentKey(reference, preferences),
    referenceVersion: reference.version,
    preferenceVersion: preferences.version,
    status: "queued",
    checkedAt: Date.now(),
    reasons: [],
  }
}
// Explicit fixtures, not outputs inferred from an uploaded image.
export function demoJobStatus(
  job: AssessmentJob,
  status: AssessmentStatus,
): AssessmentJob {
  return {
    ...job,
    status,
    checkedAt: Date.now(),
    factor: status === "complete" || status === "review" ? 1.8 : undefined,
    reasons:
      status === "complete" || status === "review"
        ? [
            [
              "میزان جزئیات درخواستی · دلیل نمونه Demo، نه تحلیل اطلاعات شما",
              "Requested detail level · Demo reason, not analysis of your information",
            ],
            [
              "ارتباط سبک و مشخصات خروجی · دلیل نمونه Demo",
              "Relationship between style and output specifications · Demo reason",
            ],
          ]
        : [],
  }
}
export const assessmentDemoReference: ReferenceDraft = {
  owner: "demo-session",
  kind: "idea",
  brief:
    "Demo · یک ترکیب انتزاعی آرام با فرم‌های ساده و رنگ‌های گرم. / A quiet abstract composition with simple forms and warm colours.",
  primary: "",
  files: [],
  version: 1,
}
export const assessmentDemoPreferences: PreferencesDraft = {
  id: "demo-preferences",
  version: 1,
  referenceVersion: 1,
  execution: "digital",
  style: "minimal",
  size: "d-square",
  width: "",
  height: "",
  assessmentNeedsReview: false,
}
