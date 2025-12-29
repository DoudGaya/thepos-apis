import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - NillarPay',
  description: 'Login or create an account to access NillarPay services',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full flex-grow flex items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {children}
      </div>
    </div>
  )
}
