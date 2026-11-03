import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NavigationGuardProvider } from "../features/navigation/NavigationGuardProvider";
import { SessionLifecycleProvider } from "../features/identity/SessionLifecycleProvider";
import "../design/index.css";
import "../styles/design-compatibility.css";
import "../styles/typography.css";
import "../styles/system-error.css";

export const metadata: Metadata = {
  title: "نیل‌آرت استودیو | محصولات هنری دست‌ساز",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "256x256" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fa" dir="rtl"><body><SessionLifecycleProvider><NavigationGuardProvider>{children}</NavigationGuardProvider></SessionLifecycleProvider></body></html>;
}
