import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});


export const metadata: Metadata = {
  title: "Hikyaku",
  description: "Open Source Logistics OS — 飛脚",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <meta name="apple-mobile-web-app-title" content="Hikyaku" />
      <body className={`${fontSans.variable} antialiased`}>
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}
