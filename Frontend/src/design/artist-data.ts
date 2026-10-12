export type ArtistText = readonly [string, string]
export type ArtistStage = "ready" | "working" | "approval" | "revision" | "delivery"
export interface ArtistOrder {
  id: string
  title: ArtistText
  technique: ArtistText
  specs: ArtistText
  stage: ArtistStage
  due: string | null
  event: ArtistText
  version: string
  startAuthorized: boolean
}
export interface AssessmentRequest {
  id: string
  title: ArtistText
  specs: ArtistText
  assignedAt: string
}
export interface ArtistSnapshot {
  demo: true
  artist: {
    id: string
    name: ArtistText
    earningsAllowed: boolean
  }
  orders: ArtistOrder[]
  requests: AssessmentRequest[]
  earnings: {
    recorded: number
    pending: number
    settled: number
  }
  receivedAt: string
  referenceDate: string
}
// Fictional fixtures only. No customer identifiers, prompts or private file URLs.
const orders: ArtistOrder[] = [
  {
    id: "ART-2084",
    title: ["باغی در سکوت", "A garden in silence"],
    technique: ["اجرای دستی", "Hand-painted"],
    specs: ["آبرنگ · ۳۰ × ۴۰ سانتی‌متر", "Watercolor · 30 × 40 cm"],
    stage: "working",
    due: "2026-06-18T12:00:00Z",
    event: [
      "طرح اولیه تأیید شد؛ اجرای رنگ آغاز شده",
      "Sketch approved; painting started",
    ],
    version: "V1",
    startAuthorized: true,
  },
  {
    id: "ART-2081",
    title: ["پرتره در نور عصر", "Portrait in evening light"],
    technique: ["اجرای دیجیتال", "Digital artwork"],
    specs: ["پرتره · ۳۰۰۰ × ۴۰۰۰ پیکسل", "Portrait · 3000 × 4000 px"],
    stage: "revision",
    due: "2026-06-16T12:00:00Z",
    event: ["بازخورد جدید برای نسخه V2", "New feedback for version V2"],
    version: "V2",
    startAuthorized: true,
  },
  {
    id: "ART-2079",
    title: ["خانه‌ای میان درخت‌ها", "A home among the trees"],
    technique: ["اجرای دستی", "Hand-painted"],
    specs: ["اکریلیک · ۴۰ × ۵۰ سانتی‌متر", "Acrylic · 40 × 50 cm"],
    stage: "approval",
    due: null,
    event: [
      "نسخه V1 ارائه شد؛ منتظر تصمیم مشتری",
      "Version V1 submitted; awaiting customer",
    ],
    version: "V1",
    startAuthorized: true,
  },
  {
    id: "ART-2087",
    title: ["خاطره‌ای به رنگ آبی", "A memory in blue"],
    technique: ["اجرای دیجیتال", "Digital artwork"],
    specs: ["تصویرسازی · A4", "Illustration · A4"],
    stage: "ready",
    due: "2026-06-22T12:00:00Z",
    event: [
      "پرداخت تأیید و مجوز شروع در نمونه ثبت شده",
      "Sample payment verified & start authorized",
    ],
    version: "—",
    startAuthorized: true,
  },
  {
    id: "ART-2076",
    title: ["آرامش ساحل", "Coastal calm"],
    technique: ["اجرای دستی", "Hand-painted"],
    specs: ["آبرنگ · ۲۰ × ۳۰ سانتی‌متر", "Watercolor · 20 × 30 cm"],
    stage: "delivery",
    due: "2026-06-15T12:00:00Z",
    event: [
      "نسخه نهایی تأیید شده؛ اطلاعات تحویل آماده",
      "Final approved; delivery information ready",
    ],
    version: "V3",
    startAuthorized: true,
  },
]
const requests: AssessmentRequest[] = [
  {
    id: "REQ-0312",
    title: ["تصویرسازی یک خاطره خانوادگی", "Illustrating a family memory"],
    specs: ["دیجیتال · تصویرسازی · A4", "Digital · illustration · A4"],
    assignedAt: "2026-06-14T09:20:00Z",
  },
  {
    id: "REQ-0315",
    title: ["منظره باغ با نور صبح", "A garden in morning light"],
    specs: ["دستی · آبرنگ · ۳۰ × ۴۰", "Hand-painted · watercolor · 30 × 40"],
    assignedAt: "2026-06-14T07:45:00Z",
  },
]
export type ArtistPreview = "normal" | "empty" | "loading" | "error" | "denied" | "changed" | "expired"
export interface ArtistService {
  load(signal: AbortSignal, empty?: boolean): Promise<ArtistSnapshot>
  clear(): void
}
// Replace this adapter with an authenticated service. The server must scope all
// requests to the current artist and revalidate assignment on every detail/file call.
export const demoArtistService: ArtistService = {
  async load(signal, empty = false) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 380)
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer)
          reject(new DOMException("Aborted", "AbortError"))
        },
        { once: true },
      )
    })
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    return {
      demo: true,
      artist: {
        id: "DEMO-ARTIST",
        name: ["سارا", "Sara"],
        earningsAllowed: true,
      },
      orders: empty ? [] : orders.map((o) => ({ ...o })),
      requests: empty ? [] : requests.map((r) => ({ ...r })),
      earnings: { recorded: 18600000, pending: 6200000, settled: 12400000 },
      receivedAt: new Date().toISOString(),
      referenceDate: "2026-06-14T12:00:00Z",
    }
  },
  clear() {
    /* No browser storage or private cache in the demo adapter. */
  },
}
