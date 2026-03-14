'use client'

import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Trash2, CheckCircle, XCircle, Clock, RefreshCw,
  Eye, AlertTriangle, UserX,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type DeletionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'

interface DeletionRequest {
  id: string
  identifier: string
  reason: string | null
  status: DeletionStatus
  adminNote: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
  } | null
}

const STATUS_CONFIG: Record<DeletionStatus, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING:    { label: 'Pending',    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', icon: <Clock className="h-3 w-3" /> },
  PROCESSING: { label: 'Processing', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',     icon: <RefreshCw className="h-3 w-3" /> },
  COMPLETED:  { label: 'Completed',  className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: <CheckCircle className="h-3 w-3" /> },
  REJECTED:   { label: 'Rejected',   className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',         icon: <XCircle className="h-3 w-3" /> },
}

export default function DeletionRequestsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [selected, setSelected] = useState<DeletionRequest | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [newStatus, setNewStatus] = useState<DeletionStatus>('PROCESSING')
  const [actionLoading, setActionLoading] = useState(false)

  const [toExecute, setToExecute] = useState<DeletionRequest | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => { fetchRequests() }, [statusFilter, page])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter !== 'all') params.append('status', statusFilter)
      const res = await fetch(`/api/admin/deletion-requests?${params}`)
      const data = await res.json()
      if (data.success) {
        setRequests(data.data.requests)
        setTotalPages(data.data.pagination.totalPages)
        setTotal(data.data.pagination.total)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openDetail = (req: DeletionRequest) => {
    setSelected(req)
    setAdminNote(req.adminNote || '')
    setNewStatus(req.status === 'PENDING' ? 'PROCESSING' : req.status)
    setDialogOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/deletion-requests/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, adminNote }),
      })
      if (res.ok) { setDialogOpen(false); fetchRequests() }
    } finally { setActionLoading(false) }
  }

  const handleExecuteDeletion = async () => {
    if (!toExecute) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/deletion-requests/${toExecute.id}`, { method: 'DELETE' })
      if (res.ok) { setConfirmOpen(false); fetchRequests() }
    } finally { setActionLoading(false) }
  }

  const counts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deletion Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} total requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED'] as DeletionStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s]
          return (
            <Card
              key={s}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => { setStatusFilter(s); setPage(1) }}
            >
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{cfg.label}</p>
                <p className="text-2xl font-bold">{counts[s] || 0}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Identifier', 'Matched User', 'Reason', 'Status', 'Submitted', 'Actions'].map(h => (
                    <th key={h} className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No requests found.</td></tr>
                ) : requests.map((req) => {
                  const cfg = STATUS_CONFIG[req.status]
                  return (
                    <tr key={req.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{req.identifier}</td>
                      <td className="px-4 py-3">
                        {req.user ? (
                          <div>
                            <p className="font-medium">{req.user.firstName} {req.user.lastName}</p>
                            <p className="text-xs text-muted-foreground">{req.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">No match</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate text-muted-foreground text-xs">{req.reason || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${cfg.className}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {format(new Date(req.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(req)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {req.status !== 'COMPLETED' && req.status !== 'REJECTED' && req.user && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => { setToExecute(req); setConfirmOpen(true) }}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail / update status dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Deletion Request Details</DialogTitle>
            <DialogDescription>Review and update the status of this request.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm rounded-lg bg-muted/40 p-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Identifier</p>
                  <p className="font-medium">{selected.identifier}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Submitted</p>
                  <p className="font-medium">{format(new Date(selected.createdAt), 'MMM d, yyyy HH:mm')}</p>
                </div>
                {selected.user && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">User</p>
                      <p className="font-medium">{selected.user.firstName} {selected.user.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Email</p>
                      <p className="font-medium text-xs break-all">{selected.user.email}</p>
                    </div>
                  </>
                )}
                {selected.reason && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Reason</p>
                    <p>{selected.reason}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as DeletionStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Admin Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add an internal note…"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={actionLoading}>
              {actionLoading ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute deletion confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />Confirm Account Deletion
            </DialogTitle>
            <DialogDescription>
              This will permanently anonymise{' '}
              <strong>{toExecute?.user?.firstName} {toExecute?.user?.lastName}</strong>'s account.
              All PII will be erased while financial records are retained for regulatory compliance.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleExecuteDeletion} disabled={actionLoading}>
              {actionLoading ? 'Deleting…' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
