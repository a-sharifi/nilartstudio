export type NavigationGuard = (proceed: () => void) => boolean;

const markerKey = "__nilartHistory";
type Marker = { session: string; position: number };

function marker(state: unknown): Marker | null {
  if (!state || typeof state !== "object" || !(markerKey in state)) return null;
  const value = state[markerKey];
  if (!value || typeof value !== "object" || !("session" in value) || !("position" in value)
    || typeof value.session !== "string" || !Number.isSafeInteger(value.position)) return null;
  return value as Marker;
}

// Keep Next's router state intact. Block its popstate handler while undoing a
// denied traversal, then replay that exact traversal only after explicit consent.
export function installHistoryGuard(browser: Window, getGuard: () => NavigationGuard | null) {
  const history = browser.history;
  const navigation = (browser as Window & {
    navigation?: { currentEntry?: { index: number } | null };
  }).navigation;
  const nativePosition = () => {
    const index = navigation?.currentEntry?.index;
    return typeof index === "number" && index >= 0 ? index : null;
  };
  const route = () => browser.location.pathname + browser.location.search;
  const initial = marker(history.state);
  const session = initial?.session ?? browser.crypto.randomUUID();
  let position = nativePosition() ?? initial?.position ?? 0;
  let acceptedRoute = route();
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  type Attempt = { origin: number; target: number; guard: NavigationGuard; approved: boolean };
  let pending: Attempt | null = null;
  let restoring: number | null = null;
  let replaying: number | null = null;

  const withMarker = (state: unknown, next: number) => ({
    ...(state && typeof state === "object" ? state : {}),
    [markerKey]: { session, position: next },
  });
  const reset = () => { pending = null; restoring = null; replaying = null; };
  const push: History["pushState"] = function (state, unused, url) {
    const next = (nativePosition() ?? position) + 1;
    originalPush.call(history, withMarker(state, next), unused, url);
    position = next;
    acceptedRoute = route();
    reset();
  };
  const replace: History["replaceState"] = function (state, unused, url) {
    position = nativePosition() ?? position;
    originalReplace.call(history, withMarker(state, position), unused, url);
    acceptedRoute = route();
  };
  history.pushState = push;
  history.replaceState = replace;
  originalReplace.call(history, withMarker(history.state, position), "");

  const replay = (attempt: Attempt) => {
    if (pending !== attempt || restoring !== null || !attempt.approved) return;
    // A session/account change can unregister the old form's pending action.
    if (getGuard() !== attempt.guard) { pending = null; return; }
    pending = null;
    replaying = attempt.target;
    history.go(attempt.target - position);
  };
  const onPopState = (event: PopStateEvent) => {
    const target = marker(event.state);
    // Native indices include fragment entries which never called pushState.
    // Older browsers use markers on application-created entries instead.
    const targetPosition = nativePosition() ?? (target?.session === session ? target.position : null);
    if (targetPosition === null) return;
    if (restoring !== null) {
      event.stopImmediatePropagation();
      if (targetPosition !== restoring) {
        history.go(restoring - targetPosition);
        return;
      }
      position = restoring;
      acceptedRoute = route();
      restoring = null;
      if (pending) replay(pending);
      return;
    }
    if (replaying === targetPosition) {
      position = targetPosition;
      acceptedRoute = route();
      replaying = null;
      return;
    }
    const guard = getGuard();
    if (!guard || targetPosition === position || route() === acceptedRoute) {
      position = targetPosition; acceptedRoute = route(); return;
    }
    const attempt: Attempt = { origin: position, target: targetPosition, guard, approved: false };
    let checking = true;
    const allowed = guard(() => {
      if (checking) return;
      attempt.approved = true;
      replay(attempt);
    });
    checking = false;
    if (allowed) { position = targetPosition; acceptedRoute = route(); pending = null; return; }
    event.stopImmediatePropagation();
    pending = attempt;
    restoring = attempt.origin;
    history.go(attempt.origin - attempt.target);
  };
  browser.addEventListener("popstate", onPopState, true);
  return () => {
    reset();
    browser.removeEventListener("popstate", onPopState, true);
    if (history.pushState === push) history.pushState = originalPush;
    if (history.replaceState === replace) history.replaceState = originalReplace;
  };
}
