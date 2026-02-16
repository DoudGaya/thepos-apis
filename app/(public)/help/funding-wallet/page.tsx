import React from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Banknote, Smartphone, Info } from 'lucide-react'

export default function FundingWalletGuide() {
  return (
        <div className="bg-white dark:bg-zinc-950 min-h-screen py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/help" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Help Center
        </Link>
        
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">How to fund your NillarPay wallet</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10">
            Adding money to your wallet is quick and secure. Choose the method that works best for you.
        </p>
        
        <div className="space-y-8">
            {/* Method 1 */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                        <CreditCard size={24} />
                    </div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Method 1: Instant Bank Transfer (Virtual Account)</h2>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm leading-relaxed">
                    Every NillarPay user gets a dedicated virtual account number (Wema Bank, Moniepoint, etc.). Transfers to this account are credited instantly.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-700 dark:text-zinc-300 ml-2">
                    <li>Log in to your dashboard.</li>
                    <li>Copy your dedicated <strong>Account Number</strong> displayed on the home screen.</li>
                    <li>Open your bank app and make a transfer to that account.</li>
                    <li>Your wallet will be credited automatically within minutes.</li>
                </ol>
            </div>

            {/* Method 2 */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                        <Banknote size={24} />
                    </div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Method 2: Card Payment</h2>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm leading-relaxed">
                    Fund your wallet using your debit card (Mastercard, Visa, Verve).
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-700 dark:text-zinc-300 ml-2">
                    <li>Click on <strong>"Fund Wallet"</strong> on your dashboard.</li>
                    <li>Choose <strong>"Pay with Card"</strong>.</li>
                    <li>Enter amount and card details securely via our payment gateway.</li>
                    <li>Authorize the transaction (OTP/Pin).</li>
                    <li>Wallet is funded instantly.</li>
                </ol>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg">
                <Info className="flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" size={18} />
                <div className="text-sm text-orange-800 dark:text-orange-300">
                    <span className="font-semibold">Note:</span> A small transaction fee may apply depending on the funding method. Check the fees page for details.
                </div>
            </div>

        </div>
      </div>
    </div>
  )
}
