import { expect, it, vi } from "vitest";
import { AccessStore } from "../src/features/identity/access-store";
import type { LiveSessionEvent } from "../src/design/auth";

const access = { owner: "customer", roles: ["customer"] as const, permissions: ["account.read_self"] };
function fixture(load = vi.fn().mockResolvedValue(access)) {
  let listener!: (event: LiveSessionEvent) => void;
  const disconnect = vi.fn();
  const subscribe = vi.fn(callback => { listener = callback; return disconnect; });
  const store = new AccessStore({ load, subscribe });
  return { store, load, subscribe, disconnect, event: (event: LiveSessionEvent) => listener(event) };
}
async function settle() { await Promise.resolve(); await Promise.resolve(); }

it("shares one initial read between consumers and releases grants after the final unsubscribe", async () => {
  const { store, load, subscribe, disconnect } = fixture();
  const first = store.subscribe(vi.fn()), second = store.subscribe(vi.fn());
  await settle();
  expect(load).toHaveBeenCalledOnce(); expect(subscribe).toHaveBeenCalledOnce();
  expect(store.getSnapshot().status).toBe("ready");
  first(); expect(store.getSnapshot().access?.owner).toBe("customer");
  second(); expect(disconnect).toHaveBeenCalledOnce(); expect(store.getSnapshot().access).toBeNull();
});

it("hints hide previous grants while checking and failed checks do not restore them", async () => {
  const { store, load, event } = fixture();
  const stop = store.subscribe(vi.fn()); await settle();
  load.mockRejectedValueOnce(new Error("offline"));
  event({ type: "revalidate" });
  expect(store.getSnapshot()).toEqual({ status: "checking", access: null });
  await settle(); expect(store.getSnapshot()).toEqual({ status: "unavailable", access: null });
  await store.refresh(); expect(store.getSnapshot().status).toBe("ready"); stop();
});

it("logout immediately discards grants and rejects an older positive response", async () => {
  let finish!: (value: typeof access) => void;
  const { store, event } = fixture(vi.fn(() => new Promise(resolve => { finish = resolve; })));
  const stop = store.subscribe(vi.fn());
  event({ type: "changed", source: "observation", signedOut: true });
  finish(access); await settle();
  expect(store.getSnapshot()).toEqual({ status: "denied", access: null }); stop();
});

it("a newer revocation read cannot be overwritten by older grants", async () => {
  let finish!: (value: typeof access) => void;
  const load = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce({ ...access, permissions: [] });
  const { store, event } = fixture(load);
  const stop = store.subscribe(vi.fn());
  event({ type: "revalidate" }); await settle();
  finish(access); await settle();
  expect(store.getSnapshot().access?.permissions).toEqual([]); stop();
});

it("unmounted responses cannot restore a cache and new consumers get a fresh read", async () => {
  let finish!: (value: typeof access) => void;
  const load = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(access);
  const { store } = fixture(load);
  store.subscribe(vi.fn())(); finish(access); await settle();
  expect(store.getSnapshot().access).toBeNull();
  const stop = store.subscribe(vi.fn()); await settle(); expect(load).toHaveBeenCalledTimes(2); stop();
});

it("permission denial removes prior grants without retaining an authorized snapshot", async () => {
  const { store, load } = fixture();
  const stop = store.subscribe(vi.fn()); await settle();
  load.mockRejectedValueOnce(new Error("denied"));
  await store.refresh();
  expect(store.getSnapshot()).toEqual({ status: "denied", access: null }); stop();
});

it("server snapshots never expose private access and disconnected refreshes do not request data", async () => {
  const { store, load } = fixture();
  await store.refresh(); expect(load).not.toHaveBeenCalled();
  const stop = store.subscribe(vi.fn()); await settle();
  expect(store.getSnapshot().status).toBe("ready");
  expect(store.getServerSnapshot()).toEqual({ status: "checking", access: null }); stop();
});
