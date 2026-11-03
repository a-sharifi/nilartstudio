import ShopDashboard from "../admin/ShopDashboard";
import ProductDetailWorkspace from "../admin/ProductDetailWorkspace";
import {isShopRoute} from "../../design/shop";
import PromotionsPanel from "../admin/PromotionsPanel";
import ProductsWorkspace from "../admin/ProductsWorkspace";
"use client"
import SystemErrorPage from "../system/SystemErrorPage";
import ArtworksPanel from "../admin/ArtworksPanel";
import CatalogProfilePanel from "../admin/CatalogProfilePanel";
import CuttingPanel from "../admin/CuttingPanel";
import BundlesPanel from "../admin/BundlesPanel";
import SupplierBalancesPanel from '../admin/SupplierBalancesPanel';
import WastePanel from "../admin/WastePanel";
import ReportsPanel from "../admin/ReportsPanel";
import PricingPanel from "../admin/PricingPanel";
import SimpleCommercePanel from "../admin/SimpleCommercePanel";
import FinancePanel from "../admin/FinancePanel";
import SupplierFinancialPanel from "../admin/SupplierFinancialPanel";
import OpeningSettlementsPanel from "../admin/OpeningSettlementsPanel";
import ProductionPanel from "../admin/ProductionPanel";
import PurchasesPanel from "../admin/PurchasesPanel";
import MediaPanel from "../admin/MediaPanel";
import ContentPanel from "../admin/ContentPanel";
import InventoryPanel from "../admin/InventoryPanel";
import BusinessSettingsPanel from "../admin/BusinessSettingsPanel";
import DiscountsPanel from "../admin/DiscountsPanel";
import SuppliersPanel from "../admin/SuppliersPanel";
import SandboxCheckout from "../payments/SandboxCheckout";
import CommissionPublishingPanel from "../admin/CommissionPublishingPanel";
import CostResources from "../admin/CostResources";
import RecipesPanel from "../admin/RecipesPanel";
import RecipeReviewQueue from "../admin/RecipeReviewQueue";
import ActivityLog from "../admin/ActivityLog";
import RefundsPanel from "../admin/RefundsPanel";
import OrderReviewPanel from "../admin/OrderReviewPanel";

import { usePathname, useRouter, useSearchParams, redirect } from "next/navigation";
import { isCommissionRoute } from "../../design/commissions";
import { isStaticInfoPage } from "./information-routes";
import App from "../../design/App";
import CustomerWriteAccess from "../customer/CustomerWriteAccess";
import CustomerPages from "../customer/CustomerPages";
import OrderRequestsPanel from "../customer/OrderRequestsPanel";
import DownloadsPanel from "../customer/DownloadsPanel";
import CommissionsPanel from "../customer/CommissionsPanel";
import OrdersPanel from "../customer/OrdersPanel";
import AccountPanel from "../customer/AccountPanel";
import AddressesPage from "../../design/AddressesPage";
import {addressApi,preferencesApi,supportApi} from "../customer/api";
import SupportPage from "../../design/SupportPage";
import AccountPreferencesPage from "../../design/AccountPreferencesPage";
import PanelAccessBoundary from "../identity/PanelAccessBoundary";
import AccountManagementPage from "../admin/AccountManagementPage";
import SupportInbox from "../admin/SupportInbox";
import ShipmentsPanel from "../admin/ShipmentsPanel";
import OrderStockPanel from "../admin/OrderStockPanel";
import AdminOrders from "../admin/AdminOrders";
import PaymentsPanel from "../admin/PaymentsPanel";
import AdminPanel, {adminPermission} from "../admin/AdminPanel";
import CatalogEditor from "../admin/CatalogEditor";
import ProductOptionsEditor from "../admin/ProductOptionsEditor";
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
  if (!demo && /^\/(fa|en)\/admin\/(?:channels|integrations)(?:\/.*)?$/.test(pathname)) {
    return redirect(`/${pathname.startsWith('/en/')?'en':'fa'}/admin/products`);
  }
  if(!demo&&/^\/(fa|en)\/(?:checkout\/sandbox|payment\/result)\/?$/.test(pathname))return <SandboxCheckout path={pathname} search={search.toString()} navigate={route=>router.push(route)}/>;
  if (!demo && /^\/(fa|en)\/admin\/(?:refunds|finance\/refunds)(?:\/[0-9a-f-]{36})?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="payments.read" path={pathname}><RefundsPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(?:payments|finance\/payments)\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="payments.read" path={pathname}><PaymentsPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account\/downloads\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="orders.read_self" path={pathname}><DownloadsPanel key={`${pathname}:${search.get("order")||""}`} orderId={search.get("order")||undefined} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account\/commissions(?:\/[0-9a-f-]+(?:\/artwork-review)?)?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="account.read_self" path={pathname}><CustomerWriteAccess>{canWrite=><CommissionsPanel key={pathname} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)} canWrite={canWrite}/>}</CustomerWriteAccess></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account\/(?:orders\/[0-9a-f-]+\/(?:cancel|return)|requests(?:\/[0-9a-f-]+)?)\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="orders.read_self" path={pathname}><CustomerWriteAccess>{canWrite=><OrderRequestsPanel key={pathname} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)} canWrite={canWrite}/>}</CustomerWriteAccess></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account\/orders(?:\/[0-9a-f-]+(?:\/(?:receipt|artwork-review))?)?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="orders.read_self" path={pathname}><OrdersPanel key={pathname} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account(?:\/(?:orders|downloads|commissions|requests)(?:\/.*)?)?\/?$/.test(pathname)) {
    const path=pathname.replace(/\/$/, "");
    return <PanelAccessBoundary permission="account.read_self" path={path}><AccountPanel key={path} path={path} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account\/support\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="account.read_self" path={pathname}><CustomerWriteAccess>{canWrite=><SupportPage key={pathname} page={pathname} search={search.toString()} navigate={route=>router.push(route)} registerGuard={registerGuard} liveApi={supportApi} canWrite={canWrite}/>}</CustomerWriteAccess></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account\/preferences\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="account.read_self" path={pathname}><CustomerWriteAccess>{canWrite=><AccountPreferencesPage key={pathname} page={pathname} navigate={route=>router.push(route)} registerGuard={registerGuard} liveApi={preferencesApi} canWrite={canWrite}/>}</CustomerWriteAccess></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account\/addresses\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="account.read_self" path={pathname}><CustomerWriteAccess>{canWrite=><AddressesPage key={pathname} page={pathname} search={search.toString()} navigate={route=>router.push(route)} liveApi={addressApi} canWrite={canWrite}/>}</CustomerWriteAccess></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/account(?:\/(favorites|preferences|notifications|support)(?:\/[0-9a-f-]{36})?)?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="account.read_self" path={pathname}><CustomerPages key={pathname} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission={["orders.read_all","finance.read","inventory.manage","catalog.manage"]} path={pathname}><ShopDashboard path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin(?:\/(?:stock|inventory|purchases|finance(?:\/profit)?))?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission={pathname.includes('/finance')?'finance.read':'inventory.manage'} path={pathname}><SimpleCommercePanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/media(?:\/(?:new\/)?[0-9a-f-]{36})?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="content.manage" path={pathname}><MediaPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/content(?:\/(?:about|contact|faq|buying-guide|returns|terms|privacy))?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="content.manage" path={pathname}><ContentPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/inventory(?:\/adjustments\/new|\/positions\/[0-9a-f-]{36}|\/[0-9a-f-]{36}\/movements)?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="inventory.manage" path={pathname}><InventoryPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/settings\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="identity.manage" path={pathname}><BusinessSettingsPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(?:shipments(?:\/(?:new|[0-9a-f-]{36}(?:\/label)?))?|shipping)\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="fulfillment.manage" path={pathname}><ShipmentsPanel key={pathname+search.toString()} path={pathname.replace('/admin/shipping','/admin/shipments')} search={search.toString()} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/order-stock(?:\/[0-9a-f-]{36})?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="fulfillment.manage" path={pathname}><OrderStockPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/orders(?:\/[0-9a-f-]{36}(?:\/receipt)?)?\/?$/.test(pathname)) {
    const path=pathname.replace(/\/$/, "");
    return <PanelAccessBoundary permission="orders.read_all" path={path}><AdminOrders key={path} path={path} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/support\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="support.manage" path={pathname}><SupportInbox key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/products\/[0-9a-f-]{36}\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="catalog.manage" path={pathname}><ProductDetailWorkspace key={pathname} path={pathname} initialSku={search.get("sku")||""} initialTab={search.get("tab")||"overview"} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/products\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="catalog.manage" path={pathname}><ProductsWorkspace key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(products|collections|skus)\/[0-9a-f-]{36}\/profile\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="catalog.manage" path={pathname}><CatalogProfilePanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/products\/[0-9a-f-]{36}\/(options|variants)\/?$/.test(pathname)) {
    const path=pathname.replace(/\/$/, "");
    return <PanelAccessBoundary permission="catalog.manage" path={path}><ProductOptionsEditor key={path} path={path} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(collections|categories|products)\/(?:new|[0-9a-f-]{36}\/edit)\/?$/.test(pathname)) {
    const path=pathname.replace(/\/$/, "");
    return <PanelAccessBoundary permission="catalog.manage" path={path}><CatalogEditor key={path} path={path} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(users|roles|artists)\/?$/.test(pathname)) {
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
  if (!demo && /^\/(fa|en)\/admin\/(?:reports\/(?:inventory|production)|finance\/inventory-value)\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission={["finance.read","finance.export"]} path={pathname}><ReportsPanel key={pathname} path={pathname.replace(/\/$/, "")} search={search.toString()} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/finance\/supplier-balances\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="finance.read" path={pathname}><SupplierBalancesPanel key={pathname+search.toString()} search={search.toString()} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/finance\/suppliers\/[0-9a-f-]{36}\/settlements\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="finance.read" path={pathname}><OpeningSettlementsPanel key={pathname} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/finance\/suppliers\/[0-9a-f-]{36}\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="finance.read" path={pathname}><SupplierFinancialPanel key={pathname+search.toString()} search={search.toString()} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(?:finance(?:\/(?:accounts|movements(?:\/[0-9a-f-]{36})?|receipts-payments|expenses|balances|cashflow|cash-flow|exports?))?|reports\/cashflow)\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission={/\/exports?\/?$/.test(pathname)?"finance.export":"finance.read"} path={pathname}><FinancePanel key={pathname} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/commissions(?:\/reviews)?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="commissions.manage" path={pathname}><CommissionPublishingPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/returns(?:\/[0-9a-f-]{36})?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="orders.read_all" path={pathname}><OrderReviewPanel key={pathname} path={pathname.replace("/admin/returns", "/admin/order-requests")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/order-requests(?:\/[0-9a-f-]{36})?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="orders.read_all" path={pathname}><OrderReviewPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/artworks(?:\/(?:new\/)?[0-9a-f-]{36}(?:\/edit)?)?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="catalog.manage" path={pathname}><ArtworksPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(?:bundles|packages)(?:\/(?:new\/)?[0-9a-f-]{36}(?:\/edit)?)?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="catalog.manage" path={pathname}><BundlesPanel key={pathname} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/promotions\/?$/.test(pathname)) return <PanelAccessBoundary permission="catalog.manage" path={pathname}><PromotionsPanel path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  if (!demo && /^\/(fa|en)\/admin\/discounts(?:\/(?:new\/)?[0-9a-f-]{36}(?:\/edit)?)?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="catalog.manage" path={pathname}><DiscountsPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(?:waste|inventory\/waste)\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission={["inventory.manage","production.manage"]} path={pathname}><WastePanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(?:production|inventory\/(?:production-orders|batches|quality))(?:\/(?:new|losses|[0-9a-f-]{36}(?:\/qc)?))?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="production.manage" path={pathname}><ProductionPanel key={pathname} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && (/^\/(fa|en)\/admin\/(?:purchases|inventory\/purchases)(?:\/(?:new|[0-9a-f-]{36}(?:\/receipts\/new)?))?\/?$/.test(pathname) || /^\/(fa|en)\/admin\/inventory\/receipts\/?$/.test(pathname))) {
    return <PanelAccessBoundary permission="inventory.manage" path={pathname}><PurchasesPanel key={pathname} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/suppliers(?:\/(?:new\/)?[0-9a-f-]{36}(?:\/edit)?)?\/?$/.test(pathname)) {
    const canonical=pathname.replace("/admin/suppliers", "/admin/inventory/suppliers").replace(/\/edit\/?$/, "").replace(/\/$/, "");
    return <PanelAccessBoundary permission="inventory.manage" path={pathname}><SuppliersPanel key={canonical} path={canonical} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/inventory\/suppliers(?:\/(?:new\/)?[0-9a-f-]{36})?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="inventory.manage" path={pathname}><SuppliersPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/pricing\/(?:new|reviews(?:\/[0-9a-f-]{36})?|[0-9a-f-]{36})\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="pricing.publish" path={pathname}><PricingPanel key={pathname} path={pathname.replace(/\/$/, "")} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/costing\/cutting\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="pricing.publish" path={pathname}><CuttingPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/boms(?:\/(?:new\/)?[0-9a-f-]{36}(?:\/edit)?)?\/?$/.test(pathname)) {
    const canonical=pathname.replace('/admin/boms','/admin/recipes').replace(/\/edit\/?$/,'');
    return <PanelAccessBoundary permission="pricing.publish" path={pathname}><RecipesPanel key={canonical} path={canonical} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(?:materials|service-rates)\/[0-9a-f-]{36}\/edit\/?$/.test(pathname)) {
    const canonical=pathname.replace(/\/edit\/?$/,'');
    return <PanelAccessBoundary permission="pricing.publish" path={pathname}><CostResources key={canonical} path={canonical} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/price-review\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="pricing.publish" path={pathname}><RecipeReviewQueue key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(recipes|costing)(?:\/(?:new\/)?[0-9a-f-]{36})?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="pricing.publish" path={pathname}><RecipesPanel key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(materials|service-rates)(?:\/(?:new\/)?[0-9a-f-]{36})?\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="pricing.publish" path={pathname}><CostResources key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin\/(activity|audit)\/?$/.test(pathname)) {
    return <PanelAccessBoundary permission="identity.manage" path={pathname}><ActivityLog key={pathname} path={pathname} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/admin(\/|$)/.test(pathname)) {
    const path=pathname.replace(/\/$/, "");
    return <PanelAccessBoundary permission={adminPermission(path)} path={path}><AdminPanel key={path} path={path} navigate={route=>router.push(route)}/></PanelAccessBoundary>;
  }
  if (!demo && /^\/(fa|en)\/(admin|artist)(\/|$)/.test(pathname)) {
    const artist=pathname.includes("/artist"),en=pathname.startsWith("/en/");
    return <PanelAccessBoundary permission={artist?"commissions.work_assigned":["catalog.manage","identity.manage","inventory.manage","finance.read","orders.read_all","commissions.manage"]} path={pathname}><main className="ad-session"><h1>{en?"This workflow is not connected yet":"این بخش هنوز به سرویس متصل نشده است"}</h1><p>{en?"Its reference design is preserved; live business actions will open after their backend is implemented.":"طراحی مرجع حفظ شده است؛ پس از تکمیل سرویس، اقدامات این بخش فعال می‌شوند."}</p><a className="button secondary" href={en?"/en":"/fa"}>{en?"Back to shop":"بازگشت به فروشگاه"}</a></main></PanelAccessBoundary>;
  }
  // Explicit connected-route allowlist; newly imported routes are not accidentally live.
  const connected = /^\/(?:fa\/|en\/)?cart\/?$/.test(pathname) || isStaticInfoPage(pathname)
    || /^\/(?:fa\/|en\/)?products\/[^/]+\/?$/.test(pathname)
    || /^\/(?:fa\/|en\/)?bundles(?:\/[^/]+)?\/?$/.test(pathname)
    || isCommissionRoute(pathname.replace(/\/$/, ""))
    || /^\/(?:fa|en)\/commissions\/new\/(?:references?|preferences)\/?$/.test(pathname)
    || /^\/(?:fa\/|en\/)?artworks(?:\/[^/]+)?\/?$/.test(pathname)
    || /^\/(?:fa|en)?\/?$/.test(pathname)
    || isShopRoute(pathname)
    || /^\/(?:fa\/|en\/)?collections(?:\/[^/]+)?\/?$/.test(pathname);

  if (!demo && !connected) {
    return <SystemErrorPage kind="404" english={pathname.startsWith("/en/")} />;
  }
  return <>
    {demo && <div role="status" className="announcement">DEMO — design reference data, no real transactions</div>}
    {/^\/(fa|en)\/admin(\/|$)/.test(pathname) ? <AdminDashboard />
      : /^\/(fa|en)\/artist(\/|$)/.test(pathname) ? <ArtistDashboard /> : <App />}
  </>;
}
