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
    <div className="min-h-screen bg-gradient-to-br bg-black">
      <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
