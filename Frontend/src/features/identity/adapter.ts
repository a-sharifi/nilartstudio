export type SignInResult = "incorrect" | "service" | "limited" | "success" | "network";
import type { LiveVerifyFlow } from "../../design/auth";

export type Purpose = "login" | "register" | "recovery";
export class IdentityApiError extends Error {
  constructor(public code: string) { super(code); }
}

async function post(path: string, body: object): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/auth/${path}`, {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch { throw new IdentityApiError("unknown"); }
  let result: unknown;
  try { result = await response.json(); } catch { throw new IdentityApiError("unknown"); }
  if (!result || typeof result !== "object") throw new IdentityApiError("unknown");
  if (!response.ok) {
    const code = "code" in result ? result.code : "";
    throw new IdentityApiError(response.status === 429 ? "limited"
      : code === "sms_unavailable" || code === "authentication_unavailable" ? "service"
      : response.status >= 500 ? "unknown" : "invalid");
  }
  return result as Record<string, unknown>;
}

export async function requestOtp(phone: string, purpose: Purpose): Promise<LiveVerifyFlow> {
  const normalized = normalizeIranPhone(phone);
  if (!normalized) throw new IdentityApiError("invalid");
  const result = await post("otp/request", { phone: normalized, purpose });
  const expiry = typeof result.expires_at === "string" ? Date.parse(result.expires_at) : NaN;
  if (typeof result.challenge_id !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(result.challenge_id)
    || result.purpose !== purpose || result.delivery_status !== "accepted"
    || !Number.isFinite(expiry) || expiry <= Date.now()
    || typeof result.resend_after_seconds !== "number" || result.resend_after_seconds < 0)
    throw new IdentityApiError("unknown");
  return { demo: false, purpose, phone: normalized, maskedPhone: normalized.slice(0, 5) + "••••" + normalized.slice(-3),
    challengeId: result.challenge_id, digits: 6, expiresAt: expiry,
    resendAt: Date.now() + result.resend_after_seconds * 1000 };
}

async function confirmSession(result: Record<string, unknown>): Promise<void> {
  if (typeof result.account_id !== "string" || typeof result.csrf_token !== "string")
    throw new IdentityApiError("unknown");
  try {
    const response = await fetch("/api/v1/auth/session", {
      credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new IdentityApiError("unknown");
    const account = await response.json();
    if (account.account_id !== result.account_id) throw new IdentityApiError("unknown");
    csrfToken = result.csrf_token;
  } catch { throw new IdentityApiError("unknown"); }
}

export async function verifyOtp(flow: LiveVerifyFlow, code: string): Promise<string | null> {
  const result = await post("otp/verify", {
    challenge_id: flow.challengeId, purpose: flow.purpose, code,
  });
  if (flow.purpose === "login") { await confirmSession(result); return null; }
  if (typeof result.grant !== "string" || result.grant.length < 40
    || result.purpose !== flow.purpose || result.expires_in_seconds !== 600)
    throw new IdentityApiError("unknown");
  return result.grant;
}

export async function completePassword(grant: string, purpose: "register" | "recovery", password: string): Promise<void> {
  const result = await post(`${purpose}/complete`, { grant, password });
  await confirmSession(result);
}

let csrfToken: string | null = null;

export function normalizeIranPhone(value: string): string | null {
  const digits = value.trim().replace(/[۰-۹٠-٩]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x6f0 ? code - 0x6f0 : code - 0x660);
  }).replace(/[\s()-]/g, "");
  if (/^09\d{9}$/.test(digits)) return "+98" + digits.slice(1);
  if (/^9\d{9}$/.test(digits)) return "+98" + digits;
  if (/^(?:\+98|0098)9\d{9}$/.test(digits)) return "+98" + digits.slice(-10);
  return null;
}

export async function loginPassword(phone: string, password: string): Promise<SignInResult> {
  const normalized = normalizeIranPhone(phone);
  if (!normalized) return "incorrect";
  csrfToken = null;
  try {
    const response = await fetch("/api/v1/auth/login/password", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalized, password }),
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 401) return "incorrect";
    if (response.status === 429) return "limited";
    if (!response.ok) return "service";
    const grant: unknown = await response.json();
    if (!grant || typeof grant !== "object" || !("account_id" in grant)
      || !("csrf_token" in grant) || typeof grant.account_id !== "string"
      || typeof grant.csrf_token !== "string") return "service";
    const session = await fetch("/api/v1/auth/session", {
      credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!session.ok) return "service";
    const account: unknown = await session.json();
    if (!account || typeof account !== "object" || !("account_id" in account)
      || account.account_id !== grant.account_id) return "service";
    csrfToken = grant.csrf_token;
    return "success";
  } catch {
    return "network";
  }
}

export async function checkSession(): Promise<"confirm" | "signedOut" | "service" | "unknown"> {
  try {
    const response = await fetch("/api/v1/auth/session", {
      credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401) { csrfToken = null; return "signedOut"; }
    if (!response.ok) return "service";
    const account: unknown = await response.json();
    return account && typeof account === "object" && "account_id" in account
      && typeof account.account_id === "string" ? "confirm" : "unknown";
  } catch { return "unknown"; }
}

export async function logoutSession(): Promise<"success" | "signedOut" | "service" | "unknown"> {
  try {
    // Bootstrap from the HttpOnly cookie after reload; never persist CSRF in storage.
    const bootstrap = await fetch("/api/v1/auth/session/csrf", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000),
    });
    if (bootstrap.status === 401) return await checkSession() === "signedOut" ? "signedOut" : "unknown";
    if (!bootstrap.ok) return "service";
    const data = await bootstrap.json();
    if (typeof data?.csrf_token !== "string") return "unknown";
    csrfToken = data.csrf_token;
    const response = await fetch("/api/v1/auth/logout", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "X-CSRF-Token": csrfToken! }, signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 204 && response.status !== 401) return "unknown";
    if (await checkSession() !== "signedOut") return "unknown";
    csrfToken = null;
    return "success";
  } catch { return "unknown"; }
}
