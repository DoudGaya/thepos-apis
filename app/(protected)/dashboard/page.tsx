'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  Wallet, 
  Smartphone, 
  Wifi, 
  Zap, 
  TrendingUp, 
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface WalletData {
  balance: number
  commissionBalance: number
}

interface QuickStat {
  label: string
  value: string
  change: string
  isPositive: boolean
}

interface RecentTransaction {
  id: string
  type: string
  description: string
  amount: number
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  createdAt: string
}

// Helper functions to calculate stats
function calculateTotalSpent(transactions: RecentTransaction[]): string {
  const total = transactions
    .filter(t => t.amount < 0 && (t.status === 'COMPLETED' || t.status === 'PENDING'))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  return `₦${total.toLocaleString()}`
}

function calculateMonthlySpent(transactions: RecentTransaction[]): string {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const total = transactions
    .filter(t => {
      const txDate = new Date(t.createdAt)
      return t.amount < 0 && txDate >= monthStart && (t.status === 'COMPLETED' || t.status === 'PENDING')
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  return `₦${total.toLocaleString()}`
}

function getTransactionDescription(tx: any): string {
  const details = tx.details || {}
  
  switch (tx.type) {
    case 'DATA':
      return `${details.network} ${details.planName || 'Data Bundle'}`
    case 'AIRTIME':
      return `${details.network} Airtime ₦${tx.amount}`
    case 'ELECTRICITY':
      return `Electricity Token ₦${tx.amount}`
    case 'CABLE':
    case 'CABLE_TV':
      return `Cable TV Subscription ₦${tx.amount}`
    case 'WALLET_FUNDING':
      return `Wallet Funding ₦${tx.amount}`
    default:
      return tx.type
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, commissionBalance: 0 })
  const [stats, setStats] = useState<QuickStat[]>([])
  const [transactions, setTransactions] = useState<RecentTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch wallet balance
        const walletRes = await fetch('/api/wallet/balance', {
          credentials: 'include'
        })
        const walletData = walletRes.ok ? await walletRes.json() : null

        // Fetch transactions
        const transactionsRes = await fetch('/api/transactions?limit=5', {
          credentials: 'include'
        })
        const transactionsData = transactionsRes.ok ? await transactionsRes.json() : null

        // Fetch referral stats
        const referralsRes = await fetch('/api/referrals', {
          credentials: 'include'
        })
        const referralsData = referralsRes.ok ? await referralsRes.json() : null

        if (walletData?.data) {
          setWallet({
            balance: walletData.data.balance || 0,
            commissionBalance: walletData.data.commissionBalance || 0,
          })
        }

        if (Array.isArray(transactionsData?.data?.transactions)) {
          const txList = transactionsData.data.transactions.map((tx: any, index: number) => ({
            id: tx.id || `tx-${Date.now()}-${index}`,
            type: tx.type,
            description: getTransactionDescription(tx),
            amount: tx.type === 'WALLET_FUNDING' ? tx.amount : -tx.amount,
            status: tx.status === 'SUCCESS' ? 'COMPLETED' : tx.status,
            createdAt: tx.createdAt,
          }))
          setTransactions(txList)
        } else if (transactionsData?.data?.transactions) {
          // API sometimes returns an object or null; normalize single transaction into array
          const single = transactionsData.data.transactions
          const tx = single && typeof single === 'object' ? single : null
          if (tx) {
            const txList = [{
              id: tx.id || `tx-${Date.now()}-0`,
              type: tx.type,
              description: getTransactionDescription(tx),
              amount: tx.type === 'WALLET_FUNDING' ? tx.amount : -tx.amount,
              status: tx.status === 'SUCCESS' ? 'COMPLETED' : tx.status,
              createdAt: tx.createdAt,
            }]
            setTransactions(txList)
          }
        }

        if ((transactionsData?.data?.transactions && (Array.isArray(transactionsData.data.transactions) || typeof transactionsData.data.transactions === 'object')) || referralsData?.data?.stats) {
          const txList = Array.isArray(transactionsData?.data?.transactions)
            ? transactionsData.data.transactions
            : (transactionsData?.data?.transactions ? [transactionsData.data.transactions] : [])
          const referralStats = referralsData?.data?.stats
          
          setStats([
            { 
              label: 'Total Spent', 
              value: calculateTotalSpent(txList),
              change: '+12%', 
              isPositive: true 
            },
            { 
              label: 'Transactions', 
              value: (transactionsData?.data?.total || 0).toString(),
              change: '+8%', 
              isPositive: true 
            },
            { 
              label: 'This Month', 
              value: calculateMonthlySpent(txList),
              change: '-3%', 
              isPositive: false 
            },
            { 
              label: 'Referral Earnings', 
              value: `₦${(referralStats?.totalEarned || 0).toLocaleString()}`,
              change: '+25%', 
              isPositive: true 
            },
          ])
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        // Keep initial loading state to show skeleton
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}! 👋
        </h1>
        <p className="mt-1 text-gray-600">
          Here's what's happening with your account today.
        </p>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Wallet */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-300 text-sm">Main Wallet</p>
              <h2 className="text-3xl font-bold mt-1">
                ₦{wallet.balance.toLocaleString()}
              </h2>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Link
              href="/dashboard/wallet?action=fund"
              className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-900 py-2 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Fund
            </Link>
            <Link
              href="/dashboard/wallet?action=transfer"
              className="flex-1 flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm py-2 px-4 rounded-lg font-medium hover:bg-white/30 transition-colors"
            >
              <Send className="w-4 h-4" />
              Transfer
            </Link>
          </div>
        </div>

        {/* Commission Wallet */}
        <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm">Commission Balance</p>
              <h2 className="text-3xl font-bold text-gray-900 mt-1">
                ₦{wallet.commissionBalance.toLocaleString()}
              </h2>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/dashboard/referrals"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-colors"
            >
              View Referrals
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">{stat.label}</p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <span
                className={`flex items-center text-xs font-medium ${
                  stat.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/airtime"
            className="group bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all text-center"
          >
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smartphone className="w-6 h-6 text-gray-900" />
            </div>
            <h3 className="mt-3 font-semibold text-gray-900">Buy Airtime</h3>
            <p className="text-xs text-gray-600 mt-1">All networks</p>
          </Link>

          <Link
            href="/dashboard/data"
            className="group bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all text-center"
          >
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wifi className="w-6 h-6 text-gray-900" />
            </div>
            <h3 className="mt-3 font-semibold text-gray-900">Buy Data</h3>
            <p className="text-xs text-gray-600 mt-1">Best prices</p>
          </Link>

          <Link
            href="/dashboard/electricity"
            className="group bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all text-center"
          >
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-gray-900" />
            </div>
            <h3 className="mt-3 font-semibold text-gray-900">Electricity</h3>
            <p className="text-xs text-gray-600 mt-1">Pay bills</p>
          </Link>

          <Link
            href="/dashboard/transactions"
            className="group bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all text-center"
          >
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-gray-900" />
            </div>
            <h3 className="mt-3 font-semibold text-gray-900">Transactions</h3>
            <p className="text-xs text-gray-600 mt-1">View history</p>
          </Link>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <Link
              href="/dashboard/transactions"
              className="text-sm text-gray-900 hover:text-gray-700 font-medium"
            >
              View all
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      transaction.amount > 0
                        ? 'bg-green-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    {transaction.amount > 0 ? (
                      <ArrowDownRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-gray-900" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">
                        {formatTimeAgo(transaction.createdAt)}
                      </span>
                      {transaction.status === 'COMPLETED' && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      )}
                      {transaction.status === 'PENDING' && (
                        <span className="flex items-center gap-1 text-xs text-yellow-600">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                      {transaction.status === 'FAILED' && (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-gray-900'
                    }`}
                  >
                    {transaction.amount > 0 ? '+' : ''}₦{Math.abs(transaction.amount).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
