export type TicketStatus = "submitted" | "review" | "waiting" | "answered" | "closed"
export type Ticket = { id: string; owner: string; title: [string, string]; topic: string; order: string; status: TicketStatus; updated: string; unread: number }
export const supportPolicy = { subjectMax: 120, descriptionMax: 4000, fileMax: 5 * 1024 * 1024, fileCount: 3, types: ["image/jpeg", "image/png", "application/pdf"] }
export const topics = [
  ["general", "پرسش عمومی", "General question", false],
  ["product", "محصول", "Product", false],
  ["order", "سفارش", "Order", true],
  ["payment", "پرداخت", "Payment", true],
  ["shipping", "ارسال", "Shipping", true],
  ["digital", "فایل دیجیتال", "Digital file", true],
  ["art", "نقاشی سفارشی", "Custom painting", true],
  ["technical", "مشکل فنی", "Technical issue", false],
  ["other", "سایر", "Other", false],
] as const
export const supportOrders = [
  { id: "NA-24018", owner: "demo-customer", items: [["print", "چاپ هنری باغ آرام · A4 · تعداد ۱", "Quiet garden print · A4 · Qty 1"]] },
  { id: "NA-23976", owner: "demo-customer", items: [["digital", "مجموعه دیجیتال · نسخه PDF · تعداد ۱", "Digital collection · PDF edition · Qty 1"]] },
] 
export const supportTickets: Ticket[] = [
  { id: "SP-208", owner: "demo-customer", title: ["راهنمای دریافت فایل سفارش", "Help accessing my order files"], topic: "digital", order: "NA-23976", status: "waiting", updated: "2026-02-24T09:30:00Z", unread: 1 },
  { id: "SP-204", owner: "demo-customer", title: ["پیگیری زمان ارسال", "Following up on delivery"], topic: "shipping", order: "NA-24018", status: "review", updated: "2026-02-22T11:00:00Z", unread: 0 },
  { id: "SP-196", owner: "demo-customer", title: ["راهنمای انتخاب قاب", "Choosing a frame"], topic: "product", order: "", status: "answered", updated: "2026-02-18T12:00:00Z", unread: 0 },
  { id: "SP-182", owner: "demo-customer", title: ["پرسش درباره نگهداری اثر", "A question about artwork care"], topic: "general", order: "", status: "closed", updated: "2026-02-10T08:00:00Z", unread: 0 },
]
export type SupportDraft = { topic: string; order: string; item: string; subject: string; description: string }
export const blankSupportDraft = (): SupportDraft => ({ topic: "", order: "", item: "", subject: "", description: "" })
export function validateSupport(draft: SupportDraft, owner: string) {
  const errors: Record<string, string> = {}
  const topic = topics.find(t => t[0] === draft.topic)
  if (!topic) errors.topic = "topic"
  const order = supportOrders.find(o => o.id === draft.order && o.owner === owner)
  if ((topic?.[3] && !order) || (draft.order && !order)) errors.order = "order"
  if (draft.item && !order?.items.some(i => i[0] === draft.item)) errors.item = "item"
  if (!draft.subject.trim() || draft.subject.length > supportPolicy.subjectMax) errors.subject = "subject"
  if (!draft.description.trim() || draft.description.length > supportPolicy.descriptionMax) errors.description = "description"
  return errors
}
export function acceptedSupportFile(file: { type: string; size: number }) {
  return supportPolicy.types.includes(file.type) && file.size > 0 && file.size <= supportPolicy.fileMax
}
