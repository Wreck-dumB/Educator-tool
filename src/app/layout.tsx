import type { Metadata, Viewport } from "next";
import { Nunito, Fredoka } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import InstallPrompt from "@/components/InstallPrompt";
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
  title: "DR. SparkPlay — Run the centre, not the photocopier",
  description: "The all-in-one platform for Australian early learning centres. Observations, programming, compliance, and family communication — with AI that does the writing nobody has time for.",
  appleWebApp: {
    capable: true,
    title: "DR. SparkPlay",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "DR. SparkPlay — Run the centre, not the photocopier",
    description: "The all-in-one platform for Australian early learning centres with AI assistance.",
    type: "website",
    locale: "en_AU",
    url: "https://sparkplay-lyart.vercel.app",
    siteName: "DR. SparkPlay",
  },
  twitter: {
    card: "summary_large_image",
    title: "DR. SparkPlay — Run the centre, not the photocopier",
    description: "The all-in-one platform for Australian early learning centres.",
  },
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
  keywords: ["early learning", "early childhood", "childcare", "EYLF", "NQF", "observations", "activities", "compliance", "Australian"],
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
        <InstallPrompt />
      </body>
    </html>
  );
}
