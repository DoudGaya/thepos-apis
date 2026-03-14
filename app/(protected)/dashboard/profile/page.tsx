'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import {
  User, Mail, Lock, Bell, AlertTriangle,
  CheckCircle2, AlertCircle, Loader2, Camera, Shield,
} from 'lucide-react'
import Link from 'next/link'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'profile',       label: 'Profile',      icon: User },
  { id: 'security',      label: 'Security',      icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account',       label: 'Account',       icon: AlertTriangle },
]

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={cn(
      'flex items-start gap-2 rounded-md border p-3 text-sm',
      type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
        : 'bg-destructive/10 text-destructive border-destructive/20',
    )}>
      {type === 'success'
        ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
        : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
      <span>{message}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const user = session?.user as any

  const [tab, setTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [profileData, setProfileData] = useState({
    fullName: user?.name || '',
    email:    user?.email || '',
    phone:    user?.phone || '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  })

  const [notifSettings, setNotifSettings] = useState({
    emailNotifications: true,
    smsNotifications:   true,
    marketingEmails:    false,
  })

  const flash = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') { setSuccess(msg); setError('') }
    else { setError(msg); setSuccess('') }
    setTimeout(() => { setSuccess(''); setError('') }, 4000)
  }

  const handleProfileUpdate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })
      if (!res.ok) throw new Error()
      await update({ ...session, user: { ...session?.user, name: profileData.fullName, email: profileData.email, phone: profileData.phone } })
      flash('Profile updated successfully.', 'success')
    } catch { flash('Failed to update profile.', 'error') }
    finally { setLoading(false) }
  }

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      return flash('All password fields are required.', 'error')
    }
    if (passwordData.newPassword.length < 8) return flash('New password must be at least 8 characters.', 'error')
    if (passwordData.newPassword !== passwordData.confirmPassword) return flash('Passwords do not match.', 'error')
    setLoading(true)
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }),
      })
      if (!res.ok) throw new Error()
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      flash('Password changed successfully.', 'success')
    } catch { flash('Failed to change password. Check your current password.', 'error') }
    finally { setLoading(false) }
  }

  const handleNotifSave = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifSettings),
      })
      if (!res.ok) throw new Error()
      flash('Notification preferences saved.', 'success')
    } catch { flash('Failed to save preferences.', 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account information and preferences.</p>
      </div>

      {(success || error) && (
        <Toast message={success || error} type={success ? 'success' : 'error'} />
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left rail nav */}
        <nav className="md:w-52 shrink-0">
          <ul className="space-y-1">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left',
                      tab === t.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {t.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0 rounded-lg border bg-card p-6 space-y-6">

          {/* ── Profile ── */}
          {tab === 'profile' && (
            <>
              <div>
                <h2 className="text-lg font-medium">Personal Information</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Update your name, email and phone number.</p>
              </div>
              <Separator />

              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <button className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow">
                    <Camera className="h-3 w-3 text-primary-foreground" />
                  </button>
                </div>
                <div>
                  <p className="font-medium">{user?.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={profileData.fullName} onChange={e => setProfileData(p => ({ ...p, fullName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" className="pl-9" value={profileData.email} onChange={e => setProfileData(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <PhoneInput
                    international
                    defaultCountry="NG"
                    value={profileData.phone?.replace(/\s/g, '')}
                    onChange={v => setProfileData(p => ({ ...p, phone: v || '' }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileUpdate} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
                </Button>
              </div>
            </>
          )}

          {/* ── Security ── */}
          {tab === 'security' && (
            <>
              <div>
                <h2 className="text-lg font-medium">Security</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Update your password and manage your transaction PIN.</p>
              </div>
              <Separator />

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" value={passwordData.currentPassword} onChange={e => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={handlePasswordChange} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Password
                </Button>
              </div>
              <Separator />

              <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-4">
                <div className="rounded-md bg-primary/10 p-2">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Transaction PIN</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Secure your purchases with a 4-digit PIN. Only you can authorise transactions.</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/settings/security">Manage PIN</Link>
                </Button>
              </div>
            </>
          )}

          {/* ── Notifications ── */}
          {tab === 'notifications' && (
            <>
              <div>
                <h2 className="text-lg font-medium">Notifications</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Choose how you receive updates and alerts.</p>
              </div>
              <Separator />

              <div className="space-y-1">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive transaction updates via email' },
                  { key: 'smsNotifications',   label: 'SMS Notifications',   desc: 'Receive transaction alerts via SMS' },
                  { key: 'marketingEmails',    label: 'Marketing Emails',    desc: 'Receive promotional offers and news' },
                ].map(({ key, label, desc }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={notifSettings[key as keyof typeof notifSettings]}
                        onCheckedChange={v => setNotifSettings(p => ({ ...p, [key]: v }))}
                      />
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNotifSave} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Preferences
                </Button>
              </div>
            </>
          )}

          {/* ── Account ── */}
          {tab === 'account' && (
            <>
              <div>
                <h2 className="text-lg font-medium">Account</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your account status and personal data.</p>
              </div>
              <Separator />

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h3 className="font-medium text-destructive">Danger Zone</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Once you delete your account, all of your personal data will be permanently removed.
                  Financial records are retained for regulatory compliance. This action cannot be undone.
                </p>
                <Button variant="destructive" size="sm" asChild>
                  <Link href="/account-deletion">Request Account Deletion</Link>
                </Button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}