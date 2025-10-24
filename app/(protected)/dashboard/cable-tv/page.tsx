'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Tv, Wallet } from 'lucide-react'

const CABLE_PROVIDERS = ['DSTV', 'GOTV', 'STARTIMES'] as const

// Sample cable TV plans (in production, fetch from API)
const CABLE_PLANS = {
  DSTV: [
    { code: 'dstv-padi', name: 'DStv Padi', vendorCost: 2150 },
    { code: 'dstv-yanga', name: 'DStv Yanga', vendorCost: 2565 },
    { code: 'dstv-confam', name: 'DStv Confam', vendorCost: 5300 },
    { code: 'dstv-compact', name: 'DStv Compact', vendorCost: 9000 },
    { code: 'dstv-compact-plus', name: 'DStv Compact Plus', vendorCost: 14250 },
    { code: 'dstv-premium', name: 'DStv Premium', vendorCost: 21000 },
  ],
  GOTV: [
    { code: 'gotv-supa', name: 'GOtv Supa', vendorCost: 5700 },
    { code: 'gotv-max', name: 'GOtv Max', vendorCost: 4150 },
    { code: 'gotv-jolli', name: 'GOtv Jolli', vendorCost: 2800 },
    { code: 'gotv-jinja', name: 'GOtv Jinja', vendorCost: 1900 },
  ],
  STARTIMES: [
    { code: 'startimes-nova', name: 'StarTimes Nova', vendorCost: 900 },
    { code: 'startimes-basic', name: 'StarTimes Basic', vendorCost: 1850 },
    { code: 'startimes-smart', name: 'StarTimes Smart', vendorCost: 2600 },
    { code: 'startimes-classic', name: 'StarTimes Classic', vendorCost: 2750 },
    { code: 'startimes-super', name: 'StarTimes Super', vendorCost: 4900 },
  ],
}

const PROFIT_MARGIN = 100

export default function CableTVPurchasePage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    provider: 'DSTV' as keyof typeof CABLE_PLANS,
    smartcardNumber: '',
    planCode: '',
    vendorCost: 0,
    planName: '',
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

  const handleProviderChange = (provider: keyof typeof CABLE_PLANS) => {
    setFormData({ ...formData, provider, planCode: '', vendorCost: 0, planName: '' })
  }

  const handlePlanSelect = (planCode: string, vendorCost: number, planName: string) => {
    setFormData({ ...formData, planCode, vendorCost, planName })
  }

  const sellingPrice = formData.vendorCost + PROFIT_MARGIN

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!formData.provider) {
      setError('Please select a provider')
      setLoading(false)
      return
    }
    if (!formData.smartcardNumber || formData.smartcardNumber.length < 10) {
      setError('Please enter a valid smartcard number (at least 10 digits)')
      setLoading(false)
      return
    }
    if (!formData.planCode) {
      setError('Please select a subscription plan')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/bills/cable-tv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Purchase failed')
      }

      setSuccess(
        `Cable TV subscription successful! ${formData.provider} ${formData.planName} activated on ${formData.smartcardNumber}. Reference: ${data.data.reference}`
      )
      
      // Update balance
      setWalletBalance(prev => prev - sellingPrice)
      
      // Reset form
      setFormData({ provider: 'DSTV', smartcardNumber: '', planCode: '', vendorCost: 0, planName: '' })
      
    } catch (err: any) {
      setError(err.message || 'Failed to purchase cable TV subscription')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlan = CABLE_PLANS[formData.provider].find(p => p.code === formData.planCode)

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Tv className="mr-2" size={28} />
                Cable TV Subscription
              </h1>
              <p className="text-gray-300 mt-2">
                DStv, GOtv, StarTimes • Instant activation
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
                Select Provider
              </label>
              <div className="grid grid-cols-3 gap-3">
                {CABLE_PROVIDERS.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => handleProviderChange(provider)}
                    className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                      formData.provider === provider
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            </div>

            {/* Smartcard Number */}
            <div>
              <label htmlFor="smartcardNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Smartcard / IUC Number
              </label>
              <input
                type="text"
                id="smartcardNumber"
                value={formData.smartcardNumber}
                onChange={(e) => setFormData({ ...formData, smartcardNumber: e.target.value })}
                placeholder="Enter your smartcard number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            {/* Subscription Plans */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Subscription Plan
              </label>
              <div className="grid gap-3">
                {CABLE_PLANS[formData.provider].map((plan) => {
                  const planSellingPrice = plan.vendorCost + PROFIT_MARGIN
                  return (
                    <button
                      key={plan.code}
                      type="button"
                      onClick={() => handlePlanSelect(plan.code, plan.vendorCost, plan.name)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        formData.planCode === plan.code
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{plan.name}</p>
                          <p className={`text-sm ${formData.planCode === plan.code ? 'text-gray-300' : 'text-gray-500'}`}>
                            Monthly subscription
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            ₦{planSellingPrice.toLocaleString()}
                          </p>
                          <p className={`text-xs ${formData.planCode === plan.code ? 'text-gray-400' : 'text-gray-500'}`}>
                            +₦100 fee
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Price Breakdown */}
            {formData.vendorCost > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-gray-900">Pricing Breakdown</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subscription Cost:</span>
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
              disabled={loading || loadingBalance || walletBalance < sellingPrice || !formData.planCode}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Processing Subscription...
                </>
              ) : (
                `Subscribe ${selectedPlan?.name || ''} - ₦${sellingPrice.toLocaleString()}`
              )}
            </button>

            {walletBalance < sellingPrice && formData.planCode && (
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
          <h3 className="font-semibold text-gray-900 mb-3">📺 How to Subscribe</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li>1. Select your cable TV provider (DStv, GOtv, StarTimes)</li>
            <li>2. Enter your smartcard/IUC number</li>
            <li>3. Choose your desired subscription plan</li>
            <li>4. Review pricing and click "Subscribe"</li>
            <li>5. Your subscription is activated instantly!</li>
          </ol>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> Fixed ₦100 service charge applies to all subscriptions. 
              Subscription is activated immediately on your smartcard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
