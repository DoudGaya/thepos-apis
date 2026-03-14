import '@/app/globals.css'
import type { Metadata } from 'next'
import { SessionProvider } from '@/app/components/SessionProvider'
import { ThemeProvider } from 'next-themes'

// const inter = Inter({ subsets: ['latin'] })
const inter = { className: 'font-sans' }

export const metadata: Metadata = {
  title: 'NillarPay - Buy Data, Airtime & Pay Bills Instantly',
  description: 'Nigeria\'s #1 platform for reselling data bundles, airtime, and utility bills. Join 50,000+ resellers earning daily with instant delivery and the best prices.',
  keywords: 'data reseller, airtime VTU, bill payment, Nigeria, MTN data, Airtel data, Glo data, 9mobile data, DSTV, GOTV, electricity bills',
  authors: [{ name: 'NillarPay Team' }],
  openGraph: {
    title: 'NillarPay - Buy Data, Airtime & Pay Bills Instantly',
    description: 'Join 50,000+ resellers earning daily with instant delivery and the best prices in Nigeria.',
    url: 'https://pay.nillar.com',
    siteName: 'NillarPay',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'NillarPay Platform'
      }
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NillarPay - Buy Data, Airtime & Pay Bills Instantly',
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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
