'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Wifi, Wallet, Lock, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDataSize } from '@/lib/constants/data-plans'
import { TransactionPinModal } from '@/components/transaction-pin-modal'

const NETWORKS = [
  { code: 'MTN', name: 'MTN', color: 'from-yellow-500 to-yellow-600', lightColor: 'bg-yellow-100' },
  { code: 'GLO', name: 'Glo', color: 'from-green-500 to-green-600', lightColor: 'bg-green-100' },
  { code: 'AIRTEL', name: 'Airtel', color: 'from-red-500 to-red-600', lightColor: 'bg-red-100' },
  { code: '9MOBILE', name: '9mobile', color: 'from-emerald-500 to-emerald-600', lightColor: 'bg-emerald-100' },
] as const

// Filter for popular plans to show at the top
const isPopularPlan = (plan: DataPlan) => {
  const popularSizes = [1024, 2048, 5120] // 1GB, 2GB, 5GB
  return popularSizes.includes(plan.dataCapacity)
}

type Network = typeof NETWORKS[number]['code']

interface DataPlan {
  id: string
  name: string
  network: string
  costPrice: number
  sellingPrice: number
  profit: number
  validity: string
  description: string
  dataCapacity: number
  isAvailable: boolean
}

export default function DataPurchasePage() {
  const { data: session } = useSession()
  const [selectedNetwork, setSelectedNetwork] = useState<Network>('MTN')
  const [phone, setPhone] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null)
  const [showPinModal, setShowPinModal] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasPinSet, setHasPinSet] = useState(false)
  const [checkingPin, setCheckingPin] = useState(false)

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/wallet/balance', { credentials: 'include' })
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
  }, [success])

  useEffect(() => {
    const checkPinStatus = async () => {
      setCheckingPin(true)
      try {
        const res = await fetch('/api/auth/check-pin', { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setHasPinSet(data.data.hasPinSet)
        }
      } catch (err) {
        console.error('Failed to check PIN status:', err)
      } finally {
        setCheckingPin(false)
      }
    }
    checkPinStatus()
  }, [])

  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true)
      setSelectedPlan(null)
      try {
        const res = await fetch(`/api/data/plans?network=${selectedNetwork}`, { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setPlans(data.data.plans || [])
        } else {
          setError(data.message || 'Failed to fetch plans')
        }
      } catch (err: any) {
        console.error('Failed to fetch plans:', err)
        setError('Failed to load data plans. Please try again.')
      } finally {
        setLoadingPlans(false)
      }
    }
    fetchPlans()
  }, [selectedNetwork])

  const handleBuyClick = () => {
    setError('')
    setSuccess('')
    if (!phone || phone.length < 11) {
      setError('Please enter a valid 11-digit phone number')
      return
    }
    if (!selectedPlan) {
      setError('Please select a data plan')
      return
    }
    if (!hasPinSet) {
      setError('Transaction PIN not set. Please set up your PIN before making purchases.')
      return
    }
    if (walletBalance < selectedPlan.sellingPrice) {
      setError(`Insufficient balance. Required: ₦${selectedPlan.sellingPrice.toLocaleString()}, Available: ₦${walletBalance.toLocaleString()}`)
      return
    }
    setShowPinModal(true)
  }

  const handlePurchase = async (pin: string) => {
    if (!selectedPlan) {
      setError('Please select a data plan')
      return
    }
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/data/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ network: selectedNetwork, phone, planId: selectedPlan.id, pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Purchase failed')
      }
      setSuccess(`${selectedPlan.name} data bundle purchased successfully! Delivery in progress...`)
      setShowPinModal(false)
      setPhone('')
      setSelectedPlan(null)
      if (data.data?.wallet?.newBalance !== undefined) {
        setWalletBalance(data.data.wallet.newBalance)
      }
    } catch (err: any) {
      console.error('Purchase error:', err)
      setError(err.message || 'Purchase failed. Please try again.')
      setShowPinModal(false)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Wifi className="mr-2" size={28} />
                Buy Data Bundle
              </h1>
              <p className="text-gray-300 mt-2">
                All networks • Fast delivery • Best prices
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

        {/* Error & Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="text-red-600 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-red-800 font-semibold">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle2 className="text-green-600 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-green-800 font-semibold">Success!</p>
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          </div>
        )}

        {!hasPinSet && !checkingPin && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <AlertCircle className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-yellow-800 font-semibold">PIN Required</p>
              <p className="text-yellow-600 text-sm">Set up your transaction PIN to purchase data bundles. This adds an extra layer of security to your account.</p>
              <Link href="/dashboard/profile" className="text-yellow-700 hover:text-yellow-800 underline text-sm mt-2 inline-block font-medium">
                Go to Profile Settings
              </Link>
            </div>
          </div>
        )}

      {/* Main Form Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={(e) => { e.preventDefault(); handleBuyClick(); }} className="space-y-6">
          {/* Network Selection */}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Network</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {NETWORKS.map((network) => (
                <button
                  key={network.code}
                  type="button"
                  onClick={() => setSelectedNetwork(network.code)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedNetwork === network.code
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br ${network.color} flex items-center justify-center mb-2`}>
                    <Wifi className="h-6 w-6 text-white" />
                  </div>
                  <span className="block text-sm font-semibold">{network.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="08012345678"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              maxLength={11}
            />
            <p className="text-xs text-gray-500 mt-1">Enter the phone number to receive data</p>
          </div>

          {/* Data Plans */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Data Plan</label>
            {loadingPlans ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-900" />
                <p className="mt-2 text-gray-600">Loading available plans...</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Wifi className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No data plans available for {selectedNetwork}</p>
                <p className="text-sm mt-1">Please try another network or check back later</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Popular Plans */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plans.filter(isPopularPlan).map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        selectedPlan?.id === plan.id
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="font-bold text-xl text-gray-900">{formatDataSize(plan.dataCapacity)}</p>
                          <p className="text-sm text-gray-600">{plan.validity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">₦{plan.sellingPrice.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-500">{plan.description || 'Standard Plan'}</p>
                        <div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Popular</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Other Plans */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-600 mb-3">Other Plans</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {plans.filter(plan => !isPopularPlan(plan)).map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          selectedPlan?.id === plan.id
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">{formatDataSize(plan.dataCapacity)}</p>
                        <p className="text-sm text-gray-600">{plan.validity}</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">₦{plan.sellingPrice.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Purchase Summary */}
          {selectedPlan && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Purchase Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Network:</span><span className="font-medium text-gray-900">{selectedNetwork}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Phone:</span><span className="font-medium text-gray-900">{phone || 'Not entered'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Plan:</span><span className="font-medium text-gray-900">{formatDataSize(selectedPlan.dataCapacity)} - {selectedPlan.validity}</span></div>
                <div className="flex justify-between pt-2 border-t border-gray-200"><span className="text-gray-900 font-semibold">Total:</span><span className="text-xl font-bold text-gray-900">₦{selectedPlan.sellingPrice.toLocaleString()}</span></div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!phone || !selectedPlan || loading || loadingPlans || !hasPinSet || walletBalance < (selectedPlan?.sellingPrice || 0)}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processing Purchase...
              </>
            ) : !hasPinSet ? (
              <>
                <Lock className="h-5 w-5" />
                PIN Required - Go to Settings
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                {selectedPlan ? `Buy ${formatDataSize(selectedPlan.dataCapacity)} Data` : 'Buy Data'}
              </>
            )}
          </button>

          {selectedPlan && walletBalance < selectedPlan.sellingPrice && (
            <p className="text-red-600 text-sm text-center">
              Insufficient balance. Please fund your wallet first.
            </p>
          )}

          <p className="text-xs text-center text-gray-500">
            Need help?{' '}
            <Link href="/support" className="text-gray-900 hover:underline">Contact support</Link>
          </p>

        </form>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="font-semibold text-gray-900 mb-3">🎯 How to Buy Data</h3>
        <ol className="space-y-2 text-sm text-gray-600">
          <li>1. Select your network (MTN, GLO, AIRTEL, 9MOBILE)</li>
          <li>2. Enter the phone number to receive data</li>
          <li>3. Choose a data plan from our options</li>
          <li>4. Verify your transaction with PIN</li>
          <li>5. Data is delivered instantly!</li>
        </ol>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Note:</strong> Data bundles are delivered within seconds. All plans include our
            ₦100 service fee. Need bulk purchase? Contact our support team.
          </p>
        </div>
      </div>

      {/* PIN Modal */}
      <TransactionPinModal 
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onConfirm={handlePurchase}
        amount={selectedPlan?.sellingPrice || 0}
        recipient={phone}
        network={selectedNetwork}
        isLoading={loading}
      />
      </div>
    </div>
  )
}
