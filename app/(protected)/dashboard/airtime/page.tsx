'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Smartphone, Wallet } from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { TransactionPinModal } from '@/components/transaction-pin-modal'

const NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'] as const
const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000]

export default function AirtimePurchasePage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    network: 'MTN',
    phone: '',
    amount: 0,
  })
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)

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

  const handleQuickAmount = (amount: number) => {
    setFormData({ ...formData, amount })
  }

  const handleInitiatePurchase = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!formData.network) {
      setError('Please select a network')
      return
    }
    if (!formData.phone || formData.phone.length < 11) {
      setError('Please enter a valid phone number (11 digits)')
      return
    }
    if (formData.amount < 50) {
      setError('Minimum airtime amount is ₦50')
      return
    }
    if (formData.amount > 50000) {
      setError('Maximum airtime amount is ₦50,000')
      return
    }
    
    if (walletBalance < formData.amount) {
      setError('Insufficient wallet balance')
      return
    }

    setIsPinModalOpen(true)
  }

  const handleConfirmPurchase = async (pin: string) => {
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/airtime/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          pin
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Purchase failed')
      }

      setSuccess(
        `Airtime purchase successful! ${formData.network} ₦${formData.amount.toLocaleString()} sent to ${formData.phone}. Reference: ${data.data.transaction?.reference || 'N/A'}`
      )
      
      // Update balance
      setWalletBalance(data.data.balance || (walletBalance - formData.amount))
      
      // Reset form and close modal
      setFormData({ network: 'MTN', phone: '', amount: 0 })
      setIsPinModalOpen(false)
      
    } catch (err: any) {
      setError(err.message || 'Failed to purchase airtime')
      // Keep modal open on error so user can retry PIN if it was just wrong PIN
      // But if it's other error, maybe close it? 
      // For now, let's close it if it's not PIN error, but usually we want to keep it open for PIN retry.
      // The error message is shown in the main page, so closing modal is safer to see the error.
      setIsPinModalOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <TransactionPinModal 
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onConfirm={handleConfirmPurchase}
        amount={formData.amount}
        recipient={formData.phone}
        network={formData.network}
        isLoading={loading}
      />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Smartphone className="mr-2" size={28} />
                Buy Airtime
              </h1>
              <p className="text-gray-300 mt-2">
                All networks available • Instant delivery
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
          <form onSubmit={handleInitiatePurchase} className="space-y-6">
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
                    onClick={() => setFormData({ ...formData, network })}
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
              <PhoneInput
                international
                defaultCountry="NG"
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                placeholder="Enter phone number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent [&>input]:outline-none [&>input]:bg-transparent [&>input]:w-full"
              />
            </div>

            {/* Quick Amounts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Amounts
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleQuickAmount(amount)}
                    className={`py-2 px-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                      formData.amount === amount
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    ₦{amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Amount (₦50 - ₦50,000)
              </label>
              <input
                type="number"
                id="amount"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="Enter amount"
                min={50}
                max={50000}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            {/* Price Info */}
            {formData.amount >= 50 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-gray-900">Pricing Information</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">Airtime Value: ₦{formData.amount.toLocaleString()}</p>
                  <p className="font-bold text-lg text-gray-900">
                    You Pay: ₦{formData.amount.toLocaleString()}
                  </p>
                  <p className="text-green-600 text-xs">
                    * Airtime is sold at face value. We earn profit from network commission.
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || loadingBalance || walletBalance < formData.amount || formData.amount < 50}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Processing...
                </>
              ) : (
                `Proceed to Payment`
              )}
            </button>

            {walletBalance < formData.amount && formData.amount >= 50 && (
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
          <h3 className="font-semibold text-gray-900 mb-3">��� How to Buy Airtime</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li>1. Select your network (MTN, GLO, AIRTEL, 9MOBILE)</li>
            <li>2. Enter the phone number to receive airtime</li>
            <li>3. Choose a quick amount or enter custom amount</li>
            <li>4. Click "Purchase Airtime" to complete</li>
            <li>5. Airtime is delivered instantly!</li>
          </ol>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> Minimum purchase is ₦50, maximum is ₦50,000 per transaction. 
              Airtime is delivered within seconds to the specified phone number.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
