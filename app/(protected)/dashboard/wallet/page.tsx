'use client'

import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Copy, 
  Check,
  CreditCard,
  Building2,
  Smartphone,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import Script from 'next/script'

declare global {
  interface Window {
    PaystackPop: any
  }
}

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  reference: string
  details: any
  createdAt: string
}

export default function WalletPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const action = searchParams.get('action')
  
  const [walletBalance, setWalletBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showFundModal, setShowFundModal] = useState(action === 'fund')
  const [showTransferModal, setShowTransferModal] = useState(action === 'transfer')
  const [fundingMethod, setFundingMethod] = useState<'card' | 'transfer' | null>(null)
  const [fundAmount, setFundAmount] = useState('')
  const [transferData, setTransferData] = useState({ phone: '', amount: '', pin: '' })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Virtual account details (simulated - replace with real API)
  const virtualAccount = {
    accountNumber: '8012345678',
    accountName: session?.user?.name || 'User Name',
    bankName: 'Wema Bank',
  }

  // Fetch wallet balance and transactions
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoadingData(true)
        setError('')

        // Fetch wallet balance
        const balanceResponse = await fetch('/api/wallet/balance', {
          credentials: 'include'
        })
        
        console.log('📊 Balance API Response Status:', balanceResponse.status)
        
        const balanceData = await balanceResponse.json()
        console.log('📊 Balance API Response Data:', balanceData)
        
        if (balanceResponse.ok) {
          setWalletBalance(balanceData.data?.balance || 0)
          console.log('✅ Balance fetched successfully:', balanceData.data?.balance)
        } else {
          const errorMsg = balanceData.error || `API Error: ${balanceResponse.status}`
          console.error('❌ Balance fetch error:', errorMsg, balanceData)
          setError(errorMsg)
        }

        // Fetch recent transactions
        const transactionsResponse = await fetch('/api/transactions?limit=10', {
          credentials: 'include'
        })
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json()
          setTransactions(transactionsData.data?.transactions || [])
        } else {
          console.error('❌ Transactions fetch error:', transactionsResponse.status)
        }
      } catch (error) {
        console.error('❌ Error fetching wallet data:', error)
        setError('Failed to load wallet data: ' + (error instanceof Error ? error.message : 'Unknown error'))
      } finally {
        setLoadingData(false)
      }
    }

    if (session) {
      console.log('👤 Session available, fetching wallet data:', session.user?.email)
      fetchWalletData()
    } else {
      console.log('⚠️ No session available')
    }
  }, [session])

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(virtualAccount.accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFundWithCard = async () => {
    if (!fundAmount || parseFloat(fundAmount) < 100) {
      setError('Minimum funding amount is ₦100')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Initialize payment with backend
      const response = await fetch('/api/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: parseFloat(fundAmount) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Payment initialization failed')
      }

      // Initialize Paystack popup
      if (typeof window !== 'undefined' && window.PaystackPop) {
        const handler = window.PaystackPop.setup({
          key: data.data.publicKey,
          email: session?.user?.email,
          amount: parseFloat(fundAmount) * 100, // Convert to kobo
          ref: data.data.reference,
          currency: 'NGN',
          onClose: () => {
            setLoading(false)
            setError('Payment cancelled')
          },
          callback: (response: any) => {
            // Verify payment
            setSuccess('Payment successful! Verifying...')
            
            fetch('/api/wallet/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ reference: response.reference }),
            })
            .then(res => res.json())
            .then(verifyData => {
              if (verifyData.success) {
                setSuccess('Wallet funded successfully!')
                setWalletBalance(prev => prev + parseFloat(fundAmount))
                setShowFundModal(false)
                setFundingMethod(null)
                setFundAmount('')
                
                // Refresh transactions
                setTimeout(() => {
                  window.location.reload()
                }, 1500)
              } else {
                setError('Payment verification failed. Please contact support.')
              }
            })
            .catch(error => {
              setError('Payment verification failed')
            })
            .finally(() => {
              setLoading(false)
            })
          },
        })
        handler.openIframe()
      } else {
        throw new Error('Paystack SDK not loaded')
      }
    } catch (error: any) {
      setError(error.message || 'Payment initialization failed')
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferData.phone || !transferData.amount || !transferData.pin) {
      setError('Please fill all fields including PIN')
      return
    }

    if (parseFloat(transferData.amount) > walletBalance) {
      setError('Insufficient balance')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: transferData.phone,
          amount: parseFloat(transferData.amount),
          pin: transferData.pin,
          description: 'Wallet Transfer'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Transfer failed')
      }

      setSuccess('Transfer successful!')
      setWalletBalance(prev => prev - parseFloat(transferData.amount))
      setShowTransferModal(false)
      setTransferData({ phone: '', amount: '', pin: '' })
      
      // Refresh transactions
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      setError(error.message || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Paystack Script */}
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="space-y-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Wallet</h1>
          <p className="mt-1 text-gray-600">Manage your wallet and view transactions</p>
        </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-gray-300 text-sm">Available Balance</p>
            {loadingData ? (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-2xl font-bold">Loading...</span>
              </div>
            ) : (
              <h2 className="text-4xl font-bold mt-2">
                ₦{walletBalance.toLocaleString()}
              </h2>
            )}
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowFundModal(true)}
            disabled={loadingData}
            className="flex items-center justify-center gap-2 bg-white text-gray-900 py-3 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Fund Wallet
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            disabled={loadingData}
            className="flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm py-3 px-4 rounded-lg font-medium hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-5 h-5" />
            Transfer
          </button>
        </div>
      </div>

      {/* Virtual Account Card */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Virtual Account</h3>
            <p className="text-sm text-gray-600 mt-1">
              Fund your wallet by transferring to this account
            </p>
          </div>
          <Building2 className="w-6 h-6 text-gray-400" />
        </div>

        <div className="space-y-3 mt-4">
          <div>
            <p className="text-xs text-gray-500">Bank Name</p>
            <p className="font-medium text-gray-900 mt-1">{virtualAccount.bankName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Account Number</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-mono font-semibold text-gray-900 text-lg">
                {virtualAccount.accountNumber}
              </p>
              <button
                onClick={handleCopyAccount}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500">Account Name</p>
            <p className="font-medium text-gray-900 mt-1">{virtualAccount.accountName}</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            ℹ️ Transfers to this account are automatically credited to your wallet within minutes
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
          <a 
            href="/dashboard/transactions" 
            className="text-sm text-gray-900 hover:text-gray-700 font-medium"
          >
            View All
          </a>
        </div>
        <div className="divide-y divide-gray-200">
          {loadingData ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-gray-400 animate-spin" />
              <p className="mt-4 text-gray-500">Loading transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            transactions.map((transaction) => {
              const isCredit = transaction.type === 'WALLET_FUNDING'
              const description = transaction.details?.description || 
                (transaction.type === 'WALLET_FUNDING' ? 'Wallet Funding' : 
                transaction.type.replace('_', ' '))

              return (
                <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isCredit ? 'bg-green-100' : 'bg-gray-800'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{description}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(transaction.createdAt).toLocaleString('en-NG', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Ref: {transaction.reference}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          isCredit ? 'text-green-600' : 'text-gray-900'
                        }`}
                      >
                        {isCredit ? '+' : '-'}₦{transaction.amount.toLocaleString()}
                      </p>
                      <span 
                        className={`inline-block mt-1 text-xs px-2 py-1 rounded ${
                          transaction.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-700'
                            : transaction.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-12 text-center">
              <Wallet className="w-12 h-12 mx-auto text-gray-300" />
              <p className="mt-4 text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-2">Fund your wallet to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Fund Wallet Modal */}
      {showFundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Fund Wallet</h3>
              <button
                onClick={() => {
                  setShowFundModal(false)
                  setFundingMethod(null)
                  setFundAmount('')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!fundingMethod ? (
              <div className="space-y-3">
                <button
                  onClick={() => setFundingMethod('card')}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-all"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-gray-900" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">Pay with Card</p>
                    <p className="text-sm text-gray-600">Instant credit via Paystack</p>
                  </div>
                </button>

                <button
                  onClick={() => setFundingMethod('transfer')}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-all"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">Bank Transfer</p>
                    <p className="text-sm text-gray-600">Transfer to virtual account</p>
                  </div>
                </button>
              </div>
            ) : fundingMethod === 'card' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₦)
                  </label>
                  <input
                    type="number"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">Minimum: ₦100</p>
                </div>

                <button
                  onClick={handleFundWithCard}
                  disabled={loading || !fundAmount}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pay ₦{fundAmount || '0'}
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Transfer any amount to your virtual account details shown above. Your wallet will be credited automatically.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowFundModal(false)
                    setFundingMethod(null)
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Got it
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Transfer to User</h3>
              <button
                onClick={() => {
                  setShowTransferModal(false)
                  setTransferData({ phone: '', amount: '', pin: '' })
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Smartphone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={transferData.phone}
                    onChange={(e) =>
                      setTransferData({ ...transferData, phone: e.target.value })
                    }
                    placeholder="08012345678"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  value={transferData.amount}
                  onChange={(e) =>
                    setTransferData({ ...transferData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  min="100"
                  max={walletBalance}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Available: ₦{walletBalance.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction PIN
                </label>
                <input
                  type="password"
                  value={transferData.pin}
                  onChange={(e) =>
                    setTransferData({ ...transferData, pin: e.target.value })
                  }
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleTransfer}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-5 h-5" />
                    Transfer ₦{transferData.amount || '0'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
