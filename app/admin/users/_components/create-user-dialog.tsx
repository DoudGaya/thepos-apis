'use client'

import React, { useEffect, useState } from 'react'
import { UserPlus, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AdminRole {
  id: string
  name: string
  description: string | null
}

interface CreateUserDialogProps {
  onCreated?: () => void
}

function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(n => chars[n % chars.length]).join('')
}

export function CreateUserDialog({ onCreated }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([])

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'USER',
    adminRoleId: '',
    sendWelcomeEmail: true,
  })

  useEffect(() => {
    if (open) fetchAdminRoles()
  }, [open])

  const fetchAdminRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles')
      if (res.ok) {
        const data = await res.json()
        // Roles API returns a plain array; fall back to .data.roles for future-proofing
        setAdminRoles(Array.isArray(data) ? data : (data.data?.roles ?? []))
      }
    } catch { /* roles are optional */ }
  }

  const set = (key: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim().toLowerCase(),
        phone:     form.phone.trim(),
        password:  form.password,
        role:      form.role,
        sendWelcomeEmail: form.sendWelcomeEmail,
      }
      if (form.adminRoleId) payload.adminRoleId = form.adminRoleId

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create user.')
        return
      }
      setOpen(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'USER', adminRoleId: '', sendWelcomeEmail: true })
      onCreated?.()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Add a new user account and assign their role.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cu-firstName">First Name</Label>
              <Input
                id="cu-firstName"
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-lastName">Last Name</Label>
              <Input
                id="cu-lastName"
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-phone">Phone Number</Label>
            <Input
              id="cu-phone"
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+2348012345678"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="cu-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Generate password"
                onClick={() => { set('password', generatePassword()); setShowPassword(true) }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={v => set('role', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {adminRoles.length > 0 && (
            <div className="space-y-1.5">
              <Label>Assign Custom Role <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={form.adminRoleId} onValueChange={v => set('adminRoleId', v)}>
                <SelectTrigger><SelectValue placeholder="Select an admin role" /></SelectTrigger>
                <SelectContent>
                  {adminRoles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Send welcome email</p>
              <p className="text-xs text-muted-foreground">Email login credentials to the user</p>
            </div>
            <Switch
              checked={form.sendWelcomeEmail}
              onCheckedChange={v => set('sendWelcomeEmail', v)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
