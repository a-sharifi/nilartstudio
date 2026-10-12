import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { accessApi } from "../src/features/identity/access";
import { accountAccessStore } from "../src/features/identity/access-store";
import { sessionLifecycle } from "../src/features/identity/session-lifecycle";
import { useAccountAccess } from "../src/features/identity/use-account-access";

it("mounted hooks share fresh access, recheck lifecycle signals and clear the final snapshot", async () => {
  const load = vi.spyOn(accessApi, "load").mockResolvedValue({
    owner: "customer", roles: ["customer"], permissions: ["account.read_self"],
  });
  const first = renderHook(useAccountAccess), second = renderHook(useAccountAccess);
  try {
    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    expect(second.result.current.access?.owner).toBe("customer");
    expect(load).toHaveBeenCalledOnce();
    load.mockResolvedValueOnce({ owner: "customer", roles: [], permissions: [] });
    act(() => sessionLifecycle.revalidate());
    await waitFor(() => expect(first.result.current.access?.permissions).toEqual([]));
    expect(second.result.current.access?.permissions).toEqual([]);
  } finally {
    first.unmount(); second.unmount(); load.mockRestore();
  }
  expect(accountAccessStore.getSnapshot().access).toBeNull();
});
