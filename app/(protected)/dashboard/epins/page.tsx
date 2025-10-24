'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, GraduationCap, Wallet } from 'lucide-react'

const EPIN_PROVIDERS = ['WAEC', 'NECO', 'NABTEB'] as const

// Sample e-pin prices (in production, fetch from API)
const EPIN_PRICES = {
  WAEC: 3500,
  NECO: 1000,
  NABTEB: 800,
}

const PROFIT_MARGIN = 100

export default function EpinsPurchasePage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    provider: 'WAEC' as keyof typeof EPIN_PRICES,
    quantity: 1,
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

  const perPinCost = EPIN_PRICES[formData.provider]
  const vendorCost = perPinCost * formData.quantity
  const sellingPrice = vendorCost + PROFIT_MARGIN

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!formData.provider) {
      setError('Please select an e-pin provider')
      setLoading(false)
      return
    }
    if (formData.quantity < 1) {
      setError('Minimum quantity is 1')
      setLoading(false)
      return
    }
    if (formData.quantity > 10) {
      setError('Maximum quantity is 10 per transaction')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/bills/epins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: formData.provider,
          quantity: formData.quantity,
          vendorCost,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Purchase failed')
      }

      setSuccess(
        `E-Pin purchase successful! ${formData.quantity} ${formData.provider} pin(s) purchased. Reference: ${data.data.reference}. Check your email or transaction history for pin details.`
      )
      
      // Update balance
      setWalletBalance(prev => prev - sellingPrice)
      
      // Reset form
      setFormData({ provider: 'WAEC', quantity: 1 })
      
    } catch (err: any) {
      setError(err.message || 'Failed to purchase e-pins')
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
                <GraduationCap className="mr-2" size={28} />
                Buy Educational E-Pins
              </h1>
              <p className="text-gray-300 mt-2">
                WAEC, NECO, NABTEB • Instant delivery
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
                Select Exam Body
              </label>
              <div className="grid grid-cols-3 gap-3">
                {EPIN_PROVIDERS.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setFormData({ ...formData, provider })}
                    className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                      formData.provider === provider
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div>
                      <p className="text-sm">{provider}</p>
                      <p className={`text-xs mt-1 ${formData.provider === provider ? 'text-gray-300' : 'text-gray-500'}`}>
                        ₦{EPIN_PRICES[provider].toLocaleString()}/pin
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <GraduationCap className="text-blue-600 mr-2 mt-0.5 flex-shrink-0" size={20} />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">{formData.provider} E-Pin</p>
                  <p className="text-blue-600 mt-1">
                    Price: ₦{perPinCost.toLocaleString()} per pin + ₦{PROFIT_MARGIN} service charge
                  </p>
                </div>
              </div>
            </div>

            {/* Quantity Selection */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                Quantity (1 - 10)
              </label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setFormData({ ...formData, quantity: qty })}
                    className={`py-2 px-3 rounded-lg border-2 font-semibold transition-all ${
                      formData.quantity === qty
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {qty}
                  </button>
                ))}
              </div>
              <input
                type="number"
                id="quantity"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                placeholder="Enter quantity"
                min={1}
                max={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            {/* Price Breakdown */}
            {formData.quantity >= 1 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-gray-900">Pricing Breakdown</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {formData.quantity} × ₦{perPinCost.toLocaleString()}:
                    </span>
                    <span className="font-medium">₦{vendorCost.toLocaleString()}</span>
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
              disabled={loading || loadingBalance || walletBalance < sellingPrice || formData.quantity < 1}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Processing Purchase...
                </>
              ) : (
                `Purchase ${formData.quantity} Pin${formData.quantity > 1 ? 's' : ''} - ₦${sellingPrice.toLocaleString()}`
              )}
            </button>

            {walletBalance < sellingPrice && (
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
          <h3 className="font-semibold text-gray-900 mb-3">🎓 How to Buy E-Pins</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li>1. Select your exam body (WAEC, NECO, or NABTEB)</li>
            <li>2. Choose the quantity you need (1-10 pins)</li>
            <li>3. Review the pricing breakdown</li>
            <li>4. Click "Purchase" to complete your order</li>
            <li>5. Pins are delivered instantly via email and SMS!</li>
          </ol>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">Pricing</h4>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>• WAEC: ₦{EPIN_PRICES.WAEC.toLocaleString()} per pin</li>
              <li>• NECO: ₦{EPIN_PRICES.NECO.toLocaleString()} per pin</li>
              <li>• NABTEB: ₦{EPIN_PRICES.NABTEB.toLocaleString()} per pin</li>
              <li>• Service charge: ₦{PROFIT_MARGIN} (one-time per transaction)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
