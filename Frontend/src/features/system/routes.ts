// Validate route shapes without looking up private records or their owners.
export function isApplicationRoute(path: string): boolean {
  const route = path.replace(/\/$/, "") || "/";
  if (/^\/(fa|en)\/(admin|artist|account|auth|checkout|payment)(?:\/|$)/.test(route)) return true;
  if (route === "/login") return true;
  const publicRoute = route.replace(/^\/(fa|en)(?=\/|$)/, "") || "/";
  return /^(?:\/|\/(?:shop|search|cart|checkout(?:\/(?:address|delivery|payment))?|collections(?:\/[^/]+)?|products\/[^/]+|bundles(?:\/[^/]+)?|artworks(?:\/[^/]+)?|categories\/[^/]+|commissions(?:\/notebook(?:\/(?:checkout\/)?[0-9a-f-]{36})?|\/new(?:\/(?:references?|preferences|assessment|quote))?)?|guides\/(?:buying|notebooks)|faq|track-order|returns|about|contact|terms|privacy|404|403|500|error|offline))$/.test(publicRoute);
}
