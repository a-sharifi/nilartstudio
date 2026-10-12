import { afterEach, expect, it, vi } from "vitest";
import { SessionLifecycle, sessionLifecycle } from "../src/features/identity/session-lifecycle";
import { checkSession } from "../src/features/identity/adapter";
import { profileApi } from "../src/features/identity/profile";

afterEach(() => vi.unstubAllGlobals());

it("clears private caches only after verified changes, including same-owner fresh sessions", () => {
  const lifecycle = new SessionLifecycle(), clear = vi.fn(), listener = vi.fn();
  lifecycle.registerPrivateCache(clear); lifecycle.subscribe(listener);
  const revision = lifecycle.capture();
  lifecycle.revalidate(); lifecycle.observe(null, revision);
  expect(clear).not.toHaveBeenCalled();
  lifecycle.authenticated("a", revision);
  expect(clear).toHaveBeenCalledTimes(1);
  expect(lifecycle.observe("old", revision)).toBe(false);
  lifecycle.authenticated("a", lifecycle.capture());
  expect(clear).toHaveBeenCalledTimes(2);
});

it("browser hints, focus, visibility and restored pages request verification without granting access", () => {
  const channels: { onmessage?: (event: { data: unknown }) => void }[] = [];
  const close = vi.fn();
  class Channel {
    constructor() { channels.push(this); }
    onmessage?: (event: { data: unknown }) => void;
    postMessage = vi.fn(); close = close;
  }
  vi.stubGlobal("BroadcastChannel", Channel);
  const lifecycle = new SessionLifecycle(), listener = vi.fn(), clear = vi.fn();
  lifecycle.subscribe(listener); lifecycle.registerPrivateCache(clear);
  const disconnect = lifecycle.connect(window);
  channels[0].onmessage?.({ data: { type: "session-changed", account_id: "forged" } });
  window.dispatchEvent(new Event("focus"));
  window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  expect(listener).toHaveBeenCalledTimes(3);
  expect(clear).not.toHaveBeenCalled();
  disconnect(); window.dispatchEvent(new Event("focus"));
  expect(listener).toHaveBeenCalledTimes(3); expect(close).toHaveBeenCalledOnce();
});

it("a late session denial cannot replace a newer verified login", async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
  const pending = checkSession();
  sessionLifecycle.authenticated("new-owner", sessionLifecycle.capture());
  finish(new Response("{}", { status: 401 }));
  expect(await pending).toBe("unknown");
});

it("late profile data cannot restore information after verified logout", async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
  const pending = profileApi.load();
  sessionLifecycle.authenticated(null, sessionLifecycle.capture());
  finish(new Response(JSON.stringify({ account_id: "old", full_name: "Private", phone: "+989123456789", version: 1 })));
  await expect(pending).rejects.toThrow("denied");
});

it("an older profile read cannot reverse a newer owner observation", async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ account_id: "new", full_name: "New", phone: "+989123456789", version: 1 }))));
  const old = profileApi.load();
  expect((await profileApi.load()).owner).toBe("new");
  finish(new Response(JSON.stringify({ account_id: "old", full_name: "Old", phone: "+989123456789", version: 1 })));
  await expect(old).rejects.toThrow("denied");
});

it.each(["bootstrap", "save"])("%s session expiry clears registered private caches", async (stage) => {
  sessionLifecycle.authenticated("customer", sessionLifecycle.capture());
  const clear = vi.fn(), unregister = sessionLifecycle.registerPrivateCache(clear);
  const fetcher = vi.fn();
  if (stage === "save") fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: "fresh" })));
  fetcher.mockResolvedValueOnce(new Response("{}", { status: 401 }));
  vi.stubGlobal("fetch", fetcher);
  try {
    await expect(profileApi.save({ fullName: "Draft", version: 1 }, "customer")).rejects.toThrow("denied");
    expect(clear).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledTimes(stage === "save" ? 2 : 1);
  } finally { unregister(); }
});

it("late bootstrap expiry cannot clear a newer account's private cache", async () => {
  sessionLifecycle.authenticated("old", sessionLifecycle.capture());
  let finish!: (response: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal("fetch", fetcher);
  const pending = profileApi.save({ fullName: "Draft", version: 1 }, "old");
  sessionLifecycle.authenticated("new", sessionLifecycle.capture());
  const clear = vi.fn(), unregister = sessionLifecycle.registerPrivateCache(clear);
  try {
    finish(new Response("{}", { status: 401 }));
    await expect(pending).rejects.toThrow("denied");
    expect(clear).not.toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledOnce();
  } finally { unregister(); }
});

it("profile permission rejection does not revoke a valid shared session", async () => {
  sessionLifecycle.authenticated("customer", sessionLifecycle.capture());
  const clear = vi.fn(), unregister = sessionLifecycle.registerPrivateCache(clear);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })));
  try {
    await expect(profileApi.load()).rejects.toThrow("denied");
    expect(clear).not.toHaveBeenCalled();
  } finally { unregister(); }
});
