"use client";
import SystemErrorPage from "../features/system/SystemErrorPage";
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <SystemErrorPage kind="500" onRetry={retry} reference={error.digest} />;
}
