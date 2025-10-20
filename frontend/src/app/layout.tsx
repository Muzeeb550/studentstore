import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});



const geistMono = Geist_Mono({
  variable: "--font-geist-mono", 
  subsets: ["latin"],
});



// ✅ UPDATED: Disable zoom for PWA (native app behavior)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,        // ✅ Prevent zooming beyond 100%
  userScalable: false,    // ✅ Disable pinch-to-zoom
  themeColor: '#6f8b66',
  colorScheme: 'light dark',
}



export const metadata: Metadata = {
  title: "StudentStore - Student Marketplace",
  description: "Discover student-verified products, deals, and reviews for campus life. Find the best products recommended by fellow students.",
  keywords: "student products, campus deals, student reviews, college marketplace, academic supplies",
  authors: [{ name: "StudentStore Team" }],
  creator: "StudentStore",
  publisher: "StudentStore",
  robots: "index, follow",
  openGraph: {
    title: "StudentStore - Student Marketplace",
    description: "Discover student-verified products, deals, and reviews for campus life",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudentStore - Student Marketplace", 
    description: "Discover student-verified products, deals, and reviews for campus life",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'mask-icon',
        url: '/favicon.svg',
        color: '#6f8b66'
      }
    ]
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#6f8b66" />
        <meta name="msapplication-TileColor" content="#6f8b66" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}