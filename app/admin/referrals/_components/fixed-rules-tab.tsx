'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface FixedReferralRule {
  id: string
  name: string
  commissionType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  commissionValue: number
  minFundingAmount: number
  isActive: boolean
  audience: string
  specificUserIds: string[]
}

const emptyForm = {
  name: '',
  commissionType: 'FIXED_AMOUNT',
  commissionValue: '',
  minFundingAmount: '0',
  isActive: true,
  audience: 'ALL',
  specificUserIds: [] as string[],
}

type FormState = typeof emptyForm

function RuleForm({
  form,
  onChange,
}: {
  form: FormState
  onChange: (f: FormState) => void
}) {
  const [userInput, setUserInput] = useState('')

  const addUserId = () => {
    const trimmed = userInput.trim()
    if (trimmed && !form.specificUserIds.includes(trimmed)) {
      onChange({ ...form, specificUserIds: [...form.specificUserIds, trimmed] })
    }
    setUserInput('')
  }

  const removeUserId = (id: string) => {
    onChange({ ...form, specificUserIds: form.specificUserIds.filter(u => u !== id) })
  }

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label>Rule Name</Label>
        <Input
          placeholder="e.g. Welcome Bonus"
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Commission Type</Label>
          <Select
            value={form.commissionType}
            onValueChange={val => onChange({ ...form, commissionType: val })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED_AMOUNT">Fixed (₦)</SelectItem>
              <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Value</Label>
          <Input
            type="number"
            placeholder="e.g. 500 or 10"
            value={form.commissionValue}
            onChange={e => onChange({ ...form, commissionValue: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Minimum Funding Required (₦)</Label>
        <Input
          type="number"
          placeholder="0"
          value={form.minFundingAmount}
          onChange={e => onChange({ ...form, minFundingAmount: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Minimum amount the user must fund to trigger this bonus.</p>
      </div>
      <div className="grid gap-2">
        <Label>Audience</Label>
        <Select value={form.audience} onValueChange={val => onChange({ ...form, audience: val, specificUserIds: val === 'ALL' ? [] : form.specificUserIds })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Users</SelectItem>
            <SelectItem value="SPECIFIC">Specific Users</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {form.audience === 'SPECIFIC' && (
        <div className="grid gap-2">
          <Label>User IDs</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Paste a user ID and press Add"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUserId() } }}
            />
            <Button type="button" variant="outline" size="sm" onClick={addUserId}>Add</Button>
          </div>
          {form.specificUserIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {form.specificUserIds.map(id => (
                <Badge key={id} variant="secondary" className="gap-1 pr-1">
                  <span className="font-mono text-xs max-w-[120px] truncate">{id}</span>
                  <button type="button" onClick={() => removeUserId(id)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">This rule will only apply to the listed user IDs.</p>
        </div>
      )}
      <div className="flex items-center justify-between py-1">
        <Label>Active</Label>
        <Switch checked={form.isActive} onCheckedChange={v => onChange({ ...form, isActive: v })} />
      </div>
    </div>
  )
}

export function FixedRulesTab() {
  const [rules, setRules] = useState<FixedReferralRule[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<FormState>({ ...emptyForm })

  const [editRule, setEditRule] = useState<FixedReferralRule | null>(null)
  const [editForm, setEditForm] = useState<FormState>({ ...emptyForm })

  useEffect(() => { fetchRules() }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/referrals/rules')
      const data = await res.json()
      setRules(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load referral rules')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/referrals/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          commissionValue: parseFloat(createForm.commissionValue),
          minFundingAmount: parseFloat(createForm.minFundingAmount || '0'),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create rule')
      toast.success('Referral rule created')
      setIsCreateOpen(false)
      setCreateForm({ ...emptyForm })
      fetchRules()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (rule: FixedReferralRule) => {
    setEditRule(rule)
    setEditForm({
      name: rule.name,
      commissionType: rule.commissionType,
      commissionValue: String(rule.commissionValue),
      minFundingAmount: String(rule.minFundingAmount),
      isActive: rule.isActive,
      audience: rule.audience,
      specificUserIds: Array.isArray(rule.specificUserIds) ? rule.specificUserIds : [],
    })
  }

  const handleEdit = async () => {
    if (!editRule) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/referrals/rules/${editRule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          commissionValue: parseFloat(editForm.commissionValue),
          minFundingAmount: parseFloat(editForm.minFundingAmount || '0'),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update rule')
      toast.success('Referral rule updated')
      setEditRule(null)
      fetchRules()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule? This cannot be undone.')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/referrals/rules/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete rule')
      toast.success('Referral rule deleted')
      fetchRules()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const fmtValue = (rule: FixedReferralRule) =>
    rule.commissionType === 'FIXED_AMOUNT'
      ? `₦${rule.commissionValue.toLocaleString()}`
      : `${rule.commissionValue}%`

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Fixed Bonus Rules</h3>
          <p className="text-sm text-muted-foreground">Rewards for first-time wallet funding.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Create Rule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Fixed Referral Rule</DialogTitle>
              <DialogDescription>Set up a one-time bonus for when a referred user funds their wallet.</DialogDescription>
            </DialogHeader>
            <RuleForm form={createForm} onChange={setCreateForm} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting || !createForm.name || !createForm.commissionValue}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Min. Funding</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  No rules configured.
                </TableCell>
              </TableRow>
            ) : (
              rules.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>{rule.commissionType === 'FIXED_AMOUNT' ? 'Fixed (₦)' : 'Percentage'}</TableCell>
                  <TableCell>{fmtValue(rule)}</TableCell>
                  <TableCell>₦{rule.minFundingAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    {rule.audience === 'SPECIFIC' ? (
                      <Badge variant="outline">
                        {Array.isArray(rule.specificUserIds) ? rule.specificUserIds.length : 0} user{(Array.isArray(rule.specificUserIds) ? rule.specificUserIds.length : 0) !== 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">All</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(rule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting === rule.id}
                        onClick={() => handleDelete(rule.id)}
                      >
                        {deleting === rule.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editRule} onOpenChange={open => { if (!open) setEditRule(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Referral Rule</DialogTitle>
            <DialogDescription>Update the details for this rule.</DialogDescription>
          </DialogHeader>
          <RuleForm form={editForm} onChange={setEditForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRule(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting || !editForm.name || !editForm.commissionValue}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

