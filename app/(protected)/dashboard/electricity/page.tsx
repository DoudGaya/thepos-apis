'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2, Zap, Wallet } from 'lucide-react'
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

const ELECTRICITY_PROVIDERS = [
  'EKEDC', 'IKEDC', 'IBEDC', 'PHEDC', 'JEDC', 'KEDC',
  'AEDC', 'BEDC', 'EEDC', 'KEDCO', 'KAEDCO', 'YEDC', 'PORTHARCOURT'
] as const

const PROFIT_MARGIN = 100

export default function ElectricityPurchasePage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    provider: 'EKEDC',
    meterNumber: '',
    meterType: 'prepaid' as 'prepaid' | 'postpaid',
    vendorCost: 0,
    customerName: '',
  })
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifiedName, setVerifiedName] = useState('')

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

  const verifyMeter = async () => {
    if (!formData.meterNumber || formData.meterNumber.length < 10) {
      setError('Please enter a valid meter number')
      return
    }

    setVerifying(true)
    setError('')
    setVerifiedName('')

    try {
      const res = await fetch('/api/bills/electricity/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disco: formData.provider,
          meterNumber: formData.meterNumber,
          meterType: formData.meterType.toUpperCase()
        })
      })

      const data = await res.json()

      if (data.success) {
        setVerifiedName(data.data.customerName || data.data.name || 'Verified Customer')
        setFormData(prev => ({ ...prev, customerName: data.data.customerName || data.data.name }))
        setSuccess('Meter verified successfully')
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch (err) {
      setError('Failed to verify meter')
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!formData.provider) {
      setError('Please select a provider')
      setLoading(false)
      return
    }
    if (!formData.meterNumber || formData.meterNumber.length < 10) {
      setError('Please enter a valid meter number (at least 10 digits)')
      setLoading(false)
      return
    }
    if (!verifiedName) {
      setError('Please verify the meter number first')
      setLoading(false)
      return
    }
    if (formData.vendorCost < 1000) {
      setError('Minimum electricity purchase is ₦1,000')
      setLoading(false)
      return
    }
    if (formData.vendorCost > 100000) {
      setError('Maximum electricity purchase is ₦100,000')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/bills/electricity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Purchase failed')
      }

      setSuccess(
        `Electricity token purchased successfully! Token: ${data.data.token || 'Check your phone'}. Reference: ${data.data.reference}`
      )

      // Update balance
      setWalletBalance(prev => prev - sellingPrice)

      // Reset form
      setFormData({
        provider: 'EKEDC',
        meterNumber: '',
        meterType: 'prepaid',
        vendorCost: 0,
        customerName: ''
      })

    } catch (err: any) {
      setError(err.message || 'Failed to purchase electricity token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Buy Electricity</h1>
        <p className="text-muted-foreground">Pay for electric bills and get tokens instantly.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Electricity Token
              </CardTitle>
              <CardDescription>Select provider and enter meter details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label>Select Provider (DISCO)</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) => setFormData({ ...formData, provider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {ELECTRICITY_PROVIDERS.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Meter Type */}
                <div className="space-y-2">
                  <Label>Meter Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={formData.meterType === 'prepaid' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, meterType: 'prepaid' })}
                      className="w-full"
                    >
                      Prepaid
                    </Button>
                    <Button
                      type="button"
                      variant={formData.meterType === 'postpaid' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, meterType: 'postpaid' })}
                      className="w-full"
                    >
                      Postpaid
                    </Button>
                  </div>
                </div>

                {/* Meter Number */}
                <div className="space-y-2">
                  <Label htmlFor="meterNumber">Meter Number</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      id="meterNumber"
                      value={formData.meterNumber}
                      onChange={(e) => {
                        setFormData({ ...formData, meterNumber: e.target.value })
                        setVerifiedName('')
                      }}
                      placeholder="Enter meter number"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={verifyMeter}
                      disabled={verifying || !formData.meterNumber}
                    >
                      {verifying ? <Loader2 className="animate-spin h-4 w-4" /> : 'Verify'}
                    </Button>
                  </div>
                </div>

                {/* Customer Name */}
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <div className={`p-3 rounded-md border text-sm ${verifiedName
                      ? 'bg-green-50 border-green-200 text-green-700 font-medium'
                      : 'bg-muted border-border text-muted-foreground'
                    }`}>
                    {verifiedName || formData.customerName || 'Verify meter to see name'}
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendorCost">Amount (₦1,000 - ₦100,000)</Label>
                    <Input
                      type="number"
                      id="vendorCost"
                      value={formData.vendorCost || ''}
                      onChange={(e) => setFormData({ ...formData, vendorCost: parseFloat(e.target.value) || 0 })}
                      placeholder="Enter amount"
                      min={1000}
                      max={100000}
                      step={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quick amounts: ₦1,000 | ₦2,000 | ₦5,000 | ₦10,000
                    </p>
                  </div>

                  {/* Pricing Breakdown */}
                  {formData.vendorCost >= 1000 && (
                    <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token Value:</span>
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
                  disabled={loading || loadingBalance || walletBalance < sellingPrice || formData.vendorCost < 1000}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Processing Purchase...
                    </>
                  ) : (
                    `Purchase Electricity - ₦${sellingPrice.toLocaleString()}`
                  )}
                </Button>

                {walletBalance < sellingPrice && formData.vendorCost >= 1000 && (
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
              <p>1. Select your electricity provider (DISCO).</p>
              <p>2. Choose meter type and enter meter number.</p>
              <p>3. Verify meter to ensure correctness.</p>
              <p>4. Token is delivered instantly via SMS/Screen.</p>
              <p>5. Service charge applies.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
