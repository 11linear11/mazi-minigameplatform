import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "MazI",
  description: "Chat + Games with friends",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
