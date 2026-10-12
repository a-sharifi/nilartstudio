const informationRoutes = new Set(["guides/buying", "faq", "track-order", "returns", "about", "contact", "terms", "privacy"])

export function isStaticInfoPage(path: string) {
  return informationRoutes.has(path.replace(/^\/(?:fa|en)\//, "").replace(/^\//, "").replace(/\/$/, ""))
}
