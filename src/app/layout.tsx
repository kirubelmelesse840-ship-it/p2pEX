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
  title: "P2PEX - Cryptocurrency Exchange",
  description: "Trade Bitcoin, Ethereum, USDT and 100+ cryptocurrencies. Spot trading, P2P marketplace, and secure multi-asset wallet.",
  keywords: ["crypto", "exchange", "P2PEX", "bitcoin", "ethereum", "USDT", "trading", "P2P", "wallet"],
  authors: [{ name: "P2PEX Team" }],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "P2PEX - Cryptocurrency Exchange",
    description: "Trade Bitcoin, Ethereum, USDT and 100+ cryptocurrencies.",
    siteName: "P2PEX",
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
