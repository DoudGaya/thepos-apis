import React from 'react'
import { Search, User, Wallet, Zap, ShieldQuestion, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function HelpPage() {
  return (
    <div className="bg-white dark:bg-zinc-950 min-h-screen">
      {/* Search Hero */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 py-16 sm:py-24 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-6">How can we help you today?</h1>
            <div className="relative max-w-2xl mx-auto">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-11 pr-4 py-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
                    placeholder="Search for answers (e.g., 'reset password', 'fund wallet')..."
                />
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
            {/* Account Issues */}
            <div className="group p-6 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                    <User size={24} />
                </div>
                <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Account & Profile</h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">Manage your account settings, password resets, and verification status.</p>
                <ul className="space-y-3">
                    <li>
                        <Link href="/help/password-reset" className="flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <ArrowRight size={16} className="mr-2 text-zinc-400" /> How to reset my password?
                        </Link>
                    </li>
                    <li>
                        <Link href="/help/kyc-verification" className="flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <ArrowRight size={16} className="mr-2 text-zinc-400" /> Verifying your identity (KYC)
                        </Link>
                    </li>
                </ul>
            </div>
            
            {/* Payments */}
            <div className="group p-6 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                    <Wallet size={24} />
                </div>
                <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Payments & Wallet</h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">Funding your wallet, transaction history, withdrawals, and refunds.</p>
                <ul className="space-y-3">
                    <li>
                        <Link href="/help/funding-wallet" className="flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <ArrowRight size={16} className="mr-2 text-zinc-400" /> How to fund my wallet?
                        </Link>
                    </li>
                    <li>
                        <Link href="#" className="flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <ArrowRight size={16} className="mr-2 text-zinc-400" /> Transaction limits and fees
                        </Link>
                    </li>
                </ul>
            </div>
            
            {/* Services */}
            <div className="group p-6 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                 <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
                    <Zap size={24} />
                </div>
                <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-white">Services & Bills</h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">Airtime, data bundles, electricity bills, and cable TV subscriptions.</p>
                <ul className="space-y-3">
                    <li>
                        <Link href="#" className="flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <ArrowRight size={16} className="mr-2 text-zinc-400" /> Airtime not received
                        </Link>
                    </li>
                    <li>
                        <Link href="#" className="flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <ArrowRight size={16} className="mr-2 text-zinc-400" /> How to pay electricity bills
                        </Link>
                    </li>
                </ul>
            </div>
        </div>
        
        <div className="text-center mt-12 pt-12 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">Still need help?</h3>
            <div className="flex justify-center gap-4">
               <Link href="/contact" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm">
                   Contact Support
               </Link>
            </div>
        </div>
      </div>
    </div>
  )
}
