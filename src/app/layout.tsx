import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LanguageSwitcher from "../components/LanguageSwitcher";
import '../lib/i18n';
import { Suspense } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LexiYaar - Smart Legal Document Scanner",
  description: "AI-powered legal document scanner: identify risky clauses, get explanations in 12+ languages with audio support",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LexiYaar",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
  keywords: ["legal", "document", "scanner", "AI", "analysis", "multilingual", "legal analysis", "contract analysis"],
  category: "Legal Tools",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Removed duplicate themeColor property
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  // Removed duplicate themeColor property
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#dc2626" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`h-full safe-area ${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-red-50 via-orange-50 to-pink-50`}
      >
        <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-[1000] transition-transform duration-300 hover:scale-105 max-w-[calc(100vw-1rem)] sm:max-w-none">
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
        </div>
        {children}
        {/* PWA Install Prompt - can be enabled with JavaScript */}
        <div id="pwa-install-prompt" className="hidden fixed bottom-4 inset-x-4 md:left-auto md:right-4 md:bottom-4 md:max-w-sm bg-white rounded-xl shadow-2xl p-4 border border-gray-200 z-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800" data-i18n="installLexiYaarApp">Install LexiYaar App</p>
              <p className="text-xs text-gray-500" data-i18n="addToHomeScreen">Add to home screen for offline access</p>
            </div>
            <div className="flex gap-2">
              <button id="pwa-dismiss" className="text-xs text-gray-500 px-2 py-1 hover:text-gray-700" data-i18n="dismiss">Dismiss</button>
              <button id="pwa-install" className="bg-red-600 text-white px-3 py-1 text-sm rounded-full hover:bg-red-700 transition-colors" data-i18n="install">Install</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
