export type FileStatus = "ready" | "preparing" | "inactive" | "updated" | "expired" | "unavailable"
export type DownloadMode = "normal" | "started" | "error" | "link-expired" | "access-expired" | "missing" | "empty" | "loading" | "network" | "denied"
export type DownloadFilter = "all" | "ready" | "pending" | "attention"
export type CustomerFile = {
  id: string
  owner: string
  orderId: string
  orderTitle: [string, string]
  title: [string, string]
  filename: string
  version: string
  format: string
  bytes: number | null
  deliveredAt: string | null
  status: FileStatus
  current: boolean
  previousAllowed: boolean
  customerDeliverable: boolean
  approvedFinal: boolean
  width?: number
  height?: number
  usage: [string, string]
}
const common = {
  owner: "demo-customer",
  orderId: "NA-24106",
  orderTitle: [
    "پرتره خانوادگی سفارشی",
    "Custom family portrait",
  ] as [string, string],
  customerDeliverable: true,
  approvedFinal: true,
  previousAllowed: false,
  usage: [
    "استفاده شخصی طبق توافق نمونه Q-1042-V2؛ مجوز تکثیر یا استفاده تجاری ارائه نشده است.",
    "Personal use under fixture agreement Q-1042-V2; reproduction or commercial-use rights are not granted.",
  ] as [string, string],
}
// All records are explicit fixtures. No permanent public file URLs or private reference images.
export function downloadFixture(mode: DownloadMode): CustomerFile[] {
  if (mode === "empty") return []
  const files: CustomerFile[] = [
    {
      ...common,
      id: "portrait-png",
      title: ["پرتره خانوادگی — فایل نهایی", "Family portrait — final file"],
      filename: "family-portrait-v2.png",
      version: "2",
      format: "PNG",
      bytes: 12897484,
      deliveredAt: "2025-06-18T14:20:00+03:30",
      status: "ready",
      current: true,
      width: 3508,
      height: 4961,
    },
    {
      ...common,
      id: "portrait-pdf",
      title: ["پرتره خانوادگی — نسخه PDF", "Family portrait — PDF edition"],
      filename: "family-portrait-v2.pdf",
      version: "2",
      format: "PDF",
      bytes: 4194304,
      deliveredAt: "2025-06-18T14:20:00+03:30",
      status: "ready",
      current: true,
    },
    {
      ...common,
      id: "portrait-previous",
      title: [
        "پرتره خانوادگی — نسخه پیشین",
        "Family portrait — previous version",
      ],
      filename: "family-portrait-v1.png",
      version: "1",
      format: "PNG",
      bytes: 10863247,
      deliveredAt: "2025-06-15T10:00:00+03:30",
      status: "updated",
      current: false,
      previousAllowed: true,
    },
    {
      ...common,
      id: "garden-print",
      orderId: "NA-24112",
      orderTitle: ["کالکشن باغ کوچک", "Little garden collection"],
      title: [
        "باغ کوچک — چاپ هنری دیجیتال",
        "Little garden — digital art print",
      ],
      filename: "little-garden-final.pdf",
      version: "1",
      format: "PDF",
      bytes: null,
      deliveredAt: null,
      status: "preparing",
      current: true,
      usage: [
        "استفاده شخصی طبق توافق نمونه این سفارش؛ دریافت فایل تأیید اثر یا انتقال حقوق نیست.",
        "Personal use under this order’s fixture agreement; downloading does not approve artwork or transfer rights.",
      ],
    },
    {
      ...common,
      id: "garden-guide",
      orderId: "NA-24112",
      orderTitle: ["کالکشن باغ کوچک", "Little garden collection"],
      title: ["راهنمای استفاده از فایل", "File usage guide"],
      filename: "little-garden-guide.pdf",
      version: "1",
      format: "PDF",
      bytes: 524288,
      deliveredAt: "2025-06-17T09:00:00+03:30",
      status: "inactive",
      current: true,
    },
  ]
  if (mode === "access-expired") files[0].status = "expired"
  if (mode === "missing") files[0].status = "unavailable"
  return files
}
export function authorizedFiles(files: CustomerFile[], owner: string) {
  return files.filter(
    (file) =>
      file.owner === owner &&
      file.customerDeliverable &&
      file.approvedFinal &&
      (file.current || file.previousAllowed),
  )
}
export function canRequestDownload(file: CustomerFile) {
  return (
    file.customerDeliverable &&
    file.approvedFinal &&
    (file.current || file.previousAllowed) &&
    (file.status === "ready" || file.status === "updated")
  )
}
export function searchFiles(
  files: CustomerFile[],
  query: string,
  filter: DownloadFilter,
) {
  const normalize = (value: string) =>
    value
      .normalize("NFKC")
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .toLocaleLowerCase()
      .trim()
  const text = normalize(query)
  return files
    .filter((file) => {
      const match =
        !text ||
        normalize(
          [file.filename, ...file.title, ...file.orderTitle, file.orderId].join(
            " ",
          ),
        ).includes(text)
      const state =
        filter === "all" ||
        (filter === "ready" && canRequestDownload(file)) ||
        (filter === "pending" &&
          ["preparing", "inactive"].includes(file.status)) ||
        (filter === "attention" &&
          ["expired", "unavailable"].includes(file.status))
      return match && state
    })
    .sort(
      (a, b) =>
        (b.deliveredAt ? Date.parse(b.deliveredAt) : 0) -
        (a.deliveredAt ? Date.parse(a.deliveredAt) : 0),
    )
}
