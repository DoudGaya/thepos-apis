"use client"

import React, { useEffect, useState } from 'react'
import { PageLoader } from '@/app/admin/_components/page-loader'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface UserDetail {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    credits: number
    isVerified: boolean
    role: string
    createdAt: string
    updatedAt: string
    referralCode: string
    referredBy: string | null
    fullName: string
    emailVerified: string | null
    phoneVerified: boolean
  }
  stats: {
    totalTransactions: number
    totalSpent: number
    totalReferrals: number
    totalReferralEarnings: number
    transactionsByType: Array<{
      type: string
      count: number
      total: number
    }>
  }
  recentTransactions: Array<{
    id: string
    type: string
    amount: number
    status: string
    reference: string
    createdAt: string
  }>
  referrer: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const userId = params.id as string
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [editRole, setEditRole] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (userId) fetchUserDetail()
  }, [userId])

  const fetchUserDetail = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      const result = await response.json()
      if (result.success) {
        setUser(result.data)
        setEditRole(result.data.user.role)
        setIsVerified(result.data.user.isVerified)
      }
    } catch (error) {
      console.error('Failed to fetch user detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async () => {
    setEditLoading(true)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, isVerified }),
      })
      const result = await response.json()
      if (!response.ok) { setMessage(`Error: ${result.error || 'Failed to update user'}`); return }
      setMessage('User updated successfully')
      setShowEditModal(false)
      await fetchUserDetail()
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setEditLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 8) { setMessage('Password must be at least 8 characters'); return }
    setResetLoading(true)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      })
      const result = await response.json()
      if (!response.ok) { setMessage(`Error: ${result.error || 'Failed to reset password'}`); return }
      setMessage('Password reset successfully')
      setShowResetModal(false)
      setResetPassword('')
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setResetLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)

  const StatusBadge = ({ ok, yes, no }: { ok: boolean; yes: string; no: string }) => (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
      ok ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
         : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    }`}>{ok ? yes : no}</span>
  )

  const TxBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
      COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      PENDING:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      FAILED:    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${map[status] ?? 'bg-muted text-muted-foreground'}`}>
        {status}
      </span>
    )
  }

  if (loading) return <PageLoader />

  if (!user) {
    return <div className="text-center text-destructive">User not found</div>
  }

  const TABS = [
    { id: 'profile',       label: 'Profile' },
    { id: 'transactions',  label: 'Transactions' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'referrals',     label: 'Referrals' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1">
            <ArrowLeft className="h-3.5 w-3.5" /><span>Back to Users</span>
          </Link>
          <h1 className="text-2xl font-semibold">{user.user.firstName} {user.user.lastName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">ID: {user.user.id}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setMessage(''); setShowEditModal(true) }}>Edit User</Button>
          <Button variant="outline" onClick={() => { setMessage(''); setShowResetModal(true) }}>Reset Password</Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Wallet Balance',     value: formatCurrency(user.user.credits) },
          { label: 'Total Transactions', value: String(user.stats.totalTransactions) },
          { label: 'Referral Earnings',  value: formatCurrency(user.stats.totalReferralEarnings) },
          { label: 'Referrals Made',     value: String(user.stats.totalReferrals) },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-semibold mt-0.5">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab Container */}
      <Card>
        {/* Tab Nav */}
        <div className="border-b border-border">
          <nav className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Basic Information</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Full Name', value: `${user.user.firstName} ${user.user.lastName}` },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
                      <p className="text-sm mt-0.5">{f.value}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Email</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm">{user.user.email}</p>
                      <StatusBadge ok={!!user.user.emailVerified} yes="Verified" no="Unverified" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Phone</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm">{user.user.phone}</p>
                      <StatusBadge ok={user.user.phoneVerified} yes="Verified" no="Unverified" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Role</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-0.5 ${
                      user.user.role === 'ADMIN'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>{user.user.role}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Account Status</p>
                    <div className="mt-0.5">
                      <StatusBadge ok={user.user.isVerified} yes="Verified" no="Unverified" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Account Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Referral Code</p>
                    <p className="text-sm font-mono mt-0.5 bg-muted/50 rounded px-2 py-1 inline-block">{user.user.referralCode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Referred By</p>
                    <p className="text-sm mt-0.5">{user.user.referredBy || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Joined</p>
                    <p className="text-sm mt-0.5">{format(new Date(user.user.createdAt), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
                    <p className="text-sm mt-0.5">{format(new Date(user.user.updatedAt), 'PPP')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              <h3 className="text-base font-medium mb-4">Recent Transactions</h3>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="min-w-[600px] w-full divide-y divide-border">
                  <thead className="bg-muted/40">
                    <tr>
                      {['Type','Amount','Status','Reference','Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {user.recentTransactions.length > 0 ? (
                      user.recentTransactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{tx.type}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{formatCurrency(tx.amount)}</td>
                          <td className="px-4 py-3"><TxBadge status={tx.status} /></td>
                          <td className="px-4 py-3 text-sm text-muted-foreground font-mono text-xs">{tx.reference}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{format(new Date(tx.createdAt), 'MMM dd, yyyy')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">No transactions found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <div>
              <h3 className="text-base font-medium mb-4">Subscription Information</h3>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">
                  User subscriptions feature coming soon. This will show any active subscription plans.
                </p>
              </div>
            </div>
          )}

          {/* Referrals Tab */}
          {activeTab === 'referrals' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-medium mb-4">Referral Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Referrals',  value: String(user.stats.totalReferrals) },
                    { label: 'Total Earnings',   value: formatCurrency(user.stats.totalReferralEarnings) },
                    { label: 'Avg Per Referral', value: user.stats.totalReferrals > 0
                        ? formatCurrency(user.stats.totalReferralEarnings / user.stats.totalReferrals)
                        : formatCurrency(0) },
                  ].map(c => (
                    <div key={c.label} className="bg-muted/30 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      <p className="text-2xl font-semibold mt-1">{c.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-base font-medium mb-4">Transaction Breakdown</h3>
                {user.stats.transactionsByType.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="min-w-[400px] w-full divide-y divide-border">
                      <thead className="bg-muted/40">
                        <tr>
                          {['Type','Count','Total Amount'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {user.stats.transactionsByType.map(item => (
                          <tr key={item.type} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-foreground">{item.type}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{item.count}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No transaction data found</p>
                )}
              </div>
            </div>
          )}

        </div>
      </Card>

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Edit User</h2>
            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                message.startsWith('Error')
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              }`}>{message}</div>
            )}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Verified Status</p>
                  <p className="text-xs text-muted-foreground">Mark this account as verified</p>
                </div>
                <Switch checked={isVerified} onCheckedChange={setIsVerified} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleEditUser} disabled={editLoading} className="flex-1">
                {editLoading ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                message.startsWith('Error')
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              }`}>{message}</div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reset-pw">New Password</Label>
              <div className="relative">
                <Input
                  id="reset-pw"
                  type={showNewPassword ? 'text' : 'password'}
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  onClick={() => setShowNewPassword(v => !v)}
                >
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleResetPassword} disabled={resetLoading} className="flex-1">
                {resetLoading ? 'Resetting…' : 'Reset Password'}
              </Button>
              <Button variant="outline" onClick={() => setShowResetModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
