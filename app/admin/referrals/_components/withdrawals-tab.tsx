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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface WithdrawalRequest {
  id: string
  amount: number
  bankName: string
  accountNumber: string
  accountName: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  adminNote: string | null
  createdAt: string
  processedAt: string | null
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  APPROVED: 'default',
  PENDING: 'secondary',
  REJECTED: 'destructive',
}

export function WithdrawalsTab() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Reject dialog state
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [adminNote, setAdminNote] = useState('')
  const [actioning, setActioning] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/admin/referrals/withdrawals?${params}`)
      const data = await res.json()
      if (data.success) {
        setRequests(data.data?.data ?? [])
        setPagination(data.data?.pagination ?? null)
      }
    } catch (e) {
      console.error('Failed to fetch withdrawals:', e)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT', note?: string) => {
    setActioning(id)
    try {
      const res = await fetch('/api/admin/referrals/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, ...(note ? { adminNote: note } : {}) }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Withdrawal ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`)
        fetchRequests()
      } else {
        toast.error(data.error || 'Action failed')
      }
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setActioning(null)
      setRejectDialog({ open: false, id: null })
      setAdminNote('')
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)

  // Summary counts
  const pending = requests.filter(r => r.status === 'PENDING')
  const approved = requests.filter(r => r.status === 'APPROVED')
  const rejected = requests.filter(r => r.status === 'REJECTED')

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {fmt(pending.reduce((s, r) => s + r.amount, 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{pending.length} request{pending.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {fmt(approved.reduce((s, r) => s + r.amount, 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{approved.length} request{approved.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {fmt(rejected.reduce((s, r) => s + r.amount, 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{rejected.length} request{rejected.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by name, email, or account number…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchRequests} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Account No.</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No withdrawal requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map(req => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {req.user ? `${req.user.firstName} ${req.user.lastName}` : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">{req.user?.email ?? '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{fmt(req.amount)}</TableCell>
                    <TableCell>{req.bankName}</TableCell>
                    <TableCell className="font-mono text-sm">{req.accountNumber}</TableCell>
                    <TableCell>{req.accountName}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[req.status] ?? 'secondary'}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString('en-NG')}
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            disabled={actioning === req.id}
                            onClick={() => handleAction(req.id, 'APPROVE')}
                          >
                            {actioning === req.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            <span className="ml-1">Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive/10"
                            disabled={actioning === req.id}
                            onClick={() => { setRejectDialog({ open: true, id: req.id }); setAdminNote('') }}
                          >
                            <XCircle className="h-3 w-3" />
                            <span className="ml-1">Reject</span>
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} — {pagination.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasMore}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={open => setRejectDialog({ open, id: open ? rejectDialog.id : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="adminNote">Reason (optional — visible to user)</Label>
            <Textarea
              id="adminNote"
              placeholder="Enter reason for rejection…"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!!actioning}
              onClick={() => {
                if (rejectDialog.id) handleAction(rejectDialog.id, 'REJECT', adminNote || undefined)
              }}
            >
              {actioning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
