"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { installHistoryGuard, type NavigationGuard } from "./history-guard";

const GuardContext = createContext<((guard: NavigationGuard | null) => void) | null>(null);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const active = useRef<NavigationGuard | null>(null);
  const registerGuard = useCallback((guard: NavigationGuard | null) => { active.current = guard; }, []);
  useEffect(() => installHistoryGuard(window, () => active.current), []);
  return <GuardContext.Provider value={registerGuard}>{children}</GuardContext.Provider>;
}

export function useNavigationGuard() {
  const registerGuard = useContext(GuardContext);
  if (!registerGuard) throw new Error("NavigationGuardProvider is required");
  return registerGuard;
}
