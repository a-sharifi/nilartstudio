export type Execution = "" | "digital" | "hand"
export interface PreferencesDraft {
  id: "demo-preferences"
  version: number
  referenceVersion: number
  execution: Execution
  style: string
  size: string
  width: string
  height: string
  assessmentNeedsReview: boolean
}
export const preferenceStyles = [
  {
    id: "expressive",
    name: ["بیان‌گرا", "Expressive"],
    desc: [
      "رنگ‌های زنده و حرکت آزاد قلم",
      "Vivid colour and free, gestural marks",
    ],
    executions: ["digital", "hand"],
    art: 0,
  },
  {
    id: "minimal",
    name: ["مینیمال", "Minimal"],
    desc: ["فرم‌های ساده و فضای آرام", "Simple forms and quiet negative space"],
    executions: ["digital", "hand"],
    art: 1,
  },
  {
    id: "illustrative",
    name: ["تصویرسازی", "Illustrative"],
    desc: ["خطوط روشن و روایت تصویری", "Defined lines and visual storytelling"],
    executions: ["digital"],
    art: 2,
  },
]
export const preferenceSizes = [
  {
    id: "d-square",
    execution: "digital",
    width: 2400,
    height: 2400,
    unit: "px",
  },
  {
    id: "d-portrait",
    execution: "digital",
    width: 2400,
    height: 3200,
    unit: "px",
  },
  { id: "h-small", execution: "hand", width: 20, height: 30, unit: "cm" },
  { id: "h-large", execution: "hand", width: 30, height: 40, unit: "cm" },
]
// Prototype configuration, not a production catalogue or service limits.
export const customSizeDemo = {
  execution: "hand",
  min: 20,
  max: 80,
  step: 5,
  unit: "cm",
}
export function normalizeDimension(value: string) {
  return value
    .replace(/[۰-۹٠-٩]/g, (c) =>
      String(
        "۰۱۲۳۴۵۶۷۸۹".includes(c)
          ? "۰۱۲۳۴۵۶۷۸۹".indexOf(c)
          : "٠١٢٣٤٥٦٧٨٩".indexOf(c),
      ),
    )
    .replace(/٫/g, ".")
}
export function preferenceErrors(
  draft: Pick<PreferencesDraft, "execution" | "style" | "size" | "width" | "height">,
  emptyStyles = false,
  emptySizes = false,
) {
  const errors: Record<string, string> = {}
  if (!["digital", "hand"].includes(draft.execution))
    errors.execution = "required"
  const style = preferenceStyles.find((s) => s.id === draft.style)
  if (!draft.style) errors.style = "required"
  else if (!style || !style.executions.includes(draft.execution) || emptyStyles)
    errors.style = "unavailable"
  if (!draft.size) errors.size = "required"
  else if (emptySizes) errors.size = "unavailable"
  else if (draft.size === "custom") {
    const dimensions = [draft.width, draft.height].map((v) => {
      const normalized = normalizeDimension(v).trim()
      return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN
    })
    if (draft.execution !== "hand") errors.size = "unavailable"
    else if (
      dimensions.some(
        (n) =>
          !Number.isFinite(n) ||
          n < customSizeDemo.min ||
          n > customSizeDemo.max ||
          n % customSizeDemo.step !== 0,
      )
    )
      errors.size = "dimensions"
  } else if (
    !preferenceSizes.some(
      (s) => s.id === draft.size && s.execution === draft.execution,
    )
  )
    errors.size = "unavailable"
  return errors
}
export function isPreferencesRoute(path: string) {
  return /^\/(fa|en)\/commissions\/new\/preferences$/.test(
    path.split(/[?#]/)[0],
  )
}
