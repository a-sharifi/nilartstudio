import { afterEach, expect, it, vi } from "vitest";
import { profileApi } from "../src/features/identity/profile";
import { profileFixture, validateProfile } from "../src/design/profile";

afterEach(() => vi.unstubAllGlobals());

it("profile reads never fall back to demo data", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
  await expect(profileApi.load()).rejects.toThrow("denied");
});

it("profile uses CSRF and binds the previously loaded owner", async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: "fresh" })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ account_id: "owner", full_name: "Name", phone: "+989123456789", version: 2 })));
  vi.stubGlobal("fetch", fetcher);
  expect((await profileApi.save({ fullName: "Name", version: 1 }, "owner")).version).toBe(2);
  expect(fetcher.mock.calls[1][1].headers["X-Profile-Owner"]).toBe("owner");
});

it("a disconnected profile save is unknown, not failed or successful", async () => {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: "fresh" })))
    .mockRejectedValueOnce(new Error("offline")));
  await expect(profileApi.save({ fullName: "Name", version: 1 }, "owner")).rejects.toThrow("unknown");
});

it("profile validation counts Unicode characters like the backend", () => {
  const policy = profileFixture("normal").policy;
  expect(validateProfile({ fullName: "😀".repeat(120), email: "" }, policy)).toEqual({});
  expect(validateProfile({ fullName: "😀".repeat(121), email: "" }, policy).fullName).toBe("name-length");
});
