import "./globals.css";
import type { ReactNode } from "react";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "MazI - پلتفرم چت و بازی آنلاین",
  description: "چت گروهی و بازی‌های آنلاین چندنفره مازی",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MazI",
  },
  icons: {
    icon: "/assets/images/logo.png",
    apple: "/assets/images/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#080c14",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
