import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QA Manager",
  description: "DDWorks QA Test Case Manager",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
