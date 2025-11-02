import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GoogleAnalytics from "./components/GoogleAnalytics";
import { WishlistProvider } from "./context/WishlistContext"; // ✅ ADDED
import { ChatProvider } from "./context/ChatContext";
import ChatAssistant from "./components/ChatAssistant";
import "./globals.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


const geistMono = Geist_Mono({
  variable: "--font-geist-mono", 
  subsets: ["latin"],
});


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
  colorScheme: 'light',
}


export const metadata: Metadata = {
  title: "StudentStore - Smart Shopping for Students",
  description: "Your ultimate shopping companion for student life. Discover the best products with reviews and recommendations from fellow students.",
  keywords: "student products, campus deals, student reviews, college marketplace, academic supplies, student shopping",
  authors: [{ name: "StudentStore Team" }],
  creator: "StudentStore",
  publisher: "StudentStore",
  robots: "index, follow",
  applicationName: "StudentStore",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StudentStore",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "StudentStore - Smart Shopping for Students",
    description: "Discover student-verified products, deals, and reviews for campus life",
    type: "website",
    locale: "en_US",
    siteName: "StudentStore",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudentStore - Smart Shopping for Students", 
    description: "Your ultimate shopping companion for student life",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* ✅ Fixed: Next.js serves manifest.ts at /manifest.webmanifest */}
        <link rel="manifest" href="/manifest.webmanifest" />
        
        {/* Theme Colors */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-TileImage" content="/web-app-manifest-512x512.png" />
        
        {/* Apple Mobile Web App */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StudentStore" />
        
        {/* Mobile Web App */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* ✅ Simplified Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((reg) => {
                      console.log('✅ SW registered:', reg.scope);
                    })
                    .catch((err) => {
                      console.error('❌ SW registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        {/* ✅ WRAP CHILDREN WITH WISHLIST PROVIDER */}
        <WishlistProvider>
          <ChatProvider>
            {children}
            <ChatAssistant />
          </ChatProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}
