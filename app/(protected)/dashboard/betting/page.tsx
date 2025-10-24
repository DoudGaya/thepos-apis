'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Trophy, Wallet } from 'lucide-react'

const BETTING_PROVIDERS = [
  '1XBET', 'BANGBET', 'BET9JA', 'BETKING', 'BETLAND', 'BETLION',
  'BETWAY', 'CLOUDBET', 'LIVESCOREBET', 'MERRYBET', 'NAIJABET',
  'NAIRABET', 'SUPABET'
] as const

const PROFIT_MARGIN = 100

export default function BettingFundingPage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    provider: '1XBET',
    customerId: '',
    vendorCost: 0,
  })
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/wallet/balance', {
          credentials: 'include'
        })
        const data = await res.json()
        if (data.success) {
          setWalletBalance(data.data.balance)
        }
      } catch (err) {
        console.error('Failed to fetch balance:', err)
      } finally {
        setLoadingBalance(false)
      }
    }
    fetchBalance()
  }, [])

  const sellingPrice = formData.vendorCost + PROFIT_MARGIN

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!formData.provider) {
      setError('Please select a betting provider')
      setLoading(false)
      return
    }
    if (!formData.customerId) {
      setError('Please enter your customer/user ID')
      setLoading(false)
      return
    }
    if (formData.vendorCost < 100) {
      setError('Minimum betting wallet funding is ₦100')
      setLoading(false)
      return
    }
    if (formData.vendorCost > 100000) {
      setError('Maximum betting wallet funding is ₦100,000')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/bills/betting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Funding failed')
      }

      setSuccess(
        `Betting wallet funded successfully! ${formData.provider} account ${formData.customerId} credited with ₦${formData.vendorCost.toLocaleString()}. Reference: ${data.data.reference}`
      )
      
      // Update balance
      setWalletBalance(prev => prev - sellingPrice)
      
      // Reset form
      setFormData({ provider: '1XBET', customerId: '', vendorCost: 0 })
      
    } catch (err: any) {
      setError(err.message || 'Failed to fund betting wallet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Trophy className="mr-2" size={28} />
                Fund Betting Wallet
              </h1>
              <p className="text-gray-300 mt-2">
                All major betting platforms • Instant funding
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Wallet Balance</p>
              <p className="text-2xl font-bold flex items-center justify-end">
                <Wallet className="mr-2" size={20} />
                {loadingBalance ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  `₦${walletBalance.toLocaleString()}`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Betting Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                {BETTING_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer ID */}
            <div>
              <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-2">
                Customer / User ID
              </label>
              <input
                type="text"
                id="customerId"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                placeholder="Enter your betting account ID"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                This is your unique account ID on the betting platform
              </p>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="vendorCost" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₦100 - ₦100,000)
              </label>
              <input
                type="number"
                id="vendorCost"
                value={formData.vendorCost || ''}
                onChange={(e) => setFormData({ ...formData, vendorCost: parseFloat(e.target.value) || 0 })}
                placeholder="Enter amount to fund"
                min={100}
                max={100000}
                step={100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Quick amounts: ₦500 | ₦1,000 | ₦2,000 | ₦5,000 | ₦10,000
              </p>
            </div>

            {/* Price Breakdown */}
            {formData.vendorCost >= 100 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-gray-900">Pricing Breakdown</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Betting Credit:</span>
                    <span className="font-medium">₦{formData.vendorCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Charge:</span>
                    <span className="font-medium text-green-600">+ ₦{PROFIT_MARGIN}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-900">Total Payment:</span>
                    <span className="font-bold text-lg text-gray-900">₦{sellingPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || loadingBalance || walletBalance < sellingPrice || formData.vendorCost < 100}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Processing Funding...
                </>
              ) : (
                `Fund Betting Wallet - ₦${sellingPrice.toLocaleString()}`
              )}
            </button>

            {walletBalance < sellingPrice && formData.vendorCost >= 100 && (
              <p className="text-red-600 text-sm text-center">
                Insufficient balance. Please fund your wallet first.
              </p>
            )}
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="text-red-600 mr-2 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <p className="text-red-800 font-semibold">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle2 className="text-green-600 mr-2 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <p className="text-green-800 font-semibold">Success!</p>
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-900 mb-3">🏆 How to Fund Betting Wallet</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li>1. Select your betting platform from the dropdown</li>
            <li>2. Enter your customer/user ID from your betting account</li>
            <li>3. Enter the amount you want to fund</li>
            <li>4. Review pricing and click "Fund Betting Wallet"</li>
            <li>5. Your betting account is credited instantly!</li>
          </ol>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> Minimum funding is ₦100, maximum is ₦100,000. 
              Fixed ₦100 service charge applies. Funds are credited instantly to your betting account.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
