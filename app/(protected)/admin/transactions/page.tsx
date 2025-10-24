'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter,
  Download,
  RefreshCw,
  Eye,
  XCircle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  DollarSign,
  Wallet,
  Loader2,
  Calendar,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

interface Transaction {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE' | 'BETTING' | 'EPIN' | 'WALLET' | 'TRANSFER' | 'COMMISSION'
  description: string
  amount: number
  costPrice: number
  profit: number
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  reference: string
  recipient?: string
  createdAt: string
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refundLoading, setRefundLoading] = useState(false)

  const itemsPerPage = 15

  useEffect(() => {
    fetchTransactions()
  }, [])

  useEffect(() => {
    filterTransactions()
  }, [searchQuery, typeFilter, statusFilter, transactions])

  const fetchTransactions = async () => {
    // TODO: Replace with real API call
    setTimeout(() => {
      const mockTransactions: Transaction[] = Array.from({ length: 50 }, (_, i) => {
        const types: Transaction['type'][] = ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'WALLET', 'TRANSFER']
        const type = types[Math.floor(Math.random() * types.length)]
        const amount = Math.floor(Math.random() * 10000) + 100
        const costPrice = amount * 0.8
        const profit = amount - costPrice
        
        return {
          id: `TXN${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          userId: `user-${Math.floor(Math.random() * 100)}`,
          userName: `User ${Math.floor(Math.random() * 100)}`,
          userEmail: `user${Math.floor(Math.random() * 100)}@example.com`,
          type,
          description: `${type} - ${type === 'DATA' ? '1GB MTN' : type === 'AIRTIME' ? 'MTN Airtime' : type}`,
          amount,
          costPrice,
          profit,
          status: ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'FAILED'][Math.floor(Math.random() * 5)] as any,
          reference: `REF${Math.random().toString(36).substr(2, 12).toUpperCase()}`,
          recipient: type === 'AIRTIME' || type === 'DATA' ? `080${Math.floor(10000000 + Math.random() * 90000000)}` : undefined,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        }
      })
      
      setTransactions(mockTransactions)
      setLoading(false)
    }, 500)
  }

  const filterTransactions = () => {
    let filtered = transactions

    if (searchQuery) {
      filtered = filtered.filter(txn =>
        txn.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.recipient?.includes(searchQuery)
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(txn => txn.type === typeFilter.toUpperCase())
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(txn => txn.status === statusFilter.toUpperCase())
    }

    setFilteredTransactions(filtered)
    setCurrentPage(1)
  }

  const handleRefund = async () => {
    if (!selectedTransaction || !refundReason) return
    
    setRefundLoading(true)
    // TODO: API call to process refund
    setTimeout(() => {
      alert(`Refund of ₦${selectedTransaction.amount} processed successfully`)
      setRefundLoading(false)
      setShowRefundModal(false)
      setRefundReason('')
      fetchTransactions()
    }, 1000)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'AIRTIME': return <Smartphone className="w-5 h-5" />
      case 'DATA': return <Wifi className="w-5 h-5" />
      case 'ELECTRICITY': return <Zap className="w-5 h-5" />
      case 'CABLE': return <Tv className="w-5 h-5" />
      case 'BETTING': case 'EPIN': return <DollarSign className="w-5 h-5" />
      case 'WALLET': case 'TRANSFER': return <Wallet className="w-5 h-5" />
      case 'COMMISSION': return <RefreshCw className="w-5 h-5" />
      default: return <DollarSign className="w-5 h-5" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3" /> Completed</span>
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium"><Clock className="w-3 h-3" /> Pending</span>
      case 'FAILED':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium"><XCircle className="w-3 h-3" /> Failed</span>
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const stats = {
    total: transactions.length,
    completed: transactions.filter(t => t.status === 'COMPLETED').length,
    pending: transactions.filter(t => t.status === 'PENDING').length,
    failed: transactions.filter(t => t.status === 'FAILED').length,
    totalRevenue: transactions.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + t.amount, 0),
    totalProfit: transactions.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + t.profit, 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Transactions</h1>
          <p className="mt-1 text-gray-600">Monitor and manage platform transactions</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchTransactions}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600">Total</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600">Completed</p>
          <p className="text-xl font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600">Pending</p>
          <p className="text-xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600">Failed</p>
          <p className="text-xl font-bold text-red-600 mt-1">{stats.failed}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <p className="text-xs text-gray-600">Revenue</p>
          <p className="text-xl font-bold text-gray-900 mt-1">₦{(stats.totalRevenue / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
          <p className="text-xs text-gray-600">Profit</p>
          <p className="text-xl font-bold text-gray-900 mt-1">₦{(stats.totalProfit / 1000).toFixed(0)}K</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by reference, user, description, or recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="airtime">Airtime</option>
            <option value="data">Data</option>
            <option value="electricity">Electricity</option>
            <option value="cable">Cable TV</option>
            <option value="wallet">Wallet</option>
            <option value="transfer">Transfer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-mono text-sm text-gray-900">{txn.reference}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{txn.userName}</p>
                      <p className="text-gray-500">{txn.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                        {getTransactionIcon(txn.type)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{txn.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{txn.description}</p>
                    {txn.recipient && (
                      <p className="text-xs text-gray-500">{txn.recipient}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold text-gray-900">₦{txn.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Cost: ₦{txn.costPrice.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <p className="font-semibold text-green-600">₦{txn.profit.toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(txn.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(txn.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedTransaction(txn)
                          setShowDetailsModal(true)
                        }}
                        className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {txn.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setSelectedTransaction(txn)
                            setShowRefundModal(true)
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Process Refund"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Transaction Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Reference</label>
                  <p className="font-mono font-medium text-gray-900">{selectedTransaction.reference}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">User</label>
                  <p className="font-medium text-gray-900">{selectedTransaction.userName}</p>
                  <p className="text-sm text-gray-500">{selectedTransaction.userEmail}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Type</label>
                  <p className="font-medium text-gray-900">{selectedTransaction.type}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-600">Description</label>
                  <p className="font-medium text-gray-900">{selectedTransaction.description}</p>
                </div>
                {selectedTransaction.recipient && (
                  <div>
                    <label className="text-sm text-gray-600">Recipient</label>
                    <p className="font-medium text-gray-900">{selectedTransaction.recipient}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-600">Date</label>
                  <p className="font-medium text-gray-900">{formatDate(selectedTransaction.createdAt)}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-semibold text-gray-900">₦{selectedTransaction.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost Price</span>
                  <span className="font-semibold text-gray-900">₦{selectedTransaction.costPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-medium text-gray-900">Profit</span>
                  <span className="font-bold text-green-600">₦{selectedTransaction.profit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Refund</h3>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  This will refund ₦{selectedTransaction.amount.toLocaleString()} to {selectedTransaction.userName}'s wallet
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Refund</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  rows={4}
                  placeholder="Enter reason for processing this refund..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRefundModal(false)
                    setRefundReason('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefund}
                  disabled={!refundReason || refundLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {refundLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Process Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
