'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Trophy, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const BETTING_PROVIDERS = [
  '1XBET', 'BANGBET', 'BET9JA', 'BETKING', 'BETLAND', 'BETLION',
  'BETWAY', 'CLOUDBET', 'LIVESCOREBET', 'MERRYBET', 'NAIJABET',
  'NAIRABET', 'SUPABET'
] as const

const PROFIT_MARGIN = 100

export default function BettingFundingPage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    provider: '1XBET',
    customerId: '',
    vendorCost: 0,
  })
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/wallet/balance', {
          credentials: 'include'
        })
        const data = await res.json()
        if (data.success) {
          setWalletBalance(data.data.balance)
        }
      } catch (err) {
        console.error('Failed to fetch balance:', err)
      } finally {
        setLoadingBalance(false)
      }
    }
    fetchBalance()
  }, [])

  const sellingPrice = formData.vendorCost + PROFIT_MARGIN

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!formData.provider) {
      setError('Please select a betting provider')
      setLoading(false)
      return
    }
    if (!formData.customerId) {
      setError('Please enter your customer/user ID')
      setLoading(false)
      return
    }
    if (formData.vendorCost < 100) {
      setError('Minimum betting wallet funding is ₦100')
      setLoading(false)
      return
    }
    if (formData.vendorCost > 100000) {
      setError('Maximum betting wallet funding is ₦100,000')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/bills/betting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Funding failed')
      }

      setSuccess(
        `Betting wallet funded successfully! ${formData.provider} account ${formData.customerId} credited with ₦${formData.vendorCost.toLocaleString()}. Reference: ${data.data.reference}`
      )

      // Update balance
      setWalletBalance(prev => prev - sellingPrice)

      // Reset form
      setFormData({ provider: '1XBET', customerId: '', vendorCost: 0 })

    } catch (err: any) {
      setError(err.message || 'Failed to fund betting wallet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Fund Betting Wallet</h1>
        <p className="text-muted-foreground">Top up your betting accounts instantly.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Betting Top-up
              </CardTitle>
              <CardDescription>Enter account details and amount.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label>Select Betting Provider</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) => setFormData({ ...formData, provider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {BETTING_PROVIDERS.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer ID */}
                <div className="space-y-2">
                  <Label htmlFor="customerId">Customer / User ID</Label>
                  <Input
                    type="text"
                    id="customerId"
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    placeholder="Enter your betting account ID"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is your unique account ID on the betting platform.
                  </p>
                </div>

                {/* Amount */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendorCost">Amount (₦100 - ₦100,000)</Label>
                    <Input
                      type="number"
                      id="vendorCost"
                      value={formData.vendorCost || ''}
                      onChange={(e) => setFormData({ ...formData, vendorCost: parseFloat(e.target.value) || 0 })}
                      placeholder="Enter amount to fund"
                      min={100}
                      max={100000}
                      step={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quick amounts: ₦500 | ₦1,000 | ₦2,000 | ₦5,000 | ₦10,000
                    </p>
                  </div>

                  {/* Pricing Breakdown */}
                  {formData.vendorCost >= 100 && (
                    <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Betting Credit:</span>
                        <span className="font-medium">₦{formData.vendorCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Charge:</span>
                        <span className="font-medium text-green-600">+ ₦{PROFIT_MARGIN}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t mt-2 border-border/50">
                        <span className="font-bold">Total Payment:</span>
                        <span className="font-bold text-lg">₦{sellingPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="bg-destructive/15 text-destructive border-destructive/20 border p-3 rounded-md flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 text-green-700 border-green-200 border p-3 rounded-md flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 mt-0.5" />
                    <span>{success}</span>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading || loadingBalance || walletBalance < sellingPrice || formData.vendorCost < 100}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Processing Funding...
                    </>
                  ) : (
                    `Fund Betting Wallet - ₦${sellingPrice.toLocaleString()}`
                  )}
                </Button>

                {walletBalance < sellingPrice && formData.vendorCost >= 100 && (
                  <p className="text-destructive text-sm text-center">
                    Insufficient balance. Please fund your wallet first.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary-foreground/70">Wallet Balance</CardDescription>
              <CardTitle className="text-3xl">
                {loadingBalance ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  `₦${walletBalance.toLocaleString()}`
                )}
              </CardTitle>
            </CardHeader>
            <CardFooter>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Wallet className="h-4 w-4" />
                <span>Available for spend</span>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-muted-foreground">
              <p>1. Select your betting platform.</p>
              <p>2. Enter your account ID carefully.</p>
              <p>3. Funds are credited instantly.</p>
              <p>4. Minimum funding is ₦100.</p>
              <p>5. A ₦100 service charge applies.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
