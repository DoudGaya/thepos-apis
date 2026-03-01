import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

interface Props {
  params: { code: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const referrer = await getReferrer(params.code)
  const name = referrer ? `${referrer.firstName}'s` : 'a friend\'s'
  return {
    title: `You're invited! Join NillarPay via ${name} referral`,
    description:
      'Sign up with NillarPay — Nigeria\'s easiest platform for data, airtime, and bill payments. Get a welcome bonus when you join.',
  }
}

async function getReferrer(code: string) {
  return prisma.user.findUnique({
    where: { referralCode: code.toUpperCase() },
    select: { firstName: true },
  })
}

export default async function ReferralLandingPage({ params }: Props) {
  const code = params.code.toUpperCase()
  const referrer = await getReferrer(code)

  if (!referrer) {
    // Invalid code → 404 rather than a confusing blank page
    notFound()
  }

  const appStoreUrl = 'https://apps.apple.com/app/nillarpay' // update when live
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.nillarpay' // update when live
  const deepLink = `nillarpay://ref/${code}`
  const registerUrl = `/auth/register?ref=${code}`

  return (
    <>
      {/*
        Attempt to open the native app immediately.
        The meta-refresh + JS fallback handles devices that don't have the app.
      */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var deepLink = ${JSON.stringify(deepLink)};
              var fallback  = ${JSON.stringify(playStoreUrl)};
              var start = Date.now();
              var timer = setTimeout(function() {
                if (Date.now() - start < 2000) {
                  // App not installed — do nothing, let user tap store buttons
                }
              }, 1500);
              window.addEventListener('blur', function() { clearTimeout(timer); });
              window.location.href = deepLink;
            })();
          `,
        }}
      />

      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-16 text-center font-sans">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-3xl font-extrabold tracking-tight text-black">
            Nillar<span className="text-yellow-400">Pay</span>
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-3 max-w-sm">
          {referrer.firstName} invited you!
        </h1>
        <p className="text-gray-500 text-lg mb-8 max-w-xs">
          Join NillarPay today and enjoy instant data, airtime &amp; bill payments — plus a{' '}
          <span className="font-semibold text-black">₦100 welcome bonus</span> on your first funding.
        </p>

        {/* Primary CTA — open app or web register */}
        <a
          href={deepLink}
          className="block w-full max-w-xs rounded-xl bg-black text-white text-center py-4 font-semibold text-base mb-3 active:opacity-80"
        >
          Open in NillarPay App
        </a>

        <Link
          href={registerUrl}
          className="block w-full max-w-xs rounded-xl border border-gray-200 text-gray-900 text-center py-4 font-semibold text-base mb-8 active:opacity-80"
        >
          Create Account on Web
        </Link>

        {/* Store badges */}
        <p className="text-xs text-gray-400 mb-4 uppercase tracking-widest">Download the app</p>
        <div className="flex gap-3 justify-center">
          <a
            href={playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 transition"
          >
            {/* Google Play icon */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.18 23.76c.3.17.65.2.98.08l11.46-6.6-2.44-2.44-10 8.96zm-1.18-20.7v17.88l9.84-8.94L2 3.06zM21.16 10.3l-2.56-1.47-2.74 2.49 2.74 2.49 2.58-1.49c.73-.42.73-1.6-.02-2.02zM4.16.16l11.46 6.6-2.44 2.44L3.18.24A1.09 1.09 0 0 0 4.16.16z" />
            </svg>
            Google Play
          </a>
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 transition"
          >
            {/* Apple icon */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            App Store
          </a>
        </div>

        {/* Referral code display */}
        <p className="mt-10 text-xs text-gray-300">
          Referral code: <span className="font-mono font-semibold text-gray-400">{code}</span>
        </p>
      </main>
    </>
  )
}
