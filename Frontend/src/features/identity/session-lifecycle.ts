import type { LiveSessionEvent } from "../../design/auth";

// Only authenticated API responses establish an owner. Browser messages are
// deliberately payload-free hints which ask subscribers to query their APIs.
export class SessionLifecycle {
  private revision = 0;
  private owner: string | null | undefined;
  private listeners = new Set<(event: LiveSessionEvent) => void>();
  private caches = new Set<() => void>();
  private announce: (() => void) | null = null;

  capture() { return this.revision; }
  current(revision: number) { return revision === this.revision; }
  subscribe = (listener: (event: LiveSessionEvent) => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  registerPrivateCache(clear: () => void) {
    this.caches.add(clear);
    return () => { this.caches.delete(clear); };
  }
  private emit(event: LiveSessionEvent) {
    for (const listener of [...this.listeners]) listener(event);
  }
  private change(owner: string | null, source: "authentication" | "observation") {
    this.owner = owner;
    this.revision += 1;
    for (const clear of this.caches) clear();
    this.emit({ type: "changed", source, signedOut: owner === null });
  }
  observe(owner: string | null, revision: number) {
    if (!this.current(revision)) return false;
    // Learning that a guest is still a guest must not discard a guest OTP flow.
    if (this.owner === undefined && owner === null) this.owner = null;
    else if (this.owner !== owner) this.change(owner, "observation");
    return true;
  }
  authenticated(owner: string | null, revision: number) {
    if (!this.current(revision)) return false;
    // A fresh login/recovery rotates the session even when the owner is unchanged.
    this.change(owner, "authentication");
    this.announce?.();
    return true;
  }
  revalidate = () => { this.emit({ type: "revalidate" }); };

  connect(browser: Window) {
    const Channel = (browser as Window & { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
    const channel = Channel ? new Channel("nilart-auth-status") : null;
    if (channel) channel.onmessage = event => {
      if (event.data?.type === "session-changed") this.revalidate();
    };
    const announce = () => { channel?.postMessage({ type: "session-changed" }); };
    this.announce = announce;
    const visible = () => { if (browser.document.visibilityState === "visible") this.revalidate(); };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) this.revalidate(); };
    browser.addEventListener("focus", this.revalidate);
    browser.addEventListener("pageshow", restored);
    browser.document.addEventListener("visibilitychange", visible);
    return () => {
      browser.removeEventListener("focus", this.revalidate);
      browser.removeEventListener("pageshow", restored);
      browser.document.removeEventListener("visibilitychange", visible);
      channel?.close();
      if (this.announce === announce) this.announce = null;
    };
  }
}

export const sessionLifecycle = new SessionLifecycle();
