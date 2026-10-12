import type { LiveSessionEvent } from "../../design/auth";
import { accessApi, type AccountAccess } from "./access";

export type AccessState = Readonly<{
  status: "checking" | "ready" | "denied" | "unavailable";
  access: AccountAccess | null;
}>;
const initial: AccessState = Object.freeze({ status: "checking", access: null });
type Api = {
  load: () => Promise<AccountAccess>;
  subscribe: (listener: (event: LiveSessionEvent) => void) => () => void;
};

// One request stream shared by mounted consumers; never persist permission grants.
export class AccessStore {
  private value: AccessState = initial;
  private listeners = new Set<() => void>();
  private generation = 0;
  private disconnect: (() => void) | null = null;
  constructor(private api: Api) {}
  getSnapshot = () => this.value;
  getServerSnapshot = () => initial;
  private set(status: AccessState["status"], access: AccountAccess | null = null) {
    this.value = Object.freeze({ status, access });
    for (const listener of [...this.listeners]) listener();
  }
  refresh = async () => {
    if (!this.listeners.size) return;
    const request = ++this.generation;
    // Hide grants until the current server check completes, including after failures.
    this.set("checking");
    try {
      const access = await this.api.load();
      if (request === this.generation && this.listeners.size) this.set("ready", access);
    } catch (error) {
      if (request !== this.generation || !this.listeners.size) return;
      this.set(error instanceof Error && error.message === "denied" ? "denied" : "unavailable");
    }
  };
  subscribe = (listener: () => void) => {
    // Separate subscriptions even when callers happen to reuse a callback.
    const notify = () => listener();
    this.listeners.add(notify);
    if (this.listeners.size === 1) {
      this.disconnect = this.api.subscribe(event => {
        if (event.type === "changed" && event.signedOut) {
          this.generation += 1;
          this.set("denied");
        } else void this.refresh();
      });
      void this.refresh();
    }
    return () => {
      this.listeners.delete(notify);
      if (!this.listeners.size) {
        this.generation += 1;
        this.disconnect?.(); this.disconnect = null;
        this.value = initial;
      }
    };
  };
}

export const accountAccessStore = new AccessStore(accessApi);
