"use client";

import { useEffect, type ReactNode } from "react";
import { sessionLifecycle } from "./session-lifecycle";

export function SessionLifecycleProvider({ children }: { children: ReactNode }) {
  useEffect(() => sessionLifecycle.connect(window), []);
  return children;
}
