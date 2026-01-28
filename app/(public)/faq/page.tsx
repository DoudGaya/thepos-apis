import React from 'react'

export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Frequently Asked Questions</h1>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">How do I fund my wallet?</h3>
          <p className="text-zinc-600 dark:text-zinc-400">You can fund your wallet via bank transfer to your dedicated virtual account number, or using your debit card.</p>
        </div>
        <div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Is the data delivery instant?</h3>
          <p className="text-zinc-600 dark:text-zinc-400">Yes, our system is automated and data plans are delivered instantly upon successful payment.</p>
        </div>
        <div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">What if my transaction fails?</h3>
          <p className="text-zinc-600 dark:text-zinc-400">If a transaction fails, the amount is automatically refunded to your wallet instantly.</p>
        </div>
        <div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Can I upgrade to a reseller account?</h3>
          <p className="text-zinc-600 dark:text-zinc-400">Yes, you can upgrade your account to enjoy cheaper rates for reselling purposes.</p>
        </div>
      </div>
    </div>
  )
}
