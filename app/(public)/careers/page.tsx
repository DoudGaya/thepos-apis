import React from 'react'

export default function CareersPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Careers at NillarPay</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p>Join our team and help us build the future of digital payments in Nigeria.</p>
        
        <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white">No open positions currently</h3>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">We are not actively hiring at the moment, but we are always interested in meeting talented individuals. Feel free to send your CV to careers@nillarpay.ng</p>
        </div>
      </div>
    </div>
  )
}
