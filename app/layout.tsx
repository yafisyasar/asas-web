import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PwaRegister } from "@/components/pwa-register";

const nerdFont = localFont({
  src: [
    {
      path: "./fonts/JetBrainsMonoNLNerdFont-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/JetBrainsMonoNLNerdFont-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASAS-WEB",
  description:
    "Browse, search and download the semester-wise archive of 2024 BCA (Honours) college files.",
  applicationName: "ASAS-WEB",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ASAS-WEB",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#58a6ff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nerdFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
        <SpeedInsights />
        <PwaRegister />
      </body>
    </html>
  );
}