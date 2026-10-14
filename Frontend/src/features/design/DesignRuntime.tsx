"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isStaticInfoPage } from "./information-routes";
import App from "../../design/App";
import CustomerPages from "../customer/CustomerPages";
import AddressesPage from "../../design/AddressesPage";
import {addressApi,preferencesApi,supportApi} from "../customer/api";
import SupportPage from "../../design/SupportPage";
import AccountPreferencesPage from "../../design/AccountPreferencesPage";
import PanelAccessBoundary from "../identity/PanelAccessBoundary";
import AccountManagementPage from "../admin/AccountManagementPage";
import AdminDashboard from "../../design/AdminDashboard";
import ArtistDashboard from "../../design/ArtistDashboard";
import AuthPage, { clearLiveAuthMemory } from "../../design/AuthPage";
import PhoneChangePage from "../identity/PhoneChangePage";
import SecurityPage from "../../design/SecurityPage";
import {securityApi} from "../identity/security";
import ProfilePage from "../../design/ProfilePage";
import { profileApi } from "../identity/profile";
import { useNavigationGuard } from "../navigation/NavigationGuardProvider";
import { liveAuthApi, loginPassword } from "../identity/adapter";

import { sessionLifecycle } from "../identity/session-lifecycle";

sessionLifecycle.registerPrivateCache(clearLiveAuthMemory);

export default function DesignRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const registerGuard = useNavigationGuard();
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!demo && /^\/(fa|en)\/account\/support\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="account.read_self" path={pathname}><SupportPage key={pathname} page={pathname} search={search.toString()} navigate={route=>router.push(route)} registerGuard={registerGuard} liveApi={supportApi}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account\/preferences\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="account.read_self" path={pathname}><AccountPreferencesPage key={pathname} page={pathname} navigate={route=>router.push(route)} registerGuard={registerGuard} liveApi={preferencesApi}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account\/addresses\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="account.read_self" path={pathname}><AddressesPage key={pathname} page={pathname} search={search.toString()} navigate={route=>router.push(route)} liveApi={addressApi}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account(?:\/(favorites|preferences|notifications|support)(?:\/[0-9a-f-]{36})?)?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="account.read_self" path={pathname}><CustomerPages key={pathname} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(users|roles)\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="identity.manage" path={pathname}><AccountManagementPage key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account\/security\/change-phone$/.test(pathname)) {
    return <PanelAccessBoundary permission="account.write_self" path={pathname}><PhoneChangePage key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account\/security$/.test(pathname)) {
    return <SecurityPage key={pathname} page={pathname} navigate={route=>router.push(route)} liveApi={securityApi}/>;
  }
  if (!demo && /^\/(fa|en)\/account\/profile$/.test(pathname)) {
    return <div className="live-profile"><ProfilePage page={pathname} liveApi={profileApi}
      navigate={(route) => router.push(route)} registerGuard={registerGuard} /></div>;
  }
  if (!demo && (/^\/(fa|en)\/auth\/(?:login(?:\/(?:password|otp))?|register(?:\/(?:password|set-password))?|forgot-password|reset-password|verify|logout|session-expired)\/?$/.test(pathname) || pathname === "/login")) {
    return <div className="live-auth"><AuthPage page={pathname} search={search.toString() ? `?${search}` : ""}
      navigate={(route) => router.push(route)} liveSignIn={loginPassword}
      liveApi={liveAuthApi} /></div>;
  }
  if (!demo && /^\/(fa|en)\/(admin|artist)(\/|$)/.test(pathname)) {
    const artist=pathname.includes("/artist"),en=pathname.startsWith("/en/");
    return <PanelAccessBoundary permission={artist?"commissions.work_assigned":["catalog.manage","identity.manage","inventory.manage","finance.read","orders.read_all","commissions.manage"]} path={pathname}><main className="ad-session"><h1>{en?"This workflow is not connected yet":"این بخش هنوز به سرویس متصل نشده است"}</h1><p>{en?"Its reference design is preserved; live business actions will open after their backend is implemented.":"طراحی مرجع حفظ شده است؛ پس از تکمیل سرویس، اقدامات این بخش فعال می‌شوند."}</p><a className="button secondary" href={en?"/en":"/fa"}>{en?"Back to shop":"بازگشت به فروشگاه"}</a></main></PanelAccessBoundary>;
  }
  // Explicit connected-route allowlist; newly imported routes are not accidentally live.
  const connected = /^\/(?:fa\/|en\/)?cart\/?$/.test(pathname) || isStaticInfoPage(pathname)
    || /^\/(?:fa\/|en\/)?products\/[^/]+\/?$/.test(pathname)
    || /^\/(?:fa\/|en\/)?bundles(?:\/[^/]+)?\/?$/.test(pathname)
    || /^\/(?:fa\/|en\/)?commissions(?:\/new)?\/?$/.test(pathname)
    || /^\/(?:fa|en)\/commissions\/new\/(?:references?|preferences)\/?$/.test(pathname)
    || /^\/(?:fa\/|en\/)?artworks(?:\/[^/]+)?\/?$/.test(pathname)
    || /^\/(?:fa|en)?\/?$/.test(pathname)
    || /^\/(?:fa|en)\/(?:shop|categories\/[^/]+)\/?$/.test(pathname)
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
