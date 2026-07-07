import type { Metadata, Viewport } from "next";
import { Nunito, Fredoka } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SparkPlay",
  description: "EYLF-linked activity ideas and daily care tools for early childhood educators.",
  appleWebApp: {
    capable: true,
    title: "SparkPlay",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#e8825a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fredoka.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
