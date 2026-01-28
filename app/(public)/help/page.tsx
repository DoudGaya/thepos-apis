import React from 'react'

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Help Center</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Account & Profile</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">How to manage your account settings, password, and profile information.</p>
        </div>
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Payments & Wallet</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">Information about funding your wallet, transaction history, and refunds.</p>
        </div>
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Services</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">Guides on buying data, airtime, paying electricity bills and more.</p>
        </div>
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Contact Support</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">Get in touch with our customer support team.</p>
        </div>
      </div>
    </div>
  )
}
