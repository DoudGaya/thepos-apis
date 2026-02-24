'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, RefreshCw } from 'lucide-react'

interface Earning {
  id: string
  amount: number
  type: string
  status: string
  description: string
  user: { id: string; name: string; email: string } | null
  sourceUser: string
  transactionType: string | null
  createdAt: string
  paidAt: string | null
}

interface Summary {
  paid: { total: number; count: number }
  pending: { total: number; count: number }
  withdrawn: { total: number; count: number }
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

const TYPE_LABELS: Record<string, string> = {
  REFERRAL_BONUS: 'Referral Bonus',
  AGENT_COMMISSION: 'Agent Commission',
  PASSIVE_COMMISSION: 'Passive Commission',
  FIXED_BONUS: 'First-Funding Bonus',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PAID: 'default',
  PENDING: 'secondary',
  WITHDRAWN: 'outline',
}

export function EarningsTab() {
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [page, setPage] = useState(1)

  const fetchEarnings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (userIdFilter.trim()) params.set('userId', userIdFilter.trim())

      const res = await fetch(`/api/admin/referrals/earnings?${params}`)
      const data = await res.json()
      setEarnings(data.earnings ?? [])
      setSummary(data.summary ?? null)
      setPagination(data.pagination ?? null)
    } catch (e) {
      console.error('Failed to fetch earnings:', e)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, userIdFilter])

  useEffect(() => {
    fetchEarnings()
  }, [fetchEarnings])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid Out</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{fmt(summary.paid.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.paid.count} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{fmt(summary.pending.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.pending.count} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Withdrawn to Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{fmt(summary.withdrawn.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.withdrawn.count} transactions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter by User ID..."
          value={userIdFilter}
          onChange={(e) => { setUserIdFilter(e.target.value); setPage(1) }}
          className="w-64"
        />
        <Button variant="outline" size="sm" onClick={fetchEarnings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Earner</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : earnings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No earnings found
                </TableCell>
              </TableRow>
            ) : (
              earnings.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{e.user?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{e.user?.email ?? ''}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.sourceUser}</TableCell>
                  <TableCell>
                    <span className="text-sm">{TYPE_LABELS[e.type] ?? e.type}</span>
                  </TableCell>
                  <TableCell className="font-semibold text-green-700">{fmt(e.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[e.status] ?? 'secondary'}>
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(e.createdAt).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
