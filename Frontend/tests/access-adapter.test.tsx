import { afterEach, expect, it, vi } from "vitest";
import { accessApi } from "../src/features/identity/access";
import { sessionLifecycle } from "../src/features/identity/session-lifecycle";

afterEach(() => vi.unstubAllGlobals());
const access = { account_id: "customer", roles: ["customer"], permissions: ["account.read_self"] };
const response = (value: unknown) => new Response(JSON.stringify(value));

it("loads immutable live access without persisting credentials or caching permission grants", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(response(access))
    .mockResolvedValueOnce(response({ ...access, roles: [], permissions: [] }));
  vi.stubGlobal("fetch", fetcher);
  const first = await accessApi.load();
  expect(first.owner).toBe("customer");
  expect(Object.isFrozen(first.permissions)).toBe(true);
  expect((await accessApi.load()).permissions).toEqual([]);
  expect(fetcher.mock.calls[0][1].cache).toBe("no-store");
});

it.each([
  { ...access, account_id: "" }, { ...access, roles: ["root"] },
  { ...access, roles: ["customer", "customer"] }, { ...access, permissions: ["*"] },
  { ...access, permissions: ["account.read_self", "account.read_self"] },
])("rejects malformed access metadata without inferring grants", async value => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(value)));
  await expect(accessApi.load()).rejects.toThrow("unknown");
});

it("verified access expiry clears private caches; a permission denial does not", async () => {
  sessionLifecycle.authenticated("customer", sessionLifecycle.capture());
  const clear = vi.fn(), unregister = sessionLifecycle.registerPrivateCache(clear);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("{}", { status: 403 }))
    .mockResolvedValueOnce(new Response("{}", { status: 401 })));
  try {
    await expect(accessApi.load()).rejects.toThrow("denied");
    expect(clear).not.toHaveBeenCalled();
    await expect(accessApi.load()).rejects.toThrow("denied");
    expect(clear).toHaveBeenCalledOnce();
  } finally { unregister(); }
});

it("late permissions cannot restore the previous account after logout", async () => {
  let finish!: (value: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
  const pending = accessApi.load();
  sessionLifecycle.authenticated(null, sessionLifecycle.capture());
  finish(response({ ...access, roles: ["admin"], permissions: ["identity.manage"] }));
  await expect(pending).rejects.toThrow("denied");
});

it("older permission reads cannot replace a newer revocation", async () => {
  let finish!: (value: Response) => void;
  vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(response({ ...access, roles: [], permissions: [] })));
  const pending = accessApi.load();
  expect((await accessApi.load()).permissions).toEqual([]);
  finish(response(access));
  await expect(pending).rejects.toThrow("denied");
});
