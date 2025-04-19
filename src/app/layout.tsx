import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Analytics } from '@vercel/analytics/react';
const inter = Inter({ subsets: ['latin'] });
import MailingListPopup from '@/components/MailingListPopup'


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: 'California DOGE - Government Efficiency & Transparency',
    template: '%s | California DOGE'
  },
  description: 'California DOGE provides transparent insights into California government operations, programs, projects, budget data, and workforce information. Explore detailed department analyses and government efficiency metrics.',
  keywords: ['California government', 'government efficiency', 'budget transparency', 'workforce data', 'California departments', 'government spending', 'public sector analysis', 'California DOGE', 'DOGE'],
  authors: [{ name: 'California DOGE' }],
  creator: 'California DOGE',
  publisher: 'California DOGE',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://cali-doge.org'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Possible future home of https://doge.ca.gov',
    description: 'We analyze government spending and regulations through a three-layer approach. Our goal is to provide clear, actionable insights that can lead to more efficient government operations and better public services.',
    url: 'https://cali-doge.org',
    siteName: 'California DOGE',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'California DOGE - Government Transparency',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Possible future home of https://doge.ca.gov',
    description: 'We analyze government spending and regulations through a three-layer approach. Our goal is to provide clear, actionable insights that can lead to more efficient government operations and better public services.',
    images: ['/twitter_media/1906862874221318347_0.jpg'],
    creator: '@cali_doge',
    site: '@cali_doge',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json?v=1',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon2.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'California DOGE',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} flex flex-col min-h-screen bg-white`}>
        <Header />
        <div className="flex-grow">
          {children}
        </div>
        <Footer />
        <Analytics />
        <MailingListPopup />
      </body>
    </html>
  );
} 