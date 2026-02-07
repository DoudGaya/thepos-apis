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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
            type: txn.type || 'UNKNOWN',
            description: txn.details?.description || (txn.type ? txn.type.replace('_', ' ') : 'Transaction'),
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
        setTransactions([])
        setFilteredTransactions([])
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-green-700 bg-green-50 rounded-full border border-green-200">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-yellow-700 bg-yellow-50 rounded-full border border-yellow-200">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-red-700 bg-red-50 rounded-full border border-red-200">
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Transactions</h1>
        <p className="mt-1 text-muted-foreground">View and manage your transaction history.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold mt-2">{transactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {transactions.filter((t) => t.status === 'COMPLETED').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {transactions.filter((t) => t.status === 'PENDING').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="pl-9"
              />
            </div>

            {/* Filter Button */}
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>

            {/* Export Button */}
            <Button
              variant="default"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Transaction Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <div className="overflow-hidden">
          {currentTransactions.length > 0 ? (
            <>
              <div className="divide-y">
                {currentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-6 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${transaction.amount > 0
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-muted text-foreground'
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
                              <p className="font-medium text-foreground">{transaction.description}</p>
                              {transaction.recipient && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  To: {transaction.recipient}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(transaction.createdAt)}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                  {transaction.reference}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p
                                className={`font-bold text-base sm:text-lg ${transaction.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                                  }`}
                              >
                                {transaction.amount > 0 ? '+' : ''}₦
                                {Math.abs(transaction.amount).toLocaleString()}
                              </p>
                              <div className="mt-2 text-right flex justify-end">
                                {getStatusBadge(transaction.status)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of{' '}
                    {filteredTransactions.length} transactions
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground font-medium">No transactions found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Your transactions will appear here'}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
