import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSession, completePassword, loginPassword, logoutSession, normalizeIranPhone, requestOtp, verifyOtp } from "../src/features/identity/adapter";

afterEach(() => vi.unstubAllGlobals());

describe("live identity adapter", () => {
  it("normalizes local digits and country prefixes", () => {
    for (const value of ["۰۹۱۲۳۴۵۶۷۸۹", "912 345 6789", "+989123456789", "00989123456789"])
      expect(normalizeIranPhone(value)).toBe("+989123456789");
    expect(normalizeIranPhone("+12025550100")).toBeNull();
  });

  it("requires a real verified matching session before reporting success", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ account_id: "a", csrf_token: "secret" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ account_id: "a" })));
    vi.stubGlobal("fetch", fetcher);
    expect(await loginPassword("09123456789", "a secure passphrase")).toBe("success");
    expect(fetcher.mock.calls[0][0]).toBe("/api/v1/auth/login/password");
    expect(fetcher.mock.calls[1][0]).toBe("/api/v1/auth/session");
  });

  it("rejects success when the session is missing or belongs to another account", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ account_id: "a", csrf_token: "secret" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ account_id: "b" })));
    vi.stubGlobal("fetch", fetcher);
    expect(await loginPassword("09123456789", "a secure passphrase")).toBe("service");
  });

  it.each([[401, "incorrect"], [429, "limited"], [503, "service"]])(
    "maps HTTP %s without simulated success", async (status, expected) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: Number(status) })));
      expect(await loginPassword("09123456789", "a secure passphrase")).toBe(expected);
    });

  it("reports network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await loginPassword("09123456789", "a secure passphrase")).toBe("network");
  });
});

describe("verified logout", () => {
  it("bootstraps CSRF after reload and confirms server session absence", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: "fresh-token" })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await logoutSession()).toBe("success");
    expect(fetcher.mock.calls[0][0]).toBe("/api/v1/auth/session/csrf");
    expect(fetcher.mock.calls[1][1].headers["X-CSRF-Token"]).toBe("fresh-token");
  });
  it("does not claim logout if session remains valid", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf_token: "fresh-token" })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ account_id: "still-active" }))));
    expect(await logoutSession()).toBe("unknown");
  });
  it("treats disconnected logout as an unknown outcome", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await logoutSession()).toBe("unknown");
    expect(await checkSession()).toBe("unknown");
  });
});

describe("live OTP adapter", () => {
  const challenge = {
    challenge_id: "2d35793f-cf30-42f1-9559-639e12fb6311", purpose: "register",
    expires_at: new Date(Date.now() + 180000).toISOString(), resend_after_seconds: 60,
    delivery_status: "accepted",
  };
  it("creates a live challenge only from accepted valid server metadata", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(challenge))));
    const flow = await requestOtp("۰۹۱۲۳۴۵۶۷۸۹", "register");
    expect(flow.demo).toBe(false);
    expect(flow.phone).toBe("+989123456789");
    expect(flow.challengeId).toBe(challenge.challenge_id);
    expect(flow.resendAt).toBeGreaterThan(Date.now());
  });
  it("does not infer challenge acceptance from malformed responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...challenge, purpose: "login" }))));
    await expect(requestOtp("09123456789", "register")).rejects.toThrow("unknown");
  });
  it("maps disabled SMS to service unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "sms_unavailable" }), { status: 503 })));
    await expect(requestOtp("09123456789", "register")).rejects.toThrow("service");
  });
  it("treats network loss after a mutation as an unknown outcome", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(completePassword("x".repeat(43), "register", "a long secure passphrase")).rejects.toThrow("unknown");
  });
  it("binds verification grants to the requested purpose", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(challenge)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ grant: "x".repeat(43), purpose: "recovery", expires_in_seconds: 600 })));
    vi.stubGlobal("fetch", fetcher);
    const flow = await requestOtp("09123456789", "register");
    await expect(verifyOtp(flow, "123456")).rejects.toThrow("unknown");
  });
});
