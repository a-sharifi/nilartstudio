"use client";
import SystemErrorPage from "../features/system/SystemErrorPage";
import "../styles/system-error.css";
import "../styles/typography.css";
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="fa" dir="rtl"><body><SystemErrorPage kind="500" onRetry={retry} reference={error.digest} /></body></html>;
}
