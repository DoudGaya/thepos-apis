'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { toast } from 'sonner' // Assuming sonner is set up, or use alert/console

interface FixedReferralRule {
  id: string
  name: string
  commissionType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  commissionValue: number
  minFundingAmount: number
  isActive: boolean
  audience: string
}

export function FixedRulesTab() {
  const [rules, setRules] = useState<FixedReferralRule[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    commissionType: 'FIXED_AMOUNT',
    commissionValue: '',
    minFundingAmount: '0'
  })

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/admin/referrals/rules')
      if (!res.ok) throw new Error('Failed to fetch rules')
      const data = await res.json()
      setRules(data)
    } catch (error) {
      console.error(error)
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
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to create rule')
      }

      toast.success('Referral rule created successfully')
      setIsCreateOpen(false)
      fetchRules()
      setFormData({
        name: '',
        commissionType: 'FIXED_AMOUNT',
        commissionValue: '',
        minFundingAmount: '0'
      })
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Fixed Referral Rule</DialogTitle>
              <DialogDescription>
                Set up a one-time bonus for when a referred user funds their wallet.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Welcome Bonus"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Commission Type</Label>
                  <Select
                    value={formData.commissionType}
                    onValueChange={(val) => setFormData({ ...formData, commissionType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED_AMOUNT">Fixed Amount (₦)</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 500 or 10"
                    value={formData.commissionValue}
                    onChange={(e) => setFormData({ ...formData, commissionValue: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="min">Minimum Funding Required (₦)</Label>
                <Input
                  id="min"
                  type="number"
                  placeholder="0"
                  value={formData.minFundingAmount}
                  onChange={(e) => setFormData({ ...formData, minFundingAmount: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Minimum amount the user must pay to trigger this bonus.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Rule'}
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
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No rules configured.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>{rule.commissionType === 'FIXED_AMOUNT' ? 'Common Currency' : 'Percentage'}</TableCell>
                  <TableCell>
                    {rule.commissionType === 'FIXED_AMOUNT' 
                      ? `₦${rule.commissionValue.toLocaleString()}` 
                      : `${rule.commissionValue}%`}
                  </TableCell>
                  <TableCell>₦{rule.minFundingAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
