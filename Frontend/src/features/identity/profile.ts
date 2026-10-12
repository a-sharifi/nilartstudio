import type { ProfilePayload, ProfileRecord } from "../../design/profile";
import { sessionLifecycle } from "./session-lifecycle";
import { IdentityApiError } from "./adapter";

function record(value: unknown): ProfileRecord {
  if (!value || typeof value !== "object") throw new IdentityApiError("unknown");
  const data = value as Record<string, unknown>;
  if (typeof data.account_id !== "string" || !data.account_id || typeof data.full_name !== "string"
    || typeof data.phone !== "string" || !Number.isSafeInteger(data.version) || Number(data.version) < 0)
    throw new IdentityApiError("unknown");
  // Profile endpoint only admits verified active accounts. Email is unsupported.
  return { owner: data.account_id, fullName: data.full_name, phone: data.phone,
    phoneVerified: true, email: null, emailVerified: false, version: Number(data.version) };
}

let profileRead = 0;

async function load(): Promise<ProfileRecord> {
  const revision = sessionLifecycle.capture(), read = ++profileRead;
  const response = await fetch("/api/v1/account/profile", {
    credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!sessionLifecycle.current(revision) || read !== profileRead) throw new IdentityApiError("denied");
  if (response.status === 401) sessionLifecycle.observe(null, revision);
  if (response.status === 401 || response.status === 403) throw new IdentityApiError("denied");
  if (!response.ok) throw new IdentityApiError("service");
  const result = record(await response.json());
  if (read !== profileRead || !sessionLifecycle.observe(result.owner, revision)) throw new IdentityApiError("denied");
  return result;
}

async function save(payload: ProfilePayload, owner: string): Promise<ProfileRecord> {
  const revision = sessionLifecycle.capture();
  const bootstrap = await fetch("/api/v1/auth/session/csrf", {
    method: "POST", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!sessionLifecycle.current(revision)) throw new IdentityApiError("denied");
  if (bootstrap.status === 401) {
    sessionLifecycle.observe(null, revision);
    throw new IdentityApiError("denied");
  }
  if (!bootstrap.ok) throw new IdentityApiError("service");
  const csrf = await bootstrap.json();
  if (typeof csrf?.csrf_token !== "string") throw new IdentityApiError("unknown");
  if (!sessionLifecycle.current(revision)) throw new IdentityApiError("denied");
  let response: Response;
  try {
    response = await fetch("/api/v1/account/profile", {
      method: "PUT", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrf_token, "X-Profile-Owner": owner },
      body: JSON.stringify({ full_name: payload.fullName, version: payload.version }),
    });
  } catch { throw new IdentityApiError("unknown"); }
  if (!sessionLifecycle.current(revision)) throw new IdentityApiError("denied");
  if (response.status === 409) throw new IdentityApiError("conflict");
  if (response.status === 401) {
    sessionLifecycle.observe(null, revision);
    throw new IdentityApiError("denied");
  }
  if (!response.ok) throw new IdentityApiError(response.status >= 500 ? "unknown" : "service");
  const result = record(await response.json());
  if (!sessionLifecycle.current(revision) || result.owner !== owner) throw new IdentityApiError("unknown");
  return result;
}

export const profileApi = { load, save, subscribe: sessionLifecycle.subscribe };
