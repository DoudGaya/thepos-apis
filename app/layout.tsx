import '@/app/globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from '@/app/components/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ThePOS - Buy Data, Airtime & Pay Bills Instantly',
  description: 'Nigeria\'s #1 platform for reselling data bundles, airtime, and utility bills. Join 50,000+ resellers earning daily with instant delivery and the best prices.',
  keywords: 'data reseller, airtime VTU, bill payment, Nigeria, MTN data, Airtel data, Glo data, 9mobile data, DSTV, GOTV, electricity bills',
  authors: [{ name: 'ThePOS Team' }],
  openGraph: {
    title: 'ThePOS - Buy Data, Airtime & Pay Bills Instantly',
    description: 'Join 50,000+ resellers earning daily with instant delivery and the best prices in Nigeria.',
    url: 'https://thepos.ng',
    siteName: 'ThePOS',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ThePOS Platform'
      }
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ThePOS - Buy Data, Airtime & Pay Bills Instantly',
    description: 'Join 50,000+ resellers earning daily with the best prices in Nigeria.',
    images: ['/og-image.jpg'],
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
