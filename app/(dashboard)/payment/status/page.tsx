import { Suspense } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

interface PaymentStatusPageProps {
  searchParams: {
    reference: string
    status?: string
  }
}

async function PaymentStatusContent({ searchParams }: PaymentStatusPageProps) {
  const { reference } = searchParams

  if (!reference) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Invalid Request
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          No transaction reference provided.
        </p>
        <Link
          href="/dashboard"
          className="px-6 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-lg font-medium"
        >
          Return to Dashboard
        </Link>
      </div>
    )
  }

  // Check transaction status
  const transaction = await prisma.transaction.findFirst({
    where: { 
      OR: [
        { reference },
        { details: { path: ['nombaReference'], equals: reference } },
        { details: { path: ['paystackReference'], equals: reference } }
      ]
    }
  })

  // Determine status display
  let status: 'success' | 'failed' | 'pending' = 'pending'
  
  if (transaction?.status === 'COMPLETED') {
    status = 'success'
  } else if (transaction?.status === 'FAILED') {
    status = 'failed'
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 max-w-md mx-auto text-center">
      <div className="mb-8">
        {status === 'success' && (
          <div className="h-24 w-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-500" />
          </div>
        )}
        {status === 'failed' && (
          <div className="h-24 w-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-12 w-12 text-red-600 dark:text-red-500" />
          </div>
        )}
        {status === 'pending' && (
          <div className="h-24 w-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <div className="h-12 w-12 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {status === 'success' && 'Payment Successful'}
        {status === 'failed' && 'Payment Failed'}
        {status === 'pending' && 'Payment Processing'}
      </h1>

      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {status === 'success' && `Your transaction of ₦${transaction?.amount?.toLocaleString() || '0.00'} has been completed successfully.`}
        {status === 'failed' && 'Something went wrong with your payment. Please try again.'}
        {status === 'pending' && 'We are currently verifying your payment status. This usually takes a few seconds.'}
      </p>

      <div className="space-y-3 w-full">
        <Link
          href="/dashboard"
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
            status === 'success'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : status === 'failed'
              ? 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {status === 'success' ? 'Continue to Dashboard' : 'Return to Dashboard'}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

export default function PaymentStatusPage(props: PaymentStatusPageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentStatusContent {...props} />
    </Suspense>
  )
}
