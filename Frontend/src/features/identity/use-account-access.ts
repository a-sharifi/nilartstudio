"use client";

import { useSyncExternalStore } from "react";
import { accountAccessStore } from "./access-store";

// UI visibility only. Business endpoints must still enforce permissions and ownership.
export function useAccountAccess() {
  return useSyncExternalStore(accountAccessStore.subscribe,
    accountAccessStore.getSnapshot, accountAccessStore.getServerSnapshot);
}
