'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Wifi, Wallet, Lock, X, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

const NETWORKS = [
  { code: 'MTN', name: 'MTN', color: 'bg-yellow-500' },
  { code: 'GLO', name: 'Glo', color: 'bg-green-500' },
  { code: 'AIRTEL', name: 'Airtel', color: 'bg-red-500' },
  { code: '9MOBILE', name: '9mobile', color: 'bg-emerald-500' },
] as const

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
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
    if (walletBalance < selectedPlan.sellingPrice) {
      setError(`Insufficient balance. Required: ₦${selectedPlan.sellingPrice.toLocaleString()}, Available: ₦${walletBalance.toLocaleString()}`)
      return
    }
    setShowPinModal(true)
  }

  const handlePurchase = async () => {
    if (!pin || pin.length < 4) {
      setError('Please enter your 4-6 digit transaction PIN')
      return
    }
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
      setPin('')
      setPhone('')
      setSelectedPlan(null)
      if (data.data?.wallet?.newBalance !== undefined) {
        setWalletBalance(data.data.wallet.newBalance)
      }
    } catch (err: any) {
      console.error('Purchase error:', err)
      setError(err.message || 'Purchase failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Buy Data</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Purchase data bundles for all Nigerian networks</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
          <Wallet className="h-5 w-5 text-emerald-600" />
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{loadingBalance ? '...' : formatCurrency(walletBalance)}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-700"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Success!</p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-700"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Network</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {NETWORKS.map((network) => (
                <button
                  key={network.code}
                  onClick={() => setSelectedNetwork(network.code)}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${selectedNetwork === network.code ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                >
                  <div className={`w-12 h-12 rounded-full ${network.color} flex items-center justify-center mb-2`}>
                    <Wifi className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{network.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="08012345678"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              maxLength={11}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter 11-digit Nigerian phone number</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Data Plan</label>
            {loadingPlans ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Wifi className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No data plans available for {selectedNetwork}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    disabled={!plan.isAvailable}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${selectedPlan?.id === plan.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'} ${!plan.isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{plan.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{plan.validity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(plan.sellingPrice)}</p>
                        <p className="text-xs text-gray-500 line-through">{formatCurrency(plan.costPrice)}</p>
                      </div>
                    </div>
                    {plan.description && <p className="text-xs text-gray-600 dark:text-gray-400">{plan.description}</p>}
                    {!plan.isAvailable && <p className="text-xs text-red-600 dark:text-red-400 mt-2">Unavailable</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPlan && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Purchase Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Network:</span><span className="font-medium text-gray-900 dark:text-white">{selectedNetwork}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Phone:</span><span className="font-medium text-gray-900 dark:text-white">{phone || 'Not entered'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Plan:</span><span className="font-medium text-gray-900 dark:text-white">{selectedPlan.name}</span></div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700"><span className="text-gray-900 dark:text-white font-semibold">Total:</span><span className="text-emerald-600 font-bold text-lg">{formatCurrency(selectedPlan.sellingPrice)}</span></div>
              </div>
            </div>
          )}

          <button
            onClick={handleBuyClick}
            disabled={!phone || !selectedPlan || loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (<><Loader2 className="h-5 w-5 animate-spin" />Processing...</>) : (<><Lock className="h-5 w-5" />Buy Data</>)}
          </button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Don't have a transaction PIN?{' '}
            <Link href="/dashboard/profile" className="text-emerald-600 hover:underline">Set up PIN in your profile</Link>
          </p>
        </div>
      </div>

      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enter Transaction PIN</h3>
              <button onClick={() => { setShowPinModal(false); setPin(''); setError('') }} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Please enter your 4-6 digit transaction PIN to authorize this purchase</p>
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction PIN</label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    id="pin"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter PIN"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    maxLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowPinModal(false); setPin(''); setError('') }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={loading || pin.length < 4}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Processing...</>) : ('Confirm Purchase')}
                </button>
              </div>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                <Link href="/dashboard/profile" className="text-emerald-600 hover:underline">Forgot PIN?</Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
