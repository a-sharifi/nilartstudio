import { IdentityApiError } from "./adapter";
import { sessionLifecycle } from "./session-lifecycle";

const roles = ["customer", "artist", "operations", "finance", "admin"] as const;
export type AccountRole = typeof roles[number];
export type AccountAccess = Readonly<{
  owner: string;
  roles: readonly AccountRole[];
  permissions: readonly string[];
}>;
let read = 0;

async function load(): Promise<AccountAccess> {
  const revision = sessionLifecycle.capture(), request = ++read;
  const current = () => sessionLifecycle.current(revision) && request === read;
  let response: Response;
  try {
    response = await fetch("/api/v1/auth/access", {
      credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000),
    });
  } catch { throw new IdentityApiError("unknown"); }
  if (!current()) throw new IdentityApiError("denied");
  if (response.status === 401) {
    sessionLifecycle.observe(null, revision);
    throw new IdentityApiError("denied");
  }
  if (response.status === 403) throw new IdentityApiError("denied");
  if (!response.ok) throw new IdentityApiError("service");
  let data: unknown;
  try { data = await response.json(); } catch { throw new IdentityApiError("unknown"); }
  if (!current()) throw new IdentityApiError("denied");
  if (!data || typeof data !== "object") throw new IdentityApiError("unknown");
  const value = data as Record<string, unknown>;
  if (typeof value.account_id !== "string" || !value.account_id
    || !Array.isArray(value.roles) || !value.roles.every(role => roles.includes(role))
    || new Set(value.roles).size !== value.roles.length
    || !Array.isArray(value.permissions) || !value.permissions.every(permission =>
      typeof permission === "string" && /^[a-z]+\.[a-z_]+$/.test(permission))
    || new Set(value.permissions).size !== value.permissions.length)
    throw new IdentityApiError("unknown");
  if (!sessionLifecycle.observe(value.account_id, revision)) throw new IdentityApiError("denied");
  return Object.freeze({ owner: value.account_id,
    roles: Object.freeze([...value.roles]) as readonly AccountRole[],
    permissions: Object.freeze([...value.permissions]) as readonly string[] });
}

// Presentation hints only. Every business endpoint must enforce its own permissions.
export const accessApi = { load, subscribe: sessionLifecycle.subscribe };
