import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../design/index.css";
import "../styles/design-compatibility.css";

export const metadata: Metadata = {
  title: "نیل‌آرت | محیط توسعه",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
