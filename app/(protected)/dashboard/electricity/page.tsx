'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Zap, Wallet } from 'lucide-react'

const ELECTRICITY_PROVIDERS = [
  'EKEDC', 'IKEDC', 'IBEDC', 'PHEDC', 'JEDC', 'KEDC',
  'AEDC', 'BEDC', 'EEDC', 'KEDCO', 'KAEDCO', 'YEDC', 'PORTHARCOURT'
] as const

const PROFIT_MARGIN = 100

export default function ElectricityPurchasePage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    provider: 'EKEDC',
    meterNumber: '',
    meterType: 'prepaid' as 'prepaid' | 'postpaid',
    vendorCost: 0,
    customerName: '',
  })
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifiedName, setVerifiedName] = useState('')

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

  const verifyMeter = async () => {
    if (!formData.meterNumber || formData.meterNumber.length < 10) {
      setError('Please enter a valid meter number')
      return
    }
    
    setVerifying(true)
    setError('')
    setVerifiedName('')
    
    try {
      const res = await fetch('/api/bills/electricity/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disco: formData.provider,
          meterNumber: formData.meterNumber,
          meterType: formData.meterType.toUpperCase()
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        setVerifiedName(data.data.customerName || data.data.name || 'Verified Customer')
        setFormData(prev => ({ ...prev, customerName: data.data.customerName || data.data.name }))
        setSuccess('Meter verified successfully')
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch (err) {
      setError('Failed to verify meter')
    } finally {
      setVerifying(false)
    }
  }

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
    if (!formData.meterNumber || formData.meterNumber.length < 10) {
      setError('Please enter a valid meter number (at least 10 digits)')
      setLoading(false)
      return
    }
    if (!verifiedName) {
      setError('Please verify the meter number first')
      setLoading(false)
      return
    }
    if (formData.vendorCost < 1000) {
      setError('Minimum electricity purchase is ₦1,000')
      setLoading(false)
      return
    }
    if (formData.vendorCost > 100000) {
      setError('Maximum electricity purchase is ₦100,000')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/bills/electricity', {
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
        `Electricity token purchased successfully! Token: ${data.data.token || 'Check your phone'}. Reference: ${data.data.reference}`
      )
      
      // Update balance
      setWalletBalance(prev => prev - sellingPrice)
      
      // Reset form
      setFormData({ 
        provider: 'EKEDC', 
        meterNumber: '', 
        meterType: 'prepaid', 
        vendorCost: 0,
        customerName: '' 
      })
      
    } catch (err: any) {
      setError(err.message || 'Failed to purchase electricity token')
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
                <Zap className="mr-2" size={28} />
                Buy Electricity
              </h1>
              <p className="text-gray-300 mt-2">
                All DISCOs available • Instant token
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
                Select Provider (DISCO)
              </label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                {ELECTRICITY_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>

            {/* Meter Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meter Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, meterType: 'prepaid' })}
                  className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                    formData.meterType === 'prepaid'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Prepaid
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, meterType: 'postpaid' })}
                  className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                    formData.meterType === 'postpaid'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Postpaid
                </button>
              </div>
            </div>

            {/* Meter Number */}
            <div>
              <label htmlFor="meterNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Meter Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="meterNumber"
                  value={formData.meterNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, meterNumber: e.target.value })
                    setVerifiedName('') // Reset verification on change
                  }}
                  placeholder="Enter your meter number"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={verifyMeter}
                  disabled={verifying || !formData.meterNumber}
                  className="px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {verifying ? <Loader2 className="animate-spin w-5 h-5" /> : 'Verify'}
                </button>
              </div>
            </div>

            {/* Customer Name (Verified) */}
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name
              </label>
              <input
                type="text"
                id="customerName"
                value={verifiedName || formData.customerName}
                readOnly
                placeholder="Verify meter to see name"
                className={`w-full px-4 py-3 border rounded-lg ${
                  verifiedName 
                    ? 'bg-green-50 border-green-200 text-green-700 font-medium' 
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              />
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="vendorCost" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₦1,000 - ₦100,000)
              </label>
              <input
                type="number"
                id="vendorCost"
                value={formData.vendorCost || ''}
                onChange={(e) => setFormData({ ...formData, vendorCost: parseFloat(e.target.value) || 0 })}
                placeholder="Enter amount"
                min={1000}
                max={100000}
                step={100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Quick amounts: ₦1,000 | ₦2,000 | ₦5,000 | ₦10,000
              </p>
            </div>

            {/* Price Breakdown */}
            {formData.vendorCost >= 1000 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-gray-900">Pricing Breakdown</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Token Value:</span>
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
              disabled={loading || loadingBalance || walletBalance < sellingPrice || formData.vendorCost < 1000}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Processing Purchase...
                </>
              ) : (
                `Purchase Electricity - ₦${sellingPrice.toLocaleString()}`
              )}
            </button>

            {walletBalance < sellingPrice && formData.vendorCost >= 1000 && (
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
          <h3 className="font-semibold text-gray-900 mb-3">⚡ How to Buy Electricity</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li>1. Select your electricity provider (DISCO)</li>
            <li>2. Choose meter type (Prepaid or Postpaid)</li>
            <li>3. Enter your meter number</li>
            <li>4. Enter the amount you want to purchase</li>
            <li>5. Click "Purchase" - Token delivered instantly!</li>
          </ol>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> Minimum purchase is ₦1,000, maximum is ₦100,000. 
              Fixed service charge of ₦100 applies to all purchases. Token is delivered via SMS and shown on screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
