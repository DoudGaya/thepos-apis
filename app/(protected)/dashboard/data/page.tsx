'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Wifi, Wallet } from 'lucide-react'

const NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'] as const

// Sample data plans (in production, fetch from API)
const DATA_PLANS = {
  MTN: [
    { code: 'MTN-1GB-30DAYS', name: '1GB - 30 Days', vendorCost: 250 },
    { code: 'MTN-2GB-30DAYS', name: '2GB - 30 Days', vendorCost: 500 },
    { code: 'MTN-3GB-30DAYS', name: '3GB - 30 Days', vendorCost: 750 },
    { code: 'MTN-5GB-30DAYS', name: '5GB - 30 Days', vendorCost: 1200 },
    { code: 'MTN-10GB-30DAYS', name: '10GB - 30 Days', vendorCost: 2400 },
  ],
  GLO: [
    { code: 'GLO-1GB-30DAYS', name: '1GB - 30 Days', vendorCost: 240 },
    { code: 'GLO-2GB-30DAYS', name: '2GB - 30 Days', vendorCost: 480 },
    { code: 'GLO-3GB-30DAYS', name: '3GB - 30 Days', vendorCost: 700 },
    { code: 'GLO-5GB-30DAYS', name: '5GB - 30 Days', vendorCost: 1150 },
    { code: 'GLO-10GB-30DAYS', name: '10GB - 30 Days', vendorCost: 2300 },
  ],
  AIRTEL: [
    { code: 'AIRTEL-1GB-30DAYS', name: '1GB - 30 Days', vendorCost: 245 },
    { code: 'AIRTEL-2GB-30DAYS', name: '2GB - 30 Days', vendorCost: 490 },
    { code: 'AIRTEL-3GB-30DAYS', name: '3GB - 30 Days', vendorCost: 720 },
    { code: 'AIRTEL-5GB-30DAYS', name: '5GB - 30 Days', vendorCost: 1180 },
    { code: 'AIRTEL-10GB-30DAYS', name: '10GB - 30 Days', vendorCost: 2350 },
  ],
  '9MOBILE': [
    { code: '9MOBILE-1GB-30DAYS', name: '1GB - 30 Days', vendorCost: 260 },
    { code: '9MOBILE-2GB-30DAYS', name: '2GB - 30 Days', vendorCost: 520 },
    { code: '9MOBILE-3GB-30DAYS', name: '3GB - 30 Days', vendorCost: 760 },
    { code: '9MOBILE-5GB-30DAYS', name: '5GB - 30 Days', vendorCost: 1250 },
    { code: '9MOBILE-10GB-30DAYS', name: '10GB - 30 Days', vendorCost: 2450 },
  ],
}

const PROFIT_MARGIN = 100

export default function DataPurchasePage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    network: 'MTN' as keyof typeof DATA_PLANS,
    phone: '',
    planCode: '',
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

  const handleNetworkChange = (network: keyof typeof DATA_PLANS) => {
    setFormData({ ...formData, network, planCode: '', vendorCost: 0 })
  }

  const handlePlanSelect = (planCode: string, vendorCost: number) => {
    setFormData({ ...formData, planCode, vendorCost })
  }

  const sellingPrice = formData.vendorCost + PROFIT_MARGIN

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!formData.network) {
      setError('Please select a network')
      setLoading(false)
      return
    }
    if (!formData.phone || formData.phone.length < 11) {
      setError('Please enter a valid phone number (11 digits)')
      setLoading(false)
      return
    }
    if (!formData.planCode) {
      setError('Please select a data plan')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/data/purchase', {
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
        `Data purchase successful! ${formData.network} data sent to ${formData.phone}. Reference: ${data.data.reference}`
      )
      
      // Update balance
      setWalletBalance(prev => prev - sellingPrice)
      
      // Reset form
      setFormData({ network: 'MTN', phone: '', planCode: '', vendorCost: 0 })
      
    } catch (err: any) {
      setError(err.message || 'Failed to purchase data')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlan = DATA_PLANS[formData.network].find(p => p.code === formData.planCode)

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Wifi className="mr-2" size={28} />
                Buy Data
              </h1>
              <p className="text-gray-300 mt-2">
                All networks • Instant activation
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
            {/* Network Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Network
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {NETWORKS.map((network) => (
                  <button
                    key={network}
                    type="button"
                    onClick={() => handleNetworkChange(network)}
                    className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                      formData.network === network
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {network}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="08012345678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                maxLength={11}
              />
            </div>

            {/* Data Plans */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Data Plan
              </label>
              <div className="grid gap-3">
                {DATA_PLANS[formData.network].map((plan) => {
                  const planSellingPrice = plan.vendorCost + PROFIT_MARGIN
                  return (
                    <button
                      key={plan.code}
                      type="button"
                      onClick={() => handlePlanSelect(plan.code, plan.vendorCost)}
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
                            Cost: ₦{plan.vendorCost.toLocaleString()} + ₦100 profit
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            ₦{planSellingPrice.toLocaleString()}
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
                    <span className="text-gray-600">Vendor Cost:</span>
                    <span className="font-medium">₦{formData.vendorCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit Margin:</span>
                    <span className="font-medium text-green-600">+ ₦{PROFIT_MARGIN}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-900">You Pay:</span>
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
                  Processing Purchase...
                </>
              ) : (
                `Purchase ${selectedPlan?.name || 'Data'} - ₦${sellingPrice.toLocaleString()}`
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
          <h3 className="font-semibold text-gray-900 mb-3">��� How to Buy Data</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li>1. Select your network (MTN, GLO, AIRTEL, 9MOBILE)</li>
            <li>2. Enter the phone number to receive data</li>
            <li>3. Choose your preferred data plan</li>
            <li>4. Review pricing and click "Purchase"</li>
            <li>5. Data is activated instantly!</li>
          </ol>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> All data plans come with a fixed ₦100 profit margin. 
              Data is delivered instantly and activated on the specified number.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
