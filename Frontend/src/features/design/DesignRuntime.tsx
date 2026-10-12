"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import App from "../../design/App";
import AdminDashboard from "../../design/AdminDashboard";
import ArtistDashboard from "../../design/ArtistDashboard";
import AuthPage from "../../design/AuthPage";
import ProfilePage from "../../design/ProfilePage";
import { profileApi } from "../identity/profile";
import { checkSession, completePassword, loginPassword, logoutSession, requestOtp, verifyOtp } from "../identity/adapter";

export default function DesignRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!demo && /^\/(fa|en)\/account\/profile$/.test(pathname)) {
    return <div className="live-profile"><ProfilePage page={pathname} liveApi={profileApi}
      navigate={(route) => router.push(route)} registerGuard={() => {}} /></div>;
  }
  if (!demo && (/^\/(fa|en)\/auth\/(?:login(?:\/(?:password|otp))?|register(?:\/(?:password|set-password))?|forgot-password|reset-password|verify|logout)\/?$/.test(pathname) || pathname === "/login")) {
    return <div className="live-auth"><AuthPage page={pathname} search={search.toString() ? `?${search}` : ""}
      navigate={(route) => router.push(route)} liveSignIn={loginPassword}
      liveApi={{ request: requestOtp, verify: verifyOtp, complete: completePassword, logout: logoutSession, checkSession }} /></div>;
  }
  // Explicit connected-route allowlist; newly imported routes are not accidentally live.
  const connected = /^\/(?:fa|en)?\/?$/.test(pathname)
    || /^\/(?:fa\/|en\/)?collections(?:\/[^/]+)?\/?$/.test(pathname);

  if (!demo && !connected) {
    return <main className="container section"><h1>Backend connection required</h1>
      <p>This design route is preserved, but its simulated transactions are disabled in live mode.</p>
      <a className="button secondary" href="/">Back to shop</a></main>;
  }
  return <>
    {demo && <div role="status" className="announcement">DEMO — design reference data, no real transactions</div>}
    {/^\/(fa|en)\/admin(\/|$)/.test(pathname) ? <AdminDashboard />
      : /^\/(fa|en)\/artist(\/|$)/.test(pathname) ? <ArtistDashboard /> : <App />}
  </>;
}
