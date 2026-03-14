"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageLoader } from '@/app/admin/_components/page-loader'
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
      const res = await fetch(`/api/admin/transactions/${txId}`)
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
    return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${map[status] ?? 'bg-muted text-muted-foreground'}`}>{status}</span>
  }

  if (loading) return <PageLoader />

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
              { label: 'Network',   value: tx.network ?? '—' },
              { label: 'Recipient', value: tx.recipient ?? '—' },
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
              { label: 'Vendor Name',  value: tx.vendorName ?? '—' },
              { label: 'Vendor Ref',   value: tx.vendorReference ?? '—' },
              { label: 'Vendor Status',value: tx.vendorStatus ?? '—' },
              { label: 'Call Time',    value: tx.vendorCallAt ? format(new Date(tx.vendorCallAt), 'PPpp') : '—' },
              { label: 'Response Time',value: tx.vendorResponseAt ? format(new Date(tx.vendorResponseAt), 'PPpp') : '—' },
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
            <Link href={`/admin/users/${tx.user.id}`}>
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
