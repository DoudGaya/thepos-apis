const fs = require('fs');

// ─── Transactions List Page ─────────────────────────────────────────────────
const transactionsPage = `"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface Transaction {
  id: string
  reference: string
  type: string
  amount: number
  status: string
  network: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  vendorName: string | null
}

interface SummaryItem { status: string; count: number; amount: number }
interface TypeItem    { type: string;   count: number; amount: number }

interface TransactionsResponse {
  success: boolean
  data: {
    transactions: Transaction[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
    summary: {
      totalTransactions: number
      totalAmount: number
      statusBreakdown: SummaryItem[]
      typeBreakdown:   TypeItem[]
    }
  }
}

interface GlobalStats {
  totalUsers: number
  totalTransactions: number
  revenue: number
  totalVendors?: number
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#18181b',
  PENDING:   '#71717a',
  FAILED:    '#ef4444',
  CANCELLED: '#a1a1aa',
}

const TYPE_GRAY = ['#18181b','#3f3f46','#52525b','#71717a','#a1a1aa','#d4d4d8','#f4f4f5']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label ?? payload[0].name}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }} className="text-muted-foreground">
          {p.name}: <span className="font-semibold text-foreground">{typeof p.value === 'number' && p.value > 1000 ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [summary, setSummary] = useState<TransactionsResponse['data']['summary'] | null>(null)
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)

  useEffect(() => { fetchTransactions() }, [search, type, status, startDate, endDate, page])
  useEffect(() => { fetchGlobalStats() }, [])

  const fetchGlobalStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (data.success) {
        const s = data.data
        setGlobalStats({
          totalUsers:        s.users?.total      ?? s.totalUsers      ?? 0,
          totalTransactions: s.transactions?.total ?? s.totalTransactions ?? 0,
          revenue:           s.revenue?.total    ?? s.totalRevenue    ?? 0,
          totalVendors:      s.vendors?.total    ?? s.totalVendors    ?? undefined,
        })
      }
    } catch { /* non-critical */ }
  }

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '50' })
      if (search)    params.append('search', search)
      if (type)      params.append('type', type)
      if (status)    params.append('status', status)
      if (startDate) params.append('startDate', startDate)
      if (endDate)   params.append('endDate', endDate)

      const response = await fetch(\`/api/admin/transactions?\${params}\`)
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) throw new Error('Non-JSON response')

      const result: TransactionsResponse = await response.json()
      if (result.success) {
        setTransactions(result.data.transactions)
        setTotalPages(result.data.pagination.totalPages)
        setTotalTransactions(result.data.pagination.total)
        setSummary(result.data.summary ?? null)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', notation: 'compact', maximumFractionDigits: 1 }).format(amount)

  const formatCurrencyFull = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchTransactions() }
  const handleExport = () => alert('Export functionality coming soon')

  const getStatusCount = (s: string) => summary?.statusBreakdown.find(x => x.status === s)?.count ?? 0
  const getStatusAmount = (s: string) => summary?.statusBreakdown.find(x => x.status === s)?.amount ?? 0

  const topTypes = summary?.typeBreakdown
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 7) ?? []

  const pieData = summary?.statusBreakdown.map(s => ({ name: s.status, value: s.count })) ?? []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading transactions\u2026</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transaction Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor and manage all platform transactions</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>Export CSV</Button>
      </div>

      {/* ── Global stat cards ─────────────────────────── */}
      {globalStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Users',        value: globalStats.totalUsers.toLocaleString() },
            { label: 'Total Transactions', value: globalStats.totalTransactions.toLocaleString() },
            { label: 'Total Revenue',      value: formatCurrency(globalStats.revenue) },
            { label: 'Active Vendors',     value: globalStats.totalVendors != null ? String(globalStats.totalVendors) : '\u2014' },
          ].map(c => (
            <Card key={c.label} className="border-border">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="text-xl font-bold mt-1">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Status analytics cards ─────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['COMPLETED','PENDING','FAILED','CANCELLED'] as const).map(s => (
            <Card key={s} className="border-border">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{s}</p>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
                </div>
                <p className="text-xl font-bold">{getStatusCount(s).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(getStatusAmount(s))}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Mini charts ─────────────────────────────────── */}
      {summary && (topTypes.length > 0 || pieData.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bar: transaction types */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Top Transaction Types</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topTypes} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="type" width={88} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                  <Bar dataKey="count" name="Count" radius={[0,3,3,0]}>
                    {topTypes.map((_, i) => <Cell key={i} fill={TYPE_GRAY[i % TYPE_GRAY.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie: status distribution */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="45%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? TYPE_GRAY[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="space-y-1.5 lg:col-span-1">
              <Label className="text-xs">Search</Label>
              <Input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Reference, email\u2026" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type || '_all'} onValueChange={v => setType(v === '_all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Types</SelectItem>
                  <SelectItem value="DATA">Data</SelectItem>
                  <SelectItem value="AIRTIME">Airtime</SelectItem>
                  <SelectItem value="ELECTRICITY">Electricity</SelectItem>
                  <SelectItem value="CABLE">Cable TV</SelectItem>
                  <SelectItem value="WATER">Water</SelectItem>
                  <SelectItem value="BETTING">Betting</SelectItem>
                  <SelectItem value="EPINS">E-Pins</SelectItem>
                  <SelectItem value="CREDIT_PURCHASE">Credit Purchase</SelectItem>
                  <SelectItem value="REFERRAL_BONUS">Referral Bonus</SelectItem>
                  <SelectItem value="WALLET_FUNDING">Wallet Funding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status || '_all'} onValueChange={v => setStatus(v === '_all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Filter</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing {transactions.length} of {totalTransactions.toLocaleString()} transactions
      </p>

      {/* Table */}
      <Card className="overflow-hidden min-w-0">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full divide-y divide-border">
            <thead className="bg-muted/40">
              <tr>
                {['Transaction','User','Type','Amount','Status','Network','Vendor','Date','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">{tx.reference || tx.id.slice(-8)}</div>
                    <div className="text-xs text-muted-foreground">ID: {tx.id.slice(-8)}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">{tx.user.firstName} {tx.user.lastName}</div>
                    <div className="text-xs text-muted-foreground">{tx.user.email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-medium bg-muted/60 text-foreground rounded px-2 py-1">{tx.type}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-foreground">
                    {formatCurrencyFull(tx.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={\`inline-flex px-2 py-1 text-xs font-semibold rounded-full \${
                      tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : tx.status === 'PENDING'  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : tx.status === 'FAILED'   ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-muted text-muted-foreground'
                    }\`}>{tx.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{tx.network || '\u2014'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{tx.vendorName || '\u2014'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <Link href={\`/admin/transactions/\${tx.id}\`} className="text-primary hover:text-primary/80">View</Link>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
`;

// ─── Single Transaction Detail Page ──────────────────────────────────────────
const transactionDetailPage = `"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface TransactionDetail {
  id: string
  reference: string
  type: string
  amount: number
  costPrice: number
  sellingPrice: number
  profit: number
  status: string
  network: string | null
  recipient: string | null
  vendorName: string | null
  vendorReference: string | null
  vendorStatus: string | null
  vendorCallAt: string | null
  vendorResponseAt: string | null
  createdAt: string
  updatedAt: string
  details: any
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

export default function AdminTransactionDetailPage() {
  const params = useParams()
  const txId = params.id as string
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (txId) fetchTransaction() }, [txId])

  const fetchTransaction = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(\`/api/admin/transactions/\${txId}\`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Transaction not found')
        return
      }
      setTransaction(data.data.transaction)
    } catch (e: any) {
      setError('Failed to load transaction')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n)

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string,string> = {
      COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      PENDING:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      FAILED:    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }
    return <span className={\`inline-flex px-2 py-1 text-xs font-semibold rounded-full \${map[status] ?? 'bg-muted text-muted-foreground'}\`}>{status}</span>
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground">Loading transaction\u2026</div>
    </div>
  )

  if (error || !transaction) return (
    <div className="space-y-4">
      <Link href="/admin/transactions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />Back to Transactions
      </Link>
      <div className="text-destructive">{error ?? 'Transaction not found'}</div>
    </div>
  )

  const tx = transaction

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/transactions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1">
            <ArrowLeft className="h-3.5 w-3.5" />Back to Transactions
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{tx.reference || tx.id.slice(-12)}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">ID: {tx.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={tx.status} />
          <Button variant="outline" size="sm" onClick={fetchTransaction}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Amount',       value: formatCurrency(tx.amount) },
          { label: 'Cost Price',   value: formatCurrency(tx.costPrice) },
          { label: 'Selling Price',value: formatCurrency(tx.sellingPrice) },
          { label: 'Profit',       value: formatCurrency(tx.profit) },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{c.label}</p>
              <p className="text-xl font-bold mt-1">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Transaction Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: 'Type',      value: tx.type },
              { label: 'Network',   value: tx.network ?? '\u2014' },
              { label: 'Recipient', value: tx.recipient ?? '\u2014' },
              { label: 'Status',    value: tx.status },
              { label: 'Created',   value: format(new Date(tx.createdAt), 'PPpp') },
              { label: 'Updated',   value: format(new Date(tx.updatedAt), 'PPpp') },
            ].map(f => (
              <div key={f.label} className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground shrink-0">{f.label}</span>
                <span className="text-right font-medium text-foreground">{f.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Vendor Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: 'Vendor Name',  value: tx.vendorName ?? '\u2014' },
              { label: 'Vendor Ref',   value: tx.vendorReference ?? '\u2014' },
              { label: 'Vendor Status',value: tx.vendorStatus ?? '\u2014' },
              { label: 'Call Time',    value: tx.vendorCallAt ? format(new Date(tx.vendorCallAt), 'PPpp') : '\u2014' },
              { label: 'Response Time',value: tx.vendorResponseAt ? format(new Date(tx.vendorResponseAt), 'PPpp') : '\u2014' },
            ].map(f => (
              <div key={f.label} className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground shrink-0">{f.label}</span>
                <span className="text-right font-medium text-foreground">{f.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">User</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{tx.user.firstName} {tx.user.lastName}</p>
              <p className="text-sm text-muted-foreground">{tx.user.email}</p>
              <p className="text-sm text-muted-foreground">{tx.user.phone}</p>
            </div>
            <Link href={\`/admin/users/\${tx.user.id}\`}>
              <Button variant="outline" size="sm">View User</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {tx.details && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Transaction Payload</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted/40 rounded-md p-4 overflow-x-auto text-muted-foreground max-h-64">
              {JSON.stringify(tx.details, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
`;

fs.writeFileSync('c:/projects/the-pos/the-backend/app/admin/transactions/page.tsx', transactionsPage, 'utf8');
fs.writeFileSync('c:/projects/the-pos/the-backend/app/admin/transactions/[id]/page.tsx', transactionDetailPage, 'utf8');

console.log('Transactions list:', transactionsPage.split('\n').length, 'lines | stale:', /bg-white|text-gray-[3-9]|border-gray-[2-9]/.test(transactionsPage));
console.log('Transaction detail:', transactionDetailPage.split('\n').length, 'lines | stale:', /bg-white|text-gray-[3-9]|border-gray-[2-9]/.test(transactionDetailPage));
