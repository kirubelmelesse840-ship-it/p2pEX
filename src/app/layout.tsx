import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CrypEx - Cryptocurrency Exchange",
  description: "Trade Bitcoin, Ethereum, USDT and 100+ cryptocurrencies. Spot trading, P2P marketplace, and secure multi-asset wallet.",
  keywords: ["crypto", "exchange", "bitcoin", "ethereum", "USDT", "trading", "P2P", "wallet"],
  authors: [{ name: "CrypEx Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "CrypEx - Cryptocurrency Exchange",
    description: "Trade Bitcoin, Ethereum, USDT and 100+ cryptocurrencies.",
    siteName: "CrypEx",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
