'use client'

import { useState, useEffect } from 'react'
import { 
  CreditCard,
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  DollarSign,
  Wallet,
  RefreshCw,
} from 'lucide-react'

interface Transaction {
  id: string
  type: string
  description: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  reference: string
  recipient?: string
  createdAt: string
}

const transactionTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'AIRTIME', label: 'Airtime' },
  { value: 'DATA', label: 'Data' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'CABLE', label: 'Cable TV' },
  { value: 'BETTING', label: 'Betting' },
  { value: 'EPIN', label: 'E-Pins' },
  { value: 'WALLET_FUNDING', label: 'Wallet Funding' },
  { value: 'WALLET', label: 'Wallet' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'COMMISSION', label: 'Commission' },
  { value: 'REFERRAL_BONUS', label: 'Referral Bonus' },
]

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'COMPLETED', label: 'Completed', color: 'text-green-600 bg-green-50' },
  { value: 'PENDING', label: 'Pending', color: 'text-yellow-600 bg-yellow-50' },
  { value: 'FAILED', label: 'Failed', color: 'text-red-600 bg-red-50' },
]

// Simulated transactions
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'DATA',
    description: 'MTN 1GB Data Bundle',
    amount: -240,
    balanceBefore: 15240,
    balanceAfter: 15000,
    status: 'COMPLETED',
    reference: 'TXN001234567',
    recipient: '08012345678',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    type: 'AIRTIME',
    description: 'Airtel ₦200 Airtime',
    amount: -195,
    balanceBefore: 15435,
    balanceAfter: 15240,
    status: 'COMPLETED',
    reference: 'TXN001234566',
    recipient: '08087654321',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '3',
    type: 'WALLET',
    description: 'Wallet Funding via Paystack',
    amount: 5000,
    balanceBefore: 10435,
    balanceAfter: 15435,
    status: 'COMPLETED',
    reference: 'TXN001234565',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '4',
    type: 'ELECTRICITY',
    description: 'EKEDC ₦2,000 Token',
    amount: -2000,
    balanceBefore: 12435,
    balanceAfter: 10435,
    status: 'PENDING',
    reference: 'TXN001234564',
    recipient: '04512345678',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '5',
    type: 'TRANSFER',
    description: 'Transfer to 08098765432',
    amount: -1000,
    balanceBefore: 13435,
    balanceAfter: 12435,
    status: 'COMPLETED',
    reference: 'TXN001234563',
    recipient: '08098765432',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: '6',
    type: 'COMMISSION',
    description: 'Referral Commission from User',
    amount: 250,
    balanceBefore: 13185,
    balanceAfter: 13435,
    status: 'COMPLETED',
    reference: 'TXN001234562',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: '7',
    type: 'CABLE',
    description: 'DSTV Compact Plus Subscription',
    amount: -12000,
    balanceBefore: 25185,
    balanceAfter: 13185,
    status: 'COMPLETED',
    reference: 'TXN001234561',
    recipient: '7012345678',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
  },
  {
    id: '8',
    type: 'DATA',
    description: 'Glo 2GB Data Bundle',
    amount: -460,
    balanceBefore: 25645,
    balanceAfter: 25185,
    status: 'FAILED',
    reference: 'TXN001234560',
    recipient: '08054321098',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString(),
  },
]

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const itemsPerPage = 10

  // Fetch transactions from API
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch('/api/transactions?limit=100')
        
        if (!response.ok) {
          throw new Error('Failed to fetch transactions')
        }

        const data = await response.json()
        
        if (data.success && data.data?.transactions) {
          // Ensure transactions is an array
          const txnData = Array.isArray(data.data.transactions) 
            ? data.data.transactions 
            : (data.data.transactions && typeof data.data.transactions === 'object' 
                ? [data.data.transactions] 
                : [])
          
          // Transform API data to match component interface
          const transformedTransactions = txnData.map((txn: any) => ({
            id: txn.id || `tx-${Date.now()}-${Math.random()}`,
            type: txn.type,
            description: txn.details?.description || txn.type.replace('_', ' '),
            amount: txn.amount,
            balanceBefore: 0, // Not tracked in current schema
            balanceAfter: 0,  // Not tracked in current schema
            status: txn.status,
            reference: txn.reference,
            recipient: txn.details?.phone || txn.details?.meterNumber || txn.details?.smartcardNumber,
            createdAt: txn.createdAt,
          }))
          
          setTransactions(transformedTransactions)
          setFilteredTransactions(transformedTransactions)
        }
      } catch (error: any) {
        console.error('Error fetching transactions:', error)
        setError(error.message || 'Failed to load transactions')
        // Fallback to mock data for demo
        setTransactions(mockTransactions)
        setFilteredTransactions(mockTransactions)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  useEffect(() => {
    let filtered = transactions

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (txn) =>
          txn.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          txn.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
          txn.recipient?.includes(searchQuery)
      )
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((txn) => txn.type === typeFilter)
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((txn) => txn.status === statusFilter)
    }

    setFilteredTransactions(filtered)
    setCurrentPage(1)
  }, [searchQuery, typeFilter, statusFilter, transactions])

  const getTransactionIcon = (type: string) => {
    const iconClass = 'w-5 h-5'
    switch (type) {
      case 'AIRTIME':
        return <Smartphone className={iconClass} />
      case 'DATA':
        return <Wifi className={iconClass} />
      case 'ELECTRICITY':
        return <Zap className={iconClass} />
      case 'CABLE':
        return <Tv className={iconClass} />
      case 'BETTING':
      case 'EPIN':
        return <DollarSign className={iconClass} />
      case 'WALLET':
      case 'TRANSFER':
        return <Wallet className={iconClass} />
      case 'COMMISSION':
        return <RefreshCw className={iconClass} />
      default:
        return <CreditCard className={iconClass} />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-full">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleExport = () => {
    // TODO: Implement CSV export
    alert('Export functionality coming soon!')
  }

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Transactions</h1>
        <p className="mt-1 text-gray-600">View and manage your transaction history</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Total Transactions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{transactions.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {transactions.filter((t) => t.status === 'COMPLETED').length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {transactions.filter((t) => t.status === 'PENDING').length}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                {transactionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                {statusFilters.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {currentTransactions.length > 0 ? (
          <>
            <div className="divide-y divide-gray-200">
              {currentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transaction.amount > 0
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {transaction.amount > 0 ? (
                          <ArrowDownRight className="w-5 h-5" />
                        ) : (
                          getTransactionIcon(transaction.type)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            {transaction.recipient && (
                              <p className="text-sm text-gray-500 mt-1">
                                To: {transaction.recipient}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(transaction.createdAt)}
                              </p>
                              <p className="text-xs text-gray-500 font-mono">
                                {transaction.reference}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p
                              className={`font-bold text-lg ${
                                transaction.amount > 0 ? 'text-green-600' : 'text-gray-900'
                              }`}
                            >
                              {transaction.amount > 0 ? '+' : ''}₦
                              {Math.abs(transaction.amount).toLocaleString()}
                            </p>
                            <div className="mt-2">{getStatusBadge(transaction.status)}</div>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          Balance: ₦{transaction.balanceBefore.toLocaleString()} → ₦
                          {transaction.balanceAfter.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of{' '}
                  {filteredTransactions.length} transactions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No transactions found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Your transactions will appear here'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
