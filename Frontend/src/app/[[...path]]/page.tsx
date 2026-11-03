import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import DesignEntry from "../../features/design/DesignEntry";
import SystemErrorPage, { type ErrorKind } from "../../features/system/SystemErrorPage";
import { isApplicationRoute } from "../../features/system/routes";

export async function generateMetadata({ params }: { params: Promise<{ path?: string[] }> }): Promise<Metadata> {
  const { path = [] } = await params;
  const pathname = `/${path.join("/")}`;
  const privatePage = /\/(?:account|admin|artist|auth|cart|checkout|commissions)(?:\/|$)/.test(pathname);
  const index = process.env.NODE_ENV === "production" && isApplicationRoute(pathname) && !privatePage && !/\/(?:404|403|500|error|offline)$/.test(pathname);
  return { robots: { index, follow: index } };
}

export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const pathname = `/${path.join("/")}`;
  if (/^\/(fa|en)\/admin\/(?:channels|integrations)(?:\/.*)?$/.test(pathname)) redirect(`/${path[0]}/admin/products`);
  const explicitError = pathname.match(/^\/(?:fa\/|en\/)?(404|403|500|error|offline)$/)?.[1];
  if (explicitError === "404" || !isApplicationRoute(pathname)) notFound();
  if (explicitError) return <SystemErrorPage kind={(explicitError === "error" ? "500" : explicitError) as ErrorKind} english={path[0] === "en"} />;
  return <DesignEntry />;
}
